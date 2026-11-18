import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Plus, Search, Filter, Eye, Edit2, Trash2, Save, X,
  AlertTriangle, IndianRupee, Package, TrendingUp, RefreshCw,
  CheckCircle2, AlertCircle, Clock, ArrowRight, FileText, Building2, ChevronDown
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function SmartShoppingList({ activeTab, onTabChange }) {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stats, setStats] = useState({
    total_items: 0,
    total_estimated_cost: 0,
    high_priority_count: 0,
    pending_count: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Drawers
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [selected360Item, setSelected360Item] = useState(null);
  const [isEditMode360, setIsEditMode360] = useState(false);
  const [editFormData360, setEditFormData360] = useState({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedForPO, setSelectedForPO] = useState([]);
  const [isConvertingPO, setIsConvertingPO] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State for New Item
  const [newItemData, setNewItemData] = useState({
    item_name: '',
    category: 'Seeds & Nursery',
    vendor_id: '',
    quantity_needed: '',
    unit_of_measure: 'kg',
    estimated_unit_cost: '',
    priority: 'Medium',
    status: 'Pending',
    notes: '',
    linked_material_id: ''
  });

  const categories = [
    'Seeds & Nursery',
    'Fertilizers & Soil',
    'Crop Protection',
    'Packaging Materials',
    'Equipment & Tools',
    'Irrigation & Hardware',
    'General Supplies'
  ];

  const units = ['kg', 'lbs', 'grams', 'liters', 'gallons', 'units', 'bags', 'boxes', 'pallets', 'packs', 'meters'];

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchData();
    fetchVendorsAndInventory();
  }, [categoryFilter, priorityFilter, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let queryParams = new URLSearchParams();
      if (categoryFilter) queryParams.append('category', categoryFilter);
      if (priorityFilter) queryParams.append('priority', priorityFilter);
      if (statusFilter) queryParams.append('status', statusFilter);

      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/buy/shopping-list?${queryParams.toString()}`),
        fetch(`${API_BASE}/buy/shopping-list/stats`)
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(Array.isArray(itemsData) ? itemsData : (itemsData.data || []));
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data || statsData);
      }
    } catch (error) {
      console.error('Error fetching shopping list data:', error);
      showToast('Error loading shopping list data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorsAndInventory = async () => {
    try {
      const [vendorsRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/contacts/vendors`),
        fetch(`${API_BASE}/inputs/inventory`)
      ]);
      if (vendorsRes.ok) {
        const vData = await vendorsRes.json();
        setVendors(Array.isArray(vData) ? vData : (vData.data || []));
      }
      if (invRes.ok) {
        const iData = await invRes.json();
        setInventoryItems(Array.isArray(iData) ? iData : (iData.data || []));
      }
    } catch (err) {
      console.error('Error fetching vendors/inventory:', err);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItemData.item_name.trim()) {
      showToast('Please enter an item name', 'error');
      return;
    }

    try {
      const payload = {
        ...newItemData,
        quantity_needed: parseFloat(newItemData.quantity_needed) || 0,
        estimated_unit_cost: parseFloat(newItemData.estimated_unit_cost) || 0,
        vendor_id: newItemData.vendor_id || null,
        linked_material_id: newItemData.linked_material_id || null
      };

      const res = await fetch(`${API_BASE}/buy/shopping-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Shopping item added successfully!');
        setIsAddDrawerOpen(false);
        setNewItemData({
          item_name: '',
          category: 'Seeds & Nursery',
          vendor_id: '',
          quantity_needed: '',
          unit_of_measure: 'kg',
          estimated_unit_cost: '',
          priority: 'Medium',
          status: 'Pending',
          notes: '',
          linked_material_id: ''
        });
        fetchData();
      } else {
        showToast('Failed to save shopping item.', 'error');
      }
    } catch (err) {
      console.error('Error saving shopping item:', err);
      showToast('Server error saving item.', 'error');
    }
  };

  const open360Modal = (item) => {
    setSelected360Item(item);
    setEditFormData360({
      ...item,
      unit_of_measure: item.unit_of_measure || item.unit || 'kg'
    });
    setIsEditMode360(false);
  };

  const handleSave360Edit = async () => {
    try {
      const payload = {
        ...editFormData360,
        quantity_needed: parseFloat(editFormData360.quantity_needed) || 0,
        estimated_unit_cost: parseFloat(editFormData360.estimated_unit_cost) || 0
      };

      const res = await fetch(`${API_BASE}/buy/shopping-list/${selected360Item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data || json;
        setSelected360Item(updated);
        setIsEditMode360(false);
        showToast('Item updated successfully!');
        fetchData();
      } else {
        showToast('Failed to update item details.', 'error');
      }
    } catch (err) {
      console.error('Error updating item:', err);
      showToast('Server error updating item.', 'error');
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/buy/shopping-list/${itemToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Deleted ${itemToDelete.item_name}`);
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
        if (selected360Item && selected360Item.id === itemToDelete.id) {
          setSelected360Item(null);
        }
        fetchData();
      } else {
        showToast('Failed to delete item.', 'error');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      showToast('Error deleting item.', 'error');
    }
  };

  const toggleSelectForPO = (id) => {
    if (selectedForPO.includes(id)) {
      setSelectedForPO(selectedForPO.filter(i => i !== id));
    } else {
      setSelectedForPO([...selectedForPO, id]);
    }
  };

  const handleConvertToPO = async () => {
    if (selectedForPO.length === 0) {
      showToast('Please select at least one item to convert to PO.', 'error');
      return;
    }

    setIsConvertingPO(true);
    try {
      const res = await fetch(`${API_BASE}/buy/shopping-list/convert-to-po`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopping_item_ids: selectedForPO,
          item_ids: selectedForPO
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Generated Purchase Order(s) successfully!`);
        setSelectedForPO([]);
        fetchData();
        if (onTabChange) onTabChange('purchase-orders');
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to convert to PO', 'error');
      }
    } catch (err) {
      console.error('Error converting to PO:', err);
      showToast('Server error converting to PO', 'error');
    } finally {
      setIsConvertingPO(false);
    }
  };

  const safeItems = Array.isArray(items) ? items : [];

  const filteredItems = safeItems.filter(item => {
    const matchesSearch = (item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.item_code && item.item_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.vendor_name && item.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'High': return { bg: '#fef2f2', color: '#991b1b', border: '#fecdd3' };
      case 'Medium': return { bg: '#fffbeb', color: '#92400e', border: '#fde68a' };
      case 'Low': return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
      case 'Ordered': return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Fulfilled': return { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' };
      case 'Cancelled': return { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
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

      {/* ── TOP ACTION & SUMMARY BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Smart Supply Requirements List
          </h2>
          <span style={{ fontSize: '12px', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            {filteredItems.length} Items
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {selectedForPO.length > 0 && (
            <button
              onClick={handleConvertToPO}
              disabled={isConvertingPO}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#d97706',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)'
              }}
            >
              <FileText size={15} />
              {isConvertingPO ? 'Generating PO...' : `Convert (${selectedForPO.length}) to PO`}
            </button>
          )}

          <button
            onClick={() => setIsAddDrawerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
            }}
          >
            <Plus size={16} />
            Add Shopping Item
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Active Items</span>
            <div style={{ padding: '6px', background: '#f1f5f9', color: '#475569', borderRadius: '8px' }}>
              <Package size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>{stats.total_items || 0}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Active material requirements</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Total Budget</span>
            <div style={{ padding: '6px', background: '#dcfce7', color: '#16a34a', borderRadius: '8px' }}>
              <IndianRupee size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginTop: '8px' }}>
            ₹{(parseFloat(stats.total_estimated_cost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Estimated procurement cost</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>High Priority</span>
            <div style={{ padding: '6px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '8px' }}>{stats.high_priority_count || 0}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Urgent restocking items</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Orders</span>
            <div style={{ padding: '6px', background: '#e0f2fe', color: '#0284c7', borderRadius: '8px' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0284c7', marginTop: '8px' }}>{stats.pending_count || 0}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Ready for PO conversion</div>
        </div>
      </div>

      {/* ── SEARCH & FILTERS BAR ── */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item code, item name, or vendor..."
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#0f172a', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#334155', background: '#ffffff', outline: 'none' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#334155', background: '#ffffff', outline: 'none' }}
          >
            <option value="">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#334155', background: '#ffffff', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Ordered">Ordered</option>
            <option value="Fulfilled">Fulfilled</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            onClick={fetchData}
            title="Refresh List"
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── DATA TABLE ── */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedForPO.length > 0 && selectedForPO.length === filteredItems.filter(i => i.status === 'Pending').length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedForPO(filteredItems.filter(i => i.status === 'Pending').map(i => i.id));
                      } else {
                        setSelectedForPO([]);
                      }
                    }}
                    style={{ borderRadius: '4px', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Code & Name</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor / Supplier</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Qty Needed</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Est. Unit Cost</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Est. Cost</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Priority</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#16a34a' }} />
                    Loading items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <ShoppingCart size={32} style={{ margin: '0 auto 8px auto', color: '#cbd5e1' }} />
                    No shopping list items found. Click "Add Shopping Item" to create one.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const pBadge = getPriorityBadgeStyle(item.priority);
                  const sBadge = getStatusBadgeStyle(item.status);

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        {item.status === 'Pending' && (
                          <input
                            type="checkbox"
                            checked={selectedForPO.includes(item.id)}
                            onChange={() => toggleSelectForPO(item.id)}
                            style={{ borderRadius: '4px', cursor: 'pointer' }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#059669', fontWeight: 700, display: 'block' }}>
                          {item.item_code}
                        </span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.item_name}</span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>{item.category}</td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {item.vendor_name ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 500 }}>
                            <Building2 size={13} color="#94a3b8" />
                            {item.vendor_name}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', italic: true }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                        {item.quantity_needed} {item.unit_of_measure || item.unit || 'kg'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#475569' }}>
                        ₹{(parseFloat(item.estimated_unit_cost) || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        ₹{(parseFloat(item.total_estimated_cost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: pBadge.bg, color: pBadge.color, border: `1px solid ${pBadge.border}` }}>
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: sBadge.bg, color: sBadge.color, border: `1px solid ${sBadge.border}` }}>
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => open360Modal(item)}
                            title="View 360 Details"
                            style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 9px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              open360Modal(item);
                              setIsEditMode360(true);
                            }}
                            title="Edit Item"
                            style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '6px 9px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Delete Item"
                            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 9px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 360 DETAIL POPUP MODAL ── */}
      {selected360Item && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '750px', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: '#dcfce7', color: '#16a34a', borderRadius: '10px' }}>
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#047857', background: '#d1fae5', padding: '2px 8px', borderRadius: '4px' }}>
                      {selected360Item.item_code}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: getPriorityBadgeStyle(selected360Item.priority).color, background: getPriorityBadgeStyle(selected360Item.priority).bg, padding: '2px 8px', borderRadius: '12px', border: `1px solid ${getPriorityBadgeStyle(selected360Item.priority).border}` }}>
                      {selected360Item.priority} Priority
                    </span>
                  </div>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{selected360Item.item_name}</h3>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isEditMode360 ? (
                  <button
                    onClick={() => setIsEditMode360(true)}
                    style={{ padding: '7px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                ) : (
                  <button
                    onClick={handleSave360Edit}
                    style={{ padding: '7px 16px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)' }}
                  >
                    <Save size={14} /> Save Changes
                  </button>
                )}
                <button
                  onClick={() => setSelected360Item(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              {!isEditMode360 ? (
                /* READ ONLY VIEW */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Category</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{selected360Item.category}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Vendor / Supplier</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{selected360Item.vendor_name || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Status</span>
                      <span style={{ display: 'inline-block', marginTop: '2px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: getStatusBadgeStyle(selected360Item.status).bg, color: getStatusBadgeStyle(selected360Item.status).color, border: `1px solid ${getStatusBadgeStyle(selected360Item.status).border}` }}>
                        {selected360Item.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600, display: 'block' }}>Quantity Needed</span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#14532d', marginTop: '4px', display: 'block' }}>
                        {selected360Item.quantity_needed} {selected360Item.unit_of_measure || selected360Item.unit || 'kg'}
                      </span>
                    </div>

                    <div style={{ padding: '16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600, display: 'block' }}>Est. Unit Price</span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#1e3a8a', marginTop: '4px', display: 'block' }}>
                        ₹{(parseFloat(selected360Item.estimated_unit_cost) || 0).toFixed(2)}
                      </span>
                    </div>

                    <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, display: 'block' }}>Total Est. Cost</span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '4px', display: 'block' }}>
                        ₹{(parseFloat(selected360Item.total_estimated_cost) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {selected360Item.notes && (
                    <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notes & Instructions</span>
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', whiteSpace: 'pre-line' }}>{selected360Item.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* EDIT FORM */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Item Name *</label>
                    <input
                      type="text"
                      value={editFormData360.item_name || ''}
                      onChange={(e) => setEditFormData360({ ...editFormData360, item_name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Category</label>
                      <select
                        value={editFormData360.category || 'Seeds & Nursery'}
                        onChange={(e) => setEditFormData360({ ...editFormData360, category: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Preferred Vendor</label>
                      <select
                        value={editFormData360.vendor_id || ''}
                        onChange={(e) => setEditFormData360({ ...editFormData360, vendor_id: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      >
                        <option value="">Unassigned Vendor</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Quantity Needed</label>
                      <input
                        type="number"
                        step="any"
                        value={editFormData360.quantity_needed || ''}
                        onChange={(e) => setEditFormData360({ ...editFormData360, quantity_needed: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Unit</label>
                      <select
                        value={editFormData360.unit_of_measure || editFormData360.unit || 'kg'}
                        onChange={(e) => setEditFormData360({ ...editFormData360, unit_of_measure: e.target.value, unit: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      >
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Est. Unit Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData360.estimated_unit_cost || ''}
                        onChange={(e) => setEditFormData360({ ...editFormData360, estimated_unit_cost: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Priority</label>
                      <select
                        value={editFormData360.priority || 'Medium'}
                        onChange={(e) => setEditFormData360({ ...editFormData360, priority: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status</label>
                      <select
                        value={editFormData360.status || 'Pending'}
                        onChange={(e) => setEditFormData360({ ...editFormData360, status: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Fulfilled">Fulfilled</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Notes</label>
                    <textarea
                      rows="3"
                      value={editFormData360.notes || ''}
                      onChange={(e) => setEditFormData360({ ...editFormData360, notes: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE ITEM SLIDE-OVER DRAWER ── */}
      {isAddDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1001, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '540px', height: '100%', backgroundColor: '#ffffff', boxShadow: '-10px 0 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={18} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Add Shopping Item</h3>
              </div>
              <button onClick={() => setIsAddDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Drawer Form */}
            <form onSubmit={handleCreateItem} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Item Name *</label>
                <input
                  type="text"
                  required
                  value={newItemData.item_name}
                  onChange={(e) => setNewItemData({ ...newItemData, item_name: e.target.value })}
                  placeholder="e.g. Organic Tomato Seeds F1"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Category</label>
                  <select
                    value={newItemData.category}
                    onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Preferred Vendor</label>
                  <select
                    value={newItemData.vendor_id}
                    onChange={(e) => setNewItemData({ ...newItemData, vendor_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="">Unassigned Vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newItemData.quantity_needed}
                    onChange={(e) => setNewItemData({ ...newItemData, quantity_needed: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Unit</label>
                  <select
                    value={newItemData.unit_of_measure}
                    onChange={(e) => setNewItemData({ ...newItemData, unit_of_measure: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  >
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Est. Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemData.estimated_unit_cost}
                    onChange={(e) => setNewItemData({ ...newItemData, estimated_unit_cost: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Priority</label>
                  <select
                    value={newItemData.priority}
                    onChange={(e) => setNewItemData({ ...newItemData, priority: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Link Inventory Material</label>
                  <select
                    value={newItemData.linked_material_id}
                    onChange={(e) => setNewItemData({ ...newItemData, linked_material_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="">None (Custom Item)</option>
                    {inventoryItems.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.material_name} ({inv.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Notes</label>
                <textarea
                  rows="3"
                  value={newItemData.notes}
                  onChange={(e) => setNewItemData({ ...newItemData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                ></textarea>
              </div>

              <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#166534', fontWeight: 600 }}>Estimated Total Cost:</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#14532d' }}>
                  ₹{((parseFloat(newItemData.quantity_needed) || 0) * (parseFloat(newItemData.estimated_unit_cost) || 0)).toFixed(2)}
                </span>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddDrawerOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', background: '#16a34a', border: 'none', borderRadius: '6px', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)' }}
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {isDeleteModalOpen && itemToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Delete Shopping Item</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 20px 0' }}>
              Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{itemToDelete.item_name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                style={{ padding: '8px 18px', background: '#dc2626', border: 'none', borderRadius: '6px', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
