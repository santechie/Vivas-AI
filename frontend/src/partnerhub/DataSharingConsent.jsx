import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Lock, CheckCircle2, XCircle, RefreshCw, AlertTriangle, FileText
} from 'lucide-react';
import { pihRequest } from './pihApi';

export default function DataSharingConsent({ embedded = false }) {
  const [consentData, setConsentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingScope, setUpdatingScope] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadConsents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pihRequest('/consents');
      setConsentData(res.data || null);
    } catch (err) {
      console.error('Error loading consents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  const handleToggleConsent = async (scope, currentlyGranted) => {
    setUpdatingScope(scope);
    setStatusMsg(null);
    try {
      const action = currentlyGranted ? 'withdraw' : 'grant';
      const res = await pihRequest('/consents', {
        method: 'PUT',
        body: { scope, action }
      });
      setStatusMsg({
        type: action === 'grant' ? 'success' : 'warning',
        text: res.message
      });
      await loadConsents();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setUpdatingScope(null);
    }
  };

  const activeScopes = consentData?.active_scopes || {
    anonymised_outcomes: true,
    trials: true
  };
  const history = consentData?.history || [];

  return (
    <div className={embedded ? '' : 'pih-page'}>
      {!embedded && (
        <div className="pih-page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="pih-page-title">Farm Data-Sharing &amp; Privacy Consent (DPDP Act 2023)</h2>
              <span className="pih-badge pih-badge-green">
                <Lock size={12} /> k ≥ 5 District Anonymisation
              </span>
            </div>
            <p className="pih-page-subtitle">
              Control how your farm's anonymised field treatment outcomes and split-plot trial data contribute to Vivas AI Bayesian ratings
            </p>
          </div>
        </div>
      )}

      {statusMsg && (
        <div
          className="pih-card"
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderLeft: `4px solid ${
              statusMsg.type === 'error' ? '#dc2626' : statusMsg.type === 'warning' ? '#d97706' : '#059669'
            }`,
            background:
              statusMsg.type === 'error' ? '#fef2f2' : statusMsg.type === 'warning' ? '#fffbeb' : '#ecfdf5'
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{statusMsg.text}</span>
        </div>
      )}

      {/* Plain-Language DPDP Privacy Guarantee Card */}
      <div className="pih-card" style={{ marginBottom: 18, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <ShieldCheck size={24} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#065f46' }}>
              Vivas AI Zero-PII &amp; k-Anonymity Guarantee (Hard Rule 6 &amp; India DPDP Act 2023)
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: '#166534', lineHeight: 1.55 }}>
              {consentData?.dpdp_notice ||
                'Manufacturers never see your farmer name, phone number, or exact GPS coordinates. Your field outcomes are only included in district-level aggregates when at least 5 consented farms exist in your district. Withdrawing consent immediately excludes your farm from all Bayesian Field Performance Score (FPS) and AI inference calculations.'}
            </p>
          </div>
        </div>
      </div>

      {/* Consent Scope Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Scope 1: Anonymised Field Outcomes */}
        <div className="pih-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                1. Anonymised Field Outcome Telemetry
              </h4>
              <span style={{ fontSize: 11.5, color: '#64748b', fontFamily: 'monospace' }}>
                Scope: anonymised_outcomes
              </span>
            </div>
            {activeScopes.anonymised_outcomes ? (
              <span className="pih-badge pih-badge-green">
                <CheckCircle2 size={12} /> Consent Active
              </span>
            ) : (
              <span className="pih-badge pih-badge-amber">
                <XCircle size={12} /> Consent Withdrawn
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 14 }}>
            Allows your verified post-treatment severity reduction and yield uplift metrics to be included in district-level aggregates (minimum 5 consented farms per district) to compute honest Bayesian FPS ratings for fellow farmers.
          </p>

          <button
            className={`pih-btn ${activeScopes.anonymised_outcomes ? 'pih-btn-secondary' : 'pih-btn-primary'}`}
            style={activeScopes.anonymised_outcomes ? { color: '#dc2626', borderColor: '#fecaca' } : {}}
            disabled={updatingScope === 'anonymised_outcomes' || loading}
            onClick={() => handleToggleConsent('anonymised_outcomes', activeScopes.anonymised_outcomes)}
          >
            <RefreshCw size={14} className={updatingScope === 'anonymised_outcomes' ? 'spin' : ''} />
            {activeScopes.anonymised_outcomes
              ? 'Withdraw Consent & Recompute Aggregates'
              : 'Grant Anonymised Outcome Consent'}
          </button>
        </div>

        {/* Scope 2: Structured Field Trials */}
        <div className="pih-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                2. Split-Plot Agronomic Field Trials
              </h4>
              <span style={{ fontSize: 11.5, color: '#64748b', fontFamily: 'monospace' }}>
                Scope: trials
              </span>
            </div>
            {activeScopes.trials ? (
              <span className="pih-badge pih-badge-green">
                <CheckCircle2 size={12} /> Consent Active
              </span>
            ) : (
              <span className="pih-badge pih-badge-amber">
                <XCircle size={12} /> Consent Withdrawn
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 14 }}>
            Allows Vivas Agronomy SMEs to invite your farm to participate in sponsored Treated vs. Control split-plot trials and share anonymised plot-level observations with the sponsoring manufacturer.
          </p>

          <button
            className={`pih-btn ${activeScopes.trials ? 'pih-btn-secondary' : 'pih-btn-primary'}`}
            style={activeScopes.trials ? { color: '#dc2626', borderColor: '#fecaca' } : {}}
            disabled={updatingScope === 'trials' || loading}
            onClick={() => handleToggleConsent('trials', activeScopes.trials)}
          >
            <RefreshCw size={14} className={updatingScope === 'trials' ? 'spin' : ''} />
            {activeScopes.trials ? 'Withdraw Trial Participation Consent' : 'Grant Trial Participation Consent'}
          </button>
        </div>
      </div>

      {/* Immutable Consent Ledger */}
      <div className="pih-card">
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="#2563eb" /> DPDP Consent Grant &amp; Withdrawal Audit History
        </h3>

        <div className="pih-table-wrap">
          <table className="pih-table">
            <thead>
              <tr>
                <th>Scope</th>
                <th>Farm</th>
                <th>Actor</th>
                <th>Granted At (UTC)</th>
                <th>Withdrawn At (UTC)</th>
                <th>Current State</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>
                    No consent events recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{row.scope}</td>
                    <td>{row.farm_name || 'Active Farm'} ({row.district || 'Karnataka'})</td>
                    <td>{row.granted_by_name || 'Farm Owner'}</td>
                    <td style={{ fontSize: 12 }}>
                      {row.granted_at ? new Date(row.granted_at).toISOString().replace('T', ' ').slice(0, 19) : '—'}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {row.withdrawn_at ? new Date(row.withdrawn_at).toISOString().replace('T', ' ').slice(0, 19) : '—'}
                    </td>
                    <td>
                      {row.withdrawn_at ? (
                        <span className="pih-badge pih-badge-amber">Withdrawn</span>
                      ) : (
                        <span className="pih-badge pih-badge-green">Active</span>
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
  );
}
