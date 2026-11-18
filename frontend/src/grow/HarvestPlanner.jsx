import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Plus, Filter, Search, X, ChevronDown, Check, CheckCircle2,
  Layers, MapPin, IndianRupee, Sprout, Tag, Clock, ArrowRight,
  Edit3, Trash2, Copy, RefreshCw, Eye, Download, Printer,
  Sparkles, ShieldCheck, Box, UserCheck, AlertCircle, ShoppingBag,
  TrendingUp, Save, CheckSquare
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function HarvestPlannerScreen() {
  const [plans, setPlans] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateFilter, setDateFilter] = useState('all'); // 'today' | 'tomorrow' | 'this_week' | 'all'
  const [cropFilter, setCropFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Add form
  const [form, setForm] = useState({
    planting_id: '',
    crop_name: 'Tomatoes',
    variety_name: 'Roma VF',
    harvest_stage: 'Mature',
    harvest_date: new Date().toISOString().slice(0, 10),
    location_name: 'Greenhouse Block A',
    bed_names: 'Bed 1',
    in_storage_qty: 15.0,
    current_yield_est: 40.0,
    total_available_qty: 55.0,
    pending_orders_qty: 30.0,
    planned_qty: 35.0,
    unit: 'Ton',
    container_type: 'Orange Heavy Crate',
    container_count: 3,
    assignee: 'Ramesh Kumar',
    order_value: 2100.00,
    status: 'scheduled',
    notes: ''
  });

  // Log completion form
  const [completeForm, setCompleteForm] = useState({
    actual_harvested_qty: 0,
    status: 'harvested',
    notes: ''
  });

  // Fetch harvest plans
  const fetchPlans = async () => {
    try {
      setLoading(true);
      let queryUrl = `${API_BASE}/harvest-plans?crop_name=${cropFilter}&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`;
      
      const today = new Date();
      if (dateFilter === 'today') {
        queryUrl += `&date=${today.toISOString().slice(0, 10)}`;
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        queryUrl += `&date=${tomorrow.toISOString().slice(0, 10)}`;
      }

      const [pRes, plRes, cRes] = await Promise.all([
        fetch(queryUrl),
        fetch(`${API_BASE}/plantings`),
        fetch(`${API_BASE}/crops`)
      ]);

      const pData = await pRes.json();
      const plData = await plRes.json();
      const cData = await cRes.json();

      if (pData.success) setPlans(pData.data);
      if (plData.success) setPlantings(plData.data);
      if (cData.success) setCrops(cData.data);
    } catch (err) {
      console.error('Error fetching harvest plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [dateFilter, cropFilter, statusFilter, searchQuery]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Handle selecting a planting in modal to auto-populate
  const handlePlantingSelect = (plantingId) => {
    const p = plantings.find(item => item.id === plantingId);
    if (!p) return;
    setForm({
      ...form,
      planting_id: p.id,
      crop_name: p.crop_name,
      variety_name: p.variety_name || 'Standard',
      harvest_stage: p.harvest_stage || 'Mature',
      location_name: p.location_name || '',
      bed_names: p.bed_names || 'Bed 1',
      unit: p.yield_unit || 'Ton',
      current_yield_est: p.target_yield ? parseFloat(p.target_yield) : 30.0,
      total_available_qty: p.target_yield ? parseFloat(p.target_yield) + (form.in_storage_qty || 0) : 40.0,
      planned_qty: p.target_yield ? Math.min(parseFloat(p.target_yield), 30.0) : 20.0,
      order_value: p.unit_price ? (parseFloat(p.unit_price) * 20.0) : 1000.00
    });
  };

  // Save new harvest plan
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!form.crop_name || !form.harvest_date) return;
    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/harvest-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Harvest plan added to schedule');
        setShowAddModal(false);
        fetchPlans();
      }
    } catch (err) {
      console.error('Error creating harvest plan:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Inline update planned quantity
  const handleInlineQtyChange = async (id, newQty) => {
    try {
      await fetch(`${API_BASE}/harvest-plans/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned_qty: parseFloat(newQty) || 0 })
      });
      setPlans(plans.map(p => p.id === id ? { ...p, planned_qty: parseFloat(newQty) || 0 } : p));
      showToast('Quantity updated');
    } catch (err) {
      console.error('Inline update error:', err);
    }
  };

  // Mark harvest completed
  const handleCompleteHarvest = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/harvest-plans/${selectedPlan.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'harvested',
          actual_harvested_qty: parseFloat(completeForm.actual_harvested_qty) || 0
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Logged ${completeForm.actual_harvested_qty} ${selectedPlan.unit} harvest for ${selectedPlan.crop_name}`);
        setShowCompleteModal(false);
        setSelectedPlan(null);
        fetchPlans();
      }
    } catch (err) {
      console.error('Complete error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete plan
  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Delete scheduled harvest for "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/harvest-plans/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Harvest plan deleted');
        fetchPlans();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Group plans by harvest date
  const groupedPlans = useMemo(() => {
    const groups = {};
    plans.forEach(p => {
      const dateKey = p.harvest_date ? p.harvest_date.slice(0, 10) : 'Unscheduled';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(p);
    });
    return groups;
  }, [plans]);

  // Overall KPIs
  const totalPlannedWeight = useMemo(() => {
    return plans.reduce((acc, p) => acc + (parseFloat(p.planned_qty) || 0), 0);
  }, [plans]);

  const totalOrderValue = useMemo(() => {
    return plans.reduce((acc, p) => acc + (parseFloat(p.order_value) || 0), 0);
  }, [plans]);

  const totalPendingOrders = useMemo(() => {
    return plans.reduce((acc, p) => acc + (parseFloat(p.pending_orders_qty) || 0), 0);
  }, [plans]);

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
          <div className="grow-badge">GROW MODULE</div>
          <h1 className="grow-title">Harvest Planner</h1>
          <p className="grow-subtitle">Adjust daily harvest schedules, packing containers, crew assignments and order fulfilment</p>
        </div>

        <div className="grow-header-right">
          <div className="season-kpi-badge">
            <span className="kpi-label">TOTAL SCHEDULED VALUE</span>
            <span className="kpi-value">₹{Number(totalOrderValue).toLocaleString()}</span>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setShowAddModal(true);
            }}
          >
            <Plus size={16} />
            <span>Plan Harvest</span>
          </button>
        </div>
      </div>

      {/* METRIC STRIP */}
      <div className="crop-stats-strip">
        <div className="stat-card-mini">
          <span className="stat-num">{plans.length}</span>
          <span className="stat-lbl">Scheduled Batches</span>
        </div>
        <div className="stat-card-mini green">
          <span className="stat-num">{totalPlannedWeight.toFixed(1)} Ton</span>
          <span className="stat-lbl">Planned Harvest Yield</span>
        </div>
        <div className="stat-card-mini orange">
          <span className="stat-num">{totalPendingOrders.toFixed(1)} Ton</span>
          <span className="stat-lbl">Pending Orders To Pack</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-num">
            {plans.filter(p => p.status === 'harvested').length} / {plans.length}
          </span>
          <span className="stat-lbl">Completed Harvests</span>
        </div>
      </div>

      {/* TOOLBAR & FILTERS */}
      <div className="grow-toolbar">
        {/* Date Filter Buttons */}
        <div className="view-mode-tabs">
          <button
            className={`view-tab-btn ${dateFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDateFilter('all')}
          >
            <Calendar size={14} />
            <span>All Dates</span>
          </button>
          <button
            className={`view-tab-btn ${dateFilter === 'today' ? 'active' : ''}`}
            onClick={() => setDateFilter('today')}
          >
            <span>Today ({new Date().toISOString().slice(5, 10)})</span>
          </button>
          <button
            className={`view-tab-btn ${dateFilter === 'tomorrow' ? 'active' : ''}`}
            onClick={() => setDateFilter('tomorrow')}
          >
            <span>Tomorrow</span>
          </button>
        </div>

        {/* Search */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="grow-search-input"
            placeholder="Search crop, variety, bed or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="grow-filter-group">
          {/* Crop Filter */}
          <div className="filter-pill-select">
            <span className="filter-label">Crop:</span>
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
            >
              <option value="All">All Crops</option>
              {crops.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-pill-select">
            <span className="filter-label">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="harvested">Harvested</option>
            </select>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchPlans}
            title="Refresh schedule"
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* HARVEST DATE GROUPS & TABLES */}
      {loading ? (
        <div className="timeline-loading">Loading harvest schedule...</div>
      ) : Object.keys(groupedPlans).length === 0 ? (
        <div className="harvest-empty-card">
          <ShoppingBag size={42} />
          <h3>No harvests scheduled for the selected filter</h3>
          <p>Click "+ Plan Harvest" above to schedule a harvest batch from your active plantings.</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Plan Harvest Now
          </button>
        </div>
      ) : (
        <div className="harvest-date-groups-wrapper">
          {Object.entries(groupedPlans).map(([dateStr, items]) => {
            const dateTotal = items.reduce((acc, p) => acc + (parseFloat(p.order_value) || 0), 0);
            const dateQty = items.reduce((acc, p) => acc + (parseFloat(p.planned_qty) || 0), 0);
            const isToday = dateStr === new Date().toISOString().slice(0, 10);

            return (
              <div key={dateStr} className={`harvest-group-card ${isToday ? 'is-today' : ''}`}>
                {/* Date Group Header Banner */}
                <div className="harvest-group-header">
                  <div className="group-header-left">
                    <Calendar size={18} className="group-calendar-icon" />
                    <div>
                      <h3 className="group-date-title">
                        Harvest Date: {dateStr} {isToday && <span className="today-badge">TODAY</span>}
                      </h3>
                      <div className="group-meta-sub">
                        <span className="window-tag open">Order Window: Open</span>
                        <span className="weather-tag">🌤️ 28°C / 82°F Humidity: 65%</span>
                        <span className="dot">•</span>
                        <span>{items.length} {items.length === 1 ? 'batch' : 'batches'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="group-header-right">
                    <div className="group-subtotal">
                      <span className="subtotal-label">Day Planned:</span>
                      <span className="subtotal-qty">{dateQty.toFixed(1)} Ton</span>
                      <span className="subtotal-val">₹{Number(dateTotal).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Table for this date */}
                <div className="harvest-table-container">
                  <table className="grow-data-table harvest-grid-table">
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>Crop & Variety</th>
                        <th style={{ width: '15%' }}>Bed / Location</th>
                        <th style={{ width: '10%' }}>Order Value</th>
                        <th style={{ width: '14%' }} className="th-center">
                          <div className="th-group-title">AVAILABLE</div>
                          <div className="th-sub-row">
                            <span>In Storage</span>
                            <span>Yield Est.</span>
                          </div>
                        </th>
                        <th style={{ width: '10%' }} className="th-center">
                          <div className="th-group-title">ORDERED</div>
                          <div className="th-sub-row">
                            <span>Pending</span>
                          </div>
                        </th>
                        <th style={{ width: '20%' }} className="th-center">
                          <div className="th-group-title">PLANNED HARVEST</div>
                          <div className="th-sub-row">
                            <span>Qty</span>
                            <span>Container</span>
                            <span>Assignee</span>
                          </div>
                        </th>
                        <th style={{ width: '9%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((plan) => {
                        const isHarvested = plan.status === 'harvested';
                        return (
                          <tr key={plan.id} className={isHarvested ? 'row-harvested' : ''}>
                            {/* Crop & Variety */}
                            <td>
                              <div className="harvest-crop-cell">
                                <div className="crop-mini-icon">🌱</div>
                                <div>
                                  <div className="crop-bold-name">{plan.crop_name}</div>
                                  <div className="variety-stage-text">
                                    <span>{plan.variety_name || 'Standard'}</span>
                                    <span className="stage-mini-pill">{plan.harvest_stage || 'Mature'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Bed / Location */}
                            <td>
                              <div className="location-cell-flex">
                                <MapPin size={13} style={{ color: '#2e7d32' }} />
                                <div>
                                  <div className="loc-main-name">{plan.location_name || 'Field'}</div>
                                  <div className="loc-sub-bed">{plan.bed_names || 'Bed 1'}</div>
                                </div>
                              </div>
                            </td>

                            {/* Total Order Value */}
                            <td>
                              <strong className="order-value-text">
                                ₹{Number(plan.order_value || 0).toLocaleString()}
                              </strong>
                            </td>

                            {/* Available (In Storage & Yield Est) */}
                            <td className="td-center">
                              <div className="available-metrics-flex">
                                <span className="storage-qty" title="In Storage">
                                  {plan.in_storage_qty} {plan.unit}
                                </span>
                                <span className="yield-est-qty" title="Current Field Yield Est">
                                  {plan.current_yield_est} {plan.unit}
                                </span>
                              </div>
                            </td>

                            {/* Ordered (Pending) */}
                            <td className="td-center">
                              <span className="pending-orders-tag">
                                {plan.pending_orders_qty} {plan.unit}
                              </span>
                            </td>

                            {/* Planned (Qty, Container, Assignee) */}
                            <td>
                              <div className="planned-inputs-flex">
                                <input
                                  type="number"
                                  className="form-control form-control-sm qty-input"
                                  defaultValue={plan.planned_qty}
                                  onBlur={(e) => handleInlineQtyChange(plan.id, e.target.value)}
                                  disabled={isHarvested}
                                />
                                <div className="container-badge" title="Harvest Container">
                                  <Box size={12} />
                                  <span>{plan.container_count}x {plan.container_type || 'Tote'}</span>
                                </div>
                                <div className="assignee-badge" title="Crew Assignee">
                                  <UserCheck size={12} />
                                  <span>{plan.assignee || 'Unassigned'}</span>
                                </div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="action-buttons-flex">
                                {isHarvested ? (
                                  <span className="harvested-done-tag">
                                    <CheckCircle2 size={13} />
                                    <span>Done ({plan.actual_harvested_qty} {plan.unit})</span>
                                  </span>
                                ) : (
                                  <button
                                    className="btn btn-xs btn-primary"
                                    onClick={() => {
                                      setSelectedPlan(plan);
                                      setCompleteForm({
                                        actual_harvested_qty: plan.planned_qty,
                                        status: 'harvested',
                                        notes: ''
                                      });
                                      setShowCompleteModal(true);
                                    }}
                                    title="Log Complete Harvest"
                                  >
                                    <CheckSquare size={13} />
                                    <span>Log</span>
                                  </button>
                                )}

                                <button
                                  className="btn-icon danger btn-xs"
                                  onClick={() => handleDeletePlan(plan.id, plan.crop_name)}
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: PLAN NEW HARVEST */}
      {/* ======================================================= */}
      {showAddModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-lg">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} className="modal-icon" />
                <h3 className="modal-title-custom">Schedule New Harvest Batch</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePlan}>
              <div className="modal-body-custom">
                {/* Auto fill from Active Planting */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Select from Active Plantings (Optional Quick-Fill)</label>
                  <select
                    className="form-control"
                    value={form.planting_id}
                    onChange={(e) => handlePlantingSelect(e.target.value)}
                  >
                    <option value="">-- Choose Active Planting --</option>
                    {plantings.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.planting_id || 'PL'} - {p.crop_name} ({p.variety_name}) @ {p.location_name || 'Field'} ({p.bed_names || 'Bed 1'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Crop Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={form.crop_name}
                      onChange={(e) => setForm({ ...form, crop_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Variety Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.variety_name}
                      onChange={(e) => setForm({ ...form, variety_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Harvest Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={form.harvest_date}
                      onChange={(e) => setForm({ ...form, harvest_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Harvest Stage</label>
                    <select
                      className="form-control"
                      value={form.harvest_stage}
                      onChange={(e) => setForm({ ...form, harvest_stage: e.target.value })}
                    >
                      <option value="Mature">Mature Full Size</option>
                      <option value="Baby">Baby Greens</option>
                      <option value="Bunch">Bunch</option>
                      <option value="Microgreen">Microgreen</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Location & Bed</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Greenhouse Block A - Bed 1"
                      value={form.location_name}
                      onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Planned Harvest Quantity *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        step="0.5"
                        className="form-control"
                        required
                        value={form.planned_qty}
                        onChange={(e) => setForm({ ...form, planned_qty: parseFloat(e.target.value) || 0 })}
                      />
                      <select
                        className="form-control"
                        style={{ width: '90px' }}
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      >
                        <option value="Ton">Ton</option>
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                        <option value="bunches">bunches</option>
                        <option value="heads">heads</option>
                        <option value="crates">crates</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Container Type</label>
                    <select
                      className="form-control"
                      value={form.container_type}
                      onChange={(e) => setForm({ ...form, container_type: e.target.value })}
                    >
                      <option value="Orange Heavy Crate">Orange Heavy Crate</option>
                      <option value="Green Harvest Tote">Green Harvest Tote</option>
                      <option value="Yellow Open Crate">Yellow Open Crate</option>
                      <option value="Lg Waxed Box">Lg Waxed Box</option>
                      <option value="Mesh Produce Bag">Mesh Produce Bag</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Container Count</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.container_count}
                      onChange={(e) => setForm({ ...form, container_count: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Crew Assignee</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ramesh Kumar, Suresh Patel"
                      value={form.assignee}
                      onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Projected Order Value (₹)</label>
                    <input
                      type="number"
                      step="1"
                      className="form-control"
                      value={form.order_value}
                      onChange={(e) => setForm({ ...form, order_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Scheduling...' : 'Schedule Harvest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: LOG HARVEST COMPLETION */}
      {/* ======================================================= */}
      {showCompleteModal && selectedPlan && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} className="modal-icon green" />
                <h3 className="modal-title-custom">Log Harvest: {selectedPlan.crop_name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowCompleteModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteHarvest}>
              <div className="modal-body-custom">
                <div className="log-summary-box">
                  <div><strong>Crop:</strong> {selectedPlan.crop_name} ({selectedPlan.variety_name})</div>
                  <div><strong>Location:</strong> {selectedPlan.location_name} - {selectedPlan.bed_names}</div>
                  <div><strong>Planned Target:</strong> {selectedPlan.planned_qty} {selectedPlan.unit}</div>
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Actual Harvested Quantity ({selectedPlan.unit}) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    required
                    value={completeForm.actual_harvested_qty}
                    onChange={(e) => setCompleteForm({ ...completeForm, actual_harvested_qty: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Storage / Packhouse Notes</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Washed, hydro-cooled, stored in cold room at 4°C..."
                    value={completeForm.notes}
                    onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCompleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Logging...' : 'Confirm & Save Harvest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
