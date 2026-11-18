import React, { useState, useEffect } from 'react';
import {
  Bell, Mail, Smartphone, RefreshCw, CheckCircle2, AlertCircle,
  Calendar, Wrench, Package, ShoppingCart, CheckSquare
} from 'lucide-react';

export default function NotificationSettings({ apiBase, farmId }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [toast, setToast] = useState(null);

  const categories = [
    { id: 'All', label: 'All Alerts', icon: Bell },
    { id: 'tasks', label: 'Tasks & Crew', icon: CheckSquare },
    { id: 'crop_plan', label: 'Crop Planning', icon: Calendar },
    { id: 'equipment', label: 'Equipment', icon: Wrench },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'orders', label: 'Store & Orders', icon: ShoppingCart }
  ];

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/notifications?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || data.data || []);
      }
    } catch (err) {
      showToast('error', 'Failed to fetch notification preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [farmId]);

  const handleToggle = async (item, field) => {
    const updatedValue = !item[field];
    const prevItems = [...notifications];

    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, [field]: updatedValue } : n));

    try {
      const res = await fetch(`${apiBase}/api/settings/notifications/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: updatedValue })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', `${item.title} updated`);
      } else {
        setNotifications(prevItems);
        showToast('error', 'Failed to update alert preference');
      }
    } catch (err) {
      setNotifications(prevItems);
      showToast('error', 'Network error updating preference');
    }
  };

  const filtered = notifications.filter(n =>
    activeCategory === 'All' ? true : n.category === activeCategory
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
          <h2 className="settings-page-title">Notification Settings</h2>
          <p className="settings-page-subtitle">
            Configure automated system alerts for crop planting dates, equipment maintenance, low stock, and online orders.
          </p>
        </div>
        <div>
          <button className="settings-btn-secondary" onClick={fetchNotifications} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="settings-tabs" style={{ marginBottom: '16px' }}>
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              className={`settings-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <Icon size={16} /> {cat.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="settings-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
          <p>Loading notification preferences...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="settings-card">
          <div className="settings-empty-state">
            <Bell size={40} className="empty-icon" />
            <div className="empty-title">No notifications configured</div>
            <div className="empty-desc">Check back later or reload preferences.</div>
          </div>
        </div>
      ) : (
        <div className="settings-card">
          <div className="settings-table-wrapper">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Event & Trigger Description</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={15} /> Email Alert
                    </div>
                  </th>
                  <th style={{ width: '160px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Smartphone size={15} /> In-App / Push
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                        {item.description}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <label className="settings-switch">
                        <input
                          type="checkbox"
                          checked={item.email_enabled}
                          onChange={() => handleToggle(item, 'email_enabled')}
                        />
                        <span className="settings-slider" />
                      </label>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <label className="settings-switch">
                        <input
                          type="checkbox"
                          checked={item.inapp_enabled}
                          onChange={() => handleToggle(item, 'inapp_enabled')}
                        />
                        <span className="settings-slider" />
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
