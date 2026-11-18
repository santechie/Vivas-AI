import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  Filter,
  Plus,
  Download,
  Phone,
  Mail,
  MapPin,
  Building,
  Tag,
  IndianRupee,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  CreditCard,
  Percent,
  Receipt,
  MessageSquare,
  Send,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Star,
  Layers,
  Wrench
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:5001/api"
  : "/api";

export default function VendorsScreen() {
  // State
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({
    total_vendors: 0,
    active_vendors: 0,
    preferred_vendors: 0,
    total_annual_spend: 0,
    total_payables: 0,
    breakdown: { seeds: 0, fertilizers: 0, equipment: 0, packaging: 0 }
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTerms, setSelectedTerms] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Drawers & Modals
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('overview'); // 'overview', 'transactions', 'materials', 'communications'

  // Log Communication Modal / State
  const [commSubject, setCommSubject] = useState('');
  const [commType, setCommType] = useState('Email');
  const [commNotes, setCommNotes] = useState('');
  const [commSubmitting, setCommSubmitting] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    vendor_code: '',
    name: '',
    contact_person: '',
    contact_role: 'Sales Representative',
    category: 'Seeds & Plants',
    supply_items: [],
    supply_items_input: '',
    email: '',
    phone: '',
    alternate_phone: '',
    website: '',
    street_address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postal_code: '',
    gps_lat: '',
    gps_lng: '',
    tax_id: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc_swift: '',
    payment_terms: 'Net 30',
    lead_time_days: 5,
    rating: 4.8,
    total_purchases_amount: 0,
    outstanding_payable: 0,
    notes: '',
    status: 'active'
  });

  const [formDrawerTab, setFormDrawerTab] = useState('company'); // 'company', 'contact', 'financial'

  // Fetch Data
  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (selectedTerms !== 'All') params.append('payment_terms', selectedTerms);
      if (selectedStatus !== 'All') params.append('status', selectedStatus);

      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/contacts/vendors?${params.toString()}`),
        fetch(`${API_BASE}/contacts/vendors/stats`)
      ]);

      const listJson = await listRes.json();
      const statsJson = await statsRes.json();

      if (listJson.success) setVendors(listJson.data);
      if (statsJson.success) setStats(statsJson.data);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [searchTerm, selectedCategory, selectedTerms, selectedStatus]);

  // Open Drawer for Add
  const handleOpenAddDrawer = () => {
    setEditingVendor(null);
    setFormData({
      vendor_code: '',
      name: '',
      contact_person: '',
      contact_role: 'Sales Representative',
      category: 'Seeds & Plants',
      supply_items: [],
      supply_items_input: '',
      email: '',
      phone: '',
      alternate_phone: '',
      website: '',
      street_address: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postal_code: '',
      gps_lat: '12.9716',
      gps_lng: '77.5946',
      tax_id: '',
      bank_name: 'HDFC Bank',
      bank_account_no: '',
      bank_ifsc_swift: '',
      payment_terms: 'Net 30',
      lead_time_days: 5,
      rating: 4.8,
      total_purchases_amount: 0,
      outstanding_payable: 0,
      notes: '',
      status: 'active'
    });
    setFormDrawerTab('company');
    setShowDrawer(true);
  };

  // Open Drawer for Edit
  const handleOpenEditDrawer = (v) => {
    setEditingVendor(v);
    setFormData({
      vendor_code: v.vendor_code || '',
      name: v.name || '',
      contact_person: v.contact_person || '',
      contact_role: v.contact_role || 'Sales Representative',
      category: v.category || 'Seeds & Plants',
      supply_items: v.supply_items || [],
      supply_items_input: Array.isArray(v.supply_items) ? v.supply_items.join(', ') : '',
      email: v.email || '',
      phone: v.phone || '',
      alternate_phone: v.alternate_phone || '',
      website: v.website || '',
      street_address: v.street_address || '',
      city: v.city || 'Bengaluru',
      state: v.state || 'Karnataka',
      country: v.country || 'India',
      postal_code: v.postal_code || '',
      gps_lat: v.gps_lat || '',
      gps_lng: v.gps_lng || '',
      tax_id: v.tax_id || '',
      bank_name: v.bank_name || '',
      bank_account_no: v.bank_account_no || '',
      bank_ifsc_swift: v.bank_ifsc_swift || '',
      payment_terms: v.payment_terms || 'Net 30',
      lead_time_days: v.lead_time_days || 5,
      rating: v.rating || 4.8,
      total_purchases_amount: v.total_purchases_amount || 0,
      outstanding_payable: v.outstanding_payable || 0,
      notes: v.notes || '',
      status: v.status || 'active'
    });
    setFormDrawerTab('company');
    setShowDrawer(true);
  };

  // Save Vendor
  const handleSaveVendor = async (e) => {
    e.preventDefault();
    try {
      const url = editingVendor
        ? `${API_BASE}/contacts/vendors/${editingVendor.id}`
        : `${API_BASE}/contacts/vendors`;
      const method = editingVendor ? 'PUT' : 'POST';

      const parsedSupplyItems = formData.supply_items_input
        ? formData.supply_items_input.split(',').map(s => s.trim()).filter(Boolean)
        : formData.supply_items;

      const payload = {
        ...formData,
        supply_items: parsedSupplyItems
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setShowDrawer(false);
        fetchVendors();
      } else {
        alert(json.message || 'Error saving vendor');
      }
    } catch (err) {
      console.error('Error saving vendor:', err);
      alert('Failed to save vendor');
    }
  };

  // Delete Vendor
  const handleDeleteVendor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete vendor "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/contacts/vendors/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchVendors();
        if (showProfileModal && activeProfile?.vendor?.id === id) {
          setShowProfileModal(false);
        }
      }
    } catch (err) {
      console.error('Error deleting vendor:', err);
    }
  };

  // View Vendor Profile
  const handleViewProfile = async (v) => {
    try {
      setProfileLoading(true);
      setShowProfileModal(true);
      setProfileTab('overview');
      const res = await fetch(`${API_BASE}/contacts/vendors/${v.id}`);
      const json = await res.json();
      if (json.success) {
        setActiveProfile(json.data);
      }
    } catch (err) {
      console.error('Error loading vendor profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Log Communication
  const handleLogCommunication = async (e) => {
    e.preventDefault();
    if (!commSubject.trim() || !activeProfile?.vendor) return;
    try {
      setCommSubmitting(true);
      const res = await fetch(`${API_BASE}/contacts/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_type: 'Vendor',
          contact_id: activeProfile.vendor.id,
          contact_name: activeProfile.vendor.name,
          communication_type: commType,
          subject: commSubject,
          notes: commNotes,
          logged_by: 'Procurement Lead'
        })
      });
      const json = await res.json();
      if (json.success) {
        setCommSubject('');
        setCommNotes('');
        const pRes = await fetch(`${API_BASE}/contacts/vendors/${activeProfile.vendor.id}`);
        const pJson = await pRes.json();
        if (pJson.success) setActiveProfile(pJson.data);
      }
    } catch (err) {
      console.error('Error logging communication:', err);
    } finally {
      setCommSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (vendors.length === 0) return;
    const headers = ['Vendor Code', 'Vendor Name', 'Category', 'Contact Person', 'Email', 'Phone', 'City', 'Payment Terms', 'Lead Time (Days)', 'Rating', 'Total Purchases (INR)', 'Outstanding Payable (INR)', 'Status'];
    const rows = vendors.map(v => [
      `"${v.vendor_code || ''}"`,
      `"${v.name || ''}"`,
      `"${v.category || ''}"`,
      `"${v.contact_person || ''}"`,
      `"${v.email || ''}"`,
      `"${v.phone || ''}"`,
      `"${v.city || ''}"`,
      `"${v.payment_terms || ''}"`,
      v.lead_time_days || 0,
      v.rating || 0,
      v.total_purchases_amount || 0,
      v.outstanding_payable || 0,
      `"${v.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VivasAI_Vendors_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadgeStyle = (category) => {
    switch (category) {
      case 'Seeds & Plants':
        return { bg: '#dcfce7', color: '#15803d' };
      case 'Fertilizers & Amendments':
        return { bg: '#fef9c3', color: '#a16207' };
      case 'Equipment & Tools':
        return { bg: '#e0f2fe', color: '#0369a1' };
      case 'Packaging Materials':
        return { bg: '#f3e8ff', color: '#7e22ce' };
      case 'Irrigation & Hardware':
        return { bg: '#cffafe', color: '#0e7490' };
      case 'Professional Services':
        return { bg: '#fce7f3', color: '#be185d' };
      case 'Fuel & Utilities':
        return { bg: '#ffedd5', color: '#c2410c' };
      default:
        return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div className="grow-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* ── HEADER ── */}
      <div className="grow-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            SUPPLY CHAIN & ASSETS
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Vendors & Suppliers</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Manage seed companies, bio-fertilizer suppliers, equipment dealers, packaging manufacturers, and agronomy labs
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Download size={15} />
            Export CSV
          </button>
          
          <button
            onClick={handleOpenAddDrawer}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)' }}
          >
            <Plus size={16} />
            Add Vendor
          </button>
        </div>
      </div>

      {/* ── TOP KPI METRIC CARDS (WHITE THEME) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Total Vendors */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Active Suppliers</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7' }}>
              <Truck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{stats.total_vendors}</div>
          <div style={{ fontSize: '12px', color: '#0284c7', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <Star size={13} fill="#0284c7" /> {stats.preferred_vendors} Preferred Strategic Partners
          </div>
        </div>

        {/* Total Annual Spend */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Total Purchases Spend</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>
            ₹{stats.total_annual_spend.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Input materials, seeds & equipment
          </div>
        </div>

        {/* Accounts Payable Due */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Accounts Payable Due</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: stats.total_payables > 0 ? '#fef3c7' : '#dcfce7', color: stats.total_payables > 0 ? '#d97706' : '#16a34a' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: stats.total_payables > 0 ? '#d97706' : '#0f172a' }}>
            ₹{stats.total_payables.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Unsettled supplier bills
          </div>
        </div>

        {/* Categories Breakdown */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Supply Categories</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#f3e8ff', color: '#9333ea' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
              Seeds: {stats.breakdown.seeds}
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#fef9c3', color: '#a16207', fontWeight: 600 }}>
              Fertilizers: {stats.breakdown.fertilizers}
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#f3e8ff', color: '#7e22ce', fontWeight: 600 }}>
              Packaging: {stats.breakdown.packaging}
            </span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR (WHITE THEME) ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by vendor name, code, contact person, GSTIN, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Categories</option>
            <option value="Seeds & Plants">Seeds & Plants</option>
            <option value="Fertilizers & Amendments">Fertilizers & Amendments</option>
            <option value="Equipment & Tools">Equipment & Tools</option>
            <option value="Packaging Materials">Packaging Materials</option>
            <option value="Irrigation & Hardware">Irrigation & Hardware</option>
            <option value="Professional Services">Professional Services</option>
            <option value="Fuel & Utilities">Fuel & Utilities</option>
          </select>

          <select
            value={selectedTerms}
            onChange={(e) => setSelectedTerms(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Terms</option>
            <option value="Advance">Advance</option>
            <option value="Net 15">Net 15</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 60">Net 60</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Statuses</option>
            <option value="preferred">Preferred</option>
            <option value="active">Active</option>
            <option value="under_review">Under Review</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setSelectedTerms('All');
              setSelectedStatus('All');
            }}
            title="Reset Filters"
            style={{ padding: '8px 10px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── VENDORS TABLE (WHITE THEME) ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 16px' }}>Vendor Name & Code</th>
                <th style={{ padding: '14px 16px' }}>Category</th>
                <th style={{ padding: '14px 16px' }}>Primary Contact</th>
                <th style={{ padding: '14px 16px' }}>Payment Terms</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Rating</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Spend</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Payables Due</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: '#0284c7' }} />
                    Loading suppliers directory...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <Truck size={32} style={{ margin: '0 auto 12px auto', display: 'block', color: '#94a3b8' }} />
                    No vendors found matching criteria.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const badgeStyle = getCategoryBadgeStyle(v.category);
                  const hasPayables = parseFloat(v.outstanding_payable || 0) > 0;
                  return (
                    <tr
                      key={v.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name & Code */}
                      <td style={{ padding: '14px 16px' }}>
                        <div
                          onClick={() => handleViewProfile(v)}
                          style={{ fontWeight: 600, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>{v.name}</span>
                          <ExternalLink size={12} style={{ color: '#94a3b8' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', fontWeight: 700 }}>
                          {v.vendor_code}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: badgeStyle.bg,
                            color: badgeStyle.color
                          }}
                        >
                          {v.category}
                        </span>
                      </td>

                      {/* Primary Contact Person */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#334155', fontWeight: 600 }}>
                          {v.contact_person || 'N/A'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {v.email || v.phone || 'No direct phone'}
                        </div>
                      </td>

                      {/* Payment Terms & Lead Time */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#334155', fontSize: '12px', fontWeight: 500 }}>{v.payment_terms}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Lead time: {v.lead_time_days || 5} days
                        </div>
                      </td>

                      {/* Rating */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#fef9c3', padding: '2px 7px', borderRadius: '6px', color: '#a16207', fontWeight: 700, fontSize: '12px' }}>
                          <Star size={12} fill="#eab308" />
                          {v.rating || 4.8}
                        </div>
                      </td>

                      {/* Total Spend */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#16a34a' }}>
                          ₹{parseFloat(v.computed_total_spend || v.total_purchases_amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {v.transaction_count || 0} Bills
                        </div>
                      </td>

                      {/* Outstanding Payables */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: hasPayables ? '#d97706' : '#64748b' }}>
                          ₹{parseFloat(v.outstanding_payable || 0).toLocaleString('en-IN')}
                        </div>
                        {hasPayables && (
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', display: 'inline-block', marginTop: '3px', fontWeight: 600 }}>
                            Due to Pay
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            background:
                              v.status === 'preferred'
                                ? '#e0f2fe'
                                : v.status === 'active'
                                ? '#dcfce7'
                                : '#f1f5f9',
                            color:
                              v.status === 'preferred'
                                ? '#0369a1'
                                : v.status === 'active'
                                ? '#15803d'
                                : '#64748b'
                          }}
                        >
                          {v.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleViewProfile(v)}
                            title="View Vendor Profile"
                            style={{ padding: '6px', borderRadius: '6px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', cursor: 'pointer' }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEditDrawer(v)}
                            title="Edit Vendor"
                            style={{ padding: '6px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteVendor(v.id, v.name)}
                            title="Delete Vendor"
                            style={{ padding: '6px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer' }}
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

      {/* ── SIDE DRAWER: ADD / EDIT VENDOR (WHITE THEME) ── */}
      {showDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: '#ffffff',
              borderLeft: '1px solid #e2e8f0',
              height: '100%',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 24px rgba(0,0,0,0.12)'
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor / Supplier'}
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
                  Setup supplier catalog, lead times, banking and payment terms
                </p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              {[
                { key: 'company', label: '1. Vendor Profile' },
                { key: 'contact', label: '2. Contact & Address' },
                { key: 'financial', label: '3. Financial & Terms' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFormDrawerTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    border: 'none',
                    borderBottom: formDrawerTab === tab.key ? '2px solid #0284c7' : '2px solid transparent',
                    background: formDrawerTab === tab.key ? '#f0f9ff' : 'transparent',
                    color: formDrawerTab === tab.key ? '#0284c7' : '#64748b',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSaveVendor} style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* TAB 1: VENDOR PROFILE */}
              {formDrawerTab === 'company' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Vendor Company Name <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. GreenAgro Seed Suppliers Ltd"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Vendor Code
                      </label>
                      <input
                        type="text"
                        placeholder="VND-001"
                        value={formData.vendor_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, vendor_code: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Category / Supply Type <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      >
                        <option value="Seeds & Plants">Seeds & Plants</option>
                        <option value="Fertilizers & Amendments">Fertilizers & Amendments</option>
                        <option value="Equipment & Tools">Equipment & Tools</option>
                        <option value="Packaging Materials">Packaging Materials</option>
                        <option value="Irrigation & Hardware">Irrigation & Hardware</option>
                        <option value="Professional Services">Professional Services</option>
                        <option value="Fuel & Utilities">Fuel & Utilities</option>
                        <option value="Logistics">Logistics</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Supplier Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      >
                        <option value="preferred">Preferred Partner</option>
                        <option value="active">Active</option>
                        <option value="under_review">Under Review</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Items & Materials Supplied (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Roma Tomato Seeds, Vermicompost 25kg, PLA Clamshells"
                      value={formData.supply_items_input}
                      onChange={(e) => setFormData(prev => ({ ...prev, supply_items_input: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Website URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://greenagroseeds.com"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Vendor Rating (1 - 5)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        value={formData.rating}
                        onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setFormDrawerTab('contact')}
                      style={{ padding: '9px 18px', borderRadius: '8px', background: '#0284c7', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Next: Contact & Address →
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: CONTACT & ADDRESS */}
              {formDrawerTab === 'contact' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        placeholder="Ramesh Chandra"
                        value={formData.contact_person}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Role / Designation
                      </label>
                      <input
                        type="text"
                        placeholder="Senior Agronomist"
                        value={formData.contact_role}
                        onChange={(e) => setFormData(prev => ({ ...prev, contact_role: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="orders@greenagroseeds.com"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="+91 80 2839 1122"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="45 Peenya Industrial Area, Phase II"
                      value={formData.street_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>PIN Code</label>
                      <input
                        type="text"
                        placeholder="560058"
                        value={formData.postal_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setFormDrawerTab('company')}
                      style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', cursor: 'pointer' }}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDrawerTab('financial')}
                      style={{ padding: '9px 18px', borderRadius: '8px', background: '#0284c7', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Next: Financial & Terms →
                    </button>
                  </div>
                </>
              )}

              {/* TAB 3: FINANCIAL & TERMS */}
              {formDrawerTab === 'financial' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Tax ID / GSTIN
                      </label>
                      <input
                        type="text"
                        placeholder="29AABCG1234F1ZQ"
                        value={formData.tax_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Payment Terms
                      </label>
                      <select
                        value={formData.payment_terms}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      >
                        <option value="Advance">Advance Settlement</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                        <option value="Credit Card / COD">Credit Card / COD</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="HDFC Bank"
                        value={formData.bank_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="50200048291024"
                        value={formData.bank_account_no}
                        onChange={(e) => setFormData(prev => ({ ...prev, bank_account_no: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        IFSC / SWIFT Code
                      </label>
                      <input
                        type="text"
                        placeholder="HDFC0000123"
                        value={formData.bank_ifsc_swift}
                        onChange={(e) => setFormData(prev => ({ ...prev, bank_ifsc_swift: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Lead Time (Days)
                      </label>
                      <input
                        type="number"
                        value={formData.lead_time_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Vendor Quality & Terms Notes
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Quality guarantees, germination rates, return policies, delivery requirements..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => setFormDrawerTab('contact')}
                      style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', cursor: 'pointer' }}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '9px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)' }}
                    >
                      {editingVendor ? 'Update Vendor' : 'Save Vendor'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VENDOR 360 PROFILE (WHITE THEME) ── */}
      {showProfileModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', padding: '20px' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #bae6fd'
                  }}
                >
                  <Truck size={24} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                    {activeProfile?.vendor?.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700 }}>
                      {activeProfile?.vendor?.vendor_code}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                      {activeProfile?.vendor?.category}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#a16207', fontSize: '12px', fontWeight: 700 }}>
                      <Star size={12} fill="#eab308" /> {activeProfile?.vendor?.rating || 4.8}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    handleOpenEditDrawer(activeProfile.vendor);
                  }}
                  style={{ padding: '8px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit size={13} />
                  Edit
                </button>
                <button
                  onClick={() => setShowProfileModal(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
              {[
                { key: 'overview', label: 'Overview & Terms', icon: Truck },
                { key: 'transactions', label: `Purchases & Bills (${activeProfile?.transactions?.length || 0})`, icon: Receipt },
                { key: 'materials', label: `Supplied Catalog (${activeProfile?.materials?.length || 0})`, icon: Package },
                { key: 'communications', label: `Activity Log (${activeProfile?.communications?.length || 0})`, icon: MessageSquare }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setProfileTab(t.key)}
                    style={{
                      padding: '12px 18px',
                      border: 'none',
                      borderBottom: profileTab === t.key ? '2px solid #0284c7' : '2px solid transparent',
                      background: profileTab === t.key ? '#f0f9ff' : 'transparent',
                      color: profileTab === t.key ? '#0284c7' : '#64748b',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Icon size={15} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Tab Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#ffffff' }}>
              
              {/* TAB: OVERVIEW */}
              {profileTab === 'overview' && (
                <div>
                  {/* KPI Bar */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Total Purchases</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                        ₹{parseFloat(activeProfile?.vendor?.total_purchases_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Accounts Payable</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: parseFloat(activeProfile?.vendor?.outstanding_payable || 0) > 0 ? '#d97706' : '#0f172a', marginTop: '4px' }}>
                        ₹{parseFloat(activeProfile?.vendor?.outstanding_payable || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Payment Terms</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
                        {activeProfile?.vendor?.payment_terms}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Lead Time</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {activeProfile?.vendor?.lead_time_days || 5} Days
                      </div>
                    </div>
                  </div>

                  {/* Contact & Banking Specs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <Mail size={15} style={{ color: '#0284c7' }} /> Contact Channels
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div><span style={{ color: '#64748b' }}>Contact Person:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.vendor?.contact_person || 'N/A'}</strong> ({activeProfile?.vendor?.contact_role})</div>
                        <div><span style={{ color: '#64748b' }}>Email:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.vendor?.email || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Phone:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.vendor?.phone || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Website:</span> <a href={activeProfile?.vendor?.website} target="_blank" rel="noreferrer" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>{activeProfile?.vendor?.website || 'N/A'}</a></div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <CreditCard size={15} style={{ color: '#16a34a' }} /> Financial & Bank Specs
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div><span style={{ color: '#64748b' }}>GSTIN / Tax ID:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.vendor?.tax_id || 'UNREGISTERED'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Bank:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.vendor?.bank_name || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>A/C Number:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.vendor?.bank_account_no || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>IFSC Code:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.vendor?.bank_ifsc_swift || 'N/A'}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Supplied Items Tags */}
                  {Array.isArray(activeProfile?.vendor?.supply_items) && activeProfile.vendor.supply_items.length > 0 && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Supplied Items & Materials</h4>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {activeProfile.vendor.supply_items.map((item, idx) => (
                          <span key={idx} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {activeProfile?.vendor?.notes && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Vendor Notes & Guarantees</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                        {activeProfile.vendor.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: TRANSACTIONS / BILLS */}
              {profileTab === 'transactions' && (
                <div>
                  {activeProfile?.transactions?.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      No bills or purchase expenses recorded for this vendor yet.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', background: '#f8fafc' }}>
                          <th style={{ padding: '10px 14px' }}>Date</th>
                          <th style={{ padding: '10px 14px' }}>Description</th>
                          <th style={{ padding: '10px 14px' }}>Category</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeProfile.transactions.map(t => (
                          <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(t.transaction_date).toLocaleDateString()}</td>
                            <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 600 }}>{t.description}</td>
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{t.category_name || 'Operating Expenses'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: t.payment_status === 'Completed' ? '#dcfce7' : '#fef3c7', color: t.payment_status === 'Completed' ? '#15803d' : '#b45309', fontSize: '11px', fontWeight: 600 }}>
                                {t.payment_status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                              ₹{parseFloat(t.amount).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB: MATERIALS / INVENTORY */}
              {profileTab === 'materials' && (
                <div>
                  {activeProfile?.materials?.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      No inventory materials catalog linked to this vendor in Assets.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', background: '#f8fafc' }}>
                          <th style={{ padding: '10px 14px' }}>Item Name</th>
                          <th style={{ padding: '10px 14px' }}>Type</th>
                          <th style={{ padding: '10px 14px' }}>Unit</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>On Hand</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeProfile.materials.map(m => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{m.name}</td>
                            <td style={{ padding: '10px 14px', color: '#0284c7' }}>{m.input_type}</td>
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{m.unit}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>{m.quantity_on_hand}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                              ₹{parseFloat(m.unit_cost || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB: COMMUNICATIONS */}
              {profileTab === 'communications' && (
                <div>
                  {/* Add Communication Form */}
                  <form onSubmit={handleLogCommunication} style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>Log Vendor Interaction / Quote</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px', marginBottom: '10px' }}>
                      <select
                        value={commType}
                        onChange={(e) => setCommType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px' }}
                      >
                        <option value="Email">Email</option>
                        <option value="Phone Call">Phone Call</option>
                        <option value="Meeting">Meeting</option>
                        <option value="WhatsApp / SMS">WhatsApp</option>
                        <option value="PO Sent">Purchase Order</option>
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Subject / summary of vendor inquiry..."
                        value={commSubject}
                        onChange={(e) => setCommSubject(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px' }}
                      />
                    </div>
                    <textarea
                      rows="2"
                      placeholder="PO numbers, delivery dates, quote pricing details..."
                      value={commNotes}
                      onChange={(e) => setCommNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px', marginBottom: '10px', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={commSubmitting}
                        style={{ padding: '7px 18px', borderRadius: '6px', background: '#0284c7', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Send size={12} />
                        Log Interaction
                      </button>
                    </div>
                  </form>

                  {/* Communication History Feed */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeProfile?.communications?.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        No interactions logged yet.
                      </div>
                    ) : (
                      activeProfile.communications.map(c => (
                        <div key={c.id} style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                                {c.communication_type}
                              </span>
                              <strong style={{ color: '#0f172a', fontSize: '13px' }}>{c.subject}</strong>
                            </div>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {new Date(c.logged_at).toLocaleDateString()} at {new Date(c.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {c.notes && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#334155', lineHeight: 1.4 }}>
                              {c.notes}
                            </p>
                          )}
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                            Logged by: {c.logged_by}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
