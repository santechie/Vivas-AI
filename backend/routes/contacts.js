import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// ==========================================
// 📇 CONTACTS MODULE REST APIS
// ==========================================

// 1. GET /customers (List with search, multi-filtering, sorting)
router.get("/customers", async (req, res) => {
  try {
    const { search, customer_type, channel_name, balance_status, tag, status, sort_by, sort_order } = req.query;

    let query = `
      SELECT 
        c.*,
        COALESCE(COUNT(DISTINCT o.id), c.total_orders_count, 0) as computed_orders_count,
        COALESCE(SUM(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.amount ELSE 0 END), c.lifetime_sales, 0) as computed_lifetime_sales
      FROM vivas_customers c
      LEFT JOIN vivas_orders o ON c.id = o.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        c.name ILIKE $${params.length} OR 
        c.company_name ILIKE $${params.length} OR 
        c.restaurant_venue ILIKE $${params.length} OR 
        c.email ILIKE $${params.length} OR 
        c.phone ILIKE $${params.length} OR 
        c.city ILIKE $${params.length}
      )`;
    }

    if (customer_type && customer_type !== "All") {
      params.push(customer_type);
      query += ` AND c.customer_type = $${params.length}`;
    }

    if (channel_name && channel_name !== "All") {
      params.push(channel_name);
      query += ` AND c.default_channel_name = $${params.length}`;
    }

    if (status && status !== "All") {
      params.push(status.toLowerCase());
      query += ` AND LOWER(c.status) = $${params.length}`;
    }

    if (balance_status === "has_balance") {
      query += ` AND COALESCE(c.current_balance, 0) > 0`;
    } else if (balance_status === "zero_balance") {
      query += ` AND COALESCE(c.current_balance, 0) <= 0`;
    }

    if (tag && tag !== "All") {
      params.push(tag);
      query += ` AND $${params.length} = ANY(c.tags)`;
    }

    query += ` GROUP BY c.id`;

    // Sorting
    const allowedSortCols = {
      name: "c.name",
      company_name: "c.company_name",
      lifetime_sales: "c.lifetime_sales",
      current_balance: "c.current_balance",
      created_at: "c.created_at"
    };
    const sortCol = allowedSortCols[sort_by] || "c.created_at";
    const sortDir = (sort_order && sort_order.toUpperCase() === "ASC") ? "ASC" : "DESC";

    query += ` ORDER BY ${sortCol} ${sortDir}`;

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error("Error fetching customers:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /customers/stats (KPI Aggregates)
router.get("/customers/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN LOWER(status) = 'active' THEN 1 END) as active_customers,
        COALESCE(SUM(lifetime_sales), 0) as total_lifetime_sales,
        COALESCE(SUM(current_balance), 0) as total_receivables,
        COUNT(CASE WHEN customer_type = 'Wholesale' THEN 1 END) as wholesale_count,
        COUNT(CASE WHEN customer_type = 'Restaurant / Venue' THEN 1 END) as restaurant_count,
        COUNT(CASE WHEN customer_type = 'Retail' THEN 1 END) as retail_count,
        COUNT(CASE WHEN customer_type = 'CSA Member' THEN 1 END) as csa_count
      FROM vivas_customers
    `;
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        total_customers: parseInt(stats.total_customers || 0),
        active_customers: parseInt(stats.active_customers || 0),
        total_lifetime_sales: parseFloat(stats.total_lifetime_sales || 0),
        total_receivables: parseFloat(stats.total_receivables || 0),
        breakdown: {
          wholesale: parseInt(stats.wholesale_count || 0),
          restaurants: parseInt(stats.restaurant_count || 0),
          retail: parseInt(stats.retail_count || 0),
          csa: parseInt(stats.csa_count || 0)
        }
      }
    });
  } catch (err) {
    console.error("Error fetching customer stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /customers/:id (Customer Profile with 360 History)
router.get("/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const custResult = await pool.query("SELECT * FROM vivas_customers WHERE id = $1", [id]);
    if (custResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    const customer = custResult.rows[0];

    // Linked orders
    const ordersResult = await pool.query(
      "SELECT * FROM vivas_orders WHERE customer_id = $1 OR customer_name ILIKE $2 ORDER BY order_date DESC LIMIT 20",
      [id, `%${customer.name}%`]
    );

    // Linked financial transactions
    const transactionsResult = await pool.query(
      `SELECT t.*, c.category_name as category_name 
       FROM vivas_financial_transactions t 
       LEFT JOIN vivas_accounting_categories c ON t.category_id = c.id
       WHERE t.party_name ILIKE $1 OR t.party_name ILIKE $2
       ORDER BY t.transaction_date DESC LIMIT 20`,
      [`%${customer.name}%`, `%${customer.company_name || 'NONEXISTENT'}%`]
    );

    // Activity communications
    const commsResult = await pool.query(
      "SELECT * FROM vivas_contact_communications WHERE contact_type = 'Customer' AND contact_id = $1 ORDER BY logged_at DESC LIMIT 20",
      [id]
    );

    res.json({
      success: true,
      data: {
        customer,
        orders: ordersResult.rows,
        transactions: transactionsResult.rows,
        communications: commsResult.rows
      }
    });
  } catch (err) {
    console.error("Error fetching customer profile:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /customers (Create Customer)
router.post("/customers", async (req, res) => {
  try {
    const {
      name, first_name, last_name, company_name, restaurant_venue, customer_type, contact_role,
      email, phone, alternate_phone, street_address, unit_suite, city, state, country, postal_code,
      gps_lat, gps_lng, default_channel_name, payment_terms, tax_id, tax_exempt, credit_limit, discount_percentage,
      offer_sheets, tags, notes, status
    } = req.body;

    const computedName = (name && name.trim()) 
      ? name.trim() 
      : `${first_name || ''} ${last_name || ''}`.trim() || 'New Customer';

    const insertQuery = `
      INSERT INTO vivas_customers (
        name, first_name, last_name, company_name, restaurant_venue, customer_type, contact_role,
        email, phone, alternate_phone, street_address, unit_suite, city, state, country, postal_code,
        gps_lat, gps_lng, default_channel_name, payment_terms, tax_id, tax_exempt, credit_limit, discount_percentage,
        offer_sheets, tags, notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28
      ) RETURNING *
    `;

    const values = [
      computedName, first_name || null, last_name || null, company_name || null, restaurant_venue || null,
      customer_type || 'Wholesale', contact_role || 'Buyer / Owner',
      email || null, phone || null, alternate_phone || null,
      street_address || null, unit_suite || null, city || 'Bengaluru', state || 'Karnataka', country || 'India', postal_code || null,
      gps_lat ? parseFloat(gps_lat) : null, gps_lng ? parseFloat(gps_lng) : null,
      default_channel_name || 'Wholesale & Retail Markets', payment_terms || 'Net 30',
      tax_id || null, tax_exempt === true, credit_limit ? parseFloat(credit_limit) : 50000, discount_percentage ? parseFloat(discount_percentage) : 0,
      Array.isArray(offer_sheets) ? offer_sheets : ['Weekly Harvest Wholesale Sheet'],
      Array.isArray(tags) ? tags : ['Active Buyer'],
      notes || null, status || 'active'
    ];

    const result = await pool.query(insertQuery, values);
    res.status(201).json({ success: true, message: "Customer created successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error creating customer:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. PUT /customers/:id (Update Customer)
router.put("/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, first_name, last_name, company_name, restaurant_venue, customer_type, contact_role,
      email, phone, alternate_phone, street_address, unit_suite, city, state, country, postal_code,
      gps_lat, gps_lng, default_channel_name, payment_terms, tax_id, tax_exempt, credit_limit, discount_percentage,
      current_balance, lifetime_sales, offer_sheets, tags, notes, status
    } = req.body;

    const computedName = (name && name.trim()) 
      ? name.trim() 
      : `${first_name || ''} ${last_name || ''}`.trim() || 'Updated Customer';

    const updateQuery = `
      UPDATE vivas_customers SET
        name = $1, first_name = $2, last_name = $3, company_name = $4, restaurant_venue = $5,
        customer_type = $6, contact_role = $7, email = $8, phone = $9, alternate_phone = $10,
        street_address = $11, unit_suite = $12, city = $13, state = $14, country = $15, postal_code = $16,
        gps_lat = $17, gps_lng = $18, default_channel_name = $19, payment_terms = $20,
        tax_id = $21, tax_exempt = $22, credit_limit = $23, discount_percentage = $24,
        current_balance = COALESCE($25, current_balance), lifetime_sales = COALESCE($26, lifetime_sales),
        offer_sheets = $27, tags = $28, notes = $29, status = $30, updated_at = NOW()
      WHERE id = $31
      RETURNING *
    `;

    const values = [
      computedName, first_name || null, last_name || null, company_name || null, restaurant_venue || null,
      customer_type || 'Wholesale', contact_role || 'Buyer / Owner',
      email || null, phone || null, alternate_phone || null,
      street_address || null, unit_suite || null, city || 'Bengaluru', state || 'Karnataka', country || 'India', postal_code || null,
      gps_lat ? parseFloat(gps_lat) : null, gps_lng ? parseFloat(gps_lng) : null,
      default_channel_name || 'Wholesale & Retail Markets', payment_terms || 'Net 30',
      tax_id || null, tax_exempt === true, credit_limit ? parseFloat(credit_limit) : 50000, discount_percentage ? parseFloat(discount_percentage) : 0,
      current_balance !== undefined ? parseFloat(current_balance) : null,
      lifetime_sales !== undefined ? parseFloat(lifetime_sales) : null,
      Array.isArray(offer_sheets) ? offer_sheets : ['Weekly Harvest Wholesale Sheet'],
      Array.isArray(tags) ? tags : ['Active Buyer'],
      notes || null, status || 'active', id
    ];

    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.json({ success: true, message: "Customer updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating customer:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. DELETE /customers/:id
router.delete("/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_customers WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    console.error("Error deleting customer:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 🏢 VENDORS & SUPPLIERS REST APIS
// ==========================================

// 7. GET /vendors (List with filtering, search, sorting)
router.get("/vendors", async (req, res) => {
  try {
    const { search, category, payment_terms, status, sort_by, sort_order } = req.query;

    let query = `
      SELECT 
        v.*,
        c.category_name as default_category_name,
        COALESCE(COUNT(DISTINCT t.id), 0) as transaction_count,
        COALESCE(SUM(DISTINCT t.amount), v.total_purchases_amount, 0) as computed_total_spend
      FROM vivas_vendors v
      LEFT JOIN vivas_accounting_categories c ON v.default_accounting_category_id = c.id
      LEFT JOIN vivas_financial_transactions t ON v.id = t.vendor_id OR t.party_name ILIKE v.name
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        v.name ILIKE $${params.length} OR 
        v.vendor_code ILIKE $${params.length} OR 
        v.contact_person ILIKE $${params.length} OR 
        v.email ILIKE $${params.length} OR 
        v.phone ILIKE $${params.length} OR 
        v.city ILIKE $${params.length} OR
        v.tax_id ILIKE $${params.length}
      )`;
    }

    if (category && category !== "All") {
      params.push(category);
      query += ` AND v.category = $${params.length}`;
    }

    if (payment_terms && payment_terms !== "All") {
      params.push(payment_terms);
      query += ` AND v.payment_terms = $${params.length}`;
    }

    if (status && status !== "All") {
      params.push(status.toLowerCase());
      query += ` AND LOWER(v.status) = $${params.length}`;
    }

    query += ` GROUP BY v.id, c.category_name`;

    // Sorting
    const allowedSortCols = {
      name: "v.name",
      vendor_code: "v.vendor_code",
      category: "v.category",
      rating: "v.rating",
      total_purchases_amount: "v.total_purchases_amount",
      outstanding_payable: "v.outstanding_payable",
      created_at: "v.created_at"
    };
    const sortCol = allowedSortCols[sort_by] || "v.created_at";
    const sortDir = (sort_order && sort_order.toUpperCase() === "ASC") ? "ASC" : "DESC";

    query += ` ORDER BY ${sortCol} ${sortDir}`;

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error("Error fetching vendors:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET /vendors/stats (Vendor KPIs)
router.get("/vendors/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_vendors,
        COUNT(CASE WHEN LOWER(status) IN ('active', 'preferred') THEN 1 END) as active_vendors,
        COUNT(CASE WHEN LOWER(status) = 'preferred' THEN 1 END) as preferred_vendors,
        COALESCE(SUM(total_purchases_amount), 0) as total_annual_spend,
        COALESCE(SUM(outstanding_payable), 0) as total_payables,
        COUNT(CASE WHEN category = 'Seeds & Plants' THEN 1 END) as seeds_count,
        COUNT(CASE WHEN category = 'Fertilizers & Amendments' THEN 1 END) as fert_count,
        COUNT(CASE WHEN category = 'Equipment & Tools' THEN 1 END) as equip_count,
        COUNT(CASE WHEN category = 'Packaging Materials' THEN 1 END) as pack_count
      FROM vivas_vendors
    `;
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        total_vendors: parseInt(stats.total_vendors || 0),
        active_vendors: parseInt(stats.active_vendors || 0),
        preferred_vendors: parseInt(stats.preferred_vendors || 0),
        total_annual_spend: parseFloat(stats.total_annual_spend || 0),
        total_payables: parseFloat(stats.total_payables || 0),
        breakdown: {
          seeds: parseInt(stats.seeds_count || 0),
          fertilizers: parseInt(stats.fert_count || 0),
          equipment: parseInt(stats.equip_count || 0),
          packaging: parseInt(stats.pack_count || 0)
        }
      }
    });
  } catch (err) {
    console.error("Error fetching vendor stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET /vendors/:id (Vendor Profile with Expenses & Materials)
router.get("/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const vendorResult = await pool.query(
      `SELECT v.*, c.category_name as default_category_name 
       FROM vivas_vendors v
       LEFT JOIN vivas_accounting_categories c ON v.default_accounting_category_id = c.id
       WHERE v.id = $1`,
      [id]
    );
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    const vendor = vendorResult.rows[0];

    // Linked expense transactions
    const transactionsResult = await pool.query(
      `SELECT t.*, c.category_name as category_name 
       FROM vivas_financial_transactions t 
       LEFT JOIN vivas_accounting_categories c ON t.category_id = c.id
       WHERE t.vendor_id = $1 OR t.party_name ILIKE $2
       ORDER BY t.transaction_date DESC LIMIT 20`,
      [id, `%${vendor.name}%`]
    );

    // Linked inventory inputs
    const inputsResult = await pool.query(
      "SELECT * FROM vivas_inputs_inventory WHERE vendor_id = $1 OR vendor ILIKE $2 ORDER BY name ASC LIMIT 20",
      [id, `%${vendor.name}%`]
    );

    // Activity communications
    const commsResult = await pool.query(
      "SELECT * FROM vivas_contact_communications WHERE contact_type = 'Vendor' AND contact_id = $1 ORDER BY logged_at DESC LIMIT 20",
      [id]
    );

    res.json({
      success: true,
      data: {
        vendor,
        transactions: transactionsResult.rows,
        materials: inputsResult.rows,
        communications: commsResult.rows
      }
    });
  } catch (err) {
    console.error("Error fetching vendor profile:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. POST /vendors (Create Vendor)
router.post("/vendors", async (req, res) => {
  try {
    const {
      vendor_code, name, contact_person, contact_role, category, supply_items,
      email, phone, alternate_phone, website, street_address, city, state, country, postal_code,
      gps_lat, gps_lng, tax_id, bank_name, bank_account_no, bank_ifsc_swift,
      default_accounting_category_id, payment_terms, lead_time_days, rating,
      total_purchases_amount, outstanding_payable, notes, status
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Vendor name is required" });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    // Auto-generate code if missing
    let code = vendor_code;
    if (!code) {
      const countRes = await pool.query("SELECT COUNT(*) FROM vivas_vendors");
      const nextNum = parseInt(countRes.rows[0].count) + 1;
      code = `VND-${String(nextNum).padStart(3, '0')}`;
    }

    const insertQuery = `
      INSERT INTO vivas_vendors (
        vendor_code, name, contact_person, contact_role, category, supply_items,
        email, phone, alternate_phone, website, street_address, city, state, country, postal_code,
        gps_lat, gps_lng, tax_id, bank_name, bank_account_no, bank_ifsc_swift,
        default_accounting_category_id, payment_terms, lead_time_days, rating,
        total_purchases_amount, outstanding_payable, notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28, $29
      ) RETURNING *
    `;

    const values = [
      code, name.trim(), contact_person || null, contact_role || 'Sales Representative',
      category, Array.isArray(supply_items) ? supply_items : [],
      email || null, phone || null, alternate_phone || null, website || null,
      street_address || null, city || 'Bengaluru', state || 'Karnataka', country || 'India', postal_code || null,
      gps_lat ? parseFloat(gps_lat) : null, gps_lng ? parseFloat(gps_lng) : null,
      tax_id || null, bank_name || null, bank_account_no || null, bank_ifsc_swift || null,
      default_accounting_category_id || null, payment_terms || 'Net 30', lead_time_days ? parseInt(lead_time_days) : 5,
      rating ? parseFloat(rating) : 4.8,
      total_purchases_amount ? parseFloat(total_purchases_amount) : 0,
      outstanding_payable ? parseFloat(outstanding_payable) : 0,
      notes || null, status || 'active'
    ];

    const result = await pool.query(insertQuery, values);
    res.status(201).json({ success: true, message: "Vendor created successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error creating vendor:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. PUT /vendors/:id (Update Vendor)
router.put("/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor_code, name, contact_person, contact_role, category, supply_items,
      email, phone, alternate_phone, website, street_address, city, state, country, postal_code,
      gps_lat, gps_lng, tax_id, bank_name, bank_account_no, bank_ifsc_swift,
      default_accounting_category_id, payment_terms, lead_time_days, rating,
      total_purchases_amount, outstanding_payable, notes, status
    } = req.body;

    const updateQuery = `
      UPDATE vivas_vendors SET
        vendor_code = COALESCE($1, vendor_code),
        name = COALESCE($2, name),
        contact_person = $3,
        contact_role = $4,
        category = COALESCE($5, category),
        supply_items = $6,
        email = $7,
        phone = $8,
        alternate_phone = $9,
        website = $10,
        street_address = $11,
        city = $12,
        state = $13,
        country = $14,
        postal_code = $15,
        gps_lat = $16,
        gps_lng = $17,
        tax_id = $18,
        bank_name = $19,
        bank_account_no = $20,
        bank_ifsc_swift = $21,
        default_accounting_category_id = $22,
        payment_terms = $23,
        lead_time_days = $24,
        rating = $25,
        total_purchases_amount = COALESCE($26, total_purchases_amount),
        outstanding_payable = COALESCE($27, outstanding_payable),
        notes = $28,
        status = $29,
        updated_at = NOW()
      WHERE id = $30
      RETURNING *
    `;

    const values = [
      vendor_code || null, name ? name.trim() : null, contact_person || null, contact_role || 'Sales Representative',
      category || null, Array.isArray(supply_items) ? supply_items : [],
      email || null, phone || null, alternate_phone || null, website || null,
      street_address || null, city || 'Bengaluru', state || 'Karnataka', country || 'India', postal_code || null,
      gps_lat ? parseFloat(gps_lat) : null, gps_lng ? parseFloat(gps_lng) : null,
      tax_id || null, bank_name || null, bank_account_no || null, bank_ifsc_swift || null,
      default_accounting_category_id || null, payment_terms || 'Net 30', lead_time_days ? parseInt(lead_time_days) : 5,
      rating ? parseFloat(rating) : 4.8,
      total_purchases_amount !== undefined ? parseFloat(total_purchases_amount) : null,
      outstanding_payable !== undefined ? parseFloat(outstanding_payable) : null,
      notes || null, status || 'active', id
    ];

    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    res.json({ success: true, message: "Vendor updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating vendor:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. DELETE /vendors/:id
router.delete("/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_vendors WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    res.json({ success: true, message: "Vendor deleted successfully" });
  } catch (err) {
    console.error("Error deleting vendor:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 📖 UNIFIED DIRECTORY & COMMUNICATIONS APIS
// ==========================================

// 13. GET /directory (Unified Address Book)
router.get("/directory", async (req, res) => {
  try {
    const { search, type } = req.query;

    let customerQuery = `
      SELECT 
        id, name, company_name, email, phone, city, state, 
        'Customer' as contact_type, customer_type as sub_type, status,
        current_balance, lifetime_sales
      FROM vivas_customers WHERE 1=1
    `;
    let vendorQuery = `
      SELECT 
        id, name, contact_person as company_name, email, phone, city, state, 
        'Vendor' as contact_type, category as sub_type, status,
        outstanding_payable as current_balance, total_purchases_amount as lifetime_sales
      FROM vivas_vendors WHERE 1=1
    `;

    const custParams = [];
    const vendParams = [];

    if (search) {
      custParams.push(`%${search}%`);
      customerQuery += ` AND (name ILIKE $1 OR company_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR city ILIKE $1)`;
      vendParams.push(`%${search}%`);
      vendorQuery += ` AND (name ILIKE $1 OR contact_person ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR city ILIKE $1)`;
    }

    let combined = [];

    if (!type || type === "All" || type === "Customer") {
      const custRes = await pool.query(customerQuery, custParams);
      combined = combined.concat(custRes.rows);
    }
    if (!type || type === "All" || type === "Vendor") {
      const vendRes = await pool.query(vendorQuery, vendParams);
      combined = combined.concat(vendRes.rows);
    }

    combined.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, count: combined.length, data: combined });
  } catch (err) {
    console.error("Error fetching directory:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. POST /communications (Log Activity / Communication)
router.post("/communications", async (req, res) => {
  try {
    const { contact_type, contact_id, contact_name, communication_type, subject, notes, logged_by } = req.body;
    if (!contact_type || !contact_id || !subject) {
      return res.status(400).json({ success: false, message: "contact_type, contact_id, and subject are required" });
    }

    const insertQuery = `
      INSERT INTO vivas_contact_communications (
        contact_type, contact_id, contact_name, communication_type, subject, notes, logged_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      contact_type, contact_id, contact_name || 'Contact',
      communication_type || 'Email', subject, notes || null, logged_by || 'Farm Manager'
    ]);

    res.status(201).json({ success: true, message: "Communication logged", data: result.rows[0] });
  } catch (err) {
    console.error("Error logging communication:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================

export default router;
