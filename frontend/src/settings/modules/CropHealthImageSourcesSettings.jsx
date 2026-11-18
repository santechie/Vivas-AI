import React, { useState } from 'react';
import {
  ImageDown, Globe, Layers, Sliders, Clock, CheckCircle2,
  Image as ImageIcon, Sparkles, ArrowLeft
} from 'lucide-react';

import OverviewTab from './chi/OverviewTab';
import SourcesTab from './chi/SourcesTab';
import MappingTab from './chi/MappingTab';
import ProfilesTab from './chi/ProfilesTab';
import RunsTab from './chi/RunsTab';
import ReviewTab from './chi/ReviewTab';
import PublishedTab from './chi/PublishedTab';
import MlTab from './chi/MlTab';

export default function CropHealthImageSourcesSettings({ apiBase, farmId, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'sources', label: 'Sources', icon: Globe },
    { id: 'mapping', label: 'Name & Crop Mapping', icon: Layers },
    { id: 'profiles', label: 'Import Profiles', icon: Sliders },
    { id: 'runs', label: 'Runs & Logs', icon: Clock },
    { id: 'review', label: 'Review Queue', icon: CheckCircle2 },
    { id: 'published', label: 'Published Images', icon: ImageIcon },
    { id: 'ml', label: 'AI Datasets & Models', icon: Sparkles },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[600px] flex flex-col">
      {/* Module Banner / Header */}
      <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 transition-colors"
              title="Back to Settings Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#1B7A2B] border border-emerald-100 flex items-center justify-center shrink-0">
            <ImageDown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              Crop Health Image Sources (CHI)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Licensed pest, disease & nutrient deficiency photos, human-in-the-loop review, and vision AI dataset builder.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#1B7A2B] border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1B7A2B]"></span>
            Active CHI Engine
          </span>
        </div>
      </div>

      {/* Tabs navigation bar */}
      <div className="border-b border-gray-200 bg-gray-50/60 px-5 flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-[#0F2D59] text-[#0F2D59] font-bold bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0F2D59]' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 bg-gray-50/30">
        {activeTab === 'overview' && (
          <OverviewTab apiBase={apiBase} onNavigateTab={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'sources' && <SourcesTab apiBase={apiBase} />}
        {activeTab === 'mapping' && <MappingTab apiBase={apiBase} />}
        {activeTab === 'profiles' && (
          <ProfilesTab apiBase={apiBase} onNavigateTab={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'runs' && <RunsTab apiBase={apiBase} />}
        {activeTab === 'review' && <ReviewTab apiBase={apiBase} />}
        {activeTab === 'published' && <PublishedTab apiBase={apiBase} />}
        {activeTab === 'ml' && <MlTab apiBase={apiBase} />}
      </div>
    </div>
  );
}
