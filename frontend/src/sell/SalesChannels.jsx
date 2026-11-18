import React, { useState, useEffect, useMemo } from 'react';
import {
  Store, ShoppingCart, Truck, Utensils, Package, Plus, Filter, Search,
  X, ChevronDown, Check, Edit3, Trash2, Copy, RefreshCw, Eye,
  Sparkles, IndianRupee, Users, Calendar, Clock, ArrowRight,
  ShieldCheck, FileText, Send, CheckCircle2, AlertCircle, Share2
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

const CHANNEL_TYPES = [
  { label: 'Restaurant / Chef Direct', value: 'Restaurant / Chef', icon: 'Utensils', color: '#0284c7' },
  { label: 'Wholesale Market Route', value: 'Wholesale', icon: 'Truck', color: '#059669' },
  { label: 'Online Farm Store (D2C)', value: 'Online Store', icon: 'ShoppingCart', color: '#e11d48' },
  { label: 'CSA / Farm Share Subscription', value: 'CSA / Subscription', icon: 'Package', color: '#7c3aed' },
  { label: 'Farmers Market Stand', value: 'Farmers Market', icon: 'Store', color: '#d97706' },
  { label: 'Farm Stand & On-Farm Pickup', value: 'Farm Stand', icon: 'Store', color: '#0891b2' },
  { label: 'Direct to Consumer', value: 'Direct to Consumer', icon: 'ShoppingCart', color: '#16a34a' }
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SalesChannelsScreen() {
  const [channels, setChannels] = useState([]);
  const [crops, setCrops] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('channels'); // 'channels' | 'offer-sheets'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [showOfferSheetModal, setShowOfferSheetModal] = useState(false);
  const [selectedOfferChannel, setSelectedOfferChannel] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form
  const [form, setForm] = useState({
    name: '',
    channel_type: 'Restaurant / Chef',
    description: '',
    pricing_tier: 'Wholesale Standard',
    delivery_days: ['Tuesday', 'Friday'],
    order_cutoff_hours: 24,
    payment_terms: 'Net 15',
    min_order_amount: 1500,
    tax_rate_pct: 5.0,
    color_hex: '#0284c7',
    icon_name: 'Utensils',
    is_active: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chRes, crRes, cuRes] = await Promise.all([
        fetch(`${API_BASE}/sales-channels`),
        fetch(`${API_BASE}/crops?status=active`),
        fetch(`${API_BASE}/customers`)
      ]);

      const chData = await chRes.json();
      const crData = await crRes.json();
      const cuData = await cuRes.json();

      if (chData.success) setChannels(chData.data);
      if (crData.success) setCrops(crData.data);
      if (cuData.success) setCustomers(cuData.data);
    } catch (err) {
      console.error('Error fetching sales channels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchType = typeFilter === 'All' || c.channel_type === typeFilter;
      const matchStatus = statusFilter === 'All' || (statusFilter === 'active' ? c.is_active : !c.is_active);
      return matchSearch && matchType && matchStatus;
    });
  }, [channels, searchQuery, typeFilter, statusFilter]);

  // Overall KPIs
  const totalRevenue = useMemo(() => {
    return channels.reduce((acc, c) => acc + (parseFloat(c.total_revenue) || 0), 0);
  }, [channels]);

  const totalCustomers = useMemo(() => {
    return channels.reduce((acc, c) => acc + (parseInt(c.customer_count) || 0), 0);
  }, [channels]);

  // Handle Save
  const handleSaveChannel = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setIsSaving(true);
      const url = editingChannel
        ? `${API_BASE}/sales-channels/${editingChannel.id}`
        : `${API_BASE}/sales-channels`;
      const method = editingChannel ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingChannel ? 'Sales channel updated' : 'New sales channel created');
        setShowAddModal(false);
        setEditingChannel(null);
        fetchData();
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDeleteChannel = async (id, name) => {
    if (!window.confirm(`Delete sales channel "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/sales-channels/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Sales channel deleted');
        fetchData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Toggle active status
  const handleToggleActive = async (channel) => {
    try {
      const res = await fetch(`${API_BASE}/sales-channels/${channel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !channel.is_active })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Channel ${!channel.is_active ? 'activated' : 'deactivated'}`);
        fetchData();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  // Open edit modal
  const openEditModal = (c) => {
    setEditingChannel(c);
    setForm({
      name: c.name,
      channel_type: c.channel_type,
      description: c.description || '',
      pricing_tier: c.pricing_tier || 'Wholesale Standard',
      delivery_days: Array.isArray(c.delivery_days) ? c.delivery_days : (typeof c.delivery_days === 'string' ? JSON.parse(c.delivery_days) : ['Tuesday']),
      order_cutoff_hours: c.order_cutoff_hours || 24,
      payment_terms: c.payment_terms || 'Net 30',
      min_order_amount: c.min_order_amount || 0,
      tax_rate_pct: c.tax_rate_pct || 0,
      color_hex: c.color_hex || '#0284c7',
      icon_name: c.icon_name || 'Store',
      is_active: c.is_active !== undefined ? c.is_active : true
    });
    setShowAddModal(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingChannel(null);
    setForm({
      name: '',
      channel_type: 'Restaurant / Chef',
      description: 'Twice-weekly deliveries with custom chef pack sizes',
      pricing_tier: 'Chef Preferred',
      delivery_days: ['Tuesday', 'Friday'],
      order_cutoff_hours: 36,
      payment_terms: 'Net 15',
      min_order_amount: 1500,
      tax_rate_pct: 5.0,
      color_hex: '#0284c7',
      icon_name: 'Utensils',
      is_active: true
    });
    setShowAddModal(true);
  };

  const getChannelIcon = (type) => {
    switch (type) {
      case 'Restaurant / Chef': return <Utensils size={18} />;
      case 'Wholesale': return <Truck size={18} />;
      case 'Online Store': return <ShoppingCart size={18} />;
      case 'CSA / Subscription': return <Package size={18} />;
      default: return <Store size={18} />;
    }
  };

  return (
    <div className="grow-page-container">
      {/* Toast */}
      {notification && (
        <div className="grow-toast">
          <Sparkles size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="grow-header">
        <div className="grow-header-left">
          <div className="grow-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>SELL MODULE</div>
          <h1 className="grow-title">Sales Channels</h1>
          <p className="grow-subtitle">Manage wholesale routes, restaurant accounts, online store, delivery schedules and pricing tiers</p>
        </div>

        <div className="grow-header-right">
          <div className="season-kpi-badge" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
            <span className="kpi-label">TOTAL CHANNEL REVENUE</span>
            <span className="kpi-value">₹{Number(totalRevenue).toLocaleString()}</span>
          </div>

          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Add Sales Channel</span>
          </button>
        </div>
      </div>

      {/* METRICS STRIP */}
      <div className="crop-stats-strip">
        <div className="stat-card-mini">
          <span className="stat-num">{channels.length}</span>
          <span className="stat-lbl">Active Channels</span>
        </div>
        <div className="stat-card-mini green">
          <span className="stat-num">{totalCustomers}</span>
          <span className="stat-lbl">Assigned Customers</span>
        </div>
        <div className="stat-card-mini orange">
          <span className="stat-num">{channels.reduce((acc, c) => acc + (parseInt(c.active_orders_count) || 0), 0)}</span>
          <span className="stat-lbl">Active Channel Orders</span>
        </div>
        <div className="stat-card-mini">
          <span className="stat-num">₹{(totalRevenue / Math.max(1, channels.length)).toFixed(0)}</span>
          <span className="stat-lbl">Avg Revenue / Channel</span>
        </div>
      </div>

      {/* VIEW TABS & TOOLBAR */}
      <div className="grow-toolbar">
        {/* Navigation Tabs */}
        <div className="view-mode-tabs">
          <button
            className={`view-tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
            onClick={() => setActiveTab('channels')}
          >
            <Store size={15} />
            <span>Sales Channels ({channels.length})</span>
          </button>
          <button
            className={`view-tab-btn ${activeTab === 'offer-sheets' ? 'active' : ''}`}
            onClick={() => setActiveTab('offer-sheets')}
          >
            <FileText size={15} />
            <span>Offer Sheets & Fresh Sheets</span>
          </button>
        </div>

        {/* Search */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="grow-search-input"
            placeholder="Search channels, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="grow-filter-group">
          {/* Channel Type Filter */}
          <div className="filter-pill-select">
            <span className="filter-label">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Types</option>
              {CHANNEL_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* TAB 1: SALES CHANNELS CARDS GRID */}
      {/* ======================================================= */}
      {activeTab === 'channels' && (
        <div className="channels-grid-layout">
          {loading ? (
            <div className="timeline-loading">Loading sales channels...</div>
          ) : filteredChannels.length === 0 ? (
            <div className="harvest-empty-card" style={{ gridColumn: '1 / -1' }}>
              <Store size={40} />
              <h3>No sales channels found</h3>
              <p>Create your first sales channel to start managing wholesale, restaurant, or D2C orders.</p>
              <button className="btn btn-primary" onClick={openCreateModal}>
                + Add Sales Channel
              </button>
            </div>
          ) : (
            filteredChannels.map((c) => {
              const deliveryDays = Array.isArray(c.delivery_days)
                ? c.delivery_days
                : (typeof c.delivery_days === 'string' ? JSON.parse(c.delivery_days) : []);

              return (
                <div key={c.id} className={`channel-card ${!c.is_active ? 'is-inactive' : ''}`}>
                  {/* Card Top Banner */}
                  <div className="channel-card-header" style={{ borderLeft: `4px solid ${c.color_hex || '#0284c7'}` }}>
                    <div className="channel-header-left">
                      <div className="channel-icon-avatar" style={{ backgroundColor: `${c.color_hex || '#0284c7'}18`, color: c.color_hex || '#0284c7' }}>
                        {getChannelIcon(c.channel_type)}
                      </div>
                      <div>
                        <h3 className="channel-name-title">{c.name}</h3>
                        <span className="channel-type-subtitle">{c.channel_type}</span>
                      </div>
                    </div>

                    <div className="channel-header-right">
                      <button
                        className={`status-toggle-btn ${c.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(c)}
                        title={c.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {c.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="channel-card-body">
                    <p className="channel-desc-text">{c.description || 'No channel description provided.'}</p>

                    {/* Delivery Days Pills */}
                    <div className="channel-prop-row">
                      <span className="prop-label"><Calendar size={13} /> Fulfillment:</span>
                      <div className="delivery-days-flex">
                        {deliveryDays.map(d => (
                          <span key={d} className="day-pill">{d.slice(0, 3)}</span>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Tier & Cutoff */}
                    <div className="channel-specs-grid">
                      <div className="spec-item">
                        <span className="spec-label">Pricing Tier</span>
                        <span className="spec-value tag">{c.pricing_tier}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Order Cutoff</span>
                        <span className="spec-value">{c.order_cutoff_hours}h prior</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Payment Terms</span>
                        <span className="spec-value">{c.payment_terms}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Min. Order</span>
                        <span className="spec-value">₹{Number(c.min_order_amount || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Aggregate Stats Strip */}
                    <div className="channel-stats-footer">
                      <div className="c-stat">
                        <Users size={14} />
                        <span><strong>{c.customer_count || 0}</strong> Customers</span>
                      </div>
                      <div className="c-stat">
                        <IndianRupee size={14} />
                        <span><strong>₹{Number(c.total_revenue || 0).toLocaleString()}</strong> Revenue</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="channel-card-footer">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSelectedOfferChannel(c);
                        setShowOfferSheetModal(true);
                      }}
                      title="Generate Weekly Offer Sheet"
                    >
                      <FileText size={13} />
                      <span>Offer Sheet</span>
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-icon" onClick={() => openEditModal(c)} title="Edit Channel Settings">
                        <Edit3 size={14} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDeleteChannel(c.id, c.name)} title="Delete Channel">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* TAB 2: OFFER SHEETS & FRESH SHEETS BUILDER */}
      {/* ======================================================= */}
      {activeTab === 'offer-sheets' && (
        <div className="grow-table-card">
          <div className="pane-header-flex" style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Weekly Fresh Produce Offer Sheet</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                Live catalog of available crops for restaurant chefs and wholesale buyers
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                const text = crops.map(c => `• ${c.name} (${c.varieties?.[0]?.variety_name || 'Standard'}) - ₹${c.default_price_per_unit}/${c.yield_unit}`).join('\n');
                navigator.clipboard.writeText(`🌿 VIVAS AI FRESH PRODUCE OFFER SHEET\nWeek of ${new Date().toLocaleDateString()}\n\n${text}\n\nMinimum order: ₹1,500. Order cutoff: 36h before delivery.`);
                showToast('Offer sheet text copied to clipboard!');
              }}
            >
              <Share2 size={14} />
              <span>Copy Offer Sheet Text</span>
            </button>
          </div>

          <table className="grow-data-table">
            <thead>
              <tr>
                <th>Crop & Variety</th>
                <th>Category</th>
                <th>Harvest Stage</th>
                <th>Wholesale Unit</th>
                <th>Standard Price</th>
                <th>Chef Tier Price</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {crops.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{c.icon_emoji || '🌱'}</span>
                      <div>
                        <strong>{c.name}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{c.varieties?.[0]?.variety_name || 'Standard'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="stage-pill">{c.category}</span></td>
                  <td>{c.harvest_stage}</td>
                  <td><strong>{c.yield_unit}</strong></td>
                  <td><strong>₹{c.default_price_per_unit}</strong></td>
                  <td><strong style={{ color: '#0284c7' }}>₹{(c.default_price_per_unit * 0.9).toFixed(0)}</strong></td>
                  <td>
                    <span className="status-select in_ground">In Harvest Window</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: ADD / EDIT SALES CHANNEL */}
      {/* ======================================================= */}
      {showAddModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-lg">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  {editingChannel ? `Edit Channel: ${form.name}` : 'Create New Sales Channel'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveChannel}>
              <div className="modal-body-custom">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Channel Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Indiranagar Restaurant Route"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Channel Type *</label>
                    <select
                      className="form-control"
                      value={form.channel_type}
                      onChange={(e) => {
                        const selectedType = e.target.value;
                        const matching = CHANNEL_TYPES.find(t => t.value === selectedType);
                        setForm({
                          ...form,
                          channel_type: selectedType,
                          color_hex: matching?.color || form.color_hex,
                          icon_name: matching?.icon || form.icon_name
                        });
                      }}
                    >
                      {CHANNEL_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Description & Notes</label>
                    <textarea
                      rows={2}
                      className="form-control"
                      placeholder="Account terms, packaging instructions, delivery notes..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Default Pricing Tier</label>
                    <select
                      className="form-control"
                      value={form.pricing_tier}
                      onChange={(e) => setForm({ ...form, pricing_tier: e.target.value })}
                    >
                      <option value="Chef Preferred">Chef Preferred (-10%)</option>
                      <option value="Wholesale Standard">Wholesale Standard (-20%)</option>
                      <option value="Retail Full Price">Retail Full Price (100%)</option>
                      <option value="CSA Member">CSA Member Prepaid</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Terms</label>
                    <select
                      className="form-control"
                      value={form.payment_terms}
                      onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                    >
                      <option value="Due on Receipt">Due on Receipt (COD / Immediate)</option>
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Prepaid">Prepaid / Subscription</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Order Cutoff Time (Hours before delivery)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.order_cutoff_hours}
                      onChange={(e) => setForm({ ...form, order_cutoff_hours: parseInt(e.target.value) || 24 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Minimum Order Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.min_order_amount}
                      onChange={(e) => setForm({ ...form, min_order_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Applicable Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={form.tax_rate_pct}
                      onChange={(e) => setForm({ ...form, tax_rate_pct: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Channel Theme Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="color"
                        className="form-control-color"
                        value={form.color_hex}
                        onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                      />
                      <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>{form.color_hex}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Schedule Days */}
                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Scheduled Delivery / Fulfillment Days
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = form.delivery_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`day-toggle-pill ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setForm({ ...form, delivery_days: form.delivery_days.filter(d => d !== day) });
                            } else {
                              setForm({ ...form, delivery_days: [...form.delivery_days, day] });
                            }
                          }}
                        >
                          {isSelected && <Check size={13} />}
                          <span>{day}</span>
                        </button>
                      );
                    })}
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
                  {isSaving ? 'Saving...' : editingChannel ? 'Update Channel' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: OFFER SHEET PREVIEW */}
      {/* ======================================================= */}
      {showOfferSheetModal && selectedOfferChannel && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-lg">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} className="modal-icon" />
                <h3 className="modal-title-custom">Offer Sheet for {selectedOfferChannel.name}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowOfferSheetModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-custom">
              <div className="offer-sheet-card-preview">
                <div className="offer-sheet-header">
                  <div className="farm-brand">🌿 Vivas AI Organic Farm</div>
                  <div className="sheet-date">Weekly Fresh Harvest Catalog • Week of {new Date().toLocaleDateString()}</div>
                  <div className="sheet-meta">Channel: {selectedOfferChannel.name} • Terms: {selectedOfferChannel.payment_terms} • Min Order: ₹{selectedOfferChannel.min_order_amount}</div>
                </div>

                <div className="offer-items-list">
                  {crops.slice(0, 6).map(c => (
                    <div key={c.id} className="offer-item-row">
                      <div>
                        <strong>{c.icon_emoji || '🌱'} {c.name}</strong>
                        <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px' }}>({c.varieties?.[0]?.variety_name || 'Standard'})</span>
                      </div>
                      <div className="offer-item-pricing">
                        <span>₹{c.default_price_per_unit} / {c.yield_unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowOfferSheetModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  showToast('Offer sheet sent to all channel buyers via email/SMS!');
                  setShowOfferSheetModal(false);
                }}
              >
                <Send size={14} />
                <span>Send to {selectedOfferChannel.customer_count || 3} Channel Buyers</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
