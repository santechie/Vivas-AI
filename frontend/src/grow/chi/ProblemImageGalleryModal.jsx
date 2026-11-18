import React, { useState, useEffect } from 'react';
import {
  X, Image as ImageIcon, ExternalLink, Filter, AlertCircle,
  ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert
} from 'lucide-react';
import ImageCredit from '../../components/ImageCredit';

/**
 * ProblemImageGalleryModal
 * Implements SRS 10.2: Gallery with ImageCredit in problem detail,
 * plant-part filters, full-size viewer, and "No remedy yet for <crop>" warning banner.
 */
export default function ProblemImageGalleryModal({
  problemId,
  cropId,
  cropName,
  isOpen,
  onClose,
  apiBase = 'http://localhost:5001'
}) {
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedPartFilter, setSelectedPartFilter] = useState('ALL');

  useEffect(() => {
    if (!isOpen || !problemId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchDetail = async () => {
      try {
        const url = `${apiBase}/api/ch/problems/${problemId}${cropId ? `?crop_id=${cropId}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted) {
          if (data.success) {
            setProblem(data.data);
            setSelectedPhotoIndex(0);
          } else {
            setError(data.message || 'Failed to load problem media');
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => { isMounted = false; };
  }, [isOpen, problemId, cropId, apiBase]);

  if (!isOpen) return null;

  const mediaList = (problem?.media || []).filter(m => {
    if (selectedPartFilter === 'ALL') return true;
    return m.plant_part_label?.toUpperCase() === selectedPartFilter.toUpperCase();
  });

  const activePhoto = mediaList[selectedPhotoIndex] || mediaList[0];
  const hasRemedies = (problem?.control_measures || []).length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                problem?.problem_type === 'PEST' ? 'bg-red-100 text-red-800' :
                problem?.problem_type === 'DISEASE' ? 'bg-amber-100 text-amber-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {problem?.problem_type || 'Problem'}
              </span>
              <h3 className="font-bold text-sm text-gray-900">{problem?.name || 'Problem Gallery'}</h3>
            </div>
            {problem?.scientific_name && (
              <p className="text-xs text-gray-500 italic mt-0.5">{problem.scientific_name}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Remedy gap warning banner (SRS 9.6 & 10.2: agronomist warning) */}
        {!hasRemedies && cropName && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Remedy Gap Warning:</strong> No active control measures or remedies recorded yet for <strong>{cropName}</strong>.
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="p-16 text-center text-gray-400 text-xs">
              Loading verified reference photographs...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              {error}
            </div>
          ) : mediaList.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-500">
              <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">No reference images attached</p>
              <p className="text-xs mt-1">Approve images in the CHI Review Queue to populate this gallery.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main Full Viewer */}
              <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center min-h-[360px] max-h-[460px]">
                <img
                  src={activePhoto?.url?.startsWith('http') ? activePhoto.url : `${apiBase}${activePhoto?.url || ''}`}
                  alt={problem?.name}
                  className="max-h-[460px] w-auto object-contain"
                />

                {mediaList.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedPhotoIndex(prev => Math.max(0, prev - 1))}
                      disabled={selectedPhotoIndex === 0}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full disabled:opacity-20 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedPhotoIndex(prev => Math.min(mediaList.length - 1, prev + 1))}
                      disabled={selectedPhotoIndex === mediaList.length - 1}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full disabled:opacity-20 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {activePhoto?.is_primary && (
                  <span className="absolute top-2 left-2 bg-[#1B7A2B] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    PRIMARY IMAGE
                  </span>
                )}
              </div>

              {/* Image Credit & Licence */}
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <ImageCredit
                  creator={activePhoto?.source_credit || activePhoto?.creator_name}
                  license={activePhoto?.license_code}
                  sourceName={activePhoto?.source_name}
                  sourceUrl={activePhoto?.source_url}
                />
              </div>

              {/* Thumbnails Row */}
              {mediaList.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {mediaList.map((m, idx) => (
                    <button
                      key={m.id || idx}
                      onClick={() => setSelectedPhotoIndex(idx)}
                      className={`relative shrink-0 w-20 h-14 rounded-md overflow-hidden border-2 transition-all ${
                        selectedPhotoIndex === idx
                          ? 'border-[#1B7A2B] shadow-md scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                    <img
                      src={(m.thumb_url || m.url)?.startsWith('http') ? (m.thumb_url || m.url) : `${apiBase}${m.thumb_url || m.url}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>{mediaList.length} verified reference photos</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
