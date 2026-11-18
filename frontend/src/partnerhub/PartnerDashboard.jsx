import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Award, TrendingUp, Package, ShoppingCart,
  MapPin, FileCheck, RefreshCw, Star, AlertTriangle, CheckCircle2, Lock
} from 'lucide-react';
import { pihRequest, formatINR } from './pihApi';

export default function PartnerDashboard({ activePartnerId, onNavigate }) {
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(
    activePartnerId || localStorage.getItem('pih_active_partner_id') || ''
  );
  const [summary, setSummary] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

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

  const loadDashboard = useCallback(async (partnerId) => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const [sumRes, lbRes] = await Promise.all([
        pihRequest(`/partner-dashboard/summary?partner_id=${partnerId}`),
        pihRequest(`/ratings/leaderboard?partner_id=${partnerId}`)
      ]);
      setSummary(sumRes.data || sumRes);
      setLeaderboard(lbRes.data || lbRes.leaderboard || []);
    } catch (err) {
      console.error('Error loading partner dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    if (selectedPartnerId) {
      loadDashboard(selectedPartnerId);
    }
  }, [selectedPartnerId, loadDashboard]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await pihRequest('/insights/recompute', {
        method: 'POST',
        body: { partner_id: selectedPartnerId }
      });
      await loadDashboard(selectedPartnerId);
    } catch (err) {
      console.error('Error recomputing insights:', err);
    } finally {
      setRecomputing(false);
    }
  };

  const renderBadge = (badge, verifiedCount) => {
    if (badge === 'field_proven') {
      return (
        <span className="pih-badge pih-badge-green">
          <Award size={12} /> Field-Proven ({verifiedCount})
        </span>
      );
    }
    if (badge === 'rising') {
      return (
        <span className="pih-badge pih-badge-blue">
          <TrendingUp size={12} /> Rising ({verifiedCount})
        </span>
      );
    }
    if (badge === 'needs_data') {
      return (
        <span className="pih-badge pih-badge-amber">
          <AlertTriangle size={12} /> Preliminary (n={verifiedCount}/10)
        </span>
      );
    }
    return <span className="pih-badge pih-badge-gray">Standard ({verifiedCount})</span>;
  };

  const kpis = summary?.kpis || {};
  const districts = summary?.district_aggregates || [];
  const licences = summary?.licences || [];
  const avgFps5 = Number(kpis.avg_fps_5 ?? kpis.avg_fps ?? 0);
  const avgFps100 = Number(kpis.avg_fps_100 ?? Math.round(avgFps5 * 20));
  const fieldProvenCount = leaderboard.filter((i) => i.badge === 'field_proven').length;

  return (
    <div className="pih-page">
      {/* Header */}
      <div className="pih-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="pih-page-title">Manufacturer Partner Executive Dashboard</h2>
            <span className="pih-badge pih-badge-green">
              <Lock size={12} /> Privacy-Preserving (k ≥ 5 Farms)
            </span>
          </div>
          <p className="pih-page-subtitle">
            Live commercial GMV, Bayesian Field Performance Score (FPS), anonymised district telemetry, and regulatory compliance
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="pih-select"
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
            style={{ minWidth: 240, fontWeight: 600 }}
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand_name || p.legal_name} ({p.partner_code})
              </option>
            ))}
          </select>

          <button
            className="pih-btn pih-btn-secondary"
            onClick={handleRecompute}
            disabled={recomputing || !selectedPartnerId}
          >
            <RefreshCw size={15} className={recomputing ? 'spin' : ''} />
            {recomputing ? 'Recomputing AI & FPS...' : 'Recompute FPS & AI'}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="pih-stat-grid" style={{ marginBottom: 20 }}>
        <div className="pih-stat-card">
          <div className="pih-stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Award size={22} />
          </div>
          <div>
            <div className="pih-stat-label">Avg Bayesian FPS</div>
            <div className="pih-stat-value">
              {avgFps5.toFixed(2)} <span style={{ fontSize: 13, color: '#64748b' }}>/ 5.00</span>
            </div>
            <div className="pih-stat-sub">
              {avgFps100} / 100 Index • {fieldProvenCount} Field-Proven SKUs
            </div>
          </div>
        </div>

        <div className="pih-stat-card">
          <div className="pih-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="pih-stat-label">Verified Field Outcomes</div>
            <div className="pih-stat-value">{kpis.total_verified_outcomes ?? kpis.verified_outcomes ?? 0}</div>
            <div className="pih-stat-sub">
              Consented farm field outcome telemetry
            </div>
          </div>
        </div>

        <div className="pih-stat-card">
          <div className="pih-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <div className="pih-stat-label">Store Gross GMV</div>
            <div className="pih-stat-value">{formatINR(kpis.gross_gmv || 0)}</div>
            <div className="pih-stat-sub">
              {kpis.total_orders || 0} farmer store orders ({kpis.fulfilled_orders || 0} fulfilled)
            </div>
          </div>
        </div>

        <div className="pih-stat-card">
          <div className="pih-stat-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
            <Package size={22} />
          </div>
          <div>
            <div className="pih-stat-label">Live Approved Products</div>
            <div className="pih-stat-value">
              {kpis.live_products || 0} <span style={{ fontSize: 13, color: '#64748b' }}>/ {kpis.total_products || 0}</span>
            </div>
            <div className="pih-stat-sub">
              {licences.length} active regulatory licences
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="pih-card" style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Loading partner executive telemetry...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 18, alignItems: 'start' }}>
          {/* Left Column: Product FPS Leaderboard */}
          <div className="pih-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Product Bayesian Field Performance Leaderboard
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                  Shrinkage estimator (m = 10, C = 3.90) combining efficacy, severity reduction, yield uplift & ratings
                </p>
              </div>
              {onNavigate && (
                <button
                  className="pih-btn pih-btn-secondary"
                  style={{ fontSize: 12, padding: '6px 10px' }}
                  onClick={() => onNavigate('pih-insights')}
                >
                  Open AI Field Insights
                </button>
              )}
            </div>

            <div className="pih-table-wrap">
              <table className="pih-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Bayesian FPS</th>
                    <th>Efficacy</th>
                    <th>Yield Uplift</th>
                    <th>Status Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                        No rated products yet for this partner.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((item) => (
                      <tr key={item.product_id || item.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.product_name || item.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {item.product_code} • {item.farm_count || 0} consented farms
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize', fontSize: 12 }}>
                          {(item.product_type || item.category || '').toLowerCase().replace(/_/g, ' ')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Star size={14} fill="#f59e0b" color="#f59e0b" />
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              {Number(item.fps || 0).toFixed(2)}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                              ({item.fps_100 ?? Math.round(Number(item.fps || 0) * 20)}/100)
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#059669' }}>
                            {Number(item.efficacy_rate || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#2563eb' }}>
                            +{Number(item.yield_uplift_pct || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td>{renderBadge(item.badge, item.verified_count || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Anonymised District Performance + Regulatory Licences */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Anonymised District Telemetry */}
            <div className="pih-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={16} color="#059669" /> Anonymised District Field Performance
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b' }}>
                    Hard Rule 6 enforced: Only districts with ≥ 5 consented farms are surfaced. Zero farmer PII.
                  </p>
                </div>
              </div>

              {districts.length === 0 ? (
                <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8, fontSize: 12.5, color: '#64748b' }}>
                  No district currently meets the minimum k-anonymity threshold of 5 consented farms for this partner.
                </div>
              ) : (
                <div className="pih-table-wrap">
                  <table className="pih-table">
                    <thead>
                      <tr>
                        <th>District / State</th>
                        <th>Consented Farms</th>
                        <th>Outcomes</th>
                        <th>Efficacy</th>
                        <th>Avg Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {districts.map((d, idx) => (
                        <tr key={`${d.state}-${d.district}-${idx}`}>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{d.district}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{d.state}</div>
                          </td>
                          <td>
                            <span className="pih-badge pih-badge-green">
                              {d.consented_farm_count ?? d.consented_farms} farms
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{d.outcome_count}</td>
                          <td style={{ color: '#059669', fontWeight: 600 }}>
                            {d.avg_efficacy_pct ?? d.efficacy_pct}%
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>★ {Number(d.avg_rating || 0).toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Regulatory Licences */}
            <div className="pih-card">
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileCheck size={16} color="#2563eb" /> Regulatory Licences (FCO / CIB&RC / Seed Act)
              </h3>

              <div className="pih-table-wrap">
                <table className="pih-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Licence Number</th>
                      <th>Valid Until</th>
                      <th>SME Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licences.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 16 }}>
                          No licence records uploaded.
                        </td>
                      </tr>
                    ) : (
                      licences.map((lic, idx) => (
                        <tr key={lic.id || idx}>
                          <td style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11.5 }}>
                            {lic.doc_type}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{lic.doc_number}</td>
                          <td style={{ fontSize: 12 }}>
                            {lic.expires_on ? new Date(lic.expires_on).toLocaleDateString('en-IN') : 'Perpetual'}
                          </td>
                          <td>
                            <span
                              className={`pih-badge ${
                                lic.review_status === 'approved' ? 'pih-badge-green' : 'pih-badge-amber'
                              }`}
                            >
                              <ShieldCheck size={12} /> {lic.review_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
