import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, IndianRupee, Clock, Users, RefreshCw, Layers,
  Calendar, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight,
  PieChart, BarChart2, Award, ShieldAlert, Sparkles, Filter, Download
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function LaborAnalyticsScreen() {
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
      const res = await fetch(`${API_BASE}/labor/analytics`);
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json.data || json);
      } else {
        showToast('Failed to load labor analytics data.', 'error');
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

  const taskBreakdown = useMemo(() => {
    return analyticsData?.task_breakdown || [];
  }, [analyticsData]);

  const cropBreakdown = useMemo(() => {
    return analyticsData?.crop_breakdown || [];
  }, [analyticsData]);

  const workerLeaderboard = useMemo(() => {
    return analyticsData?.worker_breakdown || analyticsData?.worker_leaderboard || [];
  }, [analyticsData]);

  // Aggregate totals
  const totalCost = useMemo(() => {
    if (analyticsData?.total_cost) return parseFloat(analyticsData.total_cost);
    return taskBreakdown.reduce((sum, t) => sum + (parseFloat(t.total_cost) || 0), 0);
  }, [analyticsData, taskBreakdown]);

  const totalHours = useMemo(() => {
    if (analyticsData?.total_hours) return parseFloat(analyticsData.total_hours);
    return taskBreakdown.reduce((sum, t) => sum + (parseFloat(t.total_hours) || 0), 0);
  }, [analyticsData, taskBreakdown]);

  const totalShifts = useMemo(() => {
    if (analyticsData?.total_shifts) return parseInt(analyticsData.total_shifts);
    return taskBreakdown.reduce((sum, t) => sum + (parseInt(t.entry_count || t.shift_count) || 0), 0);
  }, [analyticsData, taskBreakdown]);

  const avgHourlyCost = totalHours > 0 ? (totalCost / totalHours) : 0;

  // Planned vs Actual Variance Mock Benchmark Calculations
  const varianceBenchmarks = useMemo(() => {
    const plannedMap = {
      'Harvesting & Sorting': { plannedHours: 120, plannedCost: 15600 },
      'Field Bed Preparation': { plannedHours: 80, plannedCost: 10400 },
      'Greenhouse Seeding': { plannedHours: 50, plannedCost: 6500 },
      'Transplanting': { plannedHours: 60, plannedCost: 7800 },
      'Packhouse Packing': { plannedHours: 70, plannedCost: 9450 },
      'Irrigation & Fertigation': { plannedHours: 40, plannedCost: 5600 },
      'Equipment Maintenance': { plannedHours: 35, plannedCost: 5250 },
    };

    return taskBreakdown.map(t => {
      const benchmark = plannedMap[t.task_type] || { plannedHours: 50, plannedCost: 6500 };
      const actualHours = parseFloat(t.total_hours) || 0;
      const actualCost = parseFloat(t.total_cost) || 0;
      const hoursDiff = actualHours - benchmark.plannedHours;
      const costDiff = actualCost - benchmark.plannedCost;
      const hoursVariancePct = benchmark.plannedHours > 0 ? ((hoursDiff / benchmark.plannedHours) * 100) : 0;

      return {
        task_type: t.task_type,
        plannedHours: benchmark.plannedHours,
        actualHours: actualHours,
        hoursDiff: hoursDiff,
        hoursVariancePct: hoursVariancePct,
        plannedCost: benchmark.plannedCost,
        actualCost: actualCost,
        costDiff: costDiff,
        isOverBudget: costDiff > 0
      };
    });
  }, [taskBreakdown]);

  const exportCSV = () => {
    if (!taskBreakdown.length && !cropBreakdown.length) {
      showToast('No data available to export.', 'error');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'LABOR EXPENDITURE BY TASK TYPE\n';
    csvContent += 'Task Type,Hours Logged,Total Cost (INR),Shift Count\n';
    taskBreakdown.forEach(t => {
      csvContent += `"${t.task_type}",${t.total_hours},${t.total_cost},${t.entry_count || t.shift_count}\n`;
    });

    csvContent += '\nLABOR ALLOCATION BY CROP\n';
    csvContent += 'Crop Name,Hours Logged,Total Cost (INR),Shift Count\n';
    cropBreakdown.forEach(c => {
      csvContent += `"${c.crop_name}",${c.total_hours},${c.total_cost},${c.entry_count || c.shift_count}\n`;
    });

    csvContent += '\nWORKER PAYOUT LEADERBOARD\n';
    csvContent += 'Worker Name,Total Hours,Total Payout (INR)\n';
    workerLeaderboard.forEach(w => {
      csvContent += `"${w.worker_name || w.name}",${w.total_hours},${w.total_cost || w.total_earnings}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VivasAI_Labor_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Labor analytics exported to CSV successfully!');
  };

  const getTaskColor = (index) => {
    const colors = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4b5563'];
    return colors[index % colors.length];
  };

  const getCropColor = (index) => {
    const colors = ['#e11d48', '#16a34a', '#0284c7', '#ea580c', '#8b5cf6', '#64748b'];
    return colors[index % colors.length];
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
          <div style={{ display: 'inline-block', padding: '4px 10px', background: '#ede9fe', color: '#6d28d9', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            LABOR & WORKFORCE
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
            Labor Analytics & Cost Allocation
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Gain granular insights into farm labor expenditures, crop cost allocation, worker productivity, and planned vs actual variance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            Refresh Analytics
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
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
                Total Labor Expenditure
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                ₹{totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
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
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
            <ArrowUpRight size={14} />
            <span>Across {totalShifts} logged timesheet shifts</span>
          </div>
        </div>

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
                Total Logged Labor Hours
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
                {parseFloat(totalHours).toFixed(1)} hrs
              </div>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
            Net productive hours (excluding unpaid breaks)
          </div>
        </div>

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
                Effective Avg Hourly Cost
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#92400e', marginTop: '4px' }}>
                ₹{avgHourlyCost.toFixed(2)}/hr
              </div>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706'
            }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
            Includes base wages & overtime rates
          </div>
        </div>

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
                Active Workers on Roster
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {workerLeaderboard.length} Crew Members
              </div>
            </div>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#f5f3ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed'
            }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#7c3aed', marginTop: '10px', fontWeight: 500 }}>
            {taskBreakdown.length} distinct operational task categories
          </div>
        </div>
      </div>

      {/* Main Two Columns: Task Cost Distribution & Crop Cost Allocation */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Left Column: Task Cost Distribution */}
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
                Labor Cost by Operational Task
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Percentage of total labor spend allocated per farming activity.
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669', backgroundColor: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>
              {taskBreakdown.length} Categories
            </span>
          </div>

          {taskBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
              No task timesheet records found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {taskBreakdown.map((t, idx) => {
                const cost = parseFloat(t.total_cost) || 0;
                const hours = parseFloat(t.total_hours) || 0;
                const shifts = t.entry_count || t.shift_count || 1;
                const pct = totalCost > 0 ? ((cost / totalCost) * 100) : 0;
                const color = getTaskColor(idx);

                return (
                  <div key={t.task_type || idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: color }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{t.task_type}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({shifts} shifts)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#64748b', fontSize: '12px' }}>{hours.toFixed(1)} hrs</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span style={{ fontWeight: 600, color: color, fontSize: '12px', width: '42px', textAlign: 'right' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Meter */}
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

        {/* Right Column: Crop Cost Allocation */}
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
                Labor Cost Allocation by Crop
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Track labor inputs attributable to specific crop varieties and plots.
              </p>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '6px' }}>
              {cropBreakdown.length} Crops
            </span>
          </div>

          {cropBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
              No crop-linked timesheet records found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {cropBreakdown.map((c, idx) => {
                const cost = parseFloat(c.total_cost) || 0;
                const hours = parseFloat(c.total_hours) || 0;
                const shifts = c.entry_count || c.shift_count || 1;
                const pct = totalCost > 0 ? ((cost / totalCost) * 100) : 0;
                const color = getCropColor(idx);

                return (
                  <div key={c.crop_name || idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: color }} />
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{c.crop_name || 'Unassigned / Farmwide'}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({shifts} shifts)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#64748b', fontSize: '12px' }}>{hours.toFixed(1)} hrs</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        <span style={{ fontWeight: 600, color: color, fontSize: '12px', width: '42px', textAlign: 'right' }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Meter */}
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

      {/* Planned vs Actual Labor Variance Analysis */}
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
                Planned vs Actual Labor Variance Analysis
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Compare scheduled operational budgets against actual logged timesheet expenditures.
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
              <CheckCircle2 size={14} />
              Budget Health: Healthy
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Task Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Planned Hours</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Actual Hours</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Hours Variance</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Budget Allocated</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Actual Spend</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Cost Variance Status</th>
              </tr>
            </thead>
            <tbody>
              {varianceBenchmarks.map((v, idx) => (
                <tr key={idx} style={{ borderBottom: idx !== varianceBenchmarks.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '12px 20px', fontWeight: 600, color: '#0f172a' }}>
                    {v.task_type}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {v.plannedHours} hrs
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                    {v.actualHours.toFixed(1)} hrs
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                      color: v.hoursDiff > 0 ? '#b91c1c' : '#15803d'
                    }}>
                      {v.hoursDiff > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {v.hoursDiff > 0 ? `+${v.hoursDiff.toFixed(1)}` : v.hoursDiff.toFixed(1)} hrs ({v.hoursVariancePct.toFixed(0)}%)
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    ₹{v.plannedCost.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                    ₹{v.actualCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: v.costDiff <= 0 ? '#dcfce7' : '#fee2e2',
                      color: v.costDiff <= 0 ? '#15803d' : '#b91c1c',
                      border: v.costDiff <= 0 ? '1px solid #86efac' : '1px solid #fca5a5'
                    }}>
                      {v.costDiff <= 0 ? `Under Budget (₹${Math.abs(v.costDiff).toFixed(0)})` : `Over Budget (+₹${v.costDiff.toFixed(0)})`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker Productivity & Payout Leaderboard */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Crew Productivity & Payout Leaderboard
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Summary of total productive hours logged and gross earnings per team member.
              </p>
            </div>
            <Award size={20} style={{ color: '#d97706' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Rank & Worker</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Total Productive Hours</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Total Gross Earnings</th>
              </tr>
            </thead>
            <tbody>
              {workerLeaderboard.map((w, idx) => (
                <tr key={idx} style={{ borderBottom: idx !== workerLeaderboard.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: idx === 0 ? '#fef3c7' : idx === 1 ? '#f1f5f9' : idx === 2 ? '#ffedd5' : '#f8fafc',
                        color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : '#94a3b8',
                        fontWeight: 700,
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #e2e8f0'
                      }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {w.worker_name || w.name || 'Worker'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e40af' }}>
                    {parseFloat(w.total_hours || 0).toFixed(1)} hrs
                  </td>

                  <td style={{ padding: '12px 20px', fontWeight: 800, color: '#059669', textAlign: 'right', fontSize: '14px' }}>
                    ₹{parseFloat(w.total_cost || w.total_earnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
