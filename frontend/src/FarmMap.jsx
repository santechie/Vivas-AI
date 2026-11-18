import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

const LOCATION_LEVELS = [
  { value: 'facility', label: 'Facility / Overall Farm', icon: '🏢' },
  { value: 'field',    label: 'Field / Parcel / Land', icon: '🌾' },
  { value: 'block',    label: 'Block / Sub-Zone',      icon: '📐' },
  { value: 'bed',      label: 'Bed / Row / Bench',     icon: '🌱' },
];

const ITEM_TYPES = [
  { value: 'Field',        label: 'Outdoor Field / Plot', icon: '🌾', color: '#2e7d32' },
  { value: 'Greenhouse',   label: 'Greenhouse',           icon: '🏠', color: '#1565c0' },
  { value: 'High Tunnel',  label: 'High Tunnel / Hoop',   icon: '⛺', color: '#6a1b9a' },
  { value: 'Outdoor Bed',  label: 'Outdoor Bed / Row',    icon: '🌱', color: '#e65100' },
  { value: 'Hydroponics',  label: 'Hydroponic System',    icon: '💧', color: '#0284c7' },
  { value: 'Zone',         label: 'Zone / Nursery',       icon: '📍', color: '#f57f17' },
  { value: 'Building',     label: 'Building / Packhouse', icon: '🏢', color: '#37474f' },
  { value: 'Water Source', label: 'Water Source / Well',  icon: '🌊', color: '#00838f' },
  { value: 'Storage',      label: 'Storage / Barn',       icon: '📦', color: '#4e342e' },
  { value: 'Other',        label: 'Other Infrastructure', icon: '📌', color: '#455a64' },
];

const FIELD_TYPES = ['Open Field', 'Controlled Environment', 'Semi-Controlled', 'Raised Bed', 'Container', 'Hydroponic', 'Aquaponic', 'Other'];
const IRRIGATION_TYPES = ['Drip Irrigation', 'Sprinkler', 'Flood', 'Furrow', 'Sub-surface', 'Manual Watering', 'None'];
const SOIL_TYPES = ['Loam', 'Sandy Loam', 'Clay Loam', 'Silt Loam', 'Sandy Clay', 'Peat', 'Chalky', 'Hydroponic Substrate'];

const DRAWING_SHAPES = [
  { value: 'polygon',   label: '📐 Polygon (Custom Boundary)', icon: '✏️' },
  { value: 'rectangle', label: '⬜ Rectangle Bounding Box',    icon: '⏹️' },
  { value: 'marker',    label: '📍 Point Marker',               icon: '📌' },
];

const defaultForm = {
  name: '', code: '', location_level: 'field', location_type: 'Field',
  parent_id: '', item_type: 'Field', shape: 'polygon', color: '#2e7d32',
  description: '', gps_lat: '', gps_lng: '', orientation_deg: 0,
  width_ft: '', length_ft: '', usable_area_sqft: '',
  beds_count: 0, bed_width_ft: 3, bed_length_ft: 50, bed_spacing_ft: 1.5,
  field_type: 'Open Field', irrigation_type: 'Drip Irrigation', soil_type: 'Loam',
  crop_zone: '', notes: '', geojson: null
};

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper: Calculate polygon area in square feet from lat/lng array
function calculatePolygonAreaSqFt(latLngs) {
  if (!latLngs || latLngs.length < 3) return 0;
  const radius = 6378137; // Earth radius in meters
  let areaM2 = 0;
  for (let i = 0; i < latLngs.length; i++) {
    const p1 = latLngs[i];
    const p2 = latLngs[(i + 1) % latLngs.length];
    const rad = Math.PI / 180;
    areaM2 += (p2[1] * rad - p1[1] * rad) * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
  }
  areaM2 = Math.abs(areaM2 * radius * radius / 2);
  return areaM2 * 10.7639; // Convert sq meters to sq ft
}

// ── Leaflet Interactive Map View ──────────────────────────────────
function FarmMapView({ items, selectedId, onSelectItem, mapLayer, drawMode, onPointsDrawn, activeDrawPoints }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tileLayerRef = useRef(null);
  const layerGroup = useRef(null);
  const drawLayerGroup = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (mapInstance.current) return;
    const hasCoords = items.filter(i => i.gps_lat && i.gps_lng);
    const defLat = hasCoords[0]?.gps_lat ? parseFloat(hasCoords[0].gps_lat) : 20.5937;
    const defLng = hasCoords[0]?.gps_lng ? parseFloat(hasCoords[0].gps_lng) : 78.9629;

    mapInstance.current = L.map(mapRef.current, {
      center: [defLat, defLng],
      zoom: hasCoords.length ? 17 : 6,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(mapInstance.current);

    layerGroup.current = L.layerGroup().addTo(mapInstance.current);
    drawLayerGroup.current = L.layerGroup().addTo(mapInstance.current);
  }, []);

  // Handle Map Tile Switching (Standard vs Satellite)
  useEffect(() => {
    if (!mapInstance.current) return;
    if (tileLayerRef.current) {
      mapInstance.current.removeLayer(tileLayerRef.current);
    }
    if (mapLayer === 'satellite') {
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
        maxZoom: 20
      }).addTo(mapInstance.current);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 20
      }).addTo(mapInstance.current);
    }
  }, [mapLayer]);

  // Handle Interactive Draw Clicks on Map Canvas
  useEffect(() => {
    if (!mapInstance.current) return;
    const handleMapClick = (e) => {
      if (!drawMode) return;
      const { lat, lng } = e.latlng;
      if (onPointsDrawn) {
        onPointsDrawn(prev => [...prev, [lat, lng]]);
      }
    };

    const map = mapInstance.current;
    if (drawMode) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getContainer().style.cursor = '';
      map.off('click', handleMapClick);
    }
    return () => {
      map.off('click', handleMapClick);
    };
  }, [drawMode, onPointsDrawn]);

  // Render Active Drawing Rubber-Band Preview
  useEffect(() => {
    if (!drawLayerGroup.current) return;
    drawLayerGroup.current.clearLayers();
    if (!activeDrawPoints || activeDrawPoints.length === 0) return;

    activeDrawPoints.forEach(([lat, lng], idx) => {
      L.circleMarker([lat, lng], {
        radius: 6, color: '#ff5722', fillColor: '#ffffff', fillOpacity: 1, weight: 2
      }).bindTooltip(`Pt ${idx + 1}`, { permanent: true, direction: 'top' }).addTo(drawLayerGroup.current);
    });

    if (activeDrawPoints.length >= 2) {
      if (drawMode === 'rectangle' && activeDrawPoints.length === 2) {
        const bounds = [activeDrawPoints[0], activeDrawPoints[1]];
        L.rectangle(bounds, { color: '#ff5722', weight: 3, dashArray: '5, 5', fillColor: '#ff5722', fillOpacity: 0.2 }).addTo(drawLayerGroup.current);
      } else {
        L.polyline(activeDrawPoints, { color: '#ff5722', weight: 3, dashArray: '5, 5' }).addTo(drawLayerGroup.current);
        if (activeDrawPoints.length >= 3) {
          L.polygon(activeDrawPoints, { color: '#ff5722', weight: 2, fillColor: '#ff5722', fillOpacity: 0.25 }).addTo(drawLayerGroup.current);
        }
      }
    }
  }, [activeDrawPoints, drawMode]);

  // Render Saved Farm Location Items & Beds
  useEffect(() => {
    if (!mapInstance.current || !layerGroup.current) return;
    layerGroup.current.clearLayers();

    const validItems = items.filter(i => (i.gps_lat && i.gps_lng) || (i.geojson && i.geojson.coordinates));
    
    validItems.forEach(item => {
      const isSel = item.id === selectedId;
      const tc = ITEM_TYPES.find(t => t.value === item.item_type) || ITEM_TYPES[0];
      const color = item.color || tc.color;
      let layer;

      // 1. Render GeoJSON if present
      if (item.geojson && item.geojson.type === 'Polygon') {
        const coords = item.geojson.coordinates[0].map(c => [c[1], c[0]]); // Swap [lng,lat] -> [lat,lng]
        layer = L.polygon(coords, {
          color: isSel ? '#ffc107' : color,
          weight: isSel ? 4 : 2,
          fillColor: color,
          fillOpacity: isSel ? 0.6 : 0.35
        });
      }
      // 2. Render Point Marker
      else if (item.shape === 'marker') {
        const lat = parseFloat(item.gps_lat), lng = parseFloat(item.gps_lng);
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};color:#fff;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 8px rgba(0,0,0,0.4);border:${isSel ? '3px solid #ffc107' : '2px solid #ffffff'};">${tc.icon}</div>`,
          iconSize: [38, 38], iconAnchor: [19, 19]
        });
        layer = L.marker([lat, lng], { icon });
      }
      // 3. Fallback Bounding Box Rectangle
      else if (item.gps_lat && item.gps_lng) {
        const lat = parseFloat(item.gps_lat), lng = parseFloat(item.gps_lng);
        const w = item.width_ft ? parseFloat(item.width_ft) * 0.00000899 : 0.0002;
        const h = item.length_ft ? parseFloat(item.length_ft) * 0.00000899 : 0.0003;
        const bounds = [[lat - h / 2, lng - w / 2], [lat + h / 2, lng + w / 2]];
        layer = L.rectangle(bounds, {
          color: isSel ? '#ffc107' : color,
          weight: isSel ? 4 : 2,
          fillColor: color,
          fillOpacity: isSel ? 0.6 : 0.35
        });
      }

      if (layer) {
        layer.addTo(layerGroup.current);
        const areaText = item.area_sqft ? `<br/>Area: <b>${Math.round(item.area_sqft).toLocaleString()} sq ft</b>` : '';
        const bedText = item.beds_count > 0 ? `<br/>Beds: <b>${item.beds_count} beds</b>` : '';
        layer.bindTooltip(`<b>${tc.icon} ${item.name}</b> (${item.location_level || 'Field'})${areaText}${bedText}`, {
          permanent: false, direction: 'top'
        });
        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectItem(item);
        });
      }

      // Render Nested Beds if present
      if (Array.isArray(item.beds) && item.beds.length > 0 && item.gps_lat && item.gps_lng) {
        const lat = parseFloat(item.gps_lat), lng = parseFloat(item.gps_lng);
        const totalW = item.width_ft ? parseFloat(item.width_ft) * 0.00000899 : 0.0002;
        const totalH = item.length_ft ? parseFloat(item.length_ft) * 0.00000899 : 0.0003;
        const bedCount = item.beds.length;
        const step = totalW / (bedCount + 1);

        item.beds.forEach((bed, bIdx) => {
          const bedLng = (lng - totalW / 2) + step * (bIdx + 1);
          const bedWidthSpan = step * 0.7;
          const bedBounds = [[lat - totalH / 2 * 0.9, bedLng - bedWidthSpan / 2], [lat + totalH / 2 * 0.9, bedLng + bedWidthSpan / 2]];
          const isPlanted = bed.status === 'planted';
          const bColor = isPlanted ? '#15803d' : '#a1a1aa';
          
          const bedLayer = L.rectangle(bedBounds, {
            color: bColor, weight: 1, fillColor: bColor, fillOpacity: isPlanted ? 0.5 : 0.2
          });
          bedLayer.addTo(layerGroup.current);
          bedLayer.bindTooltip(`🌱 ${bed.bed_name}<br/>Status: <b>${bed.status}</b>${bed.current_crop ? `<br/>Crop: ${bed.current_crop}` : ''}`, { direction: 'top' });
        });
      }
    });

    if (selectedId) {
      const selItem = validItems.find(i => i.id === selectedId);
      if (selItem && selItem.gps_lat && selItem.gps_lng) {
        mapInstance.current.setView([parseFloat(selItem.gps_lat), parseFloat(selItem.gps_lng)], 18, { animate: true });
      }
    }
  }, [items, selectedId]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Add / Edit Location Modal ─────────────────────────────────────
function AddItemModal({ mode, editData, parentOptions, onClose, onSaved, activeDrawPoints, setActiveDrawPoints, setDrawMode, drawMode }) {
  const [form, setForm] = useState(mode === 'edit' && editData ? { ...defaultForm, ...editData } : { ...defaultForm });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [regenerateBeds, setRegenerateBeds] = useState(false);

  // Sync Form values with Map Canvas Draw Points
  useEffect(() => {
    if (!activeDrawPoints || activeDrawPoints.length === 0) return;
    if (activeDrawPoints.length === 1) {
      setForm(p => ({
        ...p,
        gps_lat: activeDrawPoints[0][0].toFixed(8),
        gps_lng: activeDrawPoints[0][1].toFixed(8)
      }));
    } else if (activeDrawPoints.length >= 3 || (form.shape === 'rectangle' && activeDrawPoints.length === 2)) {
      const lats = activeDrawPoints.map(p => p[0]);
      const lngs = activeDrawPoints.map(p => p[1]);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      let calculatedArea = 0;
      let geojsonObj = null;

      if (form.shape === 'rectangle' && activeDrawPoints.length === 2) {
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        const polygonCoords = [[
          [minLng, minLat], [maxLng, minLat], [maxLng, maxLat], [minLng, maxLat], [minLng, minLat]
        ]];
        geojsonObj = { type: 'Polygon', coordinates: polygonCoords };
        calculatedArea = calculatePolygonAreaSqFt(polygonCoords[0].map(c => [c[1], c[0]]));
      } else {
        const closedPoints = [...activeDrawPoints, activeDrawPoints[0]];
        const polygonCoords = [closedPoints.map(p => [p[1], p[0]])];
        geojsonObj = { type: 'Polygon', coordinates: polygonCoords };
        calculatedArea = calculatePolygonAreaSqFt(activeDrawPoints);
      }

      setForm(p => ({
        ...p,
        gps_lat: centerLat.toFixed(8),
        gps_lng: centerLng.toFixed(8),
        geojson: geojsonObj,
        usable_area_sqft: calculatedArea ? Math.round(calculatedArea) : p.usable_area_sqft
      }));
    }
  }, [activeDrawPoints, form.shape]);

  const set = (k, v) => {
    setErrors(p => ({ ...p, [k]: '' }));
    if (k === 'item_type') {
      const conf = ITEM_TYPES.find(t => t.value === v);
      setForm(p => ({ ...p, item_type: v, color: conf?.color || p.color }));
    } else {
      setForm(p => ({ ...p, [k]: v }));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Location Name is required';
    if (!form.item_type) e.item_type = 'Location Type is required';
    if (form.gps_lat !== '' && (isNaN(parseFloat(form.gps_lat)) || parseFloat(form.gps_lat) < -90 || parseFloat(form.gps_lat) > 90)) {
      e.gps_lat = 'Latitude must be between -90 and 90';
    }
    if (form.gps_lng !== '' && (isNaN(parseFloat(form.gps_lng)) || parseFloat(form.gps_lng) < -180 || parseFloat(form.gps_lng) > 180)) {
      e.gps_lng = 'Longitude must be between -180 and 180';
    }
    ['width_ft', 'length_ft', 'beds_count', 'bed_width_ft', 'bed_length_ft', 'bed_spacing_ft'].forEach(f => {
      if (form[f] !== '' && form[f] !== null && (isNaN(parseFloat(form[f])) || parseFloat(form[f]) < 0)) {
        e[f] = 'Must be a valid positive number';
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGPS = () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('gps_lat', pos.coords.latitude.toFixed(8));
        set('gps_lng', pos.coords.longitude.toFixed(8));
        setGpsLoading(false);
      },
      () => {
        alert('Unable to retrieve your current location');
        setGpsLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { setActiveTab('basic'); return; }
    setSaving(true);
    try {
      const url = mode === 'edit' ? `${API_BASE}/farm-map/items/${editData.id}` : `${API_BASE}/farm-map/items`;
      const payload = { ...form, regenerate_beds: regenerateBeds };
      const res = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        onSaved(data.data, mode);
        onClose();
      } else {
        alert('Save Error: ' + (data.message || 'Could not save location'));
      }
    } catch (err) {
      alert('Network Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const TABS = ['basic', 'drawing', 'beds', 'details'];
  const TAB_LABELS = { basic: '1. Basic & Level', drawing: '2. Canvas & GPS', beds: '3. Bed Subdivisions', details: '4. Soil & Irrigation' };
  const typeConf = ITEM_TYPES.find(t => t.value === form.item_type) || ITEM_TYPES[0];
  const calculatedArea = form.width_ft && form.length_ft ? (parseFloat(form.width_ft) * parseFloat(form.length_ft)).toFixed(0) : null;

  return (
    <div
      className="fm-modal-overlay"
      style={{
        zIndex: 99999,
        pointerEvents: drawMode ? 'none' : 'auto',
        background: drawMode ? 'transparent' : 'rgba(0, 0, 0, 0.45)',
        backdropFilter: drawMode ? 'none' : 'blur(3px)',
        alignItems: drawMode ? 'flex-start' : 'center',
        justifyContent: drawMode ? 'flex-end' : 'center',
        padding: drawMode ? '20px' : '0'
      }}
      onClick={onClose}
    >
      <div
        className="fm-modal"
        style={{
          maxWidth: drawMode ? '480px' : '680px',
          width: '100%',
          pointerEvents: 'auto',
          boxShadow: drawMode ? '0 10px 30px rgba(0,0,0,0.3)' : '0 12px 48px rgba(0,0,0,0.2)',
          border: drawMode ? '2px solid #16a34a' : 'none'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="fm-modal-header">
          <div className="fm-modal-title-row">
            <span className="fm-modal-icon">{typeConf.icon || '📌'}</span>
            <div>
              <h2 className="fm-modal-title">{mode === 'edit' ? 'Edit Location' : 'Add New Location'}</h2>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {drawMode ? `✏️ Active Draw Mode: ${drawMode.toUpperCase()}` : 'Tend.com Interactive Spatial Location Builder'}
              </div>
            </div>
          </div>
          <button type="button" className="fm-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="fm-modal-tabs">
          {TABS.map(t => (
            <button key={t} type="button" className={`fm-modal-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="fm-modal-body">

            {/* TAB 1: BASIC INFO & HIERARCHY */}
            {activeTab === 'basic' && (
              <div className="fm-form-grid">
                <div>
                  <label className="fm-label">Location Hierarchy Level *</label>
                  <select className="fm-select" value={form.location_level} onChange={e => set('location_level', e.target.value)}>
                    {LOCATION_LEVELS.map(l => <option key={l.value} value={l.value}>{l.icon} {l.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="fm-label">Parent Location (Nesting)</label>
                  <select className="fm-select" value={form.parent_id || ''} onChange={e => set('parent_id', e.target.value)}>
                    <option value="">-- Root Level (No Parent) --</option>
                    {(parentOptions || []).filter(p => p.id !== editData?.id).map(p => (
                      <option key={p.id} value={p.id}>📂 {p.name} ({p.location_level || 'field'})</option>
                    ))}
                  </select>
                </div>

                <div className="fm-form-full">
                  <label className="fm-label">Location Name *</label>
                  <input className={`fm-input ${errors.name ? 'fm-input-err' : ''}`} placeholder="e.g. North Field - Plot A"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                  {errors.name && <span className="fm-err">{errors.name}</span>}
                </div>

                <div>
                  <label className="fm-label">Location Code / Tag</label>
                  <input className="fm-input" placeholder="e.g. FLD-01" value={form.code || ''} onChange={e => set('code', e.target.value)} />
                </div>

                <div>
                  <label className="fm-label">Facility / Asset Type *</label>
                  <select className={`fm-select ${errors.item_type ? 'fm-input-err' : ''}`} value={form.item_type} onChange={e => set('item_type', e.target.value)}>
                    {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>

                <div className="fm-form-full">
                  <label className="fm-label">Map Fill Color</label>
                  <div className="fm-color-row">
                    <input type="color" className="fm-color-picker" value={form.color} onChange={e => set('color', e.target.value)} />
                    <span className="fm-color-label">{form.color}</span>
                    <div className="fm-color-swatches">
                      {ITEM_TYPES.slice(0, 8).map(t => (
                        <div key={t.value} className="fm-swatch" title={t.label}
                          style={{ background: t.color, outline: form.color === t.color ? '3px solid #111' : 'none' }}
                          onClick={() => set('color', t.color)} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="fm-form-full">
                  <label className="fm-label">Description / Summary</label>
                  <textarea className="fm-textarea" rows={2} placeholder="Brief operational summary..."
                    value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
              </div>
            )}

            {/* TAB 2: CANVAS DRAWING & GPS */}
            {activeTab === 'drawing' && (
              <div className="fm-form-grid">
                <div className="fm-form-full" style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label className="fm-label" style={{ marginBottom: '8px', color: '#15803d', fontWeight: 700 }}>
                    🗺️ Interactive Canvas Draw Tool
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    {DRAWING_SHAPES.map(s => (
                      <button
                        key={s.value} type="button"
                        onClick={() => {
                          set('shape', s.value);
                          setDrawMode(s.value);
                        }}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1',
                          backgroundColor: form.shape === s.value ? '#15803d' : '#ffffff',
                          color: form.shape === s.value ? '#ffffff' : '#334155',
                          fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                        }}
                      >
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>

                  {drawMode ? (
                    <div style={{ background: '#dcfce7', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>👉 <b>Draw Mode Active:</b> Click on the map canvas to place boundary points ({activeDrawPoints.length} points set).</span>
                      <button type="button" onClick={() => setActiveDrawPoints([])} style={{ border: 'none', background: '#bbf7d0', color: '#166534', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                        Clear Points
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDrawMode(form.shape || 'polygon')}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                    >
                      🎯 Start Click-to-Draw on Map Canvas
                    </button>
                  )}
                </div>

                <div>
                  <label className="fm-label">GPS Latitude *</label>
                  <input type="number" step="0.00000001" className={`fm-input fm-mono ${errors.gps_lat ? 'fm-input-err' : ''}`}
                    placeholder="e.g. 12.97160000" value={form.gps_lat} onChange={e => set('gps_lat', e.target.value)} />
                  {errors.gps_lat && <span className="fm-err">{errors.gps_lat}</span>}
                </div>

                <div>
                  <label className="fm-label">GPS Longitude *</label>
                  <input type="number" step="0.00000001" className={`fm-input fm-mono ${errors.gps_lng ? 'fm-input-err' : ''}`}
                    placeholder="e.g. 77.59460000" value={form.gps_lng} onChange={e => set('gps_lng', e.target.value)} />
                  {errors.gps_lng && <span className="fm-err">{errors.gps_lng}</span>}
                </div>

                <div className="fm-form-full">
                  <button type="button" className="fm-gps-btn" onClick={handleGPS} disabled={gpsLoading}>
                    {gpsLoading ? '⏳ Acquiring GPS Location...' : '📍 Capture Current Device GPS Position'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: AUTOMATED BED SUBDIVISIONS */}
            {activeTab === 'beds' && (
              <div className="fm-form-grid">
                <div className="fm-form-full" style={{ background: '#f1f5f9', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                    🌱 Tend.com Automated Parallel Bed Grid Generator
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Subdivide this field/block into parallel beds with uniform walkways & spacing.
                  </div>
                </div>

                <div>
                  <label className="fm-label">Total Beds Count</label>
                  <input type="number" min="0" step="1" className="fm-input" placeholder="e.g. 10"
                    value={form.beds_count} onChange={e => set('beds_count', e.target.value)} />
                </div>

                <div>
                  <label className="fm-label">Bed Width (ft)</label>
                  <input type="number" min="0" step="0.5" className="fm-input" placeholder="e.g. 3"
                    value={form.bed_width_ft} onChange={e => set('bed_width_ft', e.target.value)} />
                </div>

                <div>
                  <label className="fm-label">Bed Length (ft)</label>
                  <input type="number" min="0" step="1" className="fm-input" placeholder="e.g. 50"
                    value={form.bed_length_ft} onChange={e => set('bed_length_ft', e.target.value)} />
                </div>

                <div>
                  <label className="fm-label">Path Spacing (ft)</label>
                  <input type="number" min="0" step="0.5" className="fm-input" placeholder="e.g. 1.5"
                    value={form.bed_spacing_ft} onChange={e => set('bed_spacing_ft', e.target.value)} />
                </div>

                <div>
                  <label className="fm-label">Bed Orientation Angle (°)</label>
                  <input type="number" min="0" max="360" step="5" className="fm-input" placeholder="0° = North-South"
                    value={form.orientation_deg} onChange={e => set('orientation_deg', e.target.value)} />
                </div>

                <div>
                  <label className="fm-label">Field Width (ft)</label>
                  <input type="number" min="0" step="1" className="fm-input" placeholder="e.g. 60"
                    value={form.width_ft} onChange={e => set('width_ft', e.target.value)} />
                </div>

                <div>
                  <label className="fm-label">Field Length (ft)</label>
                  <input type="number" min="0" step="1" className="fm-input" placeholder="e.g. 100"
                    value={form.length_ft} onChange={e => set('length_ft', e.target.value)} />
                </div>

                {calculatedArea && (
                  <div className="fm-form-full">
                    <div className="fm-area-badge">
                      📐 Calculated Spatial Area: <strong>{parseInt(calculatedArea).toLocaleString()} sq ft</strong> ({(parseInt(calculatedArea) / 43560).toFixed(3)} Acres)
                    </div>
                  </div>
                )}

                {mode === 'edit' && (
                  <div className="fm-form-full" style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={regenerateBeds} onChange={e => setRegenerateBeds(e.target.checked)} />
                      <span>Re-calculate & Regenerate nested sub-beds to match updated dimensions</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SOIL & IRRIGATION DETAILS */}
            {activeTab === 'details' && (
              <div className="fm-form-grid">
                <div>
                  <label className="fm-label">Field / Zone Category</label>
                  <select className="fm-select" value={form.field_type} onChange={e => set('field_type', e.target.value)}>
                    {FIELD_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="fm-label">Irrigation Type</label>
                  <select className="fm-select" value={form.irrigation_type} onChange={e => set('irrigation_type', e.target.value)}>
                    {IRRIGATION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="fm-label">Soil Type</label>
                  <select className="fm-select" value={form.soil_type} onChange={e => set('soil_type', e.target.value)}>
                    {SOIL_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="fm-label">Crop Rotation Zone</label>
                  <input className="fm-input" placeholder="e.g. Zone A - Solanaceae" value={form.crop_zone} onChange={e => set('crop_zone', e.target.value)} />
                </div>

                <div className="fm-form-full">
                  <label className="fm-label">Field & Soil Notes</label>
                  <textarea className="fm-textarea" rows={3} placeholder="Additional soil test results or notes..."
                    value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            )}

          </div>

          <div className="fm-modal-footer">
            <button type="button" className="fm-btn-cancel" onClick={onClose}>Cancel</button>
            <div className="fm-modal-footer-right">
              {TABS.indexOf(activeTab) > 0 && (
                <button type="button" className="fm-btn-prev" onClick={() => setActiveTab(TABS[TABS.indexOf(activeTab) - 1])}>← Back</button>
              )}
              {TABS.indexOf(activeTab) < TABS.length - 1 ? (
                <button type="button" className="fm-btn-next" onClick={() => setActiveTab(TABS[TABS.indexOf(activeTab) + 1])}>Next →</button>
              ) : (
                <button type="submit" className="fm-btn-save" disabled={saving}>
                  {saving ? '⏳ Saving Location...' : (mode === 'edit' ? '✓ Update Location' : '+ Save Location')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main FarmMap Page Component ───────────────────────────────────
export default function FarmMapScreen() {
  const [items, setItems] = useState([]);
  const [hierarchyTree, setHierarchyTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [mapLayer, setMapLayer] = useState('satellite'); // 'standard' vs 'satellite'
  const [viewMode, setViewMode] = useState('tree'); // 'tree' vs 'list'

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editData, setEditData] = useState(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Map Drawing States
  const [drawMode, setDrawMode] = useState(null); // null, 'polygon', 'rectangle', 'marker'
  const [activeDrawPoints, setActiveDrawPoints] = useState([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [resItems, resTree] = await Promise.all([
        fetch(`${API_BASE}/farm-map/items`),
        fetch(`${API_BASE}/farm-map/tree`)
      ]);
      const dataItems = await resItems.json();
      const dataTree = await resTree.json();
      if (dataItems.success) setItems(dataItems.data);
      if (dataTree.success) setHierarchyTree(dataTree.data);
    } catch (err) {
      console.error('Error fetching farm map items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenAdd = (typePreset = null) => {
    const conf = typePreset ? ITEM_TYPES.find(t => t.value === typePreset) : null;
    setEditData(typePreset ? { ...defaultForm, item_type: typePreset, color: conf?.color || '#2e7d32' } : null);
    setModalMode('add');
    setAddMenuOpen(false);
    setActiveDrawPoints([]);
    setDrawMode(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditData(item);
    setModalMode('edit');
    setActiveDrawPoints([]);
    setDrawMode(null);
    setShowModal(true);
  };

  const handleDelete = async (id, cascade = false) => {
    try {
      const res = await fetch(`${API_BASE}/farm-map/items/${id}${cascade ? '?cascade=true' : ''}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setItems(prev => prev.filter(i => i.id !== id));
        if (selectedItem?.id === id) setSelectedItem(null);
        setShowDeleteConfirm(null);
        fetchItems();
      } else if (data.has_dependencies) {
        if (window.confirm(`${data.message}\n\nDo you want to delete this location along with all child beds?`)) {
          handleDelete(id, true);
        }
      } else {
        alert('Delete failed: ' + (data.message || 'Could not delete item'));
      }
    } catch (err) {
      alert('Delete error: ' + err.message);
    }
  };

  const handleSaved = (savedItem, mode) => {
    fetchItems();
    setSelectedItem(savedItem);
  };

  const filteredItems = items.filter(item => {
    const matchType = filterType === 'All' || item.item_type === filterType;
    const matchSearch = !searchQ || item.name.toLowerCase().includes(searchQ.toLowerCase()) || (item.description || '').toLowerCase().includes(searchQ.toLowerCase());
    return matchType && matchSearch;
  });

  const typeCounts = {};
  ITEM_TYPES.forEach(t => { typeCounts[t.value] = items.filter(i => i.item_type === t.value).length; });

  return (
    <div className="fm-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      {/* Top Navbar */}
      <div className="fm-topbar" style={{ padding: '12px 20px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="fm-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🗺️ Farm Map & Location Builder
          </span>
          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
            {items.length} Location{items.length !== 1 ? 's' : ''} Active
          </span>
        </div>

        <div className="fm-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Map Layer Switcher (Standard vs Satellite) */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setMapLayer('standard')}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                backgroundColor: mapLayer === 'standard' ? '#ffffff' : 'transparent',
                color: mapLayer === 'standard' ? '#0f172a' : '#64748b'
              }}
            >
              🗺️ Map View
            </button>
            <button
              type="button"
              onClick={() => setMapLayer('satellite')}
              style={{
                padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                backgroundColor: mapLayer === 'satellite' ? '#ffffff' : 'transparent',
                color: mapLayer === 'satellite' ? '#15803d' : '#64748b'
              }}
            >
              🛰️ Satellite Hybrid
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd()}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <span>+ Add Location</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="fm-filter-bar" style={{ padding: '8px 20px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', overflowX: 'auto' }}>
        <button
          className={`fm-filter-pill ${filterType === 'All' ? 'active' : ''}`}
          onClick={() => setFilterType('All')}
          style={{ padding: '4px 12px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
        >
          All Locations ({items.length})
        </button>
        {ITEM_TYPES.filter(t => typeCounts[t.value] > 0).map(t => (
          <button
            key={t.value}
            className={`fm-filter-pill ${filterType === t.value ? 'active' : ''}`}
            onClick={() => setFilterType(filterType === t.value ? 'All' : t.value)}
            style={{
              padding: '4px 12px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              backgroundColor: filterType === t.value ? '#dcfce7' : '#ffffff',
              color: filterType === t.value ? '#15803d' : '#334155'
            }}
          >
            {t.icon} {t.label} ({typeCounts[t.value]})
          </button>
        ))}
      </div>

      {/* Main Body: Left Sidebar + Map Canvas + Right View Drawer */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* Left Sidebar: Tend.com Location Tree Hierarchy */}
        <div style={{ width: '340px', background: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Location Hierarchy</div>
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button" onClick={() => setViewMode('tree')}
                style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', backgroundColor: viewMode === 'tree' ? '#ffffff' : 'transparent' }}
              >
                🌳 Tree
              </button>
              <button
                type="button" onClick={() => setViewMode('list')}
                style={{ padding: '3px 8px', borderRadius: '4px', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer', backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent' }}
              >
                📋 List
              </button>
            </div>
          </div>

          <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Loading locations...</div>
            ) : viewMode === 'tree' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hierarchyTree.map(rootNode => (
                  <div key={rootNode.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div
                      onClick={() => setSelectedItem(rootNode)}
                      style={{
                        padding: '10px 12px', background: selectedItem?.id === rootNode.id ? '#dcfce7' : '#f8fafc',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderLeft: `4px solid ${rootNode.color || '#2e7d32'}`
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🌾</span>
                        <span>{rootNode.name}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{rootNode.area_sqft ? `${Math.round(rootNode.area_sqft)} sq ft` : ''}</span>
                    </div>

                    {/* Children List */}
                    {Array.isArray(rootNode.children) && rootNode.children.length > 0 && (
                      <div style={{ paddingLeft: '16px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                        {rootNode.children.map(child => (
                          <div
                            key={child.id}
                            onClick={() => setSelectedItem(child)}
                            style={{
                              padding: '8px 12px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                              backgroundColor: selectedItem?.id === child.id ? '#f0fdf4' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#334155' }}>📐 {child.name}</span>
                            <span style={{ fontSize: '10px', color: '#16a34a', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '8px' }}>
                              {child.beds ? `${child.beds.length} beds` : 'Block'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer',
                      backgroundColor: selectedItem?.id === item.id ? '#dcfce7' : '#ffffff',
                      borderLeft: `4px solid ${item.color || '#15803d'}`
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{item.item_type} • {item.location_level || 'field'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas: Interactive Leaflet Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          {drawMode && (
            <div
              style={{
                position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
                background: '#15803d', color: '#ffffff', padding: '10px 20px', borderRadius: '30px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', fontWeight: 700
              }}
            >
              <span>✏️ <b>Drawing {drawMode.toUpperCase()}:</b> Click map canvas to place boundary points ({activeDrawPoints.length} points)</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDrawMode(null)}
                  style={{ padding: '4px 14px', borderRadius: '16px', border: 'none', background: '#ffffff', color: '#15803d', fontWeight: 800, cursor: 'pointer', fontSize: '12px' }}
                >
                  ✓ Done Drawing
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDrawPoints([])}
                  style={{ padding: '4px 10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)', background: 'transparent', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
                >
                  Clear Points
                </button>
              </div>
            </div>
          )}

          <FarmMapView
            items={filteredItems}
            selectedId={selectedItem?.id}
            onSelectItem={setSelectedItem}
            mapLayer={mapLayer}
            drawMode={drawMode}
            onPointsDrawn={setActiveDrawPoints}
            activeDrawPoints={activeDrawPoints}
          />
        </div>

        {/* Right Slide-Out View Drawer (VIEW Provision) */}
        {selectedItem && (
          <div
            style={{
              width: '380px', background: '#ffffff', borderLeft: '1px solid #e2e8f0', height: '100%',
              display: 'flex', flexDirection: 'column', zIndex: 10, boxShadow: '-4px 0 16px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{selectedItem.name}</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>
                  {selectedItem.item_type} • Level: {selectedItem.location_level || 'Field'}
                </div>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Spatial Area Metrics Card */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>📐 Spatial Area & Boundary Metrics</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Total Area</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      {selectedItem.area_sqft ? `${Math.round(selectedItem.area_sqft).toLocaleString()} sq ft` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Acres Equivalent</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      {selectedItem.area_sqft ? `${(selectedItem.area_sqft / 43560).toFixed(3)} Acres` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nested Bed Grid Overview */}
              {Array.isArray(selectedItem.beds) && selectedItem.beds.length > 0 && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    🌱 Subdivided Beds ({selectedItem.beds.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px' }}>
                    {selectedItem.beds.map(b => (
                      <div key={b.id} style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: b.status === 'planted' ? '#dcfce7' : '#f8fafc', fontSize: '11px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.bed_name}</div>
                        <div style={{ color: b.status === 'planted' ? '#15803d' : '#64748b', fontSize: '10px' }}>{b.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Operational Attributes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Irrigation Type</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedItem.irrigation_type || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Soil Type</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedItem.soil_type || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>GPS Coordinates</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                    {selectedItem.gps_lat ? `${parseFloat(selectedItem.gps_lat).toFixed(6)}, ${parseFloat(selectedItem.gps_lng).toFixed(6)}` : 'N/A'}
                  </span>
                </div>
              </div>

              {selectedItem.notes && (
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: '2px' }}>Notes</div>
                  <div style={{ color: '#334155' }}>{selectedItem.notes}</div>
                </div>
              )}

            </div>

            {/* Action Buttons (EDIT & DELETE Provisions) */}
            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', background: '#f8fafc' }}>
              <button
                type="button"
                onClick={() => handleEdit(selectedItem)}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0284c7', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                ✏️ Edit Location
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(selectedItem)}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                🗑️ Delete Location
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <AddItemModal
          mode={modalMode}
          editData={editData}
          parentOptions={items}
          onClose={() => { setShowModal(false); setEditData(null); setDrawMode(null); }}
          onSaved={handleSaved}
          activeDrawPoints={activeDrawPoints}
          setActiveDrawPoints={setActiveDrawPoints}
          setDrawMode={setDrawMode}
          drawMode={drawMode}
        />
      )}

      {/* Safeguard Delete Modal */}
      {showDeleteConfirm && (
        <div className="fm-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="fm-confirm-box" style={{ maxWidth: '420px', padding: '24px', background: '#ffffff', borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '24px', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, textAlign: 'center', color: '#0f172a' }}>
              Delete Location "{showDeleteConfirm.name}"?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: '0 0 20px 0' }}>
              This will remove the location and any associated map geometries from your farm map.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="fm-btn-cancel" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button
                type="button"
                className="fm-btn-delete"
                style={{ flex: 1, background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 700, cursor: 'pointer' }}
                onClick={() => handleDelete(showDeleteConfirm.id)}
              >
                Delete Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
