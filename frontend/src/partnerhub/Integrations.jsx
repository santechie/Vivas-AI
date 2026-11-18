import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Webhook, FileCode2, ShieldCheck, Plus, Copy, CheckCircle2,
  XCircle, Send, AlertTriangle, RefreshCw, Lock, Terminal
} from 'lucide-react';
import { pihRequest } from './pihApi';
import DataSharingConsent from './DataSharingConsent';

const ALL_SCOPES = [
  { id: 'catalog:read', label: 'catalog:read (Read Products & SKUs)' },
  { id: 'catalog:write', label: 'catalog:write (Update Price, Stock & Specs)' },
  { id: 'orders', label: 'orders (Read & Fulfil Store Orders)' },
  { id: 'insights:read', label: 'insights:read (FPS Ratings, AI Insights & District Aggregates)' }
];

const ALL_EVENTS = [
  'order.created',
  'order.cancelled',
  'review.created',
  'rating.updated',
  'inference.published',
  'licence.expiring',
  'demand.alert'
];

export default function Integrations({ activePartnerId }) {
  const [activeSubTab, setActiveSubTab] = useState('api-keys');
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(
    activePartnerId || localStorage.getItem('pih_active_partner_id') || ''
  );

  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('SAP / ERP Production Sync Key');
  const [selectedScopes, setSelectedScopes] = useState(['catalog:read', 'catalog:write', 'orders', 'insights:read']);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState([]);
  const [newEndpointUrl, setNewEndpointUrl] = useState('https://erp.partner-agri.in/webhooks/vivas');
  const [selectedEvents, setSelectedEvents] = useState(['order.created', 'rating.updated', 'inference.published']);
  const [lastDispatchResult, setLastDispatchResult] = useState(null);

  // OpenAPI 3.1 Spec state
  const [openApiSpec, setOpenApiSpec] = useState(null);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  const loadPartners = useCallback(async () => {
    try {
      const res = await pihRequest('/partners');
      const list = res.data || res.partners || [];
      setPartners(list);
      if (list.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading partners:', err);
    }
  }, [selectedPartnerId]);

  const loadIntegrationData = useCallback(async (partnerId) => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const [keysRes, whRes, docsRes] = await Promise.all([
        pihRequest(`/api-keys?partner_id=${partnerId}`),
        pihRequest(`/webhooks?partner_id=${partnerId}`),
        pihRequest('/v1/docs').catch(() => null)
      ]);
      setApiKeys(keysRes.data || []);
      setWebhooks(whRes.data || []);
      if (docsRes) setOpenApiSpec(docsRes);
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    if (selectedPartnerId) {
      loadIntegrationData(selectedPartnerId);
    }
  }, [selectedPartnerId, loadIntegrationData]);

  const handleToggleScope = (scopeId) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleToggleEvent = (ev) => {
    setSelectedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await pihRequest('/api-keys', {
        method: 'POST',
        body: {
          partner_id: selectedPartnerId,
          key_name: newKeyName,
          scopes: selectedScopes
        }
      });
      setNewlyCreatedKey(res.data);
      setCopiedKey(false);
      setFeedback({ type: 'success', text: res.message });
      await loadIntegrationData(selectedPartnerId);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleRevokeApiKey = async (keyId) => {
    try {
      const res = await pihRequest(`/api-keys/${keyId}/revoke`, {
        method: 'POST',
        body: {}
      });
      setFeedback({ type: 'success', text: res.message });
      await loadIntegrationData(selectedPartnerId);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await pihRequest('/webhooks', {
        method: 'POST',
        body: {
          partner_id: selectedPartnerId,
          endpoint_url: newEndpointUrl,
          events: selectedEvents
        }
      });
      setFeedback({ type: 'success', text: res.message });
      await loadIntegrationData(selectedPartnerId);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleTestWebhook = async (webhookId, simulateFailure = false) => {
    setFeedback(null);
    try {
      const res = await pihRequest(`/webhooks/${webhookId}/test`, {
        method: 'POST',
        body: {
          event: 'rating.updated',
          simulate_failure: simulateFailure,
          attempt: 1
        }
      });
      setLastDispatchResult(res.data);
      setFeedback({
        type: simulateFailure ? 'warning' : 'success',
        text: res.message
      });
      await loadIntegrationData(selectedPartnerId);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleCopyKey = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(true);
    }
  };

  return (
    <div className="pih-page">
      {/* Header */}
      <div className="pih-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="pih-page-title">External Partner API v1, Webhooks &amp; DPDP Consent</h2>
            <span className="pih-badge pih-badge-green">
              <Lock size={12} /> SHA-256 Keys • HMAC-SHA256 Webhooks • OpenAPI 3.1
            </span>
          </div>
          <p className="pih-page-subtitle">
            Manage `/api/pih/v1` REST API credentials (120 req/min rate limit), signed event webhooks with exponential back-off, and DPDP Act 2023 farm data-sharing consents
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            className="pih-select"
            style={{ minWidth: 240, fontWeight: 600 }}
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand_name || p.legal_name} ({p.partner_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          className={`pih-btn ${activeSubTab === 'api-keys' ? 'pih-btn-primary' : 'pih-btn-secondary'}`}
          onClick={() => setActiveSubTab('api-keys')}
        >
          <Key size={15} /> API Keys ({apiKeys.filter((k) => !k.is_revoked).length} Active)
        </button>
        <button
          className={`pih-btn ${activeSubTab === 'webhooks' ? 'pih-btn-primary' : 'pih-btn-secondary'}`}
          onClick={() => setActiveSubTab('webhooks')}
        >
          <Webhook size={15} /> HMAC Webhooks &amp; Deliveries ({webhooks.length})
        </button>
        <button
          className={`pih-btn ${activeSubTab === 'openapi' ? 'pih-btn-primary' : 'pih-btn-secondary'}`}
          onClick={() => setActiveSubTab('openapi')}
        >
          <FileCode2 size={15} /> OpenAPI 3.1 Spec (/api/pih/v1/docs)
        </button>
        <button
          className={`pih-btn ${activeSubTab === 'consent' ? 'pih-btn-primary' : 'pih-btn-secondary'}`}
          onClick={() => setActiveSubTab('consent')}
        >
          <ShieldCheck size={15} /> DPDP Farm Data-Sharing Consent
        </button>
      </div>

      {feedback && (
        <div
          className="pih-card"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderLeft: `4px solid ${
              feedback.type === 'error' ? '#dc2626' : feedback.type === 'warning' ? '#d97706' : '#059669'
            }`,
            background:
              feedback.type === 'error' ? '#fef2f2' : feedback.type === 'warning' ? '#fffbeb' : '#ecfdf5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{feedback.text}</span>
          <button className="pih-btn pih-btn-sm pih-btn-secondary" onClick={() => setFeedback(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: API KEYS */}
      {activeSubTab === 'api-keys' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.45fr', gap: 18, alignItems: 'start' }}>
          {/* Generate New API Key Form */}
          <form className="pih-card" onSubmit={handleCreateApiKey}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Generate New Partner API Key
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>
              Keys are hashed with SHA-256 at rest in <code>pih_api_keys</code> and rate-limited to 120 requests/min.
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Key Label / Environment
              </label>
              <input
                type="text"
                className="pih-input"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Granted API Scopes
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ALL_SCOPES.map((sc) => (
                  <label
                    key={sc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12.5,
                      padding: '6px 10px',
                      background: '#f8fafc',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(sc.id)}
                      onChange={() => handleToggleScope(sc.id)}
                    />
                    <span>{sc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="pih-btn pih-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={15} /> Generate SHA-256 API Key
            </button>

            {/* One-Time Secret Display */}
            {newlyCreatedKey && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: '#0f172a',
                  color: '#f8fafc',
                  borderRadius: 8
                }}
              >
                <div style={{ fontSize: 11.5, color: '#fbbf24', fontWeight: 700, marginBottom: 6 }}>
                  SAVE THIS SECRET KEY NOW — SHOWN ONLY ONCE:
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    wordBreak: 'break-all',
                    background: '#1e293b',
                    padding: 8,
                    borderRadius: 6,
                    marginBottom: 8
                  }}
                >
                  {newlyCreatedKey.api_key}
                </div>
                <button
                  type="button"
                  className="pih-btn pih-btn-sm pih-btn-secondary"
                  onClick={() => handleCopyKey(newlyCreatedKey.api_key)}
                >
                  <Copy size={12} /> {copiedKey ? 'Copied to Clipboard!' : 'Copy Secret Key'}
                </button>
              </div>
            )}
          </form>

          {/* Existing API Keys Table */}
          <div className="pih-card">
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Partner API Keys Ledger
            </h3>

            <div className="pih-table-wrap">
              <table className="pih-table">
                <thead>
                  <tr>
                    <th>Name &amp; Preview</th>
                    <th>Scopes</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                        No API keys generated for this partner yet.
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((k) => (
                      <tr key={k.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{k.key_name}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#64748b' }}>
                            {k.key_preview}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {(k.scopes || []).map((s) => (
                              <span key={s} className="pih-badge pih-badge-blue" style={{ fontSize: 10.5 }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {k.expires_at ? new Date(k.expires_at).toLocaleDateString('en-IN') : 'Never'}
                        </td>
                        <td>
                          {k.is_revoked ? (
                            <span className="pih-badge pih-badge-gray">
                              <XCircle size={11} /> Revoked
                            </span>
                          ) : (
                            <span className="pih-badge pih-badge-green">
                              <CheckCircle2 size={11} /> Active
                            </span>
                          )}
                        </td>
                        <td>
                          {!k.is_revoked && (
                            <button
                              className="pih-btn pih-btn-sm pih-btn-secondary"
                              style={{ color: '#dc2626' }}
                              onClick={() => handleRevokeApiKey(k.id)}
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOKS & DELIVERIES */}
      {activeSubTab === 'webhooks' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.45fr', gap: 18, alignItems: 'start' }}>
          {/* Register Webhook Form */}
          <form className="pih-card" onSubmit={handleCreateWebhook}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Register HMAC-SHA256 Webhook Endpoint
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b' }}>
              Every payload is signed with <code>X-Vivas-Signature: sha256=&lt;HMAC&gt;</code>. Failed deliveries retry at <strong>1m, 5m, 30m, 2h, and 12h</strong>.
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                HTTPS Endpoint URL
              </label>
              <input
                type="url"
                className="pih-input"
                value={newEndpointUrl}
                onChange={(e) => setNewEndpointUrl(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Subscribed Events
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {ALL_EVENTS.map((ev) => (
                  <label
                    key={ev}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      padding: '5px 8px',
                      background: '#f8fafc',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(ev)}
                      onChange={() => handleToggleEvent(ev)}
                    />
                    <span style={{ fontFamily: 'monospace' }}>{ev}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="pih-btn pih-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Plus size={15} /> Register Webhook Endpoint
            </button>

            {lastDispatchResult && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontFamily: 'monospace'
                }}
              >
                <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: 4 }}>
                  Last Webhook Signature Verification:
                </div>
                <div style={{ wordBreak: 'break-all' }}>
                  X-Vivas-Signature: {lastDispatchResult.signature}
                </div>
                <div>
                  Status: {lastDispatchResult.delivery?.status} (HTTP {lastDispatchResult.delivery?.response_code})
                </div>
                {lastDispatchResult.delivery?.next_retry_at && (
                  <div style={{ color: '#fbbf24' }}>
                    Next Retry At: {lastDispatchResult.delivery.next_retry_at}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Registered Webhooks & Delivery Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {webhooks.length === 0 ? (
              <div className="pih-card" style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                No webhooks registered for this partner yet.
              </div>
            ) : (
              webhooks.map((wh) => (
                <div key={wh.id} className="pih-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', wordBreak: 'break-all' }}>
                        {wh.endpoint_url}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
                        Signing Secret: {wh.secret}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        className="pih-btn pih-btn-sm pih-btn-primary"
                        onClick={() => handleTestWebhook(wh.id, false)}
                      >
                        <Send size={12} /> Send Test Event
                      </button>
                      <button
                        className="pih-btn pih-btn-sm pih-btn-secondary"
                        onClick={() => handleTestWebhook(wh.id, true)}
                      >
                        <AlertTriangle size={12} /> Simulate 503 Retry
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {(wh.events || []).map((ev) => (
                      <span key={ev} className="pih-badge pih-badge-blue" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {ev}
                      </span>
                    ))}
                  </div>

                  {/* Delivery Log Table */}
                  <div className="pih-table-wrap">
                    <table className="pih-table">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Attempt</th>
                          <th>HTTP Code</th>
                          <th>Status</th>
                          <th>Next Retry (Back-Off)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(wh.deliveries || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: 12, fontSize: 12 }}>
                              No deliveries triggered yet. Click "Send Test Event".
                            </td>
                          </tr>
                        ) : (
                          wh.deliveries.map((del) => (
                            <tr key={del.id}>
                              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{del.event}</td>
                              <td>#{del.attempt}</td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{del.response_code}</td>
                              <td>
                                <span
                                  className={`pih-badge ${
                                    del.status === 'delivered'
                                      ? 'pih-badge-green'
                                      : del.status === 'pending'
                                      ? 'pih-badge-amber'
                                      : 'pih-badge-gray'
                                  }`}
                                >
                                  {del.status}
                                </span>
                              </td>
                              <td style={{ fontSize: 11.5 }}>
                                {del.next_retry_at
                                  ? new Date(del.next_retry_at).toISOString().replace('T', ' ').slice(0, 19)
                                  : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OPENAPI 3.1 SPECIFICATION */}
      {activeSubTab === 'openapi' && (
        <div className="pih-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={18} color="#2563eb" /> OpenAPI 3.1.0 Specification — <code>GET /api/pih/v1/docs</code>
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Public machine-readable specification for Partner ERP &amp; Inventory connectors
              </p>
            </div>
            <span className="pih-badge pih-badge-green">OpenAPI {openApiSpec?.openapi || '3.1.0'}</span>
          </div>

          <pre
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              padding: 16,
              borderRadius: 10,
              fontSize: 12,
              overflowX: 'auto',
              maxHeight: 500
            }}
          >
            {JSON.stringify(openApiSpec, null, 2)}
          </pre>
        </div>
      )}

      {/* TAB 4: DPDP FARM DATA-SHARING CONSENT */}
      {activeSubTab === 'consent' && <DataSharingConsent embedded={true} />}
    </div>
  );
}
