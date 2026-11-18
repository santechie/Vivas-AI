import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Filter, Eye, Edit2, Trash2, Save, X,
  AlertTriangle, IndianRupee, Package, TrendingUp, RefreshCw,
  CheckCircle2, AlertCircle, Clock, Truck, Building2, Calendar, Printer, Check
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function PurchaseOrders({ activeTab, onTabChange }) {
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [stats, setStats] = useState({
    total_orders: 0,
    total_spend: 0,
    pending_delivery_count: 0,
    received_count: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  // Modals & 360 Popups
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [selected360PO, setSelected360PO] = useState(null);
  const [isEditMode360, setIsEditMode360] = useState(false);
  const [editPOHeader360, setEditPOHeader360] = useState({});
  const [editPOItems360, setEditPOItems360] = useState([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [poToDelete, setPoToDelete] = useState(null);
  const [isReceiving, setIsReceiving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State for New PO
  const [newPOData, setNewPOData] = useState({
    vendor_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_terms: 'Net 30',
    notes: ''
  });

  const [newPOItems, setNewPOItems] = useState([
    { item_name: '', category: 'Seeds & Nursery', linked_material_id: '', quantity_ordered: 1, unit_of_measure: 'kg', unit_cost: 0 }
  ]);

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
    fetchOrders();
    fetchVendorsAndInventory();
  }, [statusFilter, vendorFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (vendorFilter) params.append('vendor_id', vendorFilter);

      const [ordersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/buy/purchase-orders?${params.toString()}`),
        fetch(`${API_BASE}/buy/purchase-orders/stats`)
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(Array.isArray(oData) ? oData : (oData.data || []));
      }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.data || sData);
      }
    } catch (err) {
      console.error('Error fetching POs:', err);
      showToast('Error loading Purchase Orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorsAndInventory = async () => {
    try {
      const [vRes, iRes] = await Promise.all([
        fetch(`${API_BASE}/contacts/vendors`),
        fetch(`${API_BASE}/inputs/inventory`)
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVendors(Array.isArray(vData) ? vData : (vData.data || []));
      }
      if (iRes.ok) {
        const iData = await iRes.json();
        setInventoryItems(Array.isArray(iData) ? iData : (iData.data || []));
      }
    } catch (err) {
      console.error('Error fetching vendors/inventory:', err);
    }
  };

  const open360POModal = async (poId, startInEdit = false) => {
    try {
      const res = await fetch(`${API_BASE}/buy/purchase-orders/${poId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const poObj = json.data.po || json.data;
          const itemsObj = json.data.line_items || json.data.items || [];
          
          const combined = {
            ...poObj,
            items: itemsObj
          };
          setSelected360PO(combined);

          setEditPOHeader360({
            po_code: poObj.po_code,
            vendor_id: poObj.vendor_id || '',
            vendor_name: poObj.vendor_name || '',
            order_date: poObj.order_date ? poObj.order_date.split('T')[0] : '',
            expected_delivery_date: poObj.expected_delivery_date ? poObj.expected_delivery_date.split('T')[0] : '',
            status: poObj.status || 'Ordered',
            payment_terms: poObj.payment_terms || 'Net 30',
            notes: poObj.notes || ''
          });
          setEditPOItems360(itemsObj);
          setIsEditMode360(startInEdit);
        }
      }
    } catch (err) {
      console.error('Error fetching PO details:', err);
      showToast('Error fetching PO details.', 'error');
    }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!newPOData.vendor_id) {
      showToast('Please select a vendor for this PO', 'error');
      return;
    }
    if (newPOItems.length === 0 || !newPOItems[0].item_name) {
      showToast('Please add at least one line item with a name', 'error');
      return;
    }

    try {
      const payload = {
        ...newPOData,
        line_items: newPOItems.map(item => ({
          ...item,
          quantity_ordered: parseFloat(item.quantity_ordered) || 1,
          unit_cost: parseFloat(item.unit_cost || item.unit_price) || 0,
          unit_of_measure: item.unit_of_measure || item.unit || 'units',
          linked_material_id: item.linked_material_id || null
        }))
      };

      const res = await fetch(`${API_BASE}/buy/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Purchase Order created successfully!');
        setIsAddDrawerOpen(false);
        setNewPOData({
          vendor_id: '',
          order_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: '',
          payment_terms: 'Net 30',
          notes: ''
        });
        setNewPOItems([{ item_name: '', category: 'Seeds & Nursery', linked_material_id: '', quantity_ordered: 1, unit_of_measure: 'kg', unit_cost: 0 }]);
        fetchOrders();
      } else {
        showToast('Failed to create Purchase Order.', 'error');
      }
    } catch (err) {
      console.error('Error creating PO:', err);
      showToast('Server error creating PO.', 'error');
    }
  };

  const handleSave360POEdit = async () => {
    try {
      const payload = {
        ...editPOHeader360,
        line_items: editPOItems360.map(i => ({
          ...i,
          quantity_ordered: parseFloat(i.quantity_ordered || i.quantity) || 1,
          unit_cost: parseFloat(i.unit_cost || i.unit_price) || 0
        }))
      };

      const res = await fetch(`${API_BASE}/buy/purchase-orders/${selected360PO.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Purchase Order updated successfully!');
        open360POModal(selected360PO.id, false);
        fetchOrders();
      } else {
        showToast('Failed to update Purchase Order.', 'error');
      }
    } catch (err) {
      console.error('Error updating PO:', err);
      showToast('Server error updating PO.', 'error');
    }
  };

  const handleMarkPOReceived = async (poId) => {
    if (!window.confirm('Marking this PO as RECEIVED will update inventory stock and log an operating expense in Financial Transactions. Proceed?')) {
      return;
    }

    setIsReceiving(true);
    try {
      const res = await fetch(`${API_BASE}/buy/purchase-orders/${poId}/receive`, {
        method: 'PUT'
      });

      if (res.ok) {
        showToast('PO Received! Inventory & Financial Transactions updated.');
        if (selected360PO && selected360PO.id === poId) {
          open360POModal(poId, false);
        }
        fetchOrders();
      } else {
        showToast('Failed to mark PO as received.', 'error');
      }
    } catch (err) {
      console.error('Error receiving PO:', err);
      showToast('Server error receiving PO.', 'error');
    } finally {
      setIsReceiving(false);
    }
  };

  const handleDeletePO = async () => {
    if (!poToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/buy/purchase-orders/${poToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Deleted ${poToDelete.po_code || poToDelete.po_number}`);
        setIsDeleteModalOpen(false);
        setPoToDelete(null);
        if (selected360PO && selected360PO.id === poToDelete.id) {
          setSelected360PO(null);
        }
        fetchOrders();
      } else {
        showToast('Failed to delete PO.', 'error');
      }
    } catch (err) {
      console.error('Error deleting PO:', err);
      showToast('Error deleting PO.', 'error');
    }
  };

  const addLineItemToAddForm = () => {
    setNewPOItems([...newPOItems, { item_name: '', category: 'Seeds & Nursery', linked_material_id: '', quantity_ordered: 1, unit_of_measure: 'kg', unit_cost: 0 }]);
  };

  const removeLineItemFromAddForm = (index) => {
    setNewPOItems(newPOItems.filter((_, i) => i !== index));
  };

  const updateLineItemInAddForm = (index, field, value) => {
    const updated = [...newPOItems];
    updated[index][field] = value;
    if (field === 'linked_material_id' && value) {
      const selectedMat = inventoryItems.find(mat => mat.id === value);
      if (selectedMat) {
        updated[index].item_name = selectedMat.material_name;
        updated[index].unit_of_measure = selectedMat.unit || 'units';
        updated[index].unit_cost = selectedMat.unit_cost || 0;
        updated[index].category = selectedMat.category || 'Seeds & Nursery';
      }
    }
    setNewPOItems(updated);
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter(po => {
    const matchesSearch = (po.po_code && po.po_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (po.po_number && po.po_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (po.vendor_name && po.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Draft': return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      case 'Ordered': return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Received': return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'Cancelled': return { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' };
      default: return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
    }
  };

  const calculateAddFormTotal = () => {
    return newPOItems.reduce((acc, item) => {
      return acc + ((parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_cost || item.unit_price) || 0));
    }, 0);
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
            Vendor Purchase Orders (POs)
          </h2>
          <span style={{ fontSize: '12px', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            {filteredOrders.length} Orders
          </span>
        </div>

        <button
          onClick={() => setIsAddDrawerOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)'
          }}
        >
          <Plus size={16} />
          Create Purchase Order
        </button>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Orders</span>
            <div style={{ padding: '6px', background: '#f1f5f9', color: '#475569', borderRadius: '8px' }}>
              <FileText size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>{stats.total_orders || 0}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Cumulative POs issued</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total PO Spend</span>
            <div style={{ padding: '6px', background: '#dcfce7', color: '#16a34a', borderRadius: '8px' }}>
              <IndianRupee size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', marginTop: '8px' }}>
            ₹{(parseFloat(stats.total_spend) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Total vendor order value</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Delivery</span>
            <div style={{ padding: '6px', background: '#fffbeb', color: '#d97706', borderRadius: '8px' }}>
              <Truck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#d97706', marginTop: '8px' }}>{stats.pending_delivery_count || 0}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Awaiting vendor shipment</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Received Orders</span>
            <div style={{ padding: '6px', background: '#e0f2fe', color: '#0284c7', borderRadius: '8px' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0284c7', marginTop: '8px' }}>{stats.received_count || 0}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Fulfilled & stocked</div>
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
            placeholder="Search PO number or vendor name..."
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#0f172a', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#334155', background: '#ffffff', outline: 'none' }}
          >
            <option value="">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#334155', background: '#ffffff', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Ordered">Ordered</option>
            <option value="Received">Received</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            onClick={fetchOrders}
            title="Refresh POs"
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
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PO Number</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor / Supplier</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Date</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Delivery</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Items</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#0284c7' }} />
                    Loading Purchase Orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <FileText size={32} style={{ margin: '0 auto 8px auto', color: '#cbd5e1' }} />
                    No Purchase Orders found. Click "Create Purchase Order" to begin.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(po => {
                  const sBadge = getStatusBadgeStyle(po.status);

                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>
                        {po.po_code || po.po_number}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={14} color="#94a3b8" />
                          <span>{po.vendor_name || 'Unknown Vendor'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {po.order_date ? new Date(po.order_date).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                        {po.line_items_count || po.items_count || 0}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        ₹{(parseFloat(po.total_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: sBadge.bg, color: sBadge.color, border: `1px solid ${sBadge.border}` }}>
                          {po.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => open360POModal(po.id, false)}
                            title="View 360 PO Details"
                            style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', padding: '6px 9px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Eye size={14} />
                          </button>

                          {po.status !== 'Received' && (
                            <button
                              onClick={() => handleMarkPOReceived(po.id)}
                              disabled={isReceiving}
                              title="Mark Received & Sync Stock"
                              style={{ background: '#dcfce7', color: '#15803d', border: 'none', padding: '6px 9px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}

                          <button
                            onClick={() => open360POModal(po.id, true)}
                            title="Edit PO"
                            style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '6px 9px', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => {
                              setPoToDelete(po);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Delete / Cancel PO"
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

      {/* ── 360 PO POPUP DETAIL MODAL ── */}
      {selected360PO && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '850px', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: '#e0f2fe', color: '#0284c7', borderRadius: '10px' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                      {selected360PO.po_code || selected360PO.po_number}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: getStatusBadgeStyle(selected360PO.status).color, background: getStatusBadgeStyle(selected360PO.status).bg, padding: '2px 8px', borderRadius: '12px', border: `1px solid ${getStatusBadgeStyle(selected360PO.status).border}` }}>
                      {selected360PO.status}
                    </span>
                  </div>
                  <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                    Vendor: {selected360PO.vendor_name || 'Unknown Vendor'}
                  </h3>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selected360PO.status !== 'Received' && (
                  <button
                    onClick={() => handleMarkPOReceived(selected360PO.id)}
                    disabled={isReceiving}
                    style={{ padding: '7px 14px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)' }}
                  >
                    <CheckCircle2 size={14} /> Mark Received
                  </button>
                )}

                {!isEditMode360 ? (
                  <button
                    onClick={() => setIsEditMode360(true)}
                    style={{ padding: '7px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={14} /> Edit PO
                  </button>
                ) : (
                  <button
                    onClick={handleSave360POEdit}
                    style={{ padding: '7px 16px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Save size={14} /> Save Changes
                  </button>
                )}

                <button
                  onClick={() => window.print()}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '7px', borderRadius: '6px', cursor: 'pointer' }}
                  title="Print PO"
                >
                  <Printer size={15} />
                </button>

                <button
                  onClick={() => setSelected360PO(null)}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Order Date</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {selected360PO.order_date ? new Date(selected360PO.order_date).toLocaleDateString() : '-'}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Expected Delivery</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {selected360PO.expected_delivery_date ? new Date(selected360PO.expected_delivery_date).toLocaleDateString() : '-'}
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Payment Terms</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{selected360PO.payment_terms || 'Net 30'}</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Total PO Value</span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#16a34a' }}>
                        ₹{(parseFloat(selected360PO.total_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Vendor Contact Banner */}
                  {(selected360PO.vendor_email || selected360PO.vendor_phone) && (
                    <div style={{ padding: '12px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '12px', color: '#0369a1', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>Vendor Contact Information:</span>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {selected360PO.vendor_email && <span>Email: <strong>{selected360PO.vendor_email}</strong></span>}
                        {selected360PO.vendor_phone && <span>Phone: <strong>{selected360PO.vendor_phone}</strong></span>}
                      </div>
                    </div>
                  )}

                  {/* Line Items Table */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={15} color="#0284c7" /> Ordered Line Items
                    </h4>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Item Name</th>
                            <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Qty Ordered</th>
                            <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Qty Received</th>
                            <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Unit Price</th>
                            <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected360PO.items && selected360PO.items.length > 0 ? (
                            selected360PO.items.map((item, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                                  <div>
                                    <span>{item.item_name}</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>{item.category}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                                  {item.quantity_ordered} {item.unit_of_measure || item.unit || 'units'}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                                  {item.quantity_received || 0} {item.unit_of_measure || item.unit || 'units'}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                                  ₹{(parseFloat(item.unit_cost || item.unit_price) || 0).toFixed(2)}
                                </td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                                  ₹{(parseFloat(item.total_price || (item.quantity_ordered * (item.unit_cost || item.unit_price))) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No items in this PO.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {selected360PO.notes && (
                    <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Notes & Instructions</span>
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', whiteSpace: 'pre-line' }}>{selected360PO.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                /* EDIT FORM */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Vendor</label>
                      <select
                        value={editPOHeader360.vendor_id || ''}
                        onChange={(e) => setEditPOHeader360({ ...editPOHeader360, vendor_id: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Order Date</label>
                      <input
                        type="date"
                        value={editPOHeader360.order_date || ''}
                        onChange={(e) => setEditPOHeader360({ ...editPOHeader360, order_date: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Expected Delivery</label>
                      <input
                        type="date"
                        value={editPOHeader360.expected_delivery_date || ''}
                        onChange={(e) => setEditPOHeader360({ ...editPOHeader360, expected_delivery_date: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status</label>
                      <select
                        value={editPOHeader360.status || 'Draft'}
                        onChange={(e) => setEditPOHeader360({ ...editPOHeader360, status: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Received">Received</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Payment Terms</label>
                      <input
                        type="text"
                        value={editPOHeader360.payment_terms || ''}
                        onChange={(e) => setEditPOHeader360({ ...editPOHeader360, payment_terms: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Notes</label>
                    <textarea
                      rows="3"
                      value={editPOHeader360.notes || ''}
                      onChange={(e) => setEditPOHeader360({ ...editPOHeader360, notes: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE PO SLIDE-OVER DRAWER ── */}
      {isAddDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1001, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '640px', height: '100%', backgroundColor: '#ffffff', boxShadow: '-10px 0 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Plus size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Create Purchase Order</h3>
              </div>
              <button onClick={() => setIsAddDrawerOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Drawer Form */}
            <form onSubmit={handleCreatePO} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Select Vendor *</label>
                  <select
                    required
                    value={newPOData.vendor_id}
                    onChange={(e) => setNewPOData({ ...newPOData, vendor_id: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="">-- Choose Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Payment Terms</label>
                  <input
                    type="text"
                    value={newPOData.payment_terms}
                    onChange={(e) => setNewPOData({ ...newPOData, payment_terms: e.target.value })}
                    placeholder="e.g. Net 30"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Order Date *</label>
                  <input
                    type="date"
                    required
                    value={newPOData.order_date}
                    onChange={(e) => setNewPOData({ ...newPOData, order_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Expected Delivery Date</label>
                  <input
                    type="date"
                    value={newPOData.expected_delivery_date}
                    onChange={(e) => setNewPOData({ ...newPOData, expected_delivery_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Dynamic Line Items Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Line Items</h4>
                  <button
                    type="button"
                    onClick={addLineItemToAddForm}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                {newPOItems.map((item, idx) => (
                  <div key={idx} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Item #{idx + 1}</span>
                      {newPOItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItemFromAddForm(idx)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Link Inventory Material</label>
                        <select
                          value={item.linked_material_id}
                          onChange={(e) => updateLineItemInAddForm(idx, 'linked_material_id', e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                        >
                          <option value="">Custom Item</option>
                          {inventoryItems.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.material_name} (₹{inv.unit_cost || 0}/{inv.unit})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Item Name *</label>
                        <input
                          type="text"
                          required
                          value={item.item_name}
                          onChange={(e) => updateLineItemInAddForm(idx, 'item_name', e.target.value)}
                          placeholder="Material name"
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Qty Ordered</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={item.quantity_ordered}
                          onChange={(e) => updateLineItemInAddForm(idx, 'quantity_ordered', e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Unit</label>
                        <select
                          value={item.unit_of_measure}
                          onChange={(e) => updateLineItemInAddForm(idx, 'unit_of_measure', e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                        >
                          {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>Unit Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={item.unit_cost}
                          onChange={(e) => updateLineItemInAddForm(idx, 'unit_cost', e.target.value)}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '14px 16px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#0369a1', fontWeight: 600 }}>Grand Total PO Value:</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7' }}>
                  ₹{calculateAddFormTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Notes & Instructions</label>
                <textarea
                  rows="3"
                  value={newPOData.notes}
                  onChange={(e) => setNewPOData({ ...newPOData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                ></textarea>
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
                  style={{ padding: '8px 20px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)' }}
                >
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {isDeleteModalOpen && poToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 1002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Cancel / Delete PO</h3>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 20px 0' }}>
              Are you sure you want to delete Purchase Order <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{poToDelete.po_code || poToDelete.po_number}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setPoToDelete(null);
                }}
                style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePO}
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
