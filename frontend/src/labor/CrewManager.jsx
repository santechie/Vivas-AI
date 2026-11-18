import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Search, Filter, RefreshCw, Sparkles, X, Edit3, Trash2,
  Check, AlertCircle, Phone, Mail, MapPin, IndianRupee, Calendar,
  Shield, UserCheck, UserX, Clock, ChevronDown, CheckCircle2,
  Briefcase, Award, TrendingUp, Grid, List, ArrowRight, User
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function CrewManagerScreen() {
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals & Drawers
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Quick Timesheet Modal
  const [showQuickTimesheet, setShowQuickTimesheet] = useState(false);
  const [selectedWorkerForTimesheet, setSelectedWorkerForTimesheet] = useState(null);
  const [quickTimesheetForm, setQuickTimesheetForm] = useState({
    work_date: new Date().toISOString().slice(0, 10),
    clock_in_time: '08:00',
    clock_out_time: '16:30',
    break_minutes: 30,
    task_type: 'Harvesting & Sorting',
    crop_name: 'Tomatoes',
    field_location: 'Field Block A',
    notes: 'Logged via Crew Manager shortcut.'
  });

  // Worker Form state
  const [formData, setFormData] = useState({
    employee_code: '',
    name: '',
    email: '',
    phone: '',
    role: 'Seasonal Harvest Crew',
    employment_type: 'Full-Time',
    hourly_rate: 130,
    overtime_rate: 195,
    assigned_location: 'Field Block A & B',
    status: 'active',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    hire_date: new Date().toISOString().slice(0, 10),
    avatar_color: '#059669',
    notes: ''
  });

  const rolesList = [
    'Lead Farm Operator',
    'Field & Harvest Lead',
    'Nursery & Greenhouse Tech',
    'Packhouse & Fulfillment Specialist',
    'Seasonal Harvest Crew',
    'Irrigation & Maintenance Tech',
    'Agronomist',
    'Farm Manager'
  ];

  const employmentTypes = ['Full-Time', 'Part-Time', 'Seasonal / Daily Wage', 'Contractor'];
  const locationsList = [
    'Field Block A & B',
    'Field Blocks B & C',
    'Greenhouses 1 & 2',
    'Packhouse & Cold Storage',
    'Tractor Shed & Field Block A',
    'Pumps & Fertigation Shed',
    'General Farmwide'
  ];

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resWorkers, resStats] = await Promise.all([
        fetch(`${API_BASE}/labor/workers`),
        fetch(`${API_BASE}/labor/workers/stats`)
      ]);

      if (resWorkers.ok) {
        const json = await resWorkers.json();
        const list = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
        setWorkers(list);
      }
      if (resStats.ok) {
        const json = await resStats.json();
        setStats(json.data || json);
      }
    } catch (err) {
      console.error('Failed to load crew data:', err);
      showToast('Could not fetch crew records from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    if (!Array.isArray(workers)) return [];
    return workers.filter(w => {
      const wStatus = (w.status || 'active').toLowerCase();
      if (statusFilter !== 'All' && wStatus !== statusFilter.toLowerCase()) return false;
      if (roleFilter !== 'All' && w.role !== roleFilter) return false;
      if (typeFilter !== 'All' && w.employment_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (w.name || `${w.first_name || ''} ${w.last_name || ''}`).toLowerCase();
        const code = (w.employee_code || w.worker_code || '').toLowerCase();
        const email = (w.email || '').toLowerCase();
        const phone = (w.phone || '').toLowerCase();
        const role = (w.role || '').toLowerCase();
        const loc = (w.assigned_location || w.assigned_zone || '').toLowerCase();
        if (!name.includes(q) && !code.includes(q) && !email.includes(q) && !phone.includes(q) && !role.includes(q) && !loc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [workers, statusFilter, roleFilter, typeFilter, searchQuery]);

  const openAddDrawer = () => {
    setEditingWorker(null);
    const nextNum = (Array.isArray(workers) ? workers.length : 0) + 1;
    const code = `EMP-${String(nextNum).padStart(3, '0')}`;
    setFormData({
      employee_code: code,
      name: '',
      email: '',
      phone: '',
      role: 'Seasonal Harvest Crew',
      employment_type: 'Full-Time',
      hourly_rate: 130,
      overtime_rate: 195,
      assigned_location: 'Field Block A & B',
      status: 'active',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      hire_date: new Date().toISOString().slice(0, 10),
      avatar_color: '#059669',
      notes: ''
    });
    setShowDrawer(true);
  };

  const openEditDrawer = (worker) => {
    setEditingWorker(worker);
    setFormData({
      employee_code: worker.employee_code || worker.worker_code || '',
      name: worker.name || `${worker.first_name || ''} ${worker.last_name || ''}`.trim(),
      email: worker.email || '',
      phone: worker.phone || '',
      role: worker.role || 'Seasonal Harvest Crew',
      employment_type: worker.employment_type || 'Full-Time',
      hourly_rate: worker.hourly_rate || 130,
      overtime_rate: worker.overtime_rate || (Number(worker.hourly_rate || 130) * 1.5),
      assigned_location: worker.assigned_location || worker.assigned_zone || 'Field Block A & B',
      status: worker.status || 'active',
      emergency_contact_name: worker.emergency_contact_name || '',
      emergency_contact_phone: worker.emergency_contact_phone || '',
      hire_date: worker.hire_date ? String(worker.hire_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      avatar_color: worker.avatar_color || '#059669',
      notes: worker.notes || ''
    });
    setShowDrawer(true);
  };

  const handleSaveWorker = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Worker name is required.', 'error');
      return;
    }
    if (!formData.hourly_rate || Number(formData.hourly_rate) <= 0) {
      showToast('Hourly rate must be greater than 0.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        employee_code: formData.employee_code,
        name: formData.name,
        role: formData.role,
        employment_type: formData.employment_type,
        hourly_rate: parseFloat(formData.hourly_rate),
        overtime_rate: parseFloat(formData.overtime_rate) || (parseFloat(formData.hourly_rate) * 1.5),
        phone: formData.phone,
        email: formData.email,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        hire_date: formData.hire_date,
        assigned_location: formData.assigned_location,
        status: formData.status,
        avatar_color: formData.avatar_color,
        notes: formData.notes
      };

      let res;
      if (editingWorker) {
        res = await fetch(`${API_BASE}/labor/workers/${editingWorker.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/labor/workers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingWorker ? 'Worker profile updated!' : 'New worker registered successfully!');
        setShowDrawer(false);
        fetchData();
      } else {
        const errData = await res.json();
        showToast(errData.error || errData.message || 'Failed to save worker.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error while saving worker.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorker = async (worker) => {
    const displayName = worker.name || worker.employee_code || 'this worker';
    if (!window.confirm(`Are you sure you want to remove ${displayName}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/labor/workers/${worker.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Removed worker ${displayName}`);
        fetchData();
      } else {
        const errData = await res.json();
        showToast(errData.error || errData.message || 'Failed to delete worker.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting worker.', 'error');
    }
  };

  const openQuickTimesheet = (worker) => {
    setSelectedWorkerForTimesheet(worker);
    setQuickTimesheetForm({
      work_date: new Date().toISOString().slice(0, 10),
      clock_in_time: '08:00',
      clock_out_time: '16:30',
      break_minutes: 30,
      task_type: 'Harvesting & Sorting',
      crop_name: 'Tomatoes',
      field_location: worker.assigned_location || 'Field Block A & B',
      notes: `Logged shift for ${worker.name || worker.employee_code}.`
    });
    setShowQuickTimesheet(true);
  };

  const handleSaveQuickTimesheet = async (e) => {
    e.preventDefault();
    if (!selectedWorkerForTimesheet) return;

    setIsSaving(true);
    try {
      const payload = {
        worker_id: selectedWorkerForTimesheet.id,
        work_date: quickTimesheetForm.work_date,
        clock_in: `${quickTimesheetForm.work_date}T${quickTimesheetForm.clock_in_time}:00`,
        clock_out: `${quickTimesheetForm.work_date}T${quickTimesheetForm.clock_out_time}:00`,
        break_minutes: parseInt(quickTimesheetForm.break_minutes) || 0,
        hourly_rate: selectedWorkerForTimesheet.hourly_rate,
        overtime_rate: selectedWorkerForTimesheet.overtime_rate || (Number(selectedWorkerForTimesheet.hourly_rate) * 1.5),
        task_type: quickTimesheetForm.task_type,
        crop_name: quickTimesheetForm.crop_name,
        field_location: quickTimesheetForm.field_location,
        status: 'Approved',
        notes: quickTimesheetForm.notes
      };

      const res = await fetch(`${API_BASE}/labor/timesheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(`Timesheet logged and approved for ${selectedWorkerForTimesheet.name || selectedWorkerForTimesheet.employee_code}!`);
        setShowQuickTimesheet(false);
        fetchData();
      } else {
        const errData = await res.json();
        showToast(errData.error || errData.message || 'Failed to log timesheet.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving timesheet.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeStyle = (role = '') => {
    if (role.includes('Lead') || role.includes('Manager')) {
      return { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' };
    } else if (role.includes('Harvest')) {
      return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    } else if (role.includes('Packhouse')) {
      return { bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' };
    } else if (role.includes('Irrigation') || role.includes('Operator')) {
      return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    }
    return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  };

  const getStatusBadgeStyle = (status = 'active') => {
    const s = String(status).toLowerCase();
    if (s === 'active') {
      return { bg: '#dcfce7', color: '#15803d', border: '#86efac', dot: '#22c55e', text: 'Active' };
    } else if (s === 'inactive') {
      return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', dot: '#ef4444', text: 'Inactive' };
    }
    return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', dot: '#f59e0b', text: 'On Leave' };
  };

  const getInitials = (name = 'W') => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="grow-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100%', color: '#1e293b' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: notification.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
          fontWeight: 500,
          fontSize: '14px',
          animation: 'slideIn 0.2s ease-out'
        }}>
          {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="grow-header" style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: '#ede9fe', color: '#6d28d9', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            LABOR & WORKFORCE
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Crew & Workers Directory
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Manage team roster, hourly pay rates, role allocations, emergency contacts, and timesheet logs
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={openAddDrawer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              backgroundColor: '#059669',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
            }}
          >
            <Plus size={16} />
            Register New Worker
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#f0fdf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#16a34a'
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Crew Members
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {stats?.total_crew || workers.length}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#ecfdf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669'
          }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active on Roster
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
              {stats?.active_count || workers.filter(w => (w.status || 'active').toLowerCase() === 'active').length}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb'
          }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Full-Time Regulars
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#1e40af', marginTop: '2px' }}>
              {stats?.full_time_count || workers.filter(w => w.employment_type === 'Full-Time').length}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d97706'
          }}>
            <IndianRupee size={22} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Avg Hourly Wage
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#92400e', marginTop: '2px' }}>
              ₹{Math.round(parseFloat(stats?.avg_hourly_rate || (workers.reduce((acc, w) => acc + Number(w.hourly_rate || 0), 0) / (workers.length || 1))))}/hr
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by worker name, ID, role, zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Roles</option>
            {rolesList.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Employment Types</option>
            {employmentTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            padding: '2px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600
              }}
              title="Grid Cards"
            >
              <Grid size={15} />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600
              }}
              title="Table View"
            >
              <List size={15} />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: '#059669', margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '14px', color: '#64748b' }}>Loading team members roster...</div>
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <Users size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 6px 0' }}>No crew members match filters</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Try adjusting your search query or reset filter dropdowns.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('All'); setRoleFilter('All'); setTypeFilter('All'); }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '18px'
        }}>
          {filteredWorkers.map(w => {
            const roleStyle = getRoleBadgeStyle(w.role);
            const statusStyle = getStatusBadgeStyle(w.status);
            const displayName = w.name || `${w.first_name || ''} ${w.last_name || ''}`.trim() || 'Worker';
            const initials = getInitials(displayName);
            const avatarBg = w.avatar_color || '#059669';

            return (
              <div
                key={w.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Card Top Banner / Worker Header */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: avatarBg,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '17px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        {initials}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                            {displayName}
                          </h3>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569'
                          }}>
                            {w.employee_code || w.worker_code}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: roleStyle.bg,
                            color: roleStyle.color,
                            border: `1px solid ${roleStyle.border}`
                          }}>
                            {w.role}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#f8fafc',
                            color: '#64748b',
                            border: '1px solid #e2e8f0'
                          }}>
                            {w.employment_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.border}`
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusStyle.dot }} />
                      {statusStyle.text}
                    </span>
                  </div>
                </div>

                {/* Card Body Information */}
                <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  {/* Pay Rate & Zone */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    backgroundColor: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Hourly Rate</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                        ₹{Number(w.hourly_rate || 0)}/hr
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Assigned Location</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} style={{ color: '#059669' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {w.assigned_location || w.assigned_zone || 'Farmwide'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    {w.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                        <Phone size={14} style={{ color: '#94a3b8' }} />
                        <span>{w.phone}</span>
                      </div>
                    )}
                    {w.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                        <Mail size={14} style={{ color: '#94a3b8' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.email}</span>
                      </div>
                    )}
                    {w.emergency_contact_name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                        <Shield size={14} style={{ color: '#e11d48' }} />
                        <span style={{ fontSize: '12px' }}>
                          ICE: {w.emergency_contact_name} ({w.emergency_contact_phone || 'No phone'})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Logged stats */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: '#64748b' }}>Logged: <strong style={{ color: '#0f172a' }}>{Number(w.total_logged_hours || 0).toFixed(1)} hrs</strong></span>
                    <span style={{ color: '#64748b' }}>Payout: <strong style={{ color: '#059669' }}>₹{Number(w.total_earnings || 0).toLocaleString('en-IN')}</strong></span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{
                  padding: '12px 20px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => openQuickTimesheet(w)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      backgroundColor: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#059669',
                      cursor: 'pointer'
                    }}
                    title="Log timesheet shift for worker"
                  >
                    <Clock size={13} />
                    Log Shift
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => openEditDrawer(w)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteWorker(w)}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #fee2e2',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#ef4444',
                        cursor: 'pointer'
                      }}
                      title="Delete worker profile"
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
        /* Table View */
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Worker Name & ID</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Hourly Rate</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Assigned Location</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Contact Info</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((w, idx) => {
                  const roleStyle = getRoleBadgeStyle(w.role);
                  const statusStyle = getStatusBadgeStyle(w.status);
                  const displayName = w.name || `${w.first_name || ''} ${w.last_name || ''}`.trim() || 'Worker';
                  const initials = getInitials(displayName);
                  const avatarBg = w.avatar_color || '#059669';

                  return (
                    <tr
                      key={w.id}
                      style={{
                        borderBottom: idx !== filteredWorkers.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.1s'
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: avatarBg,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px'
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {displayName}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{w.employee_code || w.worker_code}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: roleStyle.bg,
                          color: roleStyle.color,
                          border: `1px solid ${roleStyle.border}`
                        }}>
                          {w.role}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {w.employment_type}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                        ₹{Number(w.hourly_rate || 0)}/hr
                      </td>

                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} style={{ color: '#059669' }} />
                          {w.assigned_location || w.assigned_zone || 'General'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        <div>{w.phone || '—'}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{w.email || ''}</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.border}`
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusStyle.dot }} />
                          {statusStyle.text}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => openQuickTimesheet(w)}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#059669',
                              cursor: 'pointer'
                            }}
                            title="Log Shift"
                          >
                            <Clock size={13} />
                          </button>
                          <button
                            onClick={() => openEditDrawer(w)}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteWorker(w)}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #fee2e2',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
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
      )}

      {/* Drawer: Add / Edit Worker Profile */}
      {showDrawer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: '#ffffff',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
            animation: 'slideLeft 0.25s ease-out'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669'
                }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                    {editingWorker ? 'Edit Worker Profile' : 'Register New Worker'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    {editingWorker ? `Updating details for ${editingWorker.employee_code || editingWorker.worker_code}` : 'Add a new farm crew member with wage and contact info.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDrawer(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSaveWorker} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Row 1: Code & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    placeholder="EMP-001"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Full Name & Avatar Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Avatar Color
                  </label>
                  <input
                    type="color"
                    value={formData.avatar_color}
                    onChange={(e) => setFormData({ ...formData, avatar_color: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '2px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Role & Employment Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Role / Position *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {rolesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Employment Type
                  </label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {employmentTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Wage Rates */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Standard Hourly Rate (₹/hr) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={formData.hourly_rate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          hourly_rate: val,
                          overtime_rate: (parseFloat(val) * 1.5).toFixed(2)
                        });
                      }}
                      placeholder="130"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 26px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Overtime Rate (1.5x)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={formData.overtime_rate}
                      onChange={(e) => setFormData({ ...formData, overtime_rate: e.target.value })}
                      placeholder="195"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 26px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Zone & Hire Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Assigned Farm Location
                  </label>
                  <select
                    value={formData.assigned_location}
                    onChange={(e) => setFormData({ ...formData, assigned_location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {locationsList.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Hire Date
                  </label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Row 6: Contact Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="worker@vivasai.farm"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Row 7: Emergency Contacts */}
              <div style={{
                backgroundColor: '#fff1f2',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #fecdd3'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#be123c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={14} />
                  Emergency Contact Details (In Case of Emergency)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#881337', marginBottom: '4px' }}>
                      Contact Name & Relation
                    </label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      placeholder="e.g. Kavitha (Spouse)"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #f43f5e',
                        fontSize: '12px',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#881337', marginBottom: '4px' }}>
                      Emergency Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      placeholder="+91 91234 56789"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #f43f5e',
                        fontSize: '12px',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 8: Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Internal Notes & Certifications
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Specializations, equipment licenses, crop preferences..."
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Drawer Action Footer */}
              <div style={{
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '9px 24px',
                    backgroundColor: '#059669',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSaving && <RefreshCw size={14} className="animate-spin" />}
                  {editingWorker ? 'Save Changes' : 'Register Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Log Timesheet */}
      {showQuickTimesheet && selectedWorkerForTimesheet && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} style={{ color: '#059669' }} />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  Log Shift for {selectedWorkerForTimesheet.name || selectedWorkerForTimesheet.employee_code}
                </h3>
              </div>
              <button
                onClick={() => setShowQuickTimesheet(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickTimesheet} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Work Date</label>
                <input
                  type="date"
                  required
                  value={quickTimesheetForm.work_date}
                  onChange={(e) => setQuickTimesheetForm({ ...quickTimesheetForm, work_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Clock In</label>
                  <input
                    type="time"
                    required
                    value={quickTimesheetForm.clock_in_time}
                    onChange={(e) => setQuickTimesheetForm({ ...quickTimesheetForm, clock_in_time: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Clock Out</label>
                  <input
                    type="time"
                    required
                    value={quickTimesheetForm.clock_out_time}
                    onChange={(e) => setQuickTimesheetForm({ ...quickTimesheetForm, clock_out_time: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Task Type</label>
                  <select
                    value={quickTimesheetForm.task_type}
                    onChange={(e) => setQuickTimesheetForm({ ...quickTimesheetForm, task_type: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="Harvesting & Sorting">Harvesting & Sorting</option>
                    <option value="Field Bed Preparation">Field Bed Preparation</option>
                    <option value="Greenhouse Seeding">Greenhouse Seeding</option>
                    <option value="Transplanting">Transplanting</option>
                    <option value="Packhouse Packing">Packhouse Packing</option>
                    <option value="Irrigation & Fertigation">Irrigation & Fertigation</option>
                    <option value="Equipment Maintenance">Equipment Maintenance</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Crop</label>
                  <select
                    value={quickTimesheetForm.crop_name}
                    onChange={(e) => setQuickTimesheetForm({ ...quickTimesheetForm, crop_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="Tomatoes">Tomatoes</option>
                    <option value="Basil">Basil</option>
                    <option value="Microgreens">Microgreens</option>
                    <option value="Cucumbers">Cucumbers</option>
                    <option value="Bell Peppers">Bell Peppers</option>
                    <option value="General">General / Farmwide</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Unpaid Break (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={quickTimesheetForm.break_minutes}
                  onChange={(e) => setQuickTimesheetForm({ ...quickTimesheetForm, break_minutes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickTimesheet(false)}
                  style={{ padding: '8px 14px', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: '#059669',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Log & Approve Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
