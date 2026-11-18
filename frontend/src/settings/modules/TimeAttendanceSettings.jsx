import React, { useState, useEffect } from 'react';
import {
  Clock, MapPin, CheckSquare, Save, RefreshCw, CheckCircle2,
  AlertCircle, ShieldAlert, Coffee, DollarSign
} from 'lucide-react';

export default function TimeAttendanceSettings({ apiBase, farmId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [settings, setSettings] = useState({
    enable_clock_in: true,
    require_task_selection: true,
    require_gps_location: false,
    auto_clock_out_hours: 12,
    overtime_daily_hours: 8,
    overtime_multiplier: 1.5,
    unpaid_break_minutes: 30
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/time-attendance?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({
          enable_clock_in: data.settings.enable_clock_in !== false,
          require_task_selection: data.settings.require_task_selection !== false,
          require_gps_location: !!data.settings.require_gps_location,
          auto_clock_out_hours: parseInt(data.settings.auto_clock_out_hours) || 12,
          overtime_daily_hours: parseFloat(data.settings.overtime_daily_hours) || 8,
          overtime_multiplier: parseFloat(data.settings.overtime_multiplier) || 1.5,
          unpaid_break_minutes: parseInt(data.settings.unpaid_break_minutes) || 30
        });
      }
    } catch (err) {
      showToast('error', 'Failed to load time and attendance settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [farmId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/time-attendance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          ...settings
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Time & attendance rules updated');
      } else {
        showToast('error', data.error || 'Failed to update time settings');
      }
    } catch (err) {
      showToast('error', 'Error saving attendance settings');
    } finally {
      setSaving(false);
    }
  };

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
          <h2 className="settings-page-title">Time & Attendance Settings</h2>
          <p className="settings-page-subtitle">
            Configure digital worker clock-in/out, automated task labor tracking, lunch break deductions, and overtime payroll calculation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="settings-btn-secondary" onClick={fetchSettings} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="settings-btn-primary" onClick={handleSave} disabled={saving || loading}>
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Attendance Rules'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="settings-card" style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
          <p>Loading attendance configuration...</p>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Card 1: Clock-In Functionality */}
          <div className="settings-card" style={{ marginBottom: '20px' }}>
            <div className="settings-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} style={{ color: '#064f32' }} />
                <div>
                  <h3 className="settings-card-title">Digital Punch Clock</h3>
                  <p className="settings-card-subtitle">Allow farm team members to clock in and out from mobile or desktop</p>
                </div>
              </div>
            </div>

            <div className="settings-form-group">
              <label className="settings-checkbox-card">
                <label className="settings-switch">
                  <input
                    type="checkbox"
                    checked={settings.enable_clock_in}
                    onChange={(e) => setSettings({ ...settings, enable_clock_in: e.target.checked })}
                  />
                  <span className="settings-slider" />
                </label>
                <div className="checkbox-info">
                  <div className="checkbox-title">Enable Mobile / Web Clock In & Out</div>
                  <div className="checkbox-desc">
                    Display punch clock buttons in the Labor and Dashboard screens for all crew members.
                  </div>
                </div>
              </label>
            </div>

            {settings.enable_clock_in && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', paddingLeft: '12px' }}>
                <label className="settings-checkbox-card">
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.require_task_selection}
                      onChange={(e) => setSettings({ ...settings, require_task_selection: e.target.checked })}
                    />
                    <span className="settings-slider" />
                  </label>
                  <div className="checkbox-info">
                    <div className="checkbox-title">Require Task Selection upon Clock-In</div>
                    <div className="checkbox-desc">
                      Workers must select a scheduled crop or maintenance task so labor hours link to specific planting batches.
                    </div>
                  </div>
                </label>

                <label className="settings-checkbox-card">
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.require_gps_location}
                      onChange={(e) => setSettings({ ...settings, require_gps_location: e.target.checked })}
                    />
                    <span className="settings-slider" />
                  </label>
                  <div className="checkbox-info">
                    <div className="checkbox-title">Capture GPS Location Coordinates on Clock-In</div>
                    <div className="checkbox-desc">
                      Ensure workers are physically present on the farm when starting their daily shift.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Card 2: Shift Boundaries & Overtime */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} style={{ color: '#064f32' }} />
                <div>
                  <h3 className="settings-card-title">Breaks, Auto-Clock Out & Overtime Calculation</h3>
                  <p className="settings-card-subtitle">Automate wage payroll calculation and shift limits</p>
                </div>
              </div>
            </div>

            <div className="settings-form-row">
              <div className="settings-form-group">
                <label className="settings-form-label">Daily Regular Shift Limit (Hours)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    value={settings.overtime_daily_hours}
                    onChange={(e) => setSettings({ ...settings, overtime_daily_hours: parseFloat(e.target.value) || 8 })}
                    className="settings-form-control"
                    style={{ width: '120px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>hours / day</span>
                </div>
                <div className="settings-form-help">Hours beyond this count towards overtime</div>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">Overtime Pay Rate Multiplier</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="3"
                    value={settings.overtime_multiplier}
                    onChange={(e) => setSettings({ ...settings, overtime_multiplier: parseFloat(e.target.value) || 1.5 })}
                    className="settings-form-control"
                    style={{ width: '120px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>× base rate</span>
                </div>
                <div className="settings-form-help">e.g., 1.5× for time-and-a-half</div>
              </div>
            </div>

            <div className="settings-form-row">
              <div className="settings-form-group">
                <label className="settings-form-label">Auto Clock-Out Safety Ceiling</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="4"
                    max="24"
                    value={settings.auto_clock_out_hours}
                    onChange={(e) => setSettings({ ...settings, auto_clock_out_hours: parseInt(e.target.value) || 12 })}
                    className="settings-form-control"
                    style={{ width: '120px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>hours</span>
                </div>
                <div className="settings-form-help">Automatically clock worker out if they forget to punch out</div>
              </div>

              <div className="settings-form-group">
                <label className="settings-form-label">Default Unpaid Meal Break</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    step="5"
                    min="0"
                    max="120"
                    value={settings.unpaid_break_minutes}
                    onChange={(e) => setSettings({ ...settings, unpaid_break_minutes: parseInt(e.target.value) || 0 })}
                    className="settings-form-control"
                    style={{ width: '120px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>minutes</span>
                </div>
                <div className="settings-form-help">Deducted from daily shift totals for payroll reports</div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
