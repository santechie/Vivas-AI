import React, { useState, useEffect } from 'react';
import {
  Clock, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Pause, RotateCcw, FileText, ChevronRight, X
} from 'lucide-react';
import { chiApi } from './chiApi';

export default function RunsTab({ apiBase }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chiApi.getRuns({}, apiBase);
      setRuns(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load import runs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, [apiBase]);

  const loadRunDetail = async (runId) => {
    setLogsLoading(true);
    try {
      const [runRes, logsRes] = await Promise.all([
        chiApi.getRun(runId, apiBase),
        chiApi.getRunLogs(runId, apiBase)
      ]);
      setSelectedRun(runRes.data);
      setLogs(logsRes.data || []);
    } catch (err) {
      showToast('error', `Failed to load logs: ${err.message}`);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCancelRun = async (runId) => {
    try {
      await chiApi.cancelRun(runId, apiBase);
      showToast('success', 'Run marked as cancelled');
      loadRuns();
      if (selectedRun?.id === runId) loadRunDetail(runId);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleRetryRun = async (runId) => {
    try {
      const res = await chiApi.retryRun(runId, apiBase);
      showToast('success', `Retry queued: ${res.data?.run_no}`);
      loadRuns();
    } catch (err) {
      showToast('error', err.message);
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
          <h3 className="text-base font-semibold text-gray-900">Import Runs & Live Logs</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit background workers, monitor image ingestion telemetry, inspect deduplication counters, and view log streams.
          </p>
        </div>
        <button
          onClick={loadRuns}
          className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 text-xs flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Runs Table */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">Loading execution runs...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
          {error}
        </div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">No import runs found</p>
          <p className="text-xs mt-1">Execute an import profile to view execution progress.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#0F2D59] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Run Number</th>
                <th className="px-4 py-3">Source & Profile</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Telemetry</th>
                <th className="px-4 py-3">Duration / Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => loadRunDetail(r.id)}
                      className="font-mono font-bold text-blue-900 hover:underline flex items-center gap-1"
                    >
                      {r.run_no} <ChevronRight className="w-3 h-3 text-gray-400" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.source_name || r.source_code}</div>
                    <div className="text-[11px] text-gray-500">{r.profile_name || 'Manual Query'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      r.status === 'RUNNING' ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse' :
                      r.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      r.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 font-medium">
                      Fetched: {r.images_fetched_count || 0} · Staged: <span className="text-emerald-700">{r.items_staged_count || 0}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Dupes: {r.duplicates_skipped_count || 0} · Filtered: {r.license_rejected_count || 0}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => loadRunDetail(r.id)}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-medium"
                    >
                      Logs
                    </button>
                    {r.status === 'RUNNING' && (
                      <button
                        onClick={() => handleCancelRun(r.id)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded text-[11px] font-medium"
                      >
                        Cancel
                      </button>
                    )}
                    {['FAILED', 'CANCELLED'].includes(r.status) && (
                      <button
                        onClick={() => handleRetryRun(r.id)}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded text-[11px] font-medium"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Modal / Detail Drawer */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-semibold text-sm text-gray-900">Run Telemetry: {selectedRun.run_no}</h4>
                <p className="text-xs text-gray-500">Status: {selectedRun.status}</p>
              </div>
              <button onClick={() => setSelectedRun(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-gray-50 rounded border">
                <span className="text-gray-500 block text-[10px]">Fetched</span>
                <span className="font-bold text-gray-900">{selectedRun.images_fetched_count || 0}</span>
              </div>
              <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                <span className="text-emerald-700 block text-[10px]">Staged</span>
                <span className="font-bold text-emerald-800">{selectedRun.items_staged_count || 0}</span>
              </div>
              <div className="p-2 bg-amber-50 rounded border border-amber-100">
                <span className="text-amber-700 block text-[10px]">Duplicates</span>
                <span className="font-bold text-amber-800">{selectedRun.duplicates_skipped_count || 0}</span>
              </div>
              <div className="p-2 bg-rose-50 rounded border border-rose-100">
                <span className="text-rose-700 block text-[10px]">Filtered</span>
                <span className="font-bold text-rose-800">{selectedRun.license_rejected_count || 0}</span>
              </div>
            </div>

            {/* Logs Window */}
            <div className="flex-1 bg-gray-950 text-gray-200 font-mono text-xs p-4 rounded-md overflow-y-auto space-y-1 min-h-[220px]">
              {logsLoading ? (
                <div className="text-gray-500 italic">Streaming logs...</div>
              ) : logs.length === 0 ? (
                <div className="text-gray-500 italic">No log entries recorded for this run.</div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="leading-relaxed">
                    <span className="text-gray-500 mr-2">[{new Date(l.logged_at).toLocaleTimeString()}]</span>
                    <span className={l.level === 'ERROR' ? 'text-red-400' : l.level === 'WARN' ? 'text-yellow-400' : 'text-gray-300'}>
                      {l.message}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
