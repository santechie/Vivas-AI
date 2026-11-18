import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from '../backend/node_modules/express/index.js';
import pool from '../backend/config/db.js';
import partnerHubRouter from '../backend/routes/partnerHub.js';

const testApp = express();
testApp.use(express.json({ limit: '15mb' }));
testApp.use('/api/pih', partnerHubRouter);

let server = null;
let BASE = 'http://127.0.0.1:0/api/pih';

async function api(endpoint, { method = 'GET', body = null, role = 'farmer', partnerId = null } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-pih-role': role
  };
  if (partnerId) headers['x-partner-id'] = partnerId;
  if (method === 'POST') headers['Idempotency-Key'] = crypto.randomUUID();

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function runVerification() {
  server = await new Promise((resolve) => {
    const s = testApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address();
  BASE = `http://127.0.0.1:${addr.port}/api/pih`;
  console.log('=== PHASE 3 AUTOMATED VERIFICATION: STORE, CHECKOUT, PO & INVENTORY LOT SYNC ===');

  // 1. Fetch live stores and products
  const storesRes = await api('/stores');
  assert.equal(storesRes.status, 200, `GET /stores should succeed: ${storesRes.json.message}`);
  assert.ok(storesRes.json.data.length >= 5, 'Should have at least 5 live partner stores');
  console.log(`[PASS 1/8] GET /api/pih/stores returned ${storesRes.json.data.length} live partner stores.`);

  const prodsRes = await api('/products?status=live');
  assert.equal(prodsRes.status, 200, 'GET /products?status=live should succeed');
  const liveProduct = prodsRes.json.data.find((p) => p.skus && p.skus.length > 0);
  assert.ok(liveProduct, 'Should find a live product with SKUs');
  const primarySku = liveProduct.skus[0];
  console.log(`[PASS 2/8] Selected live product "${liveProduct.name}" (SKU: ${primarySku.sku_code}, Price: ₹${primarySku.selling_price}).`);

  // 2. Test Smart Shopping List Bridge (vivas_shopping_list)
  const shopRes = await api('/shopping-list/add', {
    method: 'POST',
    body: {
      product_id: liveProduct.id,
      sku_id: primarySku.id,
      qty: 2,
      priority: 'High'
    }
  });
  assert.equal(shopRes.status, 201, `Shopping list add failed: ${shopRes.json.message}`);
  const dbShop = await pool.query('SELECT * FROM vivas_shopping_list WHERE id = $1', [shopRes.json.data.id]);
  assert.equal(dbShop.rowCount, 1, 'Row must exist in vivas_shopping_list');
  console.log(`[PASS 3/8] Added SKU to vivas_shopping_list (code: ${dbShop.rows[0].item_code}, vendor: ${dbShop.rows[0].vendor_name}).`);

  // 3. Add SKU to Cart (qty = 3 so subtotal meets min_order_value)
  const cartAddRes = await api('/cart/items', {
    method: 'POST',
    body: {
      sku_id: primarySku.id,
      qty: 4
    }
  });
  assert.equal(cartAddRes.status, 201, `Add to cart failed: ${cartAddRes.json.message}`);
  const cartId = cartAddRes.json.data.cart.id;
  console.log(`[PASS 4/8] Added 4 × ${primarySku.sku_code} to pih_carts (cart_id: ${cartId}).`);

  // 4. Checkout Cart -> Creates pih_store_orders + vivas_purchase_orders + vivas_vendors
  const checkoutRes = await api('/checkout', {
    method: 'POST',
    body: {
      cart_id: cartId,
      payment_mode: 'online',
      delivery_address: {
        recipient_name: 'Kiran Kumar (PII Secret)',
        phone: '+91 99001 12233',
        line1: 'Survey No 42, Secret GPS 13.221, 77.554',
        district: 'Bengaluru Rural',
        state: 'Karnataka',
        pincode: '561203'
      }
    }
  });
  assert.equal(checkoutRes.status, 201, `Checkout failed: ${checkoutRes.json.message}`);
  const order = checkoutRes.json.data;
  assert.ok(order.id, 'Created pih_store_orders id must be present');
  assert.ok(order.purchase_order_id, 'Linked vivas_purchase_orders id must be present');
  assert.ok(order.vendor_id, 'Linked vivas_vendors id must be present');

  const poCheck = await pool.query('SELECT * FROM vivas_purchase_orders WHERE id = $1', [order.purchase_order_id]);
  assert.equal(poCheck.rowCount, 1, 'vivas_purchase_orders row must exist');
  assert.equal(poCheck.rows[0].status, 'Ordered', 'Initial PO status should be Ordered');
  console.log(
    `[PASS 5/8] Checkout created Store Order ${order.order_no} linked to Purchase Order ${poCheck.rows[0].po_code} (Total: ₹${order.total}).`
  );

  // 5. Partner Privacy Check (Hard Rule 6) + Partner Fulfilment Transitions
  const partnerOrdersRes = await api(`/orders/${order.id}?role=partner_admin`, {
    role: 'partner_admin',
    partnerId: order.partner_id
  });
  assert.equal(partnerOrdersRes.status, 200);
  const partnerViewAddr = partnerOrdersRes.json.data.delivery_address;
  assert.equal(partnerViewAddr.recipient_name, undefined, 'Partner must NEVER see farmer recipient_name');
  assert.equal(partnerViewAddr.phone, undefined, 'Partner must NEVER see farmer phone');
  assert.equal(partnerViewAddr.line1, undefined, 'Partner must NEVER see exact street/GPS line1');
  assert.equal(partnerViewAddr.district, 'Bengaluru Rural', 'Partner sees district');

  // Partner transitions: accepted -> packed (with batch & expiry) -> shipped -> delivered
  for (const st of ['accepted', 'packed', 'shipped', 'delivered']) {
    const stRes = await api(`/orders/${order.id}/status`, {
      method: 'POST',
      role: 'partner_admin',
      partnerId: order.partner_id,
      body: {
        to_status: st,
        batch_no: 'BATCH-VERIFY-2026X',
        expiry_date: '2028-12-31',
        tracking_no: 'BLUEDART-998877',
        invoice_no: 'GST-INV-9988'
      }
    });
    assert.equal(stRes.status, 200, `Transition to ${st} failed: ${stRes.json.message}`);
  }
  console.log('[PASS 6/8] Partner Privacy Guard verified & Order transitioned accepted → packed → shipped → delivered.');

  // 6. Farmer marks order received -> updates vivas_purchase_orders to 'Received' & creates vivas_inputs_lots
  const receiveRes = await api(`/orders/${order.id}/receive`, {
    method: 'POST',
    role: 'farmer',
    body: {
      storage_location: 'Block A Input Shed'
    }
  });
  assert.equal(receiveRes.status, 200, `Order receive failed: ${receiveRes.json.message}`);
  const createdLots = receiveRes.json.data.lots;
  assert.ok(createdLots.length >= 1, 'At least 1 vivas_inputs_lots row must be created');

  const poAfter = await pool.query('SELECT status FROM vivas_purchase_orders WHERE id = $1', [order.purchase_order_id]);
  assert.equal(poAfter.rows[0].status, 'Received', 'vivas_purchase_orders status must be updated to Received');

  const orderItemCheck = await pool.query(
    'SELECT inputs_lot_id, batch_no FROM pih_store_order_items WHERE order_id = $1',
    [order.id]
  );
  assert.equal(
    orderItemCheck.rows[0].inputs_lot_id,
    createdLots[0].id,
    'pih_store_order_items.inputs_lot_id must reference vivas_inputs_lots.id'
  );
  console.log(
    `[PASS 7/8] Order Receipt synced PO ${poCheck.rows[0].po_code} to "Received" & created Farm Inventory Lot ${createdLots[0].lot_number} (Batch: ${orderItemCheck.rows[0].batch_no}).`
  );

  // 7. Verified Farmer Review + Partner Reply + Settlement Generation
  const revRes = await api(`/products/${liveProduct.id}/reviews`, {
    method: 'POST',
    role: 'farmer',
    body: {
      rating: 5,
      title: 'Outstanding field response on Tomato plot',
      body: 'Applied 4 packs across our Doddaballapura block. Visible leaf greening and vigour within 6 days.'
    }
  });
  assert.equal(revRes.status, 201, `Review post failed: ${revRes.json.message}`);

  const replyRes = await api(`/reviews/${revRes.json.data.id}/reply`, {
    method: 'POST',
    role: 'partner_admin',
    partnerId: order.partner_id,
    body: {
      partner_reply: 'Thank you for your verified feedback! Maintain 15-day foliar interval for peak yield.'
    }
  });
  assert.equal(replyRes.status, 200, `Partner reply failed: ${replyRes.json.message}`);

  const settleRes = await api('/settlements/generate', {
    method: 'POST',
    role: 'partner_admin',
    partnerId: order.partner_id,
    body: {
      partner_id: order.partner_id
    }
  });
  assert.equal(settleRes.status, 201, `Settlement generation failed: ${settleRes.json.message}`);
  console.log(
    `[PASS 8/8] Verified Farmer Review + Partner Reply published & Partner Settlement generated (Net Payable: ₹${settleRes.json.data.net_payable}).`
  );

  console.log('\n🎉 ALL PHASE 3 VERIFICATION TESTS PASSED!');
  if (server) server.close();
  await pool.end();
}

runVerification().catch(async (err) => {
  console.error('PHASE 3 VERIFICATION FAILED:', err);
  if (server) server.close();
  await pool.end();
  process.exit(1);
});
