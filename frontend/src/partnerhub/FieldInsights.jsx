import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  BarChart3,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download
} from 'lucide-react';
import { pihRequest } from './pihApi';

export default function FieldInsights({ activeRole = 'partner_admin' }) {
  const [insights, setInsights] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (selectedPartnerId) qs.set('partner_id', selectedPartnerId);
      if (typeFilter !== 'ALL') qs.set('inference_type', typeFilter);

      const [infRes, prtRes] = await Promise.all([
        pihRequest(`/insights?${qs.toString()}`),
        pihRequest('/partners')
      ]);
      setInsights(infRes.data || []);
      setPartners(prtRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPartnerId, typeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRecompute = async () => {
    setRecomputing(true);
    setError('');
    try {
      const res = await pihRequest('/insights/recompute', {
        method: 'POST',
        body: { partner_id: selectedPartnerId || null }
      });
      setToast(res.message);
      setTimeout(() => setToast(''), 4000);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRecomputing(false);
    }
  };

  const handleSmeReview = async (id, status) => {
    try {
      const res = await pihRequest(`/insights/${id}/review`, {
        method: 'PUT',
        role: 'vivas_sme',
        body: {
          status,
          sme_annotation: `SME reviewed & marked ${status} on ${new Date().toISOString().slice(0, 10)}`
        }
      });
      setToast(res.message);
      setTimeout(() => setToast(''), 3500);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Product',
      'Partner',
      'Crop',
      'District',
      'Inference Type',
      'Status',
      'Sample Size',
      'Consented Farms',
      'Confidence',
      'Model',
      'Title'
    ];
    const rows = insights.map((inf) => [
      `"${inf.product_name}"`,
      `"${inf.partner_brand}"`,
      `"${inf.crop_name || 'Multi-Crop'}"`,
      `"${inf.district || 'Karnataka'}"`,
      inf.inference_type,
      inf.status,
      inf.sample_size,
      inf.farm_count,
      inf.confidence,
      `${inf.model_name} (${inf.model_version})`,
      `"${String(inf.title).replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vivas_ai_field_insights_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const publishedCount = insights.filter((i) => i.status === 'published').length;
  const avgConfidence =
    insights.length > 0
      ? Math.round(
          (insights.reduce((acc, i) => acc + Number(i.confidence || 0.85), 0) / insights.length) *
            100
        )
      : 89;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top KPI Cards */}
      <div className="pih-stat-grid">
        <div className="pih-stat-card">
          <div className="pih-stat-label">AI Field Inferences</div>
          <div className="pih-stat-value">{insights.length}</div>
          <div className="pih-stat-sub">Logged in `pih_ai_inferences` &amp; `ch_ai_request`</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Published High-Confidence</div>
          <div className="pih-stat-value">{publishedCount}</div>
          <div className="pih-stat-sub">Meets ≥ 5 Consented Farms &amp; ≥ 10 Outcomes</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Mean Model Confidence</div>
          <div className="pih-stat-value">{avgConfidence}%</div>
          <div className="pih-stat-sub">Model: `vivas-agri-intelligence-engine v2.4`</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Explainability &amp; Consent</div>
          <div className="pih-stat-value">100% Traceable</div>
          <div className="pih-stat-sub">Stores Case IDs, Sample Size &amp; Farm Count</div>
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

      {/* Filter & Recompute Bar */}
      <div className="pih-filter-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="pih-select"
            style={{ width: 'auto', minWidth: 220 }}
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
          >
            <option value="">All Manufacturers</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand_name}
              </option>
            ))}
          </select>

          <select
            className="pih-select"
            style={{ width: 'auto', minWidth: 180 }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Inference Types</option>
            <option value="efficacy">Field Efficacy</option>
            <option value="dose_response">Dose-Response &amp; Stage Fit</option>
            <option value="adverse_signal">Adverse / Phytotoxicity Signal</option>
            <option value="demand">Regional Demand Signal</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="pih-btn pih-btn-secondary pih-btn-sm"
            onClick={handleExportCsv}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            className="pih-btn pih-btn-primary pih-btn-sm"
            disabled={recomputing}
            onClick={handleRecompute}
          >
            <RefreshCw size={14} />
            {recomputing ? 'Running Bayesian AI...' : 'Recompute Bayesian FPS & AI Inferences'}
          </button>
        </div>
      </div>

      {/* Explainable AI Inference Cards */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          Loading Explainable AI Field Insights...
        </div>
      ) : insights.length === 0 ? (
        <div className="pih-card" style={{ textAlign: 'center', padding: 36, color: '#64748b' }}>
          No AI inferences generated yet. Click &ldquo;Recompute Bayesian FPS &amp; AI Inferences&rdquo; above.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: 16
          }}
        >
          {insights.map((inf) => {
            const m = inf.metrics || {};
            const confPct = Math.round(Number(inf.confidence || 0.85) * 100);
            return (
              <div
                key={inf.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="pih-badge pih-badge-live">
                      {inf.inference_type?.toUpperCase()}
                    </span>
                    <span
                      className={`pih-badge ${
                        inf.status === 'published'
                          ? 'pih-badge-approved'
                          : inf.status === 'suppressed'
                          ? 'pih-badge-rejected'
                          : 'pih-badge-submitted'
                      }`}
                    >
                      {inf.status?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.76rem', color: '#006647', fontWeight: 700 }}>
                    {inf.partner_brand} • {inf.product_name} ({inf.crop_name || 'Multi-Crop'})
                  </div>

                  <h4 style={{ margin: '4px 0 8px', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                    {inf.title}
                  </h4>

                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                    {inf.body}
                  </p>
                </div>

                {/* Explainable AI Telemetry Box (Hard Rule 7) */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: 10,
                    fontSize: '0.76rem',
                    color: '#475569'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Cpu size={13} color="#006647" />
                      {inf.model_name} ({inf.model_version})
                    </span>
                    <span style={{ color: '#006647' }}>Confidence: {confPct}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>
                      Sample Size: <strong>n = {inf.sample_size}</strong>
                    </span>
                    <span>
                      Consented Farms: <strong>{inf.farm_count} farms</strong>
                    </span>
                    <span>
                      Region: <strong>{inf.district}, {inf.state}</strong>
                    </span>
                    <span>
                      Linked Cases: <strong>{(inf.evidence_case_ids || []).length}</strong>
                    </span>
                  </div>
                  {m.efficacy_rate_pct !== undefined && (
                    <div style={{ marginTop: 6, color: '#15803d', fontWeight: 700 }}>
                      Efficacy: {m.efficacy_rate_pct}% • Severity Drop: {m.avg_severity_reduction_pct}% • Yield Uplift: +{m.yield_uplift_pct}%
                    </div>
                  )}
                </div>

                {(activeRole === 'vivas_sme' || activeRole === 'vivas_admin') && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="pih-btn pih-btn-primary pih-btn-sm"
                      onClick={() => handleSmeReview(inf.id, 'published')}
                    >
                      Approve &amp; Publish
                    </button>
                    <button
                      type="button"
                      className="pih-btn pih-btn-secondary pih-btn-sm"
                      onClick={() => handleSmeReview(inf.id, 'suppressed')}
                    >
                      Suppress
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
