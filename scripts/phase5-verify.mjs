// Phase 5 Verification Suite: Automation, Webhook Engine & Scheduled Jobs
import http from 'http';
import pool from '../backend/config/db.js';
import { generateWebhookSignature, queueWebhookEvent, dispatchDeliveryAttempt, processWebhookQueueBatch } from '../backend/services/webhookDispatcher.js';
import { runScheduledJob, tickScheduler } from '../backend/services/scheduler.js';
import { emitDomainEvent, processOutboxBatch } from '../backend/services/eventBus.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`PASS  ${message}`);
    passed++;
  } else {
    console.error(`FAIL  ${message}`);
    failed++;
  }
}

async function runPhase5Verification() {
  console.log('🚀 Phase 5 Verification Suite: Automation, Webhook Engine & Scheduled Jobs...\n');

  try {
    // 1. Verify system_scheduled_jobs table and seed data
    const jobsRes = await pool.query('SELECT job_name, interval_seconds, is_enabled FROM system_scheduled_jobs ORDER BY job_name ASC');
    assert(jobsRes.rowCount >= 4, `system_scheduled_jobs has registered jobs (found ${jobsRes.rowCount})`);

    // 2. Test HMAC signature generation
    const secret = 'whsec_test_secret_1234567890';
    const payload = JSON.stringify({ event: 'test.event', data: { sample: 123 } });
    const signature = generateWebhookSignature(secret, payload);
    assert(signature.startsWith('sha256=') && signature.length === 71, `HMAC-SHA256 signature generated correctly (${signature.slice(0, 20)}...)`);

    // 3. Test Scheduled Job: licence_expiry_monitor
    const licenceOutcome = await runScheduledJob('licence_expiry_monitor');
    assert(licenceOutcome.status === 'completed', `licence_expiry_monitor job executed successfully (duration: ${licenceOutcome.durationMs}ms)`);
    
    // Check system_scheduled_jobs record updated
    const jobCheck = await pool.query("SELECT last_status, last_duration_ms, run_count FROM system_scheduled_jobs WHERE job_name = 'licence_expiry_monitor'");
    assert(jobCheck.rows[0].last_status === 'completed' && jobCheck.rows[0].run_count >= 1, 'system_scheduled_jobs metadata correctly updated after run');

    // 4. Test Scheduled Job: inventory_low_stock_scanner
    const stockOutcome = await runScheduledJob('inventory_low_stock_scanner');
    assert(stockOutcome.status === 'completed', `inventory_low_stock_scanner executed successfully (${stockOutcome.result?.low_stock_items ?? 0} low-stock items scanned)`);

    // 5. Test Webhook Queue & Dispatch Lifecycle
    // Set up a mock HTTP receiver to catch signed webhook delivery
    let receivedWebhook = null;
    let receivedSignature = null;
    let receivedEventHeader = null;

    const mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        receivedWebhook = JSON.parse(body);
        receivedSignature = req.headers['x-vivas-signature'];
        receivedEventHeader = req.headers['x-vivas-event'];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      });
    });

    await new Promise(resolve => mockServer.listen(5099, '127.0.0.1', resolve));

    // Create a temporary webhook subscription pointing to our mock receiver
    const partnerRes = await pool.query("SELECT id FROM pih_partners WHERE deleted_at IS NULL LIMIT 1");
    const testPartnerId = partnerRes.rows[0].id;
    const testSecret = 'whsec_verification_secret_key_999';

    const whSub = await pool.query(`
      INSERT INTO pih_webhooks (partner_id, endpoint_url, secret, events, is_active)
      VALUES ($1, 'http://127.0.0.1:5099/webhook', $2, ARRAY['order.created', 'rating.updated'], TRUE)
      RETURNING id
    `, [testPartnerId, testSecret]);
    const webhookId = whSub.rows[0].id;

    // Trigger domain event 'order.created' through outbox
    const evt = await emitDomainEvent('order.created', 'Order', 'ORD-TEST-999', {
      order_no: 'ORD-TEST-999',
      partner_id: testPartnerId,
      total_amount: 12500,
      currency: 'INR'
    });

    // Process outbox batch (which triggers handler -> queueWebhookEvent)
    await processOutboxBatch();

    // Verify delivery record was staged in pih_webhook_deliveries
    const delRes = await pool.query(
      `SELECT * FROM pih_webhook_deliveries WHERE webhook_id = $1 AND event = 'order.created'`,
      [webhookId]
    );
    assert(delRes.rowCount > 0, `Outbox event triggered automatic webhook queueing into pih_webhook_deliveries`);

    // Process webhook queue batch to dispatch to mock receiver
    const deliveryId = delRes.rows[0].id;
    const dispatchResult = await dispatchDeliveryAttempt(deliveryId);
    assert(dispatchResult.success === true && dispatchResult.status === 'delivered', `Webhook dispatcher successfully delivered signed HTTP POST to receiver`);

    // Verify mock server received correct headers and signature
    assert(receivedEventHeader === 'order.created', `Receiver verified X-Vivas-Event header ('${receivedEventHeader}')`);
    assert(receivedSignature && receivedSignature.startsWith('sha256='), `Receiver verified X-Vivas-Signature HMAC header`);

    // 6. Test Webhook Retry Backoff on Failure Simulation
    const failDel = await pool.query(`
      INSERT INTO pih_webhook_deliveries (webhook_id, event, payload, attempt, status, next_retry_at)
      VALUES ($1, 'rating.updated', '{"event":"rating.updated"}', 1, 'pending', NOW())
      RETURNING id
    `, [webhookId]);
    
    const failResult = await dispatchDeliveryAttempt(failDel.rows[0].id, true); // simulateFailure = true
    assert(failResult.status === 'pending' && failResult.attempt === 2 && failResult.nextRetryAt !== null,
      `Failed webhook delivery entered exponential backoff retry state (Next retry: ${failResult.nextRetryAt})`
    );

    // Clean up test webhook & mock server
    await pool.query('DELETE FROM pih_webhook_deliveries WHERE webhook_id = $1', [webhookId]);
    await pool.query('DELETE FROM pih_webhooks WHERE id = $1', [webhookId]);
    mockServer.close();

    // 7. Test tickScheduler function
    const ticked = await tickScheduler();
    assert(Array.isArray(ticked), `tickScheduler successfully executed background check cycle (${ticked.length} jobs run)`);

    console.log(`\nPhase 5 Verification Result: ${passed} / ${passed + failed} passed.`);
  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runPhase5Verification();
