import React, { useState, useEffect } from 'react';
import {
  Sparkles, Database, Layers, CheckCircle2, AlertTriangle,
  ArrowRight, Download, RefreshCw, Plus, ArrowUpRight, RotateCcw
} from 'lucide-react';
import chiApi from './chiApi.js';

export default function MlTab({ apiBase }) {
  const [activeTab, setActiveTab] = useState('snapshots'); // 'snapshots' | 'models'
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [shadowReport, setShadowReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dsRes, modRes, repRes] = await Promise.all([
        chiApi.get('/ml/datasets', apiBase).catch(() => ({ data: [] })),
        chiApi.get('/ml/models', apiBase).catch(() => ({ data: [] })),
        chiApi.get('/ml/shadow-report', apiBase).catch(() => ({ data: null }))
      ]);
      setDatasets(dsRes.data || []);
      setModels(modRes.data || []);
      setShadowReport(repRes.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBuildSnapshot = async () => {
    setBuilding(true);
    setMessage(null);
    try {
      const ver = `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}-${Date.now().toString().slice(-4)}`;
      const res = await chiApi.post('/ml/datasets', { version: ver }, apiBase);
      setMessage(`Snapshot ${res.data?.version || ver} created successfully.`);
      await loadData();
    } catch (err) {
      setError(`Failed to build snapshot: ${err.message}`);
    } finally {
      setBuilding(false);
    }
  };

  const handlePromote = async (modelId) => {
    setMessage(null);
    try {
      const res = await chiApi.post(`/ml/models/${modelId}/promote`, {}, apiBase);
      setMessage(`Model promoted to ${res.data?.status || 'new status'}.`);
      await loadData();
    } catch (err) {
      setError(`Failed to promote model: ${err.message}`);
    }
  };

  const handleRollback = async (modelId) => {
    setMessage(null);
    try {
      const res = await chiApi.post(`/ml/models/${modelId}/rollback`, {}, apiBase);
      setMessage(`Model rollback successful. ${res.data?.version} is now ACTIVE.`);
      await loadData();
    } catch (err) {
      setError(`Failed to rollback: ${err.message}`);
    }
  };

  const activeModel = models.find(m => m.status === 'ACTIVE') || shadowReport?.active_model;
  const shadowModel = models.find(m => m.status === 'SHADOW') || shadowReport?.shadow_model;

  return (
    <div className="p-6 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">AI Datasets & Computer Vision Models</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Snapshot training matrices, manage classifier versions, track shadow evaluations, and export manifest feeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-800 rounded border hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            Vision Classifier: {activeModel ? 'Active' : 'Unset'}
          </span>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
          {error}
        </div>
      )}

      {/* Domain Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm border-b-4 border-b-[#0F2D59]">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase">
            <span>Current Vision Engine</span>
            <Sparkles className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-gray-900">
              {activeModel ? `${activeModel.name} (${activeModel.version})` : 'Baseline Symptom AI'}
            </span>
            <span className="block text-xs text-emerald-700 mt-0.5">
              {activeModel ? 'Status: ACTIVE · Blended 70/30' : 'Symptom scoring active'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm border-b-4 border-b-[#1B7A2B]">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase">
            <span>Training-Eligible Pool</span>
            <Database className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-gray-900">
              {datasets.length > 0 ? `${datasets.reduce((acc, d) => acc + (d.image_count || 0), 0)} images` : 'Eligible Catalog'}
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">
              {datasets.length} snapshot manifests built
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm border-b-4 border-b-[#7A1532]">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase">
            <span>Shadow Evaluation</span>
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-gray-900">
              {shadowModel ? `${shadowModel.version} (Shadow)` : 'No active shadow'}
            </span>
            <span className="block text-xs text-rose-700 mt-0.5">
              {shadowReport?.metrics ? `${shadowReport.metrics.total_evaluations} cases evaluated` : 'Monitoring real-world cases'}
            </span>
          </div>
        </div>
      </div>

      {/* Subtab selection */}
      <div className="flex items-center gap-4 border-b border-gray-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`pb-2 border-b-2 transition ${activeTab === 'snapshots' ? 'border-[#0F2D59] text-[#0F2D59]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Dataset Snapshots ({datasets.length})
        </button>
        <button
          onClick={() => setActiveTab('models')}
          className={`pb-2 border-b-2 transition ${activeTab === 'models' ? 'border-[#0F2D59] text-[#0F2D59]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Model Registry & Deployment ({models.length})
        </button>
      </div>

      {activeTab === 'snapshots' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Training Snapshot Manifests</h4>
            <button
              onClick={handleBuildSnapshot}
              disabled={building}
              className="px-3 py-1.5 bg-[#0F2D59] hover:bg-[#0c2447] text-white text-xs font-semibold rounded transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              {building ? 'Building...' : 'Build New Snapshot'}
            </button>
          </div>

          <div className="border rounded-md overflow-hidden text-xs">
            <table className="w-full text-left text-gray-700">
              <thead className="bg-[#0F2D59] text-white uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Snapshot Version</th>
                  <th className="px-4 py-2.5">Classes</th>
                  <th className="px-4 py-2.5">Total Images</th>
                  <th className="px-4 py-2.5">Field Ratio</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Manifest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {datasets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      No dataset snapshots built yet. Click "Build New Snapshot" to create the first training manifest.
                    </td>
                  </tr>
                ) : (
                  datasets.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono font-medium text-gray-900">{d.version}</td>
                      <td className="px-4 py-2.5">{d.class_count} classes</td>
                      <td className="px-4 py-2.5">{d.image_count} images</td>
                      <td className="px-4 py-2.5 text-emerald-800 font-medium">{Math.round((d.field_share || 0) * 100)}% Field</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.status === 'READY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <a
                          href={`${apiBase}/ml/datasets/${d.id}/manifest`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-900 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <Download className="w-3 h-3" /> Download CSV
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'models' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900">Model Registry & Evaluation</h4>
          </div>

          <div className="border rounded-md overflow-hidden text-xs">
            <table className="w-full text-left text-gray-700">
              <thead className="bg-[#0F2D59] text-white uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Model Name</th>
                  <th className="px-4 py-2.5">Version</th>
                  <th className="px-4 py-2.5">Task</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Promoted At</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {models.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                      No models registered yet.
                    </td>
                  </tr>
                ) : (
                  models.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{m.name}</td>
                      <td className="px-4 py-2.5 font-mono">{m.version}</td>
                      <td className="px-4 py-2.5">{m.task}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : m.status === 'SHADOW'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {m.promoted_at ? new Date(m.promoted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right space-x-2">
                        {m.status === 'CANDIDATE' && (
                          <button
                            onClick={() => handlePromote(m.id)}
                            className="text-xs text-blue-700 hover:underline font-semibold"
                          >
                            Promote to SHADOW
                          </button>
                        )}
                        {m.status === 'SHADOW' && (
                          <button
                            onClick={() => handlePromote(m.id)}
                            className="text-xs text-emerald-700 hover:underline font-semibold"
                          >
                            Promote to ACTIVE
                          </button>
                        )}
                        {m.status === 'RETIRED' && (
                          <button
                            onClick={() => handleRollback(m.id)}
                            className="text-xs text-amber-700 hover:underline font-semibold flex items-center gap-1 ml-auto"
                          >
                            <RotateCcw className="w-3 h-3" /> Rollback to This
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
