import React, { useState, useEffect } from 'react';
import {
  Package, Clock, AlertTriangle, Layers, Save, RefreshCw, CheckCircle2,
  AlertCircle, ShieldAlert, Check
} from 'lucide-react';

export default function ProductSettings({ apiBase, farmId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [settings, setSettings] = useState({
    track_shelf_life: true,
    default_shelf_life_days: 7,
    inventory_deduction_strategy: 'on_order_pack', // 'on_harvest' | 'on_order_pack' | 'manual'
    allow_backorders: false,
    low_stock_threshold: 10
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/product?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        const prod = data.settings || data.product || data.data || {};
        setSettings({
          track_shelf_life: prod.track_shelf_life !== false,
          default_shelf_life_days: prod.default_shelf_life_days || 7,
          inventory_deduction_strategy: prod.inventory_deduction_strategy || 'on_order_pack',
          allow_backorders: !!prod.allow_backorders,
          low_stock_threshold: prod.low_stock_threshold !== undefined ? prod.low_stock_threshold : 10
        });
      }
    } catch (err) {
      showToast('error', 'Failed to load product settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [farmId]);

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/product`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          ...settings
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Product & inventory settings saved successfully');
      } else {
        showToast('error', data.error || 'Failed to update settings');
      }
    } catch (err) {
      showToast('error', 'Network error saving product settings');
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

      {/* Header: Title/Subtitle on Left, Refresh & Save Settings aligned on Right of SAME line */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
        gap: '20px'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            margin: '0 0 6px 0',
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            Product & Inventory Settings
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#64748b',
            lineHeight: 1.4
          }}>
            Configure fresh produce shelf-life tracking, inventory depletion triggers, and stock threshold warnings.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}>
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={fetchSettings}
            title="Refresh settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              color: '#334155',
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={17} className={loading ? 'spinning' : ''} />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '40px',
              padding: '0 20px',
              backgroundColor: '#064f32',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: saving || loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(6, 79, 50, 0.2)',
              transition: 'all 0.15s ease',
              opacity: saving || loading ? 0.7 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '60px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Loading product settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          {/* Card 1: Perishable Shelf Life Tracking */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px 28px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Icon and title in the SAME line with proper spacing */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                color: '#064f32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Clock size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 3px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Produce Shelf Life Tracking
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                  Automate expiration calculations based on harvest date and generate freshness warnings for sales teams.
                </p>
              </div>
            </div>

            {/* Checkbox / Switch and adjacent text aligned in the SAME line */}
            <div
              onClick={() => setSettings(prev => ({ ...prev, track_shelf_life: !prev.track_shelf_life }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                backgroundColor: settings.track_shelf_life ? '#f0fdf4' : '#f8fafc',
                border: `1.5px solid ${settings.track_shelf_life ? '#064f32' : '#e2e8f0'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Toggle Switch */}
              <div
                style={{
                  position: 'relative',
                  width: '44px',
                  height: '24px',
                  backgroundColor: settings.track_shelf_life ? '#064f32' : '#cbd5e1',
                  borderRadius: '24px',
                  transition: 'background-color 0.2s',
                  flexShrink: 0
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: settings.track_shelf_life ? '23px' : '3px',
                    width: '18px',
                    height: '18px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </div>

              {/* Adjacent Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    Enable Shelf Life Tracking
                  </span>
                  {settings.track_shelf_life && (
                    <span style={{
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '3px' }}>
                  Calculate expiration dates for harvested crops and flag items approaching end-of-life on packing sheets.
                </div>
              </div>
            </div>

            {/* Sub-inputs when Shelf Life is Enabled */}
            {settings.track_shelf_life && (
              <div style={{
                marginTop: '20px',
                padding: '20px 24px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '24px'
                }}>
                  {/* Field 1: Default Produce Shelf Life */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '8px'
                    }}>
                      Default Produce Shelf Life
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.default_shelf_life_days}
                        onChange={(e) => setSettings({ ...settings, default_shelf_life_days: parseInt(e.target.value) || 1 })}
                        style={{
                          width: '110px',
                          height: '38px',
                          padding: '6px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.925rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{
                        fontSize: '0.85rem',
                        color: '#334155',
                        fontWeight: 600,
                        backgroundColor: '#e2e8f0',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        display: 'inline-block'
                      }}>
                        Days
                      </span>
                    </div>
                    {/* Help Text in a SINGLE LINE */}
                    <div style={{
                      fontSize: '0.8125rem',
                      color: '#64748b',
                      marginTop: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      Individual crops can override this in Crop Planning.
                    </div>
                  </div>

                  {/* Field 2: Low Stock Alert Threshold */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '8px'
                    }}>
                      Low Stock Alert Threshold
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={settings.low_stock_threshold}
                        onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 0 })}
                        style={{
                          width: '110px',
                          height: '38px',
                          padding: '6px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.925rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{
                        fontSize: '0.85rem',
                        color: '#334155',
                        fontWeight: 600,
                        backgroundColor: '#e2e8f0',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        display: 'inline-block'
                      }}>
                        Units / Bunches
                      </span>
                    </div>
                    {/* Help Text in a SINGLE LINE */}
                    <div style={{
                      fontSize: '0.8125rem',
                      color: '#64748b',
                      marginTop: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      Alert managers when inventory dips below this quantity.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Inventory Depletion Strategy */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px 28px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Icon and title in the SAME line with proper spacing */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                color: '#064f32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Layers size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 3px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Inventory Depletion Strategy
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                  Select how and when stock levels decrease in your inventory ledger.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Option 1 */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  border: `1.5px solid ${settings.inventory_deduction_strategy === 'on_order_pack' ? '#064f32' : '#e2e8f0'}`,
                  backgroundColor: settings.inventory_deduction_strategy === 'on_order_pack' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="inventory_strategy"
                  value="on_order_pack"
                  checked={settings.inventory_deduction_strategy === 'on_order_pack'}
                  onChange={() => setSettings({ ...settings, inventory_deduction_strategy: 'on_order_pack' })}
                  style={{
                    accentColor: '#064f32',
                    width: '18px',
                    height: '18px',
                    margin: 0,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                      Deduct when Order is Packed / Shipped
                    </span>
                    <span style={{
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      Recommended
                    </span>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '3px' }}>
                    Keeps items available in physical inventory until the fulfillment crew confirms box packing.
                  </div>
                </div>
              </label>

              {/* Option 2 */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  border: `1.5px solid ${settings.inventory_deduction_strategy === 'on_harvest' ? '#064f32' : '#e2e8f0'}`,
                  backgroundColor: settings.inventory_deduction_strategy === 'on_harvest' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="inventory_strategy"
                  value="on_harvest"
                  checked={settings.inventory_deduction_strategy === 'on_harvest'}
                  onChange={() => setSettings({ ...settings, inventory_deduction_strategy: 'on_harvest' })}
                  style={{
                    accentColor: '#064f32',
                    width: '18px',
                    height: '18px',
                    margin: 0,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    Immediately Deduct upon Order Placement
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '3px' }}>
                    Reserves stock instantly so other customers cannot purchase the same batch online.
                  </div>
                </div>
              </label>

              {/* Option 3 */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  border: `1.5px solid ${settings.inventory_deduction_strategy === 'manual' ? '#064f32' : '#e2e8f0'}`,
                  backgroundColor: settings.inventory_deduction_strategy === 'manual' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="inventory_strategy"
                  value="manual"
                  checked={settings.inventory_deduction_strategy === 'manual'}
                  onChange={() => setSettings({ ...settings, inventory_deduction_strategy: 'manual' })}
                  style={{
                    accentColor: '#064f32',
                    width: '18px',
                    height: '18px',
                    margin: 0,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    Manual Adjustments Only
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '3px' }}>
                    Requires inventory managers to manually log stock movements and write-offs.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Card 3: Backorders & Over-Selling */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '24px 28px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Icon and title in the SAME line with proper spacing */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#ecfdf5',
                color: '#064f32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldAlert size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: '0 0 3px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Backorders & Over-Selling Rules
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                  Control whether customer orders can exceed on-hand inventory when future harvests are projected.
                </p>
              </div>
            </div>

            {/* Checkbox / Switch and adjacent text aligned in the SAME line */}
            <div
              onClick={() => setSettings(prev => ({ ...prev, allow_backorders: !prev.allow_backorders }))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                backgroundColor: settings.allow_backorders ? '#f0fdf4' : '#f8fafc',
                border: `1.5px solid ${settings.allow_backorders ? '#064f32' : '#e2e8f0'}`,
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Toggle Switch */}
              <div
                style={{
                  position: 'relative',
                  width: '44px',
                  height: '24px',
                  backgroundColor: settings.allow_backorders ? '#064f32' : '#cbd5e1',
                  borderRadius: '24px',
                  transition: 'background-color 0.2s',
                  flexShrink: 0
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: settings.allow_backorders ? '23px' : '3px',
                    width: '18px',
                    height: '18px',
                    backgroundColor: '#ffffff',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </div>

              {/* Adjacent Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                    Allow Backorders & Pre-Selling
                  </span>
                  {settings.allow_backorders && (
                    <span style={{
                      backgroundColor: '#fffbeb',
                      color: '#b45309',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      Allowed
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '3px' }}>
                  Permit orders even when inventory count drops below zero, based on expected upcoming yields.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Action */}
          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '42px',
                padding: '0 24px',
                backgroundColor: '#064f32',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.925rem',
                fontWeight: 600,
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(6, 79, 50, 0.2)',
                transition: 'all 0.15s ease',
                opacity: saving || loading ? 0.7 : 1
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Product Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
