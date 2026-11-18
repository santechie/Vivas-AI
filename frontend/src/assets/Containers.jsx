import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Plus, Search, Filter, RefreshCw, Sparkles, X, Edit3, Trash2,
  Printer, Check, Layers, Barcode, Grid, Eye, CheckCircle2,
  AlertCircle, Copy, Sliders, ChevronDown
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function ContainersScreen() {
  const [containers, setContainers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All');
  const [serializedFilter, setSerializedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    abbreviation: '',
    types: ['Grow'],
    material: 'Heavy-Duty Polypropylene',
    brand: 'Bootstrap Farmer',
    color: 'Black',
    total_count: 100,
    is_serialized: false,
    barcode: '',
    storage_location: 'Greenhouse 1 - Nursery Bench A',
    shape: 'Flat Tray',
    top_diameter_cm: 54.0,
    bottom_diameter_cm: 28.0,
    height_cm: 6.0,
    volume_liters: 3.5,
    total_cells: 72,
    cell_configuration: '12x6 Grid',
    cell_shape: 'Square',
    status: 'active',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/containers?type=${typeFilter}&material=${materialFilter}&serialized=${serializedFilter}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`${API_BASE}/containers/stats`)
      ]);

      const cData = await cRes.json();
      const sData = await sRes.json();

      if (cData.success) setContainers(cData.data);
      if (sData.success) setStats(sData.data);
    } catch (err) {
      console.error('Error fetching containers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, materialFilter, serializedFilter, searchQuery]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Open Create Drawer
  const openCreateDrawer = () => {
    setEditingContainer(null);
    setForm({
      name: '',
      abbreviation: '',
      types: ['Grow'],
      material: 'Heavy-Duty Polypropylene',
      brand: 'Bootstrap Farmer',
      color: 'Black',
      total_count: 100,
      is_serialized: false,
      barcode: `CONT-${Date.now().toString().slice(-6)}`,
      storage_location: 'Greenhouse 1 - Nursery Bench A',
      shape: 'Flat Tray',
      top_diameter_cm: 54.0,
      bottom_diameter_cm: 28.0,
      height_cm: 6.0,
      volume_liters: 3.5,
      total_cells: 72,
      cell_configuration: '12x6 Grid',
      cell_shape: 'Square',
      status: 'active',
      notes: ''
    });
    setShowDrawer(true);
  };

  // Open Edit Drawer
  const openEditDrawer = (item) => {
    setEditingContainer(item);
    setForm({
      name: item.name || '',
      abbreviation: item.abbreviation || '',
      types: Array.isArray(item.types) ? item.types : (typeof item.types === 'string' ? JSON.parse(item.types || '[]') : ['Grow']),
      material: item.material || 'Heavy-Duty Polypropylene',
      brand: item.brand || 'Bootstrap Farmer',
      color: item.color || 'Black',
      total_count: item.total_count || 100,
      is_serialized: !!item.is_serialized,
      barcode: item.barcode || '',
      storage_location: item.storage_location || 'Main Storage',
      shape: item.shape || 'Flat Tray',
      top_diameter_cm: parseFloat(item.top_diameter_cm) || 0,
      bottom_diameter_cm: parseFloat(item.bottom_diameter_cm) || 0,
      height_cm: parseFloat(item.height_cm) || 0,
      volume_liters: parseFloat(item.volume_liters) || 0,
      total_cells: item.total_cells || 1,
      cell_configuration: item.cell_configuration || 'Single',
      cell_shape: item.cell_shape || 'Square',
      status: item.status || 'active',
      notes: item.notes || ''
    });
    setShowDrawer(true);
  };

  // Toggle Type in Form
  const handleToggleType = (t) => {
    const exists = form.types.includes(t);
    const updated = exists ? form.types.filter(x => x !== t) : [...form.types, t];
    setForm({ ...form, types: updated });
  };

  // Save / Update Container
  const handleSaveContainer = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter a container name');
      return;
    }

    try {
      setIsSaving(true);
      const url = editingContainer
        ? `${API_BASE}/containers/${editingContainer.id}`
        : `${API_BASE}/containers`;
      const method = editingContainer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingContainer ? 'Container updated' : 'New container registered');
        setShowDrawer(false);
        setEditingContainer(null);
        fetchData();
      }
    } catch (err) {
      console.error('Error saving container:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Container
  const handleDeleteContainer = async (id, name) => {
    if (!window.confirm(`Delete container '${name}'?`)) return;
    try {
      const res = await fetch(`${API_BASE}/containers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Container deleted');
        fetchData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    showToast(`Copied ${text} to clipboard`);
  };

  // Materials list for filter
  const materialOptions = [
    'All', 'Heavy-Duty Polypropylene', 'Recycled Polypropylene',
    'BPA-Free Food-Grade Plastic', 'High-Density Polyethylene',
    'UV-Stabilized HDPE', 'Injection Molded Plastic', 'Terracotta Clay'
  ];

  return (
    <div className="grow-page-container">
      {/* Toast Notification */}
      {notification && (
        <div className="grow-toast">
          <Sparkles size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="grow-header">
        <div className="grow-header-left">
          <div className="grow-badge" style={{ background: '#fef3c7', color: '#b45309' }}>ASSETS & INFRASTRUCTURE</div>
          <h1 className="grow-title">Containers & Trays</h1>
          <p className="grow-subtitle">Manage seedling flats, plug trays, harvest crates, lugs, and nursery pots with barcodes & cell tracking</p>
        </div>

        <div className="grow-header-right">
          <div className="season-kpi-badge" style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }}>
            <span className="kpi-label">TOTAL CELL CAPACITY</span>
            <span className="kpi-value">{stats ? Number(stats.total_cell_capacity).toLocaleString() : '0'}</span>
          </div>

          <button className="btn btn-primary" onClick={openCreateDrawer}>
            <Plus size={16} />
            <span>Add Container</span>
          </button>
        </div>
      </div>

      {/* METRIC STRIP */}
      {stats && (
        <div className="crop-stats-strip">
          <div className="stat-card-mini">
            <span className="stat-num">{stats.total_containers}</span>
            <span className="stat-lbl">Container Models</span>
          </div>
          <div className="stat-card-mini green">
            <span className="stat-num">{Number(stats.total_units_in_stock).toLocaleString()}</span>
            <span className="stat-lbl">Total Units In-Stock</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">{stats.grow_containers}</span>
            <span className="stat-lbl">Grow & Plug Trays</span>
          </div>
          <div className="stat-card-mini orange">
            <span className="stat-num">{stats.harvest_containers}</span>
            <span className="stat-lbl">Harvest Crates / Bins</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">{stats.storage_containers}</span>
            <span className="stat-lbl">Storage / Cold Lugs</span>
          </div>
        </div>
      )}

      {/* TOOLBAR & FILTERS */}
      <div className="grow-toolbar">
        {/* Type Filter Chips */}
        <div className="view-mode-tabs">
          {['All', 'Grow', 'Harvest & Handling', 'Storage', 'Retail Packaging'].map((t) => (
            <button
              key={t}
              className={`view-tab-btn ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              <span>{t}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="grow-search-input"
            placeholder="Search container, barcode, location, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Secondary Filters */}
        <div className="grow-filter-group">
          <div className="filter-pill-select">
            <span className="filter-label">Material:</span>
            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
            >
              {materialOptions.map(m => (
                <option key={m} value={m}>{m === 'All' ? 'All Materials' : m}</option>
              ))}
            </select>
          </div>

          <div className="filter-pill-select">
            <span className="filter-label">Serialized:</span>
            <select
              value={serializedFilter}
              onChange={(e) => setSerializedFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="true">Serialized Only</option>
              <option value="false">Unserialized</option>
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* CONTAINERS DATA TABLE */}
      {loading ? (
        <div className="timeline-loading">Loading container inventory...</div>
      ) : containers.length === 0 ? (
        <div className="harvest-empty-card">
          <Box size={42} />
          <h3>No containers match your filter</h3>
          <p>Add seedling flats, plug trays, or harvest totes to start tracking container inventory.</p>
          <button className="btn btn-primary" onClick={openCreateDrawer}>
            + Add New Container
          </button>
        </div>
      ) : (
        <div className="grow-table-card">
          <table className="grow-data-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Container Name & Code</th>
                <th style={{ width: '15%' }}>Types</th>
                <th style={{ width: '15%' }}>Material & Brand</th>
                <th style={{ width: '14%' }}>Shape & Volume</th>
                <th style={{ width: '12%' }}>Planting Cells</th>
                <th style={{ width: '10%' }}>In-Stock Qty</th>
                <th style={{ width: '12%' }}>Barcode / Tag</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c) => {
                const typesList = Array.isArray(c.types) ? c.types : (typeof c.types === 'string' ? JSON.parse(c.types || '[]') : []);

                return (
                  <tr key={c.id}>
                    {/* Name & Abbreviation */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="container-shape-avatar"
                          style={{
                            borderColor: c.color?.toLowerCase() === 'orange' ? '#f97316' : (c.color?.toLowerCase() === 'green' ? '#22c55e' : (c.color?.toLowerCase() === 'blue' ? '#3b82f6' : '#64748b'))
                          }}
                        >
                          {c.shape === 'Round' ? '⚪' : (c.shape === 'Square' ? '⏹️' : '🔲')}
                        </div>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{c.name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                            <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>{c.abbreviation || 'CONT'}</code>
                            <span>•</span>
                            <span>{c.storage_location}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Types */}
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {typesList.map((t, idx) => (
                          <span
                            key={idx}
                            className="day-pill"
                            style={{
                              background: t === 'Grow' ? '#dcfce7' : (t.includes('Harvest') ? '#ffedd5' : '#f1f5f9'),
                              color: t === 'Grow' ? '#15803d' : (t.includes('Harvest') ? '#c2410c' : '#475569')
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Material & Brand */}
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>{c.material}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{c.brand} ({c.color})</div>
                    </td>

                    {/* Shape & Volume */}
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                        {c.shape} ({c.volume_liters ? `${c.volume_liters}L` : '—'})
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {c.top_diameter_cm ? `${c.top_diameter_cm}x${c.bottom_diameter_cm}x${c.height_cm}cm` : `H: ${c.height_cm}cm`}
                      </div>
                    </td>

                    {/* Planting Cells */}
                    <td>
                      <span className="stage-pill" style={{ fontWeight: 700 }}>
                        {c.total_cells > 1 ? `${c.total_cells} Cells` : 'Open / 1-Cell'}
                      </span>
                      {c.total_cells > 1 && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {c.cell_configuration} ({c.cell_shape})
                        </div>
                      )}
                    </td>

                    {/* In-Stock Units */}
                    <td>
                      <strong style={{ fontSize: '14px', color: '#047857' }}>
                        {Number(c.total_count || 0).toLocaleString()}
                      </strong>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {c.is_serialized ? 'Serialized' : 'Bulk'}
                      </div>
                    </td>

                    {/* Barcode */}
                    <td>
                      <div
                        className="barcode-chip"
                        onClick={() => copyToClipboard(c.barcode || 'CONT-000')}
                        title="Click to copy barcode"
                      >
                        <Barcode size={13} />
                        <code>{c.barcode || 'N/A'}</code>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setSelectedBarcodeItem(c);
                            setShowBarcodeModal(true);
                          }}
                          title="Print Barcode Tag"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => openEditDrawer(c)}
                          title="Edit Container"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteContainer(c.id, c.name)}
                          title="Delete Container"
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

      {/* ======================================================= */}
      {/* DRAWER / MODAL: CREATE / EDIT CONTAINER */}
      {/* ======================================================= */}
      {showDrawer && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-xl">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  {editingContainer ? `Edit Container: ${editingContainer.name}` : 'Register New Farm Container / Tray'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDrawer(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContainer}>
              <div className="modal-body-custom">
                {/* 1. Identification & Type */}
                <h4 className="modal-subheading">1. Basic Details & Application Type</h4>
                <div className="form-grid-3">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Container Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. 72-Cell Deep Seedling Flat, Orange Vented Harvest Crate"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Abbreviation Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 72-FLAT, OHC-35"
                      value={form.abbreviation}
                      onChange={(e) => setForm({ ...form, abbreviation: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label>Application Types (Select all that apply)</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {['Grow', 'Harvest & Handling', 'Storage', 'Retail Packaging'].map((t) => (
                      <button
                        type="button"
                        key={t}
                        className={`day-toggle-pill ${form.types.includes(t) ? 'selected' : ''}`}
                        onClick={() => handleToggleType(t)}
                      >
                        {form.types.includes(t) && <Check size={12} />}
                        <span>{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Specs & Material */}
                <h4 className="modal-subheading" style={{ marginTop: '20px' }}>2. Material, Shape & Dimensions</h4>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Material</label>
                    <select
                      className="form-control"
                      value={form.material}
                      onChange={(e) => setForm({ ...form, material: e.target.value })}
                    >
                      <option value="Heavy-Duty Polypropylene">Heavy-Duty Polypropylene</option>
                      <option value="Recycled Polypropylene">Recycled Polypropylene</option>
                      <option value="BPA-Free Food-Grade Plastic">BPA-Free Food-Grade Plastic</option>
                      <option value="High-Density Polyethylene">High-Density Polyethylene</option>
                      <option value="UV-Stabilized HDPE">UV-Stabilized HDPE</option>
                      <option value="Injection Molded Plastic">Injection Molded Plastic</option>
                      <option value="Terracotta Clay">Terracotta Clay</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Brand / Manufacturer</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <select
                      className="form-control"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                    >
                      <option value="Black">Black</option>
                      <option value="Orange">Orange</option>
                      <option value="Green">Green</option>
                      <option value="Blue">Blue</option>
                      <option value="Terracotta">Terracotta</option>
                      <option value="White">White</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Overall Shape</label>
                    <select
                      className="form-control"
                      value={form.shape}
                      onChange={(e) => setForm({ ...form, shape: e.target.value })}
                    >
                      <option value="Flat Tray">Flat Tray</option>
                      <option value="Rectangle">Rectangle Crate / Box</option>
                      <option value="Square">Square Pot</option>
                      <option value="Round">Round Nursery Pot</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Top Length / Diameter (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={form.top_diameter_cm}
                      onChange={(e) => setForm({ ...form, top_diameter_cm: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Height / Depth (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={form.height_cm}
                      onChange={(e) => setForm({ ...form, height_cm: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Volume Capacity (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={form.volume_liters}
                      onChange={(e) => setForm({ ...form, volume_liters: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Total In-Stock Units *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      value={form.total_count}
                      onChange={(e) => setForm({ ...form, total_count: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Storage Location</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Greenhouse 1 - Nursery Bench A"
                      value={form.storage_location}
                      onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
                    />
                  </div>
                </div>

                {/* 3. Cells Configuration */}
                <h4 className="modal-subheading" style={{ marginTop: '20px' }}>3. Planting Cell Configuration</h4>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Total Planting Cells</label>
                    <select
                      className="form-control"
                      value={form.total_cells}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        let cfg = 'Single';
                        if (val === 32) cfg = '8x4 Grid';
                        else if (val === 50) cfg = '10x5 Grid';
                        else if (val === 72) cfg = '12x6 Grid';
                        else if (val === 128) cfg = '16x8 Grid';
                        else if (val === 200) cfg = '20x10 Grid';
                        else if (val === 288) cfg = '24x12 Grid';
                        setForm({ ...form, total_cells: val, cell_configuration: cfg });
                      }}
                    >
                      <option value="1">1 (Single Open / No Cells)</option>
                      <option value="32">32 Cells</option>
                      <option value="50">50 Cells</option>
                      <option value="72">72 Cells (Standard Flat)</option>
                      <option value="128">128 Cells (Deep Plug)</option>
                      <option value="200">200 Cells (Micro Plug)</option>
                      <option value="288">288 Cells (Nursery Seedling)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Cell Grid Layout</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.cell_configuration}
                      onChange={(e) => setForm({ ...form, cell_configuration: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Cell Shape</label>
                    <select
                      className="form-control"
                      value={form.cell_shape}
                      onChange={(e) => setForm({ ...form, cell_shape: e.target.value })}
                    >
                      <option value="Square">Square Cell</option>
                      <option value="Round">Round Cell</option>
                      <option value="Hexagonal">Hexagonal Cell</option>
                      <option value="None">None (Open)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label>Notes & Handling Guidelines</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Washing instructions, sterilization schedule, crop suitability..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDrawer(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : editingContainer ? 'Update Container' : 'Save Container'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: BARCODE PRINT PREVIEW */}
      {/* ======================================================= */}
      {showBarcodeModal && selectedBarcodeItem && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-md">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Barcode size={20} className="modal-icon" />
                <h3 className="modal-title-custom">Container Barcode Label</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowBarcodeModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-custom" style={{ textAlign: 'center', padding: '24px' }}>
              <div className="barcode-tag-card-preview">
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em' }}>
                  🌿 VIVAS AI ASSET TAG
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {selectedBarcodeItem.name}
                </div>
                <div style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700 }}>
                  {selectedBarcodeItem.abbreviation} • {selectedBarcodeItem.shape}
                </div>

                {/* Simulated Barcode Graphic */}
                <div className="simulated-barcode-bars" style={{ margin: '16px auto', width: '220px', height: '55px' }}>
                  <div className="barcode-stripes" />
                </div>

                <code style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.1em' }}>
                  {selectedBarcodeItem.barcode || 'CONT-000000'}
                </code>

                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                  Location: {selectedBarcodeItem.storage_location}
                </div>
              </div>
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBarcodeModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                <Printer size={14} />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
