import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// 📊 REPORTS & ANALYTICS MODULE APIS
// ==========================================

// 1. GET /summary (Overview metrics across all modules)
router.get("/summary", async (req, res) => {
  try {
    const { date_range } = req.query;

    const [
      yieldRes,
      salesRes,
      laborRes,
      pnlRes,
      inputsRes,
      savedCountRes
    ] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(harvest_quantity_kg), 0) as total_harvest_kg, COUNT(*) as total_harvest_events FROM vivas_harvest_logs"),
      pool.query("SELECT COALESCE(SUM(total_amount), 0) as total_sales_revenue, COUNT(*) as total_orders FROM vivas_orders WHERE status != 'Cancelled'"),
      pool.query("SELECT COALESCE(SUM(total_hours), 0) as total_labor_hours, COALESCE(SUM(labor_cost), 0) as total_labor_cost FROM vivas_time_logs"),
      pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) as gross_revenue,
          COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) as total_expenses
        FROM vivas_financial_transactions WHERE payment_status = 'Completed'
      `),
      pool.query("SELECT COUNT(*) as total_input_items, COALESCE(SUM(units_in_stock * estimated_unit_cost), 0) as total_inventory_value FROM vivas_materials_inputs"),
      pool.query("SELECT COUNT(*) as saved_reports_count FROM vivas_saved_reports")
    ]);

    const grossRev = parseFloat(pnlRes.rows[0]?.gross_revenue || 0);
    const totalExp = parseFloat(pnlRes.rows[0]?.total_expenses || 0);
    const netProfit = grossRev - totalExp;
    const netMarginPct = grossRev > 0 ? ((netProfit / grossRev) * 100) : 0;

    res.json({
      success: true,
      data: {
        total_harvest_kg: parseFloat(yieldRes.rows[0]?.total_harvest_kg || 0),
        total_harvest_events: parseInt(yieldRes.rows[0]?.total_harvest_events || 0, 10),
        total_sales_revenue: parseFloat(salesRes.rows[0]?.total_sales_revenue || 0),
        total_orders: parseInt(salesRes.rows[0]?.total_orders || 0, 10),
        total_labor_hours: parseFloat(laborRes.rows[0]?.total_labor_hours || 0),
        total_labor_cost: parseFloat(laborRes.rows[0]?.total_labor_cost || 0),
        gross_revenue: grossRev,
        total_expenses: totalExp,
        net_profit: netProfit,
        net_margin_pct: parseFloat(netMarginPct.toFixed(1)),
        inventory_value: parseFloat(inputsRes.rows[0]?.total_inventory_value || 0),
        saved_reports_count: parseInt(savedCountRes.rows[0]?.saved_reports_count || 0, 10)
      }
    });
  } catch (err) {
    console.error("Error fetching reports summary:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /yield (Harvest Yield Analytics)
router.get("/yield", async (req, res) => {
  try {
    const { crop_name, location_name } = req.query;

    let query = `
      SELECT 
        crop_name,
        variety_name,
        field_location,
        quality_grade,
        COALESCE(SUM(harvest_quantity_kg), 0) as total_yield_kg,
        COALESCE(SUM(planned_yield_kg), 0) as total_planned_kg,
        COUNT(*) as harvest_count
      FROM vivas_harvest_logs
      WHERE 1=1
    `;
    const params = [];

    if (crop_name && crop_name !== 'All') {
      params.push(crop_name);
      query += ` AND crop_name = $${params.length}`;
    }
    if (location_name && location_name !== 'All') {
      params.push(location_name);
      query += ` AND field_location = $${params.length}`;
    }

    query += ` GROUP BY crop_name, variety_name, field_location, quality_grade ORDER BY total_yield_kg DESC`;

    const result = await pool.query(query, params);

    // Group by crop summary
    const cropSummaries = {};
    result.rows.forEach(r => {
      const crop = r.crop_name || 'General Crop';
      if (!cropSummaries[crop]) {
        cropSummaries[crop] = {
          crop_name: crop,
          actual_yield_kg: 0,
          planned_yield_kg: 0,
          harvest_events: 0,
          grades: { GradeA: 0, GradeB: 0, Processing: 0 }
        };
      }
      const actual = parseFloat(r.total_yield_kg) || 0;
      const planned = parseFloat(r.total_planned_kg) || 0;
      cropSummaries[crop].actual_yield_kg += actual;
      cropSummaries[crop].planned_yield_kg += planned;
      cropSummaries[crop].harvest_events += parseInt(r.harvest_count, 10);

      const grade = r.quality_grade || 'Grade A';
      if (grade.includes('A')) cropSummaries[crop].grades.GradeA += actual;
      else if (grade.includes('B')) cropSummaries[crop].grades.GradeB += actual;
      else cropSummaries[crop].grades.Processing += actual;
    });

    const cropList = Object.values(cropSummaries).map(c => {
      const varianceKg = c.actual_yield_kg - c.planned_yield_kg;
      const variancePct = c.planned_yield_kg > 0 ? ((varianceKg / c.planned_yield_kg) * 100) : 0;
      return {
        ...c,
        variance_kg: parseFloat(varianceKg.toFixed(1)),
        variance_pct: parseFloat(variancePct.toFixed(1))
      };
    });

    res.json({ success: true, count: result.rows.length, data: result.rows, crop_summary: cropList });
  } catch (err) {
    console.error("Error fetching yield report:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /sales (Sales Revenue Analytics)
router.get("/sales", async (req, res) => {
  try {
    const { sales_channel } = req.query;

    let query = `
      SELECT 
        sales_channel,
        customer_name,
        crop_name,
        payment_status,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as channel_revenue,
        COALESCE(AVG(total_amount), 0) as avg_order_value
      FROM vivas_orders
      WHERE status != 'Cancelled'
    `;
    const params = [];

    if (sales_channel && sales_channel !== 'All') {
      params.push(sales_channel);
      query += ` AND sales_channel = $${params.length}`;
    }

    query += ` GROUP BY sales_channel, customer_name, crop_name, payment_status ORDER BY channel_revenue DESC`;

    const result = await pool.query(query, params);

    // Channel Aggregation
    const channelAgg = {};
    result.rows.forEach(r => {
      const ch = r.sales_channel || 'Wholesale & Retail Markets';
      if (!channelAgg[ch]) {
        channelAgg[ch] = { channel_name: ch, total_revenue: 0, order_count: 0 };
      }
      channelAgg[ch].total_revenue += parseFloat(r.channel_revenue) || 0;
      channelAgg[ch].order_count += parseInt(r.order_count, 10);
    });

    const channelList = Object.values(channelAgg).map(c => ({
      ...c,
      avg_order_value: c.order_count > 0 ? parseFloat((c.total_revenue / c.order_count).toFixed(2)) : 0
    }));

    res.json({ success: true, data: result.rows, channel_summary: channelList });
  } catch (err) {
    console.error("Error fetching sales report:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET /labor (Labor & Worker Performance Report)
router.get("/labor", async (req, res) => {
  try {
    const { task_type } = req.query;

    let query = `
      SELECT 
        task_type,
        worker_name,
        crop_name,
        field_location,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COALESCE(SUM(labor_cost), 0) as total_cost,
        COUNT(*) as shift_count
      FROM vivas_time_logs
      WHERE 1=1
    `;
    const params = [];

    if (task_type && task_type !== 'All') {
      params.push(task_type);
      query += ` AND task_type = $${params.length}`;
    }

    query += ` GROUP BY task_type, worker_name, crop_name, field_location ORDER BY total_hours DESC`;

    const result = await pool.query(query, params);

    // Task Type Aggregation
    const taskAgg = {};
    result.rows.forEach(r => {
      const tt = r.task_type || 'General Farm Work';
      if (!taskAgg[tt]) {
        taskAgg[tt] = { task_type: tt, total_hours: 0, total_cost: 0, shift_count: 0 };
      }
      taskAgg[tt].total_hours += parseFloat(r.total_hours) || 0;
      taskAgg[tt].total_cost += parseFloat(r.total_cost) || 0;
      taskAgg[tt].shift_count += parseInt(r.shift_count, 10);
    });

    const taskList = Object.values(taskAgg);

    res.json({ success: true, data: result.rows, task_summary: taskList });
  } catch (err) {
    console.error("Error fetching labor report:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET /financials (Financial P&L Report)
router.get("/financials", async (req, res) => {
  try {
    const [revRes, expRes, catRes] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(amount), 0) as total_revenue FROM vivas_financial_transactions WHERE type = 'Income' AND payment_status = 'Completed'"),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total_expenses FROM vivas_financial_transactions WHERE type = 'Expense' AND payment_status = 'Completed'"),
      pool.query(`
        SELECT 
          c.category_name,
          c.type as category_type,
          COALESCE(SUM(t.amount), 0) as total_amount
        FROM vivas_accounting_categories c
        LEFT JOIN vivas_financial_transactions t ON t.category_id = c.id AND t.payment_status = 'Completed'
        GROUP BY c.category_name, c.type
        HAVING COALESCE(SUM(t.amount), 0) > 0
        ORDER BY total_amount DESC
      `)
    ]);

    const grossRev = parseFloat(revRes.rows[0]?.total_revenue || 0);
    const totalExp = parseFloat(expRes.rows[0]?.total_expenses || 0);
    const netProfit = grossRev - totalExp;
    const netMarginPct = grossRev > 0 ? ((netProfit / grossRev) * 100) : 0;

    res.json({
      success: true,
      pnl: {
        gross_revenue: grossRev,
        total_expenses: totalExp,
        net_profit: netProfit,
        net_margin_pct: parseFloat(netMarginPct.toFixed(1))
      },
      category_breakdown: catRes.rows
    });
  } catch (err) {
    console.error("Error fetching financial report:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. GET /saved (List Saved Custom Reports)
router.get("/saved", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vivas_saved_reports ORDER BY is_favorite DESC, updated_at DESC");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching saved reports:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /saved (Create New Custom Report Preset)
router.post("/saved", async (req, res) => {
  try {
    const { report_name, category, description, filters_json, metrics_json, is_favorite, created_by } = req.body;
    if (!report_name) {
      return res.status(400).json({ success: false, message: "report_name is required" });
    }

    const insertQuery = `
      INSERT INTO vivas_saved_reports (
        report_name, category, description, filters_json, metrics_json, is_favorite, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      report_name,
      category || 'General',
      description || null,
      filters_json || {},
      metrics_json || [],
      is_favorite || false,
      created_by || 'Farm Manager'
    ]);

    res.status(201).json({ success: true, message: "Saved report created", data: result.rows[0] });
  } catch (err) {
    console.error("Error saving report preset:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. DELETE /saved/:id (Delete Saved Report Preset)
router.delete("/saved/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_saved_reports WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Saved report not found" });
    }
    res.json({ success: true, message: "Saved report deleted" });
  } catch (err) {
    console.error("Error deleting saved report:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================

export default router;
