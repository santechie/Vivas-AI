import React, { useState, useEffect, useCallback } from 'react';
import {
  Check, X, ChevronLeft, ChevronRight, CheckCircle2,
  AlertTriangle, RefreshCw, Filter, Layers, User, Tag
} from 'lucide-react';
import { chiApi } from './chiApi';
import ImageCredit from '../../../components/ImageCredit';

export default function ReviewTab({ apiBase }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Filter state
  const [selectedCropFilter, setSelectedCropFilter] = useState('ALL');
  const [selectedProblemFilter, setSelectedProblemFilter] = useState('ALL');

  // Label modifications for active item
  const [editPart, setEditPart] = useState('');
  const [editSetting, setEditSetting] = useState('');
  const [editCropId, setEditCropId] = useState('');
  const [editProblemId, setEditProblemId] = useState('');
  const [rejectReason, setRejectReason] = useState('Poor Quality / Out of Focus');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [cropsList, setCropsList] = useState([]);
  const [problemsList, setProblemsList] = useState([]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadReferenceData = async () => {
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('vivas_token') || sessionStorage.getItem('vivas_token') || localStorage.getItem('token'))
        : '';
      const [cropsRes, probsRes] = await Promise.all([
        fetch(`${apiBase || 'http://localhost:5001'}/api/crops`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        }).then(r => r.json()).catch(() => ({ data: [] })),
        fetch(`${apiBase || 'http://localhost:5001'}/api/ch/problems`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        }).then(r => r.json()).catch(() => ({ data: [] }))
      ]);
      setCropsList(cropsRes.data || []);
      setProblemsList(probsRes.data || []);
    } catch (e) {
      // quiet fallback
    }
  };

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chiApi.getItems({ status: 'PENDING', page_size: 100 }, apiBase);
      setItems(res.data || []);
      setSelectedIndex(0);
    } catch (err) {
      setError(err.message || 'Failed to load review items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    loadReferenceData();
  }, [apiBase]);

  // Derive unique crops and problems from items for batch filtering
  const availableCrops = Array.from(new Set(items.map(it => it.crop_name).filter(Boolean)));
  const availableProblems = Array.from(new Set(items.map(it => it.problem_name).filter(Boolean)));

  const filteredItems = items.filter(it => {
    if (selectedCropFilter !== 'ALL' && it.crop_name !== selectedCropFilter) return false;
    if (selectedProblemFilter !== 'ALL' && it.problem_name !== selectedProblemFilter) return false;
    return true;
  });

  const currentItem = filteredItems[selectedIndex] || null;

  useEffect(() => {
    if (currentItem) {
      setEditPart(currentItem.plant_part_id || '');
      setEditSetting(currentItem.setting || 'FIELD');
      setEditCropId(currentItem.crop_id || '');
      setEditProblemId(currentItem.problem_id || '');
    }
  }, [currentItem]);

  // Keyboard navigation & approval shortcuts (SRS 10.1: A approve, R reject, Left/Right nav)
  const handleApprove = useCallback(async () => {
    if (!currentItem || actionLoading) return;
    const finalCropId = editCropId || currentItem.crop_id;
    const finalProblemId = editProblemId || currentItem.problem_id;

    if (!finalCropId || !finalProblemId) {
      showToast('error', 'Please select both a crop and a problem below before approving.');
      return;
    }

    setActionLoading(true);
    try {
      await chiApi.approveItem(currentItem.id, {
        crop_id: finalCropId,
        problem_id: finalProblemId
      }, apiBase);
      showToast('success', 'Photo approved and published to Crop Health');
      // Remove approved item locally
      setItems(prev => prev.filter((_, idx) => idx !== selectedIndex));
    } catch (err) {
      showToast('error', `Approval failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }, [currentItem, selectedIndex, editCropId, editProblemId, actionLoading, apiBase]);

  const handleReject = useCallback(async () => {
    if (!currentItem || actionLoading) return;
    setActionLoading(true);
    try {
      await chiApi.rejectItem(currentItem.id, { reason: rejectReason, reject_reason: rejectReason }, apiBase);
      showToast('success', 'Photo rejected');
      setShowRejectDialog(false);
      setItems(prev => prev.filter((_, idx) => idx !== selectedIndex));
    } catch (err) {
      showToast('error', `Reject failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }, [currentItem, selectedIndex, rejectReason, actionLoading, apiBase]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid firing when user is typing in form controls
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' && selectedIndex < items.length - 1) {
        setSelectedIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        setSelectedIndex(prev => prev - 1);
      } else if (e.key.toLowerCase() === 'a') {
        handleApprove();
      } else if (e.key.toLowerCase() === 'r') {
        setShowRejectDialog(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, items.length, handleApprove]);

  return (
    <div className="p-6 space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded text-xs font-medium flex items-center justify-between ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Review Queue</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Human-in-the-loop triage for research-grade sightings before publishing into the Crop Health knowledgebase.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Shortcuts: <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]">A</kbd> Approve · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]">R</kbd> Reject · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px]">← / →</kbd> Navigate
          </span>
          <button
            onClick={loadItems}
            className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 text-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filter Batch:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-gray-500">Crop:</label>
            <select
              value={selectedCropFilter}
              onChange={(e) => {
                setSelectedCropFilter(e.target.value);
                setSelectedIndex(0);
              }}
              className="p-1 border border-gray-300 rounded bg-white text-xs text-gray-800"
            >
              <option value="ALL">All Crops ({items.length})</option>
              {availableCrops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-gray-500">Problem:</label>
            <select
              value={selectedProblemFilter}
              onChange={(e) => {
                setSelectedProblemFilter(e.target.value);
                setSelectedIndex(0);
              }}
              className="p-1 border border-gray-300 rounded bg-white text-xs text-gray-800"
            >
              <option value="ALL">All Problems</option>
              {availableProblems.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <span className="text-gray-400 ml-auto">
            Showing {filteredItems.length} of {items.length} items
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">Loading staged photos...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Review queue is empty</p>
          <p className="text-xs mt-1">All staged photos have been vetted or no active import runs are pending.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Inspection Area (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-black/95 rounded-lg overflow-hidden flex items-center justify-center min-h-[420px] relative border border-gray-800">
              <img
                src={currentItem?.local_url || currentItem?.media_url_original}
                alt={currentItem?.problem_name || 'Plant health sample'}
                className="max-h-[500px] w-auto object-contain"
                loading="lazy"
              />

              {/* Navigation overlays */}
              <button
                onClick={() => setSelectedIndex(prev => Math.max(0, prev - 1))}
                disabled={selectedIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full disabled:opacity-20 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSelectedIndex(prev => Math.min(items.length - 1, prev + 1))}
                disabled={selectedIndex === items.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full disabled:opacity-20 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-2 left-3 text-[11px] text-gray-300 bg-black/60 px-2 py-0.5 rounded">
                Item {selectedIndex + 1} of {items.length}
              </div>
            </div>

            {/* Credit Bar */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <ImageCredit
                creator={currentItem?.creator_name}
                license={currentItem?.license_code}
                sourceName={currentItem?.source_name || currentItem?.source_code}
                sourceUrl={currentItem?.source_page_url}
              />
            </div>
          </div>

          {/* Inspector & Action Panel (1 Col) */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5 h-fit shadow-sm">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {currentItem?.problem_type || 'Unclassified'}
              </span>
              <h4 className="text-base font-bold text-gray-900 mt-1">
                {currentItem?.problem_name || 'Unassigned Problem'}
              </h4>
              <p className="text-xs text-gray-500 italic">
                Candidate Crop: {currentItem?.crop_name || 'Host crop needed'}
              </p>
            </div>

            <div className="space-y-3 pt-2 border-t text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Target Crop *</label>
                <select
                  value={editCropId}
                  onChange={(e) => setEditCropId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white text-gray-900 font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Select Host Crop --</option>
                  {cropsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Pest / Disease Problem *</label>
                <select
                  value={editProblemId}
                  onChange={(e) => setEditProblemId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white text-gray-900 font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Select Library Problem --</option>
                  {problemsList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.problem_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Observed Location</label>
                <div className="text-gray-800 bg-gray-50 p-2 rounded border border-gray-100">
                  {currentItem?.state || currentItem?.country_code || 'GPS stripped for privacy'}
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Image Setting</label>
                <select
                  value={editSetting}
                  onChange={(e) => setEditSetting(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white text-gray-800"
                >
                  <option value="FIELD">Field (In-situ agricultural crop)</option>
                  <option value="LAB">Lab / Controlled chamber</option>
                  <option value="HERBARIUM">Herbarium specimen</option>
                </select>
              </div>
            </div>

            {/* Actions button group */}
            <div className="space-y-2 pt-4 border-t">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="w-full py-2.5 bg-[#1B7A2B] hover:bg-[#156724] text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Approve & Publish (A)
              </button>

              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={actionLoading}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Reject Image (R)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-5 space-y-4 border border-gray-200">
            <div>
              <h4 className="font-bold text-sm text-gray-900">Reject Staged Photo</h4>
              <p className="text-xs text-gray-500 mt-0.5">Select or write the reason for rejecting this image.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-gray-700">Rejection Reason</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-xs bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 font-medium"
              >
                <option value="Poor Quality / Out of Focus">Poor Quality / Out of Focus</option>
                <option value="Wrong Pest / Misidentification">Wrong Pest / Misidentification</option>
                <option value="Wrong Crop / Unrelated Host">Wrong Crop / Unrelated Host</option>
                <option value="Not a Plant Health Problem">Not a Plant Health Problem</option>
                <option value="Copyright / License Ineligible">Copyright / License Ineligible</option>
                <option value="Duplicate Observation">Duplicate Observation</option>
                <option value="Other">Other (custom notes)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowRejectDialog(false)}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded transition shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
