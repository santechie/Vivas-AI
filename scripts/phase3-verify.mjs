// Phase 3 verification suite: Modular Architecture, Shared Validation & Error Envelopes
import { validate, validateBody } from '../backend/utils/validate.js';
import { success, fail } from '../backend/utils/response.js';

const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

console.log('🚀 Phase 3 Verification Suite: Architecture, Validations & Response Envelopes...\n');

// 1. Test Shared Validator Utility
const testSchema = {
  name: { required: true, type: 'string', minLength: 3 },
  amount: { required: true, type: 'number', min: 1 },
  status: { enum: ['pending', 'completed', 'cancelled'] },
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, patternMessage: 'Invalid email address' }
};

const v1 = validate(testSchema, { name: 'Al', amount: 0, status: 'unknown', email: 'bad' });
check('Validator catches all constraint violations', !v1.valid && Object.keys(v1.errors).length === 4);
check('Validator error messages are actionable', v1.errors.name.includes('at least 3 characters'));

const v2 = validate(testSchema, { name: 'Valid Item', amount: 50, status: 'completed', email: 'valid@example.com' });
check('Validator accepts compliant payload', v2.valid && Object.keys(v2.errors).length === 0);

// 2. Test Response Envelopes
const mockRes = () => {
  let code = 200;
  let jsonPayload = null;
  return {
    status(c) { code = c; return this; },
    json(j) { jsonPayload = j; return this; },
    get code() { return code; },
    get jsonPayload() { return jsonPayload; }
  };
};

const r1 = mockRes();
success(r1, { id: 1 }, 'Created', 201);
check('success envelope matches standard schema', r1.code === 201 && r1.jsonPayload.success === true && r1.jsonPayload.data.id === 1);

const r2 = mockRes();
fail(r2, 'Validation error', 422, { field: 'required' });
check('fail envelope matches error format', r2.code === 422 && r2.jsonPayload.success === false && r2.jsonPayload.errors.field === 'required');

// 3. Test HTTP Live Modular Route Responses
const BASE = 'http://localhost:5001';
const modules = [
  { name: 'Financials (/api/financials/transactions)', url: '/api/financials/transactions' },
  { name: 'Contacts (/api/contacts/customers)', url: '/api/contacts/customers' },
  { name: 'Reports (/api/reports/summary)', url: '/api/reports/summary' },
  { name: 'Buy (/api/buy/shopping-list)', url: '/api/buy/shopping-list' },
  { name: 'Labor (/api/labor/timesheets)', url: '/api/labor/timesheets' },
  { name: 'Farm Map (/api/farm-map/items)', url: '/api/farm-map/items' },
  { name: 'Assets (/api/containers)', url: '/api/containers' },
  { name: 'Sell (/api/orders)', url: '/api/orders' },
  { name: 'Grow (/api/crops)', url: '/api/crops' }
];

for (const mod of modules) {
  try {
    const r = await fetch(BASE + mod.url, { headers: { 'x-pih-role': 'vivas_admin' } });
    check(`Modular route mounted and functional: ${mod.name}`, r.status === 200, `HTTP ${r.status}`);
  } catch (err) {
    check(`Modular route mounted and functional: ${mod.name}`, false, err.message);
  }
}

const failed = checks.filter((c) => !c.pass).length;
console.log(`\nPhase 3 Verification Result: ${checks.length - failed} / ${checks.length} passed.`);
process.exit(failed ? 1 : 0);
