import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Plus, Search, Filter, RefreshCw, X, Edit3, Trash2,
  Check, AlertCircle, CheckCircle2, IndianRupee, TrendingUp, TrendingDown,
  Tag, Shield, FileText, Info, HelpCircle, ArrowRight
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function AccountingCategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByType, setGroupByType] = useState(true);

  // Modals & Drawers
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    category_name: '',
    type: 'Expenses',
    accounting_code: '',
    detail_category: 'Farm Operations',
    description: '',
    tax_line: 'Schedule F - Line 32 (Other Expenses)',
    is_tax_deductible: true,
    parent_id: '',
    status: 'active'
  });

  const categoryTypes = [
    'Revenue',
    'Cost of Goods Sold',
    'Expenses',
    'Capital Asset',
    'Tax & Liability'
  ];

  const detailCategories = [
    'Direct Sales',
    'Wholesale Sales',
    'Commercial Accounts',
    'Agritourism',
    'Field Inputs',
    'Soil Nutrition',
    'Plant Protection',
    'Labor Wages',
    'Post-Harvest',
    'Machinery & Tools',
    'Farm Utilities',
    'Facility & Property',
    'Compliance & Quality',
    'Fulfillment',
    'Sales & Admin',
    'Insurance & Safety',
    'Capital Infrastructure',
    'Capital Machinery',
    'Tax Liability'
  ];

  const taxLines = [
    'Schedule F - Line 2 (Produce Sales)',
    'Schedule F - Line 8 (Other Income)',
    'Schedule F - Line 11 (Chemicals / Protection)',
    'Schedule F - Line 12 (Freight & Trucking)',
    'Schedule F - Line 14 (Seeds & Plants)',
    'Schedule F - Line 15 (Insurance)',
    'Schedule F - Line 17 (Fertilizers & Lime)',
    'Schedule F - Line 20 (Gasoline, Fuel & Packaging)',
    'Schedule F - Line 22 (Labor Hired)',
    'Schedule F - Line 24 (Rent or Lease)',
    'Schedule F - Line 25 (Repairs & Maintenance)',
    'Schedule F - Line 30 (Utilities)',
    'Schedule F - Line 32 (Other Expenses)',
    'Depreciation Schedule (Asset Capitalization)',
    'Tax Liabilities'
  ];

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCat, resStats] = await Promise.all([
        fetch(`${API_BASE}/financials/categories`),
        fetch(`${API_BASE}/financials/categories/stats`)
      ]);

      if (resCat.ok) {
        const json = await resCat.json();
        setCategories(json.data || []);
      }
      if (resStats.ok) {
        const json = await resStats.json();
        setStats(json.data || null);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      showToast('Could not fetch accounting categories.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      if (typeFilter !== 'All' && c.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (c.category_name || '').toLowerCase();
        const code = (c.accounting_code || '').toLowerCase();
        const detail = (c.detail_category || '').toLowerCase();
        const tax = (c.tax_line || '').toLowerCase();
        if (!name.includes(q) && !code.includes(q) && !detail.includes(q) && !tax.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [categories, typeFilter, searchQuery]);

  const groupedCategories = useMemo(() => {
    if (!groupByType) return { 'All Categories': filteredCategories };
    const groups = {};
    categoryTypes.forEach(t => {
      const list = filteredCategories.filter(c => c.type === t);
      if (list.length > 0) groups[t] = list;
    });
    return groups;
  }, [filteredCategories, groupByType]);

  const openAddDrawer = () => {
    setEditingCategory(null);
    const nextCode = `60${String(categories.length + 1).padStart(2, '0')}`;
    setFormData({
      category_name: '',
      type: 'Expenses',
      accounting_code: nextCode,
      detail_category: 'Machinery & Tools',
      description: '',
      tax_line: 'Schedule F - Line 32 (Other Expenses)',
      is_tax_deductible: true,
      parent_id: '',
      status: 'active'
    });
    setShowDrawer(true);
  };

  const openEditDrawer = (cat) => {
    setEditingCategory(cat);
    setFormData({
      category_name: cat.category_name || '',
      type: cat.type || 'Expenses',
      accounting_code: cat.accounting_code || '',
      detail_category: cat.detail_category || 'Machinery & Tools',
      description: cat.description || '',
      tax_line: cat.tax_line || 'Schedule F - Line 32 (Other Expenses)',
      is_tax_deductible: cat.is_tax_deductible !== undefined ? cat.is_tax_deductible : true,
      parent_id: cat.parent_id || '',
      status: cat.status || 'active'
    });
    setShowDrawer(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!formData.category_name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }
    if (!formData.accounting_code.trim()) {
      showToast('Accounting code is required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      let res;
      if (editingCategory) {
        res = await fetch(`${API_BASE}/financials/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        res = await fetch(`${API_BASE}/financials/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      if (res.ok) {
        showToast(editingCategory ? 'Category updated!' : 'Accounting category created!');
        setShowDrawer(false);
        fetchData();
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Failed to save category', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error saving category', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete ${cat.accounting_code} - ${cat.category_name}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/financials/categories/${cat.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Deleted ${cat.category_name}`);
        fetchData();
      } else {
        showToast(data.message || 'Failed to delete category', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deleting category', 'error');
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'Revenue':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case 'Cost of Goods Sold':
        return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      case 'Expenses':
        return { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3' };
      case 'Capital Asset':
        return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      default:
        return { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
    }
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
            Accounting Categories & Chart of Accounts
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Standardized agricultural chart of accounts for tax reporting, profit/loss categorization, and COGS allocation
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            onClick={openAddDrawer}
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
            Add Custom Category
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
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Chart of Accounts
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {stats?.total_categories || categories.length} Categories
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            Active ledger account codes
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Revenue Streams (4000s)
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
            {stats?.revenue_count || categories.filter(c => c.type === 'Revenue').length} Accounts
          </div>
          <div style={{ fontSize: '11px', color: '#059669', marginTop: '6px', fontWeight: 500 }}>
            Wholesale, Direct & Retail
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cost of Goods Sold (5000s)
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
            {stats?.cogs_count || categories.filter(c => c.type === 'Cost of Goods Sold').length} Accounts
          </div>
          <div style={{ fontSize: '11px', color: '#d97706', marginTop: '6px', fontWeight: 500 }}>
            Seeds, Labor & Packaging
          </div>
        </div>

        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Operating Expenses (6000s)
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#e11d48', marginTop: '2px' }}>
            {stats?.expense_count || categories.filter(c => c.type === 'Expenses').length} Accounts
          </div>
          <div style={{ fontSize: '11px', color: '#e11d48', marginTop: '6px', fontWeight: 500 }}>
            Machinery, Fuel & Utilities
          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
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
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search code, category name, tax line..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Dropdowns & Toggle */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Category Types</option>
            {categoryTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <button
            onClick={() => setGroupByType(!groupByType)}
            style={{
              padding: '8px 14px',
              backgroundColor: groupByType ? '#eff6ff' : '#f8fafc',
              border: groupByType ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
              color: groupByType ? '#1d4ed8' : '#475569',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Layers size={15} />
            {groupByType ? 'Grouped by Type' : 'Flat List'}
          </button>
        </div>
      </div>

      {/* Main Categories Tables */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={28} className="animate-spin" style={{ color: '#059669', margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '14px', color: '#64748b' }}>Loading Chart of Accounts...</div>
        </div>
      ) : Object.keys(groupedCategories).length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Layers size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 6px 0' }}>No categories match filters</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Try resetting your search query.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groupedCategories).map(([groupTitle, list]) => {
            const typeStyle = getTypeStyle(groupTitle);

            return (
              <div
                key={groupTitle}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  overflow: 'hidden'
                }}
              >
                {groupByType && (
                  <div style={{
                    padding: '14px 20px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: typeStyle.bg,
                        color: typeStyle.color,
                        border: `1px solid ${typeStyle.border}`
                      }}>
                        {groupTitle}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                        ({list.length} accounts)
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: groupByType ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Code</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category Name & Description</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Detail Category</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tax Line Reference</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Tax Deductible</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Total Recorded</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((cat, idx) => (
                        <tr
                          key={cat.id}
                          style={{
                            borderBottom: idx !== list.length - 1 ? '1px solid #f1f5f9' : 'none',
                            transition: 'background-color 0.1s'
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                              {cat.accounting_code}
                            </span>
                          </td>

                          <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {cat.category_name}
                            </div>
                            {cat.description && (
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cat.description}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            <span style={{ fontSize: '12px', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              {cat.detail_category || 'General'}
                            </span>
                          </td>

                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                            {cat.tax_line || '—'}
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {cat.is_tax_deductible ? (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Check size={13} /> Yes
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>N/A</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            ₹{Number(cat.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                              {cat.transaction_count || 0} entries
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => openEditDrawer(cat)}
                                style={{
                                  padding: '5px 8px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#334155',
                                  cursor: 'pointer'
                                }}
                                title="Edit Category"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                style={{
                                  padding: '5px 8px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #fee2e2',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  color: '#ef4444',
                                  cursor: 'pointer'
                                }}
                                title="Delete Category"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer: Add / Edit Category */}
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
            maxWidth: '540px',
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
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}>
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                    {editingCategory ? 'Edit Accounting Category' : 'Add Custom Category'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Configure chart of account name, tax reporting line, and classification.
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
            <form onSubmit={handleSaveCategory} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Category Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Irrigation Drip Tape & Sub-surface Filters"
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Type & Accounting Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Category Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {categoryTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Accounting Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6075"
                    value={formData.accounting_code}
                    onChange={(e) => setFormData({ ...formData, accounting_code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
              </div>

              {/* Detail Category */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Detail Category / Sub-classification
                </label>
                <select
                  value={formData.detail_category}
                  onChange={(e) => setFormData({ ...formData, detail_category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {detailCategories.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Tax Line */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Agricultural Tax Line Reference
                </label>
                <select
                  value={formData.tax_line}
                  onChange={(e) => setFormData({ ...formData, tax_line: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {taxLines.map(tx => (
                    <option key={tx} value={tx}>{tx}</option>
                  ))}
                </select>
              </div>

              {/* Tax Deductible Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <input
                  type="checkbox"
                  id="taxDeductibleCheck"
                  checked={formData.is_tax_deductible}
                  onChange={(e) => setFormData({ ...formData, is_tax_deductible: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#059669', cursor: 'pointer' }}
                />
                <label htmlFor="taxDeductibleCheck" style={{ fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Qualifies as Tax Deductible Farm Operating Expense
                </label>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Description & Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="Explain when this ledger account should be chosen by farm bookkeepers..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    backgroundColor: '#059669',
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
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
