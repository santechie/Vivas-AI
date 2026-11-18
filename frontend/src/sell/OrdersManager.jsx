import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, Plus, Filter, Search, X, ChevronDown, Check, CheckCircle2,
  Clock, IndianRupee, Calendar, Truck, Store, User, Edit3, Trash2,
  Printer, FileText, Send, Sparkles, RefreshCw, Eye, AlertCircle,
  TrendingUp, Layers, Box, ArrowRight
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function OrdersManagerScreen() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [channels, setChannels] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'upcoming'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    customer_company: '',
    customer_email: '',
    customer_phone: '',
    sales_channel_id: '',
    sales_channel_name: '',
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: new Date().toISOString().slice(0, 10),
    fulfillment_type: 'Delivery',
    fulfillment_status: 'submitted',
    payment_status: 'unpaid',
    payment_method: 'Invoice / Net 15',
    delivery_fee: 150.00,
    tax_rate_pct: 5.0,
    discount_amount: 0.00,
    packing_notes: '',
    invoice_notes: '',
    items: [
      { crop_name: 'Tomatoes', variety_name: 'San Marzano', packaging_unit: 'kg', unit_price: 75, quantity_ordered: 20, is_packed: false }
    ]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      let ordersUrl = `${API_BASE}/orders?status=${statusFilter}&channel_id=${channelFilter}&search=${encodeURIComponent(searchQuery)}`;
      if (dateFilter === 'today') {
        ordersUrl += `&date=${new Date().toISOString().slice(0, 10)}`;
      }

      const [oRes, sRes, chRes, cuRes, crRes] = await Promise.all([
        fetch(ordersUrl),
        fetch(`${API_BASE}/orders/stats`),
        fetch(`${API_BASE}/sales-channels`),
        fetch(`${API_BASE}/customers`),
        fetch(`${API_BASE}/crops?status=active`)
      ]);

      const oData = await oRes.json();
      const sData = await sRes.json();
      const chData = await chRes.json();
      const cuData = await cuRes.json();
      const crData = await crRes.json();

      if (oData.success) setOrders(oData.data);
      if (sData.success) setStats(sData.data);
      if (chData.success) setChannels(chData.data);
      if (cuData.success) setCustomers(cuData.data);
      if (crData.success) setCrops(crData.data);
    } catch (err) {
      console.error('Error fetching orders data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, channelFilter, dateFilter, searchQuery]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Calculations for Form
  const formSubtotal = useMemo(() => {
    return form.items.reduce((acc, item) => acc + ((parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_price) || 0)), 0);
  }, [form.items]);

  const formTaxAmount = useMemo(() => {
    return (formSubtotal * ((parseFloat(form.tax_rate_pct) || 0) / 100));
  }, [formSubtotal, form.tax_rate_pct]);

  const formTotalAmount = useMemo(() => {
    return formSubtotal + formTaxAmount + (parseFloat(form.delivery_fee) || 0) - (parseFloat(form.discount_amount) || 0);
  }, [formSubtotal, formTaxAmount, form.delivery_fee, form.discount_amount]);

  // Handle Customer Select in Modal
  const handleCustomerSelect = (custId) => {
    const cust = customers.find(c => c.id === custId);
    if (!cust) return;
    const defaultChan = channels.find(ch => ch.id === cust.default_channel_id) || channels[0];
    setForm({
      ...form,
      customer_id: cust.id,
      customer_name: cust.name,
      customer_company: cust.company_name || '',
      customer_email: cust.email || '',
      customer_phone: cust.phone || '',
      sales_channel_id: defaultChan?.id || form.sales_channel_id,
      sales_channel_name: defaultChan?.name || form.sales_channel_name,
      payment_method: cust.payment_terms ? `Invoice / ${cust.payment_terms}` : form.payment_method
    });
  };

  // Handle Channel Select in Modal
  const handleChannelSelect = (chanId) => {
    const chan = channels.find(c => c.id === chanId);
    if (!chan) return;
    setForm({
      ...form,
      sales_channel_id: chan.id,
      sales_channel_name: chan.name,
      tax_rate_pct: parseFloat(chan.tax_rate_pct) || 5.0,
      payment_method: chan.payment_terms ? `Invoice / ${chan.payment_terms}` : form.payment_method
    });
  };

  // Line Item Handlers
  const handleAddItem = () => {
    const defaultCrop = crops[0];
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          crop_name: defaultCrop?.name || 'Produce Item',
          variety_name: defaultCrop?.varieties?.[0]?.variety_name || 'Standard',
          packaging_unit: defaultCrop?.yield_unit || 'kg',
          unit_price: defaultCrop?.default_price_per_unit || 50,
          quantity_ordered: 10,
          is_packed: false
        }
      ]
    });
  };

  const handleRemoveItem = (idx) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx)
    });
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...form.items];
    updated[idx][field] = val;
    // Auto-update price/unit if crop changes
    if (field === 'crop_name') {
      const cr = crops.find(c => c.name === val);
      if (cr) {
        updated[idx].variety_name = cr.varieties?.[0]?.variety_name || 'Standard';
        updated[idx].packaging_unit = cr.yield_unit || 'kg';
        updated[idx].unit_price = cr.default_price_per_unit || 50;
      }
    }
    setForm({ ...form, items: updated });
  };

  // Save / Submit Order
  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      alert('Please enter or select a customer name');
      return;
    }
    if (form.items.length === 0) {
      alert('Please add at least one line item');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...form,
        subtotal: formSubtotal,
        tax_amount: formTaxAmount,
        total_amount: formTotalAmount
      };

      const url = editingOrder
        ? `${API_BASE}/orders/${editingOrder.id}`
        : `${API_BASE}/orders`;
      const method = editingOrder ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingOrder ? 'Order updated successfully' : 'New order created');
        setShowOrderModal(false);
        setEditingOrder(null);
        fetchData();
      }
    } catch (err) {
      console.error('Error saving order:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (id, orderNo) => {
    if (!window.confirm(`Delete order ${orderNo}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Order deleted');
        fetchData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Quick Status change
  const handleStatusChange = async (id, statusType, newVal) => {
    try {
      const body = statusType === 'fulfillment' ? { fulfillment_status: newVal } : { payment_status: newVal };
      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Order status updated`);
        fetchData();
      }
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  // Open Edit Modal
  const openEditModal = (o) => {
    setEditingOrder(o);
    setForm({
      customer_id: o.customer_id || '',
      customer_name: o.customer_name || '',
      customer_company: o.customer_company || '',
      customer_email: o.customer_email || '',
      customer_phone: o.customer_phone || '',
      sales_channel_id: o.sales_channel_id || '',
      sales_channel_name: o.sales_channel_name || '',
      order_date: o.order_date ? o.order_date.slice(0, 10) : '',
      delivery_date: o.delivery_date ? o.delivery_date.slice(0, 10) : '',
      fulfillment_type: o.fulfillment_type || 'Delivery',
      fulfillment_status: o.fulfillment_status || 'submitted',
      payment_status: o.payment_status || 'unpaid',
      payment_method: o.payment_method || 'Invoice / Net 15',
      delivery_fee: parseFloat(o.delivery_fee) || 0,
      tax_rate_pct: 5.0,
      discount_amount: parseFloat(o.discount_amount) || 0,
      packing_notes: o.packing_notes || '',
      invoice_notes: o.invoice_notes || '',
      items: Array.isArray(o.items) && o.items.length > 0 ? o.items : [
        { crop_name: 'Produce Item', variety_name: 'Standard', packaging_unit: 'kg', unit_price: 50, quantity_ordered: 10, is_packed: false }
      ]
    });
    setShowOrderModal(true);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingOrder(null);
    const defaultCust = customers[0];
    const defaultChan = channels[0];
    setForm({
      customer_id: defaultCust?.id || '',
      customer_name: defaultCust?.name || 'Chef Anand S.',
      customer_company: defaultCust?.company_name || 'The Greenhouse Bistro',
      customer_email: defaultCust?.email || 'orders@greenhousebistro.com',
      customer_phone: defaultCust?.phone || '+91 98450 12345',
      sales_channel_id: defaultChan?.id || '',
      sales_channel_name: defaultChan?.name || 'Restaurant & Chef Direct',
      order_date: new Date().toISOString().slice(0, 10),
      delivery_date: new Date().toISOString().slice(0, 10),
      fulfillment_type: 'Delivery',
      fulfillment_status: 'submitted',
      payment_status: 'unpaid',
      payment_method: 'Invoice / Net 15',
      delivery_fee: 150.00,
      tax_rate_pct: 5.0,
      discount_amount: 0.00,
      packing_notes: 'Pack in vented green crates. Label with chef route tags.',
      invoice_notes: 'Due in 15 days.',
      items: [
        { crop_name: 'Tomatoes', variety_name: 'San Marzano', packaging_unit: 'kg', unit_price: 75, quantity_ordered: 20, is_packed: false },
        { crop_name: 'Basil', variety_name: 'Genovese', packaging_unit: 'Bunch', unit_price: 35, quantity_ordered: 30, is_packed: false }
      ]
    });
    setShowOrderModal(true);
  };

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
          <div className="grow-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>SELL MODULE</div>
          <h1 className="grow-title">Orders Manager</h1>
          <p className="grow-subtitle">Track wholesale orders, customer packing slips, invoice generation and fulfillment status</p>
        </div>

        <div className="grow-header-right">
          <div className="season-kpi-badge" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
            <span className="kpi-label">TOTAL REVENUE</span>
            <span className="kpi-value">₹{stats ? Number(stats.total_revenue).toLocaleString() : '0'}</span>
          </div>

          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* METRIC STRIP */}
      {stats && (
        <div className="crop-stats-strip">
          <div className="stat-card-mini">
            <span className="stat-num">{stats.total_orders}</span>
            <span className="stat-lbl">Total Orders</span>
          </div>
          <div className="stat-card-mini green">
            <span className="stat-num">{stats.submitted_count}</span>
            <span className="stat-lbl">Submitted / Pending</span>
          </div>
          <div className="stat-card-mini orange">
            <span className="stat-num">{stats.in_packing_count + stats.packed_count}</span>
            <span className="stat-lbl">In Packing & Ready</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">{stats.fulfilled_count}</span>
            <span className="stat-lbl">Fulfilled & Delivered</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">₹{Number(stats.avg_order_value || 0).toFixed(0)}</span>
            <span className="stat-lbl">Avg Order Value</span>
          </div>
        </div>
      )}

      {/* TOOLBAR & FILTERS */}
      <div className="grow-toolbar">
        {/* Status Tabs */}
        <div className="view-mode-tabs">
          <button
            className={`view-tab-btn ${statusFilter === 'All' ? 'active' : ''}`}
            onClick={() => setStatusFilter('All')}
          >
            <span>All ({orders.length})</span>
          </button>
          <button
            className={`view-tab-btn ${statusFilter === 'submitted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('submitted')}
          >
            <span>Submitted</span>
          </button>
          <button
            className={`view-tab-btn ${statusFilter === 'in_packing' ? 'active' : ''}`}
            onClick={() => setStatusFilter('in_packing')}
          >
            <span>In Packing</span>
          </button>
          <button
            className={`view-tab-btn ${statusFilter === 'packed' ? 'active' : ''}`}
            onClick={() => setStatusFilter('packed')}
          >
            <span>Packed</span>
          </button>
          <button
            className={`view-tab-btn ${statusFilter === 'fulfilled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('fulfilled')}
          >
            <span>Fulfilled</span>
          </button>
        </div>

        {/* Search */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="grow-search-input"
            placeholder="Search order #, customer, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="grow-filter-group">
          {/* Channel Filter */}
          <div className="filter-pill-select">
            <span className="filter-label">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="All">All Channels</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="filter-pill-select">
            <span className="filter-label">Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today's Delivery</option>
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchData}>
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ORDERS DATA TABLE */}
      {loading ? (
        <div className="timeline-loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="harvest-empty-card">
          <ShoppingBag size={42} />
          <h3>No orders match your filter</h3>
          <p>Click "+ New Order" to manually create a wholesale, restaurant, or D2C order.</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Create New Order
          </button>
        </div>
      ) : (
        <div className="grow-table-card">
          <table className="grow-data-table">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>Order Number</th>
                <th style={{ width: '20%' }}>Customer & Company</th>
                <th style={{ width: '15%' }}>Sales Channel</th>
                <th style={{ width: '12%' }}>Delivery Date</th>
                <th style={{ width: '14%' }}>Items Summary</th>
                <th style={{ width: '10%' }}>Total (₹)</th>
                <th style={{ width: '12%' }}>Status</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const isPacked = o.fulfillment_status === 'packed';
                const isFulfilled = o.fulfillment_status === 'fulfilled';
                const itemsCount = Array.isArray(o.items) ? o.items.length : 0;

                return (
                  <tr key={o.id}>
                    {/* Order # */}
                    <td>
                      <code style={{ fontWeight: 800, color: '#0369a1', fontSize: '13px' }}>
                        {o.order_number || o.order_no}
                      </code>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {o.order_date ? o.order_date.slice(0, 10) : ''}
                      </div>
                    </td>

                    {/* Customer */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="crop-mini-icon" style={{ background: '#f1f5f9' }}>
                          <User size={14} style={{ color: '#475569' }} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{o.customer_name}</strong>
                          {o.customer_company && (
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{o.customer_company}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Channel */}
                    <td>
                      <span
                        className="day-pill"
                        style={{
                          background: `${o.channel_color || '#0284c7'}15`,
                          color: o.channel_color || '#0284c7',
                          border: `1px solid ${o.channel_color || '#0284c7'}30`,
                          fontWeight: 700
                        }}
                      >
                        {o.sales_channel_name || 'Direct'}
                      </span>
                    </td>

                    {/* Delivery Date */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={13} style={{ color: '#64748b' }} />
                        <span style={{ fontWeight: 600 }}>{o.delivery_date ? o.delivery_date.slice(0, 10) : '—'}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{o.fulfillment_type || 'Delivery'}</div>
                    </td>

                    {/* Items */}
                    <td>
                      <span className="stage-pill" style={{ fontWeight: 700 }}>
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </span>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                        {o.items?.map(it => `${it.crop_name} (${it.quantity_ordered}${it.packaging_unit})`).join(', ')}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td>
                      <strong style={{ color: '#047857', fontSize: '13.5px' }}>
                        ₹{Number(o.total_amount || o.amount || 0).toLocaleString()}
                      </strong>
                      <div style={{ fontSize: '10.5px', color: o.payment_status === 'paid' ? '#16a34a' : '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>
                        {o.payment_status || 'unpaid'}
                      </div>
                    </td>

                    {/* Fulfillment Status Select */}
                    <td>
                      <select
                        className={`status-select ${o.fulfillment_status || o.status}`}
                        value={o.fulfillment_status || o.status || 'submitted'}
                        onChange={(e) => handleStatusChange(o.id, 'fulfillment', e.target.value)}
                      >
                        <option value="submitted">Submitted</option>
                        <option value="in_packing">In Packing</option>
                        <option value="packed">Packed</option>
                        <option value="fulfilled">Fulfilled</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => {
                            setSelectedInvoiceOrder(o);
                            setShowInvoiceModal(true);
                          }}
                          title="View / Print Invoice & Packing Slip"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(o)}
                          title="Edit Order"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteOrder(o.id, o.order_number || o.order_no)}
                          title="Delete Order"
                        >
                          <Trash2 size={14} />
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
      {/* MODAL: CREATE / EDIT ORDER */}
      {/* ======================================================= */}
      {showOrderModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-xl">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  {editingOrder ? `Edit Order: ${editingOrder.order_number || editingOrder.order_no}` : 'Create New Farm Order'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowOrderModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder}>
              <div className="modal-body-custom">
                {/* Section 1: Customer & Channel */}
                <h4 className="modal-subheading">1. Customer & Delivery Channel</h4>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Select Existing Customer</label>
                    <select
                      className="form-control"
                      value={form.customer_id}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.company_name || c.customer_type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Company / Restaurant</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.customer_company}
                      onChange={(e) => setForm({ ...form, customer_company: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Sales Channel</label>
                    <select
                      className="form-control"
                      value={form.sales_channel_id}
                      onChange={(e) => handleChannelSelect(e.target.value)}
                    >
                      {channels.map(ch => (
                        <option key={ch.id} value={ch.id}>{ch.name} ({ch.channel_type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Delivery / Fulfillment Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      required
                      value={form.delivery_date}
                      onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Fulfillment Type</label>
                    <select
                      className="form-control"
                      value={form.fulfillment_type}
                      onChange={(e) => setForm({ ...form, fulfillment_type: e.target.value })}
                    >
                      <option value="Delivery">Farm Delivery Route</option>
                      <option value="Farm Pickup">Farm Pickup / Stand</option>
                      <option value="Shipping">Courier / Express Shipping</option>
                    </select>
                  </div>
                </div>

                {/* Section 2: Line Items */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '8px' }}>
                  <h4 className="modal-subheading" style={{ margin: 0 }}>2. Order Line Items</h4>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                    <Plus size={13} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="order-items-builder-table">
                  <table className="grow-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '30%' }}>Crop / Product</th>
                        <th style={{ width: '22%' }}>Variety</th>
                        <th style={{ width: '14%' }}>Unit</th>
                        <th style={{ width: '14%' }}>Price (₹)</th>
                        <th style={{ width: '12%' }}>Quantity</th>
                        <th style={{ width: '14%' }}>Total (₹)</th>
                        <th style={{ width: '6%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => {
                        const lineTotal = (parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_price) || 0);
                        return (
                          <tr key={idx}>
                            <td>
                              <select
                                className="form-control form-control-sm"
                                value={item.crop_name}
                                onChange={(e) => handleItemChange(idx, 'crop_name', e.target.value)}
                              >
                                {crops.map(c => (
                                  <option key={c.id} value={c.name}>{c.icon_emoji || '🌱'} {c.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={item.variety_name}
                                onChange={(e) => handleItemChange(idx, 'variety_name', e.target.value)}
                              />
                            </td>
                            <td>
                              <select
                                className="form-control form-control-sm"
                                value={item.packaging_unit}
                                onChange={(e) => handleItemChange(idx, 'packaging_unit', e.target.value)}
                              >
                                <option value="kg">kg</option>
                                <option value="Bunch">Bunch</option>
                                <option value="Pint">Pint</option>
                                <option value="Head">Head</option>
                                <option value="Box">Box</option>
                                <option value="Flat">Flat</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                className="form-control form-control-sm"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.5"
                                className="form-control form-control-sm"
                                value={item.quantity_ordered}
                                onChange={(e) => handleItemChange(idx, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <strong>₹{lineTotal.toFixed(2)}</strong>
                            </td>
                            <td>
                              {form.items.length > 1 && (
                                <button
                                  type="button"
                                  className="btn-icon danger"
                                  onClick={() => handleRemoveItem(idx)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Section 3: Summary Totals & Notes */}
                <div className="order-summary-grid" style={{ marginTop: '20px' }}>
                  <div className="form-group">
                    <label>Packing & Storage Instructions</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Special crate labels, cold-storage requirements..."
                      value={form.packing_notes}
                      onChange={(e) => setForm({ ...form, packing_notes: e.target.value })}
                    />
                  </div>

                  <div className="order-totals-card">
                    <div className="totals-row">
                      <span>Subtotal:</span>
                      <span>₹{formSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="totals-row">
                      <span>Delivery Fee:</span>
                      <input
                        type="number"
                        className="form-control form-control-sm totals-input"
                        value={form.delivery_fee}
                        onChange={(e) => setForm({ ...form, delivery_fee: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="totals-row">
                      <span>Tax ({form.tax_rate_pct}%):</span>
                      <span>₹{formTaxAmount.toFixed(2)}</span>
                    </div>
                    <div className="totals-row grand-total">
                      <span>Grand Total:</span>
                      <span style={{ color: '#15803d' }}>₹{formTotalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer-custom">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOrderModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : editingOrder ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: PRINTABLE INVOICE & PACKING SLIP PREVIEW */}
      {/* ======================================================= */}
      {showInvoiceModal && selectedInvoiceOrder && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-lg">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={20} className="modal-icon" />
                <h3 className="modal-title-custom">Invoice & Packing Slip: {selectedInvoiceOrder.order_number || selectedInvoiceOrder.order_no}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowInvoiceModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-custom">
              <div className="printable-slip-wrapper">
                {/* Slip Header */}
                <div className="slip-header-flex">
                  <div>
                    <h2 style={{ margin: 0, color: '#0f172a', fontWeight: 800 }}>🌿 Vivas AI Organic Farm</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                      Indiranagar Harvest Hub, Bangalore • orders@vivasai.farm
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0369a1' }}>
                      INVOICE / PACK SLIP
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>
                      {selectedInvoiceOrder.order_number || selectedInvoiceOrder.order_no}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Date: {selectedInvoiceOrder.delivery_date?.slice(0, 10)}
                    </div>
                  </div>
                </div>

                {/* Customer Info Box */}
                <div className="slip-meta-grid">
                  <div>
                    <span className="slip-meta-lbl">BILL / DELIVER TO:</span>
                    <strong>{selectedInvoiceOrder.customer_name}</strong>
                    {selectedInvoiceOrder.customer_company && <div>{selectedInvoiceOrder.customer_company}</div>}
                    <div>{selectedInvoiceOrder.customer_email}</div>
                    <div>{selectedInvoiceOrder.customer_phone}</div>
                  </div>
                  <div>
                    <span className="slip-meta-lbl">ORDER DETAILS:</span>
                    <div><strong>Channel:</strong> {selectedInvoiceOrder.sales_channel_name || 'Wholesale'}</div>
                    <div><strong>Fulfillment:</strong> {selectedInvoiceOrder.fulfillment_type || 'Delivery'}</div>
                    <div><strong>Terms:</strong> {selectedInvoiceOrder.payment_method || 'Net 15'}</div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="grow-data-table" style={{ marginTop: '16px' }}>
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th>Unit</th>
                      <th>Price</th>
                      <th>Qty Ordered</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceOrder.items?.map((it, i) => (
                      <tr key={i}>
                        <td><strong>{it.crop_name}</strong> ({it.variety_name})</td>
                        <td>{it.packaging_unit}</td>
                        <td>₹{it.unit_price}</td>
                        <td>{it.quantity_ordered}</td>
                        <td><strong>₹{it.total_price || (it.quantity_ordered * it.unit_price)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals Box */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <div style={{ width: '240px', fontSize: '13px' }}>
                    <div className="totals-row">
                      <span>Subtotal:</span>
                      <span>₹{selectedInvoiceOrder.subtotal || selectedInvoiceOrder.total_amount}</span>
                    </div>
                    <div className="totals-row">
                      <span>Delivery Fee:</span>
                      <span>₹{selectedInvoiceOrder.delivery_fee || 0}</span>
                    </div>
                    <div className="totals-row grand-total">
                      <span>Grand Total:</span>
                      <span style={{ color: '#15803d' }}>₹{selectedInvoiceOrder.total_amount || selectedInvoiceOrder.amount}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoiceOrder.packing_notes && (
                  <div style={{ marginTop: '14px', background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
                    <strong>Packing Notes:</strong> {selectedInvoiceOrder.packing_notes}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowInvoiceModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer size={14} />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
