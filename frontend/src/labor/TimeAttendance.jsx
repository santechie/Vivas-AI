import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Plus, Search, Filter, RefreshCw, Sparkles, X, Edit3, Trash2,
  Check, CheckCircle2, AlertCircle, Play, Square, User, Calendar,
  IndianRupee, MapPin, Layers, Coffee, ShieldCheck, ChevronDown,
  TrendingUp, Users, ArrowRight
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function TimeAttendanceScreen() {
  const [timesheets, setTimesheets] = useState([]);
  const [activeShifts, setActiveShifts] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [workerFilter, setWorkerFilter] = useState('All');
  const [taskFilter, setTaskFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Drawers
  const [showClockInWidget, setShowClockInWidget] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState(null);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [selectedClockOutShift, setSelectedClockOutShift] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Live Clock In Form
  const [clockInForm, setClockInForm] = useState({
    worker_id: '',
    task_type: 'Harvesting & Sorting',
    crop_name: 'Tomatoes',
    field_location: 'Field Block A',
    notes: ''
  });

  // Clock Out Form (Break & Notes)
  const [clockOutForm, setClockOutForm] = useState({
    break_minutes: 0,
    notes: 'Completed scheduled shift tasks.'
  });

  // Manual Timesheet Form
  const [manualForm, setManualForm] = useState({
    worker_id: '',
    work_date: new Date().toISOString().slice(0, 10),
    clock_in_time: '07:30',
    clock_out_time: '16:00',
    break_minutes: 30,
    task_type: 'Field Bed Preparation',
    crop_name: 'Tomatoes',
    field_location: 'Field Block A',
    hourly_rate: 140.0,
    status: 'pending',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, aRes, wRes, sRes, crRes] = await Promise.all([
        fetch(`${API_BASE}/labor/timesheets?status=${statusFilter}&worker_id=${workerFilter}&task_type=${taskFilter}&date=${dateFilter}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`${API_BASE}/labor/timesheets/active`),
        fetch(`${API_BASE}/labor/workers?status=active`),
        fetch(`${API_BASE}/labor/timesheets/stats`),
        fetch(`${API_BASE}/crops?status=active`)
      ]);

      const tData = await tRes.json();
      const aData = await aRes.json();
      const wData = await wRes.json();
      const sData = await sRes.json();
      const crData = await crRes.json();

      if (tData.success) setTimesheets(tData.data);
      if (aData.success) setActiveShifts(aData.data);
      if (wData.success) {
        setWorkers(wData.data);
        if (!clockInForm.worker_id && wData.data.length > 0) {
          setClockInForm(prev => ({ ...prev, worker_id: wData.data[0].id }));
        }
      }
      if (sData.success) setStats(sData.data);
      if (crData.success) setCrops(crData.data);
    } catch (err) {
      console.error('Error fetching time & attendance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, workerFilter, taskFilter, dateFilter, searchQuery]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Clock In Submit
  const handleClockIn = async (e) => {
    e.preventDefault();
    if (!clockInForm.worker_id) {
      alert('Please select a worker to clock in');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/labor/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clockInForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('Clock in error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Clock Out Modal
  const openClockOutModal = (shift) => {
    setSelectedClockOutShift(shift);
    setClockOutForm({
      break_minutes: 30,
      notes: `Shift completed for ${shift.task_type}`
    });
    setShowClockOutModal(true);
  };

  // Submit Clock Out
  const handleClockOut = async (e) => {
    e.preventDefault();
    if (!selectedClockOutShift) return;

    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/labor/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timesheet_id: selectedClockOutShift.id,
          ...clockOutForm
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setShowClockOutModal(false);
        setSelectedClockOutShift(null);
        fetchData();
      }
    } catch (err) {
      console.error('Clock out error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Approve / Reject Single Timesheet
  const handleApproval = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/labor/timesheets/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approved_by: 'Farm Manager' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Timesheet marked as ${status}`);
        fetchData();
      }
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/labor/timesheets/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, approved_by: 'Farm Manager' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setSelectedIds([]);
        fetchData();
      }
    } catch (err) {
      console.error('Bulk approve error:', err);
    }
  };

  // Open Manual Timesheet Drawer
  const openManualDrawer = () => {
    setEditingTimesheet(null);
    const defaultWorker = workers[0];
    setManualForm({
      worker_id: defaultWorker?.id || '',
      work_date: new Date().toISOString().slice(0, 10),
      clock_in_time: '07:30',
      clock_out_time: '16:00',
      break_minutes: 30,
      task_type: 'Harvesting & Sorting',
      crop_name: 'Tomatoes',
      field_location: 'Field Block A',
      hourly_rate: defaultWorker?.hourly_rate || 140.0,
      status: 'pending',
      notes: ''
    });
    setShowManualModal(true);
  };

  // Open Edit Timesheet Drawer
  const openEditDrawer = (ts) => {
    setEditingTimesheet(ts);
    const inTime = ts.clock_in_time ? ts.clock_in_time.slice(11, 16) : '07:30';
    const outTime = ts.clock_out_time ? ts.clock_out_time.slice(11, 16) : '16:00';

    setManualForm({
      worker_id: ts.worker_id,
      work_date: ts.work_date ? ts.work_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      clock_in_time: inTime,
      clock_out_time: outTime,
      break_minutes: ts.break_minutes || 0,
      total_hours: ts.total_hours || 8.0,
      task_type: ts.task_type || 'General Farm Work',
      crop_name: ts.crop_name || 'General',
      field_location: ts.field_location || 'Field Block A',
      hourly_rate: parseFloat(ts.hourly_rate) || 120.0,
      status: ts.status || 'pending',
      notes: ts.notes || ''
    });
    setShowManualModal(true);
  };

  // Save Manual Timesheet
  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (!manualForm.worker_id) {
      alert('Please select a worker');
      return;
    }

    try {
      setIsSaving(true);
      const url = editingTimesheet
        ? `${API_BASE}/labor/timesheets/${editingTimesheet.id}`
        : `${API_BASE}/labor/timesheets`;
      const method = editingTimesheet ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingTimesheet ? 'Timesheet updated' : 'Manual timesheet recorded');
        setShowManualModal(false);
        setEditingTimesheet(null);
        fetchData();
      }
    } catch (err) {
      console.error('Save manual timesheet error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Timesheet
  const handleDeleteTimesheet = async (id, workerName) => {
    if (!window.confirm(`Delete timesheet entry for ${workerName}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/labor/timesheets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Timesheet deleted');
        fetchData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === timesheets.length) setSelectedIds([]);
    else setSelectedIds(timesheets.map(t => t.id));
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const taskOptions = [
    'All', 'Harvesting & Sorting', 'Field Bed Preparation',
    'Greenhouse Seeding', 'Packhouse Packing', 'Irrigation & Fertigation',
    'Weeding & Cultivation', 'Equipment Maintenance', 'General Farm Work'
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
          <div className="grow-badge" style={{ background: '#ede9fe', color: '#6d28d9' }}>LABOR & WORKFORCE</div>
          <h1 className="grow-title">Time & Attendance</h1>
          <p className="grow-subtitle">Live clock-in tracking, daily shift logs, task time allocation, and manager timesheet approvals</p>
        </div>

        <div className="grow-header-right">
          <div className="season-kpi-badge" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
            <span className="kpi-label">TOTAL LABOR EXPENDITURE</span>
            <span className="kpi-value">₹{stats ? Number(stats.total_labor_cost).toLocaleString() : '0'}</span>
          </div>

          <button className="btn btn-primary" onClick={openManualDrawer}>
            <Plus size={16} />
            <span>Add Timesheet</span>
          </button>
        </div>
      </div>

      {/* METRIC STRIP */}
      {stats && (
        <div className="crop-stats-strip">
          <div className="stat-card-mini">
            <span className="stat-num">{stats.total_timesheets}</span>
            <span className="stat-lbl">Timesheet Entries</span>
          </div>
          <div className="stat-card-mini green">
            <span className="stat-num">{Number(stats.total_logged_hours || 0).toFixed(1)} hrs</span>
            <span className="stat-lbl">Total Logged Hours</span>
          </div>
          <div className="stat-card-mini orange">
            <span className="stat-num">{stats.active_clocked_in_count}</span>
            <span className="stat-lbl">Currently Clocked In</span>
          </div>
          <div className="stat-card-mini red">
            <span className="stat-num">{stats.pending_approval_count}</span>
            <span className="stat-lbl">Pending Approval</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">₹{Number(stats.avg_hourly_rate || 125).toFixed(0)}/hr</span>
            <span className="stat-lbl">Avg Hourly Rate</span>
          </div>
        </div>
      )}

      {/* LIVE CLOCK-IN & ACTIVE SHIFTS WIDGET */}
      <div className="grow-table-card" style={{ marginBottom: '20px', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="pulse-indicator" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              Live Shift Tracker ({activeShifts.length} Active On Field)
            </h3>
          </div>
          <button
            className="btn btn-secondary btn-xs"
            onClick={() => setShowClockInWidget(!showClockInWidget)}
          >
            {showClockInWidget ? 'Hide Clock-In Bar' : 'Show Clock-In Bar'}
          </button>
        </div>

        {showClockInWidget && (
          <form onSubmit={handleClockIn} className="clock-in-inline-bar">
            <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
              <select
                className="form-control"
                value={clockInForm.worker_id}
                onChange={(e) => setClockInForm({ ...clockInForm, worker_id: e.target.value })}
              >
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
              <select
                className="form-control"
                value={clockInForm.task_type}
                onChange={(e) => setClockInForm({ ...clockInForm, task_type: e.target.value })}
              >
                {taskOptions.filter(x => x !== 'All').map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
              <select
                className="form-control"
                value={clockInForm.crop_name}
                onChange={(e) => setClockInForm({ ...clockInForm, crop_name: e.target.value })}
              >
                <option value="General">General / None</option>
                {crops.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Field Block / Zone"
                value={clockInForm.field_location}
                onChange={(e) => setClockInForm({ ...clockInForm, field_location: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Play size={14} />
              <span>Start Shift</span>
            </button>
          </form>
        )}

        {/* Active Clocked-in Worker Cards */}
        {activeShifts.length > 0 && (
          <div className="active-shifts-grid" style={{ marginTop: '16px' }}>
            {activeShifts.map((shift) => (
              <div key={shift.id} className="active-shift-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="worker-avatar-circle" style={{ background: shift.avatar_color || '#0284c7' }}>
                      {shift.worker_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{shift.worker_name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{shift.task_type}</div>
                    </div>
                  </div>

                  <span className="live-clock-badge">
                    <Clock size={12} />
                    <span>In: {shift.clock_in_time ? shift.clock_in_time.slice(11, 16) : 'Now'}</span>
                  </span>
                </div>

                <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Zone: <strong>{shift.field_location}</strong></span>
                  <span>Crop: <strong>{shift.crop_name || 'General'}</strong></span>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => openClockOutModal(shift)}
                  >
                    <Square size={12} style={{ color: '#e11d48' }} />
                    <span>End Shift</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TOOLBAR & FILTERS */}
      <div className="grow-toolbar">
        {/* Status Tabs */}
        <div className="view-mode-tabs">
          {['All', 'active', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              className={`view-tab-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              <span>{st === 'All' ? 'All Timesheets' : (st === 'active' ? 'Clocked In' : (st === 'pending' ? 'Pending Approval' : st))}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="grow-search-input"
            placeholder="Search worker, task, crop, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="grow-filter-group">
          <div className="filter-pill-select">
            <span className="filter-label">Worker:</span>
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
            >
              <option value="All">All Workers</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-pill-select">
            <span className="filter-label">Task:</span>
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
            >
              {taskOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bulk-action-bar">
          <span><strong>{selectedIds.length}</strong> timesheets selected</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-xs" onClick={handleBulkApprove}>
              <Check size={13} />
              <span>Approve Selected</span>
            </button>
            <button className="btn btn-secondary btn-xs" onClick={() => setSelectedIds([])}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* TIMESHEETS DATA TABLE */}
      {loading ? (
        <div className="timeline-loading">Loading timesheets...</div>
      ) : timesheets.length === 0 ? (
        <div className="harvest-empty-card">
          <Clock size={42} />
          <h3>No timesheet records match your filter</h3>
          <p>Start live shifts or add manual timesheets for your farm workers.</p>
          <button className="btn btn-primary" onClick={openManualDrawer}>
            + Add Manual Timesheet
          </button>
        </div>
      ) : (
        <div className="grow-table-card">
          <table className="grow-data-table">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === timesheets.length && timesheets.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ width: '20%' }}>Worker & Employee ID</th>
                <th style={{ width: '12%' }}>Date & Shift</th>
                <th style={{ width: '18%' }}>Task & Linked Crop</th>
                <th style={{ width: '10%' }}>Hours Logged</th>
                <th style={{ width: '12%' }}>Hourly Rate & Cost</th>
                <th style={{ width: '12%' }}>Approval Status</th>
                <th style={{ width: '12%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map((ts) => {
                const isSelected = selectedIds.includes(ts.id);
                const isApproved = ts.status === 'approved';
                const isPending = ts.status === 'pending';
                const isActive = ts.status === 'active';

                return (
                  <tr key={ts.id} className={isSelected ? 'row-selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(ts.id)}
                      />
                    </td>

                    {/* Worker */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="worker-avatar-circle" style={{ background: ts.avatar_color || '#0284c7' }}>
                          {ts.worker_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{ts.worker_name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {ts.worker_role || 'Field Crew'} • {ts.field_location}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date & Shift Times */}
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 600 }}>
                        {ts.work_date ? ts.work_date.slice(0, 10) : 'Today'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {ts.clock_in_time ? ts.clock_in_time.slice(11, 16) : '—'} → {ts.clock_out_time ? ts.clock_out_time.slice(11, 16) : (isActive ? 'Active' : '—')}
                      </div>
                    </td>

                    {/* Task & Crop */}
                    <td>
                      <span className="day-pill" style={{ fontWeight: 700 }}>
                        {ts.task_type}
                      </span>
                      {ts.crop_name && (
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                          🌱 {ts.crop_name}
                        </div>
                      )}
                    </td>

                    {/* Hours */}
                    <td>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                        {parseFloat(ts.total_hours || 0).toFixed(1)} hrs
                      </strong>
                      {ts.break_minutes > 0 && (
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                          Break: {ts.break_minutes}m
                        </div>
                      )}
                    </td>

                    {/* Cost */}
                    <td>
                      <strong style={{ color: '#047857', fontSize: '13.5px' }}>
                        ₹{Number(ts.total_labor_cost || (ts.total_hours * ts.hourly_rate) || 0).toLocaleString()}
                      </strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        @ ₹{ts.hourly_rate}/hr
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-toggle-btn ${isApproved ? 'active' : (isActive ? 'active' : 'inactive')}`}>
                        {ts.status}
                      </span>
                      {ts.approved_by && (
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          By {ts.approved_by}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {isPending && (
                          <>
                            <button
                              className="btn-icon"
                              style={{ color: '#16a34a' }}
                              onClick={() => handleApproval(ts.id, 'approved')}
                              title="Approve Timesheet"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={() => handleApproval(ts.id, 'rejected')}
                              title="Reject Timesheet"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() => openEditDrawer(ts)}
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteTimesheet(ts.id, ts.worker_name)}
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
      )}

      {/* ======================================================= */}
      {/* MODAL: MANUAL TIMESHEET CREATION / EDIT */}
      {/* ======================================================= */}
      {showManualModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-xl">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  {editingTimesheet ? `Edit Timesheet: ${editingTimesheet.worker_name}` : 'Log Manual Timesheet Entry'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowManualModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManual}>
              <div className="modal-body-custom">
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Select Worker *</label>
                    <select
                      className="form-control"
                      value={manualForm.worker_id}
                      onChange={(e) => {
                        const w = workers.find(x => x.id === e.target.value);
                        setManualForm({
                          ...manualForm,
                          worker_id: e.target.value,
                          hourly_rate: w ? parseFloat(w.hourly_rate) : manualForm.hourly_rate
                        });
                      }}
                    >
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Work Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={manualForm.work_date}
                      onChange={(e) => setManualForm({ ...manualForm, work_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Hourly Pay Rate (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualForm.hourly_rate}
                      onChange={(e) => setManualForm({ ...manualForm, hourly_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Start Time (In)</label>
                    <input
                      type="time"
                      className="form-control"
                      value={manualForm.clock_in_time}
                      onChange={(e) => setManualForm({ ...manualForm, clock_in_time: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Time (Out)</label>
                    <input
                      type="time"
                      className="form-control"
                      value={manualForm.clock_out_time}
                      onChange={(e) => setManualForm({ ...manualForm, clock_out_time: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Unpaid Break (Minutes)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualForm.break_minutes}
                      onChange={(e) => setManualForm({ ...manualForm, break_minutes: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Task Type *</label>
                    <select
                      className="form-control"
                      value={manualForm.task_type}
                      onChange={(e) => setManualForm({ ...manualForm, task_type: e.target.value })}
                    >
                      {taskOptions.filter(x => x !== 'All').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Linked Crop</label>
                    <select
                      className="form-control"
                      value={manualForm.crop_name}
                      onChange={(e) => setManualForm({ ...manualForm, crop_name: e.target.value })}
                    >
                      <option value="General">General / None</option>
                      {crops.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Field Location / Zone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={manualForm.field_location}
                      onChange={(e) => setManualForm({ ...manualForm, field_location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Manager Notes / Shift Summary</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Work performed, crates harvested, field bed numbers..."
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowManualModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : editingTimesheet ? 'Update Timesheet' : 'Save Timesheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: CLOCK OUT CONFIRMATION */}
      {/* ======================================================= */}
      {showClockOutModal && selectedClockOutShift && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-md">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Square size={20} className="modal-icon" style={{ color: '#e11d48' }} />
                <h3 className="modal-title-custom">
                  Clock Out: {selectedClockOutShift.worker_name}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowClockOutModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleClockOut}>
              <div className="modal-body-custom">
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '14px' }}>
                  <div><strong>Task:</strong> {selectedClockOutShift.task_type}</div>
                  <div><strong>Location:</strong> {selectedClockOutShift.field_location}</div>
                  <div><strong>Clock-In Time:</strong> {selectedClockOutShift.clock_in_time?.slice(11, 16)}</div>
                </div>

                <div className="form-group">
                  <label>Total Break Taken (Minutes)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={clockOutForm.break_minutes}
                    onChange={(e) => setClockOutForm({ ...clockOutForm, break_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Shift Notes</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    value={clockOutForm.notes}
                    onChange={(e) => setClockOutForm({ ...clockOutForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowClockOutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Clocking Out...' : 'Complete Clock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
