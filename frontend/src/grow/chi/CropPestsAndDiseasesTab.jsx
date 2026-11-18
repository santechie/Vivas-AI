import React, { useState, useEffect } from 'react';
import {
  Bug, AlertTriangle, ShieldCheck, Image as ImageIcon,
  Layers, ExternalLink, RefreshCw, Stethoscope
} from 'lucide-react';
import ProblemImageGalleryModal from './ProblemImageGalleryModal';

/**
 * CropPestsAndDiseasesTab
 * Implements SRS 10.2: 7th tab in Crop Library crop 360 view (`active360Tab='pests-diseases'`).
 * Fetches problems from GET /api/chi/crops/:cropId/problems grouped by Pest, Disease, and Deficiency.
 */
export default function CropPestsAndDiseasesTab({
  cropId,
  cropName,
  apiBase = 'http://localhost:5001'
}) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProblem, setSelectedProblem] = useState(null);

  useEffect(() => {
    if (!cropId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadProblems = async () => {
      try {
        const token = typeof window !== 'undefined'
          ? (localStorage.getItem('vivas_token') || sessionStorage.getItem('vivas_token') || localStorage.getItem('token'))
          : '';

        const res = await fetch(`${apiBase}/api/chi/crops/${cropId}/problems`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        const data = await res.json();
        if (isMounted) {
          if (data.success) {
            setProblems(data.data || []);
          } else {
            setError(data.message || 'Failed to load crop problems');
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProblems();
    return () => { isMounted = false; };
  }, [cropId, apiBase]);

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
        <span className="text-xs">Loading crop pests, diseases & deficiencies...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
        {error}
      </div>
    );
  }

  const pests = problems.filter(p => p.problem_type === 'PEST');
  const diseases = problems.filter(p => p.problem_type === 'DISEASE');
  const deficiencies = problems.filter(p => p.problem_type === 'DEFICIENCY');

  const renderGroup = (title, items, iconColor, emptyText) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <h4 className="font-bold text-xs uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
          <Bug className={`w-3.5 h-3.5 ${iconColor}`} />
          {title} ({items.length})
        </h4>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(prob => (
            <div
              key={prob.problem_id}
              onClick={() => setSelectedProblem(prob)}
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:border-gray-400 transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-md bg-gray-100 overflow-hidden shrink-0 border border-gray-200 relative">
                  {prob.primary_image_url ? (
                    <img
                      src={prob.primary_image_url.startsWith('http') ? prob.primary_image_url : `${apiBase}${prob.primary_image_url}`}
                      alt={prob.problem_name || 'Problem'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  {prob.image_count > 0 && (
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded">
                      {prob.image_count}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h5 className="font-bold text-xs text-gray-900 truncate" title={prob.problem_name}>
                    {prob.problem_name}
                  </h5>
                  {prob.scientific_name && (
                    <p className="text-[11px] text-gray-500 italic truncate">{prob.scientific_name}</p>
                  )}
                  <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                    prob.potential_severity === 'HIGH' ? 'bg-red-50 text-red-700' :
                    prob.potential_severity === 'MODERATE' ? 'bg-amber-50 text-amber-700' :
                    'bg-green-50 text-green-700'
                  }`}>
                    {prob.potential_severity || 'MODERATE'} SEVERITY
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-medium">
                  {prob.remedy_count > 0 ? `${prob.remedy_count} remedies` : 'No remedy yet'}
                </span>
                <span className="text-blue-700 hover:underline flex items-center gap-0.5">
                  Gallery <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {problems.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <Bug className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">No linked pests or diseases recorded for this crop</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Map host plants and publish images in Crop Health Image Sources to link problems here.
          </p>
        </div>
      ) : (
        <>
          {renderGroup('Pests & Insects', pests, 'text-rose-700', 'No insect or mite pests recorded.')}
          {renderGroup('Fungal & Bacterial Diseases', diseases, 'text-amber-700', 'No diseases recorded.')}
          {renderGroup('Nutrient Deficiencies', deficiencies, 'text-blue-700', 'No nutrient deficiencies recorded.')}
        </>
      )}

      {/* Gallery Modal */}
      {selectedProblem && (
        <ProblemImageGalleryModal
          isOpen={Boolean(selectedProblem)}
          problemId={selectedProblem.problem_id}
          cropId={cropId}
          cropName={cropName}
          onClose={() => setSelectedProblem(null)}
          apiBase={apiBase}
        />
      )}
    </div>
  );
}
