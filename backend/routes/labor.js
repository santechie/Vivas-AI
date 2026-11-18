import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// ==========================================
// 11. LABOR MODULE: TIME & ATTENDANCE API
// ==========================================

// Get all timesheets with filters
router.get("/timesheets", async (req, res) => {
  try {
    const { status, worker_id, date, task_type, search } = req.query;
    let query = `
      SELECT t.*, w.avatar_color, w.role as worker_role, w.employment_type
      FROM vivas_labor_timesheets t
      LEFT JOIN vivas_labor_workers w ON t.worker_id = w.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "All") {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }
    if (worker_id && worker_id !== "All") {
      params.push(worker_id);
      query += ` AND t.worker_id = $${params.length}`;
    }
    if (date && date.trim() !== "") {
      params.push(date);
      query += ` AND t.work_date = $${params.length}`;
    }
    if (task_type && task_type !== "All") {
      params.push(task_type);
      query += ` AND t.task_type = $${params.length}`;
    }
    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(t.worker_name) LIKE $${params.length} OR LOWER(t.task_type) LIKE $${params.length} OR LOWER(COALESCE(t.crop_name, '')) LIKE $${params.length} OR LOWER(t.field_location) LIKE $${params.length})`;
    }

    query += " ORDER BY t.work_date DESC, t.clock_in_time DESC";
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching timesheets:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get timesheets summary statistics
router.get("/timesheets/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_timesheets,
        COALESCE(SUM(total_hours), 0) as total_logged_hours,
        COALESCE(SUM(total_labor_cost), 0) as total_labor_cost,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clocked_in_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_approval_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COALESCE(AVG(hourly_rate), 125.00) as avg_hourly_rate
      FROM vivas_labor_timesheets
    `;
    const result = await pool.query(statsQuery);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching timesheet stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get active clocked-in shifts
router.get("/timesheets/active", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, w.avatar_color, w.role as worker_role
      FROM vivas_labor_timesheets t
      LEFT JOIN vivas_labor_workers w ON t.worker_id = w.id
      WHERE t.status = 'active'
      ORDER BY t.clock_in_time ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching active shifts:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clock-in endpoint
router.post("/clock-in", async (req, res) => {
  try {
    const { worker_id, task_type, crop_name, field_location, notes } = req.body;

    // Verify worker exists and get hourly rate
    const workerRes = await pool.query("SELECT * FROM vivas_labor_workers WHERE id = $1", [worker_id]);
    if (workerRes.rowCount === 0) return res.status(404).json({ success: false, message: "Worker not found" });

    const worker = workerRes.rows[0];

    // Check if already active
    const activeCheck = await pool.query(
      "SELECT id FROM vivas_labor_timesheets WHERE worker_id = $1 AND status = 'active'",
      [worker_id]
    );
    if (activeCheck.rowCount > 0) {
      return res.status(400).json({ success: false, message: `${worker.name} is already clocked in` });
    }

    const result = await pool.query(
      `INSERT INTO vivas_labor_timesheets (
        worker_id, worker_name, work_date, clock_in_time, task_type,
        crop_name, field_location, hourly_rate, status, notes
      ) VALUES ($1, $2, CURRENT_DATE, CURRENT_TIMESTAMP, $3, $4, $5, $6, 'active', $7)
      RETURNING *`,
      [
        worker.id, worker.name,
        task_type || "General Farm Work",
        crop_name || "General",
        field_location || worker.assigned_location || "Main Farm Grounds",
        worker.hourly_rate,
        notes || ""
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: `${worker.name} clocked in successfully` });
  } catch (err) {
    console.error("Error clocking in:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clock-out endpoint
router.post("/clock-out", async (req, res) => {
  try {
    const { timesheet_id, break_minutes, notes } = req.body;

    const tsRes = await pool.query("SELECT * FROM vivas_labor_timesheets WHERE id = $1", [timesheet_id]);
    if (tsRes.rowCount === 0) return res.status(404).json({ success: false, message: "Timesheet not found" });

    const ts = tsRes.rows[0];
    const clockIn = new Date(ts.clock_in_time);
    const clockOut = new Date();
    const breakMins = parseInt(break_minutes) || 0;

    // Calculate duration in hours
    const diffMs = clockOut - clockIn;
    const diffHours = Math.max(0.1, (diffMs / (1000 * 60 * 60)) - (breakMins / 60));
    const roundedHours = Math.round(diffHours * 100) / 100;
    const laborCost = roundedHours * parseFloat(ts.hourly_rate);

    const updated = await pool.query(
      `UPDATE vivas_labor_timesheets SET
        clock_out_time = CURRENT_TIMESTAMP,
        break_minutes = $1,
        total_hours = $2,
        total_labor_cost = $3,
        status = 'pending',
        notes = COALESCE($4, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *`,
      [breakMins, roundedHours, laborCost, notes, timesheet_id]
    );

    res.json({ success: true, data: updated.rows[0], message: `${ts.worker_name} clocked out (${roundedHours} hrs)` });
  } catch (err) {
    console.error("Error clocking out:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual timesheet creation
router.post("/timesheets", async (req, res) => {
  try {
    const {
      worker_id, work_date, clock_in_time, clock_out_time, break_minutes,
      task_type, crop_name, field_location, hourly_rate, status, notes
    } = req.body;

    const workerRes = await pool.query("SELECT * FROM vivas_labor_workers WHERE id = $1", [worker_id]);
    if (workerRes.rowCount === 0) return res.status(404).json({ success: false, message: "Worker not found" });

    const worker = workerRes.rows[0];
    const rate = parseFloat(hourly_rate) || parseFloat(worker.hourly_rate);

    // Compute hours
    let hours = 8.0;
    if (clock_in_time && clock_out_time) {
      const inD = new Date(`${work_date}T${clock_in_time}`);
      const outD = new Date(`${work_date}T${clock_out_time}`);
      const diffMs = outD - inD;
      hours = Math.max(0.1, (diffMs / (1000 * 60 * 60)) - ((parseInt(break_minutes) || 0) / 60));
    }
    hours = Math.round(hours * 100) / 100;
    const totalCost = hours * rate;

    const result = await pool.query(
      `INSERT INTO vivas_labor_timesheets (
        worker_id, worker_name, work_date, clock_in_time, clock_out_time,
        break_minutes, total_hours, task_type, crop_name, field_location,
        hourly_rate, total_labor_cost, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        worker.id, worker.name, work_date || new Date().toISOString().slice(0, 10),
        clock_in_time ? `${work_date} ${clock_in_time}` : new Date(),
        clock_out_time ? `${work_date} ${clock_out_time}` : new Date(),
        parseInt(break_minutes) || 0, hours,
        task_type || "General Farm Work",
        crop_name || "General",
        field_location || worker.assigned_location,
        rate, totalCost, status || "pending", notes || ""
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Timesheet record created" });
  } catch (err) {
    console.error("Error creating timesheet:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update timesheet
router.put("/timesheets/:id", async (req, res) => {
  try {
    const {
      work_date, clock_in_time, clock_out_time, break_minutes, total_hours,
      task_type, crop_name, field_location, hourly_rate, status, notes
    } = req.body;

    const rate = parseFloat(hourly_rate) || 120;
    const hours = parseFloat(total_hours) || 8.0;
    const totalCost = hours * rate;

    const result = await pool.query(
      `UPDATE vivas_labor_timesheets SET
        work_date = $1, clock_in_time = $2, clock_out_time = $3,
        break_minutes = $4, total_hours = $5, task_type = $6,
        crop_name = $7, field_location = $8, hourly_rate = $9,
        total_labor_cost = $10, status = $11, notes = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *`,
      [
        work_date, clock_in_time, clock_out_time,
        parseInt(break_minutes) || 0, hours, task_type,
        crop_name, field_location, rate, totalCost,
        status || "pending", notes, req.params.id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Timesheet not found" });
    res.json({ success: true, data: result.rows[0], message: "Timesheet updated" });
  } catch (err) {
    console.error("Error updating timesheet:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete timesheet
router.delete("/timesheets/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM vivas_labor_timesheets WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Timesheet not found" });
    res.json({ success: true, message: "Timesheet deleted" });
  } catch (err) {
    console.error("Error deleting timesheet:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Approve or Reject Timesheet
router.patch("/timesheets/:id/approve", async (req, res) => {
  try {
    const { status, approved_by } = req.body; // status: 'approved' | 'rejected'
    const result = await pool.query(
      `UPDATE vivas_labor_timesheets SET
        status = $1,
        approved_by = $2,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *`,
      [status || "approved", approved_by || "Farm Admin", req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Timesheet not found" });
    res.json({ success: true, data: result.rows[0], message: `Timesheet ${status}` });
  } catch (err) {
    console.error("Error approving timesheet:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk approve timesheets
router.post("/timesheets/bulk-approve", async (req, res) => {
  try {
    const { ids, approved_by } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No timesheet IDs provided" });
    }

    const result = await pool.query(
      `UPDATE vivas_labor_timesheets SET
        status = 'approved',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2::uuid[])
      RETURNING id`,
      [approved_by || "Farm Admin", ids]
    );

    res.json({ success: true, approved_count: result.rowCount, message: `${result.rowCount} timesheets approved` });
  } catch (err) {
    console.error("Error bulk approving timesheets:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 12. LABOR MODULE: CREW & WORKERS DIRECTORY API
// ==========================================

router.get("/workers", async (req, res) => {
  try {
    const { status, role, employment_type, search } = req.query;
    let query = `
      SELECT w.*,
        COALESCE((SELECT SUM(t.total_hours) FROM vivas_labor_timesheets t WHERE t.worker_id = w.id), 0) as total_logged_hours,
        COALESCE((SELECT SUM(t.total_labor_cost) FROM vivas_labor_timesheets t WHERE t.worker_id = w.id), 0) as total_earnings,
        EXISTS(SELECT 1 FROM vivas_labor_timesheets t WHERE t.worker_id = w.id AND t.status = 'active') as is_clocked_in
      FROM vivas_labor_workers w
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== "All") {
      params.push(status);
      query += ` AND w.status = $${params.length}`;
    }
    if (role && role !== "All") {
      params.push(role);
      query += ` AND w.role = $${params.length}`;
    }
    if (employment_type && employment_type !== "All") {
      params.push(employment_type);
      query += ` AND w.employment_type = $${params.length}`;
    }
    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(w.name) LIKE $${params.length} OR LOWER(w.employee_code) LIKE $${params.length} OR LOWER(w.role) LIKE $${params.length} OR LOWER(COALESCE(w.phone, '')) LIKE $${params.length})`;
    }

    query += " ORDER BY w.name ASC";
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching workers:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/workers/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_crew,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN employment_type = 'Full-Time' THEN 1 END) as full_time_count,
        COUNT(CASE WHEN employment_type LIKE '%Seasonal%' THEN 1 END) as seasonal_count,
        COALESCE(AVG(hourly_rate), 120.00) as avg_hourly_rate
      FROM vivas_labor_workers
    `;
    const result = await pool.query(statsQuery);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching worker stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/workers/:id", async (req, res) => {
  try {
    const workerRes = await pool.query("SELECT * FROM vivas_labor_workers WHERE id = $1", [req.params.id]);
    if (workerRes.rowCount === 0) return res.status(404).json({ success: false, message: "Worker not found" });

    const tsRes = await pool.query(
      "SELECT * FROM vivas_labor_timesheets WHERE worker_id = $1 ORDER BY work_date DESC LIMIT 20",
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...workerRes.rows[0],
        timesheets: tsRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching worker details:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/workers", async (req, res) => {
  try {
    const {
      employee_code, name, role, employment_type, hourly_rate, overtime_rate,
      phone, email, emergency_contact_name, emergency_contact_phone, hire_date,
      assigned_location, status, avatar_color, notes
    } = req.body;

    const code = employee_code || `EMP-${Date.now().toString().slice(-4)}`;
    const colors = ["#0284c7", "#16a34a", "#d97706", "#7c3aed", "#ec4899", "#059669"];
    const chosenColor = avatar_color || colors[Math.floor(Math.random() * colors.length)];

    const result = await pool.query(
      `INSERT INTO vivas_labor_workers (
        employee_code, name, role, employment_type, hourly_rate, overtime_rate,
        phone, email, emergency_contact_name, emergency_contact_phone,
        hire_date, assigned_location, status, avatar_color, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        code, name, role || "Field Crew", employment_type || "Full-Time",
        parseFloat(hourly_rate) || 120.0,
        parseFloat(overtime_rate) || (parseFloat(hourly_rate) || 120.0) * 1.5,
        phone || "", email || "",
        emergency_contact_name || "", emergency_contact_phone || "",
        hire_date || new Date().toISOString().slice(0, 10),
        assigned_location || "Main Farm Grounds",
        status || "active", chosenColor, notes || ""
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Worker registered" });
  } catch (err) {
    console.error("Error creating worker:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/workers/:id", async (req, res) => {
  try {
    const {
      name, role, employment_type, hourly_rate, overtime_rate,
      phone, email, emergency_contact_name, emergency_contact_phone,
      hire_date, assigned_location, status, avatar_color, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE vivas_labor_workers SET
        name = $1, role = $2, employment_type = $3, hourly_rate = $4,
        overtime_rate = $5, phone = $6, email = $7, emergency_contact_name = $8,
        emergency_contact_phone = $9, hire_date = $10, assigned_location = $11,
        status = $12, avatar_color = $13, notes = $14, updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        name, role, employment_type,
        parseFloat(hourly_rate) || 120.0,
        parseFloat(overtime_rate) || 180.0,
        phone, email, emergency_contact_name, emergency_contact_phone,
        hire_date, assigned_location, status || "active",
        avatar_color, notes, req.params.id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Worker not found" });
    res.json({ success: true, data: result.rows[0], message: "Worker profile updated" });
  } catch (err) {
    console.error("Error updating worker:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/workers/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM vivas_labor_workers WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Worker not found" });
    res.json({ success: true, message: "Worker deleted" });
  } catch (err) {
    console.error("Error deleting worker:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 13. LABOR MODULE: ANALYTICS & COST ALLOCATION API
// ==========================================

router.get("/analytics", async (req, res) => {
  try {
    // 1. Cost & Hours by Task Type
    const taskBreakdown = await pool.query(`
      SELECT
        task_type,
        COUNT(*) as entry_count,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COALESCE(SUM(total_labor_cost), 0) as total_cost
      FROM vivas_labor_timesheets
      GROUP BY task_type
      ORDER BY total_cost DESC
    `);

    // 2. Cost & Hours by Crop
    const cropBreakdown = await pool.query(`
      SELECT
        COALESCE(NULLIF(crop_name, ''), 'General / Overhead') as crop_name,
        COUNT(*) as entry_count,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COALESCE(SUM(total_labor_cost), 0) as total_cost
      FROM vivas_labor_timesheets
      GROUP BY crop_name
      ORDER BY total_cost DESC
    `);

    // 3. Worker Leaderboard
    const workerBreakdown = await pool.query(`
      SELECT
        worker_name,
        COALESCE(SUM(total_hours), 0) as total_hours,
        COALESCE(SUM(total_labor_cost), 0) as total_cost
      FROM vivas_labor_timesheets
      GROUP BY worker_name
      ORDER BY total_hours DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        task_breakdown: taskBreakdown.rows,
        crop_breakdown: cropBreakdown.rows,
        worker_breakdown: workerBreakdown.rows
      }
    });
  } catch (err) {
    console.error("Error fetching labor analytics:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;
