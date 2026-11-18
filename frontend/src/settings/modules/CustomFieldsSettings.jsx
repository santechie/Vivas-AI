import React, { useState, useEffect } from 'react';
import {
  Database, Plus, Trash2, Edit2, Search, RefreshCw, CheckCircle2,
  AlertCircle, X, Check, Layers, ListFilter
} from 'lucide-react';

export default function CustomFieldsSettings({ apiBase, farmId }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState('All');
  const [toast, setToast] = useState(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [newField, setNewField] = useState({
    target_entity: 'plantings',
    field_name: '',
    field_type: 'text', // 'text' | 'number' | 'dropdown' | 'date' | 'boolean'
    field_options: '',
    is_required: false,
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  const entities = [
    { id: 'All', label: 'All Entities' },
    { id: 'plantings', label: 'Plantings & Crops' },
    { id: 'tasks', label: 'Tasks & Crew' },
    { id: 'harvest', label: 'Harvest Logs' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'orders', label: 'Sales Orders' },
    { id: 'materials', label: 'Inputs & Materials' }
  ];

  const fieldTypes = [
    { id: 'text', label: 'Short Text' },
    { id: 'number', label: 'Numeric Number' },
    { id: 'dropdown', label: 'Dropdown Select' },
    { id: 'date', label: 'Date Picker' },
    { id: 'boolean', label: 'Checkbox (Yes / No)' }
  ];

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchFields = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/custom-fields?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        setFields(data.fields || data.data || []);
      }
    } catch (err) {
      showToast('error', 'Failed to load custom data fields');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, [farmId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newField.field_name.trim()) {
      showToast('error', 'Field name is required');
      return;
    }

    let parsedOptions = [];
    if (newField.field_type === 'dropdown' && newField.field_options) {
      parsedOptions = newField.field_options.split(',').map(s => s.trim()).filter(Boolean);
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/custom-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          target_entity: newField.target_entity,
          field_name: newField.field_name.trim(),
          field_type: newField.field_type,
          field_options: parsedOptions,
          is_required: !!newField.is_required,
          is_active: true
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `Custom field "${newField.field_name}" added`);
        setShowModal(false);
        setNewField({
          target_entity: 'plantings',
          field_name: '',
          field_type: 'text',
          field_options: '',
          is_required: false,
          is_active: true
        });
        fetchFields();
      } else {
        showToast('error', data.error || 'Failed to create field');
      }
    } catch (err) {
      showToast('error', 'Error creating custom field');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Delete custom field "${f.field_name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/settings/custom-fields/${f.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFields(prev => prev.filter(x => x.id !== f.id));
        showToast('success', `Field "${f.field_name}" removed`);
      }
    } catch (err) {
      showToast('error', 'Failed to remove custom field');
    }
  };

  const filtered = fields.filter(f =>
    selectedEntity === 'All' ? true : f.target_entity === selectedEntity
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
          <h2 className="settings-page-title">Custom Data Fields</h2>
          <p className="settings-page-subtitle">
            Extend default farm entities with bespoke tracking attributes like Brix sweetness, organic seed certificates, moisture readings, and quality grades.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-btn-secondary" onClick={fetchFields} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="settings-btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Add Custom Field</span>
          </button>
        </div>
      </div>

      {/* Entity Filters */}
      <div className="settings-card" style={{ marginBottom: '16px', padding: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {entities.map(e => (
            <button
              key={e.id}
              onClick={() => setSelectedEntity(e.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.8125rem',
                fontWeight: 500,
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: selectedEntity === e.id ? '#064f32' : '#ffffff',
                borderColor: selectedEntity === e.id ? '#064f32' : '#e2e8f0',
                color: selectedEntity === e.id ? '#ffffff' : '#475569'
              }}
            >
              {e.label}
              {e.id !== 'All' && (
                <span style={{ marginLeft: '6px', fontSize: '0.725rem', opacity: 0.8 }}>
                  ({fields.filter(x => x.target_entity === e.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="settings-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
          <p>Loading custom fields...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="settings-card">
          <div className="settings-empty-state">
            <Database size={40} className="empty-icon" />
            <div className="empty-title">No custom fields created</div>
            <div className="empty-desc">
              Add custom fields to record organic certificates, quality grading, or harvest observations.
            </div>
            <button className="settings-btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add First Custom Field
            </button>
          </div>
        </div>
      ) : (
        <div className="settings-card">
          <div className="settings-table-wrapper">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Applies To</th>
                  <th>Data Type</th>
                  <th>Validation / Options</th>
                  <th>Mandatory</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{f.field_name}</div>
                    </td>
                    <td>
                      <span className="settings-badge" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                        {entities.find(e => e.id === f.target_entity)?.label || f.target_entity}
                      </span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', color: '#475569', fontSize: '0.85rem' }}>
                        {f.field_type}
                      </span>
                    </td>
                    <td>
                      {f.field_type === 'dropdown' && f.field_options ? (
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Choices: {Array.isArray(f.field_options) ? f.field_options.join(', ') : f.field_options}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Standard input</span>
                      )}
                    </td>
                    <td>
                      {f.is_required ? (
                        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.8rem' }}>Required</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Optional</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="settings-btn-danger"
                        style={{ padding: '6px 10px' }}
                        onClick={() => handleDelete(f)}
                        title="Delete Field"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Custom Field */}
      {showModal && (
        <div className="settings-modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Add Custom Field</h3>
              <button className="settings-modal-close" onClick={() => !saving && setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="settings-modal-body">
                <div className="settings-form-group">
                  <label className="settings-form-label">Target Entity <span className="settings-required-star">*</span></label>
                  <select
                    value={newField.target_entity}
                    onChange={e => setNewField({ ...newField, target_entity: e.target.value })}
                    className="settings-form-select"
                  >
                    {entities.filter(e => e.id !== 'All').map(e => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Field Label / Name <span className="settings-required-star">*</span></label>
                  <input
                    type="text"
                    value={newField.field_name}
                    onChange={e => setNewField({ ...newField, field_name: e.target.value })}
                    className="settings-form-control"
                    placeholder="e.g., Target Brix, Organic Certificate No."
                    required
                  />
                </div>

                <div className="settings-form-group">
                  <label className="settings-form-label">Data Type</label>
                  <select
                    value={newField.field_type}
                    onChange={e => setNewField({ ...newField, field_type: e.target.value })}
                    className="settings-form-select"
                  >
                    {fieldTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {newField.field_type === 'dropdown' && (
                  <div className="settings-form-group">
                    <label className="settings-form-label">Dropdown Options (Comma separated)</label>
                    <input
                      type="text"
                      value={newField.field_options}
                      onChange={e => setNewField({ ...newField, field_options: e.target.value })}
                      className="settings-form-control"
                      placeholder="e.g., Grade A, Grade B, Processing Only"
                    />
                  </div>
                )}

                <div className="settings-form-group">
                  <label className="settings-checkbox-card">
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={newField.is_required}
                        onChange={e => setNewField({ ...newField, is_required: e.target.checked })}
                      />
                      <span className="settings-slider" />
                    </label>
                    <div className="checkbox-info">
                      <div className="checkbox-title">Mandatory Field</div>
                      <div className="checkbox-desc">Users must fill this field before submitting records</div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="settings-modal-footer">
                <button type="button" className="settings-btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="settings-btn-primary" disabled={saving}>
                  {saving ? 'Adding...' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
