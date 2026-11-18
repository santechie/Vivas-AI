import React, { useState, useEffect } from 'react';
import {
  Users,
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
  ShoppingBag,
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
  Sparkles
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:5001/api"
  : "/api";

export default function CustomersScreen() {
  // State
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    total_customers: 0,
    active_customers: 0,
    total_lifetime_sales: 0,
    total_receivables: 0,
    breakdown: { wholesale: 0, restaurants: 0, retail: 0, csa: 0 }
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [selectedBalance, setSelectedBalance] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Drawers & Modals
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('overview'); // 'overview', 'orders', 'transactions', 'communications'

  // Log Communication Modal / State
  const [commSubject, setCommSubject] = useState('');
  const [commType, setCommType] = useState('Phone Call');
  const [commNotes, setCommNotes] = useState('');
  const [commSubmitting, setCommSubmitting] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    name: '',
    company_name: '',
    restaurant_venue: '',
    customer_type: 'Wholesale',
    contact_role: 'Buyer / Owner',
    email: '',
    phone: '',
    alternate_phone: '',
    street_address: '',
    unit_suite: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    postal_code: '',
    gps_lat: '',
    gps_lng: '',
    default_channel_name: 'Wholesale & Retail Markets',
    payment_terms: 'Net 30',
    tax_id: '',
    tax_exempt: false,
    credit_limit: 50000,
    discount_percentage: 0,
    offer_sheets: ['Weekly Harvest Wholesale Sheet'],
    tags: ['Active Buyer'],
    notes: '',
    status: 'active'
  });

  const [formDrawerTab, setFormDrawerTab] = useState('personal'); // 'personal', 'venue', 'commercial'

  // Fetch Data
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedType !== 'All') params.append('customer_type', selectedType);
      if (selectedChannel !== 'All') params.append('channel_name', selectedChannel);
      if (selectedBalance !== 'All') params.append('balance_status', selectedBalance);
      if (selectedTag !== 'All') params.append('tag', selectedTag);
      if (selectedStatus !== 'All') params.append('status', selectedStatus);

      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/contacts/customers?${params.toString()}`),
        fetch(`${API_BASE}/contacts/customers/stats`)
      ]);

      const listJson = await listRes.json();
      const statsJson = await statsRes.json();

      if (listJson.success) setCustomers(listJson.data);
      if (statsJson.success) setStats(statsJson.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm, selectedType, selectedChannel, selectedBalance, selectedTag, selectedStatus]);

  // Open Drawer for Add
  const handleOpenAddDrawer = () => {
    setEditingCustomer(null);
    setFormData({
      first_name: '',
      last_name: '',
      name: '',
      company_name: '',
      restaurant_venue: '',
      customer_type: 'Wholesale',
      contact_role: 'Buyer / Owner',
      email: '',
      phone: '',
      alternate_phone: '',
      street_address: '',
      unit_suite: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postal_code: '',
      gps_lat: '12.9716',
      gps_lng: '77.5946',
      default_channel_name: 'Wholesale & Retail Markets',
      payment_terms: 'Net 30',
      tax_id: '',
      tax_exempt: false,
      credit_limit: 50000,
      discount_percentage: 0,
      offer_sheets: ['Weekly Harvest Wholesale Sheet'],
      tags: ['Active Buyer'],
      notes: '',
      status: 'active'
    });
    setFormDrawerTab('personal');
    setShowDrawer(true);
  };

  // Open Drawer for Edit
  const handleOpenEditDrawer = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      first_name: cust.first_name || '',
      last_name: cust.last_name || '',
      name: cust.name || '',
      company_name: cust.company_name || '',
      restaurant_venue: cust.restaurant_venue || '',
      customer_type: cust.customer_type || 'Wholesale',
      contact_role: cust.contact_role || 'Buyer / Owner',
      email: cust.email || '',
      phone: cust.phone || '',
      alternate_phone: cust.alternate_phone || '',
      street_address: cust.street_address || '',
      unit_suite: cust.unit_suite || '',
      city: cust.city || 'Bengaluru',
      state: cust.state || 'Karnataka',
      country: cust.country || 'India',
      postal_code: cust.postal_code || '',
      gps_lat: cust.gps_lat || '',
      gps_lng: cust.gps_lng || '',
      default_channel_name: cust.default_channel_name || 'Wholesale & Retail Markets',
      payment_terms: cust.payment_terms || 'Net 30',
      tax_id: cust.tax_id || '',
      tax_exempt: cust.tax_exempt || false,
      credit_limit: cust.credit_limit || 50000,
      discount_percentage: cust.discount_percentage || 0,
      offer_sheets: cust.offer_sheets || ['Weekly Harvest Wholesale Sheet'],
      tags: cust.tags || ['Active Buyer'],
      notes: cust.notes || '',
      status: cust.status || 'active'
    });
    setFormDrawerTab('personal');
    setShowDrawer(true);
  };

  // Save Customer
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const url = editingCustomer
        ? `${API_BASE}/contacts/customers/${editingCustomer.id}`
        : `${API_BASE}/contacts/customers`;
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        setShowDrawer(false);
        fetchCustomers();
      } else {
        alert(json.message || 'Error saving customer');
      }
    } catch (err) {
      console.error('Error saving customer:', err);
      alert('Failed to save customer');
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/contacts/customers/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchCustomers();
        if (showProfileModal && activeProfile?.customer?.id === id) {
          setShowProfileModal(false);
        }
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  };

  // View Customer 360 Profile
  const handleViewProfile = async (cust) => {
    try {
      setProfileLoading(true);
      setShowProfileModal(true);
      setProfileTab('overview');
      const res = await fetch(`${API_BASE}/contacts/customers/${cust.id}`);
      const json = await res.json();
      if (json.success) {
        setActiveProfile(json.data);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Log Communication
  const handleLogCommunication = async (e) => {
    e.preventDefault();
    if (!commSubject.trim() || !activeProfile?.customer) return;
    try {
      setCommSubmitting(true);
      const res = await fetch(`${API_BASE}/contacts/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_type: 'Customer',
          contact_id: activeProfile.customer.id,
          contact_name: activeProfile.customer.name,
          communication_type: commType,
          subject: commSubject,
          notes: commNotes,
          logged_by: 'Farm Sales Manager'
        })
      });
      const json = await res.json();
      if (json.success) {
        setCommSubject('');
        setCommNotes('');
        const pRes = await fetch(`${API_BASE}/contacts/customers/${activeProfile.customer.id}`);
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
    if (customers.length === 0) return;
    const headers = ['Name', 'Company', 'Venue/Brand', 'Customer Type', 'Email', 'Phone', 'City', 'Sales Channel', 'Payment Terms', 'Credit Limit', 'Lifetime Sales (INR)', 'Current Balance (INR)', 'Status'];
    const rows = customers.map(c => [
      `"${c.name || ''}"`,
      `"${c.company_name || ''}"`,
      `"${c.restaurant_venue || ''}"`,
      `"${c.customer_type || ''}"`,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.city || ''}"`,
      `"${c.default_channel_name || ''}"`,
      `"${c.payment_terms || ''}"`,
      c.credit_limit || 0,
      c.lifetime_sales || 0,
      c.current_balance || 0,
      `"${c.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VivasAI_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Initials
  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="grow-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* ── HEADER ── */}
      <div className="grow-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            CONTACTS & CRM
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Customers</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Manage wholesale buyers, restaurant accounts, retail partners, and CSA subscribers
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
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {/* ── METRICS STRIP (WHITE THEME) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Total Customers */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Total Registered</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{stats.total_customers}</div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <CheckCircle2 size={13} /> {stats.active_customers} Active Accounts
          </div>
        </div>

        {/* Lifetime Sales Value */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Lifetime Value (LTV)</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#16a34a' }}>
            ₹{stats.total_lifetime_sales.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Cumulative revenue across all orders
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Outstanding Receivables</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: stats.total_receivables > 0 ? '#fef3c7' : '#dcfce7', color: stats.total_receivables > 0 ? '#d97706' : '#16a34a' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: stats.total_receivables > 0 ? '#d97706' : '#0f172a' }}>
            ₹{stats.total_receivables.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
            Unsettled Net 15/30 terms
          </div>
        </div>

        {/* Buyer Segments */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Buyer Segments</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#f3e8ff', color: '#9333ea' }}>
              <Tag size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
              Wholesale: {stats.breakdown.wholesale}
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#fce7f3', color: '#be185d', fontWeight: 600 }}>
              Restaurants: {stats.breakdown.restaurants}
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#f3e8ff', color: '#7e22ce', fontWeight: 600 }}>
              Retail: {stats.breakdown.retail}
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
              CSA: {stats.breakdown.csa}
            </span>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER TOOLBAR (WHITE THEME) ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by customer, company, email, phone, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px', outline: 'none' }}
          />
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Customer Types</option>
            <option value="Wholesale">Wholesale</option>
            <option value="Restaurant / Venue">Restaurant / Venue</option>
            <option value="Retail">Retail</option>
            <option value="CSA Member">CSA Member</option>
          </select>

          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Channels</option>
            <option value="Wholesale & Retail Markets">Wholesale & Retail</option>
            <option value="Restaurants & Chefs Direct">Restaurants & Chefs</option>
            <option value="Farm Stand & Subscriptions">Farm Stand & Subscriptions</option>
          </select>

          <select
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Balances</option>
            <option value="has_balance">Has Outstanding Balance</option>
            <option value="zero_balance">Zero Balance Settled</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedType('All');
              setSelectedChannel('All');
              setSelectedBalance('All');
              setSelectedTag('All');
              setSelectedStatus('All');
            }}
            title="Reset Filters"
            style={{ padding: '8px 10px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── CUSTOMERS TABLE (WHITE THEME) ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '14px 16px' }}>Customer / Contact</th>
                <th style={{ padding: '14px 16px' }}>Company & Venue</th>
                <th style={{ padding: '14px 16px' }}>Type & Channel</th>
                <th style={{ padding: '14px 16px' }}>Contact Info</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Lifetime Sales</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: '#16a34a' }} />
                    Loading customers directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <Users size={32} style={{ margin: '0 auto 12px auto', display: 'block', color: '#94a3b8' }} />
                    No customers found matching criteria.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => {
                  const hasBalance = parseFloat(cust.current_balance || 0) > 0;
                  return (
                    <tr
                      key={cust.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name & Role */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#dcfce7',
                              color: '#15803d',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              flexShrink: 0,
                              border: '1px solid #bbf7d0'
                            }}
                          >
                            {getInitials(cust.name)}
                          </div>
                          <div>
                            <div
                              onClick={() => handleViewProfile(cust)}
                              style={{ fontWeight: 600, color: '#0f172a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span>{cust.name}</span>
                              <ExternalLink size={12} style={{ color: '#94a3b8' }} />
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {cust.contact_role || 'Buyer'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Company & Venue */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building size={14} style={{ color: '#94a3b8' }} />
                          {cust.company_name || 'Individual Buyer'}
                        </div>
                        {cust.restaurant_venue && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                            Venue: {cust.restaurant_venue}
                          </div>
                        )}
                      </td>

                      {/* Type & Channel */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ marginBottom: '4px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background:
                                cust.customer_type === 'Wholesale'
                                  ? '#e0f2fe'
                                  : cust.customer_type === 'Restaurant / Venue'
                                  ? '#fce7f3'
                                  : cust.customer_type === 'Retail'
                                  ? '#f3e8ff'
                                  : '#dcfce7',
                              color:
                                cust.customer_type === 'Wholesale'
                                  ? '#0369a1'
                                  : cust.customer_type === 'Restaurant / Venue'
                                  ? '#be185d'
                                  : cust.customer_type === 'Retail'
                                  ? '#7e22ce'
                                  : '#15803d'
                            }}
                          >
                            {cust.customer_type}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {cust.default_channel_name || 'Direct Channel'}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td style={{ padding: '14px 16px' }}>
                        {cust.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '12px' }}>
                            <Mail size={12} style={{ color: '#94a3b8' }} />
                            <a href={`mailto:${cust.email}`} style={{ color: '#0369a1', textDecoration: 'none' }}>
                              {cust.email}
                            </a>
                          </div>
                        )}
                        {cust.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginTop: '3px' }}>
                            <Phone size={12} style={{ color: '#94a3b8' }} />
                            <a href={`tel:${cust.phone}`} style={{ color: '#64748b', textDecoration: 'none' }}>
                              {cust.phone}
                            </a>
                          </div>
                        )}
                        {cust.city && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}>
                            <MapPin size={11} />
                            {cust.city}, {cust.state}
                          </div>
                        )}
                      </td>

                      {/* Lifetime Sales */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#16a34a' }}>
                          ₹{parseFloat(cust.computed_lifetime_sales || cust.lifetime_sales || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {cust.computed_orders_count || cust.total_orders_count || 0} Orders
                        </div>
                      </td>

                      {/* Balance */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: hasBalance ? '#d97706' : '#64748b' }}>
                          ₹{parseFloat(cust.current_balance || 0).toLocaleString('en-IN')}
                        </div>
                        {hasBalance && (
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', display: 'inline-block', marginTop: '3px', fontWeight: 600 }}>
                            Due Balance
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
                            background: cust.status === 'active' ? '#dcfce7' : '#f1f5f9',
                            color: cust.status === 'active' ? '#15803d' : '#64748b'
                          }}
                        >
                          {cust.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleViewProfile(cust)}
                            title="View Customer Profile"
                            style={{ padding: '6px', borderRadius: '6px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', cursor: 'pointer' }}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEditDrawer(cust)}
                            title="Edit Customer"
                            style={{ padding: '6px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer' }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                            title="Delete Customer"
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

      {/* ── SIDE DRAWER: ADD / EDIT CUSTOMER (WHITE THEME) ── */}
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
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
                  Configure customer contact details, venue specs, and commercial terms
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
                { key: 'personal', label: '1. Personal Info' },
                { key: 'venue', label: '2. Company & Address' },
                { key: 'commercial', label: '3. Commercial & Terms' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFormDrawerTab(tab.key)}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    border: 'none',
                    borderBottom: formDrawerTab === tab.key ? '2px solid #16a34a' : '2px solid transparent',
                    background: formDrawerTab === tab.key ? '#f0fdf4' : 'transparent',
                    color: formDrawerTab === tab.key ? '#16a34a' : '#64748b',
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
            <form onSubmit={handleSaveCustomer} style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* TAB 1: PERSONAL INFO */}
              {formDrawerTab === 'personal' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        First Name <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikramaditya"
                        value={formData.first_name}
                        onChange={(e) => {
                          const fn = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            first_name: fn,
                            name: `${fn} ${prev.last_name}`.trim()
                          }));
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sengupta"
                        value={formData.last_name}
                        onChange={(e) => {
                          const ln = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            last_name: ln,
                            name: `${prev.first_name} ${ln}`.trim()
                          }));
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Contact Role / Job Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Executive Chef, Procurement Head, Owner"
                      value={formData.contact_role}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_role: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="vikram@greengrocers.in"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Primary Phone
                      </label>
                      <input
                        type="text"
                        placeholder="+91 98450 12345"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Alternate Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="+91 80 2345 6789"
                      value={formData.alternate_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, alternate_phone: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setFormDrawerTab('venue')}
                      style={{ padding: '9px 18px', borderRadius: '8px', background: '#16a34a', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Next: Company & Address →
                    </button>
                  </div>
                </>
              )}

              {/* TAB 2: COMPANY & ADDRESS */}
              {formDrawerTab === 'venue' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Company / Entity Name
                      </label>
                      <input
                        type="text"
                        placeholder="Green Grocers Hub Ltd"
                        value={formData.company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Restaurant / Store / Venue
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Le Gourmet Bistro, Hub 4"
                        value={formData.restaurant_venue}
                        onChange={(e) => setFormData(prev => ({ ...prev, restaurant_venue: e.target.value }))}
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
                      placeholder="Plot 42, Wholesale Agri Market Complex"
                      value={formData.street_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Apt / Unit / Suite
                      </label>
                      <input
                        type="text"
                        placeholder="Bldg B, Unit 12"
                        value={formData.unit_suite}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit_suite: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Postal / PIN Code
                      </label>
                      <input
                        type="text"
                        placeholder="560022"
                        value={formData.postal_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
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
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* GPS Coordinates */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        GPS Latitude
                      </label>
                      <input
                        type="text"
                        placeholder="12.9716"
                        value={formData.gps_lat}
                        onChange={(e) => setFormData(prev => ({ ...prev, gps_lat: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        GPS Longitude
                      </label>
                      <input
                        type="text"
                        placeholder="77.5946"
                        value={formData.gps_lng}
                        onChange={(e) => setFormData(prev => ({ ...prev, gps_lng: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <button
                      type="button"
                      onClick={() => setFormDrawerTab('personal')}
                      style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', cursor: 'pointer' }}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDrawerTab('commercial')}
                      style={{ padding: '9px 18px', borderRadius: '8px', background: '#16a34a', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Next: Commercial & Terms →
                    </button>
                  </div>
                </>
              )}

              {/* TAB 3: COMMERCIAL & TERMS */}
              {formDrawerTab === 'commercial' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Customer Type
                      </label>
                      <select
                        value={formData.customer_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_type: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      >
                        <option value="Wholesale">Wholesale</option>
                        <option value="Restaurant / Venue">Restaurant / Venue</option>
                        <option value="Retail">Retail</option>
                        <option value="CSA Member">CSA Member</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Assigned Sales Channel
                      </label>
                      <select
                        value={formData.default_channel_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, default_channel_name: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      >
                        <option value="Wholesale & Retail Markets">Wholesale & Retail Markets</option>
                        <option value="Restaurants & Chefs Direct">Restaurants & Chefs Direct</option>
                        <option value="Farm Stand & Subscriptions">Farm Stand & Subscriptions</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Payment Terms
                      </label>
                      <select
                        value={formData.payment_terms}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      >
                        <option value="Prepaid">Prepaid</option>
                        <option value="Cash on Delivery">Cash on Delivery</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 60">Net 60</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Credit Limit (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.credit_limit}
                        onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Tax ID / GSTIN
                      </label>
                      <input
                        type="text"
                        placeholder="29AABCU9603R1ZM"
                        value={formData.tax_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax_id: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Volume Discount %
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Delivery / Account Notes
                    </label>
                    <textarea
                      rows="3"
                      placeholder="Special delivery instructions, timing, gate codes, or quality specs..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => setFormDrawerTab('venue')}
                      style={{ padding: '9px 16px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', fontSize: '13px', cursor: 'pointer' }}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '9px 22px', borderRadius: '8px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
                    >
                      {editingCustomer ? 'Update Customer' : 'Save Customer'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CUSTOMER 360 PROFILE (WHITE THEME) ── */}
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
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 700,
                    border: '1px solid #bbf7d0'
                  }}
                >
                  {getInitials(activeProfile?.customer?.name)}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                    {activeProfile?.customer?.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', color: '#0284c7', fontWeight: 600 }}>
                      {activeProfile?.customer?.company_name || 'Individual Customer'}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                      {activeProfile?.customer?.customer_type}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Terms: {activeProfile?.customer?.payment_terms}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    handleOpenEditDrawer(activeProfile.customer);
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
                { key: 'overview', label: 'Overview & Specs', icon: Users },
                { key: 'orders', label: `Order History (${activeProfile?.orders?.length || 0})`, icon: ShoppingBag },
                { key: 'transactions', label: `Ledger & Payments (${activeProfile?.transactions?.length || 0})`, icon: Receipt },
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
                      borderBottom: profileTab === t.key ? '2px solid #16a34a' : '2px solid transparent',
                      background: profileTab === t.key ? '#f0fdf4' : 'transparent',
                      color: profileTab === t.key ? '#16a34a' : '#64748b',
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
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Lifetime Sales</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                        ₹{parseFloat(activeProfile?.customer?.lifetime_sales || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Current Balance</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: parseFloat(activeProfile?.customer?.current_balance || 0) > 0 ? '#d97706' : '#0f172a', marginTop: '4px' }}>
                        ₹{parseFloat(activeProfile?.customer?.current_balance || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Credit Limit</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                        ₹{parseFloat(activeProfile?.customer?.credit_limit || 50000).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Orders Fulfilled</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {activeProfile?.customer?.total_orders_count || 0}
                      </div>
                    </div>
                  </div>

                  {/* Contact Details & Addresses */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <Mail size={15} style={{ color: '#16a34a' }} /> Contact Channels
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div><span style={{ color: '#64748b' }}>Email:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.customer?.email || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Phone:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.customer?.phone || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Alt Phone:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.customer?.alternate_phone || 'None'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Tax ID/GST:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.customer?.tax_id || 'UNREGISTERED'}</strong></div>
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <MapPin size={15} style={{ color: '#0284c7' }} /> Location & Delivery
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div><span style={{ color: '#64748b' }}>Street:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.customer?.street_address || 'N/A'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>City/State:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.customer?.city}, {activeProfile?.customer?.state} - {activeProfile?.customer?.postal_code}</strong></div>
                        <div><span style={{ color: '#64748b' }}>GPS Lat/Long:</span> <strong style={{ color: '#0f172a' }}>{activeProfile?.customer?.gps_lat || '-'}, {activeProfile?.customer?.gps_lng || '-'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Sales Channel:</span> <strong style={{ color: '#16a34a' }}>{activeProfile?.customer?.default_channel_name}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Notes & Instructions */}
                  {activeProfile?.customer?.notes && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Delivery & Account Notes</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                        {activeProfile.customer.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ORDERS */}
              {profileTab === 'orders' && (
                <div>
                  {activeProfile?.orders?.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      No orders recorded for this customer yet.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', background: '#f8fafc' }}>
                          <th style={{ padding: '10px 14px' }}>Order #</th>
                          <th style={{ padding: '10px 14px' }}>Date</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                          <th style={{ padding: '10px 14px' }}>Payment</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeProfile.orders.map(o => (
                          <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{o.order_number || o.order_no}</td>
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(o.order_date).toLocaleDateString()}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 600 }}>
                                {o.fulfillment_status || o.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#334155' }}>{o.payment_status || 'Pending'}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                              ₹{parseFloat(o.total_amount || o.amount || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB: TRANSACTIONS */}
              {profileTab === 'transactions' && (
                <div>
                  {activeProfile?.transactions?.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      No financial transactions linked to this customer.
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
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{t.category_name || 'Revenue'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: t.payment_status === 'Completed' ? '#dcfce7' : '#fef3c7', color: t.payment_status === 'Completed' ? '#15803d' : '#b45309', fontSize: '11px', fontWeight: 600 }}>
                                {t.payment_status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                              ₹{parseFloat(t.amount).toLocaleString('en-IN')}
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
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>Log Activity / Communication</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px', marginBottom: '10px' }}>
                      <select
                        value={commType}
                        onChange={(e) => setCommType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px' }}
                      >
                        <option value="Phone Call">Phone Call</option>
                        <option value="Email">Email</option>
                        <option value="WhatsApp / SMS">WhatsApp</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Offer Sheet Sent">Offer Sheet</option>
                      </select>
                      <input
                        type="text"
                        required
                        placeholder="Subject / summary of interaction..."
                        value={commSubject}
                        onChange={(e) => setCommSubject(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px' }}
                      />
                    </div>
                    <textarea
                      rows="2"
                      placeholder="Detailed notes, commitments, requested quantities..."
                      value={commNotes}
                      onChange={(e) => setCommNotes(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '12px', marginBottom: '10px', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={commSubmitting}
                        style={{ padding: '7px 18px', borderRadius: '6px', background: '#16a34a', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Send size={12} />
                        Log Activity
                      </button>
                    </div>
                  </form>

                  {/* Communication History Feed */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeProfile?.communications?.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                        No communications logged yet.
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
