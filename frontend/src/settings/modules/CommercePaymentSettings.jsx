import React, { useState, useEffect } from 'react';
import {
  CreditCard, Shield, CheckCircle2, AlertCircle, RefreshCw, Edit2,
  Lock, Eye, EyeOff, Save, X, ExternalLink, Smartphone, Check
} from 'lucide-react';

export default function CommercePaymentSettings({ apiBase, farmId }) {
  const [processors, setProcessors] = useState([]);
  const [channelMappings, setChannelMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal edit credentials
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProcessors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/payment-processors?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        setProcessors(data.processors || (data.data && data.data.processors) || []);
        setChannelMappings(data.channelMappings || data.channels || (data.data && data.data.channels) || []);
      }
    } catch (err) {
      showToast('error', 'Failed to load payment processor configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessors();
  }, [farmId]);

  const handleOpenEdit = (p) => {
    setEditingItem({
      ...p,
      id: p.id,
      name: p.provider_name || p.name,
      code: p.provider_code || p.code,
      publishable_key: p.publishable_key || p.api_key || '',
      api_key: p.publishable_key || p.api_key || '',
      secret_key: p.secret_key_encrypted || p.api_secret || '',
      api_secret: p.secret_key_encrypted || p.api_secret || '',
      webhook_secret: p.webhook_secret || '',
      is_test_mode: !!p.is_test_mode,
      is_enabled: !!p.is_enabled
    });
    setShowSecret(false);
    setShowModal(true);
  };

  const handleToggleEnable = async (p) => {
    const updated = !p.is_enabled;
    const name = p.provider_name || p.name || 'Gateway';
    try {
      const res = await fetch(`${apiBase}/api/settings/payment-processors/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: updated })
      });
      const data = await res.json();
      if (data.success) {
        setProcessors(prev => prev.map(x => x.id === p.id ? { ...x, is_enabled: updated } : x));
        showToast('success', `${name} ${updated ? 'activated' : 'deactivated'}`);
      }
    } catch (err) {
      showToast('error', 'Failed to toggle processor status');
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/payment-processors/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_enabled: editingItem.is_enabled,
          is_test_mode: editingItem.is_test_mode,
          api_key: editingItem.api_key,
          api_secret: editingItem.api_secret,
          webhook_secret: editingItem.webhook_secret
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `${editingItem.name} configuration updated`);
        setShowModal(false);
        fetchProcessors();
      } else {
        showToast('error', data.error || 'Failed to update credentials');
      }
    } catch (err) {
      showToast('error', 'Error updating payment credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-module-container">
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="settings-page-header">
        <div>
          <h2 className="settings-page-title">Commerce & Payment Processors</h2>
          <p className="settings-page-subtitle">
            Connect merchant payment gateways, UPI QR code processing, Stripe, Square POS, and automated payout reconciliations.
          </p>
        </div>
        <div>
          <button className="settings-btn-secondary" onClick={fetchProcessors} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="settings-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
          <p>Loading payment configurations...</p>
        </div>
      ) : (
        <>
          {/* Gateways Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {processors.map(p => (
              <div key={p.id} className="settings-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#064f32',
                        fontWeight: 700
                      }}>
                        <CreditCard size={22} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                          {p.provider_name || p.name}
                        </h4>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {(p.provider_code === 'razorpay' || p.code === 'razorpay') && 'UPI, Cards, NetBanking (India)'}
                          {(p.provider_code === 'stripe' || p.code === 'stripe') && 'International Credit & Debit Cards'}
                          {(p.provider_code === 'square' || p.code === 'square') && 'In-person POS Terminal'}
                          {(p.provider_code === 'manual_cash' || p.code === 'manual_cash') && 'Cash on Delivery & Wire Transfer'}
                        </div>
                      </div>
                    </div>

                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={p.is_enabled}
                        onChange={() => handleToggleEnable(p)}
                      />
                      <span className="settings-slider" />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <span className="settings-badge" style={{
                      backgroundColor: p.is_enabled ? '#ecfdf5' : '#f1f5f9',
                      color: p.is_enabled ? '#064f32' : '#64748b'
                    }}>
                      {p.is_enabled ? 'Active Gateway' : 'Disabled'}
                    </span>
                    {p.is_enabled && (
                      <span className="settings-badge" style={{
                        backgroundColor: p.is_test_mode ? '#fffbeb' : '#eff6ff',
                        color: p.is_test_mode ? '#b45309' : '#1d4ed8'
                      }}>
                        {p.is_test_mode ? 'Sandbox / Test Mode' : 'Live Production'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                    {(p.publishable_key || p.api_key) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={13} style={{ color: '#064f32' }} />
                        <span>Key configured: <code>{(p.publishable_key || p.api_key).substring(0, 8)}...</code></span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>API credentials not yet entered</span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="settings-btn-secondary"
                    style={{ fontSize: '0.8125rem' }}
                    onClick={() => handleOpenEdit(p)}
                  >
                    <Edit2 size={13} /> Configure API Keys
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Sales Channels Table */}
          <div className="settings-card">
            <div className="settings-card-header">
              <h3 className="settings-card-title">Payment Channel Matrix</h3>
              <p className="settings-card-subtitle">Control which payment methods are accepted for each sales stream</p>
            </div>

            <div className="settings-table-wrapper">
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Sales Channel</th>
                    <th>Supported Payment Processors</th>
                    <th>Automatic Settlement</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>Online Storefront / Offer Sheets</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Direct customer checkouts</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>Razorpay UPI</span>
                        <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>Stripe</span>
                        <span className="settings-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>Cash on Delivery</span>
                      </div>
                    </td>
                    <td><Check size={16} color="#064f32" /> Immediate receipt generated</td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>Wholesale Invoices</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Restaurants, grocers, and distributors</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>Bank Wire Transfer</span>
                        <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>Net 30 Invoicing</span>
                      </div>
                    </td>
                    <td>Reconciled upon bank statement match</td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>Farm Stand & Farmers Markets</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Walk-in customer sales</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>Square POS Reader</span>
                        <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>Cash Drawer</span>
                        <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>Direct UPI QR Scan</span>
                      </div>
                    </td>
                    <td><Check size={16} color="#064f32" /> Synchronized with daily cash tally</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Credentials Modal */}
      {showModal && editingItem && (
        <div className="settings-modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Configure {editingItem.name}</h3>
              <button className="settings-modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCredentials}>
              <div className="settings-modal-body">
                <div className="settings-form-group">
                  <label className="settings-checkbox-card">
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={editingItem.is_test_mode}
                        onChange={e => setEditingItem({ ...editingItem, is_test_mode: e.target.checked })}
                      />
                      <span className="settings-slider" />
                    </label>
                    <div className="checkbox-info">
                      <div className="checkbox-title">Sandbox / Test Mode</div>
                      <div className="checkbox-desc">Process mock test charges without touching real bank accounts</div>
                    </div>
                  </label>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">
                    {editingItem.code === 'razorpay' ? 'Key ID' : 'Publishable / Client Key'}
                  </label>
                  <input
                    type="text"
                    value={editingItem.api_key}
                    onChange={e => setEditingItem({ ...editingItem, api_key: e.target.value })}
                    className="settings-form-control"
                    placeholder="rzp_live_..."
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">
                    {editingItem.code === 'razorpay' ? 'Key Secret' : 'Secret / Private API Key'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={editingItem.api_secret}
                      onChange={e => setEditingItem({ ...editingItem, api_secret: e.target.value })}
                      className="settings-form-control"
                      style={{ paddingRight: '40px' }}
                      placeholder="••••••••••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b'
                      }}
                    >
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Webhook Secret (Optional)</label>
                  <input
                    type="text"
                    value={editingItem.webhook_secret}
                    onChange={e => setEditingItem({ ...editingItem, webhook_secret: e.target.value })}
                    className="settings-form-control"
                    placeholder="whsec_..."
                  />
                  <div className="settings-form-help">Used to verify instant payment webhooks from the gateway</div>
                </div>
              </div>

              <div className="settings-modal-footer">
                <button type="button" className="settings-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="settings-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
