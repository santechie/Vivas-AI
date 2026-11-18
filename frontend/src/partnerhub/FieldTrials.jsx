import React, { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  BarChart3
} from 'lucide-react';
import { pihRequest } from './pihApi';

export default function FieldTrials({ activeRole = 'partner_admin' }) {
  const [trials, setTrials] = useState([]);
  const [partners, setPartners] = useState([]);
  const [products, setProducts] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [showNewModal, setShowNewModal] = useState(false);
  const [newTrial, setNewTrial] = useState({
    partner_id: '',
    product_id: '',
    crop_id: '',
    treated_area: 1.5,
    control_area: 1.5,
    start_date: new Date().toISOString().slice(0, 10),
    protocol:
      'Randomized split-plot design: Treated block receives standard label foliar dose at Day 0 & Day 14; Control block receives standard farm regime.'
  });

  const [obsModalTrial, setObsModalTrial] = useState(null);
  const [obsForm, setObsForm] = useState({
    plot: 'treated',
    metric: 'Canopy Greenness & Vigour Index (0-100)',
    value: 88,
    unit: 'score'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [trRes, prtRes, prdRes, crpRes] = await Promise.all([
        pihRequest(`/trials?role=${activeRole}`),
        pihRequest('/partners'),
        pihRequest('/products?status=live&limit=50'),
        pihRequest('/reference/crops')
      ]);
      setTrials(trRes.data || []);
      const prts = prtRes.data || [];
      const prds = prdRes.data || [];
      const crps = crpRes.data || [];
      setPartners(prts);
      setProducts(prds);
      setCrops(crps);
      if (prts.length > 0 && !newTrial.partner_id) {
        setNewTrial((prev) => ({
          ...prev,
          partner_id: prts[0].id,
          product_id: prds[0]?.id || '',
          crop_id: crps[0]?.id || ''
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeRole, newTrial.partner_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTrial = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await pihRequest('/trials', {
        method: 'POST',
        body: newTrial
      });
      setToast(res.message);
      setTimeout(() => setToast(''), 3500);
      setShowNewModal(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (trialId, status) => {
    try {
      setError('');
      const res = await pihRequest(`/trials/${trialId}/status`, {
        method: 'PUT',
        body: { status }
      });
      setToast(res.message);
      setTimeout(() => setToast(''), 3500);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddObservation = async (e) => {
    e.preventDefault();
    if (!obsModalTrial) return;
    try {
      setError('');
      const res = await pihRequest(`/trials/${obsModalTrial.id}/observations`, {
        method: 'POST',
        body: obsForm
      });
      setToast(res.message);
      setTimeout(() => setToast(''), 3500);
      setObsModalTrial(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="pih-stat-grid">
        <div className="pih-stat-card">
          <div className="pih-stat-label">Structured Field Trials</div>
          <div className="pih-stat-value">{trials.length}</div>
          <div className="pih-stat-sub">Treated vs Control Split-Plot Protocol</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Running / Completed</div>
          <div className="pih-stat-value">
            {trials.filter((t) => ['running', 'completed'].includes(t.status)).length}
          </div>
          <div className="pih-stat-sub">SME-Approved Agronomy Trials</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Logged Plot Observations</div>
          <div className="pih-stat-value">
            {trials.reduce((acc, t) => acc + (t.observations?.length || 0), 0)}
          </div>
          <div className="pih-stat-sub">Side-by-Side Treated vs Control Metrics</div>
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

      <div className="pih-filter-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, color: '#0f172a' }}>
          Split-Plot Agronomy Field Trials (`pih_field_trials` &amp; `pih_trial_observations`)
        </div>
        <button
          type="button"
          className="pih-btn pih-btn-primary"
          onClick={() => setShowNewModal(!showNewModal)}
        >
          <Plus size={15} />
          {showNewModal ? 'Close Proposal Form' : 'Propose New Split-Plot Field Trial'}
        </button>
      </div>

      {showNewModal && (
        <div className="pih-card" style={{ border: '2px solid #006647' }}>
          <h3 className="pih-card-title" style={{ marginBottom: 12 }}>
            Propose Treated vs Control Split-Plot Trial
          </h3>
          <form onSubmit={handleCreateTrial}>
            <div className="pih-form-grid">
              <div className="pih-form-group">
                <label>Partner Manufacturer</label>
                <select
                  className="pih-select"
                  value={newTrial.partner_id}
                  onChange={(e) => setNewTrial({ ...newTrial, partner_id: e.target.value })}
                  required
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pih-form-group">
                <label>Product Under Trial</label>
                <select
                  className="pih-select"
                  value={newTrial.product_id}
                  onChange={(e) => setNewTrial({ ...newTrial, product_id: e.target.value })}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pih-form-group">
                <label>Target Crop</label>
                <select
                  className="pih-select"
                  value={newTrial.crop_id}
                  onChange={(e) => setNewTrial({ ...newTrial, crop_id: e.target.value })}
                  required
                >
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pih-form-group">
                <label>Treated Plot Area (Acres)</label>
                <input
                  type="number"
                  step="0.5"
                  className="pih-input"
                  value={newTrial.treated_area}
                  onChange={(e) => setNewTrial({ ...newTrial, treated_area: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="pih-form-group">
                <label>Control Plot Area (Acres)</label>
                <input
                  type="number"
                  step="0.5"
                  className="pih-input"
                  value={newTrial.control_area}
                  onChange={(e) => setNewTrial({ ...newTrial, control_area: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="pih-form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  className="pih-input"
                  value={newTrial.start_date}
                  onChange={(e) => setNewTrial({ ...newTrial, start_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="pih-form-group" style={{ marginTop: 10, marginBottom: 12 }}>
              <label>Agronomy Trial Protocol</label>
              <textarea
                className="pih-textarea"
                rows={2}
                value={newTrial.protocol}
                onChange={(e) => setNewTrial({ ...newTrial, protocol: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="pih-btn pih-btn-primary">
              <FlaskConical size={15} /> Submit Field Trial Proposal
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>Loading field trials...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {trials.map((tr) => {
            const treatedObs = (tr.observations || []).filter((o) => o.plot === 'treated');
            const controlObs = (tr.observations || []).filter((o) => o.plot === 'control');
            return (
              <div key={tr.id} className="pih-card">
                <div className="pih-card-header">
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="pih-badge pih-badge-approved">{tr.status.toUpperCase()}</span>
                      <span style={{ fontSize: '0.8rem', color: '#006647', fontWeight: 700 }}>
                        {tr.partner_brand} • {tr.crop_name}
                      </span>
                    </div>
                    <h4 style={{ margin: '4px 0', fontSize: '1.05rem', fontWeight: 800 }}>
                      {tr.product_name} — Split-Plot Trial ({tr.treated_area} ac Treated vs {tr.control_area} ac Control)
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>{tr.protocol}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tr.status === 'proposed' && (
                      <button
                        type="button"
                        className="pih-btn pih-btn-secondary pih-btn-sm"
                        onClick={() => handleStatusChange(tr.id, 'accepted')}
                      >
                        Farmer Accept
                      </button>
                    )}
                    {(tr.status === 'proposed' || tr.status === 'accepted') && (
                      <button
                        type="button"
                        className="pih-btn pih-btn-secondary pih-btn-sm"
                        onClick={() => handleStatusChange(tr.id, 'sme_approved')}
                      >
                        SME Approve
                      </button>
                    )}
                    {tr.status === 'sme_approved' && (
                      <button
                        type="button"
                        className="pih-btn pih-btn-primary pih-btn-sm"
                        onClick={() => handleStatusChange(tr.id, 'running')}
                      >
                        Start Trial
                      </button>
                    )}
                    {tr.status === 'running' && (
                      <button
                        type="button"
                        className="pih-btn pih-btn-primary pih-btn-sm"
                        onClick={() => handleStatusChange(tr.id, 'completed')}
                      >
                        Mark Completed
                      </button>
                    )}
                    <button
                      type="button"
                      className="pih-btn pih-btn-secondary pih-btn-sm"
                      onClick={() => setObsModalTrial(tr)}
                    >
                      <ClipboardList size={14} /> Log Plot Observation
                    </button>
                  </div>
                </div>

                {/* Treated vs Control Comparison */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 12,
                    marginTop: 10
                  }}
                >
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 8,
                      padding: 12
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#14532d', fontSize: '0.84rem', marginBottom: 6 }}>
                      Treated Plot Observations ({treatedObs.length})
                    </div>
                    {treatedObs.map((o) => (
                      <div key={o.id} style={{ fontSize: '0.8rem', color: '#166534', marginBottom: 3 }}>
                        • {String(o.observed_on).slice(0, 10)} — {o.metric}:{' '}
                        <strong>
                          {o.value} {o.unit}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: 12
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.84rem', marginBottom: 6 }}>
                      Control Plot Observations ({controlObs.length})
                    </div>
                    {controlObs.map((o) => (
                      <div key={o.id} style={{ fontSize: '0.8rem', color: '#475569', marginBottom: 3 }}>
                        • {String(o.observed_on).slice(0, 10)} — {o.metric}:{' '}
                        <strong>
                          {o.value} {o.unit}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Observation Modal */}
      {obsModalTrial && (
        <div className="pih-drawer-backdrop" onClick={() => setObsModalTrial(null)}>
          <div
            className="pih-drawer"
            style={{ maxWidth: '460px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pih-drawer-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                Log Observation: {obsModalTrial.product_name}
              </h3>
              <button
                className="pih-btn pih-btn-secondary pih-btn-sm"
                onClick={() => setObsModalTrial(null)}
              >
                ✕
              </button>
            </div>
            <div className="pih-drawer-body">
              <form onSubmit={handleAddObservation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="pih-form-group">
                  <label>Plot Block</label>
                  <select
                    className="pih-select"
                    value={obsForm.plot}
                    onChange={(e) => setObsForm({ ...obsForm, plot: e.target.value })}
                  >
                    <option value="treated">Treated Plot (Product Applied)</option>
                    <option value="control">Control Plot (Baseline Practice)</option>
                  </select>
                </div>
                <div className="pih-form-group">
                  <label>Agronomic Metric</label>
                  <input
                    className="pih-input"
                    value={obsForm.metric}
                    onChange={(e) => setObsForm({ ...obsForm, metric: e.target.value })}
                    required
                  />
                </div>
                <div className="pih-form-group">
                  <label>Measured Value</label>
                  <input
                    type="number"
                    step="0.1"
                    className="pih-input"
                    value={obsForm.value}
                    onChange={(e) => setObsForm({ ...obsForm, value: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="pih-form-group">
                  <label>Unit</label>
                  <input
                    className="pih-input"
                    value={obsForm.unit}
                    onChange={(e) => setObsForm({ ...obsForm, unit: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="pih-btn pih-btn-primary">
                  Save Plot Observation
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
