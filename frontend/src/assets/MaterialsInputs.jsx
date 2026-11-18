import React, { useState, useEffect, useMemo } from 'react';
import {
  FlaskConical, Plus, Search, Filter, RefreshCw, Sparkles, X, Edit3, Trash2,
  Calendar, Check, AlertCircle, ShieldCheck, ArrowRight, Package,
  Sliders, Layers, TrendingUp, AlertTriangle, Box, IndianRupee, Leaf
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function MaterialsInputsScreen() {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'inventory' | 'lots'

  // Data states
  const [catalog, setCatalog] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [lots, setLots] = useState([]);
  const [invStats, setInvStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expiringFilter, setExpiringFilter] = useState(false);

  // Modals & Drawers
  const [showCatalogDrawer, setShowCatalogDrawer] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedInvItem, setSelectedInvItem] = useState(null);
  const [showLotDrawer, setShowLotDrawer] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Catalog Form
  const [catForm, setCatForm] = useState({
    name: '',
    input_type: 'Fertilizers & Nutrients',
    active_ingredients: '',
    npk_ratio: '',
    is_organic: true,
    omri_listed: true,
    certification_number: 'NPOP/ORG-001',
    default_unit: 'kg',
    brand: 'Multiplex Bio',
    recommended_application_rate: '250 kg per acre during bed preparation',
    target_crops: 'All Vegetables, Tomatoes, Brassicas',
    safety_precautions: 'Wear gloves and protective mask. Store in dry shade.',
    reentry_interval_hours: 0
  });

  // Stock Adjust Form
  const [adjForm, setAdjForm] = useState({
    adjustment_type: 'add', // 'add' | 'deduct' | 'set'
    quantity: 10,
    reason: 'New shipment received from vendor'
  });

  // Lot Form
  const [lotForm, setLotForm] = useState({
    catalog_id: '',
    input_name: '',
    input_type: 'Fertilizers & Nutrients',
    unit: 'kg',
    initial_quantity: 50.0,
    unit_cost: 45.0,
    vendor_lot_number: 'VND-BATCH-2026',
    received_date: new Date().toISOString().slice(0, 10),
    expiration_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    storage_location: 'Inputs Storage Shed - Pallet 1',
    container_code: 'CRATE-FLUG-50L-102',
    supplier_name: 'Agro Green Inputs Hub',
    notes: 'Quality inspected upon delivery.'
  });

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [catRes, invRes, lotRes, statRes] = await Promise.all([
        fetch(`${API_BASE}/inputs/catalog?type=${typeFilter}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`${API_BASE}/inputs/inventory?type=${typeFilter}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`${API_BASE}/inputs/lots?type=${typeFilter}&expiring=${expiringFilter}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`${API_BASE}/inputs/inventory/stats`)
      ]);

      const catData = await catRes.json();
      const invData = await invRes.json();
      const lotData = await lotRes.json();
      const statData = await statRes.json();

      if (catData.success) setCatalog(catData.data);
      if (invData.success) setInventory(invData.data);
      if (lotData.success) setLots(lotData.data);
      if (statData.success) setInvStats(statData.data);
    } catch (err) {
      console.error('Error fetching materials & inputs data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [activeTab, typeFilter, searchQuery, expiringFilter]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Open Create Catalog
  const openCreateCatalog = () => {
    setEditingCatalog(null);
    setCatForm({
      name: '',
      input_type: 'Fertilizers & Nutrients',
      active_ingredients: '',
      npk_ratio: '',
      is_organic: true,
      omri_listed: true,
      certification_number: 'NPOP/ORG-001',
      default_unit: 'kg',
      brand: 'Multiplex Bio',
      recommended_application_rate: '250 kg per acre during bed preparation',
      target_crops: 'All Vegetables, Tomatoes, Brassicas',
      safety_precautions: 'Wear gloves and protective mask. Store in dry shade.',
      reentry_interval_hours: 0
    });
    setShowCatalogDrawer(true);
  };

  // Open Edit Catalog
  const openEditCatalog = (item) => {
    setEditingCatalog(item);
    setCatForm({
      name: item.name || '',
      input_type: item.input_type || 'Fertilizers & Nutrients',
      active_ingredients: item.active_ingredients || '',
      npk_ratio: item.npk_ratio || '',
      is_organic: !!item.is_organic,
      omri_listed: !!item.omri_listed,
      certification_number: item.certification_number || '',
      default_unit: item.default_unit || 'kg',
      brand: item.brand || '',
      recommended_application_rate: item.recommended_application_rate || '',
      target_crops: item.target_crops || '',
      safety_precautions: item.safety_precautions || '',
      reentry_interval_hours: item.reentry_interval_hours || 0
    });
    setShowCatalogDrawer(true);
  };

  // Save Catalog Item
  const handleSaveCatalog = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return;

    try {
      setIsSaving(true);
      const url = editingCatalog ? `${API_BASE}/inputs/catalog/${editingCatalog.id}` : `${API_BASE}/inputs/catalog`;
      const method = editingCatalog ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingCatalog ? 'Catalog entry updated' : 'Input added to master catalog');
        setShowCatalogDrawer(false);
        fetchAllData();
      }
    } catch (err) {
      console.error('Catalog save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Stock Adjust Modal
  const openStockAdjustModal = (item) => {
    setSelectedInvItem(item);
    setAdjForm({
      adjustment_type: 'add',
      quantity: 10,
      reason: 'Physical inventory count reconciliation'
    });
    setShowAdjustModal(true);
  };

  // Save Stock Adjustment
  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedInvItem) return;

    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/inputs/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInvItem.id,
          ...adjForm
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Stock updated for ${selectedInvItem.name}`);
        setShowAdjustModal(false);
        fetchAllData();
      }
    } catch (err) {
      console.error('Stock adjustment error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Receive Lot Drawer
  const openReceiveLotDrawer = () => {
    const defaultCat = catalog[0];
    setLotForm({
      catalog_id: defaultCat?.id || '',
      input_name: defaultCat?.name || 'Neem Seed Cake Organic Fertilizer',
      input_type: defaultCat?.input_type || 'Fertilizers & Nutrients',
      unit: defaultCat?.default_unit || 'kg',
      initial_quantity: 100.0,
      unit_cost: 40.0,
      vendor_lot_number: `VND-${Date.now().toString().slice(-6)}`,
      received_date: new Date().toISOString().slice(0, 10),
      expiration_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      storage_location: 'Inputs Storage Shed - Pallet 1',
      container_code: 'CRATE-FLUG-50L-102',
      supplier_name: 'Agro Green Inputs Hub',
      notes: 'New supplier delivery received and verified.'
    });
    setShowLotDrawer(true);
  };

  // Handle Catalog select in Lot form
  const handleLotCatalogSelect = (catId) => {
    const cat = catalog.find(c => c.id === catId);
    if (!cat) return;
    setLotForm({
      ...lotForm,
      catalog_id: cat.id,
      input_name: cat.name,
      input_type: cat.input_type,
      unit: cat.default_unit || 'kg'
    });
  };

  // Save Lot Record
  const handleSaveLot = async (e) => {
    e.preventDefault();
    if (!lotForm.input_name.trim()) return;

    try {
      setIsSaving(true);
      const res = await fetch(`${API_BASE}/inputs/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lotForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Lot received and inventory quantities synchronized');
        setShowLotDrawer(false);
        fetchAllData();
      }
    } catch (err) {
      console.error('Save lot error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Catalog Item
  const handleDeleteCatalog = async (id, name) => {
    if (!window.confirm(`Delete '${name}' from master catalog?`)) return;
    try {
      const res = await fetch(`${API_BASE}/inputs/catalog/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Catalog item deleted');
        fetchAllData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const inputCategories = [
    'All', 'Fertilizers & Nutrients', 'Soil Amendments & Media',
    'Biopesticides & Fungicides', 'Beneficial Microbials', 'Seeds & Propagules'
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
          <div className="grow-badge" style={{ background: '#dcfce7', color: '#15803d' }}>ASSETS & INPUTS</div>
          <h1 className="grow-title">Materials & Inputs</h1>
          <p className="grow-subtitle">Certified organic fertilizers, microbial inoculants, seed stock, inventory warehouse & lot traceability</p>
        </div>

        <div className="grow-header-right">
          <div className="season-kpi-badge" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
            <span className="kpi-label">TOTAL INVENTORY VALUE</span>
            <span className="kpi-value">₹{invStats ? Number(invStats.total_inventory_valuation).toLocaleString() : '0'}</span>
          </div>

          {activeTab === 'catalog' && (
            <button className="btn btn-primary" onClick={openCreateCatalog}>
              <Plus size={16} />
              <span>Add to Catalog</span>
            </button>
          )}

          {activeTab === 'lots' && (
            <button className="btn btn-primary" onClick={openReceiveLotDrawer}>
              <Plus size={16} />
              <span>Receive New Lot</span>
            </button>
          )}
        </div>
      </div>

      {/* METRIC STRIP */}
      {invStats && (
        <div className="crop-stats-strip">
          <div className="stat-card-mini">
            <span className="stat-num">{invStats.total_items}</span>
            <span className="stat-lbl">Active Inventory SKUs</span>
          </div>
          <div className="stat-card-mini green">
            <span className="stat-num">{catalog.length}</span>
            <span className="stat-lbl">Catalog Inputs</span>
          </div>
          <div className="stat-card-mini orange">
            <span className="stat-num">{invStats.low_stock_items}</span>
            <span className="stat-lbl">Low Stock Alerts</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">{lots.length}</span>
            <span className="stat-lbl">Tracked Lots</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">{invStats.out_of_stock_items}</span>
            <span className="stat-lbl">Out of Stock</span>
          </div>
        </div>
      )}

      {/* SUB-NAVIGATION TABS */}
      <div className="grow-toolbar">
        <div className="view-mode-tabs">
          <button
            className={`view-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            <Leaf size={15} />
            <span>Inputs Catalog ({catalog.length})</span>
          </button>
          <button
            className={`view-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Box size={15} />
            <span>Inventory On-Hand ({inventory.length})</span>
          </button>
          <button
            className={`view-tab-btn ${activeTab === 'lots' ? 'active' : ''}`}
            onClick={() => setActiveTab('lots')}
          >
            <Layers size={15} />
            <span>Lot Management & Traceability ({lots.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="grow-search-input"
            placeholder="Search material, brand, lot #, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="grow-filter-group">
          <div className="filter-pill-select">
            <span className="filter-label">Category:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              {inputCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {activeTab === 'lots' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={expiringFilter}
                onChange={(e) => setExpiringFilter(e.target.checked)}
              />
              <span>Expiring Soon &lt; 60d</span>
            </label>
          )}

          <button className="btn btn-secondary btn-sm" onClick={fetchAllData}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* TAB 1: MASTER INPUTS CATALOG */}
      {/* ======================================================= */}
      {activeTab === 'catalog' && (
        <div className="grow-table-card">
          {loading ? (
            <div className="timeline-loading">Loading master catalog...</div>
          ) : catalog.length === 0 ? (
            <div className="harvest-empty-card">
              <FlaskConical size={42} />
              <h3>No inputs in catalog</h3>
              <p>Add organic fertilizers, soil media, and bio-pesticides to standard catalog.</p>
              <button className="btn btn-primary" onClick={openCreateCatalog}>+ Add Input</button>
            </div>
          ) : (
            <table className="grow-data-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Input Name & Formulation</th>
                  <th style={{ width: '16%' }}>Category</th>
                  <th style={{ width: '14%' }}>Active Ingredients / N-P-K</th>
                  <th style={{ width: '14%' }}>Organic / OMRI</th>
                  <th style={{ width: '18%' }}>Recommended Application Rate</th>
                  <th style={{ width: '8%' }}>Unit</th>
                  <th style={{ width: '8%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{cat.name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{cat.brand}</div>
                    </td>
                    <td>
                      <span className="day-pill">{cat.input_type}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{cat.npk_ratio || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{cat.active_ingredients}</div>
                    </td>
                    <td>
                      {cat.is_organic ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#15803d', fontSize: '12px', fontWeight: 700 }}>
                          <ShieldCheck size={14} />
                          <span>OMRI / Organic</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Standard</span>
                      )}
                      {cat.certification_number && (
                        <code style={{ fontSize: '10px', color: '#64748b' }}>{cat.certification_number}</code>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#334155' }}>{cat.recommended_application_rate || 'Standard Rate'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Crops: {cat.target_crops}</div>
                    </td>
                    <td>
                      <span className="stage-pill">{cat.default_unit}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn-icon" onClick={() => openEditCatalog(cat)} title="Edit">
                          <Edit3 size={13} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleDeleteCatalog(cat.id, cat.name)} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB 2: INVENTORY ON-HAND & REORDER STATUS */}
      {/* ======================================================= */}
      {activeTab === 'inventory' && (
        <div className="grow-table-card">
          {loading ? (
            <div className="timeline-loading">Loading inventory stock...</div>
          ) : inventory.length === 0 ? (
            <div className="harvest-empty-card">
              <Box size={42} />
              <h3>No inventory items</h3>
            </div>
          ) : (
            <table className="grow-data-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Material SKU</th>
                  <th style={{ width: '15%' }}>Category</th>
                  <th style={{ width: '12%' }}>On-Hand Qty</th>
                  <th style={{ width: '12%' }}>Available Qty</th>
                  <th style={{ width: '12%' }}>Reorder Alert</th>
                  <th style={{ width: '12%' }}>Valuation (₹)</th>
                  <th style={{ width: '15%' }}>Location & Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((inv) => {
                  const onHand = parseFloat(inv.quantity_on_hand || 0);
                  const threshold = parseFloat(inv.reorder_threshold || 10);
                  const isLow = onHand <= threshold;
                  const totalVal = onHand * (parseFloat(inv.unit_cost) || 0);

                  return (
                    <tr key={inv.id}>
                      <td>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{inv.name}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Vendor: {inv.vendor || 'Direct'}</div>
                      </td>
                      <td>
                        <span className="day-pill">{inv.input_type}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '14px', color: isLow ? '#e11d48' : '#047857' }}>
                          {onHand} {inv.unit}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
                          {parseFloat(inv.quantity_available || onHand)} {inv.unit}
                        </span>
                      </td>
                      <td>
                        {isLow ? (
                          <span className="pack-done-pill" style={{ background: '#fef2f2', color: '#e11d48', border: '1px solid #fecdd3' }}>
                            <AlertTriangle size={12} /> Low Stock (&lt;{threshold})
                          </span>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: '#16a34a' }}>Sufficient (&gt;{threshold})</span>
                        )}
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>₹{totalVal.toLocaleString()}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>@ ₹{inv.unit_cost}/{inv.unit}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>{inv.storage_location}</span>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => openStockAdjustModal(inv)}
                          >
                            <Sliders size={12} />
                            <span>Adjust</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB 3: LOT MANAGEMENT & TRACEABILITY */}
      {/* ======================================================= */}
      {activeTab === 'lots' && (
        <div className="grow-table-card">
          {loading ? (
            <div className="timeline-loading">Loading lot records...</div>
          ) : lots.length === 0 ? (
            <div className="harvest-empty-card">
              <Layers size={42} />
              <h3>No lot batches found</h3>
              <p>Receive incoming vendor seed, fertilizer, and input lots for full farm traceability.</p>
              <button className="btn btn-primary" onClick={openReceiveLotDrawer}>+ Receive New Lot</button>
            </div>
          ) : (
            <table className="grow-data-table">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Lot Number</th>
                  <th style={{ width: '22%' }}>Material & Vendor Batch</th>
                  <th style={{ width: '12%' }}>Received Date</th>
                  <th style={{ width: '14%' }}>Expiry Countdown</th>
                  <th style={{ width: '12%' }}>Remaining Qty</th>
                  <th style={{ width: '12%' }}>Container / Bin</th>
                  <th style={{ width: '10%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const isExpiring = lot.expiration_date && new Date(lot.expiration_date) <= new Date(Date.now() + 60 * 86400000);
                  const isExpired = lot.expiration_date && new Date(lot.expiration_date) < new Date();

                  return (
                    <tr key={lot.id}>
                      <td>
                        <code style={{ fontWeight: 800, color: '#047857', fontSize: '13px' }}>
                          {lot.lot_number}
                        </code>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{lot.supplier_name}</div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{lot.input_name}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Vendor Lot: {lot.vendor_lot_number || '—'}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
                          {lot.received_date ? lot.received_date.slice(0, 10) : '—'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isExpired ? '#e11d48' : (isExpiring ? '#d97706' : '#15803d') }}>
                          {lot.expiration_date ? lot.expiration_date.slice(0, 10) : 'No Expiry'}
                        </div>
                        {isExpiring && !isExpired && (
                          <div style={{ fontSize: '10.5px', color: '#d97706', fontWeight: 800 }}>EXPIRING SOON</div>
                        )}
                        {isExpired && (
                          <div style={{ fontSize: '10.5px', color: '#e11d48', fontWeight: 800 }}>EXPIRED</div>
                        )}
                      </td>
                      <td>
                        <strong>{lot.current_quantity} / {lot.initial_quantity} {lot.unit}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {lot.container_code || lot.storage_location}
                        </code>
                      </td>
                      <td>
                        <span className={`status-toggle-btn ${lot.status === 'active' ? 'active' : 'inactive'}`}>
                          {lot.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* DRAWER: CREATE / EDIT MASTER CATALOG INPUT */}
      {/* ======================================================= */}
      {showCatalogDrawer && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-xl">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FlaskConical size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  {editingCatalog ? `Edit Catalog: ${editingCatalog.name}` : 'Add Input to Master Catalog'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowCatalogDrawer(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCatalog}>
              <div className="modal-body-custom">
                <div className="form-grid-3">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Input / Material Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. Neem Seed Cake Organic Fertilizer, Bio-NPK Consortium"
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      className="form-control"
                      value={catForm.input_type}
                      onChange={(e) => setCatForm({ ...catForm, input_type: e.target.value })}
                    >
                      {inputCategories.filter(x => x !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Active Ingredients / Microbials</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Azadirachtin 0.03%, Azotobacter, Trichoderma"
                      value={catForm.active_ingredients}
                      onChange={(e) => setCatForm({ ...catForm, active_ingredients: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>N-P-K Ratio (if fertilizer)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 4-1-2 or 1.5-0.8-1.2"
                      value={catForm.npk_ratio}
                      onChange={(e) => setCatForm({ ...catForm, npk_ratio: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Default Measure Unit</label>
                    <select
                      className="form-control"
                      value={catForm.default_unit}
                      onChange={(e) => setCatForm({ ...catForm, default_unit: e.target.value })}
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="mL">mL</option>
                      <option value="Bag (50kg)">Bag (50kg)</option>
                      <option value="Bale (5kg)">Bale (5kg)</option>
                      <option value="Packet (500g)">Packet (500g)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Brand / Manufacturer</label>
                    <input
                      type="text"
                      className="form-control"
                      value={catForm.brand}
                      onChange={(e) => setCatForm({ ...catForm, brand: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Organic / OMRI Certification No.</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. NPOP/NAB/0010-ORG, OMRI-AG-4981"
                      value={catForm.certification_number}
                      onChange={(e) => setCatForm({ ...catForm, certification_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Re-Entry Interval (REI Hours)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={catForm.reentry_interval_hours}
                      onChange={(e) => setCatForm({ ...catForm, reentry_interval_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Recommended Application Rate & Method</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 250 kg per acre during bed preparation, or 5 mL per L foliar spray"
                    value={catForm.recommended_application_rate}
                    onChange={(e) => setCatForm({ ...catForm, recommended_application_rate: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Target Crops & Safe Handling Guidelines</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Suitable crops, PPE requirements, safety storage directions..."
                    value={catForm.safety_precautions}
                    onChange={(e) => setCatForm({ ...catForm, safety_precautions: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCatalogDrawer(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : editingCatalog ? 'Update Catalog' : 'Save to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: STOCK ADJUSTMENT (+ / - INVENTORY) */}
      {/* ======================================================= */}
      {showAdjustModal && selectedInvItem && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-md">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  Adjust Stock: {selectedInvItem.name}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAdjustModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment}>
              <div className="modal-body-custom">
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Current On-Hand Stock:</span>
                  <strong style={{ color: '#047857' }}>{selectedInvItem.quantity_on_hand} {selectedInvItem.unit}</strong>
                </div>

                <div className="form-group">
                  <label>Adjustment Action *</label>
                  <select
                    className="form-control"
                    value={adjForm.adjustment_type}
                    onChange={(e) => setAdjForm({ ...adjForm, adjustment_type: e.target.value })}
                  >
                    <option value="add">+ Add Stock / Restock</option>
                    <option value="deduct">- Deduct / Field Use / Wastage</option>
                    <option value="set">= Set Exact Count</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Quantity ({selectedInvItem.unit}) *</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control"
                    required
                    value={adjForm.quantity}
                    onChange={(e) => setAdjForm({ ...adjForm, quantity: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Reason for Adjustment</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Field bed application, physical inventory count correction"
                    value={adjForm.reason}
                    onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAdjustModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Updating...' : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* DRAWER: RECEIVE NEW LOT BATCH */}
      {/* ======================================================= */}
      {showLotDrawer && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-xl">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  Receive Incoming Material Lot Batch
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowLotDrawer(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLot}>
              <div className="modal-body-custom">
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Select from Catalog</label>
                    <select
                      className="form-control"
                      value={lotForm.catalog_id}
                      onChange={(e) => handleLotCatalogSelect(e.target.value)}
                    >
                      <option value="">-- Choose Input --</option>
                      {catalog.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.input_type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Material Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={lotForm.input_name}
                      onChange={(e) => setLotForm({ ...lotForm, input_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Supplier / Vendor Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={lotForm.supplier_name}
                      onChange={(e) => setLotForm({ ...lotForm, supplier_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Vendor Lot / Batch #</label>
                    <input
                      type="text"
                      className="form-control"
                      value={lotForm.vendor_lot_number}
                      onChange={(e) => setLotForm({ ...lotForm, vendor_lot_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Received Qty ({lotForm.unit}) *</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      required
                      value={lotForm.initial_quantity}
                      onChange={(e) => setLotForm({ ...lotForm, initial_quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit Cost (₹ / {lotForm.unit})</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control"
                      value={lotForm.unit_cost}
                      onChange={(e) => setLotForm({ ...lotForm, unit_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Received Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={lotForm.received_date}
                      onChange={(e) => setLotForm({ ...lotForm, received_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Expiration Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={lotForm.expiration_date}
                      onChange={(e) => setLotForm({ ...lotForm, expiration_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Storage Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={lotForm.storage_location}
                      onChange={(e) => setLotForm({ ...lotForm, storage_location: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Assigned Container / Lug Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. CRATE-FLUG-50L-102"
                      value={lotForm.container_code}
                      onChange={(e) => setLotForm({ ...lotForm, container_code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>Receiving Quality Notes</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Batch moisture, packaging integrity, batch certificate..."
                    value={lotForm.notes}
                    onChange={(e) => setLotForm({ ...lotForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLotDrawer(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Receiving...' : 'Receive Lot Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
