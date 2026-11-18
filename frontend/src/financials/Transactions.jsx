import React, { useState, useEffect, useMemo } from 'react';
import {
  IndianRupee, TrendingUp, TrendingDown, Plus, Search, Filter, RefreshCw,
  Download, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle, Clock,
  Calendar, FileText, Check, X, Edit3, Trash2, ChevronDown, Layers,
  Receipt, CreditCard, Tag, ArrowRight, Building, User, Sparkles
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'Income', 'Expense', 'Transfer'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cropFilter, setCropFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals & Drawers
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [drawerType, setDrawerType] = useState('Income'); // 'Income' or 'Expense'
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().slice(0, 10),
    type: 'Income',
    category_id: '',
    description: '',
    amount: '',
    currency: 'INR',
    payment_method: 'Bank Transfer',
    party_name: '',
    party_type: 'Customer',
    invoice_receipt_ref: '',
    payment_status: 'Completed',
    crop_name: 'Tomatoes',
    sales_channel_name: 'Wholesale Distributors',
    tax_rate_pct: 0,
    tax_amount: 0,
    notes: ''
  });

  const paymentMethods = [
    'Bank Transfer',
    'UPI',
    'Cash',
    'Credit Card',
    'Cheque',
    'Online Payment'
  ];

  const cropsList = [
    'Tomatoes',
    'Microgreens',
    'Basil',
    'Cucumbers',
    'Bell Peppers',
    'General'
  ];

  const salesChannelsList = [
    'Wholesale Distributors',
    'Restaurant Direct',
    'Farmers Market',
    'Farm Stand & CSA',
    'Direct Retail'
  ];

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/financials/transactions?`;
      const params = new URLSearchParams();
      if (typeFilter !== 'All') params.append('type', typeFilter);
      if (categoryFilter !== 'All') params.append('category_id', categoryFilter);
      if (paymentMethodFilter !== 'All') params.append('payment_method', paymentMethodFilter);
      if (statusFilter !== 'All') params.append('payment_status', statusFilter);
      if (cropFilter !== 'All') params.append('crop_name', cropFilter);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const [resTxn, resStats, resCat] = await Promise.all([
        fetch(url + params.toString()),
        fetch(`${API_BASE}/financials/transactions/stats`),
        fetch(`${API_BASE}/financials/categories`)
      ]);

      if (resTxn.ok) {
        const json = await resTxn.json();
        setTransactions(json.data || []);
      }
      if (resStats.ok) {
        const json = await resStats.json();
        setStats(json.data || null);
      }
      if (resCat.ok) {
        const json = await resCat.json();
        setCategories(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
      showToast('Could not fetch financial records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, categoryFilter, paymentMethodFilter, statusFilter, cropFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const openAddDrawer = (type = 'Income') => {
    setEditingTransaction(null);
    setDrawerType(type);

    // Pick first category of that type
    const matchingCats = categories.filter(c => {
      if (type === 'Income') return c.type === 'Revenue';
      return c.type === 'Cost of Goods Sold' || c.type === 'Expenses' || c.type === 'Capital Asset';
    });

    setFormData({
      transaction_date: new Date().toISOString().slice(0, 10),
      type: type,
      category_id: matchingCats.length > 0 ? matchingCats[0].id : '',
      description: '',
      amount: '',
      currency: 'INR',
      payment_method: 'Bank Transfer',
      party_name: '',
      party_type: type === 'Income' ? 'Customer' : 'Vendor',
      invoice_receipt_ref: '',
      payment_status: 'Completed',
      crop_name: 'Tomatoes',
      sales_channel_name: type === 'Income' ? 'Wholesale Distributors' : '',
      tax_rate_pct: 0,
      tax_amount: 0,
      notes: ''
    });
    setShowDrawer(true);
  };

  const openEditDrawer = (txn) => {
    setEditingTransaction(txn);
    setDrawerType(txn.type);
    setFormData({
      transaction_date: txn.transaction_date ? String(txn.transaction_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      type: txn.type,
      category_id: txn.category_id || '',
      description: txn.description || '',
      amount: txn.amount || '',
      currency: txn.currency || 'INR',
      payment_method: txn.payment_method || 'Bank Transfer',
      party_name: txn.party_name || '',
      party_type: txn.party_type || 'Customer',
      invoice_receipt_ref: txn.invoice_receipt_ref || '',
      payment_status: txn.payment_status || 'Completed',
      crop_name: txn.crop_name || 'Tomatoes',
      sales_channel_name: txn.sales_channel_name || '',
      tax_rate_pct: txn.tax_rate_pct || 0,
      tax_amount: txn.tax_amount || 0,
      notes: txn.notes || ''
    });
    setShowDrawer(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast('Amount must be greater than 0', 'error');
      return;
    }
    if (!formData.category_id) {
      showToast('Please select an accounting category', 'error');
      return;
    }
    if (!formData.description.trim()) {
      showToast('Please enter a description or memo', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        tax_rate_pct: parseFloat(formData.tax_rate_pct) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0
      };

      let res;
      if (editingTransaction) {
        res = await fetch(`${API_BASE}/financials/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/financials/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editingTransaction ? 'Transaction updated!' : 'Transaction recorded successfully!');
        setShowDrawer(false);
        fetchData();
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Failed to save transaction', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error while saving transaction', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (txn) => {
    if (!window.confirm(`Are you sure you want to delete ${txn.transaction_code} (${txn.description})?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/financials/transactions/${txn.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Deleted ${txn.transaction_code}`);
        fetchData();
      } else {
        showToast('Failed to delete transaction', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting transaction', 'error');
    }
  };

  const handleUpdateStatus = async (txn, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/financials/transactions/${txn.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newStatus })
      });
      if (res.ok) {
        showToast(`Status updated to ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    if (!transactions.length) {
      showToast('No transactions to export', 'error');
      return;
    }

    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Transaction Code,Date,Type,Category Code,Category Name,Description,Party Name,Payment Method,Status,Crop,Channel,Amount (INR)\n';

    transactions.forEach(t => {
      csv += `"${t.transaction_code}","${String(t.transaction_date).slice(0, 10)}","${t.type}","${t.category_code || ''}","${t.category_name}","${t.description.replace(/"/g, '""')}","${t.party_name || ''}","${t.payment_method}","${t.payment_status}","${t.crop_name || ''}","${t.sales_channel_name || ''}",${t.amount}\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VivasAI_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Transactions exported to CSV!');
  };

  const getStatusBadge = (status = 'Completed') => {
    const s = String(status).toLowerCase();
    if (s === 'completed') {
      return { bg: '#dcfce7', color: '#15803d', border: '#86efac', dot: '#22c55e', text: 'Completed' };
    } else if (s === 'pending') {
      return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', dot: '#f59e0b', text: 'Pending' };
    } else if (s === 'void') {
      return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', dot: '#94a3b8', text: 'Void' };
    }
    return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', text: status };
  };

  return (
    <div className="grow-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100%', color: '#1e293b' }}>
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

      {/* Header */}
      <div className="grow-header" style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            FINANCIALS & ACCOUNTING
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Transactions & Cash Flow
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Track farm income, operating expenses, payments, receipts, and category allocations
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={exportCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => openAddDrawer('Expense')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#e11d48',
              cursor: 'pointer'
            }}
          >
            <TrendingDown size={15} />
            Record Expense
          </button>

          <button
            onClick={() => openAddDrawer('Income')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              backgroundColor: '#059669',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
            }}
          >
            <Plus size={16} />
            Record Income
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Farm Income
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                ₹{Number(stats?.total_income || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
            Completed revenue transactions
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Operating Expenses
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#e11d48', marginTop: '2px' }}>
                ₹{Number(stats?.total_expenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#fff1f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e11d48'
            }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
            COGS, labor, fuel & utilities
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Net Farm Cash Flow
              </div>
              <div style={{
                fontSize: '22px',
                fontWeight: 800,
                color: Number(stats?.net_cash_flow || 0) >= 0 ? '#0284c7' : '#b91c1c',
                marginTop: '2px'
              }}>
                {Number(stats?.net_cash_flow || 0) >= 0 ? '+' : ''}₹{Number(stats?.net_cash_flow || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#f0f9ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284c7'
            }}>
              <IndianRupee size={20} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '8px', fontWeight: 600 }}>
            Profit Margin: {Number(stats?.total_income || 0) > 0 ? ((Number(stats?.net_cash_flow || 0) / Number(stats?.total_income)) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pending Receivables
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                ₹{Number(stats?.pending_receivables || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706'
            }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#b45309', marginTop: '8px' }}>
            Awaiting client settlement
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pending Payables
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#64748b', marginTop: '2px' }}>
                ₹{Number(stats?.pending_payables || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569'
            }}>
              <FileText size={20} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
            Bills & vendor invoices due
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        {/* Type Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          padding: '3px',
          border: '1px solid #e2e8f0'
        }}>
          {['All', 'Income', 'Expense', 'Transfer'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: typeFilter === t ? '#ffffff' : 'transparent',
                color: typeFilter === t ? '#0f172a' : '#64748b',
                boxShadow: typeFilter === t ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {t === 'All' ? 'All Transactions' : t === 'Expense' ? 'Expenses' : t}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Search */}
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative', width: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search memo, code, party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </form>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
              maxWidth: '160px'
            }}
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.accounting_code} - {c.category_name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Void">Void</option>
          </select>

          {/* Crop Filter */}
          <select
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Crops</option>
            {cropsList.map(cr => (
              <option key={cr} value={cr}>{cr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <RefreshCw size={28} className="animate-spin" style={{ color: '#059669', margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '14px', color: '#64748b' }}>Loading transactions ledger...</div>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Receipt size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 6px 0' }}>No transactions found</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Try changing the filters or record your first income / expense.</p>
            <button
              onClick={() => openAddDrawer('Income')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Record Income
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Date & Code</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Description & Party</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Linked Module</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Payment Method</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => {
                  const statusObj = getStatusBadge(t.payment_status);
                  const isIncome = t.type === 'Income';

                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: idx !== transactions.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.1s'
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {String(t.transaction_date).slice(0, 10)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          {t.transaction_code}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: isIncome ? '#ecfdf5' : '#fff1f2',
                          color: isIncome ? '#059669' : '#e11d48',
                          border: isIncome ? '1px solid #a7f3d0' : '1px solid #fecdd3',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {isIncome ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {t.type}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {t.category_name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {t.category_code && <span style={{ backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', marginRight: '4px' }}>{t.category_code}</span>}
                          {t.category_type}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', maxWidth: '260px' }}>
                        <div style={{ color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description}
                        </div>
                        {t.party_name && (
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <User size={12} />
                            <span>{t.party_name} ({t.party_type})</span>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {t.crop_name && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            marginRight: '4px'
                          }}>
                            🌱 {t.crop_name}
                          </span>
                        )}
                        {t.sales_channel_name && (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #e2e8f0'
                          }}>
                            {t.sales_channel_name}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        <div>{t.payment_method}</div>
                        {t.invoice_receipt_ref && (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Ref: {t.invoice_receipt_ref}</div>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: statusObj.bg,
                          color: statusObj.color,
                          border: `1px solid ${statusObj.border}`
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusObj.dot }} />
                          {statusObj.text}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: '14px', color: isIncome ? '#059669' : '#0f172a' }}>
                        {isIncome ? '+' : '-'}₹{Number(t.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => openEditDrawer(t)}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                            title="Edit Transaction"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t)}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #fee2e2',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                            title="Delete Transaction"
                          >
                            <Trash2 size={13} />
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
      </div>

      {/* Drawer: Add / Edit Transaction */}
      {showDrawer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(2px)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: '#ffffff',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 25px rgba(0,0,0,0.15)',
            animation: 'slideLeft 0.25s ease-out'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: formData.type === 'Income' ? '#ecfdf5' : '#fff1f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: formData.type === 'Income' ? '#059669' : '#e11d48'
                }}>
                  {formData.type === 'Income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                    {editingTransaction ? `Edit ${editingTransaction.transaction_code}` : `Record ${formData.type}`}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    {editingTransaction ? 'Modify ledger transaction entry' : `Add a new farm ${formData.type.toLowerCase()} record to the accounting ledger.`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDrawer(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSaveTransaction} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'Income', party_type: 'Customer' })}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    border: formData.type === 'Income' ? '2px solid #059669' : '1px solid #cbd5e1',
                    backgroundColor: formData.type === 'Income' ? '#ecfdf5' : '#ffffff',
                    color: formData.type === 'Income' ? '#059669' : '#64748b',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <TrendingUp size={16} />
                  Income / Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'Expense', party_type: 'Vendor' })}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    border: formData.type === 'Expense' ? '2px solid #e11d48' : '1px solid #cbd5e1',
                    backgroundColor: formData.type === 'Expense' ? '#fff1f2' : '#ffffff',
                    color: formData.type === 'Expense' ? '#e11d48' : '#64748b',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <TrendingDown size={16} />
                  Operating Expense
                </button>
              </div>

              {/* Amount & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Amount (₹) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700 }}>₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 28px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Transaction Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Accounting Category */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Accounting Category (Chart of Accounts) *
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <option value="">-- Select Category --</option>
                  {categories
                    .filter(c => formData.type === 'Income' ? c.type === 'Revenue' : c.type !== 'Revenue')
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.accounting_code} — {c.category_name} ({c.type})
                      </option>
                    ))}
                </select>
              </div>

              {/* Description / Memo */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Description / Memo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 kg Heirloom Tomato supply to Bistro"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Party Name & Party Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    {formData.type === 'Income' ? 'Customer / Buyer' : 'Vendor / Supplier'}
                  </label>
                  <input
                    type="text"
                    placeholder={formData.type === 'Income' ? 'e.g. Green Grocers Supermarket' : 'e.g. BioEarth Organics'}
                    value={formData.party_name}
                    onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Payment Status
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Void">Void</option>
                  </select>
                </div>
              </div>

              {/* Payment Method & Invoice Ref */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Payment Method
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Invoice / Receipt #
                  </label>
                  <input
                    type="text"
                    placeholder="INV-2026-001 or REC-882"
                    value={formData.invoice_receipt_ref}
                    onChange={(e) => setFormData({ ...formData, invoice_receipt_ref: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {/* Linked Crop & Sales Channel */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Attributed Crop Variety
                  </label>
                  <select
                    value={formData.crop_name}
                    onChange={(e) => setFormData({ ...formData, crop_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {cropsList.map(cr => (
                      <option key={cr} value={cr}>{cr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Sales Channel Link
                  </label>
                  <select
                    value={formData.sales_channel_name}
                    onChange={(e) => setFormData({ ...formData, sales_channel_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="">None / Overhead</option>
                    {salesChannelsList.map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Internal Notes & Remittance Details
                </label>
                <textarea
                  rows="2"
                  placeholder="Add any remarks, check numbers, or delivery notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Footer Buttons */}
              <div style={{
                marginTop: 'auto',
                paddingTop: '20px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  style={{
                    padding: '9px 18px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '9px 24px',
                    backgroundColor: formData.type === 'Income' ? '#059669' : '#e11d48',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSaving && <RefreshCw size={14} className="animate-spin" />}
                  {editingTransaction ? 'Update Transaction' : `Record ${formData.type}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
