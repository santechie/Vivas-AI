// Phase 4 automated verification: Domain Events Outbox & Cross-Module Sync
import pool from '../backend/config/db.js';
import { emitDomainEvent, processOutboxBatch } from '../backend/services/eventBus.js';

console.log('🚀 Phase 4 Verification Suite: Domain Events Outbox & Cross-Module Automation...\n');
const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

// 1. Check outbox table existence
const tCheck = await pool.query(
  "SELECT 1 FROM information_schema.tables WHERE table_name = 'domain_events_outbox'"
);
check('domain_events_outbox table exists in DB', tCheck.rows.length === 1);

// 2. Test emitDomainEvent
const testEvent = await emitDomainEvent(
  'Harvest.logged',
  'vivas_harvest_plans',
  'test-hp-999',
  {
    harvest_plan_id: 999,
    crop_name: 'Bell Peppers',
    variety_name: 'California Wonder',
    location_name: 'Greenhouse 1',
    quantity_kg: 245.5
  }
);
check('Event staged in outbox table with pending status', !!testEvent?.id);

// 3. Process Outbox Batch
const count = await processOutboxBatch();
check('Outbox worker processed pending event batch', count >= 1, `Processed: ${count}`);

// 4. Verify cross-module side effect: vivas_harvest_logs auto-populated
const hLog = await pool.query(
  "SELECT * FROM vivas_harvest_logs WHERE harvest_plan_id = 999 AND crop_name = 'Bell Peppers'"
);
check('Harvest.logged handler auto-created harvest log in vivas_harvest_logs', hLog.rows.length >= 1);

// 5. Test Task.completed event -> auto-sync to labor time logs
await emitDomainEvent(
  'Task.completed',
  'vivas_farm_tasks',
  'test-task-888',
  {
    task_id: 'test-task-888',
    worker_name: 'Ramesh Patel',
    task_type: 'Fertigation',
    crop_name: 'Bell Peppers',
    field_location: 'Greenhouse 1',
    hours_spent: 4.5,
    hourly_rate: 30
  }
);

await processOutboxBatch();
const tLog = await pool.query(
  "SELECT * FROM vivas_time_logs WHERE worker_name = 'Ramesh Patel' AND task_type = 'Fertigation'"
);
check('Task.completed handler auto-logged hours & cost in vivas_time_logs', tLog.rows.length >= 1 && Number(tLog.rows[0].labor_cost) === 135);

// 6. Test PO.received event -> auto-sync to financials transactions
await emitDomainEvent(
  'PO.received',
  'vivas_purchase_orders',
  'test-po-777',
  {
    po_id: 'test-po-777',
    po_code: 'PO-TEST-777',
    total_amount: 12500,
    vendor_name: 'IFFCO Agro Supplies'
  }
);

await processOutboxBatch();
const txn = await pool.query(
  "SELECT * FROM vivas_financial_transactions WHERE invoice_receipt_ref = 'PO-TEST-777'"
);
check('PO.received handler auto-created operating expense in vivas_financial_transactions', txn.rows.length >= 1 && Number(txn.rows[0].amount) === 12500);

// Cleanup test records
await pool.query("DELETE FROM domain_events_outbox WHERE aggregate_id IN ('test-hp-999', 'test-task-888', 'test-po-777')");
await pool.query("DELETE FROM vivas_harvest_logs WHERE harvest_plan_id = 999");
await pool.query("DELETE FROM vivas_time_logs WHERE worker_name = 'Ramesh Patel' AND task_type = 'Fertigation'");
await pool.query("DELETE FROM vivas_financial_transactions WHERE invoice_receipt_ref = 'PO-TEST-777'");

const failed = checks.filter((c) => !c.pass).length;
console.log(`\nPhase 4 Verification Result: ${checks.length - failed} / ${checks.length} passed.`);
await pool.end();
process.exit(failed ? 1 : 0);
