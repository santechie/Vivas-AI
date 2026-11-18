// Phase 1 security module: zero-dependency (Node crypto only).
// - scrypt password hashing (+ transparent upgrade from legacy SHA-256)
// - HMAC-signed expiring tokens with revocation
// - auth attach/enforce middleware (AUTH_ENFORCE=true turns monitor mode into hard enforcement)
// - rate limiting, security headers, restricted CORS, password policy
import 'dotenv/config';
import crypto from 'crypto';
import pool from '../config/db.js';

const isProd = process.env.NODE_ENV === 'production';

// ---------- secret ----------
let SECRET = process.env.AUTH_SECRET;
if (!SECRET || SECRET.length < 32) {
  if (isProd) throw new Error('AUTH_SECRET (>=32 chars) is required in production');
  SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('[security] AUTH_SECRET missing/short: using an ephemeral secret (tokens reset on restart)');
}
const TTL_HOURS = Number(process.env.AUTH_TOKEN_TTL_HOURS || 168);

// ---------- passwords ----------
const scrypt = (pwd, salt) =>
  new Promise((res, rej) => crypto.scrypt(String(pwd), salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pwd) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pwd, salt);
  return `scrypt$16384$${salt.toString('hex')}$${key.toString('hex')}`;
}

const sha256 = (pwd) => crypto.createHash('sha256').update(String(pwd)).digest('hex');
const safeEq = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** returns { ok, needsUpgrade } */
export async function verifyPassword(pwd, stored) {
  if (!stored) return { ok: false, needsUpgrade: false };
  if (stored.startsWith('scrypt$')) {
    const [, , saltHex, keyHex] = stored.split('$');
    const key = await scrypt(pwd, Buffer.from(saltHex, 'hex'));
    return { ok: safeEq(key.toString('hex'), keyHex), needsUpgrade: false };
  }
  if (/^[a-f0-9]{64}$/.test(stored)) {
    return { ok: safeEq(sha256(pwd), stored), needsUpgrade: true }; // legacy
  }
  return { ok: false, needsUpgrade: false }; // placeholders can never log in
}

export function passwordPolicyError(pwd) {
  const p = String(pwd || '');
  if (p.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Password must contain at least one letter and one number.';
  if (p.length > 128) return 'Password is too long.';
  return null;
}

// ---------- tokens ----------
const b64u = (b) => Buffer.from(b).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
const revoked = new Map(); // jti -> exp (ms)

export function signToken(user) {
  const payload = {
    uid: user.id, email: user.email, role: user.role,
    jti: crypto.randomBytes(12).toString('hex'),
    exp: Date.now() + TTL_HOURS * 3600 * 1000
  };
  const body = b64u(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!safeEq(sig, sign(body))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!p.exp || p.exp < Date.now() || revoked.has(p.jti)) return null;
    return p;
  } catch {
    return null;
  }
}

export function revokeToken(token) {
  const p = verifyToken(token);
  if (p) revoked.set(p.jti, p.exp);
}
setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of revoked) if (exp < now) revoked.delete(k);
}, 3600 * 1000).unref();

export const bearer = (req) => {
  const h = req.headers.authorization;
  return h && h.startsWith('Bearer ') ? h.slice(7).trim() : null;
};

// ---------- auth middleware ----------
const ADMIN_RE = /admin/i;
export const isAdminRole = (role) => ADMIN_RE.test(String(role || ''));

const stats = { requests: 0, unauthenticated: 0, spoofedRoleHeader: 0, farmMismatch: 0, rejected: 0, byPrefix: {} };
const PUBLIC = [/^\/api\/auth\/(login|register|forgot-password|reset-password)$/, /^\/api\/pih\/v1\//, /^\/uploads\//, /^\/api\/health$/];

export function attachAuth(req, _res, next) {
  const p = verifyToken(bearer(req));
  if (p) req.auth = p;
  next();
}

export function authGate(req, res, next) {
  if (!req.path.startsWith('/api')) return next();
  stats.requests++;
  const enforce = process.env.AUTH_ENFORCE === 'true';
  const isPublic = PUBLIC.some((r) => r.test(req.originalUrl.split('?')[0]));
  if (!req.auth && !isPublic) {
    stats.unauthenticated++;
    const pre = req.originalUrl.split('?')[0].split('/').slice(0, 3).join('/');
    stats.byPrefix[pre] = (stats.byPrefix[pre] || 0) + 1;
    if (enforce) {
      stats.rejected++;
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    return next();
  }
  if (req.auth && enforce) {
    // identity comes from the token only; client-supplied identity headers are overwritten
    req.headers['x-user-id'] = req.auth.uid;
    if (req.query && req.query.user_id) req.query.user_id = req.auth.uid;
    if (req.headers['x-pih-role'] && !isAdminRole(req.auth.role)) {
      stats.spoofedRoleHeader++;
      delete req.headers['x-pih-role'];
    }
  } else if (!req.auth && req.headers['x-pih-role'] && /admin|sme/i.test(req.headers['x-pih-role'])) {
    stats.spoofedRoleHeader++; // monitor mode: privileged role claimed with no token
  }
  next();
}

/** Farm membership check; enforced only when AUTH_ENFORCE=true */
export async function farmGuard(req, res, next) {
  if (process.env.AUTH_ENFORCE !== 'true' || !req.auth || isAdminRole(req.auth.role)) return next();
  const farmId = req.headers['x-farm-id'] || req.query?.farm_id;
  if (!farmId) return next();
  try {
    const r = await pool.query('SELECT 1 FROM vivas_user_farms WHERE user_id = $1 AND farm_id::text = $2', [req.auth.uid, String(farmId)]);
    if (r.rowCount === 0) {
      stats.farmMismatch++;
      return res.status(403).json({ success: false, message: 'You do not have access to this farm.' });
    }
  } catch { /* fall through on DB error */ }
  next();
}

export const requireAuth = (req, res, next) =>
  req.auth ? next() : res.status(401).json({ success: false, message: 'Authentication required.' });

export const requireAdmin = (req, res, next) =>
  req.auth && isAdminRole(req.auth.role) ? next() : res.status(req.auth ? 403 : 401).json({ success: false, message: 'Admin access required.' });

export const securityStats = () => ({ ...stats, enforce: process.env.AUTH_ENFORCE === 'true' });

// ---------- rate limiting ----------
export function rateLimit({ windowMs, max, key = (req) => req.ip, message = 'Too many requests. Please try again later.' }) {
  const hits = new Map();
  setInterval(() => {
    const cut = Date.now() - windowMs;
    for (const [k, arr] of hits) {
      const f = arr.filter((t) => t > cut);
      f.length ? hits.set(k, f) : hits.delete(k);
    }
  }, windowMs).unref();
  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    const arr = (hits.get(k) || []).filter((t) => t > now - windowMs);
    if (arr.length >= max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ success: false, message });
    }
    arr.push(now);
    hits.set(k, arr);
    next();
  };
}

// ---------- headers & CORS ----------
export function securityHeaders(_req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(self)',
    'X-DNS-Prefetch-Control': 'off',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });
  if (isProd) res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.removeHeader('X-Powered-By');
  next();
}

export function corsOptions() {
  const allowed = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  const dev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  return {
    credentials: true,
    origin(origin, cb) {
      if (!origin) return cb(null, true); // same-origin / curl / server-to-server
      if (allowed.includes(origin) || (!isProd && dev.test(origin))) return cb(null, true);
      cb(null, false);
    }
  };
}
