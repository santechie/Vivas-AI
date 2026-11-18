import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar, Plus, Filter, Search, X, ChevronDown, ChevronUp, Check,
  Layers, MapPin, IndianRupee, Sprout, Tag, Clock, ArrowRight,
  Edit3, Trash2, Copy, RefreshCw, Eye, Download, Printer,
  Sparkles, ShieldCheck, Compass, Info, CheckCircle2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import PlantingMethodSelect from './PlantingMethodSelect';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

// Month names and weeks representation (52 weeks)
const MONTHS = [
  { name: 'Jan', weeks: [1, 2, 3, 4] },
  { name: 'Feb', weeks: [5, 6, 7, 8] },
  { name: 'Mar', weeks: [9, 10, 11, 12, 13] },
  { name: 'Apr', weeks: [14, 15, 16, 17] },
  { name: 'May', weeks: [18, 19, 20, 21, 22] },
  { name: 'Jun', weeks: [23, 24, 25, 26] },
  { name: 'Jul', weeks: [27, 28, 29, 30, 31] },
  { name: 'Aug', weeks: [32, 33, 34, 35] },
  { name: 'Sep', weeks: [36, 37, 38, 39] },
  { name: 'Oct', weeks: [40, 41, 42, 43, 44] },
  { name: 'Nov', weeks: [45, 46, 47, 48] },
  { name: 'Dec', weeks: [49, 50, 51, 52] }
];

export default function CropPlanScreen() {
  const [plantings, setPlantings] = useState([]);
  const [stats, setStats] = useState(null);
  const [crops, setCrops] = useState([]);
  const [mapItems, setMapItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [seasonYear, setSeasonYear] = useState(2026);
  const [viewMode, setViewMode] = useState('crop'); // 'crop' (Gantt) | 'location' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [cropFilter, setCropFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showWelcome, setShowWelcome] = useState(true);
  const [liveEdit, setLiveEdit] = useState(false);

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('basic'); // 'basic' | 'dates' | 'location' | 'yield' | 'inputs'
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const [form, setForm] = useState({
    crop_id: '',
    crop_name: '',
    variety_id: '',
    variety_name: '',
    harvest_stage: 'Mature',
    planting_type: 'Transplant',
    season_year: 2026,
    sow_date: '2026-03-01',
    plant_date: '2026-04-01',
    first_harvest_date: '2026-06-01',
    last_harvest_date: '2026-08-15',
    location_id: '',
    location_name: '',
    bed_ids: [],
    bed_names: '',
    bed_feet: 100,
    row_feet: 200,
    rows_per_bed: 2,
    spacing_unit: 'mtr',
    in_row_spacing_in: 0.35,
    row_spacing_in: 0.5,
    gps_lat: 12.9716,
    gps_lng: 77.5946,
    target_yield: 15.0,
    yield_unit: 'Ton',
    unit_price: 25000,
    estimated_revenue: 375000,
    status: 'planned',
    seed_vendor: '',
    seed_lot: '',
    tray_count: 2,
    notes: ''
  });

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, sRes, cRes, mRes] = await Promise.all([
        fetch(`${API_BASE}/plantings?season=${seasonYear}&location_id=${locationFilter}&crop_id=${cropFilter}&status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`),
        fetch(`${API_BASE}/plantings/stats?season=${seasonYear}`),
        fetch(`${API_BASE}/crops?status=active`),
        fetch(`${API_BASE}/farm-map/items`)
      ]);

      const pData = await pRes.json();
      const sData = await sRes.json();
      const cData = await cRes.json();
      const mData = await mRes.json();

      if (pData.success) setPlantings(pData.data);
      if (sData.success) setStats(sData.data);
      if (cData.success) setCrops(cData.data);
      if (mData.success) setMapItems(mData.data);
    } catch (err) {
      console.error('Error fetching crop plan data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [seasonYear, locationFilter, cropFilter, statusFilter, searchQuery]);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Convert Date to week of year (1-52)
  const getWeekOfYear = (dateStr) => {
    if (!dateStr) return 1;
    const d = new Date(dateStr);
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d - start + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    return Math.min(52, Math.max(1, Math.ceil((day + start.getDay() + 1) / 7)));
  };

  // Handle Crop select in modal
  const handleCropSelect = (cropId) => {
    const crop = crops.find(c => c.id === cropId);
    if (!crop) return;
    const defaultVar = crop.varieties?.[0];
    const bFeet = form.bed_feet || 100;
    const yPerFt = defaultVar?.expected_yield_per_ft || 1.5;
    const uPrice = defaultVar?.default_price_per_unit || 50;
    const tYield = (bFeet * yPerFt).toFixed(1);
    const estRev = (tYield * uPrice).toFixed(2);

    setForm({
      ...form,
      crop_id: crop.id,
      crop_name: crop.name,
      variety_id: defaultVar?.id || '',
      variety_name: defaultVar?.variety_name || 'Standard',
      harvest_stage: defaultVar?.harvest_stage || 'Mature',
      planting_type: defaultVar?.planting_method || 'Transplant',
      spacing_unit: defaultVar?.spacing_unit || 'mtr',
      in_row_spacing_in: defaultVar?.in_row_spacing_in || 0.35,
      row_spacing_in: defaultVar?.row_spacing_in || 0.5,
      rows_per_bed: defaultVar?.rows_per_bed || 2,
      yield_unit: defaultVar?.yield_unit || 'Ton',
      unit_price: uPrice,
      target_yield: tYield,
      estimated_revenue: estRev
    });
  };

  // Handle Variety select in modal
  const handleVarietySelect = (varietyId) => {
    const crop = crops.find(c => c.id === form.crop_id);
    const v = crop?.varieties?.find(v => v.id === varietyId);
    if (!v) return;
    const bFeet = form.bed_feet || 100;
    const yPerFt = v.expected_yield_per_ft || 1.5;
    const uPrice = v.default_price_per_unit || 50;
    const tYield = (bFeet * yPerFt).toFixed(1);
    const estRev = (tYield * uPrice).toFixed(2);

    setForm({
      ...form,
      variety_id: v.id,
      variety_name: v.variety_name,
      harvest_stage: v.harvest_stage || 'Mature',
      planting_type: v.planting_method || 'Transplant',
      spacing_unit: v.spacing_unit || 'mtr',
      in_row_spacing_in: v.in_row_spacing_in || 0.35,
      row_spacing_in: v.row_spacing_in || 0.5,
      rows_per_bed: v.rows_per_bed || 2,
      yield_unit: v.yield_unit || 'Ton',
      unit_price: uPrice,
      target_yield: tYield,
      estimated_revenue: estRev
    });
  };

  // Handle Location select in modal
  const handleLocationSelect = (locId) => {
    const loc = mapItems.find(m => m.id === parseInt(locId));
    if (!loc) return;
    setForm({
      ...form,
      location_id: loc.id,
      location_name: loc.name,
      gps_lat: parseFloat(loc.gps_lat) || form.gps_lat,
      gps_lng: parseFloat(loc.gps_lng) || form.gps_lng
    });
  };

  // Save / Create planting
  const handleSavePlanting = async (e) => {
    e.preventDefault();
    if (!form.crop_name.trim()) {
      alert('Please select a crop');
      return;
    }

    try {
      setIsSaving(true);
      const url = editingPlanting
        ? `${API_BASE}/plantings/${editingPlanting.id}`
        : `${API_BASE}/plantings`;
      const method = editingPlanting ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingPlanting ? 'Planting updated' : 'Planting added to Crop Plan');
        setShowAddModal(false);
        setEditingPlanting(null);
        fetchData();
      }
    } catch (err) {
      console.error('Error saving planting:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete planting
  const handleDeletePlanting = async (id, name) => {
    if (!window.confirm(`Delete planting "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/plantings/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Planting removed');
        fetchData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Quick Status update
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/plantings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Status updated to ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  // Open modal in edit mode
  const openEditModal = (p) => {
    setEditingPlanting(p);
    setForm({
      crop_id: p.crop_id || '',
      crop_name: p.crop_name || '',
      variety_id: p.variety_id || '',
      variety_name: p.variety_name || '',
      harvest_stage: p.harvest_stage || 'Mature',
      planting_type: p.planting_type || 'Transplant',
      season_year: p.season_year || 2026,
      sow_date: p.sow_date ? p.sow_date.slice(0, 10) : '',
      plant_date: p.plant_date ? p.plant_date.slice(0, 10) : '',
      first_harvest_date: p.first_harvest_date ? p.first_harvest_date.slice(0, 10) : '',
      last_harvest_date: p.last_harvest_date ? p.last_harvest_date.slice(0, 10) : '',
      location_id: p.location_id || '',
      location_name: p.location_name || '',
      bed_ids: Array.isArray(p.bed_ids) ? p.bed_ids : [],
      bed_names: p.bed_names || '',
      bed_feet: p.bed_feet || 100,
      row_feet: p.row_feet || 200,
      rows_per_bed: p.rows_per_bed || 2,
      spacing_unit: p.spacing_unit || 'mtr',
      in_row_spacing_in: p.in_row_spacing_in || 0.35,
      row_spacing_in: p.row_spacing_in || 0.5,
      gps_lat: parseFloat(p.gps_lat) || 12.9716,
      gps_lng: parseFloat(p.gps_lng) || 77.5946,
      target_yield: p.target_yield || 0,
      yield_unit: p.yield_unit || 'Ton',
      unit_price: p.unit_price || 0,
      estimated_revenue: p.estimated_revenue || 0,
      status: p.status || 'planned',
      seed_vendor: p.seed_vendor || '',
      seed_lot: p.seed_lot || '',
      tray_count: p.tray_count || 1,
      notes: p.notes || ''
    });
    setActiveModalTab('basic');
    setShowAddModal(true);
  };

  // Open modal in create mode
  const openCreateModal = () => {
    setEditingPlanting(null);
    const firstCrop = crops[0];
    const firstVar = firstCrop?.varieties?.[0];
    const firstLoc = mapItems[0];

    setForm({
      crop_id: firstCrop?.id || '',
      crop_name: firstCrop?.name || 'Tomatoes',
      variety_id: firstVar?.id || '',
      variety_name: firstVar?.variety_name || 'Roma VF',
      harvest_stage: firstVar?.harvest_stage || 'Mature',
      planting_type: firstVar?.planting_method || 'Transplant',
      season_year: seasonYear,
      sow_date: `${seasonYear}-03-01`,
      plant_date: `${seasonYear}-04-01`,
      first_harvest_date: `${seasonYear}-06-01`,
      last_harvest_date: `${seasonYear}-08-15`,
      location_id: firstLoc?.id || '',
      location_name: firstLoc?.name || '',
      bed_ids: [],
      bed_names: 'Bed 1, Bed 2',
      bed_feet: 100,
      row_feet: 200,
      rows_per_bed: 2,
      spacing_unit: firstVar?.spacing_unit || 'mtr',
      in_row_spacing_in: firstVar?.in_row_spacing_in || 0.35,
      row_spacing_in: firstVar?.row_spacing_in || 0.5,
      gps_lat: parseFloat(firstLoc?.gps_lat) || 12.9716,
      gps_lng: parseFloat(firstLoc?.gps_lng) || 77.5946,
      target_yield: firstVar?.expected_yield_per_acre || 15.0,
      yield_unit: firstVar?.yield_unit || 'Ton',
      unit_price: firstVar?.default_price_per_unit || 25000,
      estimated_revenue: 375000,
      status: 'planned',
      seed_vendor: firstVar?.supplier || "Johnny's Seeds",
      seed_lot: 'LOT-2026-A',
      tray_count: 2,
      notes: 'Standard seasonal planting'
    });
    setActiveModalTab('basic');
    setShowAddModal(true);
  };

  // Leaflet map picker inside modal
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (showAddModal && activeModalTab === 'location' && mapContainerRef.current) {
      setTimeout(() => {
        if (!mapInstanceRef.current && mapContainerRef.current) {
          const map = L.map(mapContainerRef.current).setView([form.gps_lat || 12.9716, form.gps_lng || 77.5946], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(map);

          const marker = L.marker([form.gps_lat || 12.9716, form.gps_lng || 77.5946], { draggable: true }).addTo(map);
          marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            setForm(prev => ({ ...prev, gps_lat: parseFloat(lat.toFixed(6)), gps_lng: parseFloat(lng.toFixed(6)) }));
          });

          map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            setForm(prev => ({ ...prev, gps_lat: parseFloat(lat.toFixed(6)), gps_lng: parseFloat(lng.toFixed(6)) }));
          });

          mapInstanceRef.current = map;
          markerRef.current = marker;
        } else if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          if (markerRef.current) {
            markerRef.current.setLatLng([form.gps_lat, form.gps_lng]);
            mapInstanceRef.current.setView([form.gps_lat, form.gps_lng], 15);
          }
        }
      }, 200);
    }
    return () => {
      if (!showAddModal && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showAddModal, activeModalTab]);

  return (
    <div className="grow-page-container">
      {/* Toast Notification */}
      {notification && (
        <div className="grow-toast">
          <Sparkles size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="grow-header">
        <div className="grow-header-left">
          <div className="grow-badge">GROW MODULE</div>
          <h1 className="grow-title">Crop Plan</h1>
          <p className="grow-subtitle">Plan seasonal succession, bed assignments, 52-week timeline and revenue projections</p>
        </div>

        <div className="grow-header-right">
          <div className="season-kpi-badge">
            <span className="kpi-label">EST. REVENUE {seasonYear}</span>
            <span className="kpi-value">₹{stats ? Number(stats.total_estimated_revenue).toLocaleString() : '0'}</span>
          </div>

          <div className="filter-pill-select" style={{ minWidth: '130px' }}>
            <span className="filter-label">Season:</span>
            <select
              value={seasonYear}
              onChange={(e) => setSeasonYear(parseInt(e.target.value))}
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>Add Planting</span>
          </button>
        </div>
      </div>

      {/* WELCOME BANNER (TEND.COM CPCV STYLE) */}
      {showWelcome && (
        <div className="tend-welcome-banner crop-plan-banner">
          <div className="tend-welcome-content">
            <div className="tend-welcome-title">
              <Sparkles size={18} />
              <span>Plan out your season with Crop Plan - Crop View (CPCV)</span>
            </div>
            <div className="tend-welcome-points">
              <div className="tend-point">
                <div className="tend-point-icon"><Sprout size={14} /></div>
                <span>Add and manage plantings here. All info from your Crop Library growing templates fills in details for you.</span>
              </div>
              <div className="tend-point">
                <div className="tend-point-icon"><Layers size={14} /></div>
                <span>Visualize how plantings fit together in your crop plan and adjust them in real time using the Gantt view.</span>
              </div>
              <div className="tend-point">
                <div className="tend-point-icon"><MapPin size={14} /></div>
                <span>Use Location View to see your crop plan by field structure and bed, linked with Leaflet GPS coordinates.</span>
              </div>
            </div>
          </div>
          <button
            className="tend-welcome-close"
            onClick={() => setShowWelcome(false)}
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* STATS METRIC STRIP */}
      {stats && (
        <div className="crop-stats-strip">
          <div className="stat-card-mini">
            <span className="stat-num">{stats.total_plantings}</span>
            <span className="stat-lbl">Total Plantings</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">{stats.total_crops}</span>
            <span className="stat-lbl">Active Crops</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-num">{stats.total_bed_feet} ft</span>
            <span className="stat-lbl">Allocated Bed-Feet</span>
          </div>
          <div className="stat-card-mini green">
            <span className="stat-num">{stats.in_ground_count}</span>
            <span className="stat-lbl">In Ground</span>
          </div>
          <div className="stat-card-mini orange">
            <span className="stat-num">{stats.harvesting_count}</span>
            <span className="stat-lbl">Harvesting Now</span>
          </div>
        </div>
      )}

      {/* VIEW SWITCHER & TOOLBAR */}
      <div className="grow-toolbar">
        {/* View Mode Tabs */}
        <div className="view-mode-tabs">
          <button
            className={`view-tab-btn ${viewMode === 'crop' ? 'active' : ''}`}
            onClick={() => setViewMode('crop')}
          >
            <Calendar size={15} />
            <span>Crop View (Timeline)</span>
          </button>
          <button
            className={`view-tab-btn ${viewMode === 'location' ? 'active' : ''}`}
            onClick={() => setViewMode('location')}
          >
            <MapPin size={15} />
            <span>Location View</span>
          </button>
          <button
            className={`view-tab-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <Layers size={15} />
            <span>Table View</span>
          </button>
        </div>

        {/* Search */}
        <div className="search-bar-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="grow-search-input"
            placeholder="Search plantings, beds, crops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="grow-filter-group">
          {/* Location Filter */}
          <div className="filter-pill-select">
            <span className="filter-label">Site:</span>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="All">All Locations</option>
              {mapItems.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-pill-select">
            <span className="filter-label">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="in_ground">In Ground</option>
              <option value="harvesting">Harvesting</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <button
            className={`btn btn-sm ${liveEdit ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setLiveEdit(!liveEdit)}
            title="Toggle interactive live quick editing"
          >
            <Edit3 size={13} />
            <span>Live Edit</span>
          </button>
        </div>
      </div>

      {/* ======================================================= */}
      {/* VIEW 1: CROP TIMELINE (GANTT CHART) */}
      {/* ======================================================= */}
      {viewMode === 'crop' && (
        <div className="timeline-container-card">
          <div className="timeline-scroll-area">
            {/* 52-Week Header Row */}
            <div className="timeline-header-grid">
              <div className="timeline-label-col">
                <strong>Planting / Crop Name</strong>
              </div>
              <div className="timeline-weeks-track">
                {MONTHS.map((m) => (
                  <div key={m.name} className="timeline-month-block" style={{ flex: m.weeks.length }}>
                    <div className="timeline-month-title">{m.name} {seasonYear}</div>
                    <div className="timeline-weeks-row">
                      {m.weeks.map(w => (
                        <div key={w} className="timeline-week-cell">
                          {w % 2 === 1 ? `W${w}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plantings Rows */}
            {loading ? (
              <div className="timeline-loading">Loading seasonal crop plan...</div>
            ) : plantings.length === 0 ? (
              <div className="timeline-empty">
                <Sprout size={36} />
                <p>No plantings scheduled for Season {seasonYear}</p>
                <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                  + Add First Planting
                </button>
              </div>
            ) : (
              <div className="timeline-rows-wrap">
                {plantings.map((p) => {
                  const sowWk = getWeekOfYear(p.sow_date);
                  const plantWk = getWeekOfYear(p.plant_date);
                  const harvStartWk = getWeekOfYear(p.first_harvest_date);
                  const harvEndWk = getWeekOfYear(p.last_harvest_date);

                  // Calculate left percentage & width percentage (out of 52 weeks)
                  const sowLeft = ((sowWk - 1) / 52) * 100;
                  const plantLeft = ((plantWk - 1) / 52) * 100;
                  const harvLeft = ((harvStartWk - 1) / 52) * 100;
                  const harvWidth = Math.max(2, ((harvEndWk - harvStartWk) / 52) * 100);
                  const growthWidth = Math.max(2, ((harvStartWk - plantWk) / 52) * 100);

                  return (
                    <div key={p.id} className="timeline-row-item">
                      <div className="timeline-label-col">
                        <div className="timeline-crop-avatar" style={{ backgroundColor: `${p.crop_color || '#2e7d32'}20` }}>
                          <span>{p.crop_icon || '🌱'}</span>
                        </div>
                        <div className="timeline-crop-text">
                          <div className="crop-title-flex">
                            <strong>{p.crop_name}</strong>
                            <span className="variety-sub">({p.variety_name})</span>
                          </div>
                          <div className="crop-location-sub">
                            <span>{p.location_name || 'Unassigned'} • {p.bed_names || `${p.bed_feet} ft`}</span>
                          </div>
                        </div>
                        <div className="timeline-quick-actions">
                          <button onClick={() => openEditModal(p)} title="Edit Planting">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => handleDeletePlanting(p.id, p.crop_name)} title="Delete" className="danger">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* 52-Week Bar Track */}
                      <div className="timeline-track-cell">
                        {/* Background Grid Lines */}
                        <div className="timeline-grid-lines">
                          {Array.from({ length: 52 }).map((_, i) => (
                            <div key={i} className="grid-line-col" />
                          ))}
                        </div>

                        {/* Greenhouse / Nursery Stage Bar */}
                        {p.sow_date && p.plant_date && sowWk < plantWk && (
                          <div
                            className="gantt-bar nursery"
                            style={{
                              left: `${sowLeft}%`,
                              width: `${Math.max(1.8, ((plantWk - sowWk) / 52) * 100)}%`
                            }}
                            title={`Greenhouse Sow: W${sowWk} (${p.sow_date?.slice(0, 10)})`}
                          >
                            <span className="gantt-label">Nursery</span>
                          </div>
                        )}

                        {/* In-Ground Growing Stage Bar */}
                        <div
                          className={`gantt-bar field ${p.status}`}
                          style={{
                            left: `${plantLeft}%`,
                            width: `${growthWidth}%`,
                            backgroundColor: p.crop_color || '#2e7d32'
                          }}
                          title={`Field Planting: W${plantWk} (${p.plant_date?.slice(0, 10)})`}
                        >
                          <span className="gantt-label">{p.variety_name}</span>
                        </div>

                        {/* Harvest Window Bar */}
                        <div
                          className="gantt-bar harvest"
                          style={{
                            left: `${harvLeft}%`,
                            width: `${harvWidth}%`
                          }}
                          title={`Harvest Window: W${harvStartWk} - W${harvEndWk} (${p.target_yield} ${p.yield_unit || 'Ton'})`}
                        >
                          <span className="gantt-label">🌾 {p.target_yield} {p.yield_unit || 'Ton'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline Legend */}
          <div className="timeline-legend-bar">
            <div className="legend-item"><div className="legend-box nursery" /><span>Greenhouse / Nursery Sow</span></div>
            <div className="legend-item"><div className="legend-box field" /><span>Field In-Ground Growth</span></div>
            <div className="legend-item"><div className="legend-box harvest" /><span>Active Harvest Window</span></div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* VIEW 2: LOCATION VIEW */}
      {/* ======================================================= */}
      {viewMode === 'location' && (
        <div className="location-view-grid">
          {mapItems.map((loc) => {
            const locPlantings = plantings.filter(p => p.location_id === loc.id || p.location_name === loc.name);
            return (
              <div key={loc.id} className="location-card-custom">
                <div className="location-card-header">
                  <div className="loc-title-group">
                    <span className="loc-icon">📍</span>
                    <div>
                      <h3>{loc.name}</h3>
                      <span className="loc-type-tag">{loc.item_type} • {loc.beds_count || 4} Beds ({loc.area_sqft || 0} sq ft)</span>
                    </div>
                  </div>
                  <div className="loc-gps-badge">
                    <Compass size={13} />
                    <span>{parseFloat(loc.gps_lat || 12.9716).toFixed(4)}, {parseFloat(loc.gps_lng || 77.5946).toFixed(4)}</span>
                  </div>
                </div>

                <div className="location-card-body">
                  <h4>Active Plantings in this Location ({locPlantings.length})</h4>
                  {locPlantings.length === 0 ? (
                    <div className="loc-empty-state">
                      <p>No crops currently assigned to this field structure</p>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          openCreateModal();
                          setForm(prev => ({
                            ...prev,
                            location_id: loc.id,
                            location_name: loc.name,
                            gps_lat: parseFloat(loc.gps_lat),
                            gps_lng: parseFloat(loc.gps_lng)
                          }));
                        }}
                      >
                        + Assign Crop to this Location
                      </button>
                    </div>
                  ) : (
                    <div className="loc-plantings-list">
                      {locPlantings.map(lp => (
                        <div key={lp.id} className="loc-plant-row">
                          <div className="lp-icon">{lp.crop_icon || '🌱'}</div>
                          <div className="lp-info">
                            <strong>{lp.crop_name} - {lp.variety_name}</strong>
                            <span className="lp-beds">{lp.bed_names || 'All Beds'} • {lp.bed_feet} ft</span>
                          </div>
                          <div className="lp-dates">
                            <span>Harvest: {lp.first_harvest_date?.slice(0, 10)}</span>
                          </div>
                          <span className={`lp-status-pill ${lp.status}`}>{lp.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================= */}
      {/* VIEW 3: TABLE VIEW */}
      {/* ======================================================= */}
      {viewMode === 'table' && (
        <div className="grow-table-card">
          <table className="grow-data-table">
            <thead>
              <tr>
                <th>Planting ID</th>
                <th>Crop & Variety</th>
                <th>Status</th>
                <th>Location & Beds</th>
                <th>Sow Date</th>
                <th>Plant Date</th>
                <th>Harvest Window</th>
                <th>Bed Feet</th>
                <th>Target Yield / Acre (Ton)</th>
                <th>Est. Revenue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plantings.map(p => (
                <tr key={p.id}>
                  <td><code>{p.planting_id || 'PL-2026'}</code></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{p.crop_icon || '🌱'}</span>
                      <strong>{p.crop_name}</strong>
                      <span style={{ color: '#666', fontSize: '12px' }}>({p.variety_name})</span>
                    </div>
                  </td>
                  <td>
                    <select
                      className={`status-select ${p.status}`}
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                    >
                      <option value="planned">Planned</option>
                      <option value="in_ground">In Ground</option>
                      <option value="harvesting">Harvesting</option>
                      <option value="completed">Completed</option>
                    </select>
                  </td>
                  <td>{p.location_name || '—'} ({p.bed_names || `${p.bed_feet} ft`})</td>
                  <td>{p.sow_date ? p.sow_date.slice(0, 10) : '—'}</td>
                  <td>{p.plant_date ? p.plant_date.slice(0, 10) : '—'}</td>
                  <td>{p.first_harvest_date?.slice(0, 10)} to {p.last_harvest_date?.slice(0, 10)}</td>
                  <td>{p.bed_feet} ft</td>
                  <td><strong>{p.target_yield} {p.yield_unit || 'Ton'}</strong></td>
                  <td><strong style={{ color: '#2e7d32' }}>₹{Number(p.estimated_revenue || 0).toLocaleString()}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn-icon" onClick={() => openEditModal(p)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDeletePlanting(p.id, p.crop_name)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL: ADD / EDIT PLANTING */}
      {/* ======================================================= */}
      {showAddModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-content-custom modal-xl">
            <div className="modal-header-custom">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sprout size={20} className="modal-icon" />
                <h3 className="modal-title-custom">
                  {editingPlanting ? `Edit Planting: ${form.crop_name}` : `Add Planting to Season ${seasonYear}`}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="modal-tab-bar">
              <button
                type="button"
                className={`modal-tab-btn ${activeModalTab === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('basic')}
              >
                1. Crop & Variety
              </button>
              <button
                type="button"
                className={`modal-tab-btn ${activeModalTab === 'dates' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('dates')}
              >
                2. Schedule & Dates
              </button>
              <button
                type="button"
                className={`modal-tab-btn ${activeModalTab === 'location' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('location')}
              >
                3. Location, Beds & GPS
              </button>
              <button
                type="button"
                className={`modal-tab-btn ${activeModalTab === 'yield' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('yield')}
              >
                4. Yield & Revenue
              </button>
              <button
                type="button"
                className={`modal-tab-btn ${activeModalTab === 'inputs' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('inputs')}
              >
                5. Seeds & Inputs
              </button>
            </div>

            <form onSubmit={handleSavePlanting}>
              <div className="modal-body-custom">
                {/* TAB 1: BASIC */}
                {activeModalTab === 'basic' && (
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Select Crop from Library *</label>
                      <select
                        className="form-control"
                        value={form.crop_id}
                        onChange={(e) => handleCropSelect(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Crop --</option>
                        {crops.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Variety</label>
                      <select
                        className="form-control"
                        value={form.variety_id}
                        onChange={(e) => handleVarietySelect(e.target.value)}
                      >
                        {crops.find(c => c.id === form.crop_id)?.varieties?.map(v => (
                          <option key={v.id} value={v.id}>{v.variety_name} (DTM: {v.days_to_maturity}d)</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Harvest Stage</label>
                      <select
                        className="form-control"
                        value={form.harvest_stage}
                        onChange={(e) => setForm({ ...form, harvest_stage: e.target.value })}
                      >
                        <option value="Mature">Mature Full Size</option>
                        <option value="Baby">Baby Greens / Fruit</option>
                        <option value="Bunch">Bunch</option>
                        <option value="Microgreen">Microgreen</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Planting Method(s)</label>
                      <PlantingMethodSelect
                        value={form.planting_type || form.planting_method || 'Transplant'}
                        onChange={(arr, str) => setForm({ ...form, planting_type: str, planting_method: str })}
                        placeholder="Select planting method(s)..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Season Year</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.season_year}
                        onChange={(e) => setForm({ ...form, season_year: parseInt(e.target.value) || 2026 })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Initial Status</label>
                      <select
                        className="form-control"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="planned">Planned</option>
                        <option value="in_ground">In Ground</option>
                        <option value="harvesting">Harvesting</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TAB 2: DATES */}
                {activeModalTab === 'dates' && (
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Greenhouse / Nursery Sow Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.sow_date}
                        onChange={(e) => setForm({ ...form, sow_date: e.target.value })}
                      />
                      <small className="form-hint">Tray seeding date in nursery</small>
                    </div>

                    <div className="form-group">
                      <label>Field Planting / Transplant Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={form.plant_date}
                        onChange={(e) => setForm({ ...form, plant_date: e.target.value })}
                      />
                      <small className="form-hint">Date transplanted into field or direct seeded</small>
                    </div>

                    <div className="form-group">
                      <label>First Harvest Target Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={form.first_harvest_date}
                        onChange={(e) => setForm({ ...form, first_harvest_date: e.target.value })}
                      />
                      <small className="form-hint">Estimated start of harvest window</small>
                    </div>

                    <div className="form-group">
                      <label>Last Harvest Target Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.last_harvest_date}
                        onChange={(e) => setForm({ ...form, last_harvest_date: e.target.value })}
                      />
                      <small className="form-hint">Expected completion of crop yield</small>
                    </div>
                  </div>
                )}

                {/* TAB 3: LOCATION & GPS */}
                {activeModalTab === 'location' && (
                  <div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Farm Map Location / Structure</label>
                        <select
                          className="form-control"
                          value={form.location_id}
                          onChange={(e) => handleLocationSelect(e.target.value)}
                        >
                          <option value="">-- Choose Farm Structure --</option>
                          {mapItems.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.item_type})</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Bed Names / Numbers</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Bed 1, Bed 2, Beds 4-6"
                          value={form.bed_names}
                          onChange={(e) => setForm({ ...form, bed_names: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Total Bed Feet (ft)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={form.bed_feet}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const rFeet = val * (form.rows_per_bed || 2);
                            setForm({ ...form, bed_feet: val, row_feet: rFeet });
                          }}
                        />
                      </div>

                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ margin: 0 }}>Rows Per Bed & Spacing</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Unit:</span>
                            <select
                              value={form.spacing_unit || 'mtr'}
                              onChange={(e) => setForm({ ...form, spacing_unit: e.target.value })}
                              style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                            >
                              <option value="mtr">Meter (mtr)</option>
                              <option value="ft">Feet (ft)</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Rows/Bed</span>
                            <input
                              type="number"
                              className="form-control"
                              placeholder="Rows"
                              value={form.rows_per_bed}
                              onChange={(e) => setForm({ ...form, rows_per_bed: parseInt(e.target.value) || 2 })}
                            />
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>In-Row ({form.spacing_unit || 'mtr'})</span>
                            <input
                              type="number"
                              step="0.05"
                              className="form-control"
                              placeholder={`In-Row (${form.spacing_unit || 'mtr'})`}
                              value={form.in_row_spacing_in}
                              onChange={(e) => setForm({ ...form, in_row_spacing_in: parseFloat(e.target.value) || 0.35 })}
                            />
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Row Spacing ({form.spacing_unit || 'mtr'})</span>
                            <input
                              type="number"
                              step="0.05"
                              className="form-control"
                              placeholder={`Row (${form.spacing_unit || 'mtr'})`}
                              value={form.row_spacing_in || 0.5}
                              onChange={(e) => setForm({ ...form, row_spacing_in: parseFloat(e.target.value) || 0.5 })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>GPS Latitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          className="form-control"
                          value={form.gps_lat}
                          onChange={(e) => setForm({ ...form, gps_lat: parseFloat(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label>GPS Longitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          className="form-control"
                          value={form.gps_lng}
                          onChange={(e) => setForm({ ...form, gps_lng: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                        📍 Interactive Leaflet Map Coordinates & Pin
                      </label>
                      <div
                        ref={mapContainerRef}
                        style={{ height: '220px', width: '100%', borderRadius: '8px', border: '1px solid #ccc' }}
                      />
                      <small style={{ color: '#666', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        Click on map or drag pin to adjust planting coordinates precisely.
                      </small>
                    </div>
                  </div>
                )}

                {/* TAB 4: YIELD & REVENUE */}
                {activeModalTab === 'yield' && (
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Target Harvest Yield / Acre (Ton)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="form-control"
                        value={form.target_yield}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const rev = (val * (form.unit_price || 0)).toFixed(2);
                          setForm({ ...form, target_yield: val, estimated_revenue: rev, expected_yield_per_acre: val });
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Yield Unit</label>
                      <select
                        className="form-control"
                        value={form.yield_unit || 'Ton'}
                        onChange={(e) => setForm({ ...form, yield_unit: e.target.value })}
                      >
                        <option value="Ton">Ton</option>
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                        <option value="bunches">bunches</option>
                        <option value="heads">heads</option>
                        <option value="crates">crates</option>
                        <option value="ears">ears</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Target Price per Ton (₹)</label>
                      <input
                        type="number"
                        step="1"
                        className="form-control"
                        value={form.unit_price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const rev = (val * (form.target_yield || 0)).toFixed(2);
                          setForm({ ...form, unit_price: val, estimated_revenue: rev });
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Projected Estimated Revenue (₹)</label>
                      <div className="revenue-preview-box">
                        ₹ {Number(form.estimated_revenue || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: INPUTS */}
                {activeModalTab === 'inputs' && (
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Seed Vendor</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Johnny's Seeds, Bejo"
                        value={form.seed_vendor}
                        onChange={(e) => setForm({ ...form, seed_vendor: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Seed Lot Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. LOT-2026-X4"
                        value={form.seed_lot}
                        onChange={(e) => setForm({ ...form, seed_lot: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Tray Count (for Nursery)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.tray_count}
                        onChange={(e) => setForm({ ...form, tray_count: parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Notes & Field Instructions</label>
                      <textarea
                        rows={3}
                        className="form-control"
                        placeholder="Special handling, pest netting, shade cloth requirement..."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer-custom">
                <div style={{ marginRight: 'auto', display: 'flex', gap: '8px' }}>
                  {activeModalTab !== 'basic' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const tabs = ['basic', 'dates', 'location', 'yield', 'inputs'];
                        const idx = tabs.indexOf(activeModalTab);
                        if (idx > 0) setActiveModalTab(tabs[idx - 1]);
                      }}
                    >
                      ← Back
                    </button>
                  )}
                  {activeModalTab !== 'inputs' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const tabs = ['basic', 'dates', 'location', 'yield', 'inputs'];
                        const idx = tabs.indexOf(activeModalTab);
                        if (idx < tabs.length - 1) setActiveModalTab(tabs[idx + 1]);
                      }}
                    >
                      Next →
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : editingPlanting ? 'Update Planting' : 'Save Planting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
