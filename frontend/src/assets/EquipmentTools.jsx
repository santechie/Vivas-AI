import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench, Plus, Search, Filter, RefreshCw, Sparkles, X, Edit3, Trash2,
  Calendar, Clock, IndianRupee, User, MapPin, CheckCircle2, AlertTriangle,
  FileText, ShieldCheck, Truck, Cpu, Layers, ChevronRight, Eye, Gauge,
  List, Grid as GridIcon, Hammer
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function EquipmentToolsScreen() {
  const [equipment, setEquipment] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & View
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modals & Drawers
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [selectedEqForMaint, setSelectedEqForMaint] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedEqHistory, setSelectedEqHistory] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Equipment Form State
  const [form, setForm] = useState({
    name: '',
    model_number: '',
    brand: '',
    category: 'Tractors & Vehicles',
    serial_number: '',
    asset_tag: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    purchase_price: 150000.00,
    current_status: 'active',
    location: 'Main Tool Barn',
    assigned_crew: 'Field Operations Crew',
    operating_hours: 120.0,
    service_interval_hours: 100,
    last_service_date: '',
    next_service_date: '',
    warranty_expiry: '',
    manual_url: '',
    notes: ''
  });

  // Maintenance Form State
  const [maintForm, setMaintForm] = useState({
    service_date: new Date().toISOString().slice(0, 10),
    service_type: 'Routine Oil & Filter Change',
    performed_by: 'Authorized Service Tech',
    cost: 3500.00,
    hours_at_service: 150.0,
    parts_replaced: 'Engine Oil, Oil Filter, Fuel Filter',
    notes: 'Completed scheduled service. Lubricated all grease zerks and checked tire pressure.',
    next_due_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/equipment?category=${categoryFilter}&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`${API_BASE}/equipment/stats`)
      ]);

      const eData = await eRes.json();
      const sData = await sRes.json();

      if (eData.success) setEquipment(eData.data);
      if (sData.success) setStats(sData.data);
    } catch (err) {
      console.error('Error fetching equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter, statusFilter, searchQuery]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Open Create Drawer
  const openCreateDrawer = () => {
    setEditingEquipment(null);
    setForm({
      name: '',
      model_number: '',
      brand: 'Mahindra',
      category: 'Tractors & Vehicles',
      serial_number: `SN-${Date.now().toString().slice(-6)}`,
      asset_tag: `EQ-${Date.now().toString().slice(-4)}`,
      purchase_date: new Date().toISOString().slice(0, 10),
      purchase_price: 250000.00,
      current_status: 'active',
      location: 'Main Tool Barn',
      assigned_crew: 'Field Operations Crew',
      operating_hours: 0.0,
      service_interval_hours: 100,
      last_service_date: new Date().toISOString().slice(0, 10),
      next_service_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      warranty_expiry: new Date(Date.now() + 730 * 86400000).toISOString().slice(0, 10),
      manual_url: '',
      notes: ''
    });
    setShowDrawer(true);
  };

  // Open Edit Drawer
  const openEditDrawer = (item) => {
    setEditingEquipment(item);
    setForm({
      name: item.name || '',
      model_number: item.model_number || '',
      brand: item.brand || '',
      category: item.category || 'Hand Tools & Implements',
      serial_number: item.serial_number || '',
      asset_tag: item.asset_tag || '',
      purchase_date: item.purchase_date ? item.purchase_date.slice(0, 10) : '',
      purchase_price: parseFloat(item.purchase_price) || 0,
      current_status: item.current_status || 'active',
      location: item.location || 'Main Tool Barn',
      assigned_crew: item.assigned_crew || 'Field Operations Crew',
      operating_hours: parseFloat(item.operating_hours) || 0,
      service_interval_hours: parseInt(item.service_interval_hours) || 100,
      last_service_date: item.last_service_date ? item.last_service_date.slice(0, 10) : '',
      next_service_date: item.next_service_date ? item.next_service_date.slice(0, 10) : '',
      warranty_expiry: item.warranty_expiry ? item.warranty_expiry.slice(0, 10) : '',
      manual_url: item.manual_url || '',
      notes: item.notes || ''
    });
    setShowDrawer(true);
  };

  // Save / Update Equipment
  const handleSaveEquipment = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter equipment name');
      return;
    }

    try {
      setIsSaving(true);
      const url = editingEquipment
        ? `${API_BASE}/equipment/${editingEquipment.id}`
        : `${API_BASE}/equipment`;
      const method = editingEquipment ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingEquipment ? 'Equipment updated' : 'New equipment added to fleet');
        setShowDrawer(false);
        setEditingEquipment(null);
        fetchData();
      }
    } catch (err) {
      console.error('Error saving equipment:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Log Maintenance Modal
  const openMaintModal = (eq) => {
    setSelectedEqForMaint(eq);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 90);

    setMaintForm({
      service_date: new Date().toISOString().slice(0, 10),
      service_type: 'Routine Oil & Filter Change',
      performed_by: 'Farm Mechanic / Authorized Tech',
      cost: 2500.00,
      hours_at_service: parseFloat(eq.operating_hours) || 0,
      parts_replaced: 'Oil Filter, Engine Oil',
      notes: 'Standard interval service completed. Inspected belts and fluid levels.',
      next_due_date: nextDate.toISOString().slice(0, 10)
    });
    setShowMaintModal(true);
  };

  // Save Maintenance Log
  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedEqForMaint) return;

    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/equipment/${selectedEqForMaint.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Service log saved and maintenance schedules updated');
        setShowMaintModal(false);
        setSelectedEqForMaint(null);
        fetchData();
      }
    } catch (err) {
      console.error('Error recording maintenance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // View Maintenance History
  const openHistoryModal = async (eq) => {
    try {
      const res = await fetch(`${API_BASE}/equipment/${eq.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedEqHistory(data.data);
        setShowHistoryModal(true);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  // Delete Equipment
  const handleDeleteEquipment = async (id, name) => {
    if (!window.confirm(`Delete equipment '${name}' from fleet?`)) return;
    try {
      const res = await fetch(`${API_BASE}/equipment/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Equipment deleted');
        fetchData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const categoriesList = [
    'All', 'Tractors & Vehicles', 'Seeders & Transplanters',
    'Tillage & Bed Preparation', 'Sprayers & Applicators',
    'Harvesting Equipment', 'Post-Harvest & Cold Storage', 'Hand Tools'
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
          <div className="grow-badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>ASSETS & MACHINERY</div>
          <h1 className="grow-title">Equipment & Tools</h1>
          <p className="grow-subtitle">Fleet management for tractors, implements, sprayers, cold chillers, and precision farm tools</p>
        </div>

        <div className="grow-header-right">
          <div className="season-kpi-badge" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}>
            <span className="kpi-label">TOTAL FLEET VALUATION</span>
            <span className="kpi-value">₹{stats ? Number(stats.total_fleet_value).toLocaleString() : '0'}</span>
          </div>

          <button className="btn btn-primary" onClick={openCreateDrawer}>
            <Plus size={16} />
            <span>Add Equipment</span>
          </button>
        </div>
      </div>

      {/* METRIC STRIP */}
      {stats && (
        <div className="crop-stats-strip">
          <div className="stat-card-mini">
            <span className="stat-num">{stats.total_equipment}</span>
            <span className="stat-lbl">Fleet Machines & Tools</span>
          </div>
          <div className="stat-card-mini green">
            <span className="stat-num">{stats.active_count}</span>
            <span className="stat-lbl">Active & Operational</span>
          </div>
          <div className="stat-card-mini orange">
            <span className="stat-num">{stats.in_maintenance_count}</span>
            <span className="stat-lbl">In Maintenance Bay</span>
          </div>
          <div className="stat-card-mini red">
            <span className="stat-num">{stats.service_due_soon}</span>
            <span className="stat-lbl">Service Due &lt; 30 Days</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">{Number(stats.total_operating_hours || 0).toFixed(0)} hrs</span>
            <span className="stat-lbl">Total Runtime Hours</span>
          </div>
        </div>
      )}

      {/* TOOLBAR & FILTERS */}
      <div className="grow-toolbar">
        {/* Category Tabs */}
        <div className="view-mode-tabs" style={{ overflowX: 'auto', maxWidth: '650px' }}>
          {categoriesList.map((cat) => (
            <button
              key={cat}
              className={`view-tab-btn ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="grow-search-input"
            placeholder="Search equipment, brand, model, tag, operator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status & View Switcher */}
        <div className="grow-filter-group">
          <div className="filter-pill-select">
            <span className="filter-label">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="in_storage">In Storage</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>

          <div className="view-switch-btns">
            <button
              className={`btn-icon ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card View"
            >
              <GridIcon size={14} />
            </button>
            <button
              className={`btn-icon ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={14} />
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* EQUIPMENT VIEWS */}
      {loading ? (
        <div className="timeline-loading">Loading fleet equipment...</div>
      ) : equipment.length === 0 ? (
        <div className="harvest-empty-card">
          <Wrench size={42} />
          <h3>No equipment found</h3>
          <p>Add your tractors, seeders, sprayers, and tools to track maintenance logs and operating hours.</p>
          <button className="btn btn-primary" onClick={openCreateDrawer}>
            + Add New Equipment
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS GRID VIEW */
        <div className="channels-grid-layout">
          {equipment.map((eq) => {
            const isDueSoon = eq.next_service_date && new Date(eq.next_service_date) <= new Date(Date.now() + 30 * 86400000);
            const isMaint = eq.current_status === 'maintenance';

            return (
              <div key={eq.id} className={`channel-card ${isMaint ? 'is-inactive' : ''}`}>
                <div className="channel-card-header">
                  <div className="channel-header-left">
                    <div className="channel-icon-avatar" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                      {eq.category.includes('Tractor') ? '🚜' : (eq.category.includes('Seeder') ? '🌱' : (eq.category.includes('Sprayer') ? '💧' : (eq.category.includes('Cold') ? '❄️' : '🔧')))}
                    </div>
                    <div>
                      <h4 className="channel-name-title">{eq.name}</h4>
                      <span className="channel-type-subtitle">
                        {eq.brand} {eq.model_number ? `• ${eq.model_number}` : ''}
                      </span>
                    </div>
                  </div>

                  <span className={`status-toggle-btn ${eq.current_status === 'active' ? 'active' : 'inactive'}`}>
                    {eq.current_status.replace('_', ' ')}
                  </span>
                </div>

                <div className="channel-card-body">
                  <div className="channel-specs-grid">
                    <div className="spec-item">
                      <span className="spec-label">Asset Tag / SN</span>
                      <span className="spec-value tag">{eq.asset_tag || eq.serial_number || 'EQ-000'}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Operating Hours</span>
                      <span className="spec-value">{parseFloat(eq.operating_hours || 0).toFixed(1)} hrs</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Location</span>
                      <span className="spec-value">{eq.location || 'Tool Barn'}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-label">Assigned Operator</span>
                      <span className="spec-value">{eq.assigned_crew || 'General Crew'}</span>
                    </div>
                  </div>

                  {/* Maintenance Schedule Alert */}
                  <div style={{ background: isDueSoon ? '#fff1f2' : '#f8fafc', border: `1px solid ${isDueSoon ? '#fecdd3' : '#e2e8f0'}`, borderRadius: '6px', padding: '8px 10px', fontSize: '11.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} style={{ color: isDueSoon ? '#e11d48' : '#64748b' }} />
                      <span>Next Service: <strong>{eq.next_service_date ? eq.next_service_date.slice(0, 10) : 'Not scheduled'}</strong></span>
                    </div>
                    {isDueSoon && (
                      <span style={{ color: '#e11d48', fontWeight: 800, fontSize: '10.5px' }}>DUE SOON</span>
                    )}
                  </div>
                </div>

                <div className="channel-card-footer">
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => openHistoryModal(eq)}
                  >
                    <FileText size={12} />
                    <span>Logs ({eq.service_count || 0})</span>
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-primary btn-xs"
                      onClick={() => openMaintModal(eq)}
                    >
                      <Hammer size={12} />
                      <span>Log Service</span>
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => openEditDrawer(eq)}
                      title="Edit Equipment"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDeleteEquipment(eq.id, eq.name)}
                      title="Delete Equipment"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="grow-table-card">
          <table className="grow-data-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Machine / Tool Name</th>
                <th style={{ width: '15%' }}>Category</th>
                <th style={{ width: '12%' }}>Asset Tag / SN</th>
                <th style={{ width: '10%' }}>Hours</th>
                <th style={{ width: '14%' }}>Location & Crew</th>
                <th style={{ width: '12%' }}>Next Service</th>
                <th style={{ width: '10%' }}>Status</th>
                <th style={{ width: '12%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((eq) => (
                <tr key={eq.id}>
                  <td>
                    <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{eq.name}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.brand} {eq.model_number}</div>
                  </td>
                  <td>
                    <span className="day-pill">{eq.category}</span>
                  </td>
                  <td>
                    <code style={{ fontWeight: 700, color: '#4338ca' }}>{eq.asset_tag || eq.serial_number}</code>
                  </td>
                  <td>
                    <strong>{parseFloat(eq.operating_hours || 0).toFixed(1)} hrs</strong>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{eq.location}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.assigned_crew}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>
                      {eq.next_service_date ? eq.next_service_date.slice(0, 10) : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-toggle-btn ${eq.current_status === 'active' ? 'active' : 'inactive'}`}>
                      {eq.current_status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn-icon"
                        onClick={() => openMaintModal(eq)}
                        title="Log Service"
                      >
                        <Hammer size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => openHistoryModal(eq)}
                        title="Service History"
                      >
                        <FileText size={14} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => openEditDrawer(eq)}
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => handleDeleteEquipment(eq.id, eq.name)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================= */}
      {/* DRAWER: CREATE / EDIT EQUIPMENT */}
      {/* ======================================================= */}
      {showDrawer && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-xl">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  {editingEquipment ? `Edit Equipment: ${editingEquipment.name}` : 'Register New Fleet Asset / Tool'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDrawer(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment}>
              <div className="modal-body-custom">
                {/* 1. Identification */}
                <h4 className="modal-subheading">1. Machine Identification & Category</h4>
                <div className="form-grid-3">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Equipment Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. Mahindra 475 DI 42HP Farm Tractor, Jang JP-1 Clean Seeder"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      className="form-control"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {categoriesList.filter(x => x !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Brand / Manufacturer</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mahindra, Honda, Solo, Jang"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Model Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 475 DI SP PLUS, F501 5.5HP"
                      value={form.model_number}
                      onChange={(e) => setForm({ ...form, model_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Asset Tag / Barcode</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. EQ-TRAC-001"
                      value={form.asset_tag}
                      onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Serial Number (VIN / Chassis)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.serial_number}
                      onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.purchase_date}
                      onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Purchase Price (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.purchase_price}
                      onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* 2. Operational Status & Crew */}
                <h4 className="modal-subheading" style={{ marginTop: '20px' }}>2. Operations, Crew & Location</h4>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Current Status</label>
                    <select
                      className="form-control"
                      value={form.current_status}
                      onChange={(e) => setForm({ ...form, current_status: e.target.value })}
                    >
                      <option value="active">Active & Ready</option>
                      <option value="in_use">In Use on Field</option>
                      <option value="maintenance">Under Maintenance</option>
                      <option value="in_storage">In Seasonal Storage</option>
                      <option value="decommissioned">Decommissioned</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Storage / Field Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Assigned Crew / Operator</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.assigned_crew}
                      onChange={(e) => setForm({ ...form, assigned_crew: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Current Operating Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={form.operating_hours}
                      onChange={(e) => setForm({ ...form, operating_hours: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Service Interval (Hours)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.service_interval_hours}
                      onChange={(e) => setForm({ ...form, service_interval_hours: parseInt(e.target.value) || 100 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Next Service Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.next_service_date}
                      onChange={(e) => setForm({ ...form, next_service_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label>Notes & Technical Specifications</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Horsepower, fuel specs, implement mounting attachments, operator guidelines..."
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
                  {isSaving ? 'Saving...' : editingEquipment ? 'Update Equipment' : 'Register Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: LOG MAINTENANCE SERVICE */}
      {/* ======================================================= */}
      {showMaintModal && selectedEqForMaint && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-lg">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hammer size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  Log Service Record: {selectedEqForMaint.name} ({selectedEqForMaint.asset_tag || selectedEqForMaint.brand})
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowMaintModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance}>
              <div className="modal-body-custom">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Service Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={maintForm.service_date}
                      onChange={(e) => setMaintForm({ ...maintForm, service_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Service Type *</label>
                    <select
                      className="form-control"
                      value={maintForm.service_type}
                      onChange={(e) => setMaintForm({ ...maintForm, service_type: e.target.value })}
                    >
                      <option value="Routine Oil & Filter Change">Routine Oil & Filter Change</option>
                      <option value="Hydraulic Service & Fluid Top-up">Hydraulic Service & Fluid Top-up</option>
                      <option value="Blade Sharpening & Balancing">Blade Sharpening & Balancing</option>
                      <option value="Tine & Belt Replacement">Tine & Belt Replacement</option>
                      <option value="Battery & Electrical Inspection">Battery & Electrical Inspection</option>
                      <option value="Calibration & Nozzle Cleaning">Calibration & Nozzle Cleaning</option>
                      <option value="Major Overhaul">Major Overhaul / Engine Repair</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Performed By (Mechanic / Dealer) *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={maintForm.performed_by}
                      onChange={(e) => setMaintForm({ ...maintForm, performed_by: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Service Cost (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={maintForm.cost}
                      onChange={(e) => setMaintForm({ ...maintForm, cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Operating Hours at Service</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={maintForm.hours_at_service}
                      onChange={(e) => setMaintForm({ ...maintForm, hours_at_service: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Next Service Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={maintForm.next_due_date}
                      onChange={(e) => setMaintForm({ ...maintForm, next_due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Parts & Consumables Replaced</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Engine Oil (8.5L), Oil Filter, Air Filter, NGK Spark Plug"
                    value={maintForm.parts_replaced}
                    onChange={(e) => setMaintForm({ ...maintForm, parts_replaced: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Work Done Notes & Observations</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Details of repair, fluid condition, adjustments made..."
                    value={maintForm.notes}
                    onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMaintModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Maintenance Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: MAINTENANCE HISTORY LOGS */}
      {/* ======================================================= */}
      {showHistoryModal && selectedEqHistory && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-lg">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  Service History: {selectedEqHistory.name}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-custom">
              {(!selectedEqHistory.maintenance_logs || selectedEqHistory.maintenance_logs.length === 0) ? (
                <div className="harvest-empty-card">
                  <FileText size={36} />
                  <p>No service records logged yet for this equipment.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedEqHistory.maintenance_logs.map((log) => (
                    <div key={log.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="day-pill" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>
                            {log.service_date?.slice(0, 10)}
                          </span>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{log.service_type}</strong>
                        </div>
                        <strong style={{ color: '#047857' }}>₹{Number(log.cost || 0).toLocaleString()}</strong>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                        <strong>Technician:</strong> {log.performed_by} • <strong>Hours:</strong> {log.hours_at_service} hrs
                      </div>

                      {log.parts_replaced && (
                        <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                          <strong>Parts:</strong> {log.parts_replaced}
                        </div>
                      )}

                      {log.notes && (
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
