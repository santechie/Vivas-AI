import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, ShieldCheck, Mail, Phone, DollarSign,
  Edit2, Trash2, Search, CheckCircle2, AlertCircle, RefreshCw, X, Lock, Check
} from 'lucide-react';

export default function UsersRolesSettings({ apiBase, farmId }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // User modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState('create');
  const [activeUser, setActiveUser] = useState({
    id: null,
    name: '',
    email: '',
    phone: '',
    role_id: '',
    hourly_rate: 0,
    is_active: true
  });

  // Role modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [activeRole, setActiveRole] = useState({
    name: '',
    description: '',
    permissions: {
      crop_plan: true,
      tasks: true,
      inventory: true,
      orders: false,
      settings: false,
      labor_rates: false
    }
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${apiBase}/api/settings/users?farm_id=${farmId}`),
        fetch(`${apiBase}/api/settings/roles?farm_id=${farmId}`)
      ]);
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      if (usersData.success) setUsers(usersData.users || usersData.data || []);
      if (rolesData.success) setRoles(rolesData.roles || rolesData.data || []);
    } catch (err) {
      showToast('error', 'Failed to fetch team members and roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [farmId]);

  const handleOpenCreateUser = () => {
    setUserModalMode('create');
    setActiveUser({
      id: null,
      name: '',
      email: '',
      phone: '',
      role_id: roles[0]?.id || '',
      hourly_rate: 0,
      is_active: true
    });
    setErrors({});
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u) => {
    setUserModalMode('edit');
    setActiveUser({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role_id: u.role_id || (roles.find(r => r.name === u.role)?.id || ''),
      hourly_rate: u.hourly_rate || 0,
      is_active: u.is_active !== false
    });
    setErrors({});
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!activeUser.name.trim()) errs.name = 'Full name is required';
    if (!activeUser.email.trim() || !/\S+@\S+\.\S+/.test(activeUser.email)) {
      errs.email = 'Valid email address is required';
    }
    if (isNaN(activeUser.hourly_rate) || activeUser.hourly_rate < 0) {
      errs.hourly_rate = 'Hourly rate cannot be negative';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const url = userModalMode === 'create'
        ? `${apiBase}/api/settings/users`
        : `${apiBase}/api/settings/users/${activeUser.id}`;
      const method = userModalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          ...activeUser
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', userModalMode === 'create' ? 'Team member added' : 'Member updated');
        setShowUserModal(false);
        fetchData();
      } else {
        showToast('error', data.error || 'Failed to save team member');
      }
    } catch (err) {
      showToast('error', 'Network error saving team member');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Remove team member "${u.name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/settings/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(item => item.id !== u.id));
        showToast('success', `Removed ${u.name}`);
      } else {
        showToast('error', data.error || 'Cannot remove user');
      }
    } catch (err) {
      showToast('error', 'Error removing member');
    }
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!activeRole.name.trim()) {
      showToast('error', 'Role title is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          ...activeRole
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Custom role created');
        setShowRoleModal(false);
        fetchData();
      } else {
        showToast('error', data.error || 'Failed to create role');
      }
    } catch (err) {
      showToast('error', 'Error creating custom role');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
    (u.role && u.role.toLowerCase().includes(search.toLowerCase()))
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
          <h2 className="settings-page-title">Users & Role Permissions</h2>
          <p className="settings-page-subtitle">
            Manage farm owners, managers, field operators, and labor rates. Configure granular access controls across planning and sales modules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-btn-secondary" onClick={fetchData} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          {activeTab === 'users' ? (
            <button className="settings-btn-primary" onClick={handleOpenCreateUser}>
              <UserPlus size={16} />
              <span>Invite Team Member</span>
            </button>
          ) : (
            <button className="settings-btn-primary" onClick={() => setShowRoleModal(true)}>
              <Shield size={16} />
              <span>Add Custom Role</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Team Members ({users.length})
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <ShieldCheck size={16} /> Roles & Permissions ({roles.length})
        </button>
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <>
          <div className="settings-card" style={{ marginBottom: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Filter by name, email, or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="settings-form-control"
                  style={{ paddingLeft: '32px' }}
                />
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Total: <strong>{filteredUsers.length}</strong> members
              </div>
            </div>
          </div>

          <div className="settings-card">
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
                <p>Loading team members...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="settings-empty-state">
                <Users size={40} className="empty-icon" />
                <div className="empty-title">No team members found</div>
                <div className="empty-desc">Add field workers, managers, or accountants to assign tasks and calculate labor rates.</div>
                <button className="settings-btn-primary" onClick={handleOpenCreateUser}>
                  <UserPlus size={16} /> Add First Member
                </button>
              </div>
            ) : (
              <div className="settings-table-wrapper">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Default Labor Rate</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: '#064f32',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}>
                              {(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {u.id.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#334155' }}>
                            <Mail size={13} style={{ color: '#94a3b8' }} /> {u.email}
                          </div>
                          {u.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                              <Phone size={13} style={{ color: '#94a3b8' }} /> {u.phone}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="settings-badge" style={{
                            backgroundColor: u.role === 'Farm Owner' ? '#ecfdf5' : '#f1f5f9',
                            color: u.role === 'Farm Owner' ? '#064f32' : '#334155',
                            border: `1px solid ${u.role === 'Farm Owner' ? '#a7f3d0' : '#cbd5e1'}`
                          }}>
                            {u.role || 'Member'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#0f172a' }}>
                            <span>₹{parseFloat(u.hourly_rate || 0).toFixed(2)}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>/ hr</span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8125rem',
                            color: u.is_active !== false ? '#064f32' : '#94a3b8',
                            fontWeight: 500
                          }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: u.is_active !== false ? '#10b981' : '#cbd5e1'
                            }} />
                            {u.is_active !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="settings-btn-secondary"
                              style={{ padding: '6px' }}
                              title="Edit User"
                              onClick={() => handleOpenEditUser(u)}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="settings-btn-danger"
                              style={{ padding: '6px' }}
                              title="Remove User"
                              onClick={() => handleDeleteUser(u)}
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
          </div>
        </>
      )}

      {/* Tab: Roles */}
      {activeTab === 'roles' && (
        <div className="settings-card">
          <div className="settings-card-header">
            <div>
              <h3 className="settings-card-title">Roles & Security Matrix</h3>
              <p className="settings-card-subtitle">Define granular module read/write access per security role</p>
            </div>
          </div>

          <div className="settings-table-wrapper">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'center' }}>Crop Plan</th>
                  <th style={{ textAlign: 'center' }}>Tasks & Labor</th>
                  <th style={{ textAlign: 'center' }}>Inventory</th>
                  <th style={{ textAlign: 'center' }}>Store & Orders</th>
                  <th style={{ textAlign: 'center' }}>Financials</th>
                  <th style={{ textAlign: 'center' }}>Settings</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={15} style={{ color: '#064f32' }} />
                        {r.name}
                      </div>
                      {r.is_system && (
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>System Built-in</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '280px', fontSize: '0.8125rem', color: '#475569' }}>
                      {r.description || 'Custom organizational role'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.permissions?.crop_plan ? <Check size={16} color="#064f32" /> : <Lock size={14} color="#94a3b8" />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.permissions?.tasks ? <Check size={16} color="#064f32" /> : <Lock size={14} color="#94a3b8" />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.permissions?.inventory ? <Check size={16} color="#064f32" /> : <Lock size={14} color="#94a3b8" />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.permissions?.orders ? <Check size={16} color="#064f32" /> : <Lock size={14} color="#94a3b8" />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.permissions?.labor_rates ? <Check size={16} color="#064f32" /> : <Lock size={14} color="#94a3b8" />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.permissions?.settings ? <Check size={16} color="#064f32" /> : <Lock size={14} color="#94a3b8" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="settings-modal-backdrop" onClick={() => !saving && setShowUserModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">
                {userModalMode === 'create' ? 'Add Farm Member' : 'Edit Member Details'}
              </h3>
              <button className="settings-modal-close" onClick={() => !saving && setShowUserModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="settings-modal-body">
                <div className="settings-form-group">
                  <label className="settings-form-label">Full Name <span className="settings-required-star">*</span></label>
                  <input
                    type="text"
                    value={activeUser.name}
                    onChange={e => setActiveUser({ ...activeUser, name: e.target.value })}
                    className={`settings-form-control ${errors.name ? 'has-error' : ''}`}
                    placeholder="e.g., Sarah Jenkins"
                  />
                  {errors.name && <div className="settings-form-error">{errors.name}</div>}
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label className="settings-form-label">Email <span className="settings-required-star">*</span></label>
                    <input
                      type="email"
                      value={activeUser.email}
                      onChange={e => setActiveUser({ ...activeUser, email: e.target.value })}
                      className={`settings-form-control ${errors.email ? 'has-error' : ''}`}
                      placeholder="user@example.com"
                    />
                    {errors.email && <div className="settings-form-error">{errors.email}</div>}
                  </div>
                  <div className="settings-form-group">
                    <label className="settings-form-label">Phone</label>
                    <input
                      type="text"
                      value={activeUser.phone}
                      onChange={e => setActiveUser({ ...activeUser, phone: e.target.value })}
                      className="settings-form-control"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="settings-form-row">
                  <div className="settings-form-group">
                    <label className="settings-form-label">Role</label>
                    <select
                      value={activeUser.role_id}
                      onChange={e => setActiveUser({ ...activeUser, role_id: e.target.value })}
                      className="settings-form-select"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="settings-form-group">
                    <label className="settings-form-label">Default Hourly Rate (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={activeUser.hourly_rate}
                      onChange={e => setActiveUser({ ...activeUser, hourly_rate: parseFloat(e.target.value) || 0 })}
                      className={`settings-form-control ${errors.hourly_rate ? 'has-error' : ''}`}
                    />
                    <div className="settings-form-help">Used to compute automated crop labor costs</div>
                  </div>
                </div>

                <div className="settings-form-group" style={{ marginTop: '12px' }}>
                  <label className="settings-checkbox-card">
                    <label className="settings-switch">
                      <input
                        type="checkbox"
                        checked={activeUser.is_active}
                        onChange={e => setActiveUser({ ...activeUser, is_active: e.target.checked })}
                      />
                      <span className="settings-slider" />
                    </label>
                    <div className="checkbox-info">
                      <div className="checkbox-title">Active Member</div>
                      <div className="checkbox-desc">Allow user to log in and be assigned to field tasks</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="settings-modal-footer">
                <button type="button" className="settings-btn-secondary" onClick={() => setShowUserModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="settings-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : userModalMode === 'create' ? 'Invite Member' : 'Update Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="settings-modal-backdrop" onClick={() => !saving && setShowRoleModal(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">Create Custom Role</h3>
              <button className="settings-modal-close" onClick={() => !saving && setShowRoleModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveRole}>
              <div className="settings-modal-body">
                <div className="settings-form-group">
                  <label className="settings-form-label">Role Title <span className="settings-required-star">*</span></label>
                  <input
                    type="text"
                    value={activeRole.name}
                    onChange={e => setActiveRole({ ...activeRole, name: e.target.value })}
                    className="settings-form-control"
                    placeholder="e.g., Seasonal Crew Lead"
                    required
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Description</label>
                  <textarea
                    value={activeRole.description}
                    onChange={e => setActiveRole({ ...activeRole, description: e.target.value })}
                    className="settings-form-textarea"
                    placeholder="Describe role responsibilities..."
                  />
                </div>
                <div className="settings-form-group">
                  <label className="settings-form-label">Module Permissions</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {Object.keys(activeRole.permissions).map(key => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={activeRole.permissions[key]}
                          onChange={e => setActiveRole({
                            ...activeRole,
                            permissions: { ...activeRole.permissions, [key]: e.target.checked }
                          })}
                        />
                        <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="settings-modal-footer">
                <button type="button" className="settings-btn-secondary" onClick={() => setShowRoleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="settings-btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
