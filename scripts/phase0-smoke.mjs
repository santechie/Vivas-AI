// Read-only smoke test of all parameter-free GET routes. Usage: node scripts/phase0-smoke.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.API || 'http://localhost:5001';
const mounts = { 'server.js': '', 'routes/cropHealth.js': '/api/ch', 'routes/account.js': '/api/account',
  'routes/settings.js': '/api/settings', 'routes/partnerHub.js': '/api/pih', 'routes/partnerApiV1.js': '/api/pih/v1', 'routes/farmMap.js': '/api/farm-map', 'routes/financials.js': '/api/financials', 'routes/contacts.js': '/api/contacts', 'routes/reports.js': '/api/reports', 'routes/buy.js': '/api/buy', 'routes/labor.js': '/api/labor', 'routes/assets.js': '', 'routes/sell.js': '', 'routes/grow.js': '' };
const re = /\b(?:app|router)\.get\(\s*['"`]([^'"`]+)/g;
const urls = new Set();
for (const [f, p] of Object.entries(mounts)) {
  const s = fs.readFileSync(path.join(root, 'backend', f), 'utf8');
  let m;
  while ((m = re.exec(s))) if (!m[1].includes(':') && !m[1].includes('*')) urls.add(p + m[1]);
}
const rows = [];
for (const u of [...urls].sort()) {
  try {
    const r = await fetch(BASE + u, { headers: { 'x-pih-role': 'vivas_admin' }, signal: AbortSignal.timeout(8000) });
    let msg = '';
    if (r.status >= 400) msg = (await r.text()).slice(0, 110).replace(/\s+/g, ' ');
    rows.push({ u, status: r.status, msg });
  } catch (e) { rows.push({ u, status: 0, msg: e.message }); }
}
const bucket = (s) => (s >= 200 && s < 300 ? '2xx OK' : s === 401 || s === 403 ? '401/403 auth' : s >= 400 && s < 500 ? '4xx client' : s >= 500 ? '5xx SERVER ERROR' : 'no response');
const counts = {};
rows.forEach((r) => { counts[bucket(r.status)] = (counts[bucket(r.status)] || 0) + 1; });
const out = ['# Phase 0 – GET smoke test', '', `Base: ${BASE} | routes tested: ${rows.length}`, '', '| Result | Count |', '|---|---|',
  ...Object.entries(counts).map(([k, v]) => `| ${k} | ${v} |`), '', '## Failing routes (4xx/5xx/none)', '', '| Status | URL | Message |', '|---|---|---|',
  ...rows.filter((r) => r.status === 0 || r.status >= 400).map((r) => `| ${r.status} | ${r.u} | ${r.msg.replace(/\|/g, '/')} |`)];
fs.writeFileSync(path.join(root, 'docs/phase0/SMOKE_TEST.md'), out.join('\n') + '\n');
console.log(out.slice(0, 12).join('\n'));
console.log(rows.filter((r) => r.status >= 500 || r.status === 0).map((r) => `${r.status} ${r.u} ${r.msg}`).join('\n'));
