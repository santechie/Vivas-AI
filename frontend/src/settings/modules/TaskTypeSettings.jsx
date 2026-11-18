import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Search, Filter, AlertCircle, CheckCircle2,
  RefreshCw, Check, X, Tag, Sparkles
} from 'lucide-react';

export default function TaskTypeSettings({ apiBase, farmId }) {
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [toast, setToast] = useState(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [activeItem, setActiveItem] = useState({
    id: null,
    name: '',
    abbreviation: '',
    category: 'Field Prep',
    color_bg: '#10b981',
    color_text: '#ffffff',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [categories, setCategories] = useState([
    'All',
    'Administration',
    'Crop Maintenance',
    'Equipment & Tools',
    'Field Prep',
    'Harvesting',
    'Infrastructure & Soil',
    'Planting & Sowing',
    'Post-Harvest & Packing'
  ]);

  const presetColors = [
    { bg: '#064f32', text: '#ffffff', label: 'Forest Green' },
    { bg: '#10b981', text: '#ffffff', label: 'Emerald' },
    { bg: '#0284c7', text: '#ffffff', label: 'Sky Blue' },
    { bg: '#6366f1', text: '#ffffff', label: 'Indigo' },
    { bg: '#8b5cf6', text: '#ffffff', label: 'Purple' },
    { bg: '#d97706', text: '#ffffff', label: 'Amber' },
    { bg: '#ea580c', text: '#ffffff', label: 'Orange' },
    { bg: '#dc2626', text: '#ffffff', label: 'Rose Red' },
    { bg: '#475569', text: '#ffffff', label: 'Slate' },
    { bg: '#0d9488', text: '#ffffff', label: 'Teal' }
  ];

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTaskTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/task-types?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        setTaskTypes(data.taskTypes || data.data || []);
        if (data.categories && data.categories.length > 0) {
          setCategories(['All', ...data.categories]);
        }
      } else {
        showToast('error', data.error || 'Failed to load task types');
      }
    } catch (err) {
      showToast('error', 'Network error connecting to settings backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskTypes();
  }, [farmId]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setActiveItem({
      id: null,
      name: '',
      abbreviation: '',
      category: selectedCategory === 'All' ? (categories[1] || 'Field Prep') : selectedCategory,
      color_bg: '#10b981',
      color_text: '#ffffff',
      is_active: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setModalMode('edit');
    setActiveItem({
      ...item,
      color_bg: item.bg_color || item.color_bg || '#10b981',
      color_text: item.text_color || item.color_text || '#ffffff'
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!activeItem.name || !activeItem.name.trim()) {
      errs.name = 'Task type name is required';
    } else if (activeItem.name.trim().length > 60) {
      errs.name = 'Name cannot exceed 60 characters';
    }
    if (!activeItem.category) {
      errs.category = 'Category is required';
    }
    if (activeItem.abbreviation && activeItem.abbreviation.length > 8) {
      errs.abbreviation = 'Abbreviation cannot exceed 8 characters';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const url = modalMode === 'create'
        ? `${apiBase}/api/settings/task-types`
        : `${apiBase}/api/settings/task-types/${activeItem.id}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const payload = {
        farm_id: farmId,
        name: activeItem.name.trim(),
        abbreviation: activeItem.abbreviation ? activeItem.abbreviation.trim().toUpperCase() : '',
        category: activeItem.category,
        bg_color: activeItem.color_bg || '#10b981',
        color_bg: activeItem.color_bg || '#10b981',
        text_color: activeItem.color_text || '#ffffff',
        color_text: activeItem.color_text || '#ffffff',
        is_active: activeItem.is_active !== false
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showToast('success', modalMode === 'create' ? 'Task type created successfully' : 'Task type updated');
        setShowModal(false);
        fetchTaskTypes();
      } else {
        showToast('error', data.error || 'Failed to save task type');
      }
    } catch (err) {
      showToast('error', 'Error submitting task type');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const res = await fetch(`${apiBase}/api/settings/task-types/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active })
      });
      const data = await res.json();
      if (data.success) {
        setTaskTypes(prev => prev.map(t => t.id === item.id ? { ...t, is_active: !t.is_active } : t));
        showToast('success', `"${item.name}" ${!item.is_active ? 'enabled' : 'disabled'}`);
      } else {
        showToast('error', data.error || 'Failed to toggle status');
      }
    } catch (err) {
      showToast('error', 'Network error updating status');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete task type "${item.name}"?`)) return;

    try {
      const res = await fetch(`${apiBase}/api/settings/task-types/${item.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setTaskTypes(prev => prev.filter(t => t.id !== item.id));
        showToast('success', `Task type "${item.name}" removed`);
      } else {
        showToast('error', data.error || 'Cannot delete this task type');
      }
    } catch (err) {
      showToast('error', 'Error deleting task type');
    }
  };

  // Filter task types
  const filteredTypes = taskTypes.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.abbreviation && t.abbreviation.toLowerCase().includes(search.toLowerCase())) ||
      (t.category && t.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="settings-module-container">
      {/* Toast */}
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="settings-page-header">
        <div>
          <h2 className="settings-page-title">Task Type Management</h2>
          <p className="settings-page-subtitle">
            Configure custom task categories, activity colors, abbreviations, and operational workflow statuses used across Crop Planning, Labor, and Scheduling.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-btn-secondary" onClick={fetchTaskTypes} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="settings-btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>Add Task Type</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="settings-card" style={{ marginBottom: '16px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Category Pill Filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  backgroundColor: selectedCategory === cat ? '#064f32' : '#ffffff',
                  borderColor: selectedCategory === cat ? '#064f32' : '#e2e8f0',
                  color: selectedCategory === cat ? '#ffffff' : '#475569'
                }}
              >
                {cat}
                {cat !== 'All' && (
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '0.725rem',
                    opacity: selectedCategory === cat ? 0.9 : 0.6
                  }}>
                    ({taskTypes.filter(t => t.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search task types or codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="settings-form-control"
              style={{ paddingLeft: '32px' }}
            />
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="settings-card">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
            <p>Loading task types...</p>
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="settings-empty-state">
            <Tag size={40} className="empty-icon" />
            <div className="empty-title">No task types found</div>
            <div className="empty-desc">
              {search || selectedCategory !== 'All'
                ? 'Try adjusting your search criteria or category filter.'
                : 'Get started by creating your first task type for farm activities.'}
            </div>
            <button className="settings-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Add First Task Type
            </button>
          </div>
        ) : (
          <div className="settings-table-wrapper">
            <table className="settings-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Badge</th>
                  <th>Task Name</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Display Colors</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTypes.map(item => {
                  const itemBg = item.bg_color || item.color_bg || '#10b981';
                  const itemText = item.text_color || item.color_text || '#ffffff';
                  return (
                    <tr key={item.id}>
                      <td>
                        <span
                          className="settings-badge"
                          style={{
                            backgroundColor: itemBg,
                            color: itemText,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            padding: '4px 8px'
                          }}
                        >
                          {item.abbreviation || item.name.substring(0, 2).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                        {item.is_system_default && (
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>System Default</span>
                        )}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.abbreviation || '—'}
                        </code>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8125rem',
                          color: '#334155'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#064f32' }} />
                          {item.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: itemBg
                            }}
                            title={`BG: ${itemBg}`}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {itemBg}
                          </span>
                        </div>
                      </td>
                    <td>
                      <label className="settings-switch">
                        <input
                          type="checkbox"
                          checked={item.is_active}
                          onChange={() => handleToggleActive(item)}
                        />
                        <span className="settings-slider" />
                      </label>
                      <span style={{ marginLeft: '8px', fontSize: '0.8125rem', color: item.is_active ? '#064f32' : '#94a3b8' }}>
                        {item.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="settings-btn-secondary"
                          style={{ padding: '6px' }}
                          title="Edit Task Type"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="settings-btn-danger"
                          style={{ padding: '6px' }}
                          title="Delete Task Type"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create / Edit */}
      {showModal && (
        <div className="settings-modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">
                {modalMode === 'create' ? 'Create New Task Type' : 'Edit Task Type'}
              </h3>
              <button
                className="settings-modal-close"
                onClick={() => !saving && setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="settings-modal-body">
                {/* Name */}
                <div className="settings-form-group">
                  <label className="settings-form-label">
                    Task Name <span className="settings-required-star">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Bed Preparation, Direct Seeding"
                    value={activeItem.name}
                    onChange={(e) => setActiveItem({ ...activeItem, name: e.target.value })}
                    className={`settings-form-control ${formErrors.name ? 'has-error' : ''}`}
                    autoFocus
                  />
                  {formErrors.name && (
                    <div className="settings-form-error">{formErrors.name}</div>
                  )}
                </div>

                {/* Abbreviation and Category row */}
                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label className="settings-form-label">Abbreviation / Code</label>
                    <input
                      type="text"
                      placeholder="e.g., BP, DS, HV"
                      maxLength={8}
                      value={activeItem.abbreviation}
                      onChange={(e) => setActiveItem({ ...activeItem, abbreviation: e.target.value.toUpperCase() })}
                      className="settings-form-control"
                    />
                    <div className="settings-form-help">Max 8 letters for calendar chips</div>
                  </div>

                  <div className="settings-form-group">
                    <label className="settings-form-label">
                      Category <span className="settings-required-star">*</span>
                    </label>
                    <select
                      value={activeItem.category}
                      onChange={(e) => setActiveItem({ ...activeItem, category: e.target.value })}
                      className="settings-form-select"
                    >
                      {categories.filter(c => c !== 'All').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color Scheme Picker */}
                <div className="settings-form-group">
                  <label className="settings-form-label">Color Theme</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {presetColors.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveItem({ ...activeItem, color_bg: c.bg, color_text: c.text })}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          backgroundColor: c.bg,
                          border: activeItem.color_bg === c.bg ? '3px solid #0f172a' : '1px solid #cbd5e1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: c.text,
                          transition: 'transform 0.1s ease'
                        }}
                        title={c.label}
                      >
                        {activeItem.color_bg === c.bg && <Check size={16} />}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Hex Code</label>
                      <input
                        type="color"
                        value={activeItem.color_bg}
                        onChange={(e) => setActiveItem({ ...activeItem, color_bg: e.target.value })}
                        style={{ width: '48px', height: '36px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Live Badge Preview</label>
                      <div style={{ marginTop: '4px' }}>
                        <span
                          className="settings-badge"
                          style={{
                            backgroundColor: activeItem.color_bg,
                            color: activeItem.color_text,
                            padding: '6px 14px',
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}
                        >
                          {activeItem.abbreviation || (activeItem.name ? activeItem.name.substring(0, 3).toUpperCase() : 'PREVIEW')}
                          {' — '}
                          {activeItem.name || 'Sample Task'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Switch */}
                <div className="settings-form-group" style={{ marginTop: '12px' }}>
                  <label className="settings-checkbox-card">
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={activeItem.is_active}
                        onChange={(e) => setActiveItem({ ...activeItem, is_active: e.target.checked })}
                      />
                      <span className="settings-slider" />
                    </label>
                    <div className="checkbox-info">
                      <div className="checkbox-title">Enable this task type for scheduling</div>
                      <div className="checkbox-desc">
                        Active task types will appear in Crop Planning, Task Manager, and Labor logs.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="settings-modal-footer">
                <button
                  type="button"
                  className="settings-btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="spinning" />
                      Saving...
                    </>
                  ) : modalMode === 'create' ? (
                    'Create Task Type'
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
