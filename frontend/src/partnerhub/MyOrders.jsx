import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  FileText,
  Box,
  AlertTriangle,
  Eye,
  X,
  RefreshCw,
  ArrowDownToLine
} from 'lucide-react';
import { pihRequest } from './pihApi';

const STATUS_STEPS = ['placed', 'accepted', 'packed', 'shipped', 'delivered', 'received'];

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receivingId, setReceivingId] = useState(null);
  const [storageLocation, setStorageLocation] = useState('Main Agri-Input Warehouse');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = statusFilter !== 'ALL' ? `?status=${statusFilter}&role=farmer` : '?role=farmer';
      const res = await pihRequest(`/orders${qs}`);
      setOrders(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenDetail = async (orderId) => {
    try {
      const res = await pihRequest(`/orders/${orderId}?role=farmer`);
      setSelectedOrder(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReceiveOrder = async (orderId) => {
    setReceivingId(orderId);
    setError('');
    try {
      const res = await pihRequest(`/orders/${orderId}/receive`, {
        method: 'POST',
        body: { storage_location: storageLocation }
      });
      setToast(res.message);
      setTimeout(() => setToast(''), 4500);
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        await handleOpenDetail(orderId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setReceivingId(null);
    }
  };

  const totalSpend = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + Number(o.total || 0), 0);
  const receivedCount = orders.filter((o) => o.status === 'received').length;
  const inTransitCount = orders.filter((o) =>
    ['placed', 'accepted', 'packed', 'shipped', 'delivered'].includes(o.status)
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* KPI Cards */}
      <div className="pih-stat-grid">
        <div className="pih-stat-card">
          <div className="pih-stat-label">Total Farm Input Orders</div>
          <div className="pih-stat-value">{orders.length}</div>
          <div className="pih-stat-sub">Linked to Buy &amp; Procurement POs</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Active / In-Transit</div>
          <div className="pih-stat-value">{inTransitCount}</div>
          <div className="pih-stat-sub">Awaiting Partner Fulfilment or Farm Receipt</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Received into Inventory Lots</div>
          <div className="pih-stat-value">{receivedCount}</div>
          <div className="pih-stat-sub">Auto-created in `vivas_inputs_lots`</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Total Partner Hub PO Value</div>
          <div className="pih-stat-value">₹{totalSpend.toLocaleString('en-IN')}</div>
          <div className="pih-stat-sub">Includes GST Input Tax Credit</div>
        </div>
      </div>

      {error && (
        <div className="pih-alert pih-alert-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      {toast && (
        <div className="pih-alert pih-alert-success">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="pih-filter-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'placed', 'accepted', 'packed', 'shipped', 'delivered', 'received', 'cancelled'].map(
            (st) => (
              <button
                key={st}
                type="button"
                className={`pih-btn pih-btn-sm ${
                  statusFilter === st ? 'pih-btn-primary' : 'pih-btn-secondary'
                }`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'ALL' ? 'All Orders' : st.toUpperCase()}
              </button>
            )
          )}
        </div>
        <button type="button" className="pih-btn pih-btn-secondary pih-btn-sm" onClick={loadOrders}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Orders Table */}
      <div className="pih-card">
        <div className="pih-card-header">
          <div>
            <h3 className="pih-card-title">My Farm Input Orders &amp; Inventory Lot Sync</h3>
            <p className="pih-card-sub">
              Every order creates a `vivas_purchase_orders` row and, upon receipt, adds traceable batch lots into `vivas_inputs_lots`.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
            <Package size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>No farm input orders found. Place an order from the AgriInput Marketplace!</div>
          </div>
        ) : (
          <div className="pih-table-wrap">
            <table className="pih-table">
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Partner Store</th>
                  <th>Linked Buy PO &amp; Vendor</th>
                  <th>Items &amp; Batch / Lot</th>
                  <th>Total (Incl. GST)</th>
                  <th>Order Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{ord.order_no}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {new Date(ord.created_at).toLocaleDateString('en-IN')} • {ord.payment_mode?.toUpperCase()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ord.partner_brand}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{ord.store_name}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#006647', fontSize: '0.84rem' }}>
                        <FileText size={13} style={{ display: 'inline', marginRight: 4 }} />
                        {ord.po_code || `PO #${ord.purchase_order_id}`}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Vendor: {ord.vendor_code || ord.vendor_name} ({ord.po_status || 'Ordered'})
                      </div>
                    </td>
                    <td>
                      {(ord.items || []).map((it) => (
                        <div key={it.id} style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                          <strong>{it.qty}×</strong> {it.product_name} ({it.pack_size} {it.pack_unit})
                          {it.batch_no && (
                            <span style={{ color: '#475569', marginLeft: 6 }}>
                              [Batch: {it.batch_no}]
                            </span>
                          )}
                          {it.lot_number && (
                            <span
                              className="pih-badge pih-badge-approved"
                              style={{ marginLeft: 6, fontSize: '0.68rem' }}
                            >
                              Lot: {it.lot_number}
                            </span>
                          )}
                        </div>
                      ))}
                    </td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>
                      ₹{Number(ord.total || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span
                        className={`pih-badge ${
                          ord.status === 'received'
                            ? 'pih-badge-approved'
                            : ord.status === 'cancelled'
                            ? 'pih-badge-rejected'
                            : 'pih-badge-live'
                        }`}
                      >
                        {ord.status.toUpperCase()}
                      </span>
                      {ord.tracking_no && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 3 }}>
                          AWB: {ord.tracking_no}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="pih-btn pih-btn-secondary pih-btn-sm"
                          onClick={() => handleOpenDetail(ord.id)}
                        >
                          <Eye size={14} /> Details
                        </button>
                        {ord.status !== 'received' && ord.status !== 'cancelled' && (
                          <button
                            type="button"
                            className="pih-btn pih-btn-primary pih-btn-sm"
                            disabled={receivingId === ord.id}
                            onClick={() => handleReceiveOrder(ord.id)}
                            title="Confirm Farm Receipt -> Mark PO Received & Add Lots to vivas_inputs_lots"
                          >
                            <ArrowDownToLine size={14} />
                            {receivingId === ord.id ? 'Syncing Lot...' : 'Receive into Inventory'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <div className="pih-drawer-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="pih-drawer"
            style={{ maxWidth: '680px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pih-drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Order {selectedOrder.order_no} • {selectedOrder.partner_brand}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Linked Buy PO: <strong>{selectedOrder.po_code}</strong> ({selectedOrder.po_status}) • Vendor:{' '}
                  <strong>{selectedOrder.vendor_code}</strong>
                </span>
              </div>
              <button
                className="pih-btn pih-btn-secondary pih-btn-sm"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="pih-drawer-body">
              {/* Status Stepper */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 16,
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                {STATUS_STEPS.map((st, idx) => {
                  const curIdx = STATUS_STEPS.indexOf(selectedOrder.status);
                  const done = curIdx >= idx;
                  return (
                    <div
                      key={st}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.78rem',
                        fontWeight: done ? 700 : 500,
                        color: done ? '#006647' : '#94a3b8'
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>{st.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Order Items + Linked Inventory Lot */}
              <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem', fontWeight: 700 }}>
                Order Items &amp; Linked Farm Inventory Lots (`vivas_inputs_lots`)
              </h4>
              <div className="pih-table-wrap" style={{ marginBottom: 16 }}>
                <table className="pih-table">
                  <thead>
                    <tr>
                      <th>Product &amp; Pack</th>
                      <th>Qty</th>
                      <th>Batch &amp; Expiry</th>
                      <th>Line Total</th>
                      <th>Inventory Lot (`vivas_inputs_lots`)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedOrder.items || []).map((it) => (
                      <tr key={it.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {it.pack_size} {it.pack_unit} • SKU: {it.sku_code}
                          </div>
                        </td>
                        <td>{it.qty}</td>
                        <td>
                          <div>Batch: {it.batch_no || 'Pending Pack'}</div>
                          {it.expiry_date && (
                            <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                              Exp: {String(it.expiry_date).slice(0, 10)}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          ₹{Number(it.line_total).toLocaleString('en-IN')}
                        </td>
                        <td>
                          {it.lot_number ? (
                            <span className="pih-badge pih-badge-approved">
                              <Box size={12} /> {it.lot_number}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              Created on Farm Receipt
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirm Receipt Action Box */}
              {selectedOrder.status !== 'received' && selectedOrder.status !== 'cancelled' && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#14532d', marginBottom: 6 }}>
                    Confirm Physical Delivery &amp; Add to Farm Inventory Lots
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#166534', marginBottom: 10 }}>
                    Confirming receipt marks Purchase Order <strong>{selectedOrder.po_code}</strong> as{' '}
                    <code>Received</code> and creates traceable lot entries in{' '}
                    <code>vivas_inputs_lots</code> + updates <code>vivas_inputs_inventory</code>.
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="pih-input"
                      style={{ maxWidth: 260 }}
                      value={storageLocation}
                      onChange={(e) => setStorageLocation(e.target.value)}
                      placeholder="Storage Warehouse / Shed..."
                    />
                    <button
                      type="button"
                      className="pih-btn pih-btn-primary"
                      disabled={receivingId === selectedOrder.id}
                      onClick={() => handleReceiveOrder(selectedOrder.id)}
                    >
                      <ArrowDownToLine size={16} />
                      {receivingId === selectedOrder.id
                        ? 'Creating Inventory Lots...'
                        : 'Confirm Receipt & Create Inventory Lots'}
                    </button>
                  </div>
                </div>
              )}

              {/* Audit Status History */}
              <h4 style={{ margin: '0 0 8px', fontSize: '0.92rem', fontWeight: 700 }}>
                Order Fulfilment &amp; Audit Timeline
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(selectedOrder.history || []).map((h) => (
                  <div
                    key={h.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <strong>{h.from_status ? `${h.from_status} → ` : ''}{h.to_status.toUpperCase()}</strong>:{' '}
                      {h.note}
                    </div>
                    <div style={{ color: '#64748b' }}>
                      {new Date(h.created_at).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
