// Phase 1 verification. Run from /backend against a STAGING DB:
//   DB_NAME=vivas_ai_staging PORT=5002 node server.js   (monitor mode)
//   DB_NAME=vivas_ai_staging PORT=5003 AUTH_ENFORCE=true node server.js
//   cd backend && DB_NAME=vivas_ai_staging node ../scripts/phase1-verify.mjs
import crypto from 'crypto';
import pool from '../backend/config/db.js';

const M = 'http://localhost:5002';
const E = 'http://localhost:5003';
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};
const call = async (base, path, { method = 'GET', body, headers = {} } = {}) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, json: j, headers: r.headers };
};

const email = `p1test_${Date.now()}@example.com`;
const pw = 'Str0ngPass1';

// headers & health
let r = await call(M, '/api/health');
check('health endpoint 200', r.status === 200);
check('security headers present', r.headers.get('x-content-type-options') === 'nosniff' && r.headers.get('x-frame-options') === 'SAMEORIGIN' && !r.headers.get('x-powered-by'));

// registration policy
r = await call(M, '/api/auth/register', { method: 'POST', body: { full_name: 'T', email, password: 'short' } });
check('weak password rejected (400)', r.status === 400, r.json?.message);
r = await call(M, '/api/auth/register', { method: 'POST', body: { full_name: 'T', email: 'not-an-email', password: pw } });
check('invalid email rejected (400)', r.status === 400);
r = await call(M, '/api/auth/register', { method: 'POST', body: { full_name: 'Test User', email, password: pw, role: 'Farm Administrator' } });
check('register OK', r.status === 200 && !!r.json?.token);
check('self-assigned admin role ignored', r.json?.user?.role === 'Farm Manager', r.json?.user?.role);
const token = r.json?.token;
check('token is signed (payload.signature, not random hex)', token?.includes('.'));
const stored = (await pool.query('SELECT password_hash FROM vivas_users WHERE email=$1', [email])).rows[0]?.password_hash;
check('password stored as scrypt', stored?.startsWith('scrypt$'), stored?.slice(0, 18) + '...');

// login
r = await call(M, '/api/auth/login', { method: 'POST', body: { email, password: pw } });
check('login with correct password', r.status === 200 && !!r.json?.token);
r = await call(M, '/api/auth/login', { method: 'POST', body: { email, password: 'WrongPass9' } });
check('login with wrong password 401', r.status === 401);

// legacy SHA-256 upgrade
const legacyEmail = `legacy_${Date.now()}@example.com`;
await pool.query('INSERT INTO vivas_users (full_name,email,password_hash,role) VALUES ($1,$2,$3,$4)', ['Legacy', legacyEmail, crypto.createHash('sha256').update('Legacy123').digest('hex'), 'Farm Manager']);
r = await call(M, '/api/auth/login', { method: 'POST', body: { email: legacyEmail, password: 'Legacy123' } });
check('legacy SHA-256 account can still log in', r.status === 200);
const up = (await pool.query('SELECT password_hash FROM vivas_users WHERE email=$1', [legacyEmail])).rows[0].password_hash;
check('legacy hash auto-upgraded to scrypt', up.startsWith('scrypt$'));

// placeholder invite hash can never log in
const phEmail = `invite_${Date.now()}@example.com`;
await pool.query('INSERT INTO vivas_users (full_name,email,password_hash,role) VALUES ($1,$2,$3,$4)', ['Inv', phEmail, '$2b$10$temporaryhashforinviteduserplaceholder', 'Field Crew']);
r = await call(M, '/api/auth/login', { method: 'POST', body: { email: phEmail, password: '$2b$10$temporaryhashforinviteduserplaceholder' } });
check('invited-user placeholder hash cannot be used to log in', r.status === 401);

// /me
r = await call(M, '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
check('/me with valid token', r.status === 200 && r.json?.user?.email === email);
r = await call(M, '/api/auth/me', { headers: { Authorization: 'Bearer deadbeef' } });
check('/me with garbage token 401 (old admin back-door closed)', r.status === 401);
const tampered = token.slice(0, -3) + (token.endsWith('aaa') ? 'bbb' : 'aaa');
r = await call(M, '/api/auth/me', { headers: { Authorization: `Bearer ${tampered}` } });
check('/me with tampered token 401', r.status === 401);
const expired = (() => { const b = Buffer.from(JSON.stringify({ uid: 'x', exp: Date.now() - 1000, jti: 'z' })).toString('base64url'); return `${b}.${crypto.randomBytes(8).toString('hex')}`; })();
r = await call(M, '/api/auth/me', { headers: { Authorization: `Bearer ${expired}` } });
check('/me with forged/expired token 401', r.status === 401);
await call(M, '/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
r = await call(M, '/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
check('token revoked after logout', r.status === 401);

// reset policy
r = await call(M, '/api/auth/forgot-password', { method: 'POST', body: { email } });
const rt = r.json?.reset_token;
r = await call(M, '/api/auth/reset-password', { method: 'POST', body: { reset_token: rt, new_password: 'weak' } });
check('weak password rejected on reset', r.status === 400);

// CORS
let cr = await fetch(M + '/api/health', { headers: { Origin: 'https://evil.example.com' } });
check('foreign origin gets no CORS allow header', !cr.headers.get('access-control-allow-origin'));
cr = await fetch(M + '/api/health', { headers: { Origin: 'http://localhost:5173' } });
check('localhost dev origin allowed', cr.headers.get('access-control-allow-origin') === 'http://localhost:5173');

// enforce mode
r = await call(E, '/api/pih/partners');
check('ENFORCE: no token -> 401', r.status === 401);
r = await call(E, '/api/pih/partners', { headers: { Authorization: `Bearer ${(await call(E, '/api/auth/login', { method: 'POST', body: { email: legacyEmail, password: 'Legacy123' } })).json?.token}` } });
check('ENFORCE: valid token -> 200', r.status === 200);
r = await call(E, '/api/pih/v1/catalog');
check('ENFORCE: Partner API v1 stays public (API-key auth)', r.status !== 401 || /api key|key/i.test(JSON.stringify(r.json)), `${r.status}`);
r = await call(E, '/api/security/status');
check('security status requires admin token', r.status === 401);

// monitor mode keeps app working
r = await call(M, '/api/pih/partners');
check('MONITOR: legacy no-token calls still work', r.status === 200);

// rate limit
let last = 0;
for (let i = 0; i < 25; i++) last = (await call(M, '/api/auth/login', { method: 'POST', body: { email: 'ratelimit@example.com', password: 'Nope1234x' } })).status;
check('login rate limit triggers 429', last === 429);

await pool.query("DELETE FROM vivas_users WHERE email LIKE 'p1test_%@example.com' OR email LIKE 'legacy_%@example.com' OR email LIKE 'invite_%@example.com'");
const failed = results.filter((x) => !x.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
await pool.end();
process.exit(failed ? 1 : 0);
