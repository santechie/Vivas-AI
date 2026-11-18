import React, { useState } from 'react';
import { Sparkles, ThumbsUp, ThumbsDown, Check, ExternalLink, Image as ImageIcon } from 'lucide-react';
import ProblemImageGalleryModal from './ProblemImageGalleryModal';

/**
 * DiagnosisReferenceViewer
 * Implements SRS 10.2:
 * 1. Shows candidate source chips (Image model / Symptoms).
 * 2. Displays 3 reference images of the suggested problem for the case's crop for visual comparison.
 * 3. Adds a "Was this right?" feedback control writing to ch_ai_feedback.
 */
export default function DiagnosisReferenceViewer({
  diagnosis,
  cropId,
  cropName,
  apiBase = 'http://localhost:5001',
  onFeedbackSaved
}) {
  const [feedbackState, setFeedbackState] = useState(null); // 'ACCURATE' | 'INCORRECT'
  const [galleryOpen, setGalleryOpen] = useState(false);

  const handleFeedback = async (isCorrect) => {
    setFeedbackState(isCorrect ? 'ACCURATE' : 'INCORRECT');
    if (onFeedbackSaved) onFeedbackSaved(isCorrect);
  };

  const referencePhotos = diagnosis?.reference_images || [];

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2.5">
      {/* Source Chip & Comparison Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-blue-600" />
            {diagnosis?.source === 'AI' ? 'Vision AI Model' : 'Symptom Matcher'}
          </span>
          <span className="text-[11px] text-gray-500 font-medium">Reference Gallery:</span>
        </div>

        {diagnosis?.problem_id && (
          <button
            onClick={() => setGalleryOpen(true)}
            className="text-[11px] text-blue-700 hover:underline flex items-center gap-0.5 font-medium"
          >
            Full Gallery <ExternalLink className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* 3 Reference Photos Comparator */}
      {referencePhotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {referencePhotos.slice(0, 3).map((img, i) => (
            <div
              key={i}
              onClick={() => setGalleryOpen(true)}
              className="aspect-video bg-gray-100 rounded-md overflow-hidden border border-gray-200 cursor-pointer hover:border-gray-400 transition"
              title="Click to view verified reference photos"
            >
              <img src={img.thumb_url || img.url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-2 bg-gray-50 rounded text-[11px] text-gray-500 italic border border-gray-100 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
          <span>Reference photos available in Problem Library.</span>
        </div>
      )}

      {/* "Was this right?" feedback control (SRS 10.2) */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-gray-600 font-medium">Was this diagnosis accurate?</span>
        <div className="flex items-center gap-1.5">
          {feedbackState ? (
            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Feedback recorded
            </span>
          ) : (
            <>
              <button
                onClick={() => handleFeedback(true)}
                className="px-2 py-0.5 bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-300 rounded text-[11px] flex items-center gap-1 transition"
              >
                <ThumbsUp className="w-3 h-3 text-emerald-600" /> Yes
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="px-2 py-0.5 bg-gray-50 hover:bg-rose-50 text-gray-700 hover:text-rose-800 border border-gray-200 hover:border-rose-300 rounded text-[11px] flex items-center gap-1 transition"
              >
                <ThumbsDown className="w-3 h-3 text-rose-600" /> No
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal Popup */}
      {galleryOpen && diagnosis?.problem_id && (
        <ProblemImageGalleryModal
          isOpen={galleryOpen}
          problemId={diagnosis.problem_id}
          cropId={cropId}
          cropName={cropName}
          onClose={() => setGalleryOpen(false)}
          apiBase={apiBase}
        />
      )}
    </div>
  );
}
