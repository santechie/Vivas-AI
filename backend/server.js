import { processOutboxBatch } from "./services/eventBus.js";
import { processWebhookQueueBatch } from "./services/webhookDispatcher.js";
import { tickScheduler, runScheduledJob } from "./services/scheduler.js";
import { registerChiJobs } from "./services/chi/importWorker.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pool from "./config/db.js";
import cropHealthRouter from "./routes/cropHealth.js";
import chiRouter from "./routes/cropHealthIntegration.js";
import accountRouter from "./routes/account.js";
import settingsRouter from "./routes/settings.js";
import partnerHubRouter from "./routes/partnerHub.js";
import partnerApiV1Router from "./routes/partnerApiV1.js";
import farmMapRouter from "./routes/farmMap.js";
import growRouter from "./routes/grow.js";
import sellRouter from "./routes/sell.js";
import assetsRouter from "./routes/assets.js";
import laborRouter from "./routes/labor.js";
import financialsRouter from "./routes/financials.js";
import contactsRouter from "./routes/contacts.js";
import reportsRouter from "./routes/reports.js";
import buyRouter from "./routes/buy.js";

import {
  hashPassword, verifyPassword, passwordPolicyError, signToken, verifyToken, revokeToken, bearer,
  attachAuth, authGate, farmGuard, requireAdmin, securityStats, rateLimit, securityHeaders, corsOptions
} from "./middleware/security.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware (Phase 1 security hardening)
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors(corsOptions()));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(attachAuth);
app.use(authGate);
app.use(farmGuard);
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: Number(process.env.API_RATE_LIMIT || 1200), message: 'Too many requests. Please slow down.' }));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 20),
  key: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  message: 'Too many attempts. Please wait 15 minutes and try again.'
});
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'], authLimiter);

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
app.get('/api/security/status', requireAdmin, (_req, res) => res.json({ success: true, data: securityStats() }));

// Mount Routers
app.use('/api/ch', cropHealthRouter);
app.use('/api/chi', chiRouter);
app.use('/api/account', accountRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/pih', partnerHubRouter);
app.use('/api/pih/v1', partnerApiV1Router);
app.use('/api/farm-map', farmMapRouter);
app.use('/api/financials', financialsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/buy', buyRouter);
app.use('/api/labor', laborRouter);
app.use(assetsRouter);
app.use(sellRouter);
app.use(growRouter);

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, 'uploads', 'crops');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const fileStorageDir = path.join(__dirname, 'uploads', 'file_storage');
if (!fs.existsSync(fileStorageDir)) {
  fs.mkdirSync(fileStorageDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth helpers live in ./middleware/security.js (scrypt hashing, signed expiring tokens)
const SELF_SERVICE_ROLES = ['Farm Owner', 'Farm Manager', 'Field Crew'];

// ==========================================
// 0. AUTHENTICATION API ROUTES
// ==========================================

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, email, password, farm_name, role } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: "Full Name, Email, and Password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    const policyErr = passwordPolicyError(password);
    if (policyErr) {
      return res.status(400).json({ success: false, message: policyErr });
    }
    const existing = await pool.query("SELECT id FROM vivas_users WHERE email = $1", [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: "An account with this email address already exists." });
    }

    const pwdHash = await hashPassword(password);
    const safeRole = SELF_SERVICE_ROLES.includes(role) ? role : 'Farm Manager';
    const userRes = await pool.query(
      `INSERT INTO vivas_users (full_name, email, password_hash, farm_name, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, farm_name, role, created_at`,
      [full_name.trim(), cleanEmail, pwdHash, farm_name ? farm_name.trim() : 'Vivas Organics Farm', safeRole]
    );

    const user = userRes.rows[0];
    const token = signToken(user);
    res.json({
      success: true,
      message: "Registration successful! Welcome to Vivas AI.",
      token,
      user
    });
  } catch (err) {
    console.error("Error in registration:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and Password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();

    const userRes = await pool.query(
      "SELECT id, full_name, email, farm_name, role, password_hash, is_active FROM vivas_users WHERE email = $1",
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      await verifyPassword(password, 'x'); // keep timing similar
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const user = userRes.rows[0];
    const check = await verifyPassword(password, user.password_hash);
    if (!check.ok) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "Your account is inactive. Please contact support." });
    }

    if (check.needsUpgrade) {
      // transparently upgrade legacy SHA-256 hashes to scrypt on successful login
      const upgraded = await hashPassword(password);
      await pool.query("UPDATE vivas_users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [upgraded, user.id]);
    }

    const { password_hash, ...userProfile } = user;
    const token = signToken(userProfile);
    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: userProfile
    });
  } catch (err) {
    console.error("Error in login:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/forgot-password
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await pool.query("SELECT id, full_name FROM vivas_users WHERE email = $1", [cleanEmail]);

    if (userRes.rows.length === 0) {
      return res.json({
        success: true,
        message: "If an account with this email exists, a password reset link has been generated."
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    await pool.query(
      "UPDATE vivas_users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour' WHERE id = $2",
      [resetToken, userRes.rows[0].id]
    );

    // The reset token must only reach the user by email. It is returned in the API response
    // ONLY in non-production (until the email service lands in Phase 5).
    if (process.env.NODE_ENV === 'production') {
      console.log(`[auth] password reset requested for user ${userRes.rows[0].id}`);
      return res.json({
        success: true,
        message: "If an account with this email exists, a password reset link has been generated."
      });
    }
    res.json({
      success: true,
      message: "Password reset token generated successfully.",
      reset_token: resetToken
    });
  } catch (err) {
    console.error("Error in forgot-password:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/reset-password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;
    if (!reset_token || !new_password) {
      return res.status(400).json({ success: false, message: "Reset token and new password are required." });
    }

    const userRes = await pool.query(
      "SELECT id FROM vivas_users WHERE reset_token = $1 AND reset_token_expires > NOW()",
      [reset_token]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid or expired password reset token." });
    }

    const userId = userRes.rows[0].id;
    const policyErr = passwordPolicyError(new_password);
    if (policyErr) {
      return res.status(400).json({ success: false, message: policyErr });
    }
    const pwdHash = await hashPassword(new_password);

    await pool.query(
      "UPDATE vivas_users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2",
      [pwdHash, userId]
    );

    res.json({ success: true, message: "Password updated successfully. You can now log in with your new password." });
  } catch (err) {
    console.error("Error in reset-password:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", async (req, res) => {
  try {
    const token = bearer(req) || req.query.token;
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, message: "Session expired or invalid token." });
    }
    const uRes = await pool.query(
      "SELECT id, full_name, email, farm_name, role, is_active FROM vivas_users WHERE id = $1",
      [payload.uid]
    );
    if (uRes.rows.length === 0 || !uRes.rows[0].is_active) {
      return res.status(401).json({ success: false, message: "Session expired or invalid token." });
    }
    const { is_active, ...user } = uRes.rows[0];
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  const token = bearer(req) || req.body?.token;
  if (token) revokeToken(token);

  res.json({ success: true, message: "Logged out successfully." });
});


// ==========================================
// 0.5 MULTI-FARM WORKSPACE API ROUTES
// ==========================================

// GET /api/farms - List all farms for logged-in user
app.get("/api/farms", async (req, res) => {
  try {
    const { user_id, email } = req.query;
    let userId = user_id;

    if (!userId && email) {
      const uRes = await pool.query("SELECT id FROM vivas_users WHERE email = $1", [email.trim().toLowerCase()]);
      if (uRes.rows.length > 0) userId = uRes.rows[0].id;
    }

    if (!userId) {
      const defaultUser = await pool.query("SELECT id FROM vivas_users WHERE email = 'admin@vivas.ai' LIMIT 1");
      if (defaultUser.rows.length > 0) userId = defaultUser.rows[0].id;
    }

    if (!userId) {
      return res.json({ success: true, data: [] });
    }

    let farmsRes = await pool.query(
      `SELECT f.*, uf.role_in_farm, uf.is_default, uf.joined_at
       FROM vivas_farms f
       JOIN vivas_user_farms uf ON uf.farm_id = f.id
       WHERE uf.user_id = $1 AND f.is_active = TRUE
       ORDER BY f.last_accessed_at DESC, f.created_at DESC`,
      [userId]
    );

    // If user has no farm workspaces, auto-create a default farm workspace
    if (farmsRes.rows.length === 0) {
      const uInfo = await pool.query("SELECT full_name, farm_name FROM vivas_users WHERE id = $1", [userId]);
      const farmName = (uInfo.rows[0] && uInfo.rows[0].farm_name) ? uInfo.rows[0].farm_name : 'Vivas Organics Demonstration Farm';

      const newFarmRes = await pool.query(
        `INSERT INTO vivas_farms (owner_id, farm_name, city, state_country, total_area_acres, farm_type, weather_summary)
         VALUES ($1, $2, 'Bangalore', 'Karnataka, India', 25.0, 'Organic Vegetable & Herb Farm', '78°F Sunny') RETURNING *`,
        [userId, farmName]
      );
      const newFarm = newFarmRes.rows[0];

      await pool.query(
        `INSERT INTO vivas_user_farms (user_id, farm_id, role_in_farm, is_default)
         VALUES ($1, $2, 'Farm Administrator', TRUE)`,
        [userId, newFarm.id]
      );

      farmsRes = await pool.query(
        `SELECT f.*, uf.role_in_farm, uf.is_default, uf.joined_at
         FROM vivas_farms f
         JOIN vivas_user_farms uf ON uf.farm_id = f.id
         WHERE uf.user_id = $1 AND f.is_active = TRUE
         ORDER BY f.last_accessed_at DESC, f.created_at DESC`,
        [userId]
      );
    }

    res.json({ success: true, data: farmsRes.rows, total: farmsRes.rowCount });
  } catch (err) {
    console.error("Error fetching farms:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/farms/:id - Get single farm detail
app.get("/api/farms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const farmRes = await pool.query("SELECT * FROM vivas_farms WHERE id = $1 AND is_active = TRUE", [id]);
    if (farmRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Farm not found" });
    }
    res.json({ success: true, data: farmRes.rows[0] });
  } catch (err) {
    console.error("Error fetching farm details:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/farms - Create new farm workspace
app.post("/api/farms", async (req, res) => {
  try {
    const {
      user_id, email, farm_name, legal_name, city, state_country,
      total_area_acres, farm_type, weather_summary, role_in_farm
    } = req.body;

    if (!farm_name || !farm_name.trim()) {
      return res.status(400).json({ success: false, message: "Farm Name is required." });
    }

    let ownerId = user_id;
    if (!ownerId && email) {
      const uRes = await pool.query("SELECT id FROM vivas_users WHERE email = $1", [email.trim().toLowerCase()]);
      if (uRes.rows.length > 0) ownerId = uRes.rows[0].id;
    }
    if (!ownerId) {
      const defaultUser = await pool.query("SELECT id FROM vivas_users WHERE email = 'admin@vivas.ai' LIMIT 1");
      if (defaultUser.rows.length > 0) ownerId = defaultUser.rows[0].id;
    }

    const farmRes = await pool.query(
      `INSERT INTO vivas_farms (owner_id, farm_name, legal_name, city, state_country, total_area_acres, farm_type, weather_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        ownerId,
        farm_name.trim(),
        legal_name ? legal_name.trim() : null,
        city ? city.trim() : 'Bangalore',
        state_country ? state_country.trim() : 'Karnataka, India',
        parseFloat(total_area_acres) || 15.0,
        farm_type || 'Organic Vegetable & Herb Farm',
        weather_summary || '78°F Sunny'
      ]
    );

    const newFarm = farmRes.rows[0];

    if (ownerId) {
      await pool.query(
        `INSERT INTO vivas_user_farms (user_id, farm_id, role_in_farm, is_default)
         VALUES ($1, $2, $3, FALSE) ON CONFLICT (user_id, farm_id) DO NOTHING`,
        [ownerId, newFarm.id, role_in_farm || 'Farm Owner / Manager']
      );
    }

    res.json({
      success: true,
      message: "Farm workspace registered successfully!",
      data: { ...newFarm, role_in_farm: role_in_farm || 'Farm Owner / Manager' }
    });
  } catch (err) {
    console.error("Error creating farm workspace:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/farms/:id - Update farm workspace
app.put("/api/farms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { farm_name, legal_name, city, state_country, total_area_acres, farm_type, weather_summary, role_in_farm } = req.body;

    const result = await pool.query(
      `UPDATE vivas_farms SET
        farm_name = COALESCE($1, farm_name),
        legal_name = COALESCE($2, legal_name),
        city = COALESCE($3, city),
        state_country = COALESCE($4, state_country),
        total_area_acres = COALESCE($5, total_area_acres),
        farm_type = COALESCE($6, farm_type),
        weather_summary = COALESCE($7, weather_summary),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [
        farm_name ? farm_name.trim() : null,
        legal_name || null,
        city || null,
        state_country || null,
        total_area_acres ? parseFloat(total_area_acres) : null,
        farm_type || null,
        weather_summary || null,
        id
      ]
    );

    if (role_in_farm) {
      await pool.query(
        `UPDATE vivas_user_farms SET role_in_farm = $1 WHERE farm_id = $2`,
        [role_in_farm.trim(), id]
      );
    }

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Farm workspace not found" });
    res.json({ success: true, data: { ...result.rows[0], role_in_farm }, message: "Farm workspace updated successfully" });
  } catch (err) {
    console.error("Error updating farm workspace:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/farms/:id - Archive/Delete farm workspace
app.delete("/api/farms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE vivas_farms SET is_active = FALSE WHERE id = $1", [id]);
    res.json({ success: true, message: "Farm workspace archived successfully" });
  } catch (err) {
    console.error("Error deleting farm workspace:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/farms/select - Select active farm workspace
app.post("/api/farms/select", async (req, res) => {
  try {
    const { farm_id, user_id } = req.body;
    if (!farm_id) {
      return res.status(400).json({ success: false, message: "Farm ID is required." });
    }

    const farmRes = await pool.query(
      `UPDATE vivas_farms SET last_accessed_at = NOW() WHERE id = $1 RETURNING *`,
      [farm_id]
    );

    if (farmRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Farm workspace not found." });
    }

    let roleInFarm = 'Farm Owner / Manager';
    if (user_id) {
      const ufRes = await pool.query("SELECT role_in_farm FROM vivas_user_farms WHERE user_id = $1 AND farm_id = $2", [user_id, farm_id]);
      if (ufRes.rows.length > 0) roleInFarm = ufRes.rows[0].role_in_farm;
    }

    res.json({
      success: true,
      message: "Farm workspace activated successfully.",
      data: { ...farmRes.rows[0], role_in_farm: roleInFarm }
    });
  } catch (err) {
    console.error("Error selecting farm workspace:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ==========================================
// 1. WIDGET CONFIGURATION ROUTES
// ==========================================

// Get widget configurations
app.get("/api/widgets/config", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM vivas_widget_configs ORDER BY position ASC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching widget configs:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update widget configurations
app.post("/api/widgets/config", async (req, res) => {
  try {
    const configs = req.body; // Expects array of { widget_key, is_visible, position }
    if (!Array.isArray(configs)) {
      return res.status(400).json({ success: false, message: "Invalid body format, array expected" });
    }

    for (const conf of configs) {
      await pool.query(
        "UPDATE vivas_widget_configs SET is_visible = $1, position = $2, updated_at = NOW() WHERE widget_key = $3",
        [conf.is_visible, conf.position, conf.widget_key]
      );
    }

    res.json({ success: true, message: "Widget configs updated successfully" });
  } catch (err) {
    console.error("Error updating widget configs:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. DASHBOARD DATA ENDPOINTS
// ==========================================

// Fetch counts for KPI tasks (Planned Greenhouse, Field Plantings, Harvest)
app.get("/api/modules/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT task_type, status, COUNT(*) FROM vivas_farm_tasks WHERE task_type != 'today_task' GROUP BY task_type, status");

    // Process results into easy KPI structure
    const data = {
      greenhouse_sow: { complete: 0, incomplete: 0 },
      field_planting: { complete: 0, incomplete: 0 },
      harvest: { complete: 0, incomplete: 0 }
    };

    result.rows.forEach(row => {
      const type = row.task_type;
      const status = row.status;
      const count = parseInt(row.count, 10);
      if (data[type]) {
        data[type][status] = count;
      }
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching task statistics:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch counts of committed orders
app.get("/api/modules/orders", async (req, res) => {
  try {
    const result = await pool.query("SELECT status, COUNT(*) FROM vivas_orders GROUP BY status");

    const data = { fulfilled: 0, not_fulfilled: 0 };
    result.rows.forEach(row => {
      const status = row.status;
      const count = parseInt(row.count, 10);
      if (data[status] !== undefined) {
        data[status] = count;
      }
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching orders statistics:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch crop yields (valuation) chart data
app.get("/api/modules/yields", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT crop_name, estimated_value, actual_value FROM vivas_crop_yields ORDER BY estimated_value DESC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching crop yields:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch labor hours
app.get("/api/modules/labor", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT person_name, hours_worked FROM vivas_labor_hours ORDER BY hours_worked DESC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching labor hours:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch planting summaries
app.get("/api/modules/plantings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT field_name, crop_name, area_planted, planting_date FROM vivas_plantings ORDER BY planting_date DESC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching plantings:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch greenhouse sow summaries
app.get("/api/modules/sows", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT greenhouse, crop_name, tray_count, sow_date FROM vivas_greenhouse_sows ORDER BY sow_date DESC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching greenhouse sows:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch today's tasks
app.get("/api/modules/today-tasks", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, task_name, status, due_date, assigned_to FROM vivas_farm_tasks WHERE task_type = 'today_task' ORDER BY status ASC, task_name ASC"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching today's tasks:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle completion of a task
app.patch("/api/modules/today-tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expects 'complete' or 'incomplete'

    if (status !== "complete" && status !== "incomplete") {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const result = await pool.query(
      "UPDATE vivas_farm_tasks SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error updating today's task:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. TASKS MODULE MANAGEMENT APIs
// ==========================================

// Get tasks with filtering & searching
app.get("/api/tasks", async (req, res) => {
  try {
    const {
      search,
      status,
      task_type,
      planting_type,
      crop,
      variety,
      harvest_stage,
      assigned_to,
      location_type,
      location,
      priority,
      tag,
      planting_id,
      equipment,
      date_range
    } = req.query;

    let queryText = "SELECT * FROM vivas_farm_tasks WHERE 1=1";
    const queryParams = [];

    // Search query matches task_name, crop, assigned_to, or location
    if (search) {
      queryParams.push(`%${search}%`);
      queryText += ` AND (task_name ILIKE $${queryParams.length} OR crop ILIKE $${queryParams.length} OR assigned_to ILIKE $${queryParams.length} OR location ILIKE $${queryParams.length})`;
    }

    // Direct filter mappings
    const filters = {
      status,
      task_type,
      planting_type,
      crop,
      variety,
      harvest_stage,
      assigned_to,
      location_type,
      location,
      priority,
      tag,
      planting_id,
      equipment
    };

    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== "All") {
        queryParams.push(val);
        queryText += ` AND ${key} = $${queryParams.length}`;
      }
    });

    // Date range filter
    if (date_range === "This Week") {
      queryText += " AND due_date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '7 days'";
    } else if (date_range === "Next Week") {
      queryText += " AND due_date BETWEEN CURRENT_DATE + INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '14 days'";
    }

    queryText += " ORDER BY due_date ASC, created_at DESC";

    const result = await pool.query(queryText, queryParams);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error loading tasks:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new task
app.post("/api/tasks", async (req, res) => {
  try {
    const {
      task_name,
      task_type,
      status,
      due_date,
      assigned_to,
      planting_type,
      crop,
      variety,
      harvest_stage,
      location_type,
      location,
      priority,
      tag,
      planting_id,
      equipment
    } = req.body;

    if (!task_name || !task_type || !due_date) {
      return res.status(400).json({ success: false, message: "Missing required fields (task_name, task_type, due_date)" });
    }

    const queryText = `
      INSERT INTO vivas_farm_tasks (
        task_name, task_type, status, due_date, assigned_to,
        planting_type, crop, variety, harvest_stage, location_type,
        location, priority, tag, planting_id, equipment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;

    const values = [
      task_name,
      task_type,
      status || "incomplete",
      due_date,
      assigned_to || null,
      planting_type || null,
      crop || null,
      variety || null,
      harvest_stage || null,
      location_type || null,
      location || null,
      priority || "Medium",
      tag || null,
      planting_id || null,
      equipment || null
    ];

    const result = await pool.query(queryText, values);
    res.json({ success: true, data: result.rows[0], message: "Task created successfully" });
  } catch (err) {
    console.error("Error creating task:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update a task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      task_name,
      task_type,
      status,
      due_date,
      assigned_to,
      planting_type,
      crop,
      variety,
      harvest_stage,
      location_type,
      location,
      priority,
      tag,
      planting_id,
      equipment
    } = req.body;

    const queryText = `
      UPDATE vivas_farm_tasks SET
        task_name = $1,
        task_type = $2,
        status = $3,
        due_date = $4,
        assigned_to = $5,
        planting_type = $6,
        crop = $7,
        variety = $8,
        harvest_stage = $9,
        location_type = $10,
        location = $11,
        priority = $12,
        tag = $13,
        planting_id = $14,
        equipment = $15
      WHERE id = $16
      RETURNING *;
    `;

    const values = [
      task_name,
      task_type,
      status,
      due_date,
      assigned_to,
      planting_type,
      crop,
      variety,
      harvest_stage,
      location_type,
      location,
      priority,
      tag,
      planting_id,
      equipment,
      id
    ];

    const result = await pool.query(queryText, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.json({ success: true, data: result.rows[0], message: "Task updated successfully" });
  } catch (err) {
    console.error("Error updating task:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_farm_tasks WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    console.error("Error deleting task:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. NOTES & OBSERVATIONS APIs
// ==========================================

// Get notes list (UNIONed across vivas_notes, vivas_soil_tests, vivas_completed_tasks_records, vivas_expenses, vivas_crop_yields)
app.get("/api/notes", async (req, res) => {
  try {
    const {
      search,
      note_type,
      crop_category,
      crop,
      location,
      author_name,
      note_year
    } = req.query;

    let queryText = `
      WITH unified_notes AS (
        SELECT 
          id, title, note_type, crop_category, crop, location, author_name, note_year, content,
          NULL::numeric AS ph, NULL::numeric AS nitrogen, NULL::numeric AS phosphorus, NULL::numeric AS potassium,
          NULL::numeric AS hours_spent, NULL::numeric AS amount,
          NULL::varchar AS task_type, NULL::varchar AS status, NULL::varchar AS priority, NULL::date AS due_date,
          NULL::varchar AS start_time, NULL::varchar AS end_time, NULL::varchar AS assignee, '[]'::jsonb AS checklist,
          NULL::text AS instructions, NULL::varchar AS tags, NULL::varchar AS planting, '[]'::jsonb AS equipment,
          '[]'::jsonb AS inputs, NULL::numeric AS estimated_labor, NULL::varchar AS actual_labor, '[]'::jsonb AS external_links,
          created_at
        FROM vivas_notes
        
        UNION ALL
        
        SELECT 
          id, title, 'Soil Tests' AS note_type, crop_category, crop, location, author_name, note_year, content,
          ph, nitrogen, phosphorus, potassium,
          NULL::numeric AS hours_spent, NULL::numeric AS amount,
          NULL::varchar AS task_type, NULL::varchar AS status, NULL::varchar AS priority, NULL::date AS due_date,
          NULL::varchar AS start_time, NULL::varchar AS end_time, NULL::varchar AS assignee, '[]'::jsonb AS checklist,
          NULL::text AS instructions, NULL::varchar AS tags, NULL::varchar AS planting, '[]'::jsonb AS equipment,
          '[]'::jsonb AS inputs, NULL::numeric AS estimated_labor, NULL::varchar AS actual_labor, '[]'::jsonb AS external_links,
          created_at
        FROM vivas_soil_tests
        
        UNION ALL
        
        SELECT 
          id, title, 'Task' AS note_type, crop_category, crop, location, author_name, note_year, content,
          NULL::numeric AS ph, NULL::numeric AS nitrogen, NULL::numeric AS phosphorus, NULL::numeric AS potassium,
          hours_spent, NULL::numeric AS amount,
          task_type, status, priority, due_date,
          start_time, end_time, assignee, checklist,
          instructions, tags, planting, equipment,
          inputs, estimated_labor, actual_labor, external_links,
          created_at
        FROM vivas_completed_tasks_records
        
        UNION ALL
        
        SELECT 
          id, title, 'Expenses' AS note_type, crop_category, crop, location, author_name, note_year, content,
          NULL::numeric AS ph, NULL::numeric AS nitrogen, NULL::numeric AS phosphorus, NULL::numeric AS potassium,
          NULL::numeric AS hours_spent, amount,
          NULL::varchar AS task_type, NULL::varchar AS status, NULL::varchar AS priority, NULL::date AS due_date,
          NULL::varchar AS start_time, NULL::varchar AS end_time, NULL::varchar AS assignee, '[]'::jsonb AS checklist,
          NULL::text AS instructions, NULL::varchar AS tags, NULL::varchar AS planting, '[]'::jsonb AS equipment,
          '[]'::jsonb AS inputs, NULL::numeric AS estimated_labor, NULL::varchar AS actual_labor, '[]'::jsonb AS external_links,
          created_at
        FROM vivas_expenses

        UNION ALL

        SELECT 
          id, crop_name || ' Yield Valuation' AS title, 'Harvest & Yield' AS note_type, 'Vegetables'::varchar AS crop_category, crop_name AS crop, NULL::varchar AS location, 'System'::varchar AS author_name, 2026 AS note_year, 'Estimated yield value: $' || estimated_value || ', Actual: $' || actual_value AS content,
          NULL::numeric AS ph, NULL::numeric AS nitrogen, NULL::numeric AS phosphorus, NULL::numeric AS potassium,
          NULL::numeric AS hours_spent, NULL::numeric AS amount,
          NULL::varchar AS task_type, NULL::varchar AS status, NULL::varchar AS priority, NULL::date AS due_date,
          NULL::varchar AS start_time, NULL::varchar AS end_time, NULL::varchar AS assignee, '[]'::jsonb AS checklist,
          NULL::text AS instructions, NULL::varchar AS tags, NULL::varchar AS planting, '[]'::jsonb AS equipment,
          '[]'::jsonb AS inputs, NULL::numeric AS estimated_labor, NULL::varchar AS actual_labor, '[]'::jsonb AS external_links,
          harvest_date::timestamptz AS created_at
        FROM vivas_crop_yields
      )
      SELECT * FROM unified_notes WHERE 1=1
    `;
    const queryParams = [];

    // Search query matches title or content
    if (search) {
      queryParams.push(`%${search}%`);
      queryText += ` AND (title ILIKE $${queryParams.length} OR content ILIKE $${queryParams.length} OR crop ILIKE $${queryParams.length})`;
    }

    // Handle multi-value note_type query param (e.g. note_type=Notes,Task)
    if (note_type && note_type !== "All") {
      const types = note_type.split(",");
      const placeholders = types.map((_, i) => `$${queryParams.length + i + 1}`).join(", ");
      queryParams.push(...types);
      queryText += ` AND note_type IN (${placeholders})`;
    }

    // Direct filter mappings
    const filters = {
      crop_category,
      crop,
      location,
      author_name,
      note_year
    };

    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== "All") {
        queryParams.push(val);
        queryText += ` AND ${key} = $${queryParams.length}`;
      }
    });

    queryText += " ORDER BY created_at DESC";

    const result = await pool.query(queryText, queryParams);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching notes:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Parse "3h 30m" format to numeric hours decimal
function parseActualLaborToHours(actualStr) {
  if (!actualStr) return 0;
  const match = actualStr.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours + (minutes / 60);
}

// Create note or sub-type record
app.post("/api/notes", async (req, res) => {
  try {
    const {
      title,
      note_type,
      crop_category,
      crop,
      location,
      author_name,
      note_year,
      content,
      // sub-type fields
      ph,
      nitrogen,
      phosphorus,
      potassium,
      amount,
      // Task drawer fields
      task_type,
      status,
      priority,
      due_date,
      start_time,
      end_time,
      assignee,
      checklist,
      instructions,
      tags,
      planting,
      equipment,
      inputs,
      estimated_labor,
      actual_labor,
      external_links
    } = req.body;

    if (!title || !author_name) {
      return res.status(400).json({ success: false, message: "Missing required fields (title, author_name)" });
    }

    const yearVal = note_year ? parseInt(note_year, 10) : 2026;

    if (note_type === "Soil Tests") {
      const {
        test_date, sample_id, soil_texture, soil_depth_cm,
        organic_matter, calcium, magnesium, sulfur,
        iron, zinc, manganese, copper, boron,
        cec, ec, moisture, gps_lat, gps_lng,
        lab_id, lab_name: labNameField, recommendations, status: soilStatus
      } = req.body;

      const queryText = `
        INSERT INTO vivas_soil_tests (
          title, crop_category, crop, location, author_name, note_year,
          ph, nitrogen, phosphorus, potassium, content,
          test_date, sample_id, soil_texture, soil_depth_cm,
          organic_matter, calcium, magnesium, sulfur,
          iron, zinc, manganese, copper, boron,
          cec, ec, moisture, gps_lat, gps_lng,
          lab_id, lab_name, recommendations, status
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,
          $12,$13,$14,$15,
          $16,$17,$18,$19,
          $20,$21,$22,$23,$24,
          $25,$26,$27,$28,$29,
          $30,$31,$32,$33
        ) RETURNING *;
      `;
      const n = (v) => (v !== undefined && v !== '' && v !== null) ? parseFloat(v) : null;
      const values = [
        title, crop_category || null, crop || null, location || null, author_name, yearVal,
        n(ph), n(nitrogen), n(phosphorus), n(potassium), content || '',
        test_date || null, sample_id || null, soil_texture || null, n(soil_depth_cm),
        n(organic_matter), n(calcium), n(magnesium), n(sulfur),
        n(iron), n(zinc), n(manganese), n(copper), n(boron),
        n(cec), n(ec), n(moisture), n(gps_lat), n(gps_lng),
        lab_id ? parseInt(lab_id) : null, labNameField || null, recommendations || null,
        soilStatus || 'Pending'
      ];
      const result = await pool.query(queryText, values);
      return res.json({ success: true, data: { ...result.rows[0], note_type: "Soil Tests" }, message: "Soil test record created successfully" });
    }

    if (note_type === "Task") {
      const calcHours = parseActualLaborToHours(actual_labor);
      const queryText = `
        INSERT INTO vivas_completed_tasks_records (
          title, crop_category, crop, location, author_name, note_year, content,
          task_type, status, priority, due_date, start_time, end_time, assignee,
          checklist, instructions, tags, planting, equipment, inputs,
          estimated_labor, actual_labor, external_links, hours_spent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *;
      `;
      const values = [
        title,
        crop_category || null,
        crop || null,
        location || null,
        author_name,
        yearVal,
        content || "",
        task_type || 'greenhouse_sow',
        status || 'Not Started',
        priority || 'Medium',
        due_date || new Date().toISOString().split('T')[0],
        start_time || '09:00 AM',
        end_time || '05:00 PM',
        assignee || null,
        JSON.stringify(checklist || []),
        instructions || null,
        tags || "",
        planting || null,
        JSON.stringify(equipment || []),
        JSON.stringify(inputs || []),
        estimated_labor ? parseFloat(estimated_labor) : null,
        actual_labor || '0h 00m',
        JSON.stringify(external_links || []),
        calcHours
      ];
      const result = await pool.query(queryText, values);
      return res.json({ success: true, data: { ...result.rows[0], note_type: "Task" }, message: "Completed task record created successfully" });
    }

    if (note_type === "Expenses") {
      const queryText = `
        INSERT INTO vivas_expenses (
          title, crop_category, crop, location, author_name, note_year, amount, content
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const values = [
        title,
        crop_category || null,
        crop || null,
        location || null,
        author_name,
        yearVal,
        amount ? parseFloat(amount) : 0.00,
        content || ""
      ];
      const result = await pool.query(queryText, values);
      return res.json({ success: true, data: { ...result.rows[0], note_type: "Expenses" }, message: "Expense record created successfully" });
    }

    // Default: Notes and Observations (written to vivas_notes)
    const queryText = `
      INSERT INTO vivas_notes (
        title, note_type, crop_category, crop, location, author_name, note_year, content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      title,
      note_type || "Notes",
      crop_category || null,
      crop || null,
      location || null,
      author_name,
      yearVal,
      content || ""
    ];
    const result = await pool.query(queryText, values);
    return res.json({ success: true, data: result.rows[0], message: "Note record created successfully" });
  } catch (err) {
    console.error("Error creating note:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete note or sub-type record
app.delete("/api/notes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // Expect type filter to determine which subtable to delete from

    let result;
    if (type === "Soil Tests") {
      result = await pool.query("DELETE FROM vivas_soil_tests WHERE id = $1 RETURNING *", [id]);
    } else if (type === "Task") {
      result = await pool.query("DELETE FROM vivas_completed_tasks_records WHERE id = $1 RETURNING *", [id]);
    } else if (type === "Expenses") {
      result = await pool.query("DELETE FROM vivas_expenses WHERE id = $1 RETURNING *", [id]);
    } else if (type === "Harvest & Yield") {
      result = await pool.query("DELETE FROM vivas_crop_yields WHERE id = $1 RETURNING *", [id]);
    } else {
      result = await pool.query("DELETE FROM vivas_notes WHERE id = $1 RETURNING *", [id]);
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, message: "Record deleted successfully" });
  } catch (err) {
    console.error("Error deleting note/record:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// LABS MASTER ROUTES
// ==========================================

// GET /api/labs — list all labs, optional ?search=query
app.get("/api/labs", async (req, res) => {
  try {
    const { search } = req.query;
    let queryText = "SELECT * FROM vivas_labs WHERE is_active = TRUE";
    const params = [];
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      queryText += ` AND (lab_name ILIKE $1 OR lab_code ILIKE $1 OR contact_person ILIKE $1)`;
    }
    queryText += " ORDER BY lab_name ASC";
    const result = await pool.query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching labs:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/labs — create new lab
app.post("/api/labs", async (req, res) => {
  try {
    const { lab_name, lab_code, contact_person, phone, email, address, accreditation } = req.body;
    if (!lab_name || !lab_name.trim()) {
      return res.status(400).json({ success: false, message: "Lab name is required" });
    }
    const result = await pool.query(
      `INSERT INTO vivas_labs (lab_name, lab_code, contact_person, phone, email, address, accreditation)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [lab_name.trim(), lab_code || null, contact_person || null, phone || null, email || null, address || null, accreditation || null]
    );
    res.json({ success: true, data: result.rows[0], message: "Lab created successfully" });
  } catch (err) {
    console.error("Error creating lab:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/locations — list unique locations from all tables
app.get("/api/locations", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT location FROM (
        SELECT location FROM vivas_notes WHERE location IS NOT NULL AND location != ''
        UNION SELECT location FROM vivas_soil_tests WHERE location IS NOT NULL AND location != ''
        UNION SELECT location FROM vivas_completed_tasks_records WHERE location IS NOT NULL AND location != ''
        UNION SELECT location FROM vivas_expenses WHERE location IS NOT NULL AND location != ''
      ) t ORDER BY location ASC
    `);
    res.json({ success: true, data: result.rows.map(r => r.location) });
  } catch (err) {
    console.error("Error fetching locations:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ==========================================
// FARM MAP DATABASE INITIALIZATION & MIGRATIONS
// ==========================================
async function initFarmMapTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vivas_farm_map_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parent_id UUID REFERENCES vivas_farm_map_items(id) ON DELETE CASCADE,
        location_level VARCHAR(30) NOT NULL DEFAULT 'field',
        location_type VARCHAR(50),
        name VARCHAR(150) NOT NULL,
        code VARCHAR(50),
        item_type VARCHAR(50) NOT NULL DEFAULT 'Field',
        shape VARCHAR(30) DEFAULT 'rectangle',
        geojson JSONB,
        color VARCHAR(20) DEFAULT '#2e7d32',
        description TEXT,
        gps_lat NUMERIC(10, 8),
        gps_lng NUMERIC(11, 8),
        orientation_deg NUMERIC(5, 2) DEFAULT 0,
        width_ft NUMERIC(10, 2),
        length_ft NUMERIC(10, 2),
        area_sqft NUMERIC(12, 2),
        usable_area_sqft NUMERIC(12, 2),
        beds_count INT DEFAULT 0,
        bed_width_ft NUMERIC(5, 2),
        bed_length_ft NUMERIC(10, 2),
        bed_spacing_ft NUMERIC(5, 2),
        field_type VARCHAR(50),
        irrigation_type VARCHAR(50),
        soil_type VARCHAR(100),
        crop_zone VARCHAR(100),
        notes TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vivas_farm_map_beds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        map_item_id UUID NOT NULL REFERENCES vivas_farm_map_items(id) ON DELETE CASCADE,
        bed_number INT NOT NULL,
        bed_name VARCHAR(100) NOT NULL,
        width_ft NUMERIC(5, 2),
        length_ft NUMERIC(10, 2),
        area_sqft NUMERIC(10, 2),
        geojson JSONB,
        status VARCHAR(30) DEFAULT 'empty',
        current_crop VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add new columns to vivas_farm_map_items if table already existed
    const alterQueries = [
      "ALTER TABLE vivas_farm_map_items ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES vivas_farm_map_items(id) ON DELETE CASCADE",
      "ALTER TABLE vivas_farm_map_items ADD COLUMN IF NOT EXISTS location_level VARCHAR(30) DEFAULT 'field'",
      "ALTER TABLE vivas_farm_map_items ADD COLUMN IF NOT EXISTS location_type VARCHAR(50)",
      "ALTER TABLE vivas_farm_map_items ADD COLUMN IF NOT EXISTS code VARCHAR(50)",
      "ALTER TABLE vivas_farm_map_items ADD COLUMN IF NOT EXISTS geojson JSONB",
      "ALTER TABLE vivas_farm_map_items ADD COLUMN IF NOT EXISTS orientation_deg NUMERIC(5, 2) DEFAULT 0",
      "ALTER TABLE vivas_farm_map_items ADD COLUMN IF NOT EXISTS usable_area_sqft NUMERIC(12, 2)",
      "ALTER TABLE vivas_farm_map_items ADD COLUMN IF NOT EXISTS soil_type VARCHAR(100)",
      "ALTER TABLE vivas_farm_map_beds ADD COLUMN IF NOT EXISTS geojson JSONB",
      "ALTER TABLE vivas_farm_map_beds ADD COLUMN IF NOT EXISTS area_sqft NUMERIC(10, 2)"
    ];

    for (const q of alterQueries) {
      await pool.query(q).catch(() => {});
    }
  } catch (err) {
    console.warn("Farm map DB migration warning:", err.message);
  }
}
initFarmMapTables();


// Start Server

// Outbox Event Worker: processes cross-module events every 3 seconds
setInterval(async () => {
  try {
    await processOutboxBatch();
  } catch (err) {
    console.error("[OutboxWorker] Error:", err.message);
  }
}, 3000);

// Webhook Dispatcher Queue Worker: processes pending webhook deliveries every 5 seconds
setInterval(async () => {
  try {
    await processWebhookQueueBatch();
  } catch (err) {
    console.error("[WebhookQueueWorker] Error:", err.message);
  }
}, 5000);

// Register CHI background jobs with scheduler
registerChiJobs();

// System Scheduled Jobs Runner: ticks every 30 seconds
setInterval(async () => {
  try {
    await tickScheduler();
  } catch (err) {
    console.error("[SchedulerWorker] Error:", err.message);
  }
}, 30000);

// Admin trigger endpoint for manual execution of scheduled jobs
app.post("/api/admin/scheduled-jobs/:jobName/run", requireAdmin, async (req, res) => {
  try {
    const outcome = await runScheduledJob(req.params.jobName);
    res.json({ success: true, data: outcome });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin list endpoint for system scheduled jobs status
app.get("/api/admin/scheduled-jobs", requireAdmin, async (req, res) => {
  try {
    const jobs = await pool.query("SELECT * FROM system_scheduled_jobs ORDER BY job_name ASC");
    res.json({ success: true, data: jobs.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Vivas AI Backend running on http://localhost:${PORT}`);
});
