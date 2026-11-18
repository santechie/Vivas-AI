import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, Trash2, Printer, RefreshCw, CheckCircle2, AlertCircle,
  X, QrCode, Eye, Check
} from 'lucide-react';

export default function LabelManagementSettings({ apiBase, farmId }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurpose, setSelectedPurpose] = useState('All');
  const [toast, setToast] = useState(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'thermal_roll', // 'thermal_roll' | 'sheet'
    dimensions: '4x6 in',
    purpose: 'Harvest Bin',
    fields_included: {
      crop_name: true,
      variety: true,
      planting_id: true,
      harvest_date: true,
      qr_code: true,
      organic_seal: true,
      weight_count: false
    }
  });
  const [saving, setSaving] = useState(false);

  const purposes = ['All', 'Harvest Bin', 'Retail Clamshell', 'Packing Crate', 'Seedling Tray'];

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/labels?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || data.labels || data.data || []);
      }
    } catch (err) {
      showToast('error', 'Failed to load label templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [farmId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTemplate.name.trim()) {
      showToast('error', 'Template name is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          ...newTemplate
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Label template created');
        setShowModal(false);
        fetchTemplates();
      } else {
        showToast('error', data.error || 'Failed to create template');
      }
    } catch (err) {
      showToast('error', 'Error creating label template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete label template "${t.name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/settings/labels/${t.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setTemplates(prev => prev.filter(x => x.id !== t.id));
        showToast('success', `Template "${t.name}" removed`);
      }
    } catch (err) {
      showToast('error', 'Failed to remove template');
    }
  };

  const filtered = templates.filter(t =>
    selectedPurpose === 'All' ? true : t.purpose === selectedPurpose
  );

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
          <h2 className="settings-page-title">Label & Barcode Management</h2>
          <p className="settings-page-subtitle">
            Create printable harvest tote tags, retail packaging barcodes, and seedling flat labels compatible with Zebra, Dymo, and Avery sheets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-btn-secondary" onClick={fetchTemplates} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="settings-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>New Label Template</span>
          </button>
        </div>
      </div>

      {/* Purpose Filter Pills */}
      <div className="settings-card" style={{ marginBottom: '16px', padding: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {purposes.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPurpose(p)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: selectedPurpose === p ? '#064f32' : '#ffffff',
                borderColor: selectedPurpose === p ? '#064f32' : '#e2e8f0',
                color: selectedPurpose === p ? '#ffffff' : '#475569'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="settings-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
          <p>Loading label templates...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="settings-card">
          <div className="settings-empty-state">
            <Tag size={40} className="empty-icon" />
            <div className="empty-title">No label templates found</div>
            <div className="empty-desc">Create your first printable barcode or crate label template.</div>
            <button className="settings-btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create Template
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map(t => (
            <div key={t.id} className="settings-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className="settings-badge" style={{ backgroundColor: '#ecfdf5', color: '#064f32' }}>
                    {t.purpose || 'General'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    {t.dimensions}
                  </span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 6px' }}>
                  {t.name}
                </h4>
                <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '14px' }}>
                  Type: {t.type === 'thermal_roll' ? 'Thermal Direct (Zebra/Dymo)' : 'Avery Sheet'}
                </div>

                {/* Visual Label Snippet */}
                <div style={{
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>VIVAS ORGANIC</div>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>Crop: Tomato • Roma</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Lot: PL-TOM-ROM-26-001</div>
                  </div>
                  <QrCode size={36} style={{ color: '#064f32' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  className="settings-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
                  onClick={() => setPreviewItem(t)}
                >
                  <Eye size={14} /> Preview
                </button>
                <button
                  className="settings-btn-danger"
                  style={{ padding: '6px 10px' }}
                  onClick={() => handleDelete(t)}
                  title="Delete Template"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Template */}
      {showModal && (
        <div className="settings-modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">New Label Template</h3>
              <button className="settings-modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="settings-modal-body">
                <div className="settings-form-group">
                  <label className="settings-form-label">Template Name <span className="settings-required-star">*</span></label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="settings-form-control"
                    placeholder="e.g., Standard 4x6 Field Harvest Tag"
                    required
                  />
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label className="settings-form-label">Purpose</label>
                    <select
                      value={newTemplate.purpose}
                      onChange={e => setNewTemplate({ ...newTemplate, purpose: e.target.value })}
                      className="settings-form-select"
                    >
                      {purposes.filter(p => p !== 'All').map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-form-group">
                    <label className="settings-form-label">Print Medium</label>
                    <select
                      value={newTemplate.type}
                      onChange={e => setNewTemplate({ ...newTemplate, type: e.target.value })}
                      className="settings-form-select"
                    >
                      <option value="thermal_roll">Thermal Roll (Zebra / Rollo / Dymo)</option>
                      <option value="sheet">Laser / Inkjet Sheet (Avery)</option>
                    </select>
                  </div>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Dimensions</label>
                  <select
                    value={newTemplate.dimensions}
                    onChange={e => setNewTemplate({ ...newTemplate, dimensions: e.target.value })}
                    className="settings-form-select"
                  >
                    <option value="4x6 in">4" x 6" (Standard Shipping / Tote Tag)</option>
                    <option value="3x2 in">3" x 2" (Clamshell / Package Sticker)</option>
                    <option value="2x1 in">2" x 1" (Seedling Flat Marker)</option>
                    <option value="Avery 5160">Avery 5160 (1" x 2-5/8", 30 per sheet)</option>
                    <option value="Avery 5163">Avery 5163 (2" x 4", 10 per sheet)</option>
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Fields to Include on Label</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {Object.keys(newTemplate.fields_included).map(key => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={newTemplate.fields_included[key]}
                          onChange={e => setNewTemplate({
                            ...newTemplate,
                            fields_included: { ...newTemplate.fields_included, [key]: e.target.checked }
                          })}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
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
                  {saving ? 'Creating...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview */}
      {previewItem && (
        <div className="settings-modal-backdrop" onClick={() => setPreviewItem(null)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Label Preview: {previewItem.name}</h3>
              <button className="settings-modal-close" onClick={() => setPreviewItem(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="settings-modal-body" style={{ padding: '30px' }}>
              <div style={{
                background: '#ffffff',
                border: '2px solid #000000',
                padding: '24px',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                textAlign: 'left'
              }}>
                <div style={{ borderBottom: '2px solid #000000', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>VIVAS FARMS</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{previewItem.dimensions}</div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#064f32' }}>HEIRLOOM TOMATO</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Cherokee Purple • Grade A</div>
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#475569' }}>
                  Harvest Date: <strong>{new Date().toISOString().split('T')[0]}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Batch ID: <strong>PL-TOM-CHE-26-004</strong>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>CERTIFIED ORGANIC</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>NET WT: 5.0 KG</div>
                  </div>
                  <QrCode size={48} />
                </div>
              </div>
            </div>
            <div className="settings-modal-footer" style={{ justifyContent: 'center' }}>
              <button className="settings-btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print Test Sample
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
