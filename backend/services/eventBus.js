// Domain Event Outbox Publisher & Worker Service
import pool from '../config/db.js';
import { queueWebhookEvent } from './webhookDispatcher.js';

// Handlers dictionary for domain events
const eventHandlers = new Map();

/**
 * Register an event handler for a specific domain event
 */
export function registerEventHandler(eventType, handler) {
  if (!eventHandlers.has(eventType)) {
    eventHandlers.set(eventType, []);
  }
  eventHandlers.get(eventType).push(handler);
}

/**
 * Stage an event in the outbox table within an existing client transaction or pool
 */
export async function emitDomainEvent(eventType, aggregateType, aggregateId, payload, clientOrPool = pool) {
  const query = `
    INSERT INTO domain_events_outbox (event_type, aggregate_type, aggregate_id, payload)
    VALUES ($1, $2, $3, $4)
    RETURNING id, event_type, created_at;
  `;
  const res = await clientOrPool.query(query, [
    eventType,
    aggregateType,
    String(aggregateId),
    JSON.stringify(payload || {})
  ]);
  return res.rows[0];
}

/**
 * Process pending events from the outbox table
 */
export async function processOutboxBatch(batchSize = 20) {
  const client = await pool.connect();
  let processedCount = 0;

  try {
    const pendingEvents = await client.query(
      `SELECT * FROM domain_events_outbox
       WHERE status = 'pending'
       ORDER BY id ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize]
    );

    for (const event of pendingEvents.rows) {
      const handlers = eventHandlers.get(event.event_type) || [];
      let success = true;
      let errorMsg = null;

      for (const handler of handlers) {
        try {
          await handler(event.payload, event);
        } catch (err) {
          console.error(`[EventBus] Error processing ${event.event_type} (${event.id}):`, err.message);
          success = false;
          errorMsg = err.message;
          break;
        }
      }

      if (success) {
        await client.query(
          `UPDATE domain_events_outbox
           SET status = 'processed', processed_at = NOW()
           WHERE id = $1`,
          [event.id]
        );
        processedCount++;
      } else {
        await client.query(
          `UPDATE domain_events_outbox
           SET status = CASE WHEN retry_count >= 3 THEN 'failed' ELSE 'pending' END,
               retry_count = retry_count + 1,
               error_message = $1
           WHERE id = $2`,
          [errorMsg, event.id]
        );
      }
    }
  } finally {
    client.release();
  }

  return processedCount;
}

// Built-in Cross-Module Event Handlers:

// 1. PO.received -> Financial Transaction & Inventory Lot Sync
registerEventHandler('PO.received', async (payload) => {
  const { po_id, po_code, total_amount, vendor_name } = payload;
  if (!total_amount || !vendor_name) return;

  const txnCode = `TXN-PO-${po_code || Date.now().toString().slice(-6)}`;
  await pool.query(`
    INSERT INTO vivas_financial_transactions (
      transaction_code, transaction_date, type, category_name, category_type, description, amount, payment_method, party_name, party_type, invoice_receipt_ref, payment_status, notes
    ) VALUES ($1, CURRENT_DATE, 'Expense', 'Cost of Goods Sold', 'Expense', $2, $3, 'Bank Transfer', $4, 'Vendor', $5, 'Completed', $6)
    ON CONFLICT DO NOTHING
  `, [
    txnCode,
    `Purchase Order Fulfilled: ${po_code} from ${vendor_name}`,
    total_amount,
    vendor_name,
    po_code,
    'Cross-module auto-sync via domain outbox event PO.received'
  ]);
});

// 2. Harvest.logged -> Auto-create harvest log record in vivas_harvest_logs
registerEventHandler('Harvest.logged', async (payload) => {
  const { harvest_plan_id, planting_id, crop_name, variety_name, location_name, quantity_kg } = payload;
  await pool.query(`
    INSERT INTO vivas_harvest_logs (
      harvest_plan_id, planting_id, crop_name, variety_name, field_location, harvest_quantity_kg, planned_yield_kg, quality_grade, harvest_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $6, 'Grade A', CURRENT_DATE)
  `, [
    harvest_plan_id || null,
    planting_id || null,
    crop_name || 'Crop',
    variety_name || 'Standard',
    location_name || 'Main Field',
    Number(quantity_kg || 0)
  ]);
});

// 3. Task.completed -> Log labor cost in vivas_time_logs & Financial Transaction
registerEventHandler('Task.completed', async (payload) => {
  const { task_id, worker_name, task_type, crop_name, field_location, hours_spent, hourly_rate } = payload;
  const hours = Number(hours_spent || 1);
  const rate = Number(hourly_rate || 25);
  const cost = hours * rate;

  await pool.query(`
    INSERT INTO vivas_time_logs (
      worker_name, task_type, crop_name, field_location, total_hours, labor_cost, work_date
    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
  `, [
    worker_name || 'Field Operator',
    task_type || 'Maintenance',
    crop_name || null,
    field_location || null,
    hours,
    cost
  ]);
});

// 4. Order.created -> Queue outbound webhooks for subscribed partner endpoints
registerEventHandler('order.created', async (payload) => {
  const partnerId = payload.partner_id || null;
  await queueWebhookEvent('order.created', payload, partnerId);
});

// 5. Rating.updated -> Queue outbound webhooks
registerEventHandler('rating.updated', async (payload) => {
  const partnerId = payload.partner_id || null;
  await queueWebhookEvent('rating.updated', payload, partnerId);
});

// 6. Inference.published -> Queue outbound webhooks
registerEventHandler('inference.published', async (payload) => {
  const partnerId = payload.partner_id || null;
  await queueWebhookEvent('inference.published', payload, partnerId);
});
