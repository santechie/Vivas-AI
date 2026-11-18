import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, CheckSquare, Square, CheckCircle2, Check, AlertCircle, Calendar,
  Filter, Printer, ArrowRight, Truck, Store, User, RefreshCw,
  Sparkles, Layers, Box, ChevronDown, ChevronUp, ShoppingBag
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function PackManagerScreen() {
  const [summary, setSummary] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [packDate, setPackDate] = useState(new Date().toISOString().slice(0, 10));
  const [channelFilter, setChannelFilter] = useState('All');
  const [viewMode, setViewMode] = useState('order'); // 'order' | 'item'
  const [notification, setNotification] = useState(null);
  const [expandedCrops, setExpandedCrops] = useState({});

  const fetchPackSummary = async () => {
    try {
      setLoading(true);
      const [sumRes, chRes] = await Promise.all([
        fetch(`${API_BASE}/pack-manager/summary?date=${packDate}&channel_id=${channelFilter}`),
        fetch(`${API_BASE}/sales-channels`)
      ]);

      const sumData = await sumRes.json();
      const chData = await chRes.json();

      if (sumData.success) setSummary(sumData.data);
      if (chData.success) setChannels(chData.data);
    } catch (err) {
      console.error('Error fetching pack summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackSummary();
  }, [packDate, channelFilter]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Toggle single item packed status
  const handleToggleItemPack = async (itemId, currentPacked) => {
    try {
      const res = await fetch(`${API_BASE}/pack-manager/order-item/${itemId}/pack`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_packed: !currentPacked })
      });
      const data = await res.json();
      if (data.success) {
        showToast(!currentPacked ? 'Item marked as packed' : 'Item marked as unpacked');
        fetchPackSummary();
      }
    } catch (err) {
      console.error('Item pack toggle error:', err);
    }
  };

  // Mark entire order as packed
  const handleMarkOrderPacked = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/pack-manager/mark-order-packed/${orderId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Order fully packed and ready for delivery!');
        fetchPackSummary();
      }
    } catch (err) {
      console.error('Order pack error:', err);
    }
  };

  const toggleCropExpand = (cropKey) => {
    setExpandedCrops(prev => ({ ...prev, [cropKey]: !prev[cropKey] }));
  };

  // Progress metrics
  const totalOrders = summary?.total_orders_to_pack || 0;
  const packedOrders = summary?.packed_orders_count || 0;
  const packingPct = totalOrders > 0 ? Math.round((packedOrders / totalOrders) * 100) : 0;

  return (
    <div className="grow-page-container">
      {/* Toast */}
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
          <h1 className="grow-title">Pack Manager</h1>
          <p className="grow-subtitle">Packhouse fulfillment workspace: aggregate harvest packing lists, order slips & crate labels</p>
        </div>

        <div className="grow-header-right">
          {/* Packing Progress Meter */}
          <div className="pack-progress-card">
            <div className="progress-top-flex">
              <span className="progress-lbl">PACKING PROGRESS ({packDate})</span>
              <span className="progress-pct">{packingPct}%</span>
            </div>
            <div className="progress-track-bg">
              <div className="progress-fill-bar" style={{ width: `${packingPct}%` }} />
            </div>
            <div className="progress-sub-text">
              {packedOrders} of {totalOrders} orders completely packed
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS TOOLBAR */}
      <div className="grow-toolbar">
        {/* View Mode Tabs */}
        <div className="view-mode-tabs">
          <button
            className={`view-tab-btn ${viewMode === 'order' ? 'active' : ''}`}
            onClick={() => setViewMode('order')}
          >
            <Package size={15} />
            <span>Pack by Order ({summary?.orders?.length || 0})</span>
          </button>
          <button
            className={`view-tab-btn ${viewMode === 'item' ? 'active' : ''}`}
            onClick={() => setViewMode('item')}
          >
            <Layers size={15} />
            <span>Pack by Crop / Harvest Allocation ({summary?.crop_allocations?.length || 0})</span>
          </button>
        </div>

        {/* Date Filter & Quick Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`btn btn-xs ${packDate === new Date().toISOString().slice(0, 10) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPackDate(new Date().toISOString().slice(0, 10))}
          >
            Today
          </button>
          <button
            className={`btn btn-xs ${packDate === new Date(Date.now() + 86400000).toISOString().slice(0, 10) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPackDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10))}
          >
            Tomorrow
          </button>
          <input
            type="date"
            className="form-control form-control-sm"
            value={packDate}
            onChange={(e) => setPackDate(e.target.value)}
          />
        </div>

        {/* Filters & Actions */}
        <div className="grow-filter-group">
          <div className="filter-pill-select">
            <span className="filter-label">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="All">All Channels</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
            title="Print entire pack sheet"
          >
            <Printer size={13} />
            <span>Print Sheets</span>
          </button>

          <button className="btn btn-secondary btn-sm" onClick={fetchPackSummary}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* VIEW 1: PACK BY ORDER (INDIVIDUAL ORDER CHECKLIST CARDS) */}
      {/* ======================================================= */}
      {viewMode === 'order' && (
        <div className="pack-orders-grid">
          {loading ? (
            <div className="timeline-loading">Loading packing checklist...</div>
          ) : !summary || summary.orders.length === 0 ? (
            <div className="harvest-empty-card" style={{ gridColumn: '1 / -1' }}>
              <Package size={42} />
              <h3>No orders scheduled for packing on {packDate}</h3>
              <p>Change the packing date above or create orders in the Orders tab.</p>
            </div>
          ) : (
            summary.orders.map((o) => {
              const allItemsPacked = o.items?.length > 0 && o.items.every(it => it.is_packed);
              const packedItemsCount = o.items?.filter(it => it.is_packed).length || 0;

              return (
                <div key={o.id} className={`pack-order-card ${allItemsPacked ? 'is-complete' : ''}`}>
                  {/* Header */}
                  <div className="pack-card-header">
                    <div className="pack-header-left">
                      <div className="order-no-badge">{o.order_number || o.order_no}</div>
                      <div>
                        <h4 className="cust-title">{o.customer_name}</h4>
                        <span className="cust-company">{o.customer_company || o.sales_channel_name}</span>
                      </div>
                    </div>

                    <div className="pack-header-right">
                      {allItemsPacked ? (
                        <span className="pack-done-pill">
                          <CheckCircle2 size={13} />
                          <span>Packed ({packedItemsCount}/{o.items?.length})</span>
                        </span>
                      ) : (
                        <span className="pack-pending-pill">
                          {packedItemsCount}/{o.items?.length} items packed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Items Checklist */}
                  <div className="pack-card-items-list">
                    {o.items?.map((it) => (
                      <div
                        key={it.id}
                        className={`pack-item-row ${it.is_packed ? 'item-packed' : ''}`}
                        onClick={() => handleToggleItemPack(it.id, it.is_packed)}
                      >
                        <button type="button" className="checkbox-btn">
                          {it.is_packed ? <CheckSquare size={17} className="check-icon" /> : <Square size={17} />}
                        </button>
                        <div className="pack-item-info">
                          <span className="pack-crop-name">{it.crop_name}</span>
                          <span className="pack-crop-sub">{it.variety_name}</span>
                        </div>
                        <div className="pack-item-qty">
                          <strong>{it.quantity_ordered}</strong> {it.packaging_unit}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notes if any */}
                  {o.packing_notes && (
                    <div className="pack-notes-strip">
                      <strong>Note:</strong> {o.packing_notes}
                    </div>
                  )}

                  {/* Card Action Footer */}
                  <div className="pack-card-footer">
                    <span className="channel-tag-mini">{o.sales_channel_name || 'Delivery'}</span>
                    {!allItemsPacked && (
                      <button
                        className="btn btn-primary btn-xs"
                        onClick={() => handleMarkOrderPacked(o.id)}
                      >
                        <Check size={13} />
                        <span>Mark Order Packed</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* VIEW 2: PACK BY ITEM / HARVEST ALLOCATION */}
      {/* ======================================================= */}
      {viewMode === 'item' && (
        <div className="grow-table-card">
          <div className="pane-header-flex" style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Consolidated Harvest Packing Allocations</h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Total quantities required across all delivery routes on {packDate}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="timeline-loading">Loading allocations...</div>
          ) : !summary || summary.crop_allocations.length === 0 ? (
            <div className="harvest-empty-card">
              <Layers size={36} />
              <p>No item allocations for this date</p>
            </div>
          ) : (
            <div className="allocations-list-wrap">
              {summary.crop_allocations.map((alloc, idx) => {
                const totalOrd = parseFloat(alloc.total_ordered) || 0;
                const totalPkd = parseFloat(alloc.total_packed) || 0;
                const pct = totalOrd > 0 ? Math.round((totalPkd / totalOrd) * 100) : 0;
                const isExpanded = !!expandedCrops[`${alloc.crop_name}_${idx}`];

                return (
                  <div key={idx} className="alloc-crop-card">
                    <div className="alloc-card-header" onClick={() => toggleCropExpand(`${alloc.crop_name}_${idx}`)}>
                      <div className="alloc-crop-title">
                        <span className="crop-avatar-sm">🌱</span>
                        <div>
                          <strong>{alloc.crop_name}</strong>
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>
                            ({alloc.variety_name})
                          </span>
                        </div>
                      </div>

                      <div className="alloc-metrics-group">
                        <div className="alloc-qty-badge">
                          <span>Total to Pack:</span>
                          <strong>{totalOrd} {alloc.packaging_unit}</strong>
                        </div>
                        <div className="alloc-order-count">
                          <span>{alloc.order_count} {alloc.order_count === 1 ? 'order' : 'orders'}</span>
                        </div>
                        <button className="expand-arrow-btn">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Breakdown list of customer orders for this item */}
                    {isExpanded && (
                      <div className="alloc-breakdown-table">
                        <table className="grow-data-table">
                          <thead>
                            <tr>
                              <th>Order Number</th>
                              <th>Customer Name</th>
                              <th>Sales Channel</th>
                              <th>Required Qty</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {alloc.orders_breakdown?.map((ord, oIdx) => (
                              <tr key={oIdx}>
                                <td><code>{ord.order_number}</code></td>
                                <td><strong>{ord.customer_name}</strong></td>
                                <td>{ord.channel_name}</td>
                                <td><strong>{ord.quantity_ordered} {alloc.packaging_unit}</strong></td>
                                <td>
                                  {ord.is_packed ? (
                                    <span className="pack-done-pill">Packed</span>
                                  ) : (
                                    <span className="stage-pill">Pending</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
