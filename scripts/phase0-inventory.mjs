// Phase 0 inventory generator (read-only). Usage: node scripts/phase0-inventory.mjs
import fs from 'fs';
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(p, 'utf8');
const walk = (d, ext, out = []) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === 'dist') continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p, ext, out);
    else if (ext.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
};

// ---- Backend routes
const mounts = { 'server.js': '', 'routes/cropHealth.js': '/api/ch', 'routes/account.js': '/api/account',
  'routes/settings.js': '/api/settings', 'routes/partnerHub.js': '/api/pih', 'routes/partnerApiV1.js': '/api/pih/v1', 'routes/farmMap.js': '/api/farm-map', 'routes/financials.js': '/api/financials', 'routes/contacts.js': '/api/contacts', 'routes/reports.js': '/api/reports', 'routes/buy.js': '/api/buy', 'routes/labor.js': '/api/labor', 'routes/assets.js': '', 'routes/sell.js': '', 'routes/grow.js': '' };
const routeRe = /\b(?:app|router)\.(get|post|put|patch|delete)\(\s*[\x27"`]([^\x27"`]+)/g;
const routes = [];
for (const [file, prefix] of Object.entries(mounts)) {
  const src = read(path.join(root, 'backend', file));
  const lines = src.split('\n');
  lines.forEach((l, i) => {
    routeRe.lastIndex = 0;
    let m;
    while ((m = routeRe.exec(l))) {
      const url = (file === 'server.js' ? '' : prefix) + m[2];
      const window = lines.slice(i, i + 12).join('\n');
      routes.push({ file, line: i + 1, method: m[1].toUpperCase(), url,
        auth: /requireAuth|authenticate|verifyToken|req\.headers\.authorization/i.test(window) });
    }
  });
}

// ---- DB tables defined in SQL
const sqlFiles = [...walk(path.join(root, 'database'), ['.sql']), path.join(root, 'Vivas_AI_Crop_Health_Schema.sql')];
const defined = new Map();
const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi;
for (const f of sqlFiles) {
  let m; const s = read(f);
  while ((m = createRe.exec(s))) {
    const t = m[1].toLowerCase();
    if (!defined.has(t)) defined.set(t, []);
    defined.get(t).push(path.relative(root, f));
  }
}

// ---- Tables referenced in code
const refRe = /\b(?:FROM|JOIN|INTO|UPDATE)\s+(?:public\.)?"?((?:vivas|pih|ch)_[a-z0-9_]+)"?/gi;
const referenced = new Map();
for (const f of walk(path.join(root, 'backend'), ['.js'])) {
  const s = read(f); let m;
  while ((m = refRe.exec(s))) {
    const t = m[1].toLowerCase();
    if (!referenced.has(t)) referenced.set(t, new Set());
    referenced.get(t).add(path.relative(root, f));
  }
}
const undefinedTables = [...referenced.keys()].filter((t) => !defined.has(t)).sort();
const unusedTables = [...defined.keys()].filter((t) => !referenced.has(t)).sort();
const dupDefs = [...defined.entries()].filter(([, v]) => new Set(v).size > 1);

// ---- Frontend
const jsx = walk(path.join(root, 'frontend/src'), ['.jsx']).map((p) => ({
  file: path.relative(root, p), lines: read(p).split('\n').length,
  raw: /\b(alert|prompt|confirm)\(/.test(read(p)),
  fetches: (read(p).match(/\bfetch\(/g) || []).length
})).sort((a, b) => b.lines - a.lines);
const app = read(path.join(root, 'frontend/src/App.jsx'));
const screens = [...new Set([...app.matchAll(/currentScreen === ['"]([^'"]+)['"]/g)].map((m) => m[1]))].sort();

// ---- Report
const out = [];
out.push('# Phase 0 Inventory (auto-generated)\n');
out.push(`Generated: ${new Date().toISOString()}\n`);
out.push('## Summary\n');
out.push('| Metric | Value |\n|---|---|');
out.push(`| API routes | ${routes.length} |`);
out.push(`| Routes with detectable auth check | ${routes.filter((r) => r.auth).length} |`);
out.push(`| Tables defined in SQL | ${defined.size} |`);
out.push(`| Tables referenced in backend code | ${referenced.size} |`);
out.push(`| Referenced but NOT defined in any SQL | ${undefinedTables.length} |`);
out.push(`| Defined but never referenced | ${unusedTables.length} |`);
out.push(`| Tables defined in more than one SQL file | ${dupDefs.length} |`);
out.push(`| Frontend .jsx files | ${jsx.length} |`);
out.push(`| Frontend screens (currentScreen) | ${screens.length} |`);
out.push(`| Files >1000 lines | ${jsx.filter((f) => f.lines > 1000).length} frontend |`);
out.push(`| Files using alert/prompt/confirm | ${jsx.filter((f) => f.raw).length} |`);
out.push(`| Files calling raw fetch() | ${jsx.filter((f) => f.fetches).length} |\n`);
out.push('## Referenced but not defined in SQL (verify against live DB)\n');
out.push(undefinedTables.map((t) => `- \`${t}\` (used in ${[...referenced.get(t)].join(', ')})`).join('\n') || '- none');
out.push('\n## Defined but never referenced in backend\n');
out.push(unusedTables.map((t) => `- \`${t}\``).join('\n') || '- none');
out.push('\n## Duplicate definitions across migrations\n');
out.push(dupDefs.map(([t, v]) => `- \`${t}\`: ${[...new Set(v)].join(', ')}`).join('\n') || '- none');
out.push('\n## Largest frontend files\n');
out.push('| File | Lines | alert/prompt | raw fetch |\n|---|---|---|---|');
jsx.slice(0, 15).forEach((f) => out.push(`| ${f.file} | ${f.lines} | ${f.raw ? 'yes' : ''} | ${f.fetches} |`));
out.push('\n## Frontend screens\n');
out.push(screens.map((s) => `\`${s}\``).join(', '));
out.push('\n## API routes\n');
out.push('| Method | URL | Source | Auth detected |\n|---|---|---|---|');
routes.forEach((r) => out.push(`| ${r.method} | ${r.url} | ${r.file}:${r.line} | ${r.auth ? 'yes' : '**no**'} |`));

fs.mkdirSync(path.join(root, 'docs/phase0'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/phase0/INVENTORY.md'), out.join('\n') + '\n');
console.log(out.slice(0, 20).join('\n'));
