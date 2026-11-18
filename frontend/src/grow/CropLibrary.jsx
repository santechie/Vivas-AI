import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, Copy, Filter, X, ChevronDown, ChevronUp, Check,
  Leaf, Sprout, Sparkles, Tag, Layers, Edit3, Trash2, Globe,
  ShieldCheck, AlertCircle, Save, ArrowRight, Eye, RefreshCw,
  LayoutGrid, Table, IndianRupee, Calendar, Ruler, Package, Clock,
  Building2, CheckCircle2, SlidersHorizontal, AlertTriangle, ArrowUpRight,
  Sun, Thermometer, Droplets, User, Zap, Image, Upload, Link as LinkIcon, Camera, Info
} from 'lucide-react';

import PlantingMethodSelect, { ALL_PLANTING_METHODS } from './PlantingMethodSelect';
import CropPestsAndDiseasesTab from './chi/CropPestsAndDiseasesTab';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

const PRESET_CROP_IMAGES = [
  { name: 'Tomato', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80' },
  { name: 'Lettuce / Greens', url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=500&auto=format&fit=crop&q=80' },
  { name: 'Carrot', url: 'https://images.unsplash.com/photo-1598170845058-12ef4a457939?w=500&auto=format&fit=crop&q=80' },
  { name: 'Bell Pepper', url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&auto=format&fit=crop&q=80' },
  { name: 'Cucumber', url: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=500&auto=format&fit=crop&q=80' },
  { name: 'Spinach', url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&auto=format&fit=crop&q=80' }
];

const INITIAL_NEW_CROP_FORM = {
  name: '',
  custom_name: '',
  scientific_name: '',
  abbreviation: '',
  crop_family: 'Solanaceae',
  genus: '',
  species: '',
  category: 'Vegetables',
  image_url: '',
  icon: '🌱',
  color: '#16a34a',
  description: '',
  specialised_plant_part: '',
  crop_type: 'Annual',
  variety_name: 'Standard',
  supplier: '',
  days_to_maturity: 65,
  planting_method: 'Transplant',
  tray_size: '72-cell',
  seeds_per_cell: 1,
  days_in_nursery: 28,
  spacing_unit: 'mtr',
  in_row_spacing_in: 0.35,
  row_spacing_in: 0.5,
  expected_yield_per_acre: 12.8,
  expected_yield_per_ft: 1.5,
  yield_unit: 'Ton',
  default_price_per_unit: 50.0,
  // Seed Information
  seeds_per_oz: 1000,
  seeds_per_gram: 35,
  seed_viability_years: 3,
  seed_type: 'Raw',
  seed_size: 'Medium',
  // Crop Attributes
  growth_habit: 'Determinate',
  plant_height_in: 36,
  plant_spread_in: 24,
  crop_lifecycle: 'Annual',
  harvest_part: 'Fruit',
  harvest_method: 'Continuous Pick',
  // Environmental & Advanced Preferences
  water_needs: 'Moderate (1-1.5 in/wk)',
  ideal_temp_f: '65-85°F',
  soil_type: 'Well-drained Loam',
  nutrient_demand: 'Heavy Feeder',
  companion_plants: 'Basil, Marigolds, Carrots',
  incompatible_plants: 'Fennel, Potatoes, Brassicas',
  common_pests: 'Aphids, Hornworms, Flea Beetles',
  disease_resistance: 'V, F, N, T',
  nursery_notes: '',
  field_notes: '',
  harvest_notes: ''
};

function CropImageUploader({ imageUrl, onImageChange, disabled = false, showToast }) {
  const [activeSourceTab, setActiveSourceTab] = useState('upload');
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (!file) return;
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawResult = e.target.result;
      if (!rawResult) {
        setIsUploading(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          onImageChange(compressedBase64);

          fetch(`${API_BASE}/crops/upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: compressedBase64, filename: file.name })
          })
          .then(res => res.json())
          .then(data => {
            setIsUploading(false);
            if (data.success && (data.relative_url || data.image_url)) {
              onImageChange(data.relative_url || data.image_url);
              if (showToast) showToast('Crop picture uploaded successfully!');
            } else {
              if (showToast) showToast('Loaded compressed local image');
            }
          })
          .catch(err => {
            setIsUploading(false);
            console.warn('Server image upload fallback:', err);
            if (showToast) showToast('Loaded compressed local image preview');
          });
        } catch (err) {
          setIsUploading(false);
          onImageChange(rawResult);
          console.warn('Canvas resize fallback:', err);
        }
      };
      img.onerror = () => {
        setIsUploading(false);
        onImageChange(rawResult);
      };
      img.src = rawResult;
    };
    reader.onerror = () => setIsUploading(false);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Image size={16} color="#16a34a" />
          <span>Crop Picture / Image</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '10px' }}>JPEG, PNG</span>
        </div>

        {imageUrl && !disabled && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: 600, color: '#0284c7', cursor: 'pointer' }}
            >
              <RefreshCw size={12} />
              <span>Change Image</span>
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={() => onImageChange('')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', fontSize: '12px', fontWeight: 600, color: '#ef4444', cursor: 'pointer' }}
            >
              <Trash2 size={12} />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {imageUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #16a34a', backgroundColor: '#ffffff', position: 'relative', flexShrink: 0 }}>
            <img src={imageUrl} alt="Crop preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              {isUploading ? 'Uploading Image...' : 'Selected Crop Picture'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all', marginTop: '2px' }}>
              {imageUrl.startsWith('data:') ? '[Base64 Compressed Preview]' : imageUrl}
            </div>
            {!disabled && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #16a34a', background: '#16a34a', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: isUploading ? 0.7 : 1 }}
                >
                  {isUploading ? 'Uploading...' : 'Change Image'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {!disabled && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveSourceTab('upload')}
                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: activeSourceTab === 'upload' ? '#ffffff' : 'transparent', color: activeSourceTab === 'upload' ? '#16a34a' : '#64748b' }}
              >
                📁 Local Upload
              </button>
              <button
                type="button"
                onClick={() => setActiveSourceTab('url')}
                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: activeSourceTab === 'url' ? '#ffffff' : 'transparent', color: activeSourceTab === 'url' ? '#0284c7' : '#64748b' }}
              >
                🔗 Image URL
              </button>
              <button
                type="button"
                onClick={() => setActiveSourceTab('presets')}
                style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', backgroundColor: activeSourceTab === 'presets' ? '#ffffff' : 'transparent', color: activeSourceTab === 'presets' ? '#9333ea' : '#64748b' }}
              >
                🌟 Stock Presets
              </button>
            </div>
          )}

          {activeSourceTab === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => !disabled && !isUploading && fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '20px', textAlign: 'center',
                backgroundColor: '#f8fafc', cursor: (disabled || isUploading) ? 'default' : 'pointer', transition: 'all 0.2s ease'
              }}
            >
              <Upload size={24} color="#16a34a" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                {isUploading ? 'Processing & Uploading Image...' : 'Click or Drag & Drop Crop Image Here'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Supports JPEG (.jpg, .jpeg) and PNG (.png) formats
              </div>
            </div>
          )}

          {activeSourceTab === 'url' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                placeholder="Paste crop picture URL (e.g. https://.../image.jpg)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={() => {
                  if (urlInput.trim()) {
                    onImageChange(urlInput.trim());
                    if (showToast) showToast('Image URL applied!');
                  }
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                Apply
              </button>
            </div>
          )}

          {activeSourceTab === 'presets' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
              {PRESET_CROP_IMAGES.map((p) => (
                <div
                  key={p.name}
                  onClick={() => {
                    onImageChange(p.url);
                    if (showToast) showToast(`Selected preset for ${p.name}`);
                  }}
                  style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', textAlign: 'center', background: '#f8fafc' }}
                >
                  <img src={p.url} alt={p.name} style={{ width: '100%', height: '54px', objectFit: 'cover' }} />
                  <div style={{ padding: '4px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>{p.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchableFamilySelect({ value, onChange, options, disabled, style }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const containerRef = React.useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase().trim()));
  }, [searchTerm, options]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          disabled={disabled}
          value={searchTerm}
          placeholder="Select or type family..."
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          style={{
            width: '100%',
            padding: '8px 28px 8px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '13px',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
            outline: 'none',
            color: '#1e293b',
            boxSizing: 'border-box',
            ...style
          }}
        />
        <ChevronDown
          size={14}
          color="#64748b"
          onClick={() => {
            if (!disabled) setIsOpen(prev => !prev);
          }}
          style={{
            position: 'absolute',
            right: '8px',
            pointerEvents: disabled ? 'none' : 'auto',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          padding: '4px 0'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option}
                onClick={() => {
                  setSearchTerm(option);
                  onChange(option);
                  setIsOpen(false);
                }}
                style={{
                  padding: '7px 12px',
                  fontSize: '13px',
                  color: option === value ? '#16a34a' : '#334155',
                  fontWeight: option === value ? 700 : 400,
                  backgroundColor: option === value ? '#f0fdf4' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (option !== value) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (option !== value) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {option}
              </div>
            ))
          ) : (
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              No matching family found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CropLibraryScreen() {
  // Main Data States
  const [templates, setTemplates] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // View Switchers & Sub-modules
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'table'
  const [activeModuleTab, setActiveModuleTab] = useState('catalog'); // 'catalog' | 'nursery-field-specs' | 'automated-tasks' | 'yield-benchmarks'

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [familyFilter, setFamilyFilter] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All'); // 'All' | 'Transplant' | 'Direct Sow'

  // 360 Crop Detail Popup Modal (`id=10629565` Tend format)
  const [selected360Template, setSelected360Template] = useState(null);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [isEditMode360, setIsEditMode360] = useState(false);
  const [active360Tab, setActive360Tab] = useState('general'); // 'general' | 'nursery' | 'planting' | 'nursery-tasks' | 'field-tasks' | 'financials'
  const [editForm360, setEditForm360] = useState({});

  // Custom Add Task Modal State inside 360 Popup
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskType, setAddTaskType] = useState('nursery'); // 'nursery' | 'field'
  const [newTaskForm, setNewTaskForm] = useState({
    task_name: '',
    task_category: 'Seeding',
    offset_days: 0,
    est_labor_hours: 0.5,
    assigned_role: 'Nursery Tech',
    instructions: ''
  });

  // Modals & Drawers
  const [showAddCropModal, setShowAddCropModal] = useState(false);
  const [addMode, setAddMode] = useState('crop_and_variety'); // 'crop_and_variety' | 'crop' | 'variety'
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Crop Categories State (Tend.com standard 15 categories)
  const [categories, setCategories] = useState([
    'Vegetables', 'Spices and Herbs', 'Flowers & Ornamentals', 'Cover Crops & Farm Seed',
    'Mushrooms', 'Legumes', 'Grains', 'Industrial', 'Medicinal', 'Beverage',
    'Nuts and Seeds', 'Oilseeds', 'Sugar and Sweetener', 'Fruits', 'Animal Feed and Forage'
  ]);
  const [categoryObjects, setCategoryObjects] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', icon: '🌱', description: '' });

  // Master Crops for Variety Creation & Autocomplete
  const [masterCropsList, setMasterCropsList] = useState([]);
  const [selectedCropIdForVariety, setSelectedCropIdForVariety] = useState('');
  const [selectedCropMasterVarieties, setSelectedCropMasterVarieties] = useState([]);
  const [isLoadingMasterVarieties, setIsLoadingMasterVarieties] = useState(false);

  // Autocomplete for Crop Common Name
  const [cropSuggestions, setCropSuggestions] = useState([]);
  const [showCropSuggestions, setShowCropSuggestions] = useState(false);

  // Multi-variety state item definition
  const defaultVarietyItem = useMemo(() => ({
    variety_name: '',
    description: '',
    supplier: '',
    days_to_maturity: 65,
    planting_method: 'Transplant',
    tray_size: '72-cell',
    spacing_unit: 'mtr',
    in_row_spacing_in: 0.35,
    row_spacing_in: 0.5,
    expected_yield_per_acre: 12.8,
    expected_yield_per_ft: 1.5,
    yield_unit: 'Ton',
    default_price_per_unit: 50.0
  }), []);

  const [varietiesList, setVarietiesList] = useState([{
    variety_name: 'Standard Variety',
    description: '',
    supplier: '',
    days_to_maturity: 65,
    planting_method: 'Transplant',
    tray_size: '72-cell',
    spacing_unit: 'mtr',
    in_row_spacing_in: 0.35,
    row_spacing_in: 0.5,
    expected_yield_per_acre: 12.8,
    expected_yield_per_ft: 1.5,
    yield_unit: 'Ton',
    default_price_per_unit: 50.0
  }]);

  // New Crop & Template Form State
  const [newCropForm, setNewCropForm] = useState(INITIAL_NEW_CROP_FORM);

  const [cloneForm, setCloneForm] = useState({
    source_template_id: '',
    new_name: ''
  });

  // Helper Select Options
  const cropFamilies = [
    'Acanthaceae', 'Acoraceae', 'Actinidiaceae', 'Alstroemeriaceae', 'Amaranthaceae',
    'Amaryllidaceae', 'Anacardiaceae', 'Annonaceae', 'Apiaceae', 'Apocynaceae',
    'Araceae', 'Araliaceae', 'Arecaceae', 'Asparagaceae', 'Asphodelaceae',
    'Asteraceae', 'Basellaceae', 'Berberidaceae', 'Brassicaceae', 'Bromeliaceae',
    'Burseraceae', 'Buxaceae', 'Capparaceae', 'Caricaceae', 'Caryophyllaceae',
    'Clusiaceae', 'Colchicaceae', 'Convolvulaceae', 'Cucurbitaceae', 'Dioscoreaceae',
    'Euphorbiaceae', 'Fabaceae', 'Gentianaceae', 'Geraniaceae', 'Heliconiaceae',
    'Iridaceae', 'Lamiaceae', 'Lauraceae', 'Liliaceae', 'Loganiaceae',
    'Lythraceae', 'Malvaceae', 'Meliaceae', 'Moraceae', 'Moringaceae',
    'Musaceae', 'Myristicaceae', 'Myrtaceae', 'Nelumbonaceae', 'Oleaceae',
    'Orchidaceae', 'Oxalidaceae', 'Papaveraceae', 'Passifloraceae', 'Pedaliaceae',
    'Phyllanthaceae', 'Piperaceae', 'Plantaginaceae', 'Plumbaginaceae', 'Poaceae',
    'Polygonaceae', 'Rhamnaceae', 'Rosaceae', 'Rubiaceae', 'Rutaceae',
    'Sapindaceae', 'Sapotaceae', 'Schisandraceae', 'Solanaceae', 'Strelitziaceae',
    'Talinaceae', 'Theaceae', 'Vitaceae', 'Zingiberaceae'
  ];
  const traySizes = ['20-cell', '32-cell', '50-cell', '72-cell', '128-cell', '200-cell', '288-cell', 'Direct Sow / Soil Block'];
  const taskCategories = ['Seeding', 'Germination', 'Thinning', 'Irrigation', 'Soil Prep', 'Transplanting', 'Cultivation', 'Pest Control', 'Harvest', 'Cleanup'];
  const workerRoles = ['Nursery Tech', 'Field Hand', 'Field Crew', 'Field Manager', 'Harvest Crew'];

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/crops/categories`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setCategories(data.data.map(c => c.name));
        setCategoryObjects(data.data);
      }
    } catch (err) {
      console.error('Error fetching crop categories:', err);
    }
  };

  const fetchMasterCrops = async () => {
    try {
      const res = await fetch(`${API_BASE}/crops`);
      const data = await res.json();
      if (data.success && data.data) {
        setMasterCropsList(data.data);
      }
    } catch (err) {
      console.error('Error fetching master crops:', err);
    }
  };

  // ── 1. FETCH TEMPLATES DATA ──
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/crops/templates`);
      const data = await res.json();
      if (data.success) {
        const fetchedTemplates = Array.isArray(data.data) ? data.data : [];
        setTemplates(fetchedTemplates);

        fetchMasterCrops();

        // Deep-linking URL check: ?parentcropid=... &varietyid=... &id=...
        const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
        const urlId = urlParams.get('id');
        const parentCropId = urlParams.get('parentcropid');
        const varietyId = urlParams.get('varietyid');

        let match = null;
        if (urlId) {
          match = fetchedTemplates.find(t => t.id === urlId);
        } else if (parentCropId || varietyId) {
          match = fetchedTemplates.find(t =>
            (parentCropId && t.crop_id === parentCropId) ||
            (varietyId && t.variety_id === varietyId)
          );
        }

        if (match) {
          open360TemplateModal(match.id, false);
        }
      }
    } catch (err) {
      console.error('Error loading crop templates:', err);
      showToast('Failed to load Crop Templates catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
  }, []);

  const stats = useMemo(() => {
    const totalTemplates = templates.length;
    let totalDtmSum = 0;
    let totalYieldSum = 0;
    let totalRevSum = 0;

    templates.forEach(t => {
      totalDtmSum += parseFloat(t.days_to_maturity || 65);
      totalYieldSum += parseFloat(t.expected_yield_per_acre || (parseFloat(t.expected_yield_per_ft || 1.5) * 8.5));
      totalRevSum += parseFloat(t.est_revenue_per_100ft_bed || 15000);
    });

    return {
      totalTemplates,
      avgDtm: totalTemplates > 0 ? Math.round(totalDtmSum / totalTemplates) : 65,
      avgYieldAcre: totalTemplates > 0 ? (totalYieldSum / totalTemplates).toFixed(1) : '12.8',
      avgYield: totalTemplates > 0 ? (totalYieldSum / totalTemplates).toFixed(1) : '12.8',
      avgRevPerBed: totalTemplates > 0 ? Math.round(totalRevSum / totalTemplates) : 15000
    };
  }, [templates]);

  // ── 3. FILTERED TEMPLATES ──
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = (t.crop_name || '').toLowerCase().includes(q) ||
          (t.variety_name || '').toLowerCase().includes(q) ||
          (t.template_name || '').toLowerCase().includes(q) ||
          (t.genus || '').toLowerCase().includes(q) ||
          (t.crop_family || '').toLowerCase().includes(q);
        if (!matchesName) return false;
      }
      // Category Filter
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      // Family Filter
      if (familyFilter !== 'All' && t.crop_family !== familyFilter) return false;
      // Method Filter
      if (methodFilter !== 'All' && !(t.planting_method || '').toLowerCase().includes(methodFilter.toLowerCase())) return false;
      return true;
    });
  }, [templates, searchQuery, categoryFilter, familyFilter, methodFilter]);

  // ── 4. OPEN 360 CROP TEMPLATE DETAIL POPUP ──
  const open360TemplateModal = async (templateId, startInEdit = false) => {
    try {
      const localFound = templates.find(t => String(t.id) === String(templateId));
      const res = await fetch(`${API_BASE}/crops/templates/${templateId}`);
      const data = await res.json();
      if (data.success && data.data) {
        const tObj = data.data;
        setSelected360Template(tObj);
        setEditForm360({ ...tObj });
        setIsEditMode360(startInEdit);
        setActive360Tab('general');
        setIs360ModalOpen(true);
      } else if (localFound) {
        setSelected360Template(localFound);
        setEditForm360({ ...localFound });
        setIsEditMode360(startInEdit);
        setActive360Tab('general');
        setIs360ModalOpen(true);
      }
    } catch (err) {
      const localFound = templates.find(t => String(t.id) === String(templateId));
      if (localFound) {
        setSelected360Template(localFound);
        setEditForm360({ ...localFound });
        setIsEditMode360(startInEdit);
        setActive360Tab('general');
        setIs360ModalOpen(true);
      } else {
        console.error('Error fetching template detail:', err);
        showToast('Error opening Crop Template details.', 'error');
      }
    }
  };

  // ── 5. SAVE 360 TEMPLATE EDITS ──
  const handleSave360Edit = async () => {
    if (!selected360Template) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/crops/templates/${selected360Template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm360)
      });

      if (res.ok) {
        const data = await res.json();
        const savedId = data?.data?.id || selected360Template.id;
        showToast(`Saved changes for "${editForm360.template_name || editForm360.crop_name || 'Crop'}" successfully!`);
        setIsEditMode360(false);
        await fetchTemplates();
        open360TemplateModal(savedId, false);
      } else {
        showToast('Failed to save template changes.', 'error');
      }
    } catch (err) {
      console.error('Error updating template:', err);
      showToast('Server error updating template.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── 6. ADD CUSTOM AUTOMATED TASK ──
  const handleAddCustomTask = async (e) => {
    e.preventDefault();
    if (!selected360Template || !newTaskForm.task_name.trim()) return;
    setIsSaving(true);
    try {
      const endpoint = addTaskType === 'nursery'
        ? `${API_BASE}/crops/templates/${selected360Template.id}/nursery-tasks`
        : `${API_BASE}/crops/templates/${selected360Template.id}/field-tasks`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Added automated ${addTaskType} task "${data.data.task_name}"!`);
        setShowAddTaskModal(false);
        setNewTaskForm({
          task_name: '', task_category: 'Seeding', offset_days: 0,
          est_labor_hours: 0.5, assigned_role: 'Nursery Tech', instructions: ''
        });
        open360TemplateModal(selected360Template.id, false);
      } else {
        showToast('Failed to add automated task', 'error');
      }
    } catch (err) {
      console.error('Error adding task:', err);
      showToast('Server error adding task.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── 7. DELETE AUTOMATED TASK ──
  const handleDeleteTask = async (taskId, type) => {
    try {
      const endpoint = type === 'nursery'
        ? `${API_BASE}/crops/nursery-tasks/${taskId}`
        : `${API_BASE}/crops/field-tasks/${taskId}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Task deleted successfully`);
        open360TemplateModal(selected360Template.id, false);
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  // ── VARIETY & AUTOCOMPLETE HANDLERS ──
  const handleAddVarietyRow = () => {
    setVarietiesList(prev => [
      ...prev,
      {
        variety_name: '',
        description: '',
        supplier: '',
        days_to_maturity: 65,
        planting_method: 'Transplant',
        tray_size: '72-cell',
        spacing_unit: 'mtr',
        in_row_spacing_in: 0.35,
        row_spacing_in: 0.5,
        expected_yield_per_acre: 12.8,
        expected_yield_per_ft: 1.5,
        yield_unit: 'Ton',
        default_price_per_unit: 50.0
      }
    ]);
  };

  const handleRemoveVarietyRow = (index) => {
    if (varietiesList.length <= 1) return;
    setVarietiesList(prev => prev.filter((_, i) => i !== index));
  };

  const handleVarietyChange = (index, field, value) => {
    setVarietiesList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const fetchVarietiesForCrop = async (cropId) => {
    if (!cropId) {
      setSelectedCropMasterVarieties([]);
      return;
    }
    setIsLoadingMasterVarieties(true);
    try {
      const res = await fetch(`${API_BASE}/crops/${cropId}`);
      const data = await res.json();
      if (data.success && data.data && Array.isArray(data.data.varieties)) {
        setSelectedCropMasterVarieties(data.data.varieties);
      } else {
        setSelectedCropMasterVarieties([]);
      }
    } catch (err) {
      console.error('Error fetching crop varieties master:', err);
      setSelectedCropMasterVarieties([]);
    } finally {
      setIsLoadingMasterVarieties(false);
    }
  };

  const handleMasterCropChangeForVariety = (cropId) => {
    setSelectedCropIdForVariety(cropId);
    fetchVarietiesForCrop(cropId);
  };

  const handleSelectMasterVarietyToFill = (varMasterItem, targetRowIndex = 0) => {
    setVarietiesList(prev => {
      const updated = [...prev];
      if (!updated[targetRowIndex]) {
        updated[targetRowIndex] = { ...defaultVarietyItem };
      }
      updated[targetRowIndex] = {
        ...updated[targetRowIndex],
        variety_name: varMasterItem.variety_name || updated[targetRowIndex].variety_name,
        description: varMasterItem.description || varMasterItem.notes || updated[targetRowIndex].description,
        supplier: varMasterItem.supplier || updated[targetRowIndex].supplier,
        days_to_maturity: varMasterItem.days_to_maturity || updated[targetRowIndex].days_to_maturity,
        planting_method: varMasterItem.planting_method || updated[targetRowIndex].planting_method,
        tray_size: varMasterItem.tray_size || updated[targetRowIndex].tray_size,
        in_row_spacing_in: varMasterItem.in_row_spacing_in || updated[targetRowIndex].in_row_spacing_in,
        row_spacing_in: varMasterItem.row_spacing_in || updated[targetRowIndex].row_spacing_in,
        expected_yield_per_ft: varMasterItem.expected_yield_per_ft || updated[targetRowIndex].expected_yield_per_ft,
        yield_unit: varMasterItem.yield_unit || updated[targetRowIndex].yield_unit,
        default_price_per_unit: varMasterItem.default_price_per_unit || updated[targetRowIndex].default_price_per_unit
      };
      return updated;
    });
    showToast(`Loaded variety "${varMasterItem.variety_name}" from Variety Master`);
  };

  const handleCropCommonNameInputChange = (e) => {
    const val = e.target.value;
    setNewCropForm(prev => ({ ...prev, name: val }));

    if (val.trim().length > 0) {
      const query = val.trim().toLowerCase();
      const matches = masterCropsList.filter(c =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.custom_name && c.custom_name.toLowerCase().includes(query)) ||
        (c.scientific_name && c.scientific_name.toLowerCase().includes(query))
      );
      setCropSuggestions(matches);
      setShowCropSuggestions(true);
    } else {
      setCropSuggestions([]);
      setShowCropSuggestions(false);
    }
  };

  const handleSelectCropSuggestion = (crop) => {
    setNewCropForm(prev => ({
      ...prev,
      name: crop.name || prev.name,
      custom_name: crop.custom_name || prev.custom_name,
      scientific_name: crop.scientific_name || prev.scientific_name,
      abbreviation: crop.abbreviation || prev.abbreviation,
      crop_family: crop.crop_family || prev.crop_family,
      genus: crop.genus || prev.genus,
      species: crop.species || prev.species,
      category: crop.category || prev.category,
      image_url: crop.image_url || prev.image_url,
      icon: crop.icon || prev.icon,
      color: crop.color || prev.color,
      description: crop.description || prev.description,
      specialised_plant_part: crop.specialised_plant_part || prev.specialised_plant_part,
      crop_type: crop.crop_type || prev.crop_type
    }));
    setShowCropSuggestions(false);
    showToast(`Selected "${crop.name}" from Crop Master Library`);
    fetchVarietiesForCrop(crop.id);
  };

  const resetCropForm = () => {
    setNewCropForm(INITIAL_NEW_CROP_FORM);
    setCropSuggestions([]);
    setShowCropSuggestions(false);
    setSelectedCropIdForVariety('');
    setSelectedCropMasterVarieties([]);
  };

  const openAddModalWithMode = (mode) => {
    setAddMode(mode);
    setShowAddDropdown(false);
    resetCropForm();
    setVarietiesList([{
      variety_name: mode === 'crop' ? 'Standard' : (mode === 'variety' ? '' : 'Standard Variety'),
      description: '',
      supplier: '',
      days_to_maturity: 65,
      planting_method: 'Transplant',
      spacing_unit: 'mtr',
      in_row_spacing_in: 0.35,
      row_spacing_in: 0.5,
      expected_yield_per_acre: 12.8,
      yield_unit: 'Ton',
      default_price_per_unit: 45000.0
    }]);
    setShowAddCropModal(true);
  };

  // ── 8. CREATE CROP / VARIETY (TEND.COM ADD NEW FLOW) ──
  const handleCreateCrop = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const validVarieties = varietiesList.map(v => ({
        variety_name: (v.variety_name && v.variety_name.trim()) ? v.variety_name.trim() : 'Standard Variety',
        description: (v.description && v.description.trim()) ? v.description.trim() : null,
        supplier: v.supplier || null,
        days_to_maturity: parseInt(v.days_to_maturity, 10) || 65,
        planting_method: v.planting_method || 'Transplant',
        tray_size: v.tray_size || '72-cell',
        spacing_unit: v.spacing_unit || 'mtr',
        in_row_spacing_in: parseFloat(v.in_row_spacing_in) || 0.35,
        row_spacing_in: parseFloat(v.row_spacing_in) || 0.5,
        expected_yield_per_acre: parseFloat(v.expected_yield_per_acre) || (parseFloat(v.expected_yield_per_ft || 1.5) * 8.5),
        expected_yield_per_ft: parseFloat(v.expected_yield_per_ft) || 1.5,
        yield_unit: v.yield_unit || 'Ton',
        default_price_per_unit: parseFloat(v.default_price_per_unit) || 50
      }));

      if (addMode === 'variety') {
        if (!selectedCropIdForVariety) {
          showToast('Please select a master crop', 'error');
          setIsSaving(false);
          return;
        }
        if (validVarieties.length === 0 || !validVarieties.some(v => v.variety_name)) {
          showToast('Please enter at least one variety name', 'error');
          setIsSaving(false);
          return;
        }

        const res = await fetch(`${API_BASE}/crops/${selectedCropIdForVariety}/varieties`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ varieties: validVarieties })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const addedCount = Array.isArray(data.data) ? data.data.length : 1;
          showToast(`Added ${addedCount} ${addedCount === 1 ? 'variety' : 'varieties'} successfully!`);
          resetCropForm();
          setShowAddCropModal(false);
          await fetchTemplates();
          const firstTemplateId = Array.isArray(data.data) ? data.data[0]?.template_id : data.data?.template_id;
          if (firstTemplateId) {
            open360TemplateModal(firstTemplateId, false);
          }
        } else {
          showToast(data.error || data.message || 'Failed to add varieties', 'error');
        }
      } else {
        // Crop & Variety OR Crop Only
        if (!newCropForm.name || !newCropForm.name.trim()) {
          showToast('Please enter a crop name', 'error');
          setIsSaving(false);
          return;
        }
        const createdCropName = newCropForm.name.trim();
        const payload = {
          ...newCropForm,
          name: createdCropName,
          abbreviation: newCropForm.abbreviation || createdCropName.substring(0, 3).toUpperCase(),
          scientific_name: newCropForm.scientific_name || `${newCropForm.genus || ''} ${newCropForm.species || ''}`.trim(),
          varieties: validVarieties
        };

        const res = await fetch(`${API_BASE}/crops`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`Created ${addMode === 'crop' ? 'crop' : 'crop & varieties'} "${createdCropName}" successfully!`);
          resetCropForm();
          setShowAddCropModal(false);
          await fetchTemplates();
          if (data.data && data.data.template_id) {
            open360TemplateModal(data.data.template_id, false);
          }
        } else {
          showToast(data.error || data.message || 'Failed to create crop', 'error');
        }
      }
    } catch (err) {
      console.error('Error creating crop/variety:', err);
      showToast('Server error creating entry.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Category CRUD handler
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryForm.name.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/crops/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategoryForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Category "${newCategoryForm.name}" saved successfully!`);
        setNewCategoryForm({ name: '', icon: '🌱', description: '' });
        fetchCategories();
      }
    } catch (err) {
      console.error('Error saving category:', err);
    }
  };

  // ── 9. DELETE TEMPLATE ──
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      const res = await fetch(`${API_BASE}/crops/templates/${templateToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Archived template "${templateToDelete.template_name}"`);
        setIsDeleteModalOpen(false);
        setTemplateToDelete(null);
        if (selected360Template && selected360Template.id === templateToDelete.id) {
          setIs360ModalOpen(false);
          setSelected360Template(null);
        }
        fetchTemplates();
      }
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  return (
    <div className="grow-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100%', color: '#1e293b' }}>
      
      {/* ── TOAST NOTIFICATION ── */}
      {notification && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px',
          borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          backgroundColor: notification.type === 'error' ? '#ef4444' : '#16a34a',
          color: '#ffffff', fontWeight: 600, fontSize: '14px'
        }}>
          {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* ── HEADER / TOP BAR ── */}
      <div className="grow-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>Crops, Varieties & 360 Templates</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>Manage master crops, variety specs, nursery/field schedules, and automated tasks</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowCategoryModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px',
              borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
              color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <Tag size={15} color="#64748b" />
            <span>Manage Categories</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
                borderRadius: '8px', border: 'none', backgroundColor: '#16a34a',
                color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
              }}
            >
              <Plus size={16} />
              <span>Add New</span>
              <ChevronDown size={14} />
            </button>

            {showAddDropdown && (
              <div 
                onMouseLeave={() => setShowAddDropdown(false)}
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: '6px',
                  width: '230px', background: '#ffffff', border: '1px solid #e2e8f0',
                  borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  zIndex: 999, overflow: 'hidden'
                }}
              >
                <div 
                  onClick={() => openAddModalWithMode('crop_and_variety')}
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌿</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Crop & Variety</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Create crop & variety together</div>
                  </div>
                </div>

                <div 
                  onClick={() => openAddModalWithMode('crop')}
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderTop: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌱</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Crop</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Add a new master crop</div>
                  </div>
                </div>

                <div 
                  onClick={() => openAddModalWithMode('variety')}
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderTop: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🌾</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Variety</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Add variety to existing crop</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── METRIC STATS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Active Templates</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={16} color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>{stats.totalTemplates}</div>
          <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>Configured crop schedules</span>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Avg Days to Maturity</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>{stats.avgDtm} days</div>
          <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 500 }}>Sow-to-harvest benchmark</span>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Avg Yield / Acre</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} color="#0284c7" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>{stats.avgYieldAcre || stats.avgYield} Ton</div>
          <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 500 }}>Target acre density</span>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Est Revenue / 100ft Bed</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={16} color="#9333ea" />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>₹{stats.avgRevPerBed.toLocaleString()}</div>
          <span style={{ fontSize: '12px', color: '#9333ea', fontWeight: 500 }}>Financial bed benchmark</span>
        </div>
      </div>

      {/* ── SUB-MODULE TABS & VIEW SWITCHER ── */}
      <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Sub-module Tab Buttons */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setActiveModuleTab('catalog')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                backgroundColor: activeModuleTab === 'catalog' ? '#ffffff' : 'transparent',
                color: activeModuleTab === 'catalog' ? '#0f172a' : '#64748b',
                boxShadow: activeModuleTab === 'catalog' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Leaf size={15} color={activeModuleTab === 'catalog' ? '#16a34a' : '#64748b'} />
              All Crops & Templates
            </button>

            <button
              onClick={() => setActiveModuleTab('nursery-field-specs')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                backgroundColor: activeModuleTab === 'nursery-field-specs' ? '#ffffff' : 'transparent',
                color: activeModuleTab === 'nursery-field-specs' ? '#0f172a' : '#64748b',
                boxShadow: activeModuleTab === 'nursery-field-specs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Ruler size={15} color={activeModuleTab === 'nursery-field-specs' ? '#0284c7' : '#64748b'} />
              Nursery & Field Specifications
            </button>

            <button
              onClick={() => setActiveModuleTab('automated-tasks')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                backgroundColor: activeModuleTab === 'automated-tasks' ? '#ffffff' : 'transparent',
                color: activeModuleTab === 'automated-tasks' ? '#0f172a' : '#64748b',
                boxShadow: activeModuleTab === 'automated-tasks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <Zap size={15} color={activeModuleTab === 'automated-tasks' ? '#9333ea' : '#64748b'} />
              Automated Task Sequences
            </button>

            <button
              onClick={() => setActiveModuleTab('yield-benchmarks')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                backgroundColor: activeModuleTab === 'yield-benchmarks' ? '#ffffff' : 'transparent',
                color: activeModuleTab === 'yield-benchmarks' ? '#0f172a' : '#64748b',
                boxShadow: activeModuleTab === 'yield-benchmarks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              <IndianRupee size={15} color={activeModuleTab === 'yield-benchmarks' ? '#d97706' : '#64748b'} />
              Yield & Revenue Benchmarks
            </button>
          </div>

          {/* View Mode Switcher (Card View vs Table View) */}
          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setViewMode('card')}
              title="Card Grid View"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '6px', border: 'none',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                backgroundColor: viewMode === 'card' ? '#ffffff' : 'transparent',
                color: viewMode === 'card' ? '#16a34a' : '#64748b',
                boxShadow: viewMode === 'card' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <LayoutGrid size={15} />
              <span>Card View</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              title="Spreadsheet Table View"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '6px', border: 'none',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#16a34a' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <Table size={15} />
              <span>Table View</span>
            </button>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search crop name, variety, genus, family..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '13px', color: '#0f172a', outline: 'none'
              }}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#334155', backgroundColor: '#ffffff' }}
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#334155', backgroundColor: '#ffffff' }}
          >
            <option value="All">All Botanical Families</option>
            {cropFamilies.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', color: '#334155', backgroundColor: '#ffffff' }}
          >
            <option value="All">All Planting Methods</option>
            {ALL_PLANTING_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter('All'); setFamilyFilter('All'); setMethodFilter('All'); }}
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block' }} />
          <span>Loading Crop Library templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '48px 20px', textAlign: 'center' }}>
          <Leaf size={36} color="#94a3b8" style={{ margin: '0 auto 12px auto', display: 'block' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0f172a' }}>No matching crop templates</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Try adjusting your filters or create a new crop template.</p>
        </div>
      ) : activeModuleTab === 'catalog' ? (
        viewMode === 'card' ? (
          
          /* ── SUB-MODULE 1: CARD VIEW GRID (Tend my-crops/card-view) ── */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '20px' }}>
            {filteredTemplates.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease'
                }}
              >
                {/* Header Banner */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(to right, #f8fafc, #ffffff)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: item.color || '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                      {(item.image_url || item.crop_image_url) ? (
                        <img src={item.image_url || item.crop_image_url} alt={item.crop_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        item.icon || '🌱'
                      )}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                        {item.crop_name}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
                        Variety: {item.variety_name || 'Standard'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', justifyContent: 'flex-end', maxWidth: '50%' }}>
                    {(item.planting_method || 'Transplant').split(',').map(m => m.trim()).filter(Boolean).map(m => (
                      <span key={m} style={{ padding: '2px 7px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, backgroundColor: '#e0f2fe', color: '#0369a1', whiteSpace: 'nowrap' }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Body Details */}
                <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Botanical Family & Category */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569' }}>
                      Family: {item.crop_family || 'Solanaceae'}
                    </span>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, backgroundColor: '#fdf4ff', color: '#c026d3' }}>
                      {item.category || 'Vegetables'}
                    </span>
                  </div>

                  {/* Specification Matrix */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Days to Maturity</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} color="#d97706" />
                        <span>{item.days_to_maturity || 65} Days</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Nursery Tray</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sprout size={13} color="#16a34a" />
                        <span>{item.tray_size || '72-cell'}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>In-Row × Row Spacing</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Ruler size={13} color="#0284c7" />
                        <span>{item.in_row_spacing_in || 0.35} {item.spacing_unit || 'mtr'} × {item.row_spacing_in || 0.5} {item.spacing_unit || 'mtr'}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Est. Bed Revenue</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IndianRupee size={13} color="#16a34a" />
                        <span>₹{parseFloat(item.est_revenue_per_100ft_bed || 15000).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Automated Task Counts */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                    <div>⚡ <strong>{(item.nursery_tasks || []).length}</strong> Nursery Tasks</div>
                    <div>⚡ <strong>{(item.field_tasks || []).length}</strong> Field Tasks</div>
                  </div>
                </div>

                {/* Footer Action Icons */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => open360TemplateModal(item.id, false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                      borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
                      color: '#0f172a', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} color="#0284c7" />
                    <span>View 360</span>
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => open360TemplateModal(item.id, true)}
                      title="Edit Template"
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', cursor: 'pointer', color: '#475569' }}
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={() => { setTemplateToDelete(item); setIsDeleteModalOpen(true); }}
                      title="Delete Template"
                      style={{ padding: '6px', borderRadius: '6px', border: '1px solid #fee2e2', backgroundColor: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (

          /* ── TABLE VIEW ── */
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Crop & Variety</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Family</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Method</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Tray Size</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>DTM</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Spacing</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>Est. Revenue / Bed</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                    <td style={{ padding: '14px 16px' }} onClick={() => open360TemplateModal(t.id, false)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{t.icon || '🌱'}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.crop_name}</div>
                          <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>{t.variety_name}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#475569' }}>{t.crop_family}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0369a1' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(t.planting_method || 'Transplant').split(',').map(m => m.trim()).filter(Boolean).map(m => (
                          <span key={m} style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{t.tray_size}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#d97706' }}>{t.days_to_maturity} Days</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{t.in_row_spacing_in || 0.35} {t.spacing_unit || 'mtr'} × {t.row_spacing_in || 0.5} {t.spacing_unit || 'mtr'}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16a34a' }}>₹{parseFloat(t.est_revenue_per_100ft_bed || 15000).toLocaleString()}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => open360TemplateModal(t.id, false)} style={{ padding: '5px 9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0369a1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>View</button>
                        <button onClick={() => open360TemplateModal(t.id, true)} style={{ padding: '5px 7px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', cursor: 'pointer', color: '#475569' }}><Edit3 size={13} /></button>
                        <button onClick={() => { setTemplateToDelete(t); setIsDeleteModalOpen(true); }} style={{ padding: '5px 7px', borderRadius: '6px', border: '1px solid #fee2e2', backgroundColor: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeModuleTab === 'nursery-field-specs' ? (
        
        /* ── SUB-MODULE 2: NURSERY & FIELD PLANTING SPECS ── */
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Nursery & Field Planting Specifications</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '12px' }}>Crop & Variety</th>
                <th style={{ padding: '12px' }}>Nursery Cell Size</th>
                <th style={{ padding: '12px' }}>Seeds/Cell</th>
                <th style={{ padding: '12px' }}>Nursery Days</th>
                <th style={{ padding: '12px' }}>Germ Temp</th>
                <th style={{ padding: '12px' }}>In-Row Spacing</th>
                <th style={{ padding: '12px' }}>Row Spacing</th>
                <th style={{ padding: '12px' }}>Rows/Bed</th>
                <th style={{ padding: '12px' }}>Plants/100ft</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>{t.icon} {t.crop_name} ({t.variety_name})</td>
                  <td style={{ padding: '12px', color: '#0284c7', fontWeight: 600 }}>{t.tray_size}</td>
                  <td style={{ padding: '12px' }}>{t.seeds_per_cell} seed</td>
                  <td style={{ padding: '12px', color: '#d97706', fontWeight: 600 }}>{t.days_in_nursery} days</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{t.germination_temp_f}</td>
                  <td style={{ padding: '12px', color: '#16a34a', fontWeight: 600 }}>{t.in_row_spacing_in} {t.spacing_unit || 'mtr'}</td>
                  <td style={{ padding: '12px', color: '#16a34a', fontWeight: 600 }}>{t.row_spacing_in} {t.spacing_unit || 'mtr'}</td>
                  <td style={{ padding: '12px' }}>{t.rows_per_bed} rows</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{t.target_plants_per_100ft}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeModuleTab === 'automated-tasks' ? (

        /* ── SUB-MODULE 3: AUTOMATED TASK SEQUENCES ── */
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Automated Task Sequences Generator</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredTemplates.map(t => (
              <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{t.icon}</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{t.crop_name} - {t.variety_name}</span>
                  </div>
                  <button onClick={() => open360TemplateModal(t.id, false)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0369a1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Configure Tasks 360</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Nursery Tasks */}
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>🌱 Nursery Tasks ({(t.nursery_tasks || []).length})</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                      {(t.nursery_tasks || []).map(nt => (
                        <li key={nt.id} style={{ marginBottom: '4px' }}>
                          <strong>Day {nt.offset_days}:</strong> {nt.task_name} <span style={{ color: '#94a3b8' }}>({nt.assigned_role})</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Field Tasks */}
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7', marginBottom: '8px' }}>🌾 Field Tasks ({(t.field_tasks || []).length})</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                      {(t.field_tasks || []).map(ft => (
                        <li key={ft.id} style={{ marginBottom: '4px' }}>
                          <strong>Day {ft.offset_days}:</strong> {ft.task_name} <span style={{ color: '#94a3b8' }}>({ft.assigned_role})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (

        /* ── SUB-MODULE 4: YIELD & REVENUE BENCHMARKS ── */
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Target Yield & Revenue Projections (Per Acre)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '12px' }}>Crop & Variety</th>
                <th style={{ padding: '12px' }}>Target Yield / Acre (Ton)</th>
                <th style={{ padding: '12px' }}>Total Acre Yield (Ton)</th>
                <th style={{ padding: '12px' }}>Price / Ton (₹)</th>
                <th style={{ padding: '12px' }}>Est Revenue / Acre</th>
                <th style={{ padding: '12px' }}>Harvest Window</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>{t.icon} {t.crop_name} ({t.variety_name})</td>
                  <td style={{ padding: '12px', color: '#0284c7', fontWeight: 600 }}>{t.expected_yield_per_acre || (parseFloat(t.expected_yield_per_ft || 1.5) * 8.5).toFixed(1)} Ton/Acre</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{t.expected_yield_per_acre || (parseFloat(t.expected_yield_per_ft || 1.5) * 8.5).toFixed(1)} Ton</td>
                  <td style={{ padding: '12px', color: '#16a34a', fontWeight: 600 }}>₹{parseFloat(t.default_price_per_unit || 50).toFixed(2)}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#16a34a', fontSize: '14px' }}>₹{parseFloat(t.est_revenue_per_100ft_bed || 15000).toLocaleString()}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{t.harvest_window_days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 360 CROP TEMPLATE DETAIL POPUP MODAL (`id=10629565` Tend Format) ── */}
      {is360ModalOpen && selected360Template && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '920px', width: '100%',
            maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: selected360Template.color || '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', overflow: 'hidden', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                  {(editForm360.image_url || selected360Template.image_url || selected360Template.crop_image_url) ? (
                    <img src={editForm360.image_url || selected360Template.image_url || selected360Template.crop_image_url} alt="Crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    selected360Template.icon || '🌱'
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                      {selected360Template.crop_name} - {selected360Template.variety_name}
                    </h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(selected360Template.planting_method || 'Transplant').split(',').map(m => m.trim()).filter(Boolean).map(m => (
                        <span key={m} style={{ padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                    Template ID: {selected360Template.id} • Family: {selected360Template.crop_family}
                  </div>
                </div>
              </div>

              {/* Action Buttons in 360 Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditMode360 ? (
                  <button
                    onClick={handleSave360Edit}
                    disabled={isSaving}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Save size={16} />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditMode360(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Edit3 size={15} />
                    <span>Edit 360</span>
                  </button>
                )}

                <button
                  onClick={() => setIs360ModalOpen(false)}
                  style={{ padding: '8px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Tabs Bar - Fully Responsive, Un-cramped with whiteSpace: 'nowrap' & flexShrink: 0 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '2px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              padding: '10px 24px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch'
            }}>
              <button
                type="button"
                onClick={() => setActive360Tab('general')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: active360Tab === 'general' ? '#16a34a' : '#ffffff',
                  color: active360Tab === 'general' ? '#ffffff' : '#334155',
                  fontWeight: active360Tab === 'general' ? 700 : 600,
                  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active360Tab === 'general' ? '0 2px 4px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Leaf size={14} />
                <span>General Info</span>
              </button>

              <button
                type="button"
                onClick={() => setActive360Tab('nursery')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: active360Tab === 'nursery' ? '#16a34a' : '#ffffff',
                  color: active360Tab === 'nursery' ? '#ffffff' : '#334155',
                  fontWeight: active360Tab === 'nursery' ? 700 : 600,
                  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active360Tab === 'nursery' ? '0 2px 4px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sprout size={14} />
                <span>Nursery Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActive360Tab('planting')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: active360Tab === 'planting' ? '#16a34a' : '#ffffff',
                  color: active360Tab === 'planting' ? '#ffffff' : '#334155',
                  fontWeight: active360Tab === 'planting' ? 700 : 600,
                  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active360Tab === 'planting' ? '0 2px 4px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Ruler size={14} />
                <span>Planting Details</span>
              </button>

              <button
                type="button"
                onClick={() => setActive360Tab('nursery-tasks')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: active360Tab === 'nursery-tasks' ? '#16a34a' : '#ffffff',
                  color: active360Tab === 'nursery-tasks' ? '#ffffff' : '#334155',
                  fontWeight: active360Tab === 'nursery-tasks' ? 700 : 600,
                  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active360Tab === 'nursery-tasks' ? '0 2px 4px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Zap size={14} />
                <span>Nursery Tasks ({(selected360Template.nursery_tasks || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActive360Tab('field-tasks')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: active360Tab === 'field-tasks' ? '#16a34a' : '#ffffff',
                  color: active360Tab === 'field-tasks' ? '#ffffff' : '#334155',
                  fontWeight: active360Tab === 'field-tasks' ? 700 : 600,
                  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active360Tab === 'field-tasks' ? '0 2px 4px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Layers size={14} />
                <span>Field Tasks ({(selected360Template.field_tasks || []).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActive360Tab('financials')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: active360Tab === 'financials' ? '#16a34a' : '#ffffff',
                  color: active360Tab === 'financials' ? '#ffffff' : '#334155',
                  fontWeight: active360Tab === 'financials' ? 700 : 600,
                  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active360Tab === 'financials' ? '0 2px 4px rgba(22, 163, 74, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <IndianRupee size={14} />
                <span>Yield & Financials</span>
              </button>

              <button
                type="button"
                onClick={() => setActive360Tab('pests-diseases')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  backgroundColor: active360Tab === 'pests-diseases' ? '#7A1532' : '#ffffff',
                  color: active360Tab === 'pests-diseases' ? '#ffffff' : '#334155',
                  fontWeight: active360Tab === 'pests-diseases' ? 700 : 600,
                  fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  boxShadow: active360Tab === 'pests-diseases' ? '0 2px 4px rgba(122, 21, 50, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <AlertTriangle size={14} />
                <span>Pests & Diseases</span>
              </button>
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              
              {/* TAB 1: GENERAL CROP INFO */}
              {active360Tab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Crop Picture Upload & Management Section */}
                  <CropImageUploader
                    imageUrl={editForm360.image_url ?? selected360Template.image_url ?? selected360Template.crop_image_url ?? ''}
                    onImageChange={(url) => setEditForm360({ ...editForm360, image_url: url })}
                    disabled={!isEditMode360}
                    showToast={showToast}
                  />
                  
                  {/* SECTION 1: Botanical Taxonomy Section */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Leaf size={18} />
                      1. Botanical Taxonomy & Crop Classification
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Crop Name (Common)</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.crop_name ?? editForm360.name ?? ''} onChange={(e) => setEditForm360({ ...editForm360, crop_name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Scientific Name (Genus species)</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.scientific_name ?? ''} onChange={(e) => setEditForm360({ ...editForm360, scientific_name: e.target.value })} placeholder="e.g. Solanum lycopersicum" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontStyle: 'italic', fontWeight: 600 }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Custom / Display Name</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.custom_name ?? ''} onChange={(e) => setEditForm360({ ...editForm360, custom_name: e.target.value })} placeholder="e.g. Cherry Tomato Special" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Variety Name</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.variety_name ?? ''} onChange={(e) => setEditForm360({ ...editForm360, variety_name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Botanical Family</label>
                        <SearchableFamilySelect
                          disabled={!isEditMode360}
                          value={editForm360.crop_family ?? 'Solanaceae'}
                          onChange={(val) => setEditForm360({ ...editForm360, crop_family: val })}
                          options={cropFamilies}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Category</label>
                        <select disabled={!isEditMode360} value={editForm360.category ?? 'Vegetables'} onChange={(e) => setEditForm360({ ...editForm360, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isEditMode360 ? '#ffffff' : '#f8fafc' }}>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Genus</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.genus ?? ''} onChange={(e) => setEditForm360({ ...editForm360, genus: e.target.value })} placeholder="e.g. Solanum" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Species</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.species ?? ''} onChange={(e) => setEditForm360({ ...editForm360, species: e.target.value })} placeholder="e.g. lycopersicum" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Abbreviation</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.abbreviation ?? ''} onChange={(e) => setEditForm360({ ...editForm360, abbreviation: e.target.value })} placeholder="e.g. TOM" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Specialised Plant Part</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.specialised_plant_part ?? ''} onChange={(e) => setEditForm360({ ...editForm360, specialised_plant_part: e.target.value })} placeholder="e.g. Bulb, Tuber, Rhizome" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Crop Type</label>
                        <select disabled={!isEditMode360} value={editForm360.crop_type ?? 'Annual'} onChange={(e) => setEditForm360({ ...editForm360, crop_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isEditMode360 ? '#ffffff' : '#f8fafc' }}>
                          <option value="Annual">Annual</option>
                          <option value="Biennial">Biennial</option>
                          <option value="Perennial">Perennial</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Seed Information & Attributes */}
                  <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sprout size={18} />
                      2. Seed Information & Technical Attributes
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Seeds per Ounce (approx)</label>
                        <input type="number" disabled={!isEditMode360} value={editForm360.seeds_per_oz ?? ''} onChange={(e) => setEditForm360({ ...editForm360, seeds_per_oz: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Seeds per Gram (approx)</label>
                        <input type="number" disabled={!isEditMode360} value={editForm360.seeds_per_gram ?? ''} onChange={(e) => setEditForm360({ ...editForm360, seeds_per_gram: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Seed Storage Viability (years)</label>
                        <input type="number" disabled={!isEditMode360} value={editForm360.seed_viability_years ?? ''} onChange={(e) => setEditForm360({ ...editForm360, seed_viability_years: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Seed Type / Treatment</label>
                        <select disabled={!isEditMode360} value={editForm360.seed_type ?? 'Raw'} onChange={(e) => setEditForm360({ ...editForm360, seed_type: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isEditMode360 ? '#ffffff' : '#f8fafc' }}>
                          <option value="Raw">Raw / Conventional</option>
                          <option value="Organic">Certified Organic</option>
                          <option value="Pelleted">Pelleted</option>
                          <option value="Treated">Fungicide Treated</option>
                          <option value="Primed">Primed / Pre-germinated</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Seed Coating / Size</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.seed_size ?? ''} onChange={(e) => setEditForm360({ ...editForm360, seed_size: e.target.value })} placeholder="e.g. 5.5-6.0mm Pelleted" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Target Germination %</label>
                        <input type="number" step="1" disabled={!isEditMode360} value={editForm360.target_germination_rate_pct ?? ''} onChange={(e) => setEditForm360({ ...editForm360, target_germination_rate_pct: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Crop Growth & Harvest Attributes */}
                  <div style={{ background: '#fefce8', padding: '16px', borderRadius: '12px', border: '1px solid #fef08a' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#ca8a04', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={18} />
                      3. Crop Growth & Harvest Attributes
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Growth Habit</label>
                        <select disabled={!isEditMode360} value={editForm360.growth_habit ?? 'Determinate'} onChange={(e) => setEditForm360({ ...editForm360, growth_habit: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isEditMode360 ? '#ffffff' : '#f8fafc' }}>
                          <option value="Determinate">Determinate (Bush)</option>
                          <option value="Indeterminate">Indeterminate (Pole / Vining)</option>
                          <option value="Semi-Determinate">Semi-Determinate</option>
                          <option value="Rosette">Rosette / Head</option>
                          <option value="Clumping">Clumping / Multi-stem</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Mature Height (mtr)</label>
                        <input type="number" disabled={!isEditMode360} value={editForm360.plant_height_in ?? ''} onChange={(e) => setEditForm360({ ...editForm360, plant_height_in: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Canopy Spread (mtr)</label>
                        <input type="number" disabled={!isEditMode360} value={editForm360.plant_spread_in ?? ''} onChange={(e) => setEditForm360({ ...editForm360, plant_spread_in: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Crop Lifecycle</label>
                        <select disabled={!isEditMode360} value={editForm360.crop_lifecycle ?? 'Annual'} onChange={(e) => setEditForm360({ ...editForm360, crop_lifecycle: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isEditMode360 ? '#ffffff' : '#f8fafc' }}>
                          <option value="Annual">Annual</option>
                          <option value="Biennial">Biennial</option>
                          <option value="Perennial">Perennial</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Primary Harvest Part</label>
                        <select disabled={!isEditMode360} value={editForm360.harvest_part ?? 'Fruit'} onChange={(e) => setEditForm360({ ...editForm360, harvest_part: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isEditMode360 ? '#ffffff' : '#f8fafc' }}>
                          <option value="Fruit">Fruit / Pod</option>
                          <option value="Leaf">Leaf / Greens</option>
                          <option value="Root">Root / Tuber</option>
                          <option value="Stem">Stem / Stalk</option>
                          <option value="Flower">Flower / Head</option>
                          <option value="Seed">Seed / Grain</option>
                          <option value="Bulb">Bulb</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Harvest Method</label>
                        <select disabled={!isEditMode360} value={editForm360.harvest_method ?? 'Continuous Pick'} onChange={(e) => setEditForm360({ ...editForm360, harvest_method: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isEditMode360 ? '#ffffff' : '#f8fafc' }}>
                          <option value="Continuous Pick">Continuous Pick / Multiple Harvesting</option>
                          <option value="Single Harvest">Single Harvest / Destructive</option>
                          <option value="Cut & Come Again">Cut & Come Again</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: Environmental & Soil Requirements Section */}
                  <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sun size={18} />
                      4. Environmental, Irrigation & Soil Preferences
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Soil pH Range (Min - Max)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" step="0.1" disabled={!isEditMode360} value={editForm360.soil_ph_min ?? ''} onChange={(e) => setEditForm360({ ...editForm360, soil_ph_min: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '50%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} placeholder="Min (6.0)" />
                          <input type="number" step="0.1" disabled={!isEditMode360} value={editForm360.soil_ph_max ?? ''} onChange={(e) => setEditForm360({ ...editForm360, soil_ph_max: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '50%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} placeholder="Max (6.8)" />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Frost Tolerance</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.frost_tolerance ?? ''} onChange={(e) => setEditForm360({ ...editForm360, frost_tolerance: e.target.value })} placeholder="Tender / Frost-sensitive / Hardy" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Light Requirement</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.light_requirement ?? ''} onChange={(e) => setEditForm360({ ...editForm360, light_requirement: e.target.value })} placeholder="Full Sun / Partial Shade" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Water / Irrigation Needs</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.water_needs ?? ''} onChange={(e) => setEditForm360({ ...editForm360, water_needs: e.target.value })} placeholder="e.g. Moderate (1-1.5 in/wk)" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Ideal Temp Range (°F)</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.ideal_temp_f ?? ''} onChange={(e) => setEditForm360({ ...editForm360, ideal_temp_f: e.target.value })} placeholder="e.g. 65-85°F" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Seasonality</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.seasonality ?? ''} onChange={(e) => setEditForm360({ ...editForm360, seasonality: e.target.value })} placeholder="Cool Season / Warm Season / Perennial" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Advanced Agronomic Preferences */}
                  <div style={{ background: '#faf5ff', padding: '16px', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#9333ea', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <SlidersHorizontal size={18} />
                      5. Advanced Agronomic Preferences & Companionship
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Preferred Soil Type</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.soil_type ?? ''} onChange={(e) => setEditForm360({ ...editForm360, soil_type: e.target.value })} placeholder="e.g. Rich Well-drained Sandy Loam" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Fertilizer / Nutrient Demand</label>
                        <select disabled={!isEditMode360} value={editForm360.nutrient_demand ?? 'Heavy Feeder'} onChange={(e) => setEditForm360({ ...editForm360, nutrient_demand: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: isEditMode360 ? '#ffffff' : '#f8fafc' }}>
                          <option value="Heavy Feeder">Heavy Feeder (High Nitrogen/Potassium)</option>
                          <option value="Moderate Feeder">Moderate Feeder</option>
                          <option value="Light Feeder">Light Feeder</option>
                          <option value="Nitrogen Fixer">Nitrogen Fixer (Legume)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Companion Plants (Good Neighbors)</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.companion_plants ?? ''} onChange={(e) => setEditForm360({ ...editForm360, companion_plants: e.target.value })} placeholder="e.g. Basil, Marigolds, Carrots" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Incompatible Plants (Bad Neighbors)</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.incompatible_plants ?? ''} onChange={(e) => setEditForm360({ ...editForm360, incompatible_plants: e.target.value })} placeholder="e.g. Fennel, Potatoes, Brassicas" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Common Pests & Vulnerabilities</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.common_pests ?? ''} onChange={(e) => setEditForm360({ ...editForm360, common_pests: e.target.value })} placeholder="e.g. Aphids, Hornworms, Flea Beetles" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Disease Resistance Codes</label>
                        <input type="text" disabled={!isEditMode360} value={editForm360.disease_resistance ?? ''} onChange={(e) => setEditForm360({ ...editForm360, disease_resistance: e.target.value })} placeholder="e.g. Verticillium (V), Fusarium (F), Nematodes (N)" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 6: Agronomic Notes & Documentation */}
                  <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Edit3 size={18} />
                      6. Segmented Agronomic Notes & Propagation Instructions
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>General Botanical Notes</label>
                        <textarea disabled={!isEditMode360} rows={2} value={editForm360.description ?? editForm360.notes ?? ''} onChange={(e) => setEditForm360({ ...editForm360, description: e.target.value, notes: e.target.value })} placeholder="General overview and crop characteristics..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Nursery Propagation Notes</label>
                          <textarea disabled={!isEditMode360} rows={2} value={editForm360.nursery_notes ?? ''} onChange={(e) => setEditForm360({ ...editForm360, nursery_notes: e.target.value })} placeholder="Special seedling instructions..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }} />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Field Cultivation Notes</label>
                          <textarea disabled={!isEditMode360} rows={2} value={editForm360.field_notes ?? ''} onChange={(e) => setEditForm360({ ...editForm360, field_notes: e.target.value })} placeholder="Trellising, weeding, and irrigation guidance..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: NURSERY DETAILS */}
              {active360Tab === 'nursery' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Tray Cell Size</label>
                    <select disabled={!isEditMode360} value={editForm360.tray_size ?? '72-cell'} onChange={(e) => setEditForm360({ ...editForm360, tray_size: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                      {traySizes.map(ts => <option key={ts} value={ts}>{ts}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Seeds Per Cell</label>
                    <input type="number" disabled={!isEditMode360} value={editForm360.seeds_per_cell ?? ''} onChange={(e) => setEditForm360({ ...editForm360, seeds_per_cell: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Days in Nursery</label>
                    <input type="number" disabled={!isEditMode360} value={editForm360.days_in_nursery ?? ''} onChange={(e) => setEditForm360({ ...editForm360, days_in_nursery: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Germination Temp Range</label>
                    <input type="text" disabled={!isEditMode360} value={editForm360.germination_temp_f ?? ''} onChange={(e) => setEditForm360({ ...editForm360, germination_temp_f: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                </div>
              )}

              {/* TAB 3: PLANTING DETAILS */}
              {active360Tab === 'planting' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Spacing Measurement Unit:</span>
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>Select Meter or Feet (No inches)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={!isEditMode360}
                        onClick={() => setEditForm360({ ...editForm360, spacing_unit: 'mtr' })}
                        style={{
                          padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: isEditMode360 ? 'pointer' : 'default',
                          background: (editForm360.spacing_unit || 'mtr') === 'mtr' ? '#0284c7' : '#ffffff',
                          color: (editForm360.spacing_unit || 'mtr') === 'mtr' ? '#ffffff' : '#64748b',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        Meter (mtr)
                      </button>
                      <button
                        type="button"
                        disabled={!isEditMode360}
                        onClick={() => setEditForm360({ ...editForm360, spacing_unit: 'ft' })}
                        style={{
                          padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: isEditMode360 ? 'pointer' : 'default',
                          background: editForm360.spacing_unit === 'ft' ? '#0284c7' : '#ffffff',
                          color: editForm360.spacing_unit === 'ft' ? '#ffffff' : '#64748b',
                          border: '1px solid #cbd5e1'
                        }}
                      >
                        Feet (ft)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>In-Row Spacing ({editForm360.spacing_unit || 'mtr'})</label>
                    <input type="number" step="0.05" disabled={!isEditMode360} value={editForm360.in_row_spacing_in ?? ''} onChange={(e) => setEditForm360({ ...editForm360, in_row_spacing_in: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Row Spacing ({editForm360.spacing_unit || 'mtr'})</label>
                    <input type="number" step="0.05" disabled={!isEditMode360} value={editForm360.row_spacing_in ?? ''} onChange={(e) => setEditForm360({ ...editForm360, row_spacing_in: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Rows Per Bed</label>
                    <input type="number" disabled={!isEditMode360} value={editForm360.rows_per_bed ?? ''} onChange={(e) => setEditForm360({ ...editForm360, rows_per_bed: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Days to Maturity (DTM)</label>
                    <input type="number" disabled={!isEditMode360} value={editForm360.days_to_maturity ?? ''} onChange={(e) => setEditForm360({ ...editForm360, days_to_maturity: e.target.value === '' ? '' : parseInt(e.target.value, 10) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Planting Method(s)
                    </label>
                    <PlantingMethodSelect
                      disabled={!isEditMode360}
                      value={editForm360.planting_method || ''}
                      onChange={(arr, str) => setEditForm360({ ...editForm360, planting_method: str })}
                      placeholder="Select planting method(s)..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: AUTOMATED NURSERY TASKS */}
              {active360Tab === 'nursery-tasks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Automated Nursery Task Workflow</h3>
                    <button onClick={() => { setAddTaskType('nursery'); setShowAddTaskModal(true); }} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Add Nursery Task</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(selected360Template.nursery_tasks || []).map(nt => (
                      <div key={nt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>Day {nt.offset_days}: {nt.task_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Category: {nt.task_category} • Role: {nt.assigned_role} • Labor: {nt.est_labor_hours} hrs</div>
                        </div>
                        <button onClick={() => handleDeleteTask(nt.id, 'nursery')} style={{ padding: '4px', borderRadius: '4px', border: 'none', backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: AUTOMATED FIELD TASKS */}
              {active360Tab === 'field-tasks' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Automated Field Task Workflow</h3>
                    <button onClick={() => { setAddTaskType('field'); setShowAddTaskModal(true); }} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Add Field Task</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(selected360Template.field_tasks || []).map(ft => (
                      <div key={ft.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>Day {ft.offset_days}: {ft.task_name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Category: {ft.task_category} • Role: {ft.assigned_role} • Labor: {ft.est_labor_hours} hrs</div>
                        </div>
                        <button onClick={() => handleDeleteTask(ft.id, 'field')} style={{ padding: '4px', borderRadius: '4px', border: 'none', backgroundColor: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: YIELD & FINANCIALS */}
              {active360Tab === 'financials' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Target Yield / Acre (Ton)</label>
                    <input type="number" step="0.1" disabled={!isEditMode360} value={editForm360.expected_yield_per_acre ?? (editForm360.expected_yield_per_ft ? (editForm360.expected_yield_per_ft * 8.5).toFixed(1) : '')} onChange={(e) => setEditForm360({ ...editForm360, expected_yield_per_acre: e.target.value === '' ? '' : parseFloat(e.target.value), expected_yield_per_ft: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Market Price Per Ton (₹)</label>
                    <input type="number" step="1" disabled={!isEditMode360} value={editForm360.default_price_per_unit ?? ''} onChange={(e) => setEditForm360({ ...editForm360, default_price_per_unit: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Est. Revenue / Acre (₹)</label>
                    <input type="number" disabled={!isEditMode360} value={editForm360.est_revenue_per_100ft_bed ?? ''} onChange={(e) => setEditForm360({ ...editForm360, est_revenue_per_100ft_bed: e.target.value === '' ? '' : parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                </div>
              )}

              {/* TAB 7: PESTS & DISEASES (CHI MODULE - SRS 10.2) */}
              {active360Tab === 'pests-diseases' && selected360Template && (
                <CropPestsAndDiseasesTab
                  cropId={selected360Template.crop_id || selected360Template.id}
                  cropName={selected360Template.name || selected360Template.crop_name}
                  apiBase={API_BASE.replace('/api', '')}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ADD AUTOMATED TASK MODAL ── */}
      {showAddTaskModal && selected360Template && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', maxWidth: '500px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Add Automated {addTaskType === 'nursery' ? 'Nursery' : 'Field'} Task</h3>
              <button onClick={() => setShowAddTaskModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddCustomTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Task Name *</label>
                <input type="text" required placeholder="e.g. Thinning / Weed Cultivation" value={newTaskForm.task_name} onChange={(e) => setNewTaskForm({ ...newTaskForm, task_name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Offset Days (+/- relative to date)</label>
                  <input type="number" required value={newTaskForm.offset_days} onChange={(e) => setNewTaskForm({ ...newTaskForm, offset_days: parseInt(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Est. Labor Hours</label>
                  <input type="number" step="0.25" value={newTaskForm.est_labor_hours} onChange={(e) => setNewTaskForm({ ...newTaskForm, est_labor_hours: parseFloat(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddTaskModal(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}>{isSaving ? 'Saving...' : 'Add Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ── DELETE CONFIRMATION MODAL ── */}
      {isDeleteModalOpen && templateToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', maxWidth: '420px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444', marginBottom: '12px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Delete Crop Template</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px 0' }}>
              Are you sure you want to archive <strong>"{templateToDelete.template_name}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsDeleteModalOpen(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDeleteTemplate} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}>Delete Template</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NEW CROP / VARIETY MODAL (TEND.COM SPLIT MODES) ── */}
      {showAddCropModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', pb: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: addMode === 'variety' ? '#fef3c7' : addMode === 'crop' ? '#e0f2fe' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {addMode === 'variety' ? '🌾' : addMode === 'crop' ? '🌱' : '🌿'}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                    {addMode === 'variety' ? 'Add Variety to Existing Crop' : addMode === 'crop' ? 'Add New Master Crop' : 'Add New Crop & Variety'}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Standard crop library editor</div>
                </div>
              </div>
              <button onClick={() => setShowAddCropModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateCrop} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* MODE = VARIETY ONLY */}
              {addMode === 'variety' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Select Master Crop</label>
                    <select
                      value={selectedCropIdForVariety}
                      onChange={(e) => handleMasterCropChangeForVariety(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#ffffff' }}
                    >
                      <option value="">-- Choose Existing Crop --</option>
                      {masterCropsList.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.category || 'General'})</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* MODE = CROP OR CROP_AND_VARIETY */
                <>
                  <CropImageUploader
                    imageUrl={newCropForm.image_url}
                    onImageChange={(url) => setNewCropForm({ ...newCropForm, image_url: url })}
                    showToast={showToast}
                  />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* CROP COMMON NAME WITH SPELL-MATCHING AUTOCOMPLETE */}
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                        Crop Common Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Type crop name (e.g. Tomato, Spinach)..."
                        value={newCropForm.name}
                        onChange={handleCropCommonNameInputChange}
                        onFocus={() => {
                          if (newCropForm.name.trim().length > 0) setShowCropSuggestions(true);
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />

                      {/* Autocomplete Dropdown List */}
                      {showCropSuggestions && cropSuggestions.length > 0 && (
                        <div
                          style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                            backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)', maxHeight: '220px', overflowY: 'auto', marginTop: '4px'
                          }}
                        >
                          <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#64748b', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                            Matching Library Crops (Click to Select):
                          </div>
                          {cropSuggestions.map(item => (
                            <div
                              key={item.id}
                              onClick={() => handleSelectCropSuggestion(item)}
                              style={{
                                padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '16px' }}>{item.icon || '🌱'}</span>
                                <div>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                                  {item.scientific_name && <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginLeft: '6px' }}>({item.scientific_name})</span>}
                                </div>
                              </div>
                              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', color: '#475569' }}>
                                {item.category || 'Master'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Scientific Name</label>
                      <input
                        type="text" placeholder="e.g. Solanum lycopersicum"
                        value={newCropForm.scientific_name}
                        onChange={(e) => setNewCropForm({ ...newCropForm, scientific_name: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Crop Category</label>
                      <select
                        value={newCropForm.category}
                        onChange={(e) => setNewCropForm({ ...newCropForm, category: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Botanical Family</label>
                      <SearchableFamilySelect
                        value={newCropForm.crop_family}
                        onChange={(val) => setNewCropForm({ ...newCropForm, crop_family: val })}
                        options={cropFamilies}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Icon</label>
                      <input
                        type="text" placeholder="🌱"
                        value={newCropForm.icon}
                        onChange={(e) => setNewCropForm({ ...newCropForm, icon: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Specialised Plant Part</label>
                      <input
                        type="text"
                        placeholder="e.g. Bulb, Tuber, Rhizome, Root"
                        value={newCropForm.specialised_plant_part}
                        onChange={(e) => setNewCropForm({ ...newCropForm, specialised_plant_part: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Crop Type</label>
                      <select
                        value={newCropForm.crop_type}
                        onChange={(e) => setNewCropForm({ ...newCropForm, crop_type: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                      >
                        <option value="Annual">Annual</option>
                        <option value="Biennial">Biennial</option>
                        <option value="Perennial">Perennial</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* EXISTING VARIETIES MASTER SELECTION */}
              {selectedCropMasterVarieties.length > 0 && (
                <div style={{ backgroundColor: '#eff6ff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#2563eb" /> Respective Varieties in Variety Master (Click to Pre-fill):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedCropMasterVarieties.map((mv) => (
                      <button
                        key={mv.id}
                        type="button"
                        onClick={() => handleSelectMasterVarietyToFill(mv, 0)}
                        style={{
                          padding: '5px 12px', borderRadius: '16px', border: '1px solid #93c5fd',
                          backgroundColor: '#ffffff', color: '#1d4ed8', fontSize: '12px', fontWeight: 600,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.15s ease'
                        }}
                      >
                        <span>🌾 {mv.variety_name}</span>
                        {mv.days_to_maturity && <span style={{ fontSize: '10px', opacity: 0.85 }}>({mv.days_to_maturity}d)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MULTI-VARIETY SECTION */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
                {addMode !== 'crop' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🌾 Variety Information ({varietiesList.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddVarietyRow}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '8px', border: '1px solid #16a34a',
                        backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '12px',
                        fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s ease'
                      }}
                    >
                      <Plus size={15} /> Add Variety
                    </button>
                  </div>
                )}

                {varietiesList.map((varItem, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {addMode !== 'crop' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                          Variety #{idx + 1}
                        </span>
                        {varietiesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVarietyRow(idx)}
                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                          >
                            <Trash2 size={15} /> Remove
                          </button>
                        )}
                      </div>
                    )}

                    {/* VARIETY NAME & VARIETY DESCRIPTION FIELDS NEXT TO EACH OTHER */}
                    {addMode !== 'crop' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                            {addMode === 'variety' ? 'Variety Name' : 'Variety Name *'}
                          </label>
                          <input
                            type="text"
                            required={addMode !== 'variety'}
                            placeholder="e.g. Cherokee Purple, Sun Gold"
                            value={varItem.variety_name}
                            onChange={(e) => handleVarietyChange(idx, 'variety_name', e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                            Variety Description (Free Text)
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Enter lengthier description, flavor profile, specific characteristics, notes..."
                            value={varItem.description || ''}
                            onChange={(e) => handleVarietyChange(idx, 'description', e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* SUPPLIER, DAYS TO MATURITY, PLANTING METHOD, TRAY SIZE */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      {addMode !== 'crop' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Seed Supplier</label>
                          <input type="text" placeholder="e.g. Johnny's Seeds" value={varItem.supplier || ''} onChange={(e) => handleVarietyChange(idx, 'supplier', e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                        </div>
                      )}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Days to Maturity</label>
                        <input type="number" value={varItem.days_to_maturity} onChange={(e) => handleVarietyChange(idx, 'days_to_maturity', parseInt(e.target.value, 10))} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Planting Method(s)</label>
                        <PlantingMethodSelect
                          value={varItem.planting_method}
                          onChange={(arr, str) => handleVarietyChange(idx, 'planting_method', str)}
                          placeholder="Select method(s)..."
                        />
                      </div>
                      {addMode !== 'crop' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Tray Size</label>
                          <select value={varItem.tray_size} onChange={(e) => handleVarietyChange(idx, 'tray_size', e.target.value)} style={{ width: '100%', padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#ffffff' }}>
                            {traySizes.map(ts => <option key={ts} value={ts}>{ts}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* SPACING, YIELD, PRICE */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>In-Row Spacing</label>
                          <select
                            value={varItem.spacing_unit || 'mtr'}
                            onChange={(e) => handleVarietyChange(idx, 'spacing_unit', e.target.value)}
                            style={{ fontSize: '10px', padding: '1px 4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="mtr">mtr</option>
                            <option value="ft">ft</option>
                          </select>
                        </div>
                        <input type="number" step="0.05" value={varItem.in_row_spacing_in} onChange={(e) => handleVarietyChange(idx, 'in_row_spacing_in', parseFloat(e.target.value))} placeholder={`In-Row (${varItem.spacing_unit || 'mtr'})`} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Row Spacing</label>
                          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>({varItem.spacing_unit || 'mtr'})</span>
                        </div>
                        <input type="number" step="0.05" value={varItem.row_spacing_in} onChange={(e) => handleVarietyChange(idx, 'row_spacing_in', parseFloat(e.target.value))} placeholder={`Row (${varItem.spacing_unit || 'mtr'})`} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Target Yield / Acre (Ton)</label>
                        <input type="number" step="0.1" value={varItem.expected_yield_per_acre || varItem.expected_yield_per_ft} onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleVarietyChange(idx, 'expected_yield_per_acre', val);
                          handleVarietyChange(idx, 'expected_yield_per_ft', val);
                        }} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Price / Ton (₹)</label>
                        <input type="number" value={varItem.default_price_per_unit} onChange={(e) => handleVarietyChange(idx, 'default_price_per_unit', parseFloat(e.target.value))} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowAddCropModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}>
                  {isSaving ? 'Saving...' : (addMode === 'crop' ? 'Save Crop' : addMode === 'variety' ? 'Save Variety' : 'Save Crop & Varieties Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MANAGE CROP CATEGORIES MODAL (TEND.COM STANDARD) ── */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', pb: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Tag size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Manage Crop Categories</h3>
              </div>
              <button onClick={() => setShowCategoryModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text" required placeholder="Add new category name..."
                value={newCategoryForm.name}
                onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <button type="submit" style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>+ Add Category</button>
            </form>

            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Standard 15 Categories ({categories.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map((cat, idx) => (
                <div key={idx} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌱</span>
                  <span>{cat}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button onClick={() => setShowCategoryModal(false)} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
