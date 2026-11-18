import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2, PieChart, TrendingUp, TrendingDown, IndianRupee, Download,
  RefreshCw, Calendar, Filter, Plus, Save, Trash2, CheckCircle2, AlertCircle,
  FileText, Users, Sprout, Tag, Box, Layers, ArrowUpRight, ArrowDownRight,
  Printer, Sparkles, X, ChevronDown, Clock, Search, BookOpen
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function ReportsDashboardScreen() {
  // State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'yield', 'sales', 'labor', 'financials', 'inputs', 'saved'
  const [dateRange, setDateRange] = useState('This Month');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Data States
  const [summaryData, setSummaryData] = useState(null);
  const [yieldData, setYieldData] = useState({ data: [], crop_summary: [] });
  const [salesData, setSalesData] = useState({ data: [], channel_summary: [] });
  const [laborData, setLaborData] = useState({ data: [], task_summary: [] });
  const [financialData, setFinancialData] = useState({ pnl: {}, category_breakdown: [] });
  const [savedReports, setSavedReports] = useState([]);

  // Filters for sub-reports
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [selectedTask, setSelectedTask] = useState('All');

  // Save Report Drawer State
  const [showSaveDrawer, setShowSaveDrawer] = useState(false);
  const [saveForm, setSaveForm] = useState({
    report_name: '',
    category: 'General',
    description: '',
    is_favorite: false,
    created_by: 'Farm Manager'
  });
  const [savingReport, setSavingReport] = useState(false);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch Reports Data
  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [sumRes, yieldRes, salesRes, laborRes, finRes, savedRes] = await Promise.all([
        fetch(`${API_BASE}/reports/summary?date_range=${encodeURIComponent(dateRange)}`),
        fetch(`${API_BASE}/reports/yield?crop_name=${encodeURIComponent(selectedCrop)}`),
        fetch(`${API_BASE}/reports/sales?sales_channel=${encodeURIComponent(selectedChannel)}`),
        fetch(`${API_BASE}/reports/labor?task_type=${encodeURIComponent(selectedTask)}`),
        fetch(`${API_BASE}/reports/financials`),
        fetch(`${API_BASE}/reports/saved`)
      ]);

      if (sumRes.ok) {
        const j = await sumRes.json();
        if (j.success) setSummaryData(j.data);
      }
      if (yieldRes.ok) {
        const j = await yieldRes.json();
        if (j.success) setYieldData({ data: j.data || [], crop_summary: j.crop_summary || [] });
      }
      if (salesRes.ok) {
        const j = await salesRes.json();
        if (j.success) setSalesData({ data: j.data || [], channel_summary: j.channel_summary || [] });
      }
      if (laborRes.ok) {
        const j = await laborRes.json();
        if (j.success) setLaborData({ data: j.data || [], task_summary: j.task_summary || [] });
      }
      if (finRes.ok) {
        const j = await finRes.json();
        if (j.success) setFinancialData({ pnl: j.pnl || {}, category_breakdown: j.category_breakdown || [] });
      }
      if (savedRes.ok) {
        const j = await savedRes.json();
        if (j.success) setSavedReports(j.data || []);
      }
    } catch (err) {
      console.error('Error fetching reports data:', err);
      showToast('Error loading report analytics.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [dateRange, selectedCrop, selectedChannel, selectedTask]);

  // Handle Save Custom Report
  const handleSaveReportSubmit = async (e) => {
    e.preventDefault();
    if (!saveForm.report_name.trim()) return;
    setSavingReport(true);
    try {
      const res = await fetch(`${API_BASE}/reports/saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...saveForm,
          filters_json: { date_range: dateRange, crop: selectedCrop, channel: selectedChannel, task: selectedTask }
        })
      });
      const j = await res.json();
      if (j.success) {
        showToast('Custom report saved successfully!');
        setShowSaveDrawer(false);
        setSaveForm({ report_name: '', category: 'General', description: '', is_favorite: false, created_by: 'Farm Manager' });
        fetchAllReports();
      } else {
        showToast(j.message || 'Failed to save report', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to save report', 'error');
    } finally {
      setSavingReport(false);
    }
  };

  // Delete Saved Report
  const handleDeleteSavedReport = async (id, name) => {
    if (!window.confirm(`Delete saved report preset "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/reports/saved/${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.success) {
        showToast('Saved report preset deleted');
        fetchAllReports();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Export Handler
  const exportCurrentReportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'VIVAS AI FARM REPORTS & ANALYTICS AUDIT\n';
    csvContent += `Generated On,${new Date().toLocaleDateString()}\n`;
    csvContent += `Report Module,${activeTab.toUpperCase()}\n`;
    csvContent += `Date Range,${dateRange}\n\n`;

    if (activeTab === 'overview' || activeTab === 'financials') {
      csvContent += 'FINANCIAL P&L SUMMARY\n';
      csvContent += `Gross Farm Revenue,INR ${summaryData?.gross_revenue || 0}\n`;
      csvContent += `Total Operating Expenses,INR ${summaryData?.total_expenses || 0}\n`;
      csvContent += `Net Operating Profit,INR ${summaryData?.net_profit || 0}\n`;
      csvContent += `Net Operating Margin,${summaryData?.net_margin_pct || 0}%\n\n`;
    }

    if (activeTab === 'yield' || activeTab === 'overview') {
      csvContent += 'HARVEST YIELD VARIANCE BY CROP\n';
      csvContent += 'Crop Variety,Actual Yield / Acre (Ton),Planned Yield / Acre (Ton),Variance (Ton),Variance %,Harvest Events\n';
      yieldData.crop_summary.forEach(c => {
        csvContent += `"${c.crop_name}",${c.actual_yield_kg},${c.planned_yield_kg},${c.variance_kg},${c.variance_pct}%,${c.harvest_events}\n`;
      });
      csvContent += '\n';
    }

    if (activeTab === 'sales' || activeTab === 'overview') {
      csvContent += 'SALES REVENUE BY DISTRIBUTION CHANNEL\n';
      csvContent += 'Sales Channel,Gross Revenue (INR),Total Orders,Average Order Value (INR)\n';
      salesData.channel_summary.forEach(ch => {
        csvContent += `"${ch.channel_name}",${ch.total_revenue},${ch.order_count},${ch.avg_order_value}\n`;
      });
      csvContent += '\n';
    }

    if (activeTab === 'labor' || activeTab === 'overview') {
      csvContent += 'LABOR HOURS & COST BY TASK TYPE\n';
      csvContent += 'Task Type,Total Hours,Total Labor Cost (INR),Shift Count\n';
      laborData.task_summary.forEach(t => {
        csvContent += `"${t.task_type}",${t.total_hours},${t.total_cost},${t.shift_count}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VivasAI_${activeTab.toUpperCase()}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${activeTab.toUpperCase()} report to CSV!`);
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

      {/* ── HEADER ── */}
      <div className="grow-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            REPORTS & ANALYTICS
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>
            Reports & Business Analytics
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Comprehensive harvest yields, sales channels, labor allocation, P&L statements, and input consumption
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Date Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px' }}>
            <Calendar size={14} style={{ color: '#64748b' }} />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#334155', outline: 'none', cursor: 'pointer' }}
            >
              <option value="This Week">This Week</option>
              <option value="Next Week">Next Week</option>
              <option value="This Month">This Month</option>
              <option value="Year-to-Date">Year-to-Date</option>
            </select>
          </div>

          <button
            onClick={fetchAllReports}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={exportCurrentReportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Download size={14} />
            Export CSV
          </button>

          <button
            onClick={() => setShowSaveDrawer(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
          >
            <Save size={15} />
            Save Preset
          </button>
        </div>
      </div>

      {/* ── EXECUTIVE KPI STRIP (WHITE THEME) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Total Harvest Volume */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Harvest Volume</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#ecfdf5', color: '#059669' }}>
              <Sprout size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
            {summaryData ? summaryData.total_harvest_kg.toLocaleString() : 0} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>kg</span>
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '6px', fontWeight: 500 }}>
            {summaryData?.total_harvest_events || 0} Harvest Events Logged
          </div>
        </div>

        {/* Total Gross Sales */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross Farm Revenue</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a' }}>
            ₹{summaryData ? summaryData.gross_revenue.toLocaleString('en-IN') : 0}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
            {summaryData?.total_orders || 0} Orders Fulfilled
          </div>
        </div>

        {/* Total Labor Hours */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Labor Allocation</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#ede9fe', color: '#6d28d9' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#6d28d9' }}>
            {summaryData ? summaryData.total_labor_hours.toFixed(1) : 0} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>hrs</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
            ₹{summaryData ? summaryData.total_labor_cost.toLocaleString('en-IN') : 0} Total Wages
          </div>
        </div>

        {/* Net Farm Operating Profit */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Farm Income</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: (summaryData?.net_profit || 0) >= 0 ? '#e0f2fe' : '#fee2e2', color: (summaryData?.net_profit || 0) >= 0 ? '#0284c7' : '#b91c1c' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: (summaryData?.net_profit || 0) >= 0 ? '#0284c7' : '#b91c1c' }}>
            ₹{summaryData ? summaryData.net_profit.toLocaleString('en-IN') : 0}
          </div>
          <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '6px', fontWeight: 700 }}>
            Net Margin: {summaryData ? summaryData.net_margin_pct : 0}%
          </div>
        </div>

        {/* Saved Presets */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saved Presets</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: '#fef3c7', color: '#d97706' }}>
              <BookOpen size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
            {summaryData ? summaryData.saved_reports_count : 0} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>reports</span>
          </div>
          <div style={{ fontSize: '12px', color: '#d97706', marginTop: '6px', fontWeight: 500 }}>
            Custom Report Templates
          </div>
        </div>

      </div>

      {/* ── MODULE NAVIGATION TABS ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '6px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {[
          { id: 'overview', label: 'Overview & Executive Summary', icon: BarChart2 },
          { id: 'yield', label: 'Yield & Harvest', icon: Sprout },
          { id: 'sales', label: 'Sales & Channels', icon: IndianRupee },
          { id: 'labor', label: 'Labor & Tasks', icon: Users },
          { id: 'financials', label: 'Financial P&L', icon: TrendingUp },
          { id: 'inputs', label: 'Inputs & Inventory', icon: Box },
          { id: 'saved', label: `Saved Reports (${savedReports.length})`, icon: Save }
        ].map(tab => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#f1f5f9' : 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <IconComponent size={15} style={{ color: isActive ? '#16a34a' : '#94a3b8' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT AREAS ── */}
      
      {/* 1. OVERVIEW & EXECUTIVE SUMMARY */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Revenue vs Expenses Summary Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Executive Profitability & Margin Overview</h2>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Gross revenues, operating costs, and net farm profit</p>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>
                Net Margin: {summaryData ? summaryData.net_margin_pct : 0}%
              </span>
            </div>

            {/* Profit Progress Meter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span style={{ color: '#059669' }}>Gross Revenue: ₹{summaryData?.gross_revenue.toLocaleString('en-IN')}</span>
                <span style={{ color: '#e11d48' }}>Total Expenses: ₹{summaryData?.total_expenses.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ height: '12px', width: '100%', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${summaryData?.gross_revenue ? Math.min(100, (summaryData.net_profit / summaryData.gross_revenue) * 100) : 0}%`, background: '#16a34a' }} />
                <div style={{ flex: 1, background: '#f43f5e' }} />
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Gross Revenue</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>₹{summaryData?.gross_revenue.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Total Operating Expenses</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#e11d48' }}>₹{summaryData?.total_expenses.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Net Farm Profit</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0284c7' }}>₹{summaryData?.net_profit.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Total Inventory Value</span>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>₹{summaryData?.inventory_value.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Two-Column Summary Tables */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
            
            {/* Left: Top Crop Yield Performance */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Top Harvested Crops (Yield & Variance)</h3>
                <button onClick={() => setActiveTab('yield')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>View All →</button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
                      <th style={{ padding: '10px 12px' }}>Crop Variety</th>
                      <th style={{ padding: '10px 12px' }}>Actual Yield / Acre</th>
                      <th style={{ padding: '10px 12px' }}>Planned Yield / Acre</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Variance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yieldData.crop_summary.slice(0, 5).map(c => (
                      <tr key={c.crop_name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>🌱 {c.crop_name}</td>
                        <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{c.actual_yield_kg} Ton</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{c.planned_yield_kg} Ton</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: c.variance_pct >= 0 ? '#16a34a' : '#e11d48' }}>
                          {c.variance_pct >= 0 ? `+${c.variance_pct}%` : `${c.variance_pct}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Revenue by Sales Channel */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Distribution Channels Performance</h3>
                <button onClick={() => setActiveTab('sales')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>View All →</button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
                      <th style={{ padding: '10px 12px' }}>Sales Channel</th>
                      <th style={{ padding: '10px 12px' }}>Orders</th>
                      <th style={{ padding: '10px 12px' }}>Gross Revenue</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>AOV (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.channel_summary.map(ch => (
                      <tr key={ch.channel_name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>📦 {ch.channel_name}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{ch.order_count}</td>
                        <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>₹{ch.total_revenue.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>₹{ch.avg_order_value.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. YIELD & HARVEST REPORT */}
      {activeTab === 'yield' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Harvest Yield & Variety Performance</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Compare actual harvest weights against planned target yields by variety and bed location</p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#334155' }}
              >
                <option value="All">All Crops</option>
                <option value="Tomatoes">Tomatoes</option>
                <option value="Microgreens">Microgreens</option>
                <option value="Basil">Basil</option>
                <option value="Cucumbers">Cucumbers</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Crop Variety</th>
                  <th style={{ padding: '14px 16px' }}>Field / Greenhouse</th>
                  <th style={{ padding: '14px 16px' }}>Quality Grade</th>
                  <th style={{ padding: '14px 16px' }}>Actual Harvest / Acre (Ton)</th>
                  <th style={{ padding: '14px 16px' }}>Planned Target / Acre (Ton)</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Yield Variance (Ton)</th>
                </tr>
              </thead>
              <tbody>
                {yieldData.data.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No harvest logs recorded for this criteria.</td>
                  </tr>
                ) : (
                  yieldData.data.map((r, idx) => {
                    const actual = parseFloat(r.total_yield_kg) || 0;
                    const planned = parseFloat(r.total_planned_kg) || 0;
                    const diff = actual - planned;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>🌱 {r.crop_name} ({r.variety_name})</td>
                        <td style={{ padding: '14px 16px', color: '#475569' }}>{r.field_location}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>
                            {r.quality_grade || 'Grade A'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16a34a' }}>{actual} Ton</td>
                        <td style={{ padding: '14px 16px', color: '#64748b' }}>{planned} Ton</td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: diff >= 0 ? '#16a34a' : '#e11d48' }}>
                          {diff >= 0 ? `+${diff.toFixed(1)} Ton` : `${diff.toFixed(1)} Ton`}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SALES & REVENUE REPORT */}
      {activeTab === 'sales' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Sales Channels & Revenue Breakdown</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Analyze harvest revenue across distribution channels and key customer accounts</p>
            </div>

            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#334155' }}
            >
              <option value="All">All Channels</option>
              <option value="Wholesale & Retail Markets">Wholesale & Retail</option>
              <option value="Restaurants & Chefs Direct">Restaurants & Chefs</option>
              <option value="Farm Stand & Subscriptions">Farm Stand & Subscriptions</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Sales Channel</th>
                  <th style={{ padding: '14px 16px' }}>Customer Account</th>
                  <th style={{ padding: '14px 16px' }}>Crop Item</th>
                  <th style={{ padding: '14px 16px' }}>Payment Status</th>
                  <th style={{ padding: '14px 16px' }}>Orders</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {salesData.data.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No sales data recorded for this channel filter.</td>
                  </tr>
                ) : (
                  salesData.data.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>📦 {s.sales_channel}</td>
                      <td style={{ padding: '14px 16px', color: '#334155' }}>{s.customer_name || 'Direct Buyer'}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{s.crop_name}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>
                          {s.payment_status || 'Completed'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>{s.order_count}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        ₹{parseFloat(s.channel_revenue || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. LABOR & TASKS REPORT */}
      {activeTab === 'labor' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Labor Hours & Task Expenditure</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Worker hours and wage cost allocation per field task and crop enterprise</p>
            </div>

            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#334155' }}
            >
              <option value="All">All Task Types</option>
              <option value="Harvesting & Sorting">Harvesting & Sorting</option>
              <option value="Field Bed Preparation">Field Bed Preparation</option>
              <option value="Greenhouse Seeding">Greenhouse Seeding</option>
              <option value="Irrigation & Fertigation">Irrigation & Fertigation</option>
              <option value="Weeding & Cultivation">Weeding & Cultivation</option>
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Task Activity</th>
                  <th style={{ padding: '14px 16px' }}>Worker Name</th>
                  <th style={{ padding: '14px 16px' }}>Attributed Crop</th>
                  <th style={{ padding: '14px 16px' }}>Location</th>
                  <th style={{ padding: '14px 16px' }}>Logged Hours</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Wages (₹)</th>
                </tr>
              </thead>
              <tbody>
                {laborData.data.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No labor timesheets logged for this task filter.</td>
                  </tr>
                ) : (
                  laborData.data.map((l, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>🛠️ {l.task_type}</td>
                      <td style={{ padding: '14px 16px', color: '#334155' }}>{l.worker_name}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{l.crop_name || 'General Farm'}</td>
                      <td style={{ padding: '14px 16px', color: '#64748b' }}>{l.field_location}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#6d28d9' }}>{l.total_hours} hrs</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        ₹{parseFloat(l.total_cost || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. FINANCIAL P&L REPORT */}
      {activeTab === 'financials' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Financial Statement & Expense Breakdown</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Standard chart of accounts spend distribution and net operating profitability</p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '14px 16px' }}>Accounting Category</th>
                  <th style={{ padding: '14px 16px' }}>Category Type</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Recorded Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {financialData.category_breakdown.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>📑 {c.category_name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#334155' }}>
                        {c.category_type}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: c.category_type === 'Revenue' ? '#16a34a' : '#e11d48' }}>
                      ₹{parseFloat(c.total_amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. INPUTS & INVENTORY REPORT */}
      {activeTab === 'inputs' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Input Materials & Infrastructure Utilization</h2>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>Seed stock, fertilizer consumption, organic chemicals, and container plug tray capacities</p>
          </div>

          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <Box size={36} style={{ margin: '0 auto 12px auto', color: '#0284c7' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Inputs & Infrastructure Audit Log</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>All seed stocks, fertilizers, and container tray inventories are synchronized with Materials & Containers modules.</p>
          </div>
        </div>
      )}

      {/* 7. SAVED CUSTOM REPORTS */}
      {activeTab === 'saved' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Saved Custom Report Presets</h2>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>User-configured report templates with quick run and export options</p>
            </div>
            
            <button
              onClick={() => setShowSaveDrawer(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: '#16a34a', color: '#fff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              <Plus size={15} />
              + Save New Preset
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {savedReports.map(rep => (
              <div
                key={rep.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{rep.report_name}</h3>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                    {rep.category}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>{rep.description || 'Custom report parameters preset.'}</p>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>By {rep.created_by}</span>
                  <button
                    onClick={() => handleDeleteSavedReport(rep.id, rep.report_name)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SAVE CUSTOM REPORT SLIDE-OVER DRAWER ── */}
      {showSaveDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(2px)' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 25px rgba(0,0,0,0.15)' }}>
            
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Save Report Preset</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Save current filters and metrics configuration for quick audit access</p>
              </div>
              <button onClick={() => setShowSaveDrawer(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveReportSubmit} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Report Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q3 Harvest Yield & Revenue Audit"
                  value={saveForm.report_name}
                  onChange={(e) => setSaveForm({ ...saveForm, report_name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Category *</label>
                <select
                  value={saveForm.category}
                  onChange={(e) => setSaveForm({ ...saveForm, category: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff' }}
                >
                  <option value="Yield">Yield & Harvest</option>
                  <option value="Sales">Sales & Revenue</option>
                  <option value="Labor">Labor & Tasks</option>
                  <option value="Financials">Financial P&L</option>
                  <option value="Inputs">Inputs & Inventory</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Describe the purpose of this report preset..."
                  value={saveForm.description}
                  onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowSaveDrawer(false)} style={{ padding: '9px 18px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={savingReport} style={{ padding: '9px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  {savingReport ? 'Saving...' : 'Save Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
