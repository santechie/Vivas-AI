import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon, Trash2, CheckCircle2, ShieldAlert,
  Search, RefreshCw, AlertTriangle, ExternalLink, Sliders, X
} from 'lucide-react';
import { chiApi } from './chiApi';
import ImageCredit from '../../../components/ImageCredit';

export default function PublishedTab({ apiBase }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [takedownReason, setTakedownReason] = useState('COPYRIGHT_NOTICE');
  const [takedownNotes, setTakedownNotes] = useState('');
  const [showTakedownModal, setShowTakedownModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chiApi.getMedia({ page_size: 60 }, apiBase);
      setMedia(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load published media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [apiBase]);

  const handleTakedown = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await chiApi.takedownMedia(selectedItem.id, {
        reason: takedownReason,
        notes: takedownNotes
      }, apiBase);
      showToast('success', 'Image taken down and isolated into quarantine');
      setShowTakedownModal(false);
      setSelectedItem(null);
      loadMedia();
    } catch (err) {
      showToast('error', `Takedown failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMedia = media.filter(item => {
    return (
      item.problem_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.crop_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.source_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.creator_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`p-3 rounded text-xs font-medium flex items-center justify-between ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Published Media Knowledgebase</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Active images linked to library problems and diagnosis comparisons. Manage primary tags, labels, or execute takedowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by crop, problem, creator..."
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs w-60 focus:outline-none"
            />
          </div>

          <button
            onClick={loadMedia}
            className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">Loading published media...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
          {error}
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="p-16 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">No published media found</p>
          <p className="text-xs mt-1">Images vetted and approved in the Review Queue will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex flex-col justify-between hover:border-gray-300 transition-colors"
            >
              <div>
                <div className="relative aspect-video bg-gray-100 overflow-hidden">
                  <img
                    src={m.thumb_url || m.url}
                    alt={m.problem_name || 'Problem image'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {m.is_primary && (
                    <span className="absolute top-2 left-2 bg-[#1B7A2B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      PRIMARY
                    </span>
                  )}
                  {m.is_training_eligible && (
                    <span className="absolute top-2 right-2 bg-blue-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      TRAINING
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <h4 className="font-bold text-xs text-gray-900 line-clamp-1">
                    {m.problem_name || 'Problem Reference'}
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-medium line-clamp-1">
                    Crop: {m.crop_name || 'General Problem'}
                  </p>

                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <ImageCredit
                      creator={m.source_credit || m.creator_name}
                      license={m.license_code}
                      sourceName={m.source_name}
                      sourceUrl={m.source_url}
                    />
                  </div>
                </div>
              </div>

              <div className="px-3 pb-3 pt-1 border-t border-gray-50 flex items-center justify-between text-xs">
                <span className="text-[10px] text-gray-400 uppercase font-medium">
                  {m.setting || 'FIELD'}
                </span>
                <button
                  onClick={() => {
                    setSelectedItem(m);
                    setShowTakedownModal(true);
                  }}
                  className="text-rose-700 hover:text-rose-900 hover:bg-rose-50 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition"
                  title="Execute Takedown"
                >
                  <Trash2 className="w-3 h-3" />
                  Takedown
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Takedown Confirmation Modal */}
      {showTakedownModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h4 className="font-semibold text-sm">Quarantine Image & Execute Takedown</h4>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              This action soft-deletes the image from all active galleries, revokes training eligibility, and relocates the asset file into the quarantine repository.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Reason for Removal</label>
                <select
                  value={takedownReason}
                  onChange={(e) => setTakedownReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded text-xs bg-white"
                >
                  <option value="COPYRIGHT_NOTICE">Copyright Infringement Notice (DMCA / Author Request)</option>
                  <option value="MISIDENTIFIED">Biologically Misidentified Problem or Crop</option>
                  <option value="QUALITY_DEFECT">Corrupted / Quality Defect</option>
                  <option value="POLICY_VIOLATION">Terms of Service / Policy Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Internal Reference / Ticket Notes</label>
                <textarea
                  value={takedownNotes}
                  onChange={(e) => setTakedownNotes(e.target.value)}
                  placeholder="Provide reference or ticket number..."
                  rows="2"
                  className="w-full p-2 border border-gray-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setShowTakedownModal(false)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleTakedown}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded disabled:opacity-50"
              >
                {actionLoading ? 'Quarantining...' : 'Confirm Takedown'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
