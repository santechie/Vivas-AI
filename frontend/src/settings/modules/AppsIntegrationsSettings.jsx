import React, { useState, useEffect } from 'react';
import {
  Key, Plus, Trash2, Copy, Check, Shield, Globe, RefreshCw,
  CheckCircle2, AlertCircle, X, ExternalLink, CloudRain, Table
} from 'lucide-react';

export default function AppsIntegrationsSettings({ apiBase, farmId }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal create
  const [showModal, setShowModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [scopes, setScopes] = useState({
    'crops:read': true,
    'crops:write': false,
    'tasks:read': true,
    'tasks:write': true,
    'orders:read': true,
    'orders:write': false
  });
  const [saving, setSaving] = useState(false);

  // Newly generated token reveal modal
  const [revealedToken, setRevealedToken] = useState(null);
  const [copied, setCopied] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/api-tokens?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        setTokens(data.tokens || data.data || []);
      }
    } catch (err) {
      showToast('error', 'Failed to load API tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [farmId]);

  const handleCreateToken = async (e) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      showToast('error', 'Token description name is required');
      return;
    }

    const activeScopes = Object.keys(scopes).filter(k => scopes[k]);

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/api-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          name: newTokenName.trim(),
          scopes: activeScopes,
          expires_in_days: parseInt(expiresInDays) || 90
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setRevealedToken(data.rawToken);
        setNewTokenName('');
        fetchTokens();
      } else {
        showToast('error', data.error || 'Failed to create token');
      }
    } catch (err) {
      showToast('error', 'Error generating API token');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeToken = async (t) => {
    if (!window.confirm(`Revoke API token "${t.name}"? Applications using this token will stop working.`)) return;
    try {
      const res = await fetch(`${apiBase}/api/settings/api-tokens/${t.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTokens(prev => prev.filter(x => x.id !== t.id));
        showToast('success', `Token "${t.name}" revoked`);
      }
    } catch (err) {
      showToast('error', 'Failed to revoke token');
    }
  };

  const handleCopyToken = () => {
    if (!revealedToken) return;
    navigator.clipboard.writeText(revealedToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
          <h2 className="settings-page-title">Apps & Developer Integrations</h2>
          <p className="settings-page-subtitle">
            Manage REST API Personal Access Tokens, Webhooks, Google Sheets live sync, and automated IoT sensor connections.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-btn-secondary" onClick={fetchTokens} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="settings-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Generate New Token</span>
          </button>
        </div>
      </div>

      {/* Connected Apps Banner Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="settings-card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#ecfdf5',
            color: '#064f32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Table size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>Google Sheets Live Sync</h4>
            <p style={{ margin: '4px 0 10px', fontSize: '0.8125rem', color: '#64748b' }}>
              Automatically stream harvest logs, crop yield projections, and weekly sales orders to your spreadsheets.
            </p>
            <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>Ready to Link</span>
          </div>
        </div>

        <div className="settings-card" style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CloudRain size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>Farm Weather & Microclimate</h4>
            <p style={{ margin: '4px 0 10px', fontSize: '0.8125rem', color: '#64748b' }}>
              Connect Davis WeatherLink, Tempest, or OpenWeather APIs to adjust irrigation schedules automatically.
            </p>
            <span className="settings-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>Supported</span>
          </div>
        </div>
      </div>

      {/* Tokens Table Card */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div>
            <h3 className="settings-card-title">Personal API Access Tokens</h3>
            <p className="settings-card-subtitle">Bearer tokens for programmatic integration with custom scripts and ERP systems</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
            <p>Loading API tokens...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="settings-empty-state">
            <Key size={40} className="empty-icon" />
            <div className="empty-title">No API tokens generated</div>
            <div className="empty-desc">Create a personal access token to connect external apps, Python scripts, or Zapier.</div>
            <button className="settings-btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Generate First Token
            </button>
          </div>
        ) : (
          <div className="settings-table-wrapper">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Token Name</th>
                  <th>Key Prefix</th>
                  <th>Permissions / Scopes</th>
                  <th>Created Date</th>
                  <th>Expires</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{t.name}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                        {t.token_prefix || 'vivas_pat_...'}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {Array.isArray(t.scopes) && t.scopes.map(s => (
                          <span key={s} className="settings-badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.7rem' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {t.expires_at ? new Date(t.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="settings-btn-danger"
                        style={{ padding: '6px 10px' }}
                        onClick={() => handleRevokeToken(t)}
                        title="Revoke Token"
                      >
                        <Trash2 size={14} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Generate Token */}
      {showModal && (
        <div className="settings-modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Generate API Token</h3>
              <button className="settings-modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateToken}>
              <div className="settings-modal-body">
                <div className="settings-form-group">
                  <label className="settings-form-label">Token Name <span className="settings-required-star">*</span></label>
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={e => setNewTokenName(e.target.value)}
                    className="settings-form-control"
                    placeholder="e.g., Python Sync Script, Zapier Integration"
                    required
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Expiration Window</label>
                  <select
                    value={expiresInDays}
                    onChange={e => setExpiresInDays(e.target.value)}
                    className="settings-form-select"
                  >
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days (Recommended)</option>
                    <option value="365">1 Year</option>
                    <option value="0">Never Expires</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Access Scopes</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {Object.keys(scopes).map(key => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={scopes[key]}
                          onChange={e => setScopes({ ...scopes, [key]: e.target.checked })}
                        />
                        <span><code>{key}</code></span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="settings-modal-footer">
                <button type="button" className="settings-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="settings-btn-primary" disabled={saving}>
                  {saving ? 'Generating...' : 'Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reveal Generated Token */}
      {revealedToken && (
        <div className="settings-modal-backdrop" onClick={() => setRevealedToken(null)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">API Token Generated</h3>
              <button className="settings-modal-close" onClick={() => setRevealedToken(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="settings-modal-body">
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                padding: '12px 14px',
                borderRadius: '6px',
                color: '#92400e',
                fontSize: '0.85rem',
                marginBottom: '16px'
              }}>
                <strong>Make sure to copy your personal access token now.</strong> You won't be able to see it again!
              </div>

              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1'
              }}>
                <code style={{ fontSize: '0.9rem', wordBreak: 'break-all', color: '#064f32', fontWeight: 600 }}>
                  {revealedToken}
                </code>
                <button
                  type="button"
                  className="settings-btn-primary"
                  style={{ padding: '8px 12px', flexShrink: 0 }}
                  onClick={handleCopyToken}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div className="settings-modal-footer">
              <button className="settings-btn-primary" onClick={() => setRevealedToken(null)}>
                I Have Copied My Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
