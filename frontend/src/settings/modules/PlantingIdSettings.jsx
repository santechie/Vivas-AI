import React, { useState, useEffect } from 'react';
import {
  Tag, Save, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Hash, Eye
} from 'lucide-react';

export default function PlantingIdSettings({ apiBase, farmId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [config, setConfig] = useState({
    pattern_type: 'field_based', // 'auto_number' | 'field_based'
    prefix: 'PL',
    next_sequence_number: 1,
    zero_pad_digits: 3,
    delimiter: '-',
    include_crop_code: true,
    include_year: true,
    include_location: false
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/planting-id?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success && data.config) {
        setConfig({
          pattern_type: data.config.pattern_type || 'field_based',
          prefix: data.config.prefix || 'PL',
          next_sequence_number: data.config.next_sequence_number || 1,
          zero_pad_digits: data.config.zero_pad_digits || 3,
          delimiter: data.config.delimiter || '-',
          include_crop_code: data.config.include_crop_code !== false,
          include_year: data.config.include_year !== false,
          include_location: !!data.config.include_location
        });
      }
    } catch (err) {
      showToast('error', 'Failed to load planting ID configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [farmId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/planting-id`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          ...config
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Planting ID pattern saved successfully');
      } else {
        showToast('error', data.error || 'Failed to update planting ID pattern');
      }
    } catch (err) {
      showToast('error', 'Error updating configuration');
    } finally {
      setSaving(false);
    }
  };

  // Helper to compute sample ID
  const generatePreview = (crop, variety, location, seqOffset = 0) => {
    const seq = String(config.next_sequence_number + seqOffset).padStart(config.zero_pad_digits, '0');
    const d = config.delimiter;
    const year = new Date().getFullYear().toString().slice(-2);

    if (config.pattern_type === 'auto_number') {
      return config.prefix ? `${config.prefix}${d}${seq}` : seq;
    }

    // Field-based pattern
    const parts = [];
    if (config.prefix) parts.push(config.prefix);
    if (config.include_crop_code) parts.push(crop);
    if (variety) parts.push(variety);
    if (config.include_year) parts.push(year);
    if (config.include_location && location) parts.push(location);
    parts.push(seq);

    return parts.join(d);
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
          <h2 className="settings-page-title">Planting ID Configuration</h2>
          <p className="settings-page-subtitle">
            Configure automated batch and succession identifier formats generated during Crop Planning and Seeding.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-btn-secondary" onClick={fetchConfig} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="settings-btn-primary" onClick={handleSave} disabled={saving || loading}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="settings-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
          <p>Loading planting ID rules...</p>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Card: Pattern Selection */}
          <div className="settings-card" style={{ marginBottom: '20px' }}>
            <div className="settings-card-header">
              <h3 className="settings-card-title">Identification Schema</h3>
              <p className="settings-card-subtitle">Choose whether IDs follow sequential numbers or smart crop-based codes</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: `2px solid ${config.pattern_type === 'field_based' ? '#064f32' : '#e2e8f0'}`,
                  backgroundColor: config.pattern_type === 'field_based' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="pattern_type"
                  checked={config.pattern_type === 'field_based'}
                  onChange={() => setConfig({ ...config, pattern_type: 'field_based' })}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>Smart Field-Based Codes (Recommended)</div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
                    Combines crop abbreviation, variety, year, and sequence (e.g. <code>PL-TOM-ROM-26-001</code>). Easy to identify in field trays.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  borderRadius: '8px',
                  border: `2px solid ${config.pattern_type === 'auto_number' ? '#064f32' : '#e2e8f0'}`,
                  backgroundColor: config.pattern_type === 'auto_number' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="pattern_type"
                  checked={config.pattern_type === 'auto_number'}
                  onChange={() => setConfig({ ...config, pattern_type: 'auto_number' })}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>Sequential Auto-Number</div>
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
                    Simple numeric counter with optional prefix and padding (e.g. <code>PL-000101</code>).
                  </div>
                </div>
              </label>
            </div>

            {/* Pattern Settings Form */}
            <div className="settings-form-row">
              <div className="settings-form-group">
                <label className="settings-form-label">Static Prefix</label>
                <input
                  type="text"
                  value={config.prefix}
                  onChange={(e) => setConfig({ ...config, prefix: e.target.value.toUpperCase() })}
                  className="settings-form-control"
                  placeholder="e.g., PL, BATCH, CROP"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">Delimiter Character</label>
                <select
                  value={config.delimiter}
                  onChange={(e) => setConfig({ ...config, delimiter: e.target.value })}
                  className="settings-form-select"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value="_">Underscore (_)</option>
                  <option value="/">Slash (/)</option>
                  <option value=".">Period (.)</option>
                </select>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">Zero Padding Digits</label>
                <select
                  value={config.zero_pad_digits}
                  onChange={(e) => setConfig({ ...config, zero_pad_digits: parseInt(e.target.value) || 3 })}
                  className="settings-form-select"
                >
                  <option value="2">2 Digits (01)</option>
                  <option value="3">3 Digits (001)</option>
                  <option value="4">4 Digits (0001)</option>
                  <option value="5">5 Digits (00001)</option>
                </select>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">Next Sequence Counter</label>
                <input
                  type="number"
                  min="1"
                  value={config.next_sequence_number}
                  onChange={(e) => setConfig({ ...config, next_sequence_number: parseInt(e.target.value) || 1 })}
                  className="settings-form-control"
                />
              </div>
            </div>

            {config.pattern_type === 'field_based' && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={config.include_crop_code}
                    onChange={(e) => setConfig({ ...config, include_crop_code: e.target.checked })}
                  />
                  <span>Include Crop Code (e.g., TOM, LET, CAR)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={config.include_year}
                    onChange={(e) => setConfig({ ...config, include_year: e.target.checked })}
                  />
                  <span>Include 2-Digit Planting Year (e.g., 26)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={config.include_location}
                    onChange={(e) => setConfig({ ...config, include_location: e.target.checked })}
                  />
                  <span>Include Target Bed / Tunnel Code</span>
                </label>
              </div>
            )}
          </div>

          {/* Live Preview Card */}
          <div className="settings-card" style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1' }}>
            <div className="settings-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} style={{ color: '#064f32' }} />
                <h3 className="settings-card-title">Live Generated ID Previews</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Tomato (Roma) - Bed A1</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#064f32', fontFamily: 'monospace' }}>
                  {generatePreview('TOM', 'ROM', 'BEDA1', 0)}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Butterhead Lettuce - High Tunnel</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#064f32', fontFamily: 'monospace' }}>
                  {generatePreview('LET', 'BUT', 'HT1', 1)}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Baby Spinach - Greenhouse 2</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#064f32', fontFamily: 'monospace' }}>
                  {generatePreview('SPN', 'BAB', 'GH2', 2)}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
