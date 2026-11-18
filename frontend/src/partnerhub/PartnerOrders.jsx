import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  PackageCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  IndianRupee,
  FileSpreadsheet,
  Send
} from 'lucide-react';
import { pihRequest } from './pihApi';

export default function PartnerOrders({ activePartnerId }) {
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(activePartnerId || '');
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'settlements'

  const [orders, setOrders] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Fulfilment form modal state
  const [fulfilModalOrder, setFulfilModalOrder] = useState(null);
  const [fulfilForm, setFulfilForm] = useState({
    to_status: 'accepted',
    batch_no: 'IFFCO-NANO-2026B1',
    expiry_date: '2028-06-30',
    tracking_no: 'BLUEDART-AGRI-884920',
    invoice_no: 'GST-INV-2026-109',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadPartners = useCallback(async () => {
    try {
      const res = await pihRequest('/partners');
      const list = res.data || [];
      setPartners(list);
      if (!selectedPartnerId && list.length > 0) {
        setSelectedPartnerId(list[0].id);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [selectedPartnerId]);

  const loadPartnerData = useCallback(async () => {
    if (!selectedPartnerId) return;
    setLoading(true);
    setError('');
    try {
      const [ordRes, setRes] = await Promise.all([
        pihRequest(`/orders?partner_id=${selectedPartnerId}&role=partner_admin`, {
          role: 'partner_admin',
          partnerId: selectedPartnerId
        }),
        pihRequest(`/settlements?partner_id=${selectedPartnerId}`, {
          role: 'partner_admin',
          partnerId: selectedPartnerId
        })
      ]);
      setOrders(ordRes.data || []);
      setSettlements(setRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPartnerId]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    if (activePartnerId) setSelectedPartnerId(activePartnerId);
  }, [activePartnerId]);

  useEffect(() => {
    loadPartnerData();
  }, [loadPartnerData]);

  const openFulfilModal = (ord, nextStatus) => {
    const firstItem = ord.items?.[0] || {};
    setFulfilModalOrder(ord);
    setFulfilForm({
      to_status: nextStatus,
      batch_no: firstItem.batch_no || `BATCH-${new Date().getFullYear()}-${ord.order_no.slice(-4)}`,
      expiry_date: firstItem.expiry_date
        ? String(firstItem.expiry_date).slice(0, 10)
        : '2028-06-30',
      tracking_no: ord.tracking_no || `DELHIVERY-AGRI-${ord.order_no.slice(-4)}`,
      invoice_no: ord.invoice_no || `TAX-INV-${ord.order_no.slice(-4)}`,
      note: `Partner transitioned order to ${nextStatus}`
    });
  };

  const handleFulfilSubmit = async (e) => {
    e.preventDefault();
    if (!fulfilModalOrder) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await pihRequest(`/orders/${fulfilModalOrder.id}/status`, {
        method: 'POST',
        role: 'partner_admin',
        partnerId: selectedPartnerId,
        body: fulfilForm
      });
      setToast(res.message);
      setTimeout(() => setToast(''), 4000);
      setFulfilModalOrder(null);
      await loadPartnerData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateSettlement = async () => {
    if (!selectedPartnerId) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await pihRequest('/settlements/generate', {
        method: 'POST',
        role: 'partner_admin',
        partnerId: selectedPartnerId,
        body: { partner_id: selectedPartnerId }
      });
      setToast(res.message);
      setTimeout(() => setToast(''), 4000);
      await loadPartnerData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const grossSales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalCommission = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce(
      (acc, o) =>
        acc +
        (o.items || []).reduce((sum, it) => sum + Number(it.commission_amount || 0), 0),
      0
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Partner Selector & Privacy Notice */}
      <div
        className="pih-filter-bar"
        style={{ justifyContent: 'space-between', background: '#f0fdf4', borderColor: '#bbf7d0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#14532d' }}>
            Active Partner Console:
          </span>
          <select
            className="pih-select"
            style={{ width: 'auto', minWidth: 240 }}
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand_name} ({p.partner_type})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#166534' }}>
          <ShieldAlert size={15} />
          <span>
            <strong>Privacy Guard Active (Hard Rule 6):</strong> Farmer names, phones &amp; exact GPS are masked.
            Only District, State &amp; PIN are visible.
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="pih-stat-grid">
        <div className="pih-stat-card">
          <div className="pih-stat-label">Partner Store Orders</div>
          <div className="pih-stat-value">{orders.length}</div>
          <div className="pih-stat-sub">Direct Farm Purchase Orders</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Gross Order Value (GMV)</div>
          <div className="pih-stat-value">₹{grossSales.toLocaleString('en-IN')}</div>
          <div className="pih-stat-sub">Incl. GST &amp; Shipping</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Platform Commission</div>
          <div className="pih-stat-value">₹{totalCommission.toLocaleString('en-IN')}</div>
          <div className="pih-stat-sub">Deducted on Settlement</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Net Partner Payable</div>
          <div className="pih-stat-value">
            ₹{Math.max(0, grossSales - totalCommission).toLocaleString('en-IN')}
          </div>
          <div className="pih-stat-sub">{settlements.length} Settlement Statement(s)</div>
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

      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className={`pih-btn pih-btn-sm ${
              activeTab === 'orders' ? 'pih-btn-primary' : 'pih-btn-secondary'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            <Truck size={14} /> Order Fulfilment Queue ({orders.length})
          </button>
          <button
            type="button"
            className={`pih-btn pih-btn-sm ${
              activeTab === 'settlements' ? 'pih-btn-primary' : 'pih-btn-secondary'
            }`}
            onClick={() => setActiveTab('settlements')}
          >
            <IndianRupee size={14} /> Partner Settlements ({settlements.length})
          </button>
        </div>

        <button
          type="button"
          className="pih-btn pih-btn-secondary pih-btn-sm"
          onClick={loadPartnerData}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="pih-card">
          <div className="pih-card-header">
            <div>
              <h3 className="pih-card-title">Partner Order Fulfilment &amp; Batch Compliance</h3>
              <p className="pih-card-sub">
                Transition orders through Accepted → Packed (with mandatory FCO/CIB&amp;RC Batch No &amp; Expiry Date) → Shipped → Delivered
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
              Loading partner orders...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>
              No orders placed for this partner store yet.
            </div>
          ) : (
            <div className="pih-table-wrap">
              <table className="pih-table">
                <thead>
                  <tr>
                    <th>Order No</th>
                    <th>Destination (Privacy Masked)</th>
                    <th>Ordered SKUs &amp; Batch Compliance</th>
                    <th>Gross / Commission</th>
                    <th>Status</th>
                    <th>Fulfilment Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ord.order_no}</div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                          {new Date(ord.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ord.farm_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                          {ord.delivery_address?.district}, {ord.delivery_address?.state} -{' '}
                          {ord.delivery_address?.pincode}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#006647' }}>
                          ✓ Farmer PII Masked
                        </div>
                      </td>
                      <td>
                        {(ord.items || []).map((it) => (
                          <div key={it.id} style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                            <strong>{it.qty}×</strong> {it.product_name} ({it.pack_size} {it.pack_unit})
                            <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                              Batch: <strong>{it.batch_no || 'Not Set'}</strong> | Exp:{' '}
                              <strong>
                                {it.expiry_date ? String(it.expiry_date).slice(0, 10) : 'Not Set'}
                              </strong>
                            </div>
                          </div>
                        ))}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          ₹{Number(ord.total || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                          Comm: ₹
                          {(ord.items || [])
                            .reduce((s, i) => s + Number(i.commission_amount || 0), 0)
                            .toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`pih-badge ${
                            ord.status === 'received' || ord.status === 'delivered'
                              ? 'pih-badge-approved'
                              : ord.status === 'cancelled'
                              ? 'pih-badge-rejected'
                              : 'pih-badge-live'
                          }`}
                        >
                          {ord.status.toUpperCase()}
                        </span>
                        {ord.tracking_no && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                            {ord.tracking_no}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {ord.status === 'placed' && (
                            <button
                              type="button"
                              className="pih-btn pih-btn-primary pih-btn-sm"
                              onClick={() => openFulfilModal(ord, 'accepted')}
                            >
                              Accept Order
                            </button>
                          )}
                          {(ord.status === 'placed' || ord.status === 'accepted') && (
                            <button
                              type="button"
                              className="pih-btn pih-btn-secondary pih-btn-sm"
                              onClick={() => openFulfilModal(ord, 'packed')}
                            >
                              Pack + Batch
                            </button>
                          )}
                          {(ord.status === 'accepted' || ord.status === 'packed') && (
                            <button
                              type="button"
                              className="pih-btn pih-btn-secondary pih-btn-sm"
                              onClick={() => openFulfilModal(ord, 'shipped')}
                            >
                              Ship + AWB
                            </button>
                          )}
                          {ord.status === 'shipped' && (
                            <button
                              type="button"
                              className="pih-btn pih-btn-primary pih-btn-sm"
                              onClick={() => openFulfilModal(ord, 'delivered')}
                            >
                              Mark Delivered
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
      ) : (
        <div className="pih-card">
          <div className="pih-card-header">
            <div>
              <h3 className="pih-card-title">Partner Commission &amp; Settlement Statements</h3>
              <p className="pih-card-sub">
                Automated reconciliation of delivered/received orders, platform commission, and net payout
              </p>
            </div>
            <button
              type="button"
              className="pih-btn pih-btn-primary pih-btn-sm"
              disabled={submitting}
              onClick={handleGenerateSettlement}
            >
              <FileSpreadsheet size={15} />
              {submitting ? 'Generating...' : 'Generate Current Period Settlement'}
            </button>
          </div>

          <div className="pih-table-wrap">
            <table className="pih-table">
              <thead>
                <tr>
                  <th>Statement Period</th>
                  <th>Partner</th>
                  <th>Gross Delivered GMV</th>
                  <th>Platform Commission</th>
                  <th>Net Partner Payable</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                      No settlement statements generated yet. Click &ldquo;Generate Current Period Settlement&rdquo; above.
                    </td>
                  </tr>
                ) : (
                  settlements.map((st) => (
                    <tr key={st.id}>
                      <td style={{ fontWeight: 600 }}>
                        {String(st.period_start).slice(0, 10)} → {String(st.period_end).slice(0, 10)}
                      </td>
                      <td>{st.brand_name}</td>
                      <td>₹{Number(st.gross || 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#dc2626' }}>
                        -₹{Number(st.commission || 0).toLocaleString('en-IN')} ({st.commission_pct}%)
                      </td>
                      <td style={{ fontWeight: 800, color: '#006647' }}>
                        ₹{Number(st.net_payable || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className="pih-badge pih-badge-approved">
                          {st.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fulfilment Modal */}
      {fulfilModalOrder && (
        <div className="pih-drawer-backdrop" onClick={() => setFulfilModalOrder(null)}>
          <div
            className="pih-drawer"
            style={{ maxWidth: '520px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pih-drawer-header">
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                Update Order {fulfilModalOrder.order_no} → {fulfilForm.to_status.toUpperCase()}
              </h3>
              <button
                className="pih-btn pih-btn-secondary pih-btn-sm"
                onClick={() => setFulfilModalOrder(null)}
              >
                ✕
              </button>
            </div>
            <div className="pih-drawer-body">
              <form onSubmit={handleFulfilSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="pih-form-group">
                  <label>Target Status</label>
                  <select
                    className="pih-select"
                    value={fulfilForm.to_status}
                    onChange={(e) => setFulfilForm({ ...fulfilForm, to_status: e.target.value })}
                  >
                    <option value="accepted">Accepted</option>
                    <option value="packed">Packed (Batch &amp; Expiry Verified)</option>
                    <option value="shipped">Shipped (Dispatched with Tracking)</option>
                    <option value="delivered">Delivered at Farm</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="pih-form-group">
                  <label>Manufacturer Batch Number (Mandatory for FCO / CIB&amp;RC Traceability)</label>
                  <input
                    className="pih-input"
                    value={fulfilForm.batch_no}
                    onChange={(e) => setFulfilForm({ ...fulfilForm, batch_no: e.target.value })}
                    required
                  />
                </div>

                <div className="pih-form-group">
                  <label>Batch Expiry Date</label>
                  <input
                    type="date"
                    className="pih-input"
                    value={fulfilForm.expiry_date}
                    onChange={(e) => setFulfilForm({ ...fulfilForm, expiry_date: e.target.value })}
                    required
                  />
                </div>

                <div className="pih-form-group">
                  <label>Logistics Tracking / AWB Number</label>
                  <input
                    className="pih-input"
                    value={fulfilForm.tracking_no}
                    onChange={(e) => setFulfilForm({ ...fulfilForm, tracking_no: e.target.value })}
                  />
                </div>

                <div className="pih-form-group">
                  <label>GST Tax Invoice Number</label>
                  <input
                    className="pih-input"
                    value={fulfilForm.invoice_no}
                    onChange={(e) => setFulfilForm({ ...fulfilForm, invoice_no: e.target.value })}
                  />
                </div>

                <div className="pih-form-group">
                  <label>Dispatch / Fulfilment Note</label>
                  <input
                    className="pih-input"
                    value={fulfilForm.note}
                    onChange={(e) => setFulfilForm({ ...fulfilForm, note: e.target.value })}
                  />
                </div>

                <button type="submit" className="pih-btn pih-btn-primary" disabled={submitting}>
                  <Send size={15} />
                  {submitting ? 'Updating Order...' : `Confirm ${fulfilForm.to_status.toUpperCase()}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
