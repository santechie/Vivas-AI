import React, { useState, useEffect } from 'react';
import {
  Sliders, Play, Eye, Plus, RefreshCw, AlertTriangle,
  Clock, CheckCircle2, XCircle, Calendar, X
} from 'lucide-react';
import { chiApi } from './chiApi';

export default function ProfilesTab({ apiBase, onNavigateTab }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [runningProfileId, setRunningProfileId] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chiApi.getProfiles({}, apiBase);
      setProfiles(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load import profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [apiBase]);

  const handlePreview = async (profileId) => {
    setLoading(true);
    try {
      const res = await chiApi.previewProfile(profileId, apiBase);
      setPreviewResult(res.data);
    } catch (err) {
      showToast('error', `Preview failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunNow = async (profileId) => {
    setRunningProfileId(profileId);
    try {
      const res = await chiApi.runProfile(profileId, {}, apiBase);
      showToast('success', `Import run queued: ${res.data?.run_no}`);
      if (onNavigateTab) {
        setTimeout(() => onNavigateTab('runs'), 1000);
      }
    } catch (err) {
      showToast('error', `Failed to queue run: ${err.message}`);
    } finally {
      setRunningProfileId(null);
    }
  };

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

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Import Profiles</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure automated queries, date bounds, quality thresholds, and scheduled recurring downloads.
          </p>
        </div>
        <button
          onClick={loadProfiles}
          className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 text-xs flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Preview Dialog Modal */}
      {previewResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-semibold text-sm text-gray-900">Import Profile Preview</h4>
              <button onClick={() => setPreviewResult(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-blue-50 text-blue-900 rounded border border-blue-200">
                Remote query estimated <strong>{previewResult.estimated_matching_observations}</strong> potential observations.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded border">
                  <span className="text-gray-500 block">Cap per Problem</span>
                  <span className="font-bold text-gray-900 text-sm">{previewResult.max_images_per_problem}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded border">
                  <span className="text-gray-500 block">Quality Threshold</span>
                  <span className="font-bold text-gray-900 text-sm">{previewResult.quality_filter || 'RESEARCH'}</span>
                </div>
              </div>

              <p className="text-gray-500 text-[11px]">
                Photos will be deduplicated against the existing library by perceptual hash and SHA-256 before staging.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setPreviewResult(null)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile list */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">Loading profiles...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
          {error}
        </div>
      ) : profiles.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
          <Sliders className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">No import profiles defined</p>
          <p className="text-xs mt-1">Create an import profile to target specific crops and problem groups.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {profiles.map((p) => {
            const isRunning = runningProfileId === p.id;

            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-900">{p.name}</h4>
                      <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded font-semibold uppercase">
                        {p.source_name || p.source_code}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-medium">
                        Schedule: {p.schedule}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600">
                      Quality: <strong>{p.quality_filter || 'RESEARCH'}</strong> · Max / problem: <strong>{p.max_images_per_problem}</strong> · Setting: <strong>{p.setting || 'FIELD'}</strong>
                    </p>

                    <div className="text-[11px] text-gray-500 pt-1 flex items-center gap-4">
                      {p.last_run_at && (
                        <span>Last Run: {new Date(p.last_run_at).toLocaleString()}</span>
                      )}
                      {p.next_run_at && p.schedule !== 'MANUAL' && (
                        <span>Next Scheduled: {new Date(p.next_run_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePreview(p.id)}
                      className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded flex items-center gap-1 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleRunNow(p.id)}
                      disabled={isRunning}
                      className="px-3 py-1.5 bg-[#1B7A2B] hover:bg-[#156724] text-white text-xs font-medium rounded flex items-center gap-1 transition disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {isRunning ? 'Queueing...' : 'Run Import Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
