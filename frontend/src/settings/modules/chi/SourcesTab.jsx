import React, { useState, useEffect } from 'react';
import {
  Globe, Plus, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Sliders, ShieldCheck, ExternalLink, Power, Check, X
} from 'lucide-react';
import { chiApi } from './chiApi';

export default function SourcesTab({ apiBase }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [toast, setToast] = useState(null);

  // Edit / Create modal state
  const [selectedSource, setSelectedSource] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSources = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chiApi.getSources(apiBase);
      setSources(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load image sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [apiBase]);

  const handleTestConnection = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'test' }));
    try {
      const res = await chiApi.testSource(id, apiBase);
      if (res.data?.ok) {
        showToast('success', `Connection successful (${res.data.status})`);
      } else {
        showToast('error', `Connection test failed: ${res.data?.error || 'Unknown error'}`);
      }
      loadSources();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleAcceptTerms = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'terms' }));
    try {
      await chiApi.acceptSourceTerms(id, apiBase);
      showToast('success', 'License terms acknowledged and accepted');
      loadSources();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleToggleActive = async (source) => {
    const action = source.is_active ? 'deactivate' : 'activate';
    setActionLoading(prev => ({ ...prev, [source.id]: action }));
    try {
      if (source.is_active) {
        await chiApi.deactivateSource(source.id, apiBase);
        showToast('success', `${source.name} deactivated`);
      } else {
        await chiApi.activateSource(source.id, apiBase);
        showToast('success', `${source.name} activated`);
      }
      loadSources();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [source.id]: null }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast Banner */}
      {toast && (
        <div className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Licensed Data Sources</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage connectors, verify remote API health, review copyright compliance, and set hourly download caps.
          </p>
        </div>
        <button
          onClick={loadSources}
          className="p-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-600 text-xs flex items-center gap-1.5 transition"
          title="Refresh Sources"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Sources List */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">Loading sources...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded border border-red-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          {error}
        </div>
      ) : sources.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
          <Globe className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">No image sources registered</p>
          <p className="text-xs mt-1">Run migration 004 to seed standard connectors.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sources.map((src) => {
            const isTesting = actionLoading[src.id] === 'test';
            const isActivating = actionLoading[src.id] === 'activate' || actionLoading[src.id] === 'deactivate';
            const isTerms = actionLoading[src.id] === 'terms';

            return (
              <div
                key={src.id}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-gray-900">{src.name}</h4>
                      <span className="font-mono text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase">
                        {src.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        src.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {src.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        src.trust_level === 'HIGH' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        src.trust_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>
                        {src.trust_level} Trust
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 flex items-center gap-2">
                      <span>Connector: <strong>{src.connector_type}</strong></span>
                      <span>·</span>
                      <span>Mode: <strong>{src.usage_mode}</strong></span>
                      <span>·</span>
                      <span>Max/Day: <strong>{src.max_requests_per_day} req</strong></span>
                    </p>

                    <div className="text-[11px] text-gray-500 pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {src.terms_accepted_at ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terms Accepted
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Terms Acceptance Required
                        </span>
                      )}

                      {src.last_test_at && (
                        <span>
                          Last Checked: {new Date(src.last_test_at).toLocaleTimeString()} ({src.last_test_ok ? 'Healthy' : 'Failed'})
                        </span>
                      )}

                      {src.terms_url && (
                        <a
                          href={src.terms_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline flex items-center gap-0.5"
                        >
                          Licence Policy <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTestConnection(src.id)}
                      disabled={isTesting}
                      className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-medium flex items-center gap-1 transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                      Test Connection
                    </button>

                    {!src.terms_accepted_at && (
                      <button
                        onClick={() => handleAcceptTerms(src.id)}
                        disabled={isTerms}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded text-xs font-medium flex items-center gap-1 transition"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Accept Terms
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleActive(src)}
                      disabled={isActivating || (!src.is_active && !src.terms_accepted_at)}
                      title={!src.terms_accepted_at ? 'Accept terms before activating' : ''}
                      className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition ${
                        src.is_active
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-[#1B7A2B] hover:bg-[#156724] text-white disabled:opacity-50'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {src.is_active ? 'Deactivate' : 'Activate'}
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
