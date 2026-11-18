import React from 'react';
import { ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

/**
 * ImageCredit component (SRS 10.1 & docs/UI_STYLE_GUIDE.md)
 * Renders consistent attribution, copyright, and license badge for all galleries
 */
export default function ImageCredit({
  creator,
  license,
  sourceName,
  sourceUrl,
  className = ''
}) {
  const getLicenseBadgeStyle = (lic) => {
    switch (lic) {
      case 'CC0':
      case 'CC-BY':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CC-BY-SA':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CC-BY-NC':
      case 'CC-BY-NC-SA':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PARTNER_AGREEMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className={`text-xs text-gray-600 flex flex-wrap items-center justify-between gap-1.5 py-1 ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0 truncate">
        {creator ? (
          <span className="font-medium text-gray-800 truncate" title={creator}>
            © {creator}
          </span>
        ) : (
          <span className="text-gray-500 italic">Unknown creator</span>
        )}
        {sourceName && (
          <span className="text-gray-400">· {sourceName}</span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {license && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider border uppercase ${getLicenseBadgeStyle(license)}`}
            title={`License: ${license}`}
          >
            {license}
          </span>
        )}

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors p-0.5"
            title="View original record"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
