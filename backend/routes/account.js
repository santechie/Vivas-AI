import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/security.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure file storage upload directory exists
const storageUploadsDir = path.join(process.cwd(), 'uploads', 'file_storage');
if (!fs.existsSync(storageUploadsDir)) {
  fs.mkdirSync(storageUploadsDir, { recursive: true });
}

// Helper: extract authenticated user from authorization header or fallback to default user
async function getAuthUser(req) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.query.token;

    // Check if token exists or email passed
    const signed = token ? verifyToken(token) : null;
    if (signed) {
      const sres = await pool.query(
        `SELECT id, full_name, first_name, last_name, email, role, farm_name, 
                phone_country_code, phone_number, labor_rate, labor_rate_currency, 
                avatar_url, transfer_owner_id, is_active, created_at
         FROM vivas_users WHERE id = $1`,
        [signed.uid]
      );
      if (sres.rows.length > 0) return sres.rows[0];
    }
    if (token) {
      const userRes = await pool.query(
        `SELECT id, full_name, first_name, last_name, email, role, farm_name, 
                phone_country_code, phone_number, labor_rate, labor_rate_currency, 
                avatar_url, transfer_owner_id, is_active, created_at
         FROM vivas_users WHERE id::text = $1 OR email = $1`,
        [token]
      );
      if (userRes.rows.length > 0) return userRes.rows[0];
    }

    // Default to gksvijay@gmail.com or admin@vivas.ai
    const defaultRes = await pool.query(
      `SELECT id, full_name, first_name, last_name, email, role, farm_name, 
              phone_country_code, phone_number, labor_rate, labor_rate_currency, 
              avatar_url, transfer_owner_id, is_active, created_at
       FROM vivas_users 
       WHERE email = 'gksvijay@gmail.com' 
       OR email = 'admin@vivas.ai' 
       ORDER BY CASE WHEN email = 'gksvijay@gmail.com' THEN 1 ELSE 2 END 
       LIMIT 1`
    );

    if (defaultRes.rows.length > 0) {
      return defaultRes.rows[0];
    }

    return null;
  } catch (err) {
    console.error('Error fetching auth user:', err);
    return null;
  }
}

// ==========================================
// 1. ACCOUNT SUMMARY
// ==========================================
router.get('/summary', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    // Subscription
    let subRes = await pool.query(
      `SELECT * FROM vivas_account_subscriptions WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );
    if (subRes.rows.length === 0) {
      await pool.query(
        `INSERT INTO vivas_account_subscriptions (user_id) VALUES ($1)`,
        [user.id]
      );
      subRes = await pool.query(`SELECT * FROM vivas_account_subscriptions WHERE user_id = $1 LIMIT 1`, [user.id]);
    }
    const subscription = subRes.rows[0];

    // AI Credits
    let credRes = await pool.query(
      `SELECT * FROM vivas_ai_credits WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );
    if (credRes.rows.length === 0) {
      await pool.query(
        `INSERT INTO vivas_ai_credits (user_id) VALUES ($1)`,
        [user.id]
      );
      credRes = await pool.query(`SELECT * FROM vivas_ai_credits WHERE user_id = $1 LIMIT 1`, [user.id]);
    }
    const aiCredits = credRes.rows[0];

    // Storage Add-ons
    const addonsRes = await pool.query(
      `SELECT * FROM vivas_storage_addons WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC`,
      [user.id]
    );
    const storageAddons = addonsRes.rows;
    const addonStorageGB = storageAddons.reduce((acc, curr) => acc + Number(curr.storage_gb || 0), 0);
    const addonStorageMB = addonStorageGB * 1024;
    const totalAddonCost = storageAddons.reduce((acc, curr) => acc + Number(curr.price_usd_per_mo || 0), 0);

    // Total storage quota in MB
    const planStorageMB = Number(subscription.base_storage_mb || 500);
    const totalStorageMB = planStorageMB + addonStorageMB;

    // Files and used bytes
    const filesStatsRes = await pool.query(
      `SELECT COUNT(*) as total_files, COALESCE(SUM(file_size_bytes), 0) as total_bytes 
       FROM vivas_file_storage WHERE user_id = $1`,
      [user.id]
    );
    const totalBytes = Number(filesStatsRes.rows[0].total_bytes || 0);
    const usedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const availableMB = Math.max(0, Number((totalStorageMB - usedMB).toFixed(2)));

    // Payment Method
    const pmRes = await pool.query(
      `SELECT * FROM vivas_payment_methods WHERE user_id = $1 AND is_default = true LIMIT 1`,
      [user.id]
    );
    const defaultPaymentMethod = pmRes.rows[0] || null;

    res.json({
      success: true,
      user,
      subscription,
      aiCredits: {
        ...aiCredits,
        total_remaining: (aiCredits.monthly_credits_remaining || 0) + (aiCredits.addon_credits_remaining || 0),
        total_quota: (aiCredits.monthly_credits_total || 25) + (aiCredits.addon_credits_total || 0)
      },
      storage: {
        planStorageMB,
        addonStorageMB,
        totalStorageMB,
        usedMB,
        usedBytes: totalBytes,
        availableMB,
        totalAddonCost,
        storageAddons,
        totalFiles: Number(filesStatsRes.rows[0].total_files || 0)
      },
      defaultPaymentMethod
    });
  } catch (err) {
    console.error('Error fetching account summary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. PROFILE ROUTES
// ==========================================
router.get('/profile', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    // Team members list for transfer owner dropdown
    const teamRes = await pool.query(
      `SELECT id, full_name, email, role FROM vivas_users WHERE id != $1 ORDER BY full_name ASC`,
      [user.id]
    );

    res.json({
      success: true,
      profile: user,
      teamMembers: teamRes.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const {
      first_name,
      last_name,
      email,
      phone_country_code = '+91',
      phone_number,
      transfer_owner_id,
      labor_rate = 0,
      avatar_url
    } = req.body;

    // Validation
    if (!first_name || !first_name.trim()) {
      return res.status(400).json({ success: false, message: 'First name is required.' });
    }
    if (!last_name || !last_name.trim()) {
      return res.status(400).json({ success: false, message: 'Last name is required.' });
    }
    if (!email || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const fullName = `${first_name.trim()} ${last_name.trim()}`;

    // Check email uniqueness if changed
    if (cleanEmail !== user.email.toLowerCase()) {
      const existing = await pool.query(`SELECT id FROM vivas_users WHERE email = $1 AND id != $2`, [cleanEmail, user.id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Email address already in use by another account.' });
      }
    }

    const updateRes = await pool.query(
      `UPDATE vivas_users
       SET first_name = $1,
           last_name = $2,
           full_name = $3,
           email = $4,
           phone_country_code = $5,
           phone_number = $6,
           transfer_owner_id = $7,
           labor_rate = $8,
           avatar_url = COALESCE($9, avatar_url),
           updated_at = NOW()
       WHERE id = $10
       RETURNING id, full_name, first_name, last_name, email, role, farm_name,
                 phone_country_code, phone_number, labor_rate, labor_rate_currency,
                 avatar_url, transfer_owner_id, updated_at`,
      [
        first_name.trim(),
        last_name.trim(),
        fullName,
        cleanEmail,
        phone_country_code,
        phone_number ? phone_number.trim() : null,
        transfer_owner_id || null,
        Number(labor_rate) || 0,
        avatar_url || null,
        user.id
      ]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      profile: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. PLANS & SUBSCRIPTION
// ==========================================
router.get('/plans', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const subRes = await pool.query(
      `SELECT * FROM vivas_account_subscriptions WHERE user_id = $1 LIMIT 1`,
      [user.id]
    );

    const availablePlans = [
      {
        id: 'free',
        name: 'Free Monthly',
        badge: 'Current Plan',
        priceMonthly: 0,
        priceAnnual: 0,
        currency: 'USD',
        description: 'Essential farm tracking, crop library, and core planning tools.',
        features: [
          { text: '1 user seat', included: true },
          { text: '25 AI credits / month', included: true },
          { text: '500 MB storage', included: true },
          { text: '3 years data retention', included: true },
          { text: 'Farm map & Bed layout', included: true },
          { text: 'Crop library & Growth cycles', included: true },
          { text: 'Mobile companion app', included: true },
          { text: 'Priority AI diagnostics', included: false },
          { text: 'Unlimited users', included: false }
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        popular: true,
        priceMonthly: 30,
        priceAnnual: 20,
        currency: 'USD',
        savings: 'Save 33%',
        description: 'For growing farms needing team collaboration, higher storage & regular AI support.',
        features: [
          { text: '5 user seats', included: true },
          { text: '500 AI credits / month', included: true },
          { text: '10 GB file storage', included: true },
          { text: '5 years data retention', included: true },
          { text: 'Multi-field farm mapping', included: true },
          { text: 'Full Harvest & Sales module', included: true },
          { text: 'Automated task generation', included: true },
          { text: 'Priority email support', included: true },
          { text: 'Custom sensor integration', included: false }
        ]
      },
      {
        id: 'ultimate',
        name: 'Ultimate',
        priceMonthly: 75,
        priceAnnual: 50,
        currency: 'USD',
        savings: 'Save 33%',
        description: 'Complete farm ERP with heavy AI diagnosis, high storage, and labor management.',
        features: [
          { text: '15 user seats', included: true },
          { text: '2,000 AI credits / month', included: true },
          { text: '50 GB file storage', included: true },
          { text: 'Unlimited data retention', included: true },
          { text: 'Advanced Crop Health AI scanner', included: true },
          { text: 'Time attendance & payroll exports', included: true },
          { text: 'Dedicated farm onboarding session', included: true },
          { text: 'Priority phone & WhatsApp support', included: true },
          { text: 'API & webhook access', included: true }
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        priceMonthly: 400,
        priceAnnual: 300,
        currency: 'USD',
        savings: 'Custom Billing',
        description: 'For large commercial growers, agtech co-ops, and research institutions.',
        features: [
          { text: 'Unlimited user seats', included: true },
          { text: 'Custom AI credits allowance', included: true },
          { text: '1 TB+ file storage', included: true },
          { text: 'Full historical audit trail', included: true },
          { text: 'Dedicated Account Agronomist', included: true },
          { text: 'Custom ERP & sensor integrations', included: true },
          { text: 'SLA 99.9% uptime guarantee', included: true },
          { text: 'Custom AI model fine-tuning', included: true },
          { text: 'On-premise / Hybrid cloud', included: true }
        ]
      }
    ];

    res.json({
      success: true,
      currentSubscription: subRes.rows[0] || null,
      availablePlans
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/upgrade-plan', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { plan_tier, billing_cycle = 'monthly' } = req.body;
    const validPlans = {
      free: { name: 'Free Monthly', priceMonthly: 0, priceAnnual: 0, users: 1, credits: 25, storage: 500, retention: 3 },
      pro: { name: 'Pro Plan', priceMonthly: 30, priceAnnual: 20 * 12, users: 5, credits: 500, storage: 10240, retention: 5 },
      ultimate: { name: 'Ultimate Plan', priceMonthly: 75, priceAnnual: 50 * 12, users: 15, credits: 2000, storage: 51200, retention: 99 },
      enterprise: { name: 'Enterprise Plan', priceMonthly: 400, priceAnnual: 300 * 12, users: 100, credits: 10000, storage: 1048576, retention: 99 }
    };

    const targetPlan = validPlans[plan_tier];
    if (!targetPlan) return res.status(400).json({ success: false, message: 'Invalid plan tier selected.' });

    const price = billing_cycle === 'annual' ? targetPlan.priceAnnual : targetPlan.priceMonthly;

    // Update Subscription
    const updatedSub = await pool.query(
      `UPDATE vivas_account_subscriptions
       SET plan_tier = $1,
           plan_name = $2,
           billing_cycle = $3,
           plan_price = $4,
           max_users = $5,
           base_ai_credits = $6,
           base_storage_mb = $7,
           data_retention_years = $8,
           current_period_start = NOW(),
           current_period_end = NOW() + (CASE WHEN $3 = 'annual' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END),
           updated_at = NOW()
       WHERE user_id = $9
       RETURNING *`,
      [
        plan_tier,
        `${targetPlan.name} (${billing_cycle === 'annual' ? 'Annual' : 'Monthly'})`,
        billing_cycle,
        price,
        targetPlan.users,
        targetPlan.credits,
        targetPlan.storage,
        targetPlan.retention,
        user.id
      ]
    );

    // Update AI Credits limit
    await pool.query(
      `UPDATE vivas_ai_credits
       SET monthly_credits_total = $1,
           monthly_credits_remaining = GREATEST(monthly_credits_remaining, $1),
           updated_at = NOW()
       WHERE user_id = $2`,
      [targetPlan.credits, user.id]
    );

    // Create Invoice Record
    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    await pool.query(
      `INSERT INTO vivas_billing_invoices (user_id, invoice_number, description, amount, currency, status, invoice_date, payment_method)
       VALUES ($1, $2, $3, $4, 'USD', 'Paid', CURRENT_DATE, 'Visa ending in 4242')`,
      [user.id, invNum, `Subscription: ${targetPlan.name} (${billing_cycle})`, price]
    );

    res.json({
      success: true,
      message: `Successfully updated subscription to ${targetPlan.name}!`,
      subscription: updatedSub.rows[0]
    });
  } catch (err) {
    console.error('Error upgrading plan:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. AI CREDITS ROUTES
// ==========================================
router.get('/ai-credits', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    let credRes = await pool.query(`SELECT * FROM vivas_ai_credits WHERE user_id = $1 LIMIT 1`, [user.id]);
    if (credRes.rows.length === 0) {
      await pool.query(`INSERT INTO vivas_ai_credits (user_id) VALUES ($1)`, [user.id]);
      credRes = await pool.query(`SELECT * FROM vivas_ai_credits WHERE user_id = $1 LIMIT 1`, [user.id]);
    }

    const purchasesRes = await pool.query(
      `SELECT * FROM vivas_ai_credit_purchases WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );

    res.json({
      success: true,
      aiCredits: credRes.rows[0],
      purchases: purchasesRes.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/ai-credits/buy', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { package_id } = req.body;
    const creditPackages = {
      '50': { name: '+50 AI Credits', credits: 50, price: 5.00 },
      '200': { name: '+200 AI Credits', credits: 200, price: 15.00 },
      '500': { name: '+500 AI Credits', credits: 500, price: 30.00 },
      '1000': { name: '+1,000 AI Credits', credits: 1000, price: 50.00 }
    };

    const pkg = creditPackages[String(package_id)];
    if (!pkg) return res.status(400).json({ success: false, message: 'Invalid credit package selected.' });

    // Insert purchase
    await pool.query(
      `INSERT INTO vivas_ai_credit_purchases (user_id, package_name, credits_amount, amount_paid, currency)
       VALUES ($1, $2, $3, $4, 'USD')`,
      [user.id, pkg.name, pkg.credits, pkg.price]
    );

    // Update AI credits balance
    const updatedCredits = await pool.query(
      `UPDATE vivas_ai_credits
       SET addon_credits_total = addon_credits_total + $1,
           addon_credits_remaining = addon_credits_remaining + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [pkg.credits, user.id]
    );

    // Create Invoice
    const invNum = `INV-AI-${Date.now().toString().slice(-6)}`;
    await pool.query(
      `INSERT INTO vivas_billing_invoices (user_id, invoice_number, description, amount, currency, status, invoice_date, payment_method)
       VALUES ($1, $2, $3, $4, 'USD', 'Paid', CURRENT_DATE, 'Visa ending in 4242')`,
      [user.id, invNum, `Add-on: ${pkg.name}`, pkg.price]
    );

    res.json({
      success: true,
      message: `Successfully added ${pkg.credits} AI credits to your account!`,
      aiCredits: updatedCredits.rows[0]
    });
  } catch (err) {
    console.error('Error buying AI credits:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Use credit simulation
router.post('/ai-credits/use', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { amount = 1 } = req.body;
    const creditsToUse = Math.max(1, Number(amount));

    const credRes = await pool.query(`SELECT * FROM vivas_ai_credits WHERE user_id = $1 LIMIT 1`, [user.id]);
    const credits = credRes.rows[0];

    let monthly = credits.monthly_credits_remaining || 0;
    let addon = credits.addon_credits_remaining || 0;
    const totalRemaining = monthly + addon;

    if (totalRemaining < creditsToUse) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient AI credits remaining. Please purchase an add-on or upgrade your plan.'
      });
    }

    let deductMonthly = Math.min(monthly, creditsToUse);
    let deductAddon = creditsToUse - deductMonthly;

    const updated = await pool.query(
      `UPDATE vivas_ai_credits
       SET monthly_credits_remaining = monthly_credits_remaining - $1,
           addon_credits_remaining = addon_credits_remaining - $2,
           credits_used = credits_used + $3,
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [deductMonthly, deductAddon, creditsToUse, user.id]
    );

    res.json({
      success: true,
      message: `Used ${creditsToUse} AI credit${creditsToUse > 1 ? 's' : ''}`,
      aiCredits: updated.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. FILE STORAGE & UPLOADS
// ==========================================
router.get('/storage', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { category, search } = req.query;

    // Base storage & subscription
    const subRes = await pool.query(`SELECT * FROM vivas_account_subscriptions WHERE user_id = $1 LIMIT 1`, [user.id]);
    const planStorageMB = Number(subRes.rows[0]?.base_storage_mb || 500);

    // Addons
    const addonsRes = await pool.query(
      `SELECT * FROM vivas_storage_addons WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC`,
      [user.id]
    );
    const storageAddons = addonsRes.rows;
    const addonStorageGB = storageAddons.reduce((acc, c) => acc + Number(c.storage_gb || 0), 0);
    const addonStorageMB = addonStorageGB * 1024;
    const totalStorageMB = planStorageMB + addonStorageMB;

    // Query files
    let query = `SELECT * FROM vivas_file_storage WHERE user_id = $1`;
    const params = [user.id];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(file_name) LIKE $${params.length} OR LOWER(COALESCE(notes, '')) LIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC`;

    const filesRes = await pool.query(query, params);

    // Stats
    const statsRes = await pool.query(
      `SELECT COUNT(*) as total_files, COALESCE(SUM(file_size_bytes), 0) as total_bytes 
       FROM vivas_file_storage WHERE user_id = $1`,
      [user.id]
    );
    const totalBytes = Number(statsRes.rows[0].total_bytes || 0);
    const usedMB = Number((totalBytes / (1024 * 1024)).toFixed(2));
    const availableMB = Math.max(0, Number((totalStorageMB - usedMB).toFixed(2)));

    res.json({
      success: true,
      files: filesRes.rows,
      storage: {
        planStorageMB,
        addonStorageMB,
        totalStorageMB,
        usedMB,
        usedBytes: totalBytes,
        availableMB,
        storageAddons,
        totalFiles: Number(statsRes.rows[0].total_files || 0)
      }
    });
  } catch (err) {
    console.error('Error fetching file storage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add storage add-on
router.post('/storage/add-on', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { tier } = req.body;
    const storageTiers = {
      '10gb': { name: '+10 GB', gb: 10, price: 5.00 },
      '50gb': { name: '+50 GB', gb: 50, price: 20.00 },
      '100gb': { name: '+100 GB', gb: 100, price: 35.00 },
      '1tb': { name: '+1 TB', gb: 1000, price: 250.00 }
    };

    const selectedTier = storageTiers[tier];
    if (!selectedTier) {
      return res.status(400).json({ success: false, message: 'Invalid storage tier selected.' });
    }

    // Insert add-on
    const addonRes = await pool.query(
      `INSERT INTO vivas_storage_addons (user_id, package_name, storage_gb, price_usd_per_mo)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, selectedTier.name, selectedTier.gb, selectedTier.price]
    );

    // Create Invoice
    const invNum = `INV-STOR-${Date.now().toString().slice(-6)}`;
    await pool.query(
      `INSERT INTO vivas_billing_invoices (user_id, invoice_number, description, amount, currency, status, invoice_date, payment_method)
       VALUES ($1, $2, $3, $4, 'USD', 'Paid', CURRENT_DATE, 'Visa ending in 4242')`,
      [user.id, invNum, `Storage Add-on: ${selectedTier.name} (Monthly)`, selectedTier.price]
    );

    res.json({
      success: true,
      message: `Successfully added ${selectedTier.name} storage add-on!`,
      addon: addonRes.rows[0]
    });
  } catch (err) {
    console.error('Error adding storage:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload a file (Base64)
router.post('/storage/upload', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    let { file_name, file_data, mime_type = 'application/octet-stream', category = 'General', notes = '' } = req.body;

    if (!file_name || !file_data) {
      return res.status(400).json({ success: false, message: 'File name and file data are required.' });
    }

    // Clean base64 data
    let base64Clean = file_data;
    if (file_data.includes(',')) {
      base64Clean = file_data.split(',')[1];
    }

    const buffer = Buffer.from(base64Clean, 'base64');
    const fileSize = buffer.length;

    // Check storage quota
    const subRes = await pool.query(`SELECT base_storage_mb FROM vivas_account_subscriptions WHERE user_id = $1 LIMIT 1`, [user.id]);
    const planStorageMB = Number(subRes.rows[0]?.base_storage_mb || 500);

    const addonsRes = await pool.query(
      `SELECT COALESCE(SUM(storage_gb), 0) as total_addon_gb FROM vivas_storage_addons WHERE user_id = $1 AND status = 'active'`,
      [user.id]
    );
    const addonMB = Number(addonsRes.rows[0].total_addon_gb || 0) * 1024;
    const totalAllowedBytes = (planStorageMB + addonMB) * 1024 * 1024;

    const usedRes = await pool.query(
      `SELECT COALESCE(SUM(file_size_bytes), 0) as used_bytes FROM vivas_file_storage WHERE user_id = $1`,
      [user.id]
    );
    const currentlyUsedBytes = Number(usedRes.rows[0].used_bytes || 0);

    if (currentlyUsedBytes + fileSize > totalAllowedBytes) {
      return res.status(400).json({
        success: false,
        message: 'Storage quota exceeded! Please add a storage add-on or upgrade your plan to upload this file.'
      });
    }

    // Save to disk
    const cleanExt = path.extname(file_name) || '.bin';
    const baseClean = path.basename(file_name, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = crypto.randomBytes(6).toString('hex');
    const savedDiskName = `${baseClean}_${Date.now()}_${uniqueId}${cleanExt}`;
    const diskPath = path.join(storageUploadsDir, savedDiskName);

    await fs.promises.writeFile(diskPath, buffer);

    const fileUrl = `/uploads/file_storage/${savedDiskName}`;

    // Insert database record
    const insertRes = await pool.query(
      `INSERT INTO vivas_file_storage (user_id, file_name, original_name, file_path, file_url, mime_type, file_size_bytes, category, notes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        user.id,
        file_name,
        file_name,
        diskPath,
        fileUrl,
        mime_type,
        fileSize,
        category,
        notes,
        user.full_name || 'Gopikrishna Santhanam'
      ]
    );

    res.json({
      success: true,
      message: 'File uploaded successfully!',
      file: insertRes.rows[0]
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete file
router.delete('/storage/files/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { id } = req.params;
    const fileRes = await pool.query(
      `SELECT * FROM vivas_file_storage WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found or permission denied.' });
    }

    const file = fileRes.rows[0];

    // Remove from disk if exists
    if (file.file_path && fs.existsSync(file.file_path)) {
      try {
        fs.unlinkSync(file.file_path);
      } catch (err) {
        console.warn('Could not remove file from disk:', err.message);
      }
    }

    await pool.query(`DELETE FROM vivas_file_storage WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: 'File deleted successfully!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rename or update file notes/category
router.patch('/storage/files/:id', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { id } = req.params;
    const { file_name, category, notes } = req.body;

    const updateRes = await pool.query(
      `UPDATE vivas_file_storage
       SET file_name = COALESCE($1, file_name),
           category = COALESCE($2, category),
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [file_name ? file_name.trim() : null, category, notes, id, user.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    res.json({
      success: true,
      message: 'File updated successfully!',
      file: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. PAYMENT METHODS & INVOICES
// ==========================================
router.get('/payment-methods', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const pmRes = await pool.query(
      `SELECT * FROM vivas_payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [user.id]
    );

    res.json({ success: true, paymentMethods: pmRes.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/payment-methods', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { card_number, exp_month, exp_year, cvc, cardholder_name, billing_country, billing_postal_code } = req.body;

    if (!card_number || !cardholder_name || !exp_month || !exp_year) {
      return res.status(400).json({ success: false, message: 'Please provide all required card details.' });
    }

    const cleanNumber = String(card_number).replace(/\s+/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return res.status(400).json({ success: false, message: 'Invalid card number.' });
    }

    const last4 = cleanNumber.slice(-4);
    let cardBrand = 'Visa';
    if (cleanNumber.startsWith('5')) cardBrand = 'Mastercard';
    else if (cleanNumber.startsWith('3')) cardBrand = 'American Express';
    else if (cleanNumber.startsWith('6')) cardBrand = 'Discover';

    // Set other payment methods as non-default
    await pool.query(`UPDATE vivas_payment_methods SET is_default = false WHERE user_id = $1`, [user.id]);

    const pmRes = await pool.query(
      `INSERT INTO vivas_payment_methods (user_id, card_brand, last4, exp_month, exp_year, cardholder_name, is_default, billing_country, billing_postal_code)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
       RETURNING *`,
      [
        user.id,
        cardBrand,
        last4,
        Number(exp_month),
        Number(exp_year),
        cardholder_name.trim(),
        billing_country || 'India',
        billing_postal_code ? billing_postal_code.trim() : '600001'
      ]
    );

    res.json({
      success: true,
      message: 'Payment method saved successfully!',
      paymentMethod: pmRes.rows[0]
    });
  } catch (err) {
    console.error('Error saving payment method:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const invRes = await pool.query(
      `SELECT * FROM vivas_billing_invoices WHERE user_id = $1 ORDER BY invoice_date DESC, created_at DESC`,
      [user.id]
    );

    res.json({ success: true, invoices: invRes.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. PRIORITY ONBOARDING & DANGER ZONE
// ==========================================
router.post('/priority-onboarding', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { preferred_date, preferred_time_slot, notes, contact_phone } = req.body;

    const reqRes = await pool.query(
      `INSERT INTO vivas_priority_onboarding_requests (user_id, farm_name, contact_email, contact_phone, preferred_date, preferred_time_slot, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user.id,
        user.farm_name || 'Vivas Farm',
        user.email,
        contact_phone || user.phone_number,
        preferred_date || null,
        preferred_time_slot || '10:00 AM - 12:00 PM',
        notes || null
      ]
    );

    res.json({
      success: true,
      message: 'Priority Onboarding request submitted! Our agricultural onboarding specialist will reach out within 24 hours.',
      request: reqRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/delete-farm', async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'User not authenticated' });

    const { confirmation, reason } = req.body;
    if (confirmation !== 'DELETE' && confirmation !== user.farm_name) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation phrase mismatch. Please type DELETE or your farm name to confirm.'
      });
    }

    // Cancel active subscriptions and add-ons
    await pool.query(
      `UPDATE vivas_account_subscriptions SET status = 'canceled', updated_at = NOW() WHERE user_id = $1`,
      [user.id]
    );
    await pool.query(
      `UPDATE vivas_storage_addons SET status = 'canceled' WHERE user_id = $1`,
      [user.id]
    );

    res.json({
      success: true,
      message: 'Your farm account cancellation request has been processed.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
