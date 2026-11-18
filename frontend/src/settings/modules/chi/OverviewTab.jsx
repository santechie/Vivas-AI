import React, { useState, useEffect } from 'react';
import {
  Layers, Globe, CheckCircle2, Clock, Image as ImageIcon,
  AlertTriangle, RefreshCw, HardDrive, ArrowRight, Play, ExternalLink
} from 'lucide-react';
import { chiApi } from './chiApi';

export default function OverviewTab({ apiBase, onNavigateTab }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovData, runsData] = await Promise.all([
        chiApi.getOverview(apiBase),
        chiApi.getRuns({ page_size: 5 }, apiBase).catch(() => ({ data: [] }))
      ]);
      setData(ovData.data || {});
      setRecentRuns(runsData.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load module overview metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [apiBase]);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[320px] text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-medium">Loading Crop Health Image Sources metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 m-6 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Failed to Load Overview</h4>
            <p className="text-xs mt-1 text-red-600">{error}</p>
          </div>
        </div>
        <button
          onClick={loadOverview}
          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards Row (Styled to Option C with 4px domain bottom borders) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Agronomy / Growth (Green) */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm border-b-4 border-b-[#1B7A2B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Imported Media</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-gray-900">{data?.imported_media_count ?? 0}</span>
            <span className="text-xs text-gray-500 ml-2">published images</span>
          </div>
          <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Active in Crop Library & Diagnosis</span>
          </div>
        </div>

        {/* Card 2: Enterprise / Sources (Navy) */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm border-b-4 border-b-[#0F2D59]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Licensed Sources</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-900 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-gray-900">{data?.total_sources ?? 0}</span>
            <span className="text-xs text-gray-500 ml-2">connectors configured</span>
          </div>
          <div className="mt-2 text-xs text-blue-800 flex items-center justify-between">
            <span>iNat, GBIF, Wikimedia, EPPO</span>
            <button
              onClick={() => onNavigateTab('sources')}
              className="hover:underline flex items-center gap-0.5 text-blue-900 font-medium"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Review Queue (Royal Crimson Maroon) */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm border-b-4 border-b-[#7A1532]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Review Queue</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-[#7A1532]">{data?.staging_pending_review ?? 0}</span>
            <span className="text-xs text-gray-500 ml-2">pending approval</span>
          </div>
          <div className="mt-2 text-xs text-[#7A1532] flex items-center justify-between">
            <span>Staged photos awaiting label verification</span>
            <button
              onClick={() => onNavigateTab('review')}
              className="hover:underline flex items-center gap-0.5 font-medium"
            >
              Review <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Soil & Host Mapping (Warm Umber Brown) */}
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm border-b-4 border-b-[#733D1B]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mapped Taxa</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-900 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-gray-900">{data?.confirmed_taxon_maps ?? 0}</span>
            <span className="text-xs text-gray-500 ml-2">taxa confirmed</span>
          </div>
          <div className="mt-2 text-xs text-amber-900 flex items-center justify-between">
            <span>{data?.confirmed_crop_maps ?? 0} host crops mapped</span>
            <button
              onClick={() => onNavigateTab('mapping')}
              className="hover:underline flex items-center gap-0.5 font-medium"
            >
              Maps <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Storage and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              Imported Storage Quota & Allocation
            </h3>
            <span className="text-xs text-gray-500">Path: backend/uploads/crop_health/imported</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Storage Utilization</span>
                <span className="font-medium text-gray-900">Normal (&lt; 20% limit)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div className="bg-[#1B7A2B] h-2.5 rounded-full" style={{ width: '12%' }}></div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <span className="text-gray-500 block">Staged Images</span>
                <span className="font-semibold text-gray-800 text-sm">{data?.staging_pending_review ?? 0}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <span className="text-gray-500 block">Published Gallery</span>
                <span className="font-semibold text-gray-800 text-sm">{data?.imported_media_count ?? 0}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-100">
                <span className="text-gray-500 block">Active Runs</span>
                <span className="font-semibold text-gray-800 text-sm">{data?.active_runs ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Automated Actions</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Launch pre-configured query filters, sync newly registered iNaturalist research sightings, or process staged batches.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <button
              onClick={() => onNavigateTab('profiles')}
              className="w-full py-2 px-3 bg-[#1B7A2B] hover:bg-[#156724] text-white text-xs font-medium rounded flex items-center justify-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Run Import Profile
            </button>
            <button
              onClick={() => onNavigateTab('review')}
              className="w-full py-2 px-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-medium rounded flex items-center justify-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Open Review Queue
            </button>
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Recent Import Executions</h3>
          <button
            onClick={() => onNavigateTab('runs')}
            className="text-xs text-[#0F2D59] hover:underline font-medium flex items-center gap-1"
          >
            View All Runs <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentRuns.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No recent import runs recorded. Configure a source and launch a run profile to start importing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#0F2D59] text-white uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Run #</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Fetched</th>
                  <th className="px-4 py-3">Staged</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">{run.run_no}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{run.source_name || run.source_code}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        run.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        run.status === 'RUNNING' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        run.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{run.images_fetched_count ?? 0}</td>
                    <td className="px-4 py-3 font-medium text-emerald-700">{run.items_staged_count ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {run.created_at ? new Date(run.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
