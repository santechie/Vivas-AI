import React, { useState, useEffect } from 'react';
import {
  Building2,
  Tractor,
  Globe2,
  Share2,
  FileBadge,
  Save,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Calendar,
  Layers,
  Thermometer,
  Coins
} from 'lucide-react';

export default function FarmProfileSettings({ apiBase, API_BASE, farmId, showToast: externalToast }) {
  const rawBase = apiBase !== undefined && apiBase !== null ? apiBase : (API_BASE || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5001' : ''));
  const cleanApiBase = rawBase.replace(/\/api\/?$/, '');
  const [internalToast, setInternalToast] = useState(null);

  const notify = (msg, type = 'success') => {
    if (externalToast) {
      externalToast(msg, type);
    } else {
      setInternalToast({ message: msg, type });
      setTimeout(() => setInternalToast(null), 3500);
    }
  };

  const [activeTab, setActiveTab] = useState('profile'); // profile, operations, regional, public, additional
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    farm_name: "Gopikrishna's Farm",
    year_founded: 2026,
    location_mode: 'address',
    address: 'Kanakapura Road, Near Art of Living',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postal_code: '560082',
    gps_lat: 12.9716,
    gps_lng: 77.5946,
    farm_size: 25.00,
    farm_size_unit: 'Acres',
    operation_type: 'Mixed Vegetable & Fruit Farm',
    logo_url: '',
    invoice_header_mode: 'LOGO_AND_NAME',
    growing_format: 'Beds & Pathways',
    default_bed_width_ft: 2.50,
    default_pathway_width_ft: 1.50,
    default_yield_area_unit: 'Acre',
    default_yield_mass_unit: 'Ton',
    frost_date_option: 'manual',
    first_fall_frost: '',
    last_spring_frost: '',
    units_system: 'Metric',
    temperature_unit: 'C',
    currency_code: 'INR',
    currency_symbol: '₹',
    timezone: 'Asia/Kolkata',
    date_format: 'DD/MM/YYYY',
    public_description: 'Sustainable organic agriculture producing high quality heirloom vegetables, greens, and fruits.',
    public_website: 'https://vivas.ai',
    instagram_handle: '@vivasfarm',
    facebook_handle: 'vivasfarm',
    public_phone: '+91 9940091521',
    public_email: 'gksvijay@gmail.com',
    show_public_address: true,
    certifications: ['USDA Organic', 'NPOP Organic India', 'Good Agricultural Practices (GAP)'],
    tax_registration_id: 'GSTIN29ABCDE1234F1Z5'
  });

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${cleanApiBase}/api/settings/farm-profile?farm_id=${farmId || ''}`);
      const json = await res.json();
      if (json.success && json.data) {
        setProfile(prev => ({ ...prev, ...json.data }));
      }
    } catch (err) {
      console.error('Error fetching farm profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [farmId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${cleanApiBase}/api/settings/farm-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, farm_id: farmId, farmId })
      });
      const json = await res.json();
      if (json.success) {
        notify('Farm Profile & Settings saved successfully!', 'success');
        setProfile(json.data);
      } else {
        notify(json.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      notify('Network error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        Loading Farm Profile & Settings...
      </div>
    );
  }

  return (
    <div className="settings-module-container">
      {internalToast && (
        <div className={`settings-toast ${internalToast.type}`}>
          {internalToast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{internalToast.message}</span>
        </div>
      )}

      {/* Subtabs Bar */}
      <div className="settings-tabs-container">
        <button
          className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Building2 size={16} />
          <span>Farm Profile</span>
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
          onClick={() => setActiveTab('operations')}
        >
          <Tractor size={16} />
          <span>Farm Operations</span>
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'regional' ? 'active' : ''}`}
          onClick={() => setActiveTab('regional')}
        >
          <Globe2 size={16} />
          <span>Regional Settings</span>
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'public' ? 'active' : ''}`}
          onClick={() => setActiveTab('public')}
        >
          <Share2 size={16} />
          <span>Public Profile</span>
        </button>
        <button
          className={`settings-tab-btn ${activeTab === 'additional' ? 'active' : ''}`}
          onClick={() => setActiveTab('additional')}
        >
          <FileBadge size={16} />
          <span>Additional Information</span>
        </button>
      </div>

      {/* ── TAB 1: FARM PROFILE ── */}
      {activeTab === 'profile' && (
        <div className="settings-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="settings-section-title">Basic Farm Info</h2>
              <div className="settings-section-subtitle">Core identification and location details for your farm.</div>
            </div>
            <button className="settings-btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Farm Name *</label>
              <div className="settings-label-sub">Official name displayed across Vivas AI</div>
            </div>
            <div>
              <input
                type="text"
                className="settings-input-text"
                value={profile.farm_name || ''}
                onChange={e => setProfile({ ...profile, farm_name: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Year Founded</label>
              <div className="settings-label-sub">Establishment year</div>
            </div>
            <div>
              <select
                className="settings-select"
                value={profile.year_founded || 2026}
                onChange={e => setProfile({ ...profile, year_founded: parseInt(e.target.value) })}
              >
                {Array.from({ length: 45 }, (_, i) => 2026 - i).map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Location Format</label>
              <div className="settings-label-sub">Choose how your location is stored</div>
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="location_mode"
                  checked={profile.location_mode === 'address'}
                  onChange={() => setProfile({ ...profile, location_mode: 'address' })}
                />
                <span>Use Address</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="location_mode"
                  checked={profile.location_mode === 'coords'}
                  onChange={() => setProfile({ ...profile, location_mode: 'coords' })}
                />
                <span>Enter Latitude / Longitude</span>
              </label>
            </div>
          </div>

          {profile.location_mode === 'address' ? (
            <div className="settings-form-row">
              <div>
                <label className="settings-label">Address & Region</label>
                <div className="settings-label-sub">Street, city, state, postal code</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px' }}>
                <input
                  type="text"
                  placeholder="Street Address..."
                  className="settings-input-text"
                  value={profile.address || ''}
                  onChange={e => setProfile({ ...profile, address: e.target.value })}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="City"
                    className="settings-input-text"
                    style={{ flex: 1 }}
                    value={profile.city || ''}
                    onChange={e => setProfile({ ...profile, city: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    className="settings-input-text"
                    style={{ flex: 1 }}
                    value={profile.state || ''}
                    onChange={e => setProfile({ ...profile, state: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Country"
                    className="settings-input-text"
                    style={{ flex: 1 }}
                    value={profile.country || 'India'}
                    onChange={e => setProfile({ ...profile, country: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    className="settings-input-text"
                    style={{ flex: 1 }}
                    value={profile.postal_code || ''}
                    onChange={e => setProfile({ ...profile, postal_code: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="settings-form-row">
              <div>
                <label className="settings-label">GPS Coordinates</label>
                <div className="settings-label-sub">Center coordinates for Satellite Map</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', maxWidth: '500px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#64748b' }}>Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="settings-input-text"
                    value={profile.gps_lat || ''}
                    onChange={e => setProfile({ ...profile, gps_lat: parseFloat(e.target.value) })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#64748b' }}>Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="settings-input-text"
                    value={profile.gps_lng || ''}
                    onChange={e => setProfile({ ...profile, gps_lng: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Farm Size</label>
              <div className="settings-label-sub">Total operational acreage</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', maxWidth: '350px' }}>
              <input
                type="number"
                step="0.1"
                className="settings-input-text"
                style={{ width: '140px' }}
                value={profile.farm_size || ''}
                onChange={e => setProfile({ ...profile, farm_size: parseFloat(e.target.value) })}
              />
              <select
                className="settings-select"
                style={{ width: '160px' }}
                value={profile.farm_size_unit || 'Acres'}
                onChange={e => setProfile({ ...profile, farm_size_unit: e.target.value })}
              >
                <option value="Acres">Acres</option>
                <option value="Hectares">Hectares</option>
                <option value="Sq Meters">Sq Meters</option>
                <option value="Sq Feet">Sq Feet</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Operation Type</label>
              <div className="settings-label-sub">Primary agricultural model</div>
            </div>
            <div>
              <select
                className="settings-select"
                value={profile.operation_type || 'Mixed Vegetable & Fruit Farm'}
                onChange={e => setProfile({ ...profile, operation_type: e.target.value })}
              >
                <option value="Mixed Vegetable & Fruit Farm">Mixed Vegetable & Fruit Farm</option>
                <option value="Market Garden / Micro-greens">Market Garden / Micro-greens</option>
                <option value="Greenhouse & Controlled Environment">Greenhouse & Controlled Environment</option>
                <option value="Commercial Fruit Orchard">Commercial Fruit Orchard</option>
                <option value="Hydroponics / Aquaponics">Hydroponics / Aquaponics</option>
                <option value="Row Crops & Grains">Row Crops & Grains</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Invoice Header Display</label>
              <div className="settings-label-sub">Choose what appears on invoices and pack slips</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="invoice_header"
                  checked={profile.invoice_header_mode === 'LOGO_AND_NAME'}
                  onChange={() => setProfile({ ...profile, invoice_header_mode: 'LOGO_AND_NAME' })}
                />
                <span>Logo + business name</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="invoice_header"
                  checked={profile.invoice_header_mode === 'LOGO_ONLY'}
                  onChange={() => setProfile({ ...profile, invoice_header_mode: 'LOGO_ONLY' })}
                />
                <span>Logo only</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="invoice_header"
                  checked={profile.invoice_header_mode === 'NAME_ONLY'}
                  onChange={() => setProfile({ ...profile, invoice_header_mode: 'NAME_ONLY' })}
                />
                <span>Business name only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: FARM OPERATIONS ── */}
      {activeTab === 'operations' && (
        <div className="settings-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="settings-section-title">Farm Operations & Growing Standards</h2>
              <div className="settings-section-subtitle">Configure bed dimensions, yield defaults, and operating standards.</div>
            </div>
            <button className="settings-btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Growing Format</label>
              <div className="settings-label-sub">Default layout in your fields</div>
            </div>
            <div>
              <select
                className="settings-select"
                value={profile.growing_format || 'Beds & Pathways'}
                onChange={e => setProfile({ ...profile, growing_format: e.target.value })}
              >
                <option value="Beds & Pathways">Growing in a field with Beds & Pathways</option>
                <option value="Flat Ground / Broad Rows">Flat Ground / Broad Rows</option>
                <option value="High Tunnels & Greenhouse Benches">High Tunnels & Greenhouse Benches</option>
                <option value="Orchard Trellis Grid">Orchard Trellis Grid</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Standard Bed Width (ft)</label>
              <div className="settings-label-sub">Default width for generated beds in Farm Map</div>
            </div>
            <div>
              <input
                type="number"
                step="0.1"
                className="settings-input-text"
                style={{ width: '160px' }}
                value={profile.default_bed_width_ft || 2.50}
                onChange={e => setProfile({ ...profile, default_bed_width_ft: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Standard Pathway Width (ft)</label>
              <div className="settings-label-sub">Walkway / tractor pathway between beds</div>
            </div>
            <div>
              <input
                type="number"
                step="0.1"
                className="settings-input-text"
                style={{ width: '160px' }}
                value={profile.default_pathway_width_ft || 1.50}
                onChange={e => setProfile({ ...profile, default_pathway_width_ft: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Default Yield Units</label>
              <div className="settings-label-sub">Yield Rate Area & Mass standards (Tend.com standard)</div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b' }}>Area Unit</label>
                <select
                  className="settings-select"
                  style={{ width: '160px' }}
                  value={profile.default_yield_area_unit || 'Acre'}
                  onChange={e => setProfile({ ...profile, default_yield_area_unit: e.target.value })}
                >
                  <option value="Acre">Yield / Acre</option>
                  <option value="Hectare">Yield / Hectare</option>
                  <option value="100m Bed">Yield / 100m Bed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#64748b' }}>Mass Unit</label>
                <select
                  className="settings-select"
                  style={{ width: '160px' }}
                  value={profile.default_yield_mass_unit || 'Ton'}
                  onChange={e => setProfile({ ...profile, default_yield_mass_unit: e.target.value })}
                >
                  <option value="Ton">Ton (Metric Ton)</option>
                  <option value="Kg">Kilograms (kg)</option>
                  <option value="Quintal">Quintal</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: REGIONAL SETTINGS ── */}
      {activeTab === 'regional' && (
        <div className="settings-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="settings-section-title">Regional & Localization Preferences</h2>
              <div className="settings-section-subtitle">Units, currency, timezones, and frost dates.</div>
            </div>
            <button className="settings-btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Measurement System</label>
              <div className="settings-label-sub">Preferred unit standard</div>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="units_sys"
                  checked={profile.units_system === 'Metric'}
                  onChange={() => setProfile({ ...profile, units_system: 'Metric' })}
                />
                <span>Metric (e.g. kg, m, ml, ...)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="units_sys"
                  checked={profile.units_system === 'Standard'}
                  onChange={() => setProfile({ ...profile, units_system: 'Standard' })}
                />
                <span>Standard (e.g. lbs, ft, oz, ...)</span>
              </label>
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Temperature Scale</label>
              <div className="settings-label-sub">Weather & soil temperatures</div>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="temp_scale"
                  checked={profile.temperature_unit === 'C'}
                  onChange={() => setProfile({ ...profile, temperature_unit: 'C' })}
                />
                <span>Celsius (°C)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="temp_scale"
                  checked={profile.temperature_unit === 'F'}
                  onChange={() => setProfile({ ...profile, temperature_unit: 'F' })}
                />
                <span>Fahrenheit (°F)</span>
              </label>
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Currency</label>
              <div className="settings-label-sub">Symbol and ISO Currency Code</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="settings-input-text"
                style={{ width: '80px' }}
                value={profile.currency_symbol || '₹'}
                onChange={e => setProfile({ ...profile, currency_symbol: e.target.value })}
              />
              <select
                className="settings-select"
                style={{ width: '160px' }}
                value={profile.currency_code || 'INR'}
                onChange={e => {
                  const code = e.target.value;
                  const sym = code === 'INR' ? '₹' : code === 'USD' ? '$' : code === 'EUR' ? '€' : '₹';
                  setProfile({ ...profile, currency_code: code, currency_symbol: sym });
                }}
              >
                <option value="INR">INR - Indian Rupee</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Timezone</label>
              <div className="settings-label-sub">Farm local timezone</div>
            </div>
            <div>
              <select
                className="settings-select"
                value={profile.timezone || 'Asia/Kolkata'}
                onChange={e => setProfile({ ...profile, timezone: e.target.value })}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="America/New_York">America/New York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: PUBLIC PROFILE ── */}
      {activeTab === 'public' && (
        <div className="settings-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="settings-section-title">Public Farm Profile</h2>
              <div className="settings-section-subtitle">Information shown on public offer sheets, digital storefronts, and invoices.</div>
            </div>
            <button className="settings-btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Public Description</label>
              <div className="settings-label-sub">About your farm and growing philosophy</div>
            </div>
            <div>
              <textarea
                className="settings-textarea"
                value={profile.public_description || ''}
                onChange={e => setProfile({ ...profile, public_description: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Public Website</label>
              <div className="settings-label-sub">Your main website URL</div>
            </div>
            <div>
              <input
                type="text"
                className="settings-input-text"
                value={profile.public_website || ''}
                onChange={e => setProfile({ ...profile, public_website: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Public Contact Details</label>
              <div className="settings-label-sub">Customer-facing phone & email</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', maxWidth: '500px' }}>
              <input
                type="text"
                placeholder="Phone"
                className="settings-input-text"
                value={profile.public_phone || ''}
                onChange={e => setProfile({ ...profile, public_phone: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                className="settings-input-text"
                value={profile.public_email || ''}
                onChange={e => setProfile({ ...profile, public_email: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: ADDITIONAL INFORMATION ── */}
      {activeTab === 'additional' && (
        <div className="settings-section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="settings-section-title">Certifications & Legal Identifiers</h2>
              <div className="settings-section-subtitle">Organic standards, GST/tax registrations, and audits.</div>
            </div>
            <button className="settings-btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Info'}</span>
            </button>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Tax / GST Registration ID</label>
              <div className="settings-label-sub">Printed on commercial invoices</div>
            </div>
            <div>
              <input
                type="text"
                className="settings-input-text"
                value={profile.tax_registration_id || ''}
                onChange={e => setProfile({ ...profile, tax_registration_id: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-form-row">
            <div>
              <label className="settings-label">Agricultural Certifications</label>
              <div className="settings-label-sub">Active certifications badges</div>
            </div>
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {(profile.certifications || []).map((cert, idx) => (
                  <span key={idx} className="settings-chip settings-chip-active">
                    <CheckCircle2 size={13} />
                    <span>{cert}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
