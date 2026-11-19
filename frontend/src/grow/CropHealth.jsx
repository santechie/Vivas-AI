import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, Filter, X, ChevronDown, ChevronUp, Check, Sparkles,
  AlertTriangle, ShieldCheck, Bug, Activity, Stethoscope, BookOpen,
  CheckCircle2, Clock, Calendar, MapPin, Camera, Upload, Eye, Edit3,
  Trash2, RefreshCw, FileText, ArrowRight, CornerDownRight, Zap, CloudSun,
  Layers, Tag, Info, AlertCircle, FileSpreadsheet, ExternalLink, ThumbsUp, ThumbsDown
} from 'lucide-react';

import ProblemImageGalleryModal from './chi/ProblemImageGalleryModal';
import DiagnosisReferenceViewer from './chi/DiagnosisReferenceViewer';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5001/api'
  : '/api';

export default function CropHealth() {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'diagnose' | 'library' | 'review' | 'alerts' | 'settings'

  // Global State & Data
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [kpis, setKpis] = useState({ open_cases: 0, high_severe: 0, awaiting_review: 0, treating_now: 0, resolved_this_season: 0 });
  const [lookups, setLookups] = useState({});
  const [nutrients, setNutrients] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [masterCrops, setMasterCrops] = useState([]);

  // Cases Tab State
  const [casesList, setCasesList] = useState([]);
  const [caseFilterStatus, setCaseFilterStatus] = useState('ALL');
  const [caseFilterType, setCaseFilterType] = useState('ALL');
  const [caseFilterSeverity, setCaseFilterSeverity] = useState('ALL');
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [caseViewMode, setCaseViewMode] = useState('table'); // 'table' | 'location'

  // Selected Case Detail State
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [caseDetailTab, setCaseDetailTab] = useState('overview'); // 'overview' | 'diagnosis' | 'treatment' | 'followup'

  // Cases Selection & Edit State (CRUD)
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [isEditingCase, setIsEditingCase] = useState(false);
  const [editCaseForm, setEditCaseForm] = useState({
    crop_id: '',
    variety_id: '',
    crop_stage: 'Vegetative',
    severity: 'LOW',
    incidence_pct: '',
    area_affected: '',
    area_unit: 'acres',
    symptoms_notes: '',
    plant_part_ids: [],
    symptom_ids: []
  });

  const selectedEditCropVarieties = useMemo(() => {
    const found = masterCrops.find(c => String(c.id) === String(editCaseForm.crop_id));
    return found ? (found.varieties || []) : [];
  }, [masterCrops, editCaseForm.crop_id]);

  // Report Issue Wizard Modal (S2)
  const [showReportWizard, setShowReportWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    crop_id: '',
    variety_id: '',
    site_id: '',
    bed_id: '',
    crop_stage: 'Vegetative',
    observed_at: new Date().toISOString().substring(0, 16),
    plant_part_ids: [],
    symptom_ids: [],
    symptoms_notes: '',
    photos: [],
    severity: 'LOW',
    incidence_pct: 15,
    area_affected: '1-5',
    area_unit: 'bed',
    diagnose_path: 'AI'
  });
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [newlyReportedCaseId, setNewlyReportedCaseId] = useState(null);

  // Camera Capture Modal State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhotoData, setCapturedPhotoData] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      setShowCameraModal(true);
      setCapturedPhotoData(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      setCameraStream(stream);
    } catch (err) {
      console.error('Camera access error:', err);
      showToast('Unable to access device camera. Please check camera permissions.', 'error');
    }
  };

  useEffect(() => {
    if (showCameraModal && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCameraModal, cameraStream]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setCapturedPhotoData(null);
  };

  const snapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhotoData(dataUrl);
  };

  const attachCapturedPhoto = async () => {
    if (!capturedPhotoData) return;
    try {
      const res = await fetch(`${API_BASE}/ch/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedPhotoData, filename: 'camera_snapshot' })
      });
      const data = await res.json();
      const photoUrl = data.success ? data.url : capturedPhotoData;

      setWizardData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), { url: photoUrl, caption: 'Camera Photo' }]
      }));
      showToast('Camera photo attached!');
      stopCamera();
    } catch (err) {
      setWizardData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), { url: capturedPhotoData, caption: 'Camera Photo' }]
      }));
      showToast('Photo attached!');
      stopCamera();
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type.toLowerCase())) {
        showToast(`Invalid file format ${file.name}. Only JPEG and PNG allowed.`, 'error');
        continue;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result;
        try {
          const res = await fetch(`${API_BASE}/ch/upload-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, filename: file.name })
          });
          const data = await res.json();
          const photoUrl = data.success ? data.url : base64;
          setWizardData(prev => ({
            ...prev,
            photos: [...(prev.photos || []), { url: photoUrl, caption: file.name }]
          }));
        } catch (err) {
          setWizardData(prev => ({
            ...prev,
            photos: [...(prev.photos || []), { url: base64, caption: file.name }]
          }));
        }
      };
      reader.readAsDataURL(file);
    }
    showToast(`Attached ${files.length} photo(s)!`);
  };

  const removePhoto = (idx) => {
    setWizardData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== idx)
    }));
  };

  // Library Tab State
  const [libraryList, setLibraryList] = useState([]);
  const [libraryFilterType, setLibraryFilterType] = useState('ALL'); // 'ALL' | 'PEST' | 'DISEASE' | 'DEFICIENCY'
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [selectedProblemId, setSelectedProblemId] = useState(null);
  const [problemDetail, setProblemDetail] = useState(null);

  // Add/Edit Library Problem Form Modal (S6)
  const [showProblemModal, setShowProblemModal] = useState(false);
  const [problemFormType, setProblemFormType] = useState('PEST'); // 'PEST' | 'DISEASE' | 'DEFICIENCY'
  const [problemForm, setProblemForm] = useState({
    name: '',
    scientific_name: '',
    category_id: '',
    pest_type_id: '',
    nutrient_code: 'N',
    identification_text: '',
    favourable_text: '',
    temp_min_c: 20,
    temp_max_c: 32,
    humidity_min_pct: 60,
    humidity_max_pct: 90,
    potential_severity: 'MODERATE',
    preventive_measures: '',
    notes: '',
    scope: 'FARM',
    status: 'DRAFT',
    mapped_crops: [],
    attributes: [],
    symptoms: [],
    control_measures: [
      {
        method_type: 'CULTURAL',
        title: 'Sanitation & Crop Cleanup',
        description: 'Remove affected plant leaves and destroy crop residue',
        dose_value: null,
        phi_days: null
      }
    ]
  });

  // Quick AI Scan State (S4)
  const [scanPhotos, setScanPhotos] = useState([]);
  const [scanCropId, setScanCropId] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [aiAnalysisData, setAiAnalysisData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeRemedialTab, setActiveRemedialTab] = useState('ALL'); // 'ALL' | 'BIOLOGICAL' | 'CHEMICAL' | 'CULTURAL'

  // Bulk Import Modal (S9)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importEntity, setImportEntity] = useState('PEST');
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  // Show Toast Message
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Initial Data Fetching
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardSummary(),
        fetchLookups(),
        fetchNutrients(),
        fetchSymptoms(),
        fetchMasterCrops(),
        fetchCases(),
        fetchLibrary()
      ]);
    } catch (err) {
      console.error('Error loading Crop Health data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/ch/dashboard/summary`);
      const data = await res.json();
      if (data.success) setKpis(data.data);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  const fetchLookups = async () => {
    try {
      const res = await fetch(`${API_BASE}/ch/lookups`);
      const data = await res.json();
      if (data.success) setLookups(data.data);
    } catch (err) {
      console.error('Error fetching lookups:', err);
    }
  };

  const fetchNutrients = async () => {
    try {
      const res = await fetch(`${API_BASE}/ch/nutrients`);
      const data = await res.json();
      if (data.success) setNutrients(data.data);
    } catch (err) {
      console.error('Error fetching nutrients:', err);
    }
  };

  const fetchSymptoms = async () => {
    try {
      const res = await fetch(`${API_BASE}/ch/symptoms`);
      const data = await res.json();
      if (data.success) setSymptoms(data.data);
    } catch (err) {
      console.error('Error fetching symptoms:', err);
    }
  };

  const fetchMasterCrops = async () => {
    try {
      const res = await fetch(`${API_BASE}/crops`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setMasterCrops(data.data);
    } catch (err) {
      console.error('Error fetching master crops:', err);
    }
  };

  const fetchCases = async (overrideStatus) => {
    try {
      const activeFarmStr = localStorage.getItem('vivas_active_farm') || sessionStorage.getItem('vivas_active_farm');
      const activeFarm = activeFarmStr ? JSON.parse(activeFarmStr) : null;
      const userStr = localStorage.getItem('vivas_user') || sessionStorage.getItem('vivas_user');
      const user = userStr ? JSON.parse(userStr) : null;

      const currentStatus = overrideStatus !== undefined ? overrideStatus : caseFilterStatus;
      let url = `${API_BASE}/ch/cases?`;
      if (currentStatus !== 'ALL') url += `status=${currentStatus}&`;
      if (caseFilterType !== 'ALL') url += `type=${caseFilterType}&`;
      if (caseFilterSeverity !== 'ALL') url += `severity=${caseFilterSeverity}&`;
      if (caseSearchQuery.trim()) url += `q=${encodeURIComponent(caseSearchQuery)}&`;
      if (activeFarm?.id) url += `farm_id=${activeFarm.id}&`;

      const res = await fetch(url, {
        headers: {
          ...(activeFarm?.id ? { 'x-farm-id': activeFarm.id } : {}),
          ...(user?.id ? { 'x-user-id': user.id } : {})
        }
      });
      const data = await res.json();
      if (data.success) setCasesList(data.data || []);
    } catch (err) {
      console.error('Error fetching cases:', err);
    }
  };

  const fetchLibrary = async () => {
    try {
      let url = `${API_BASE}/ch/problems?`;
      if (libraryFilterType !== 'ALL') url += `type=${libraryFilterType}&`;
      if (librarySearchQuery.trim()) url += `q=${encodeURIComponent(librarySearchQuery)}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setLibraryList(data.data || []);
    } catch (err) {
      console.error('Error fetching library:', err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [caseFilterStatus, caseFilterType, caseFilterSeverity, caseSearchQuery]);

  useEffect(() => {
    fetchLibrary();
  }, [libraryFilterType, librarySearchQuery]);

  // Fetch Single Case Detail
  const openCaseDetail = async (caseId) => {
    setSelectedCaseId(caseId);
    setIsEditingCase(false);
    try {
      const res = await fetch(`${API_BASE}/ch/cases/${caseId}`);
      const data = await res.json();
      if (data.success) {
        setCaseDetail(data.data);
        setCaseDetailTab('overview');
      }
    } catch (err) {
      console.error('Error fetching case detail:', err);
    }
  };

  // Case Selection & Bulk Operations
  const toggleSelectCase = (caseId) => {
    setSelectedCaseIds(prev =>
      prev.includes(caseId) ? prev.filter(id => id !== caseId) : [...prev, caseId]
    );
  };

  const toggleSelectAllCases = () => {
    if (casesList.length > 0 && selectedCaseIds.length === casesList.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(casesList.map(c => c.id));
    }
  };

  const handleDeleteSelectedCases = async () => {
    if (selectedCaseIds.length === 0) {
      showToast('Please select at least one reported issue to delete', 'warning');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedCaseIds.length} selected reported issue(s)?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/ch/cases/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedCaseIds })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Deleted ${data.deletedCount || selectedCaseIds.length} reported issue(s) successfully!`);
        setSelectedCaseIds([]);
        fetchCases();
        fetchDashboardSummary();
        if (selectedCaseId && selectedCaseIds.includes(selectedCaseId)) {
          setSelectedCaseId(null);
          setCaseDetail(null);
        }
      } else {
        showToast(data.error || 'Failed to delete selected issues', 'error');
      }
    } catch (err) {
      console.error('Error deleting cases:', err);
      showToast('Server error deleting reported issues', 'error');
    }
  };

  const handleDeleteSingleCase = async (caseId, caseNo) => {
    if (!window.confirm(`Are you sure you want to delete case ${caseNo || ''}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/ch/cases/${caseId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Case ${caseNo || ''} deleted successfully!`);
        if (selectedCaseId === caseId) {
          setSelectedCaseId(null);
          setCaseDetail(null);
        }
        setSelectedCaseIds(prev => prev.filter(id => id !== caseId));
        fetchCases();
        fetchDashboardSummary();
      } else {
        showToast(data.error || 'Failed to delete case', 'error');
      }
    } catch (err) {
      console.error('Error deleting case:', err);
      showToast('Server error deleting case', 'error');
    }
  };

  const startEditCase = (cData) => {
    setEditCaseForm({
      crop_id: cData.crop_id || '',
      variety_id: cData.variety_id || '',
      crop_stage: cData.crop_stage || 'Vegetative',
      severity: cData.severity || 'LOW',
      incidence_pct: cData.incidence_pct !== null && cData.incidence_pct !== undefined ? cData.incidence_pct : '',
      area_affected: cData.area_affected !== null && cData.area_affected !== undefined ? cData.area_affected : '',
      area_unit: cData.area_unit || 'acres',
      symptoms_notes: cData.symptoms_notes || '',
      plant_part_ids: cData.plant_parts ? cData.plant_parts.map(p => p.plant_part_id) : [],
      symptom_ids: cData.symptoms ? cData.symptoms.map(s => s.symptom_id) : []
    });
    setIsEditingCase(true);
  };

  const handleSaveEditCase = async (e) => {
    e.preventDefault();
    if (!selectedCaseId) return;
    try {
      const res = await fetch(`${API_BASE}/ch/cases/${selectedCaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCaseForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Updated case ${data.data?.case_no || ''} successfully!`);
        setIsEditingCase(false);
        openCaseDetail(selectedCaseId);
        fetchCases();
        fetchDashboardSummary();
      } else {
        showToast(data.error || 'Failed to update case', 'error');
      }
    } catch (err) {
      console.error('Error updating case:', err);
      showToast('Server error updating case', 'error');
    }
  };

  // Fetch Single Problem Detail
  const openProblemDetail = async (problemId) => {
    setSelectedProblemId(problemId);
    try {
      const res = await fetch(`${API_BASE}/ch/problems/${problemId}`);
      const data = await res.json();
      if (data.success) setProblemDetail(data.data);
    } catch (err) {
      console.error('Error fetching problem detail:', err);
    }
  };

  // Run AI Diagnosis on Selected Case
  const handleRunAiDiagnosis = async (caseId) => {
    try {
      showToast('AI Diagnostic Gateway analysing symptoms & photos...', 'info');
      const res = await fetch(`${API_BASE}/ch/cases/${caseId}/diagnose`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('AI Candidate Diagnoses generated!');
        openCaseDetail(caseId);
        setCaseDetailTab('diagnosis');
      } else {
        showToast(data.error || 'Failed to run AI Diagnosis', 'error');
      }
    } catch (err) {
      console.error('Error running AI diagnosis:', err);
      showToast('Server error running AI diagnosis', 'error');
    }
  };

  // Confirm Diagnosis
  const handleConfirmDiagnosis = async (diagnosisId) => {
    try {
      const res = await fetch(`${API_BASE}/ch/diagnoses/${diagnosisId}/confirm`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Confirmed diagnosis ground truth!');
        if (selectedCaseId) openCaseDetail(selectedCaseId);
        fetchCases();
        fetchDashboardSummary();
      } else {
        showToast(data.error || 'Failed to confirm diagnosis', 'error');
      }
    } catch (err) {
      console.error('Error confirming diagnosis:', err);
    }
  };

  // Submit Report Issue Wizard Form
  const handleSubmitReportWizard = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSavingReport) return;

    // VALIDATIONS SUGGESTED EARLIER
    // 1. Crop validation
    if (!wizardData.crop_id) {
      showToast('Please select a crop to report an issue', 'error');
      setWizardStep(1);
      return;
    }

    // 2. Observation date validation
    if (!wizardData.observed_at) {
      showToast('Please specify the observation date and time', 'error');
      setWizardStep(1);
      return;
    }

    // 3. % Plants Affected validation (0 to 100)
    if (wizardData.incidence_pct !== undefined && wizardData.incidence_pct !== null && wizardData.incidence_pct !== '') {
      const inc = parseFloat(wizardData.incidence_pct);
      if (isNaN(inc) || inc < 0 || inc > 100) {
        showToast('% Plants Affected must be a number between 0 and 100', 'error');
        setWizardStep(3);
        return;
      }
    }

    // 4. Area Affected validation based on validations suggested earlier
    if (wizardData.area_affected !== undefined && wizardData.area_affected !== null && String(wizardData.area_affected).trim() !== '') {
      const areaStr = String(wizardData.area_affected).trim();
      if (wizardData.area_unit === 'bed') {
        // Allows bed numbers or ranges (e.g. 1-5, 8, 10-12)
        const bedFormatRegex = /^(\d+(\s*-\s*\d+)?)(\s*,\s*\d+(\s*-\s*\d+)?)*$/;
        if (!bedFormatRegex.test(areaStr)) {
          showToast('Invalid bed format. Please enter bed numbers or ranges (e.g. 1-5, 8, 10-12)', 'error');
          setWizardStep(3);
          return;
        }
      } else if (wizardData.area_unit === 'acre' || wizardData.area_unit === 'sq_m') {
        const val = parseFloat(areaStr);
        if (isNaN(val) || val <= 0) {
          showToast(`Please enter a valid positive number for area in ${wizardData.area_unit === 'acre' ? 'acres' : 'sq meters'}`, 'error');
          setWizardStep(3);
          return;
        }
      }
    }

    try {
      setIsSavingReport(true);
      const activeFarmStr = localStorage.getItem('vivas_active_farm') || sessionStorage.getItem('vivas_active_farm');
      const activeFarm = activeFarmStr ? JSON.parse(activeFarmStr) : null;
      const userStr = localStorage.getItem('vivas_user') || sessionStorage.getItem('vivas_user');
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        ...wizardData,
        farm_id: wizardData.farm_id || activeFarm?.id || undefined,
        user_id: user?.id || undefined,
        status: 'OPEN'
      };

      const res = await fetch(`${API_BASE}/ch/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeFarm?.id ? { 'x-farm-id': activeFarm.id } : {}),
          ...(user?.id ? { 'x-user-id': user.id } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Reported issue ${data.data?.case_no || ''} saved and listed successfully!`);
        setShowReportWizard(false);
        setWizardStep(1);
        setWizardData({
          crop_id: '',
          variety_id: '',
          site_id: '',
          bed_id: '',
          crop_stage: 'Vegetative',
          observed_at: new Date().toISOString().substring(0, 16),
          plant_part_ids: [],
          symptom_ids: [],
          symptoms_notes: '',
          photos: [],
          severity: 'LOW',
          incidence_pct: 15,
          area_affected: '1-5',
          area_unit: 'bed',
          diagnose_path: 'AI'
        });

        // Ensure newly saved issue is immediately visible in Cases list grid
        setCaseFilterStatus('ALL');
        setCaseFilterSeverity('ALL');
        setCaseFilterType('ALL');
        setCaseSearchQuery('');
        setSelectedCaseId(null);
        setIsEditingCase(false);
        setActiveTab('cases');

        // Highlight newly reported issue in list grid
        if (data.data?.id) {
          setNewlyReportedCaseId(data.data.id);
          setTimeout(() => setNewlyReportedCaseId(null), 6000);
        }

        await fetchCases('ALL');
        await fetchDashboardSummary();
      } else {
        showToast(data.error || 'Failed to submit report', 'error');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      showToast('Server error creating case report', 'error');
    } finally {
      setIsSavingReport(false);
    }
  };

  // Submit Create Problem Form (S6)
  const handleSaveProblem = async (e) => {
    e.preventDefault();
    try {
      // Validate chemical PHI requirement
      for (const cm of problemForm.control_measures) {
        if (cm.method_type === 'CHEMICAL' && (cm.phi_days === undefined || cm.phi_days === null || cm.phi_days === '')) {
          showToast(`Chemical control measure "${cm.title}" requires Pre-Harvest Interval (PHI days)`, 'error');
          return;
        }
      }

      const payload = {
        ...problemForm,
        problem_type: problemFormType
      };

      const res = await fetch(`${API_BASE}/ch/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Saved library entry "${data.data?.code}" successfully!`);
        setShowProblemModal(false);
        fetchLibrary();
      } else {
        showToast(data.error || 'Failed to save problem', 'error');
      }
    } catch (err) {
      console.error('Error saving problem:', err);
      showToast('Server error saving library problem', 'error');
    }
  };

  // Workflow Action (Submit, Verify, Publish)
  const handleWorkflowAction = async (problemId, action) => {
    try {
      const res = await fetch(`${API_BASE}/ch/problems/${problemId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Workflow status updated to ${data.data?.status}`);
        openProblemDetail(problemId);
        fetchLibrary();
      } else {
        showToast(data.error || 'Workflow action failed', 'error');
      }
    } catch (err) {
      console.error('Error executing workflow action:', err);
    }
  };

  // Plan Treatment & Task
  const handlePlanTreatment = async (remedyItem) => {
    if (!selectedCaseId) return;
    try {
      const payload = {
        control_measure_id: remedyItem.id,
        input_id: remedyItem.input_id,
        title: remedyItem.title,
        dose_value: remedyItem.dose_value,
        dose_unit_id: remedyItem.dose_unit_id,
        dose_basis_id: remedyItem.dose_basis_id,
        application_method_id: remedyItem.application_method_id,
        phi_days: remedyItem.phi_days,
        create_task: true
      };
      const res = await fetch(`${API_BASE}/ch/cases/${selectedCaseId}/treatments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Treatment planned & task created in Tasks module!');
        openCaseDetail(selectedCaseId);
        fetchCases();
      }
    } catch (err) {
      console.error('Error planning treatment:', err);
    }
  };

  // Quick AI Scan (S4) - Multimodal Vision Pathology & Remedies
  const handleRunQuickScan = async () => {
    if (!scanCropId && scanPhotos.length === 0) {
      showToast('Please select a crop or upload an affected plant photo', 'error');
      return;
    }
    setIsScanning(true);
    setAiAnalysisData(null);
    try {
      const selectedCropObj = masterCrops.find(c => c.id === scanCropId);
      const photoPayload = scanPhotos.length > 0 ? scanPhotos[0] : null;

      // Retrieve auth token for authorization
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('vivas_token') || sessionStorage.getItem('vivas_token') || localStorage.getItem('token'))
        : '';

      // Call multimodal instant vision endpoint
      const res = await fetch(`${API_BASE}/ch/cases/diagnose-instant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          image_base64: photoPayload || 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          crop_id: scanCropId,
          crop_name: selectedCropObj?.name || ''
        })
      });

      const resData = await res.json();
      if (resData.success && resData.data) {
        const { ai_diagnosis, grounded_problem, database_remedies, partner_products } = resData.data;
        setAiAnalysisData(resData.data);

        // Map candidate cards
        const primaryCand = {
          rank: 1,
          problem_id: grounded_problem?.id || 'pred-1',
          name: ai_diagnosis?.problem_name || 'Crop Health Issue',
          scientific_name: ai_diagnosis?.scientific_name || '',
          type: ai_diagnosis?.problem_type || 'DISEASE',
          confidence: ai_diagnosis?.confidence || 0.9,
          rationale: ai_diagnosis?.explanation || 'Visual analysis completed.',
          severity: ai_diagnosis?.severity || 'MODERATE',
          plant_part: ai_diagnosis?.plant_part || 'LEAF',
          symptoms: ai_diagnosis?.symptoms_observed || [],
          immediate_actions: ai_diagnosis?.immediate_actions || [],
          remedies: ai_diagnosis?.remedies || []
        };

        setScanResults([primaryCand]);
        showToast('AI Vision scan complete! Instant diagnosis & remedies ready.');
      } else {
        showToast(resData.message || 'Diagnosis failed', 'error');
      }
    } catch (err) {
      console.error('Error running quick scan:', err);
      showToast('Connection to AI Vision Service failed.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Toast Banner */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 11000,
          padding: '12px 20px', borderRadius: '10px',
          backgroundColor: toast.type === 'error' ? '#ef4444' : (toast.type === 'info' ? '#3b82f6' : '#16a34a'),
          color: '#ffffff', fontWeight: 600, fontSize: '14px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* PAGE HEADER (§4.2 Pattern) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#16a34a',
            backgroundColor: '#dcfce7', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase'
          }}>
            GROW MODULE
          </span>
          <h1 style={{ margin: '6px 0 2px 0', fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
            Crop Health
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Report, diagnose and treat pests, diseases and nutrient deficiencies across your plantings.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setWizardData({
                crop_id: masterCrops[0]?.id || '',
                variety_id: '',
                site_id: '',
                bed_id: '',
                crop_stage: 'Vegetative',
                observed_at: new Date().toISOString().substring(0, 16),
                plant_part_ids: [],
                symptom_ids: [],
                symptoms_notes: '',
                photos: [],
                severity: 'LOW',
                incidence_pct: 15,
                area_affected: 50,
                area_unit: 'bed-ft',
                diagnose_path: 'AI'
              });
              setWizardStep(1);
              setShowReportWizard(true);
            }}
            style={{
              padding: '10px 18px', borderRadius: '10px', border: 'none',
              backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '13px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(22,163,74,0.25)'
            }}
          >
            <Plus size={18} /> Report Issue
          </button>

          <button
            onClick={() => setActiveTab('diagnose')}
            style={{
              padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 600, fontSize: '13px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Sparkles size={16} color="#2563eb" /> Diagnose (AI)
          </button>
        </div>
      </div>

      {/* DISMISSIBLE INFO BANNER */}
      <div style={{
        backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px',
        padding: '14px 18px', marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>
              How Crop Health Works
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
              1. Report what you see with photos & symptoms • 2. Get AI-assisted diagnosis & remedies • 3. Turn remedies into Tasks and track recovery.
            </div>
          </div>
        </div>
        <button
          onClick={() => {}}
          style={{ border: 'none', background: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
        >
          Dismiss
        </button>
      </div>

      {/* KPI METRIC CARDS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div
          onClick={() => { setCaseFilterStatus('ALL'); setActiveTab('cases'); }}
          style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{kpis.open_cases}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginTop: '4px' }}>Open Cases</div>
        </div>

        <div
          onClick={() => { setCaseFilterSeverity('HIGH'); setActiveTab('cases'); }}
          style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #fee2e2', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#ef4444' }}>{kpis.high_severe}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b', marginTop: '4px' }}>High / Severe</div>
        </div>

        <div
          onClick={() => { setCaseFilterStatus('AI_REVIEW'); setActiveTab('cases'); }}
          style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #dbeafe', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb' }}>{kpis.awaiting_review}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af', marginTop: '4px' }}>Awaiting Review</div>
        </div>

        <div
          onClick={() => { setCaseFilterStatus('TREATING'); setActiveTab('cases'); }}
          style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #fef3c7', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706' }}>{kpis.treating_now}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#b45309', marginTop: '4px' }}>Treating Now</div>
        </div>

        <div
          onClick={() => { setCaseFilterStatus('RESOLVED'); setActiveTab('cases'); }}
          style={{ backgroundColor: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #dcfce7', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a' }}>{kpis.resolved_this_season}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginTop: '4px' }}>Resolved This Season</div>
        </div>
      </div>

      {/* MODULE MAIN TABS ROW */}
      <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '24px' }}>
        {[
          { id: 'cases', label: 'Cases', icon: Activity },
          { id: 'diagnose', label: 'Diagnose (AI)', icon: Sparkles },
          { id: 'library', label: 'Library', icon: BookOpen },
          { id: 'review', label: 'Review Queue', icon: ShieldCheck },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 4px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '14px', fontWeight: isActive ? 700 : 600,
                color: isActive ? '#16a34a' : '#64748b',
                borderBottom: isActive ? '2px solid #16a34a' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s ease'
              }}
            >
              <IconComp size={17} color={isActive ? '#16a34a' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==========================================
          TAB 1: CASES LIST (S1)
          ========================================== */}
      {activeTab === 'cases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* SEARCH & FILTERS TOOLBAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search cases, crops, symptoms..."
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={caseFilterType}
                onChange={(e) => setCaseFilterType(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
              >
                <option value="ALL">TYPE: All Types</option>
                <option value="PEST">Pest</option>
                <option value="DISEASE">Disease</option>
                <option value="DEFICIENCY">Nutrient Deficiency</option>
              </select>

              <select
                value={caseFilterSeverity}
                onChange={(e) => setCaseFilterSeverity(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
              >
                <option value="ALL">SEVERITY: All</option>
                <option value="LOW">Low</option>
                <option value="MODERATE">Moderate</option>
                <option value="HIGH">High</option>
                <option value="SEVERE">Severe</option>
              </select>

              <select
                value={caseFilterStatus}
                onChange={(e) => setCaseFilterStatus(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
              >
                <option value="ALL">STATUS: All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="AI_REVIEW">AI Review</option>
                <option value="AGRONOMIST_REVIEW">Agronomist Review</option>
                <option value="DIAGNOSED">Diagnosed</option>
                <option value="TREATING">Treating</option>
                <option value="MONITORING">Monitoring</option>
                <option value="RESOLVED">Resolved</option>
              </select>

              {/* RED COLOUR DELETE ICON BUTTON NEXT TO STATUS BOX */}
              <button
                type="button"
                onClick={handleDeleteSelectedCases}
                disabled={selectedCaseIds.length === 0}
                title={selectedCaseIds.length > 0 ? `Delete ${selectedCaseIds.length} selected reported issue(s)` : 'Select issue(s) using checkboxes to delete'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px',
                  border: '1px solid #ef4444',
                  backgroundColor: selectedCaseIds.length > 0 ? '#ef4444' : '#fef2f2',
                  color: selectedCaseIds.length > 0 ? '#ffffff' : '#ef4444',
                  fontWeight: 700, fontSize: '13px',
                  cursor: selectedCaseIds.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: selectedCaseIds.length > 0 ? 1 : 0.6,
                  transition: 'all 0.15s ease'
                }}
              >
                <Trash2 size={16} color={selectedCaseIds.length > 0 ? '#ffffff' : '#ef4444'} />
                <span>Delete {selectedCaseIds.length > 0 ? `(${selectedCaseIds.length})` : ''}</span>
              </button>
            </div>
          </div>

          {/* CASES TABLE VIEW */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px', fontWeight: 700 }}>
                  <th style={{ padding: '12px 14px', width: '38px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={casesList.length > 0 && selectedCaseIds.length === casesList.length}
                      onChange={toggleSelectAllCases}
                      title="Select all cases"
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px' }}>Case No</th>
                  <th style={{ padding: '12px 16px' }}>Crop & Variety</th>
                  <th style={{ padding: '12px 16px' }}>Problem / Diagnosis</th>
                  <th style={{ padding: '12px 16px' }}>Severity</th>
                  <th style={{ padding: '12px 16px' }}>% Affected</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Observed</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {casesList.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <Activity size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                      <div>No Crop Health cases reported yet matching current filters.</div>
                      <button
                        onClick={() => setShowReportWizard(true)}
                        style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                      >
                        + Report Issue
                      </button>
                    </td>
                  </tr>
                ) : (
                  casesList.map(cItem => {
                    const isNew = cItem.id === newlyReportedCaseId;
                    return (
                      <tr
                        key={cItem.id}
                        onClick={() => openCaseDetail(cItem.id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: isNew ? '#f0fdf4' : '#ffffff'
                        }}
                        onMouseEnter={(e) => { if (!isNew) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isNew ? '#f0fdf4' : '#ffffff'; }}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedCaseIds.includes(cItem.id)}
                            onChange={() => toggleSelectCase(cItem.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#ef4444' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{cItem.case_no}</span>
                            {isNew && (
                              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#16a34a' }}>
                                NEW
                              </span>
                            )}
                          </div>
                        </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{cItem.crop_icon || '🌱'}</span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{cItem.crop_name}</div>
                            {cItem.variety_name && <div style={{ fontSize: '11px', color: '#64748b' }}>{cItem.variety_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {cItem.confirmed_problem_name ? (
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>✨ {cItem.confirmed_problem_name}</span>
                        ) : cItem.suspected_problem_name ? (
                          <span style={{ color: '#0f172a' }}>Suspected: {cItem.suspected_problem_name}</span>
                        ) : (
                          <span style={{ color: '#2563eb', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={13} /> AI Diagnosis Pending
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: cItem.severity === 'SEVERE' || cItem.severity === 'HIGH' ? '#fee2e2' : (cItem.severity === 'MODERATE' ? '#fef3c7' : '#dcfce7'),
                          color: cItem.severity === 'SEVERE' || cItem.severity === 'HIGH' ? '#ef4444' : (cItem.severity === 'MODERATE' ? '#b45309' : '#15803d')
                        }}>
                          {cItem.severity}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#334155' }}>
                        {cItem.incidence_pct ? `${cItem.incidence_pct}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: cItem.status === 'RESOLVED' ? '#dcfce7' : (cItem.status === 'TREATING' ? '#fef3c7' : '#dbeafe'),
                          color: cItem.status === 'RESOLVED' ? '#16a34a' : (cItem.status === 'TREATING' ? '#d97706' : '#2563eb')
                        }}>
                          {cItem.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {new Date(cItem.observed_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => openCaseDetail(cItem.id)}
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            onClick={() => handleDeleteSingleCase(cItem.id, cItem.case_no)}
                            title="Delete case"
                            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: DIAGNOSE (AI) (S4)
          ========================================== */}
      {activeTab === 'diagnose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
          
          {/* LEFT PANEL: PHOTO & CROP INPUT */}
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#2563eb" /> AI Scan & Quick Diagnosis
            </h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Select Target Crop *</label>
              <select
                value={scanCropId}
                onChange={(e) => setScanCropId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
              >
                <option value="">-- Choose Crop --</option>
                {masterCrops.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon || '🌱'} {c.name}{c.custom_name ? ` (${c.custom_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* DROP-ZONE */}
            <div
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setScanPhotos([event.target.result]);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              style={{
                border: scanPhotos.length > 0 ? '2px solid #16a34a' : '2px dashed #93c5fd',
                backgroundColor: scanPhotos.length > 0 ? '#f0fdf4' : '#eff6ff',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {scanPhotos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <img
                    src={scanPhotos[0]}
                    alt="Upload Preview"
                    style={{ maxHeight: '140px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Click to replace photo</span>
                </div>
              ) : (
                <>
                  <Camera size={36} color="#2563eb" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>Capture or Upload Plant Photo</div>
                  <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '2px' }}>Leaf, fruit, flower, stem, or root (JPEG/PNG)</div>
                </>
              )}
            </div>

            <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '11px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#16a34a" />
              <span><strong>Evaluation Mode Active:</strong> Unlimited instant diagnostic scans enabled with zero credit charges.</span>
            </div>

            <button
              onClick={handleRunQuickScan}
              disabled={isScanning || (!scanCropId && scanPhotos.length === 0)}
              style={{
                padding: '12px', borderRadius: '10px', border: 'none',
                backgroundColor: isScanning ? '#94a3b8' : '#2563eb', color: '#ffffff',
                fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              {isScanning ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
              {isScanning ? 'Analysing Visual Symptoms with Vision AI...' : 'Run Instant AI Diagnosis'}
            </button>
          </div>

          {/* RIGHT PANEL: AI RESULTS & REMEDIAL PLAN */}
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={18} color="#2563eb" /> Diagnostic Outcome & Treatment Plan
              </h3>
              {scanResults && (
                <span style={{ fontSize: '11px', backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #a7f3d0' }}>
                  ✓ Instant Verified
                </span>
              )}
            </div>

            {!scanResults ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                <Stethoscope size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                <div>Select a crop or upload an image and click <strong>Run Instant AI Diagnosis</strong> to see full pathology and remedial recommendations.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {scanResults.map((cand) => (
                  <div key={cand.problem_id} style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Header with Title & Tags */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', backgroundColor: cand.type === 'PEST' ? '#fee2e2' : (cand.type === 'DISEASE' ? '#fef3c7' : '#e0e7ff'), color: cand.type === 'PEST' ? '#b91c1c' : (cand.type === 'DISEASE' ? '#b45309' : '#4338ca') }}>
                            {cand.type}
                          </span>
                          {cand.plant_part && (
                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                              Part: {cand.plant_part}
                            </span>
                          )}
                          {cand.severity && (
                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: '4px', backgroundColor: cand.severity === 'HIGH' ? '#fef2f2' : '#f0fdf4', color: cand.severity === 'HIGH' ? '#dc2626' : '#16a34a' }}>
                              {cand.severity} Severity
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: '6px 0 2px 0', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{cand.name}</h4>
                        {cand.scientific_name && (
                          <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>{cand.scientific_name}</div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: cand.confidence >= 0.8 ? '#16a34a' : '#d97706' }}>
                          {(cand.confidence * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Confidence</div>
                      </div>
                    </div>

                    {/* Confidence Bar */}
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${cand.confidence * 100}%`, height: '100%', backgroundColor: cand.confidence >= 0.8 ? '#16a34a' : '#d97706' }} />
                    </div>

                    {/* Agronomic Explanation */}
                    <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                      <strong style={{ color: '#0f172a' }}>Agronomic Rationale: </strong>
                      {cand.rationale}
                    </div>

                    {/* Immediate Steps */}
                    {cand.immediate_actions && cand.immediate_actions.length > 0 && (
                      <div style={{ backgroundColor: '#fef3c7', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Immediate Mitigations:</strong>
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {cand.immediate_actions.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 3-Tier Remedies Section */}
                    {cand.remedies && cand.remedies.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Verified Control Measures:</span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {['ALL', 'BIOLOGICAL', 'CHEMICAL', 'CULTURAL'].map(tab => (
                              <button
                                key={tab}
                                onClick={() => setActiveRemedialTab(tab)}
                                style={{
                                  padding: '2px 8px', borderRadius: '4px', border: 'none',
                                  fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                                  backgroundColor: activeRemedialTab === tab ? '#2563eb' : '#e2e8f0',
                                  color: activeRemedialTab === tab ? '#ffffff' : '#475569'
                                }}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                          {cand.remedies
                            .filter(r => activeRemedialTab === 'ALL' || r.category === activeRemedialTab)
                            .map((rem, idx) => (
                              <div key={idx} style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 800, color: rem.category === 'BIOLOGICAL' ? '#16a34a' : (rem.category === 'CHEMICAL' ? '#2563eb' : '#7c3aed') }}>
                                    {rem.category}
                                  </span>
                                  {rem.safety_period_days !== null && rem.safety_period_days !== undefined && (
                                    <span style={{ color: '#d97706', fontWeight: 700 }}>PHI: {rem.safety_period_days}d</span>
                                  )}
                                </div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{rem.action_title}</div>
                                <div style={{ color: '#64748b' }}><strong>Active: </strong>{rem.active_ingredient_or_measure}</div>
                                <div style={{ color: '#475569', backgroundColor: '#f8fafc', padding: '4px 6px', borderRadius: '4px' }}>{rem.application_dosage_or_method}</div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons: Apply or Save */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                      <button
                        onClick={() => {
                          setShowReportWizard(true);
                          setWizardData(prev => ({
                            ...prev,
                            crop_id: scanCropId,
                            suspected_problem_id: cand.problem_id !== 'pred-1' ? cand.problem_id : '',
                            severity: cand.severity || 'MODERATE',
                            symptoms_notes: `${cand.name} - ${cand.rationale}`
                          }));
                          showToast('AI diagnostic findings applied to case report form.');
                        }}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: '8px', border: 'none',
                          backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '13px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={16} /> Accept & Create Case Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: LIBRARY LIST (S5)
          ========================================== */}
      {activeTab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '400px' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search library by pest, disease, or deficiency name..."
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={libraryFilterType}
                onChange={(e) => setLibraryFilterType(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
              >
                <option value="ALL">FILTER: All Types</option>
                <option value="PEST">Pests</option>
                <option value="DISEASE">Diseases</option>
                <option value="DEFICIENCY">Nutrient Deficiencies</option>
              </select>

              <button
                onClick={() => {
                  setProblemFormType('PEST');
                  setShowProblemModal(true);
                }}
                style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Add Library Entry
              </button>
            </div>
          </div>

          {/* LIBRARY CARDS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {libraryList.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                <BookOpen size={36} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                <div>No library problems found matching filter.</div>
              </div>
            ) : (
              libraryList.map((prob) => (
                <div
                  key={prob.id}
                  onClick={() => openProblemDetail(prob.id)}
                  style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px', cursor: 'pointer', transition: 'all 0.15s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                      {prob.code}
                    </span>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                      backgroundColor: prob.problem_type === 'PEST' ? '#fee2e2' : (prob.problem_type === 'DISEASE' ? '#fef3c7' : '#dbeafe'),
                      color: prob.problem_type === 'PEST' ? '#dc2626' : (prob.problem_type === 'DISEASE' ? '#d97706' : '#2563eb')
                    }}>
                      {prob.problem_type}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{prob.name}</h3>
                  {prob.scientific_name && <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#64748b', marginBottom: '10px' }}>{prob.scientific_name}</div>}

                  {prob.primary_image_url && (
                    <div style={{ height: '120px', borderRadius: '8px', overflow: 'hidden', margin: '8px 0', backgroundColor: '#f1f5f9' }}>
                      <img src={prob.primary_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Crops:</span>
                    {Array.isArray(prob.mapped_crops) && prob.mapped_crops.map(c => (
                      <span key={c.id} style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#334155' }}>
                        {c.icon || '🌱'} {c.name}
                      </span>
                    ))}
                    {prob.image_count > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                        📷 {prob.image_count} photos
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Problem Image Gallery Modal (SRS 10.2) */}
          {selectedProblemId && (
            <ProblemImageGalleryModal
              isOpen={Boolean(selectedProblemId)}
              problemId={selectedProblemId}
              cropId={null}
              cropName={null}
              onClose={() => setSelectedProblemId(null)}
              apiBase={API_BASE.replace('/api', '')}
            />
          )}
        </div>
      )}

      {/* REPORT ISSUE WIZARD MODAL (S2) */}
      {showReportWizard && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', pb: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Report Crop Issue</h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Step {wizardStep} of 4</div>
              </div>
              <button onClick={() => setShowReportWizard(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmitReportWizard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* STEP 1 */}
              {wizardStep === 1 && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Select Crop *</label>
                    <select
                      required
                      value={wizardData.crop_id}
                      onChange={(e) => setWizardData({ ...wizardData, crop_id: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                    >
                      <option value="">-- Choose Crop --</option>
                      {masterCrops.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.icon || '🌱'} {c.name}{c.custom_name ? ` (${c.custom_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Growth Stage</label>
                    <select
                      value={wizardData.crop_stage}
                      onChange={(e) => setWizardData({ ...wizardData, crop_stage: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                    >
                      <option value="Nursery">Nursery</option>
                      <option value="Vegetative">Vegetative</option>
                      <option value="Flowering">Flowering</option>
                      <option value="Fruiting">Fruiting</option>
                      <option value="Harvest">Harvest</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Observed Date & Time</label>
                    <input
                      type="datetime-local"
                      value={wizardData.observed_at}
                      onChange={(e) => setWizardData({ ...wizardData, observed_at: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </>
              )}

              {/* STEP 2 */}
              {wizardStep === 2 && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Affected Plant Parts</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(lookups['PLANT_PART'] || [{ id: 'part-leaf', label: 'Leaf' }, { id: 'part-stem', label: 'Stem' }, { id: 'part-fruit', label: 'Fruit' }, { id: 'part-root', label: 'Root' }]).map(p => {
                        const isSel = wizardData.plant_part_ids.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setWizardData(prev => ({
                                ...prev,
                                plant_part_ids: isSel ? prev.plant_part_ids.filter(x => x !== p.id) : [...prev.plant_part_ids, p.id]
                              }));
                            }}
                            style={{
                              padding: '6px 14px', borderRadius: '16px', border: isSel ? '1px solid #16a34a' : '1px solid #cbd5e1',
                              backgroundColor: isSel ? '#dcfce7' : '#ffffff', color: isSel ? '#16a34a' : '#475569',
                              fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Symptom Notes & Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe symptoms observed (e.g. yellowing spots on lower leaves, dark lesions, wilting)..."
                      value={wizardData.symptoms_notes}
                      onChange={(e) => setWizardData({ ...wizardData, symptoms_notes: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  {/* PROVISION TO UPLOAD IMAGES & DIRECT CAMERA OPTION */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '6px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                      📸 Crop Issue Photos (Infected, Pest Affected, or Diseased Portion)
                    </label>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      {/* DIRECT CAMERA OPTION */}
                      <button
                        type="button"
                        onClick={startCamera}
                        style={{
                          padding: '12px', borderRadius: '10px', border: '2px dashed #2563eb',
                          backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: '13px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                      >
                        <Camera size={18} color="#2563eb" /> Take Camera Picture
                      </button>

                      {/* FILE UPLOAD OPTION (MULTIPLE IMAGES) */}
                      <label style={{
                        padding: '12px', borderRadius: '10px', border: '2px dashed #16a34a',
                        backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '13px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}>
                        <Upload size={18} color="#16a34a" /> Upload Image Files
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp"
                          multiple
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>

                    {/* ATTACHED PHOTOS PREVIEW GRID */}
                    {wizardData.photos && wizardData.photos.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '10px' }}>
                        {wizardData.photos.map((p, idx) => (
                          <div key={idx} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc' }}>
                            <img src={typeof p === 'string' ? p : p.url} alt={`Issue ${idx + 1}`} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              style={{
                                position: 'absolute', top: '4px', right: '4px', border: 'none', borderRadius: '50%',
                                backgroundColor: '#ef4444', color: '#ffffff', width: '22px', height: '22px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        No images attached yet. Use camera or upload to attach crop photos.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* STEP 3 */}
              {wizardStep === 3 && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Severity Level</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                      {['LOW', 'MODERATE', 'HIGH', 'SEVERE'].map(sev => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setWizardData({ ...wizardData, severity: sev })}
                          style={{
                            padding: '10px', borderRadius: '8px',
                            border: wizardData.severity === sev ? '2px solid #16a34a' : '1px solid #cbd5e1',
                            backgroundColor: wizardData.severity === sev ? '#f0fdf4' : '#ffffff',
                            color: wizardData.severity === sev ? '#16a34a' : '#475569',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>% Plants Affected</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={wizardData.incidence_pct}
                      onChange={(e) => setWizardData({ ...wizardData, incidence_pct: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  {/* AREA AFFECTED: UNIT DROPDOWN LIST BOX DISPLAYED BEFORE THE AREA FIELD */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Area Affected</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px', alignItems: 'center' }}>
                      {/* UNIT DROPDOWN BEFORE FIELD */}
                      <select
                        value={wizardData.area_unit || 'bed'}
                        onChange={(e) => setWizardData({ ...wizardData, area_unit: e.target.value })}
                        style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, backgroundColor: '#ffffff', color: '#0f172a' }}
                      >
                        <option value="bed">bed</option>
                        <option value="acre">acre</option>
                        <option value="sq_m">sq m</option>
                      </select>

                      {/* AREA AFFECTED VALUE FIELD */}
                      {wizardData.area_unit === 'bed' ? (
                        <input
                          type="text"
                          placeholder="e.g. 1-5, 8, 10-12"
                          value={wizardData.area_affected || ''}
                          onChange={(e) => setWizardData({ ...wizardData, area_affected: e.target.value })}
                          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Enter area value..."
                          value={wizardData.area_affected || ''}
                          onChange={(e) => setWizardData({ ...wizardData, area_affected: e.target.value })}
                          style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      )}
                    </div>
                    {wizardData.area_unit === 'bed' && (
                      <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                        💡 Enter bed numbers or ranges using comma <code>,</code> or hyphen <code>-</code> (e.g. <code>1-5, 8, 12-15</code>)
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* STEP 4 */}
              {wizardStep === 4 && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Diagnostic Path</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {[
                        { id: 'AI', title: 'Diagnose with AI Engine', desc: 'Auto-analyse symptoms & match with grounded library' },
                        { id: 'AGRONOMIST', title: 'Ask an Agronomist / Consultant', desc: 'Assign to external agronomist for expert review' }
                      ].map(path => (
                        <div
                          key={path.id}
                          onClick={() => setWizardData({ ...wizardData, diagnose_path: path.id })}
                          style={{
                            padding: '12px 14px', borderRadius: '10px',
                            border: wizardData.diagnose_path === path.id ? '2px solid #16a34a' : '1px solid #cbd5e1',
                            backgroundColor: wizardData.diagnose_path === path.id ? '#f0fdf4' : '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{path.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{path.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* STEP NAVIGATION */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Back
                  </button>
                ) : <div />}

                {/* STEP 1: Next with validation */}
                {wizardStep === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!wizardData.crop_id) {
                        showToast('Please select a crop before proceeding', 'error');
                        return;
                      }
                      setWizardStep(2);
                    }}
                    style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Next
                  </button>
                )}

                {/* STEP 2: Next */}
                {wizardStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    style={{ marginLeft: 'auto', padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Next
                  </button>
                )}

                {/* STEP 3 (LAST SCREEN 3 OF 4 OF REPORT ISSUE POPUP): DISPLAY BUTTON SAVE */}
                {wizardStep === 3 && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                      Next (Options)
                    </button>
                    <button
                      type="button"
                      id="btn-save-issue-step3"
                      disabled={isSavingReport}
                      onClick={handleSubmitReportWizard}
                      style={{
                        padding: '9px 24px', borderRadius: '8px', border: 'none',
                        background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '13px',
                        cursor: isSavingReport ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)'
                      }}
                    >
                      <Check size={16} /> {isSavingReport ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}

                {/* STEP 4: Save / Submit */}
                {wizardStep === 4 && (
                  <button
                    type="submit"
                    disabled={isSavingReport}
                    style={{
                      marginLeft: 'auto', padding: '9px 24px', borderRadius: '8px', border: 'none',
                      background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '13px',
                      cursor: isSavingReport ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Check size={16} /> {isSavingReport ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CREATE LIBRARY ENTRY MODAL (S6) */}
      {showProblemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', pb: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Add Library Problem Entry</h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Pest, Disease or Deficiency Master Data</div>
              </div>
              <button onClick={() => setShowProblemModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveProblem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {['PEST', 'DISEASE', 'DEFICIENCY'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setProblemFormType(t)}
                    style={{
                      padding: '10px', borderRadius: '8px',
                      border: problemFormType === t ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      backgroundColor: problemFormType === t ? '#f0fdf4' : '#ffffff',
                      color: problemFormType === t ? '#16a34a' : '#475569',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Name *</label>
                <input
                  type="text"
                  required
                  placeholder={problemFormType === 'PEST' ? 'e.g. Tomato Hornworm, Aphids' : (problemFormType === 'DISEASE' ? 'e.g. Early Blight, Powdery Mildew' : 'e.g. Nitrogen Deficiency')}
                  value={problemForm.name}
                  onChange={(e) => setProblemForm({ ...problemForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {problemFormType !== 'DEFICIENCY' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Scientific Name / Causal Organism</label>
                  <input
                    type="text"
                    placeholder="e.g. Manduca quinquemaculata / Alternaria solani"
                    value={problemForm.scientific_name}
                    onChange={(e) => setProblemForm({ ...problemForm, scientific_name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Nutrient *</label>
                  <select
                    value={problemForm.nutrient_code}
                    onChange={(e) => setProblemForm({ ...problemForm, nutrient_code: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                  >
                    {nutrients.map(n => (
                      <option key={n.code} value={n.code}>{n.code} - {n.name} ({n.category})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Identification & Symptoms Text *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed identification features and symptom descriptions..."
                  value={problemForm.identification_text}
                  onChange={(e) => setProblemForm({ ...problemForm, identification_text: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowProblemModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASE DETAIL DRAWER / MODAL (S3) */}
      {selectedCaseId && caseDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '750px', height: '100vh', overflowY: 'auto', padding: '28px', boxShadow: '-10px 0 25px rgba(0,0,0,0.15)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>CASE DETAILS</div>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{caseDetail.case_no}</h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!isEditingCase ? (
                  <button
                    type="button"
                    onClick={() => startEditCase(caseDetail)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff', color: '#1e293b', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={15} color="#2563eb" />
                    <span>Edit Issue</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingCase(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer'
                    }}
                  >
                    Cancel Edit
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteSingleCase(caseDetail.id, caseDetail.case_no)}
                  title="Delete case"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', borderRadius: '8px', border: 'none',
                    backgroundColor: '#fee2e2', color: '#ef4444', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>

                <button onClick={() => { setSelectedCaseId(null); setIsEditingCase(false); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={22} /></button>
              </div>
            </div>

            {/* EDIT CASE FORM VIEW */}
            {isEditingCase ? (
              <form onSubmit={handleSaveEditCase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    ✏️ Edit Reported Issue Details
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Crop *</label>
                      <select
                        value={editCaseForm.crop_id}
                        onChange={(e) => setEditCaseForm({ ...editCaseForm, crop_id: e.target.value, variety_id: '' })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                        required
                      >
                        <option value="">Select Crop</option>
                        {masterCrops.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.custom_name ? ` (${c.custom_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Variety</label>
                      <select
                        value={editCaseForm.variety_id}
                        onChange={(e) => setEditCaseForm({ ...editCaseForm, variety_id: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                      >
                        <option value="">Select Variety (Optional)</option>
                        {selectedEditCropVarieties.map(v => (
                          <option key={v.id} value={v.id}>{v.variety_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Crop Growth Stage</label>
                      <select
                        value={editCaseForm.crop_stage}
                        onChange={(e) => setEditCaseForm({ ...editCaseForm, crop_stage: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
                      >
                        <option value="Nursery">Nursery / Seedling</option>
                        <option value="Vegetative">Vegetative Growth</option>
                        <option value="Flowering">Flowering</option>
                        <option value="Fruiting">Fruiting / Pod Formation</option>
                        <option value="Harvesting">Harvesting</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Severity Level</label>
                      <select
                        value={editCaseForm.severity}
                        onChange={(e) => setEditCaseForm({ ...editCaseForm, severity: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, backgroundColor: '#ffffff' }}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MODERATE">MODERATE</option>
                        <option value="HIGH">HIGH</option>
                        <option value="SEVERE">SEVERE</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>% Plants Affected</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editCaseForm.incidence_pct}
                        onChange={(e) => setEditCaseForm({ ...editCaseForm, incidence_pct: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Area Affected</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '10px', alignItems: 'center' }}>
                        {/* UNIT DROPDOWN BEFORE THE AREA FIELD */}
                        <select
                          value={editCaseForm.area_unit || 'bed'}
                          onChange={(e) => setEditCaseForm({ ...editCaseForm, area_unit: e.target.value })}
                          style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, backgroundColor: '#ffffff' }}
                        >
                          <option value="bed">bed</option>
                          <option value="acre">acre</option>
                          <option value="sq_m">sq m</option>
                        </select>

                        {/* AREA VALUE / RANGE FIELD */}
                        {editCaseForm.area_unit === 'bed' ? (
                          <input
                            type="text"
                            placeholder="e.g. 1-5, 8, 10-12"
                            value={editCaseForm.area_affected || ''}
                            onChange={(e) => setEditCaseForm({ ...editCaseForm, area_affected: e.target.value })}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                          />
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Enter area..."
                            value={editCaseForm.area_affected || ''}
                            onChange={(e) => setEditCaseForm({ ...editCaseForm, area_affected: e.target.value })}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                          />
                        )}
                      </div>
                      {editCaseForm.area_unit === 'bed' && (
                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                          💡 Enter bed numbers or ranges (e.g. <code>1-5, 8, 10-12</code>)
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Observed Symptoms & Notes</label>
                    <textarea
                      rows={4}
                      value={editCaseForm.symptoms_notes}
                      onChange={(e) => setEditCaseForm({ ...editCaseForm, symptoms_notes: e.target.value })}
                      placeholder="Describe symptoms, location, pattern, affected parts..."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingCase(false)}
                      style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Check size={16} /> Save Changes
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <>
                {/* CASE SUB-TABS */}
                <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'diagnosis', label: 'Diagnoses (AI & Ground Truth)' },
                    { id: 'treatment', label: 'Treatments & Tasks' },
                    { id: 'followup', label: 'Follow-ups' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setCaseDetailTab(t.id)}
                      style={{
                        padding: '10px 4px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: '13px', fontWeight: caseDetailTab === t.id ? 700 : 600,
                        color: caseDetailTab === t.id ? '#16a34a' : '#64748b',
                        borderBottom: caseDetailTab === t.id ? '2px solid #16a34a' : '2px solid transparent'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* TAB: OVERVIEW */}
                {caseDetailTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>CROP & VARIETY</div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{caseDetail.crop_name} {caseDetail.variety_name && `(${caseDetail.variety_name})`}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>GROWTH STAGE</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{caseDetail.crop_stage || '—'}</div>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>SEVERITY</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: caseDetail.severity === 'SEVERE' || caseDetail.severity === 'HIGH' ? '#ef4444' : '#16a34a', marginTop: '2px' }}>{caseDetail.severity}</div>
                      </div>
                      <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>% AFFECTED</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{caseDetail.incidence_pct ? `${caseDetail.incidence_pct}%` : '—'}</div>
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>OBSERVED SYMPTOMS</div>
                      <div style={{ fontSize: '13px', color: '#334155' }}>{caseDetail.symptoms_notes || 'No symptoms notes entered.'}</div>
                    </div>
                  </div>
                )}

                {/* TAB: DIAGNOSES */}
                {caseDetailTab === 'diagnosis' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button
                      onClick={() => handleRunAiDiagnosis(caseDetail.id)}
                      style={{ padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Sparkles size={16} /> Re-run AI Diagnosis Engine
                    </button>

                    {caseDetail.diagnoses && caseDetail.diagnoses.map((dItem) => (
                      <div key={dItem.id} style={{ backgroundColor: dItem.is_confirmed ? '#f0fdf4' : '#ffffff', padding: '16px', borderRadius: '12px', border: dItem.is_confirmed ? '2px solid #16a34a' : '1px solid #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            {dItem.problem_name || dItem.suggested_name}
                          </div>
                          {dItem.is_confirmed ? (
                            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#16a34a', color: '#ffffff', padding: '3px 8px', borderRadius: '10px' }}>
                              ✓ CONFIRMED GROUND TRUTH
                            </span>
                          ) : (
                            <button
                              onClick={() => handleConfirmDiagnosis(dItem.id)}
                              style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #16a34a', backgroundColor: '#ffffff', color: '#16a34a', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                            >
                              Confirm this Diagnosis
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569' }}>{dItem.rationale}</div>

                        {/* Reference Photos & Feedback for Case Diagnoses (SRS 10.2) */}
                        <DiagnosisReferenceViewer
                          diagnosis={dItem}
                          cropId={caseDetail.crop_id}
                          cropName={caseDetail.crop_name}
                          apiBase={API_BASE.replace('/api', '')}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB: TREATMENTS */}
                {caseDetailTab === 'treatment' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Planned & Applied Treatments</div>
                    {caseDetail.treatments && caseDetail.treatments.map((tItem) => (
                      <div key={tItem.id} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{tItem.title}</div>
                          {tItem.cases_n >= 5 && tItem.success_rate && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                              Worked in {Math.round(tItem.success_rate * 100)}% of {tItem.cases_n} cases
                            </span>
                          )}
                        </div>
                        {tItem.safe_harvest_date && (
                          <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 600, marginTop: '4px' }}>
                            ⚠️ Safe Harvest Window (PHI): {new Date(tItem.safe_harvest_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      )}

      {/* LIVE CAMERA CAPTURE MODAL POPUP */}
      {showCameraModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '560px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} color="#2563eb" /> Live Camera Photo Capture
              </h3>
              <button onClick={stopCamera} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <div style={{ position: 'relative', width: '100%', height: '320px', backgroundColor: '#0f172a', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!capturedPhotoData ? (
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src={capturedPhotoData} alt="Snapshot Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '4px' }}>
              {!capturedPhotoData ? (
                <button
                  type="button"
                  onClick={snapPhoto}
                  style={{
                    padding: '12px 28px', borderRadius: '30px', border: 'none',
                    backgroundColor: '#ef4444', color: '#ffffff', fontWeight: 800, fontSize: '15px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(239,68,68,0.4)'
                  }}
                >
                  <Camera size={20} /> Snap Photo 📸
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCapturedPhotoData(null)}
                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                  >
                    🔄 Retake
                  </button>
                  <button
                    type="button"
                    onClick={attachCapturedPhoto}
                    style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Check size={16} /> Attach Photo to Issue
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
