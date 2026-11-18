import React, { useState, useEffect } from 'react';
import {
  Store, Truck, MapPin, Plus, Edit2, Trash2, Save, RefreshCw,
  CheckCircle2, AlertCircle, X, Check, ShieldCheck
} from 'lucide-react';

export default function OnlineStoreSettings({ apiBase, farmId }) {
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'delivery' | 'pickup'
  const [loading, setLoading] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [toast, setToast] = useState(null);

  // Store General Form
  const [storeConfig, setStoreConfig] = useState({
    store_name: '',
    default_tax_rate: 5,
    minimum_order_amount: 0,
    order_cutoff_hours: 24,
    public_store_notice: '',
    enable_online_store: true
  });

  // Delivery Types list & modal
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryModalMode, setDeliveryModalMode] = useState('create');
  const [activeDelivery, setActiveDelivery] = useState({
    id: null,
    method_name: '',
    delivery_fee: 0,
    minimum_order_amount: 0,
    estimated_window: '',
    is_active: true
  });

  // Pickup Locations list & modal
  const [pickupLocations, setPickupLocations] = useState([]);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupModalMode, setPickupModalMode] = useState('create');
  const [activePickup, setActivePickup] = useState({
    id: null,
    location_name: '',
    address: '',
    schedule: '',
    instructions: '',
    is_active: true
  });

  const [savingItem, setSavingItem] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/online-store?farm_id=${farmId}`);
      const data = await res.json();
      if (data.success) {
        const store = data.store || (data.data && data.data.store);
        if (store) {
          setStoreConfig({
            store_name: store.brand_farm_name || store.store_name || '',
            default_tax_rate: store.default_tax_rate !== undefined ? parseFloat(store.default_tax_rate) : 5,
            minimum_order_amount: store.minimum_order_amount !== undefined ? parseFloat(store.minimum_order_amount) : 0,
            order_cutoff_hours: store.order_cutoff_hours !== undefined ? parseInt(store.order_cutoff_hours) : 24,
            public_store_notice: store.terms_and_policies || store.public_store_notice || '',
            enable_online_store: store.store_enabled !== undefined ? store.store_enabled : (store.enable_online_store !== false)
          });
        }
        const delList = (data.deliveryTypes || (data.data && data.data.deliveryTypes) || []).map(d => ({
          ...d,
          method_name: d.method_name || d.name || '',
          delivery_fee: d.delivery_fee !== undefined && d.delivery_fee !== null ? parseFloat(d.delivery_fee) : (d.fee !== undefined ? parseFloat(d.fee) : 0),
          minimum_order_amount: d.minimum_order_amount !== undefined && d.minimum_order_amount !== null ? parseFloat(d.minimum_order_amount) : 0,
          estimated_window: d.estimated_window || d.description || '',
          is_active: d.is_active !== false
        }));
        setDeliveryTypes(delList);

        const pickList = (data.pickupLocations || (data.data && data.data.pickupLocations) || []).map(p => ({
          ...p,
          location_name: p.location_name || p.name || '',
          address: p.address || '',
          schedule: p.schedule || '',
          instructions: p.instructions || '',
          is_active: p.is_active !== false
        }));
        setPickupLocations(pickList);
      }
    } catch (err) {
      showToast('error', 'Failed to load store and fulfillment settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [farmId]);

  const handleSaveStore = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingStore(true);
    try {
      const res = await fetch(`${apiBase}/api/settings/online-store`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          brand_farm_name: storeConfig.store_name,
          store_name: storeConfig.store_name,
          default_tax_rate: storeConfig.default_tax_rate,
          minimum_order_amount: storeConfig.minimum_order_amount,
          order_cutoff_hours: storeConfig.order_cutoff_hours,
          terms_and_policies: storeConfig.public_store_notice,
          public_store_notice: storeConfig.public_store_notice,
          store_enabled: storeConfig.enable_online_store,
          enable_online_store: storeConfig.enable_online_store
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Store configuration updated successfully');
      } else {
        showToast('error', data.error || 'Failed to update store settings');
      }
    } catch (err) {
      showToast('error', 'Error updating store settings');
    } finally {
      setSavingStore(false);
    }
  };

  // Delivery CRUD
  const handleOpenDeliveryCreate = () => {
    setDeliveryModalMode('create');
    setActiveDelivery({
      id: null,
      method_name: '',
      delivery_fee: 0,
      minimum_order_amount: 0,
      estimated_window: 'Standard Route / Next Morning',
      is_active: true
    });
    setShowDeliveryModal(true);
  };

  const handleOpenDeliveryEdit = (d) => {
    setDeliveryModalMode('edit');
    setActiveDelivery({
      id: d.id,
      method_name: d.method_name,
      delivery_fee: d.delivery_fee,
      minimum_order_amount: d.minimum_order_amount || 0,
      estimated_window: d.estimated_window || '',
      is_active: d.is_active !== false
    });
    setShowDeliveryModal(true);
  };

  const handleSaveDelivery = async (e) => {
    e.preventDefault();
    if (!activeDelivery.method_name.trim()) {
      showToast('error', 'Delivery method name is required');
      return;
    }
    setSavingItem(true);
    try {
      const url = deliveryModalMode === 'create'
        ? `${apiBase}/api/settings/delivery-types`
        : `${apiBase}/api/settings/delivery-types/${activeDelivery.id}`;
      const method = deliveryModalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          method_name: activeDelivery.method_name,
          name: activeDelivery.method_name,
          delivery_fee: activeDelivery.delivery_fee,
          fee: activeDelivery.delivery_fee,
          minimum_order_amount: activeDelivery.minimum_order_amount,
          estimated_window: activeDelivery.estimated_window,
          description: activeDelivery.estimated_window,
          is_active: activeDelivery.is_active
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', deliveryModalMode === 'create' ? 'Delivery method added' : 'Delivery method updated');
        setShowDeliveryModal(false);
        fetchData();
      } else {
        showToast('error', data.error || 'Failed to save delivery method');
      }
    } catch (err) {
      showToast('error', 'Network error saving delivery method');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeleteDelivery = async (d) => {
    if (!window.confirm(`Delete delivery option "${d.method_name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/settings/delivery-types/${d.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeliveryTypes(prev => prev.filter(x => x.id !== d.id));
        showToast('success', `Delivery method "${d.method_name}" removed`);
      }
    } catch (err) {
      showToast('error', 'Failed to remove delivery option');
    }
  };

  // Pickup CRUD
  const handleOpenPickupCreate = () => {
    setPickupModalMode('create');
    setActivePickup({
      id: null,
      location_name: '',
      address: '',
      schedule: 'Saturday & Sunday 8:00 AM - 12:00 PM',
      instructions: '',
      is_active: true
    });
    setShowPickupModal(true);
  };

  const handleOpenPickupEdit = (p) => {
    setPickupModalMode('edit');
    setActivePickup({
      id: p.id,
      location_name: p.location_name,
      address: p.address || '',
      schedule: p.schedule || '',
      instructions: p.instructions || '',
      is_active: p.is_active !== false
    });
    setShowPickupModal(true);
  };

  const handleSavePickup = async (e) => {
    e.preventDefault();
    if (!activePickup.location_name.trim()) {
      showToast('error', 'Pickup location name is required');
      return;
    }
    if (!activePickup.address.trim()) {
      showToast('error', 'Pickup address is required');
      return;
    }
    setSavingItem(true);
    try {
      const url = pickupModalMode === 'create'
        ? `${apiBase}/api/settings/pickup-locations`
        : `${apiBase}/api/settings/pickup-locations/${activePickup.id}`;
      const method = pickupModalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id: farmId,
          location_name: activePickup.location_name,
          name: activePickup.location_name,
          address: activePickup.address,
          schedule: activePickup.schedule,
          instructions: activePickup.instructions,
          is_active: activePickup.is_active
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', pickupModalMode === 'create' ? 'Pickup location added' : 'Pickup location updated');
        setShowPickupModal(false);
        fetchData();
      } else {
        showToast('error', data.error || 'Failed to save pickup location');
      }
    } catch (err) {
      showToast('error', 'Error saving pickup location');
    } finally {
      setSavingItem(false);
    }
  };

  const handleDeletePickup = async (p) => {
    if (!window.confirm(`Delete pickup location "${p.location_name}"?`)) return;
    try {
      const res = await fetch(`${apiBase}/api/settings/pickup-locations/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPickupLocations(prev => prev.filter(x => x.id !== p.id));
        showToast('success', `Pickup location "${p.location_name}" removed`);
      }
    } catch (err) {
      showToast('error', 'Failed to remove pickup location');
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

      {/* Header: Title/Subtitle on Left, Refresh & Contextual Action aligned on Right of SAME line */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
        gap: '20px'
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            margin: '0 0 4px 0',
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            Online Store & Offer Sheet Settings
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#64748b',
            lineHeight: 1.4
          }}>
            Configure customer storefront parameters, sales tax calculation, delivery pricing zones, and pickup spots.
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
            onClick={fetchData}
            title="Refresh store settings"
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

          {activeTab === 'general' && (
            <button
              type="button"
              onClick={handleSaveStore}
              disabled={savingStore || loading}
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
                cursor: savingStore || loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(6, 79, 50, 0.2)',
                transition: 'all 0.15s ease',
                opacity: savingStore || loading ? 0.7 : 1,
                whiteSpace: 'nowrap'
              }}
            >
              <Save size={16} />
              <span>{savingStore ? 'Saving...' : 'Save Store Details'}</span>
            </button>
          )}

          {activeTab === 'delivery' && (
            <button
              type="button"
              onClick={handleOpenDeliveryCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 18px',
                backgroundColor: '#064f32',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(6, 79, 50, 0.2)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} />
              <span>Add Delivery Option</span>
            </button>
          )}

          {activeTab === 'pickup' && (
            <button
              type="button"
              onClick={handleOpenPickupCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 18px',
                backgroundColor: '#064f32',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(6, 79, 50, 0.2)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} />
              <span>Add Pickup Spot</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Horizontal Tabs Aligned Across the Top */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '20px',
        whiteSpace: 'nowrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'general' ? '2.5px solid #064f32' : '2.5px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.925rem',
            fontWeight: activeTab === 'general' ? 700 : 600,
            color: activeTab === 'general' ? '#064f32' : '#64748b',
            backgroundColor: activeTab === 'general' ? '#ecfdf5' : 'transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Store size={17} />
          <span>Storefront & Pricing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'delivery' ? '2.5px solid #064f32' : '2.5px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.925rem',
            fontWeight: activeTab === 'delivery' ? 700 : 600,
            color: activeTab === 'delivery' ? '#064f32' : '#64748b',
            backgroundColor: activeTab === 'delivery' ? '#ecfdf5' : 'transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Truck size={17} />
          <span>Delivery Methods</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 7px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'delivery' ? '#064f32' : '#e2e8f0',
            color: activeTab === 'delivery' ? '#ffffff' : '#475569',
            fontWeight: 700
          }}>
            {deliveryTypes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pickup')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'pickup' ? '2.5px solid #064f32' : '2.5px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.925rem',
            fontWeight: activeTab === 'pickup' ? 700 : 600,
            color: activeTab === 'pickup' ? '#064f32' : '#64748b',
            backgroundColor: activeTab === 'pickup' ? '#ecfdf5' : 'transparent',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <MapPin size={17} />
          <span>Pickup Locations</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '1px 7px',
            borderRadius: '10px',
            backgroundColor: activeTab === 'pickup' ? '#064f32' : '#e2e8f0',
            color: activeTab === 'pickup' ? '#ffffff' : '#475569',
            fontWeight: 700
          }}>
            {pickupLocations.length}
          </span>
        </button>
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
          <p style={{ margin: 0, fontSize: '0.95rem' }}>Loading store configuration...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: STOREFRONT & PRICING (Best Fit Screen, Zero Scrolling) */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveStore}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '24px 28px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
              }}>
                {/* Icon and Title in SAME LINE with proper spacing */}
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
                    <Store size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 3px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      Storefront Activation & Parameters
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                      Enable digital order placement, checkout pricing rules, and banner notices for wholesale & retail customers.
                    </p>
                  </div>
                </div>

                {/* Checkbox / Toggle Switch and Adjacent Text in ONE Horizontal Line */}
                <div
                  onClick={() => setStoreConfig(prev => ({ ...prev, enable_online_store: !prev.enable_online_store }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    backgroundColor: storeConfig.enable_online_store ? '#f0fdf4' : '#f8fafc',
                    border: `1.5px solid ${storeConfig.enable_online_store ? '#064f32' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    marginBottom: '22px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Toggle Switch */}
                    <div style={{
                      position: 'relative',
                      width: '44px',
                      height: '24px',
                      backgroundColor: storeConfig.enable_online_store ? '#064f32' : '#cbd5e1',
                      borderRadius: '24px',
                      transition: 'background-color 0.2s',
                      flexShrink: 0
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '3px',
                        left: storeConfig.enable_online_store ? '23px' : '3px',
                        width: '18px',
                        height: '18px',
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                        Enable Online Catalog & Offer Sheets
                      </span>
                      <span style={{
                        backgroundColor: storeConfig.enable_online_store ? '#dcfce7' : '#f1f5f9',
                        color: storeConfig.enable_online_store ? '#166534' : '#64748b',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}>
                        {storeConfig.enable_online_store ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.825rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    Generate sharable customer links and accept orders online
                  </div>
                </div>

                {/* 2x2 Clean Grid of Input Fields */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px'
                }}>
                  {/* Field 1: Storefront Display Name */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '6px'
                    }}>
                      Storefront Display Name
                    </label>
                    <input
                      type="text"
                      value={storeConfig.store_name}
                      onChange={(e) => setStoreConfig({ ...storeConfig, store_name: e.target.value })}
                      placeholder="e.g., Gopikrishna Organic Farm Stand"
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '8px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.925rem',
                        color: '#0f172a',
                        backgroundColor: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap' }}>
                      Appears on customer offer sheets, receipts, and order links.
                    </div>
                  </div>

                  {/* Field 2: Default Tax Rate */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '6px'
                    }}>
                      Default Tax Rate (%)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={storeConfig.default_tax_rate}
                        onChange={(e) => setStoreConfig({ ...storeConfig, default_tax_rate: parseFloat(e.target.value) || 0 })}
                        style={{
                          flex: 1,
                          height: '40px',
                          padding: '8px 14px',
                          border: '1px solid #cbd5e1',
                          borderRight: 'none',
                          borderRadius: '8px 0 0 8px',
                          fontSize: '0.925rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '40px',
                        padding: '0 16px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0 8px 8px 0',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#475569',
                        boxSizing: 'border-box'
                      }}>
                        % GST / Tax
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap' }}>
                      Automatically added to checkout orders.
                    </div>
                  </div>

                  {/* Field 3: Minimum Order Requirement */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '6px'
                    }}>
                      Minimum Order Requirement (₹)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '40px',
                        padding: '0 16px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRight: 'none',
                        borderRadius: '8px 0 0 8px',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#064f32',
                        boxSizing: 'border-box'
                      }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={storeConfig.minimum_order_amount}
                        onChange={(e) => setStoreConfig({ ...storeConfig, minimum_order_amount: parseFloat(e.target.value) || 0 })}
                        style={{
                          flex: 1,
                          height: '40px',
                          padding: '8px 14px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '0 8px 8px 0',
                          fontSize: '0.925rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap' }}>
                      Prevent orders below this basket size.
                    </div>
                  </div>

                  {/* Field 4: Order Cut-off Lead Time */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      marginBottom: '6px'
                    }}>
                      Order Cut-off Lead Time (Hours)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        value={storeConfig.order_cutoff_hours}
                        onChange={(e) => setStoreConfig({ ...storeConfig, order_cutoff_hours: parseInt(e.target.value) || 0 })}
                        style={{
                          flex: 1,
                          height: '40px',
                          padding: '8px 14px',
                          border: '1px solid #cbd5e1',
                          borderRight: 'none',
                          borderRadius: '8px 0 0 8px',
                          fontSize: '0.925rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          backgroundColor: '#ffffff',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '40px',
                        padding: '0 16px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0 8px 8px 0',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#475569',
                        boxSizing: 'border-box'
                      }}>
                        Hours Ahead
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap' }}>
                      Hours before harvest/dispatch when orders lock.
                    </div>
                  </div>
                </div>

                {/* Field 5: Store Banner Announcement & Customer Terms */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: '6px'
                  }}>
                    Store Banner Announcement & Customer Terms
                  </label>
                  <textarea
                    rows={2}
                    value={storeConfig.public_store_notice}
                    onChange={(e) => setStoreConfig({ ...storeConfig, public_store_notice: e.target.value })}
                    placeholder="e.g., Fresh organic monsoon greens now in season! Deliveries scheduled Tuesdays & Fridays."
                    style={{
                      width: '100%',
                      minHeight: '62px',
                      padding: '10px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      color: '#0f172a',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                      lineHeight: 1.45,
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', whiteSpace: 'nowrap' }}>
                    Displayed prominently on digital offer sheets and customer confirmation receipts.
                  </div>
                </div>

                {/* Bottom Save Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={savingStore || loading}
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
                      cursor: savingStore || loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 6px rgba(6, 79, 50, 0.2)',
                      transition: 'all 0.15s ease',
                      opacity: savingStore || loading ? 0.7 : 1
                    }}
                  >
                    <Save size={16} />
                    <span>{savingStore ? 'Saving...' : 'Save Store Details'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: DELIVERY METHODS (Best Fit Screen) */}
          {activeTab === 'delivery' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              {/* Card Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 3px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      Delivery Methods & Shipping Zones
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      Set shipping fees, minimum thresholds, and logistics options offered at checkout.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenDeliveryCreate}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '36px',
                    padding: '0 14px',
                    backgroundColor: '#ecfdf5',
                    color: '#064f32',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={15} />
                  <span>New Method</span>
                </button>
              </div>

              {deliveryTypes.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px dashed #cbd5e1'
                }}>
                  <Truck size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    No delivery methods created
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                    Add farm van routes, express logistics, or local bike delivery options for your buyers.
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenDeliveryCreate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '38px',
                      padding: '0 18px',
                      backgroundColor: '#064f32',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> Add First Delivery Method
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Method Name</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Delivery Fee</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Min. Order</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Transit Window / Schedule</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Status</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryTypes.map((d, index) => (
                        <tr
                          key={d.id || index}
                          style={{
                            borderBottom: index < deliveryTypes.length - 1 ? '1px solid #f1f5f9' : 'none',
                            backgroundColor: '#ffffff',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Truck size={17} style={{ color: '#064f32', flexShrink: 0 }} />
                              <span>{d.method_name || 'Standard Delivery'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            {d.delivery_fee === 0 ? (
                              <span style={{
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px'
                              }}>
                                Free Delivery
                              </span>
                            ) : (
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                ₹{d.delivery_fee.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px', color: '#475569' }}>
                            {d.minimum_order_amount > 0 ? `₹${d.minimum_order_amount.toFixed(2)}` : 'No minimum'}
                          </td>
                          <td style={{ padding: '14px 18px', color: '#475569' }}>
                            {d.estimated_window || '—'}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: d.is_active ? '#ecfdf5' : '#f1f5f9',
                              color: d.is_active ? '#064f32' : '#64748b',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: d.is_active ? '#10b981' : '#94a3b8'
                              }} />
                              {d.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                title="Edit Method"
                                onClick={() => handleOpenDeliveryEdit(d)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                title="Delete Method"
                                onClick={() => handleDeleteDelivery(d)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
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
          )}

          {/* TAB 3: PICKUP LOCATIONS (Best Fit Screen) */}
          {activeTab === 'pickup' && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              {/* Card Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 3px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                      Farm Pickup Hubs & Collection Spots
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      On-farm or partner drop points where customers collect fresh produce orders.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenPickupCreate}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '36px',
                    padding: '0 14px',
                    backgroundColor: '#ecfdf5',
                    color: '#064f32',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={15} />
                  <span>New Pickup Spot</span>
                </button>
              </div>

              {pickupLocations.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '10px',
                  border: '1px dashed #cbd5e1'
                }}>
                  <MapPin size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    No pickup locations configured
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                    Set farm gate or farmers market collection spots for pickup orders.
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenPickupCreate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '38px',
                      padding: '0 18px',
                      backgroundColor: '#064f32',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={16} /> Add First Pickup Spot
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Pickup Spot</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Address</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Schedule / Hours</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Customer Instructions</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>Status</th>
                        <th style={{ padding: '12px 18px', fontWeight: 700, color: '#334155', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickupLocations.map((p, index) => (
                        <tr
                          key={p.id || index}
                          style={{
                            borderBottom: index < pickupLocations.length - 1 ? '1px solid #f1f5f9' : 'none',
                            backgroundColor: '#ffffff',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <MapPin size={17} style={{ color: '#064f32', flexShrink: 0 }} />
                              <span>{p.location_name || 'Farm Gate'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px', color: '#334155' }}>
                            {p.address || '—'}
                          </td>
                          <td style={{ padding: '14px 18px', color: '#475569' }}>
                            {p.schedule || '—'}
                          </td>
                          <td style={{ padding: '14px 18px', color: '#64748b', maxWidth: '280px' }}>
                            {p.instructions || '—'}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: p.is_active ? '#ecfdf5' : '#f1f5f9',
                              color: p.is_active ? '#064f32' : '#64748b',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: p.is_active ? '#10b981' : '#94a3b8'
                              }} />
                              {p.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                title="Edit Pickup Spot"
                                onClick={() => handleOpenPickupEdit(p)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#334155',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                title="Delete Pickup Spot"
                                onClick={() => handleDeletePickup(p)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
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
          )}
        </>
      )}

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => !savingItem && setShowDeliveryModal(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {deliveryModalMode === 'create' ? 'Add Delivery Option' : 'Edit Delivery Option'}
              </h3>
              <button
                type="button"
                onClick={() => !savingItem && setShowDeliveryModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDelivery}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                    Method Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={activeDelivery.method_name}
                    onChange={e => setActiveDelivery({ ...activeDelivery, method_name: e.target.value })}
                    placeholder="e.g., Farm Express Van, Local Bicycle Courier"
                    required
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                      Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={activeDelivery.delivery_fee}
                      onChange={e => setActiveDelivery({ ...activeDelivery, delivery_fee: parseFloat(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                      Min. Order Required (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={activeDelivery.minimum_order_amount}
                      onChange={e => setActiveDelivery({ ...activeDelivery, minimum_order_amount: parseFloat(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                    Transit Window / Delivery Notes
                  </label>
                  <input
                    type="text"
                    value={activeDelivery.estimated_window}
                    onChange={e => setActiveDelivery({ ...activeDelivery, estimated_window: e.target.value })}
                    placeholder="e.g., Same Day Evening / Next Morning 8am-11am"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div
                  onClick={() => setActiveDelivery(prev => ({ ...prev, is_active: !prev.is_active }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: activeDelivery.is_active ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${activeDelivery.is_active ? '#86efac' : '#e2e8f0'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'relative',
                    width: '38px',
                    height: '20px',
                    backgroundColor: activeDelivery.is_active ? '#064f32' : '#cbd5e1',
                    borderRadius: '20px',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: activeDelivery.is_active ? '20px' : '2px',
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transition: 'left 0.2s'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    Active and available at checkout
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#064f32',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: savingItem ? 'not-allowed' : 'pointer',
                    opacity: savingItem ? 0.7 : 1
                  }}
                >
                  {savingItem ? 'Saving...' : 'Save Method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pickup Modal */}
      {showPickupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => !savingItem && setShowPickupModal(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {pickupModalMode === 'create' ? 'Add Pickup Spot' : 'Edit Pickup Spot'}
              </h3>
              <button
                type="button"
                onClick={() => !savingItem && setShowPickupModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePickup}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                    Location Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={activePickup.location_name}
                    onChange={e => setActivePickup({ ...activePickup, location_name: e.target.value })}
                    placeholder="e.g., Main Farm Gate Cold Storage, Central Farmers Market"
                    required
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                    Physical Address <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={activePickup.address}
                    onChange={e => setActivePickup({ ...activePickup, address: e.target.value })}
                    placeholder="Street, City, Postal Code"
                    required
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                    Pickup Schedule / Hours
                  </label>
                  <input
                    type="text"
                    value={activePickup.schedule}
                    onChange={e => setActivePickup({ ...activePickup, schedule: e.target.value })}
                    placeholder="e.g., Saturday & Sunday 8:00 AM - 12:00 PM"
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                    Customer Collection Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={activePickup.instructions}
                    onChange={e => setActivePickup({ ...activePickup, instructions: e.target.value })}
                    placeholder="e.g., Ring the cold room bell. Bring your order receipt or confirmation SMS."
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                      lineHeight: 1.45,
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div
                  onClick={() => setActivePickup(prev => ({ ...prev, is_active: !prev.is_active }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: activePickup.is_active ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${activePickup.is_active ? '#86efac' : '#e2e8f0'}`,
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'relative',
                    width: '38px',
                    height: '20px',
                    backgroundColor: activePickup.is_active ? '#064f32' : '#cbd5e1',
                    borderRadius: '20px',
                    transition: 'background-color 0.2s',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: activePickup.is_active ? '20px' : '2px',
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transition: 'left 0.2s'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                    Active and available at checkout
                  </span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc'
              }}>
                <button
                  type="button"
                  onClick={() => setShowPickupModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#064f32',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: savingItem ? 'not-allowed' : 'pointer',
                    opacity: savingItem ? 0.7 : 1
                  }}
                >
                  {savingItem ? 'Saving...' : 'Save Pickup Spot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
