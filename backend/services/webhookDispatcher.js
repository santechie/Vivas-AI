import crypto from 'crypto';
import pool from '../config/db.js';

// Exponential backoff schedule in minutes: 1m, 5m, 15m, 60m, 360m (6h)
export const WEBHOOK_RETRY_SCHEDULE_MINUTES = [1, 5, 15, 60, 360];

/**
 * Generates HMAC-SHA256 signature for outgoing webhook payload
 */
export function generateWebhookSignature(secret, rawPayload) {
  const hmac = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
  return `sha256=${hmac}`;
}

/**
 * Enqueues a webhook delivery across all active webhook subscriptions listening for the given event.
 * If targetPartnerId is provided, delivers only to webhooks for that partner.
 */
export async function queueWebhookEvent(event, payload, targetPartnerId = null, clientOrPool = pool) {
  let query = `
    SELECT id, partner_id, endpoint_url, secret, events
    FROM pih_webhooks
    WHERE is_active = TRUE
      AND deleted_at IS NULL
      AND $1 = ANY(events)
  `;
  const params = [event];
  if (targetPartnerId) {
    query += ` AND partner_id = $2`;
    params.push(targetPartnerId);
  }

  const whRes = await clientOrPool.query(query, params);
  const queuedDeliveries = [];

  for (const wh of whRes.rows) {
    const timestampIso = new Date().toISOString();
    const eventPayload = {
      id: `evt_${crypto.randomBytes(12).toString('hex')}`,
      event,
      created_at: timestampIso,
      data: payload
    };

    const ins = await clientOrPool.query(
      `INSERT INTO pih_webhook_deliveries (
         webhook_id, event, payload, attempt, status, next_retry_at
       ) VALUES ($1, $2, $3, 1, 'pending', NOW())
       RETURNING *`,
      [wh.id, event, eventPayload]
    );
    queuedDeliveries.push(ins.rows[0]);
  }

  return queuedDeliveries;
}

/**
 * Dispatches an individual webhook delivery attempt with live HTTP POST,
 * timeout handling, and exponential backoff retry scheduling.
 */
export async function dispatchDeliveryAttempt(deliveryId, simulateFailure = false) {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    const delRes = await client.query(
      `SELECT d.*, w.endpoint_url, w.secret, w.is_active, p.brand_name as partner_brand
       FROM pih_webhook_deliveries d
       JOIN pih_webhooks w ON d.webhook_id = w.id
       LEFT JOIN pih_partners p ON w.partner_id = p.id
       WHERE d.id = $1`,
      [deliveryId]
    );

    if (delRes.rowCount === 0) return null;
    const item = delRes.rows[0];

    const rawPayload = JSON.stringify(item.payload);
    const signature = generateWebhookSignature(item.secret, rawPayload);
    const timestampIso = new Date().toISOString();

    let responseCode = null;
    let responseBody = null;
    let errorMessage = null;
    let isSuccess = false;

    if (simulateFailure) {
      responseCode = 503;
      errorMessage = 'Simulated delivery failure (503 Service Unavailable)';
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const resp = await fetch(item.endpoint_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Vivas-Event': item.event,
            'X-Vivas-Signature': signature,
            'X-Vivas-Timestamp': timestampIso
          },
          body: rawPayload,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        responseCode = resp.status;
        const text = await resp.text().catch(() => '');
        responseBody = text.slice(0, 1000); // Truncate body if excessive
        isSuccess = resp.ok;
      } catch (fetchErr) {
        errorMessage = fetchErr.message;
        // In local/test environments where the endpoint is a simulated/dummy URL (like example.com or unhosted port),
        // we record the error and handle backoff
        responseCode = fetchErr.name === 'AbortError' ? 504 : 0;
      }
    }

    const durationMs = Date.now() - startTime;
    const currentAttempt = item.attempt || 1;

    if (isSuccess) {
      await client.query(
        `UPDATE pih_webhook_deliveries
         SET status = 'delivered',
             response_code = $1,
             response_body = $2,
             duration_ms = $3,
             error_message = NULL,
             next_retry_at = NULL,
             updated_at = NOW()
         WHERE id = $4`,
        [responseCode, responseBody, durationMs, item.id]
      );
      return { success: true, status: 'delivered', responseCode, durationMs };
    } else {
      // Determine if retry should be scheduled
      const canRetry = currentAttempt < WEBHOOK_RETRY_SCHEDULE_MINUTES.length;
      let nextRetry = null;
      let newStatus = 'failed';

      if (canRetry) {
        const delayMins = WEBHOOK_RETRY_SCHEDULE_MINUTES[currentAttempt - 1];
        nextRetry = new Date(Date.now() + delayMins * 60 * 1000).toISOString();
        newStatus = 'pending';
      }

      await client.query(
        `UPDATE pih_webhook_deliveries
         SET status = $1,
             attempt = attempt + 1,
             response_code = $2,
             response_body = $3,
             error_message = $4,
             next_retry_at = $5,
             duration_ms = $6,
             updated_at = NOW()
         WHERE id = $7`,
        [newStatus, responseCode, responseBody, errorMessage, nextRetry, durationMs, item.id]
      );

      return {
        success: false,
        status: newStatus,
        attempt: currentAttempt + 1,
        responseCode,
        nextRetryAt: nextRetry,
        errorMessage
      };
    }
  } finally {
    client.release();
  }
}

/**
 * Worker tick: processes up to batchSize pending deliveries whose next_retry_at <= NOW()
 */
export async function processWebhookQueueBatch(batchSize = 10) {
  const client = await pool.connect();
  let processedCount = 0;

  try {
    const queueRes = await client.query(
      `SELECT id FROM pih_webhook_deliveries
       WHERE status = 'pending'
         AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [batchSize]
    );

    for (const row of queueRes.rows) {
      await dispatchDeliveryAttempt(row.id);
      processedCount++;
    }
  } catch (err) {
    console.error('[WebhookDispatcher] Batch error:', err.message);
  } finally {
    client.release();
  }

  return processedCount;
}
