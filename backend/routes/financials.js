import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// ==========================================
// 12. FINANCIALS MODULE ENDPOINTS
// ==========================================

// 1. GET /transactions (Filtered List)
router.get("/transactions", async (req, res) => {
  try {
    const {
      type,
      category_id,
      payment_method,
      payment_status,
      crop_name,
      sales_channel_name,
      start_date,
      end_date,
      search
    } = req.query;

    let query = `
      SELECT 
        t.*,
        c.accounting_code as category_code,
        c.tax_line as category_tax_line,
        c.is_tax_deductible
      FROM vivas_financial_transactions t
      LEFT JOIN vivas_accounting_categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (type && type !== "All") {
      params.push(type);
      query += ` AND t.type = $${params.length}`;
    }

    if (category_id && category_id !== "All") {
      params.push(category_id);
      query += ` AND t.category_id = $${params.length}`;
    }

    if (payment_method && payment_method !== "All") {
      params.push(payment_method);
      query += ` AND t.payment_method = $${params.length}`;
    }

    if (payment_status && payment_status !== "All") {
      params.push(payment_status);
      query += ` AND LOWER(t.payment_status) = LOWER($${params.length})`;
    }

    if (crop_name && crop_name !== "All") {
      params.push(crop_name);
      query += ` AND t.crop_name = $${params.length}`;
    }

    if (sales_channel_name && sales_channel_name !== "All") {
      params.push(sales_channel_name);
      query += ` AND t.sales_channel_name = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND t.transaction_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND t.transaction_date <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      query += ` AND (
        LOWER(t.description) LIKE $${params.length} OR 
        LOWER(t.transaction_code) LIKE $${params.length} OR 
        LOWER(COALESCE(t.party_name, '')) LIKE $${params.length} OR
        LOWER(COALESCE(t.invoice_receipt_ref, '')) LIKE $${params.length} OR
        LOWER(t.category_name) LIKE $${params.length}
      )`;
    }

    query += " ORDER BY t.transaction_date DESC, t.created_at DESC";

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching financial transactions:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /transactions/stats (Top KPI Metrics)
router.get("/transactions/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'Income' AND LOWER(payment_status) = 'completed' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' AND LOWER(payment_status) = 'completed' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'Income' AND LOWER(payment_status) = 'pending' THEN amount ELSE 0 END), 0) as pending_receivables,
        COALESCE(SUM(CASE WHEN type = 'Expense' AND LOWER(payment_status) = 'pending' THEN amount ELSE 0 END), 0) as pending_payables,
        COUNT(*) as total_count,
        COUNT(CASE WHEN LOWER(payment_status) = 'pending' THEN 1 END) as pending_count
      FROM vivas_financial_transactions
    `;
    const result = await pool.query(statsQuery);
    const row = result.rows[0];

    const income = parseFloat(row.total_income) || 0;
    const expenses = parseFloat(row.total_expenses) || 0;
    const netCashFlow = income - expenses;

    res.json({
      success: true,
      data: {
        total_income: income,
        total_expenses: expenses,
        net_cash_flow: netCashFlow,
        pending_receivables: parseFloat(row.pending_receivables) || 0,
        pending_payables: parseFloat(row.pending_payables) || 0,
        total_count: parseInt(row.total_count) || 0,
        pending_count: parseInt(row.pending_count) || 0
      }
    });
  } catch (err) {
    console.error("Error fetching transaction stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /transactions/:id
router.get("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*, c.accounting_code, c.tax_line, c.is_tax_deductible
      FROM vivas_financial_transactions t
      LEFT JOIN vivas_accounting_categories c ON t.category_id = c.id
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching transaction by id:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /transactions (Create new transaction)
router.post("/transactions", async (req, res) => {
  try {
    const {
      transaction_date,
      type,
      category_id,
      description,
      amount,
      currency,
      payment_method,
      party_name,
      party_type,
      invoice_receipt_ref,
      payment_status,
      crop_id,
      crop_name,
      sales_channel_id,
      sales_channel_name,
      order_id,
      order_code,
      input_item_id,
      equipment_id,
      labor_timesheet_id,
      tax_rate_pct,
      tax_amount,
      is_reconciled,
      notes
    } = req.body;

    if (!type || !category_id || !description || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: "Type, category, description, and amount are required" });
    }

    // Get category info
    const catRes = await pool.query("SELECT category_name, type FROM vivas_accounting_categories WHERE id = $1", [category_id]);
    if (catRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid accounting category" });
    }
    const cat = catRes.rows[0];

    // Generate Transaction Code
    const countRes = await pool.query("SELECT COUNT(*) FROM vivas_financial_transactions");
    const count = parseInt(countRes.rows[0].count) + 1;
    const year = new Date().getFullYear();
    const code = `TXN-${year}-${String(count).padStart(4, "0")}`;

    const insertQuery = `
      INSERT INTO vivas_financial_transactions (
        transaction_code, transaction_date, type, category_id, category_name, category_type,
        description, amount, currency, payment_method, party_name, party_type, invoice_receipt_ref,
        payment_status, crop_id, crop_name, sales_channel_id, sales_channel_name, order_id, order_code,
        input_item_id, equipment_id, labor_timesheet_id, tax_rate_pct, tax_amount, is_reconciled, notes
      ) VALUES (
        $1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6,
        $7, $8, COALESCE($9, 'INR'), COALESCE($10, 'Bank Transfer'), $11, COALESCE($12, 'Other'), $13,
        COALESCE($14, 'Completed'), $15, $16, $17, $18, $19, $20,
        $21, $22, $23, COALESCE($24, 0.00), COALESCE($25, 0.00), COALESCE($26, FALSE), $27
      ) RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      code,
      transaction_date,
      type,
      category_id,
      cat.category_name,
      cat.type,
      description,
      parseFloat(amount),
      currency || 'INR',
      payment_method || 'Bank Transfer',
      party_name,
      party_type || 'Other',
      invoice_receipt_ref,
      payment_status || 'Completed',
      crop_id,
      crop_name,
      sales_channel_id,
      sales_channel_name,
      order_id,
      order_code,
      input_item_id,
      equipment_id,
      labor_timesheet_id,
      tax_rate_pct || 0.00,
      tax_amount || 0.00,
      is_reconciled || false,
      notes
    ]);

    res.status(201).json({ success: true, message: "Transaction recorded successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error creating transaction:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. PUT /transactions/:id (Update transaction)
router.put("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transaction_date,
      type,
      category_id,
      description,
      amount,
      currency,
      payment_method,
      party_name,
      party_type,
      invoice_receipt_ref,
      payment_status,
      crop_id,
      crop_name,
      sales_channel_id,
      sales_channel_name,
      order_id,
      order_code,
      tax_rate_pct,
      tax_amount,
      is_reconciled,
      notes
    } = req.body;

    let catName = null;
    let catType = null;
    if (category_id) {
      const catRes = await pool.query("SELECT category_name, type FROM vivas_accounting_categories WHERE id = $1", [category_id]);
      if (catRes.rows.length > 0) {
        catName = catRes.rows[0].category_name;
        catType = catRes.rows[0].type;
      }
    }

    const updateQuery = `
      UPDATE vivas_financial_transactions SET
        transaction_date = COALESCE($1, transaction_date),
        type = COALESCE($2, type),
        category_id = COALESCE($3, category_id),
        category_name = COALESCE($4, category_name),
        category_type = COALESCE($5, category_type),
        description = COALESCE($6, description),
        amount = COALESCE($7, amount),
        currency = COALESCE($8, currency),
        payment_method = COALESCE($9, payment_method),
        party_name = COALESCE($10, party_name),
        party_type = COALESCE($11, party_type),
        invoice_receipt_ref = COALESCE($12, invoice_receipt_ref),
        payment_status = COALESCE($13, payment_status),
        crop_id = COALESCE($14, crop_id),
        crop_name = COALESCE($15, crop_name),
        sales_channel_id = COALESCE($16, sales_channel_id),
        sales_channel_name = COALESCE($17, sales_channel_name),
        order_id = COALESCE($18, order_id),
        order_code = COALESCE($19, order_code),
        tax_rate_pct = COALESCE($20, tax_rate_pct),
        tax_amount = COALESCE($21, tax_amount),
        is_reconciled = COALESCE($22, is_reconciled),
        notes = COALESCE($23, notes),
        updated_at = NOW()
      WHERE id = $24
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      transaction_date,
      type,
      category_id,
      catName,
      catType,
      description,
      amount ? parseFloat(amount) : null,
      currency,
      payment_method,
      party_name,
      party_type,
      invoice_receipt_ref,
      payment_status,
      crop_id,
      crop_name,
      sales_channel_id,
      sales_channel_name,
      order_id,
      order_code,
      tax_rate_pct,
      tax_amount,
      is_reconciled,
      notes,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.json({ success: true, message: "Transaction updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating transaction:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. DELETE /transactions/:id
router.delete("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_financial_transactions WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    res.json({ success: true, message: "Transaction deleted successfully" });
  } catch (err) {
    console.error("Error deleting transaction:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. PUT /transactions/:id/status
router.put("/transactions/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;
    if (!payment_status) {
      return res.status(400).json({ success: false, message: "payment_status is required" });
    }

    const result = await pool.query(
      "UPDATE vivas_financial_transactions SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [payment_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.json({ success: true, message: `Status updated to ${payment_status}`, data: result.rows[0] });
  } catch (err) {
    console.error("Error updating status:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET /categories (Accounting Categories List)
router.get("/categories", async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = `
      SELECT 
        c.*,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM vivas_accounting_categories c
      LEFT JOIN vivas_financial_transactions t ON c.id = t.category_id
      WHERE 1=1
    `;
    const params = [];

    if (type && type !== "All") {
      params.push(type);
      query += ` AND c.type = $${params.length}`;
    }

    if (status && status !== "All") {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }

    query += " GROUP BY c.id ORDER BY c.accounting_code ASC";

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching accounting categories:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET /categories/stats
router.get("/categories/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_categories,
        COUNT(CASE WHEN type = 'Revenue' THEN 1 END) as revenue_count,
        COUNT(CASE WHEN type = 'Cost of Goods Sold' THEN 1 END) as cogs_count,
        COUNT(CASE WHEN type = 'Expenses' THEN 1 END) as expense_count,
        COUNT(CASE WHEN type = 'Capital Asset' THEN 1 END) as capital_count,
        COUNT(CASE WHEN type = 'Tax & Liability' THEN 1 END) as tax_count
      FROM vivas_accounting_categories
      WHERE status = 'active'
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching category stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. POST /categories (Add Category)
router.post("/categories", async (req, res) => {
  try {
    const {
      category_name,
      type,
      accounting_code,
      detail_category,
      description,
      tax_line,
      is_tax_deductible,
      parent_id
    } = req.body;

    if (!category_name || !type || !accounting_code) {
      return res.status(400).json({ success: false, message: "Category name, type, and accounting code are required" });
    }

    const checkCode = await pool.query("SELECT id FROM vivas_accounting_categories WHERE accounting_code = $1", [accounting_code]);
    if (checkCode.rows.length > 0) {
      return res.status(400).json({ success: false, message: `Accounting code '${accounting_code}' already exists` });
    }

    const insertQuery = `
      INSERT INTO vivas_accounting_categories (
        category_name, type, accounting_code, detail_category, description,
        tax_line, is_tax_deductible, parent_id, is_default, status
      ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE), $8, FALSE, 'active')
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      category_name,
      type,
      accounting_code,
      detail_category,
      description,
      tax_line,
      is_tax_deductible !== undefined ? is_tax_deductible : true,
      parent_id || null
    ]);

    res.status(201).json({ success: true, message: "Category created successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error creating category:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. PUT /categories/:id
router.put("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_name,
      type,
      accounting_code,
      detail_category,
      description,
      tax_line,
      is_tax_deductible,
      parent_id,
      status
    } = req.body;

    const updateQuery = `
      UPDATE vivas_accounting_categories SET
        category_name = COALESCE($1, category_name),
        type = COALESCE($2, type),
        accounting_code = COALESCE($3, accounting_code),
        detail_category = COALESCE($4, detail_category),
        description = COALESCE($5, description),
        tax_line = COALESCE($6, tax_line),
        is_tax_deductible = COALESCE($7, is_tax_deductible),
        parent_id = COALESCE($8, parent_id),
        status = COALESCE($9, status),
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      category_name,
      type,
      accounting_code,
      detail_category,
      description,
      tax_line,
      is_tax_deductible,
      parent_id,
      status,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    res.json({ success: true, message: "Category updated successfully", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating category:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. DELETE /categories/:id
router.delete("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const txnCheck = await pool.query("SELECT COUNT(*) FROM vivas_financial_transactions WHERE category_id = $1", [id]);
    if (parseInt(txnCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete category with associated transactions. Consider archiving it instead."
      });
    }

    const result = await pool.query("DELETE FROM vivas_accounting_categories WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    console.error("Error deleting category:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. GET /analytics (Financial Summary & P&L Analytics)
router.get("/analytics", async (req, res) => {
  try {
    // 1. Overall Revenue, COGS, Expenses & Net Profit
    const pnlResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'Income' AND LOWER(payment_status) = 'completed' THEN amount ELSE 0 END), 0) as gross_revenue,
        COALESCE(SUM(CASE WHEN type = 'Expense' AND category_type = 'Cost of Goods Sold' AND LOWER(payment_status) = 'completed' THEN amount ELSE 0 END), 0) as cogs_total,
        COALESCE(SUM(CASE WHEN type = 'Expense' AND category_type = 'Expenses' AND LOWER(payment_status) = 'completed' THEN amount ELSE 0 END), 0) as operating_expenses,
        COALESCE(SUM(CASE WHEN type = 'Expense' AND category_type = 'Capital Asset' AND LOWER(payment_status) = 'completed' THEN amount ELSE 0 END), 0) as capital_expenses
      FROM vivas_financial_transactions
    `);

    const pnl = pnlResult.rows[0];
    const grossRevenue = parseFloat(pnl.gross_revenue) || 0;
    const cogsTotal = parseFloat(pnl.cogs_total) || 0;
    const grossProfit = grossRevenue - cogsTotal;
    const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
    const operatingExpenses = parseFloat(pnl.operating_expenses) || 0;
    const netOperatingProfit = grossProfit - operatingExpenses;
    const netMarginPct = grossRevenue > 0 ? (netOperatingProfit / grossRevenue) * 100 : 0;

    // 2. Spend by Accounting Category
    const categorySpend = await pool.query(`
      SELECT
        category_name,
        category_type,
        COUNT(*) as entry_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM vivas_financial_transactions
      WHERE type = 'Expense' AND LOWER(payment_status) = 'completed'
      GROUP BY category_name, category_type
      ORDER BY total_amount DESC
    `);

    // 3. Revenue by Sales Channel
    const channelRevenue = await pool.query(`
      SELECT
        COALESCE(NULLIF(sales_channel_name, ''), 'Direct / Other') as channel_name,
        COUNT(*) as transaction_count,
        COALESCE(SUM(amount), 0) as total_revenue
      FROM vivas_financial_transactions
      WHERE type = 'Income' AND LOWER(payment_status) = 'completed'
      GROUP BY sales_channel_name
      ORDER BY total_revenue DESC
    `);

    // 4. Crop Profitability Matrix
    const cropProfitability = await pool.query(`
      WITH crop_rev AS (
        SELECT 
          COALESCE(NULLIF(crop_name, ''), 'General Farm') as crop_name,
          COALESCE(SUM(amount), 0) as revenue
        FROM vivas_financial_transactions
        WHERE type = 'Income' AND LOWER(payment_status) = 'completed'
        GROUP BY crop_name
      ),
      crop_exp AS (
        SELECT 
          COALESCE(NULLIF(crop_name, ''), 'General Farm') as crop_name,
          COALESCE(SUM(CASE WHEN category_type = 'Cost of Goods Sold' THEN amount ELSE 0 END), 0) as direct_input_cost,
          COALESCE(SUM(CASE WHEN category_type = 'Expenses' THEN amount ELSE 0 END), 0) as overhead_cost
        FROM vivas_financial_transactions
        WHERE type = 'Expense' AND LOWER(payment_status) = 'completed'
        GROUP BY crop_name
      )
      SELECT
        COALESCE(r.crop_name, e.crop_name) as crop_name,
        COALESCE(r.revenue, 0) as revenue,
        COALESCE(e.direct_input_cost, 0) as direct_cost,
        COALESCE(e.overhead_cost, 0) as overhead_cost,
        (COALESCE(e.direct_input_cost, 0) + COALESCE(e.overhead_cost, 0)) as total_cost,
        (COALESCE(r.revenue, 0) - (COALESCE(e.direct_input_cost, 0) + COALESCE(e.overhead_cost, 0))) as net_profit
      FROM crop_rev r
      FULL OUTER JOIN crop_exp e ON r.crop_name = e.crop_name
      ORDER BY revenue DESC
    `);

    // 5. Monthly Cashflow Trend (Past Months)
    const monthlyTrends = await pool.query(`
      SELECT
        TO_CHAR(transaction_date, 'Mon YYYY') as month_label,
        DATE_TRUNC('month', transaction_date) as month_date,
        COALESCE(SUM(CASE WHEN type = 'Income' AND LOWER(payment_status) = 'completed' THEN amount ELSE 0 END), 0) as monthly_income,
        COALESCE(SUM(CASE WHEN type = 'Expense' AND LOWER(payment_status) = 'completed' THEN amount ELSE 0 END), 0) as monthly_expense
      FROM vivas_financial_transactions
      GROUP BY DATE_TRUNC('month', transaction_date), TO_CHAR(transaction_date, 'Mon YYYY')
      ORDER BY month_date ASC
    `);

    res.json({
      success: true,
      data: {
        pnl_summary: {
          gross_revenue: grossRevenue,
          cogs_total: cogsTotal,
          gross_profit: grossProfit,
          gross_margin_pct: grossMarginPct,
          operating_expenses: operatingExpenses,
          net_operating_profit: netOperatingProfit,
          net_margin_pct: netMarginPct,
          capital_expenses: parseFloat(pnl.capital_expenses) || 0
        },
        category_spend: categorySpend.rows,
        channel_revenue: channelRevenue.rows,
        crop_profitability: cropProfitability.rows,
        monthly_trends: monthlyTrends.rows
      }
    });
  } catch (err) {
    console.error("Error fetching financial analytics:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;
