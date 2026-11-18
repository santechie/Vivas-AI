import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Plus, 
  LogOut, 
  Check, 
  X, 
  Search,
  ChevronRight,
  Edit2,
  Trash2,
  Cloud,
  Moon,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:5001/api"
  : "/api";

// Helper to extract 2-letter uppercase initials for avatar badge
function getInitials(name) {
  if (!name) return 'FA';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Format relative access timestamp matching screenshot ("Opened 14h ago", "Opened 22h ago", "Opened 1w ago")
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Opened recently';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Opened just now';
  if (diffHours < 24) return `Opened ${diffHours}h ago`;
  if (diffDays < 7) return `Opened ${diffDays}d ago`;
  if (diffDays < 30) return `Opened ${Math.max(1, Math.floor(diffDays / 7))}w ago`;
  return `Opened ${date.toLocaleDateString()}`;
}

export default function SelectFarmScreen({ currentUser, authToken, onSelectFarm, onSkip, onLogout }) {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / View States
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [deleteConfirmFarm, setDeleteConfirmFarm] = useState(null);

  // Form State
  const [farmForm, setFarmForm] = useState({
    farm_name: '',
    legal_name: '',
    city: '',
    state_country: '',
    total_area_acres: '',
    farm_type: 'Organic Vegetables',
    weather_summary: '14.3° C',
    role_in_farm: 'Owner'
  });

  // Inline Validation Errors State
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch user farms from API profile
  const fetchFarms = async () => {
    setLoading(true);
    setError('');
    try {
      const emailQuery = currentUser?.email ? `?email=${encodeURIComponent(currentUser.email)}` : '';
      const res = await fetch(`${API_BASE}/farms${emailQuery}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        const fetchedFarms = data.data || [];
        setFarms(fetchedFarms);
        // If user has NO farms saved, automatically open the Save your Farm screen
        if (fetchedFarms.length === 0) {
          setShowCreateForm(true);
        }
      } else {
        setError(data.error || 'Failed to load farm workspaces');
      }
    } catch (err) {
      console.error('Error fetching farms:', err);
      setError('Unable to connect to VivasAI backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  // Form Validation Logic
  const validateForm = () => {
    const errors = {};
    if (!farmForm.farm_name.trim()) {
      errors.farm_name = 'Farm Name is required';
    } else if (farmForm.farm_name.trim().length < 2) {
      errors.farm_name = 'Farm Name must be at least 2 characters';
    }

    if (farmForm.total_area_acres && (isNaN(farmForm.total_area_acres) || parseFloat(farmForm.total_area_acres) <= 0)) {
      errors.total_area_acres = 'Total area must be a positive number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingFarm(null);
    setFarmForm({
      farm_name: '',
      legal_name: '',
      city: 'Bengaluru',
      state_country: 'India',
      total_area_acres: '25.0',
      farm_type: 'Organic Vegetables',
      weather_summary: '14.3° C',
      role_in_farm: 'Owner'
    });
    setFormErrors({});
    setShowCreateForm(true);
  };

  // Open Edit Form
  const handleOpenEdit = (e, farm) => {
    e.stopPropagation();
    setEditingFarm(farm);
    setFarmForm({
      farm_name: farm.farm_name || '',
      legal_name: farm.legal_name || '',
      city: farm.city || '',
      state_country: farm.state_country || '',
      total_area_acres: farm.total_area_acres || '',
      farm_type: farm.farm_type || 'Organic Vegetables',
      weather_summary: farm.weather_summary || '14.3° C',
      role_in_farm: farm.role_in_farm || 'Owner'
    });
    setFormErrors({});
    setShowCreateForm(true);
  };

  // Handle Select Farm Card
  const handleSelect = async (farm) => {
    try {
      await fetch(`${API_BASE}/farms/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          farm_id: farm.id,
          user_id: currentUser?.id 
        })
      });
    } catch (err) {
      console.warn('Select farm API warning:', err);
    }
    onSelectFarm(farm);
  };

  // Submit Create or Edit (CRUD)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const isEdit = !!editingFarm;
      const url = isEdit ? `${API_BASE}/farms/${editingFarm.id}` : `${API_BASE}/farms`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...farmForm,
        user_id: currentUser?.id,
        email: currentUser?.email
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setShowCreateForm(false);
        setEditingFarm(null);
        setSuccessMsg(isEdit ? 'Farm workspace updated successfully!' : 'New farm workspace created successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
        
        if (!isEdit && data.data) {
          onSelectFarm(data.data);
        } else {
          await fetchFarms();
        }
      } else {
        alert(data.message || data.error || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving farm:', err);
      alert('Failed to connect to server');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / Archive Farm
  const handleDeleteFarm = async () => {
    if (!deleteConfirmFarm) return;
    try {
      const res = await fetch(`${API_BASE}/farms/${deleteConfirmFarm.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirmFarm(null);
        setSuccessMsg('Farm workspace archived successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
        await fetchFarms();
      } else {
        alert(data.message || 'Failed to delete farm workspace');
      }
    } catch (err) {
      console.error('Error deleting farm:', err);
      alert('Failed to delete farm workspace');
    }
  };

  // Client-side search filtering
  const filteredFarms = farms.filter(f => 
    f.farm_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.city && f.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (f.state_country && f.state_country.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div 
      className="min-h-screen bg-[#f7faf7] text-slate-800 antialiased font-sans flex flex-col justify-between selection:bg-emerald-500/20"
      style={{
        backgroundColor: '#f7faf7',
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(34, 197, 94, 0.05) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(234, 179, 8, 0.06) 0px, transparent 55%),
          radial-gradient(at 50% 20%, rgba(17, 68, 39, 0.03) 0px, transparent 60%)
        `,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* 1. TOP HEADER BAR MATCHING STITCH HTML */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-emerald-900/10 sticky top-0 z-30" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(17, 68, 39, 0.1)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          
          {/* VivasAI Brand Logo */}
          <div className="flex items-center space-x-3" style={{ display: 'flex', alignItems: 'center' }}>
            <a href="#" className="focus:outline-none rounded-lg p-1" title="VivasAI Dashboard">
              <img 
                src="/logo.jpg" 
                alt="VivasAI Logo" 
                style={{ height: '36px', width: 'auto', maxHeight: '36px', objectFit: 'contain', display: 'block' }}
              />
            </a>
          </div>

          {/* Right Header Actions: Skip Button & Log out */}
          <div className="flex items-center space-x-3 sm:space-x-4" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            
            {/* SKIP BUTTON */}
            {onSkip && (
              <button
                onClick={onSkip}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors py-1.5 px-3.5 rounded-lg hover:bg-slate-100/80 cursor-pointer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600', color: '#475569', cursor: 'pointer', padding: '6px 14px', borderRadius: '8px', background: 'none' }}
                title="Skip to VivasAI dashboard"
              >
                <span>Skip</span>
                <ArrowRight size={15} />
              </button>
            )}

            {/* Log out Button */}
            <button
              onClick={onLogout}
              className="group inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors py-1.5 px-3 rounded-lg hover:bg-rose-50/80 cursor-pointer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: '#e11d48', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', background: 'none' }}
              title="Sign out of VivasAI"
            >
              <span>Log out</span>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CENTERED CARD CONTAINER MATCHING STITCH HTML */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: '40px 16px' }}>
        <section 
          aria-labelledby="welcome-heading" 
          className="w-full max-w-[620px] bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-emerald-950/5 p-6 sm:p-9 text-left relative"
          style={{ width: '100%', maxWidth: '620px', backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', padding: '36px', textAlign: 'left', margin: '0 auto' }}
        >
          
          {/* Connected Organization Pill Badge */}
          <div className="mb-6" style={{ marginBottom: '24px' }}>
            <div 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100/80 text-emerald-800 text-xs font-medium mb-3"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '9999px', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', color: '#065f46', fontSize: '12px', fontWeight: '500', marginBottom: '12px' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#10b981' }}></span>
              Connected Organization
            </div>

            <h1 id="welcome-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight" style={{ fontSize: '28px', fontWeight: '800', color: '#0e3a22', letterSpacing: '-0.025em', lineHeight: '1.2' }}>
              Welcome back, {currentUser?.full_name || 'Gopikrishna Santhanam'}
            </h1>
            <p className="mt-2 text-base text-slate-600" style={{ marginTop: '8px', fontSize: '16px', color: '#475569' }}>
              {showCreateForm && farms.length === 0 
                ? 'No farm configured yet. Save your farm workspace to continue' 
                : 'Please choose your farm to continue'}
            </p>
          </div>

          {/* Success Notification */}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-fadeIn" style={{ marginBottom: '20px', padding: '14px', borderRadius: '16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg('')} className="text-emerald-800 hover:opacity-70" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Error Notification */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between" style={{ marginBottom: '20px', padding: '14px', borderRadius: '16px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{error}</span>
              <button 
                onClick={fetchFarms}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                style={{ padding: '4px 10px', backgroundColor: '#e11d48', color: '#ffffff', borderRadius: '8px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center" style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" style={{ width: '32px', height: '32px', border: '3px solid #059669', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '12px' }} />
              <p className="text-xs font-medium text-slate-500" style={{ fontSize: '12px', color: '#64748b' }}>Loading saved farms from your profile...</p>
            </div>
          )}

          {/* VIEW 1: FARM LISTING SCREEN (STITCH HTML REPLICA) */}
          {!loading && !showCreateForm && (
            <>
              {/* Search & Filter Bar */}
              <div className="mb-5 relative" style={{ marginBottom: '20px', position: 'relative' }}>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '14px', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#94a3b8' }}>
                  <Search size={16} />
                </div>
                <input
                  id="farmSearchInput"
                  type="text"
                  placeholder="Search farms by name, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder-slate-400 transition"
                  style={{ width: '100%', paddingLeft: '40px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', fontSize: '14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Farms Card List Container */}
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-0.5" role="list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto' }}>
                {filteredFarms.map((farm) => {
                  const initials = getInitials(farm.farm_name);
                  const relativeTime = formatRelativeTime(farm.last_accessed_at || farm.created_at);
                  const weatherStr = farm.weather_summary || '14.3° C';
                  const isFahrenheit = weatherStr.includes('F');
                  const WeatherIconComponent = isFahrenheit ? Moon : Cloud;

                  return (
                    <article
                      key={farm.id}
                      onClick={() => handleSelect(farm)}
                      className="farm-card cursor-pointer border border-slate-200/90 hover:border-emerald-500 bg-white rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 select-none transition-all duration-200 group"
                      style={{ cursor: 'pointer', border: '1px solid rgba(226, 232, 240, 0.9)', backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
                      role="listitem"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1" style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                        {/* Monogram Avatar Badge (GF, GF, FF) */}
                        <div 
                          className="w-12 h-12 rounded-xl bg-rose-100 flex-shrink-0 flex items-center justify-center text-rose-700 font-bold text-base shadow-inner group-hover:scale-105 transition-transform"
                          style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ffe4e6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be123c', fontWeight: '700', fontSize: '16px' }}
                        >
                          {initials}
                        </div>

                        {/* Details Column */}
                        <div className="min-w-0 flex-1" style={{ minWidth: 0, flex: 1 }}>
                          <div className="flex items-center gap-2 flex-wrap mb-1" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <h2 className="text-base font-bold text-slate-900 truncate" style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                              {farm.farm_name}
                            </h2>
                            <span 
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700"
                              style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', backgroundColor: '#ffe4e6', color: '#be123c' }}
                            >
                              {farm.role_in_farm || 'Owner'}
                            </span>
                          </div>

                          {/* Metadata Row */}
                          <div className="flex items-center flex-wrap text-xs text-slate-500 gap-y-1 gap-x-3.5" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px', color: '#64748b', gap: '6px 14px' }}>
                            {/* Weather Metric */}
                            <span className="inline-flex items-center gap-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <WeatherIconComponent size={14} className="text-slate-400" />
                              {weatherStr}
                            </span>

                            {/* Location */}
                            <span className="inline-flex items-center gap-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={14} className="text-slate-400" />
                              {farm.state_country || farm.city || 'India'}
                            </span>

                            <span className="text-slate-400 hidden sm:inline">•</span>
                            <span className="text-slate-500">{relativeTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Hover Actions & Trailing Navigation Icon */}
                      <div className="flex items-center gap-2 shrink-0" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleOpenEdit(e, farm)}
                            title="Edit farm details"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            style={{ padding: '6px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmFarm(farm);
                            }}
                            title="Archive farm workspace"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            style={{ padding: '6px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="flex-shrink-0 text-slate-400 chevron-arrow group-hover:text-emerald-700 transition-all" style={{ flexShrink: 0, color: '#94a3b8' }}>
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </article>
                  );
                })}

                {filteredFarms.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50/50 border border-slate-200/60 rounded-2xl" style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: '#64748b', backgroundColor: 'rgba(248, 250, 252, 0.5)', border: '1px solid rgba(226, 232, 240, 0.6)', borderRadius: '16px' }}>
                    No farms found matching "{searchQuery}".
                  </div>
                )}
              </div>

              {/* Add New Farm Action Button (Dashed Style matching Stitch HTML) */}
              <div className="mt-5" style={{ marginTop: '20px' }}>
                <button
                  onClick={handleOpenCreate}
                  type="button"
                  className="w-full py-3.5 px-4 border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl flex items-center justify-center gap-2 text-slate-600 hover:text-emerald-700 bg-slate-50/50 hover:bg-emerald-50/40 transition-colors font-semibold text-sm group focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  style={{ width: '100%', padding: '14px 16px', border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '8px', color: '#475569', backgroundColor: 'rgba(248, 250, 252, 0.5)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  <Plus size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  <span>Create or Connect New Farm</span>
                </button>
              </div>
            </>
          )}

          {/* VIEW 2: "SAVE YOUR FARM" CREATION FORM */}
          {!loading && showCreateForm && (
            <div className="animate-fadeIn">
              <div className="flex items-center gap-3 mb-5" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0" style={{ width: '40px', height: '40px', borderRadius: '16px', backgroundColor: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyCenter: 'center', flexShrink: 0 }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0e3a22]" style={{ fontSize: '16px', fontWeight: '700', color: '#0e3a22', margin: 0 }}>
                    {editingFarm ? 'Edit Farm Workspace' : 'Save Your Farm'}
                  </h3>
                  <p className="text-xs text-slate-500" style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    Enter details to configure your farm workspace
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4 text-xs" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1" style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Farm Name <span className="text-rose-600" style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gopikrishna's Farm"
                    value={farmForm.farm_name}
                    onChange={(e) => setFarmForm({ ...farmForm, farm_name: e.target.value })}
                    className={`w-full pl-3.5 pr-4 py-2.5 text-xs bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition ${
                      formErrors.farm_name 
                        ? 'border-rose-500 focus:ring-rose-500' 
                        : 'border-slate-200 focus:ring-emerald-600 focus:border-emerald-600'
                    }`}
                    style={{ width: '100%', padding: '10px 14px', fontSize: '12px', backgroundColor: '#f8fafc', border: formErrors.farm_name ? '1px solid #f43f5e' : '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                  />
                  {formErrors.farm_name && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1" style={{ fontSize: '11px', color: '#e11d48', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={12} />
                      {formErrors.farm_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1" style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Legal Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gopikrishna Organics India Pvt Ltd"
                    value={farmForm.legal_name}
                    onChange={(e) => setFarmForm({ ...farmForm, legal_name: e.target.value })}
                    className="w-full pl-3.5 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    style={{ width: '100%', padding: '10px 14px', fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1" style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      City / Town
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={farmForm.city}
                      onChange={(e) => setFarmForm({ ...farmForm, city: e.target.value })}
                      className="w-full pl-3.5 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      style={{ width: '100%', padding: '10px 14px', fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1" style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      State / Country
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. India or New York, NY"
                      value={farmForm.state_country}
                      onChange={(e) => setFarmForm({ ...farmForm, state_country: e.target.value })}
                      className="w-full pl-3.5 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      style={{ width: '100%', padding: '10px 14px', fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1" style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Area (Acres)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="25.0"
                      value={farmForm.total_area_acres}
                      onChange={(e) => setFarmForm({ ...farmForm, total_area_acres: e.target.value })}
                      className="w-full pl-3.5 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1" style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Weather Info
                    </label>
                    <input
                      type="text"
                      placeholder="14.3° C"
                      value={farmForm.weather_summary}
                      onChange={(e) => setFarmForm({ ...farmForm, weather_summary: e.target.value })}
                      className="w-full pl-3.5 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      style={{ width: '100%', padding: '10px 12px', fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1" style={{ display: 'block', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Your Role
                    </label>
                    <select
                      value={farmForm.role_in_farm}
                      onChange={(e) => setFarmForm({ ...farmForm, role_in_farm: e.target.value })}
                      className="w-full pl-2.5 pr-2 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      style={{ width: '100%', padding: '10px 10px', fontSize: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none' }}
                    >
                      <option value="Owner">Owner</option>
                      <option value="Manager">Manager</option>
                      <option value="Agronomist">Agronomist</option>
                      <option value="Operator">Operator</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-200/80 mt-6" style={{ paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(226, 232, 240, 0.8)', marginTop: '24px' }}>
                  {onSkip && (
                    <button
                      type="button"
                      onClick={onSkip}
                      className="px-4 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-100 cursor-pointer"
                      style={{ padding: '10px 16px', color: '#64748b', fontSize: '12px', fontWeight: '600', borderRadius: '12px', border: 'none', background: 'none', cursor: 'pointer' }}
                    >
                      Skip for now
                    </button>
                  )}

                  <div className="flex items-center gap-3 ml-auto" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    {farms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setEditingFarm(null);
                        }}
                        className="px-4 py-2.5 text-slate-600 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold cursor-pointer"
                        style={{ padding: '10px 16px', color: '#475569', backgroundColor: '#f1f5f9', fontSize: '12px', fontWeight: '600', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 px-5 py-2.5 text-white bg-[#0e3a22] hover:bg-[#114427] rounded-xl font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                      style={{ padding: '10px 20px', color: '#ffffff', backgroundColor: '#0e3a22', fontSize: '12px', fontWeight: '700', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Check size={16} />
                      {editingFarm ? 'Save Changes' : 'Save Your Farm'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </section>
      </main>

      {/* 3. FOOTER MATCHING STITCH HTML */}
      <footer className="w-full py-4 text-center border-t border-slate-200/50 bg-white/40 text-xs text-slate-500" style={{ padding: '16px 0', textAlign: 'center', borderTop: '1px solid rgba(226, 232, 240, 0.5)', backgroundColor: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', color: '#64748b' }}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6" style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '24px' }}>
          <span className="font-medium text-slate-600" style={{ fontWeight: '500', color: '#475569' }}>VivasAI • Intelligence for Living Agriculture</span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <div className="flex gap-4" style={{ display: 'flex', gap: '16px' }}>
            <a href="#" className="hover:text-emerald-700 transition" style={{ color: '#64748b', textDecoration: 'none' }}>Help & Documentation</a>
            <a href="#" className="hover:text-emerald-700 transition" style={{ color: '#64748b', textDecoration: 'none' }}>Privacy Policy</a>
          </div>
        </div>
      </footer>

      {/* 4. DELETE / ARCHIVE CONFIRMATION MODAL */}
      {deleteConfirmFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: '16px' }}>
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-left" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '24px', maxWidth: '380px', width: '100%', padding: '24px', textAlign: 'left' }}>
            <h3 className="text-base font-bold text-rose-700 mb-2" style={{ fontSize: '16px', fontWeight: '700', color: '#be123c', marginBottom: '8px' }}>
              Archive Farm Workspace?
            </h3>
            <p className="text-xs text-slate-600 mb-6" style={{ fontSize: '12px', color: '#475569', marginBottom: '24px' }}>
              Are you sure you want to archive <strong>"{deleteConfirmFarm.farm_name}"</strong>? You can restore it later from settings.
            </p>

            <div className="flex items-center justify-end gap-3" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setDeleteConfirmFarm(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '600', color: '#475569', backgroundColor: '#f1f5f9', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFarm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
                style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '600', color: '#ffffff', backgroundColor: '#e11d48', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
