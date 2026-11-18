import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, IndianRupee, Download, Printer, RefreshCw,
  PieChart, BarChart2, CheckCircle2, AlertCircle, ArrowUpRight,
  ArrowDownRight, Layers, Sprout, Tag, FileText, Calendar, Building
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function FinancialSummaryScreen() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/financials/analytics`);
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json.data || null);
      } else {
        showToast('Failed to load financial analytics.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error communicating with server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const pnl = analyticsData?.pnl_summary || {
    gross_revenue: 0,
    cogs_total: 0,
    gross_profit: 0,
    gross_margin_pct: 0,
    operating_expenses: 0,
    net_operating_profit: 0,
    net_margin_pct: 0,
    capital_expenses: 0
  };

  const categorySpend = analyticsData?.category_spend || [];
  const channelRevenue = analyticsData?.channel_revenue || [];
  const cropProfitability = analyticsData?.crop_profitability || [];
  const monthlyTrends = analyticsData?.monthly_trends || [];

  const totalExpenseSpend = useMemo(() => {
    return categorySpend.reduce((acc, c) => acc + (parseFloat(c.total_amount) || 0), 0);
  }, [categorySpend]);

  const totalChannelRevenue = useMemo(() => {
    return channelRevenue.reduce((acc, c) => acc + (parseFloat(c.total_revenue) || 0), 0);
  }, [channelRevenue]);

  const getCategoryColor = (idx) => {
    const colors = ['#059669', '#d97706', '#2563eb', '#7c3aed', '#db2777', '#0891b2', '#ea580c', '#4b5563', '#16a34a'];
    return colors[idx % colors.length];
  };

  const getChannelColor = (idx) => {
    const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777'];
    return colors[idx % colors.length];
  };

  const exportReportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'VIVAS AI FARM FINANCIAL STATEMENT & P&L REPORT\n';
    csv += `Generated on,${new Date().toLocaleDateString()}\n\n`;

    csv += 'EXECUTIVE PROFIT & LOSS SUMMARY\n';
    csv += `Gross Farm Revenue,INR ${pnl.gross_revenue}\n`;
    csv += `Cost of Goods Sold (COGS),INR ${pnl.cogs_total}\n`;
    csv += `Gross Farm Profit,INR ${pnl.gross_profit} (${pnl.gross_margin_pct.toFixed(1)}%)\n`;
    csv += `Operating Expenses,INR ${pnl.operating_expenses}\n`;
    csv += `Net Farm Operating Income,INR ${pnl.net_operating_profit} (${pnl.net_margin_pct.toFixed(1)}%)\n\n`;

    csv += 'CROP PROFITABILITY MATRIX\n';
    csv += 'Crop Variety,Gross Revenue (INR),Direct Input Cost (INR),Overhead Cost (INR),Total Cost (INR),Net Crop Profit (INR),Margin %\n';
    cropProfitability.forEach(cp => {
      const rev = parseFloat(cp.revenue) || 0;
      const profit = parseFloat(cp.net_profit) || 0;
      const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : 'N/A';
      csv += `"${cp.crop_name}",${cp.revenue},${cp.direct_cost},${cp.overhead_cost},${cp.total_cost},${cp.net_profit},${margin}%\n`;
    });

    csv += '\nEXPENSE BREAKDOWN BY ACCOUNTING CATEGORY\n';
    csv += 'Category Name,Type,Total Spend (INR),Share %\n';
    categorySpend.forEach(c => {
      const amt = parseFloat(c.total_amount) || 0;
      const pct = totalExpenseSpend > 0 ? ((amt / totalExpenseSpend) * 100).toFixed(1) : 0;
      csv += `"${c.category_name}","${c.category_type}",${amt},${pct}%\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VivasAI_PnL_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Financial P&L Report exported successfully!');
  };

  const handlePrint = () => {
    window.print();
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
            Financial Summary & P&L Analytics
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Executive Profit & Loss statement, revenue vs operating margins, and crop enterprise profitability
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrint}
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
            <Printer size={14} />
            Print Statement
          </button>

          <button
            onClick={exportReportCSV}
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
            Export P&L Report
          </button>

          <button
            onClick={fetchAnalytics}
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
        </div>
      </div>

      {/* Executive P&L KPI Cards Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* 1. Gross Revenue */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Gross Farm Revenue
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ₹{Number(pnl.gross_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
              <IndianRupee size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '8px', fontWeight: 500 }}>
            100% Topline Income
          </div>
        </div>

        {/* 2. COGS */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cost of Goods Sold (COGS)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
                ₹{Number(pnl.cogs_total || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
              <Sprout size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#b45309', marginTop: '8px', fontWeight: 500 }}>
            Seeds, Labor & Inputs
          </div>
        </div>

        {/* 3. Gross Profit */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Gross Farm Profit
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                ₹{Number(pnl.gross_profit || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a'
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', marginTop: '8px', fontWeight: 600 }}>
            Gross Margin: {Number(pnl.gross_margin_pct || 0).toFixed(1)}%
          </div>
        </div>

        {/* 4. Operating Expenses */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Operating Overhead
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#e11d48', marginTop: '4px' }}>
                ₹{Number(pnl.operating_expenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
          <div style={{ fontSize: '12px', color: '#be123c', marginTop: '8px', fontWeight: 500 }}>
            Machinery, Fuel, Electricity
          </div>
        </div>

        {/* 5. Net Operating Profit */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Net Operating Profit
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 800,
                color: Number(pnl.net_operating_profit || 0) >= 0 ? '#0284c7' : '#b91c1c',
                marginTop: '4px'
              }}>
                ₹{Number(pnl.net_operating_profit || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '8px', fontWeight: 700 }}>
            Net Margin: {Number(pnl.net_margin_pct || 0).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Two Columns: Category Spend Distribution & Revenue by Channel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Left Column: Expense Distribution by Accounting Category */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Expenses by Accounting Category
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Breakdown of production costs & operating overhead spend.
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e11d48', backgroundColor: '#fff1f2', padding: '3px 8px', borderRadius: '6px' }}>
              ₹{totalExpenseSpend.toLocaleString('en-IN')} Total
            </span>
          </div>

          {categorySpend.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
              No recorded expense categories.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {categorySpend.map((c, idx) => {
                const amt = parseFloat(c.total_amount) || 0;
                const pct = totalExpenseSpend > 0 ? ((amt / totalExpenseSpend) * 100) : 0;
                const color = getCategoryColor(idx);

                return (
                  <div key={c.category_name || idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: color }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{c.category_name}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({c.category_type})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span style={{ fontWeight: 600, color: color, fontSize: '12px', width: '42px', textAlign: 'right' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Revenue by Sales Channel */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px 24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Revenue by Sales Channel
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Distribution of harvest receipts across distribution channels.
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', backgroundColor: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
              ₹{totalChannelRevenue.toLocaleString('en-IN')} Total
            </span>
          </div>

          {channelRevenue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
              No recorded sales channels.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {channelRevenue.map((ch, idx) => {
                const amt = parseFloat(ch.total_revenue) || 0;
                const pct = totalChannelRevenue > 0 ? ((amt / totalChannelRevenue) * 100) : 0;
                const color = getChannelColor(idx);

                return (
                  <div key={ch.channel_name || idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: color }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{ch.channel_name}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({ch.transaction_count} orders)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span style={{ fontWeight: 600, color: color, fontSize: '12px', width: '42px', textAlign: 'right' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Crop Profitability & Margins Matrix */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Crop Financial Performance & Profitability Matrix
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Evaluate gross revenues, direct input costs, and net operating margins for each crop enterprise.
              </p>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#059669',
              backgroundColor: '#ecfdf5',
              padding: '4px 10px',
              borderRadius: '6px'
            }}>
              <Sprout size={14} />
              Enterprise Analysis
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Crop Variety</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>Gross Revenue</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>Direct Input Cost</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>Overhead / Tools</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>Total Allocated Cost</th>
                <th style={{ padding: '14px 16px', fontWeight: 600 }}>Net Crop Profit</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Profit Margin %</th>
              </tr>
            </thead>
            <tbody>
              {cropProfitability.map((cp, idx) => {
                const rev = parseFloat(cp.revenue) || 0;
                const profit = parseFloat(cp.net_profit) || 0;
                const marginPct = rev > 0 ? ((profit / rev) * 100) : (profit >= 0 ? 0 : -100);
                const isProfitable = profit >= 0;

                return (
                  <tr
                    key={cp.crop_name || idx}
                    style={{
                      borderBottom: idx !== cropProfitability.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background-color 0.1s'
                    }}
                  >
                    <td style={{ padding: '12px 20px', fontWeight: 700, color: '#0f172a' }}>
                      🌱 {cp.crop_name}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669' }}>
                      ₹{rev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    <td style={{ padding: '12px 16px', color: '#d97706' }}>
                      ₹{parseFloat(cp.direct_cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      ₹{parseFloat(cp.overhead_cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e11d48' }}>
                      ₹{parseFloat(cp.total_cost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 700, color: isProfitable ? '#059669' : '#b91c1c' }}>
                      {isProfitable ? '+' : ''}₹{profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isProfitable ? '#dcfce7' : '#fee2e2',
                        color: isProfitable ? '#15803d' : '#b91c1c',
                        border: isProfitable ? '1px solid #86efac' : '1px solid #fca5a5'
                      }}>
                        {marginPct >= 0 ? `+${marginPct.toFixed(1)}%` : `${marginPct.toFixed(1)}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
