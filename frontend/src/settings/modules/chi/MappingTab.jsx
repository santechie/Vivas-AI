import React, { useState, useEffect } from 'react';
import {
  Layers, Check, X, Search, RefreshCw, AlertTriangle,
  ArrowRight, ShieldCheck, CheckCircle2, Filter
} from 'lucide-react';
import { chiApi } from './chiApi';

export default function MappingTab({ apiBase }) {
  const [activeSubTab, setActiveSubTab] = useState('taxa'); // 'taxa' | 'crops'
  const [taxonMaps, setTaxonMaps] = useState([]);
  const [cropMaps, setCropMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeSubTab === 'taxa') {
        const res = await chiApi.getTaxonMaps({}, apiBase);
        setTaxonMaps(res.data || []);
      } else {
        const res = await chiApi.getCropMaps({}, apiBase);
        setCropMaps(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load mapping data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [apiBase, activeSubTab]);

  const handleUpdateTaxonStatus = async (id, status) => {
    try {
      await chiApi.updateTaxonMap(id, { status }, apiBase);
      showToast('success', `Mapping marked as ${status}`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const filteredTaxonMaps = taxonMaps.filter((item) => {
    const matchesSearch =
      item.scientific_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.problem_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.source_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCropMaps = cropMaps.filter((item) => {
    return (
      item.source_crop_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.crop_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.scientific_name?.toLowerCase().includes(search.toLowerCase())
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

      {/* Sub Tabs Selector */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveSubTab('taxa')}
            className={`pb-2 text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${
              activeSubTab === 'taxa'
                ? 'text-[#0F2D59] border-b-2 border-[#0F2D59]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Taxon → Problem Mapping
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full">
              {taxonMaps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('crops')}
            className={`pb-2 text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${
              activeSubTab === 'crops'
                ? 'text-[#0F2D59] border-b-2 border-[#0F2D59]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-700" />
            Host Plant → Crop Mapping
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full">
              {cropMaps.length}
            </span>
          </button>
        </div>

        {/* Filter / Search input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scientific name, problem, or crop..."
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs w-64 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {activeSubTab === 'taxa' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 border border-gray-300 rounded text-xs text-gray-700 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROPOSED">Proposed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          )}

          <button
            onClick={loadData}
            className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
            title="Reload table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">Loading mappings...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
          {error}
        </div>
      ) : activeSubTab === 'taxa' ? (
        /* Taxon Mapping Table */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#0F2D59] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">External Scientific Name</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Mapped Vivas Problem</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTaxonMaps.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                    No taxon mappings found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTaxonMaps.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 italic">{row.scientific_name}</div>
                      <div className="text-[11px] text-gray-400">ID: {row.external_taxon_id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{row.source_name || row.source_code}</td>
                    <td className="px-4 py-3">
                      {row.is_healthy_class ? (
                        <span className="text-emerald-700 font-medium">Healthy Leaf / Control Group</span>
                      ) : row.problem_name ? (
                        <div>
                          <div className="font-medium text-gray-900">{row.problem_name}</div>
                          {row.problem_scientific_name && (
                            <div className="text-[11px] text-gray-500 italic">{row.problem_scientific_name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-700 italic font-medium">Unmapped</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                        {row.problem_type || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.match_method}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        row.status === 'PROPOSED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {row.status !== 'CONFIRMED' && (
                        <button
                          onClick={() => handleUpdateTaxonStatus(row.id, 'CONFIRMED')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded text-[11px] font-medium transition"
                          title="Confirm Mapping"
                        >
                          Confirm
                        </button>
                      )}
                      {row.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleUpdateTaxonStatus(row.id, 'REJECTED')}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded text-[11px] font-medium transition"
                          title="Reject Mapping"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Host Plant Crop Mapping Table */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#0F2D59] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Source Host Name</th>
                <th className="px-4 py-3">Normalized Scientific Name</th>
                <th className="px-4 py-3">Mapped Crop in Library</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCropMaps.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-400 italic">
                    No host plant crop mappings found.
                  </td>
                </tr>
              ) : (
                filteredCropMaps.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{row.source_crop_name}</td>
                    <td className="px-4 py-3 italic text-gray-600">{row.scientific_name}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-emerald-800">{row.crop_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
