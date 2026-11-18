import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Settings,
  HelpCircle,
  MapPin,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  CheckSquare,
  FileText,
  IndianRupee,
  Users,
  Layers,
  Folder,
  Bell,
  User,
  LogOut,
  Info,
  Sun,
  AlertTriangle,
  Grid,
  CheckCircle,
  HelpCircle as HelpIcon,
  X,
  XCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Map,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Trash2,
  CalendarDays,
  ListFilter,
  Eye,
  StickyNote,
  Contact,
  ShoppingBag,
  Building2,
  CloudRain,
  RefreshCw,
  Zap,
  Smartphone,
  CreditCard,
  Database,
  Sprout
} from 'lucide-react';

// Helper to get 2-letter uppercase initials
function getInitials(name) {
  if (!name) return 'FA';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Helper to format relative access time
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Opened recently';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Opened just now';
  if (diffHours < 24) return `Opened ${diffHours}h ago`;
  if (diffDays < 7) return `Opened ${diffDays}d ago`;
  if (diffDays < 30) return `Opened ${Math.floor(diffDays / 7)}w ago`;
  return `Opened ${date.toLocaleDateString()}`;
}

import FarmMapScreen from './FarmMap.jsx';
import CropLibraryScreen from './grow/CropLibrary.jsx';
import CropPlanScreen from './grow/CropPlan.jsx';
import HarvestPlannerScreen from './grow/HarvestPlanner.jsx';
import CropHealthScreen from './grow/CropHealth.jsx';
import SalesChannelsScreen from './sell/SalesChannels.jsx';
import OrdersManagerScreen from './sell/OrdersManager.jsx';
import PackManagerScreen from './sell/PackManager.jsx';
import ContainersScreen from './assets/Containers.jsx';
import EquipmentToolsScreen from './assets/EquipmentTools.jsx';
import MaterialsInputsScreen from './assets/MaterialsInputs.jsx';
import TimeAttendanceScreen from './labor/TimeAttendance.jsx';
import CrewManagerScreen from './labor/CrewManager.jsx';
import LaborAnalyticsScreen from './labor/LaborAnalytics.jsx';
import TransactionsScreen from './financials/Transactions.jsx';
import AccountingCategoriesScreen from './financials/AccountingCategories.jsx';
import FinancialSummaryScreen from './financials/FinancialSummary.jsx';
import CustomersScreen from './contacts/Customers.jsx';
import VendorsScreen from './contacts/Vendors.jsx';
import ContactDirectoryScreen from './contacts/ContactDirectory.jsx';
import ReportsDashboardScreen from './reports/ReportsDashboard.jsx';
import BuyDashboardScreen from './buy/BuyDashboard.jsx';
import AuthContainer from './auth/AuthContainer.jsx';
import SelectFarmScreen from './auth/SelectFarmScreen.jsx';
import AccountManagement from './account/AccountManagement.jsx';
import MobileAppModal from './account/MobileAppModal.jsx';
import SettingsHub from './settings/SettingsHub.jsx';
import PartnerHubContainer from './partnerhub/PartnerHubContainer.jsx';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:5001/api"
  : "/api";

export default function App() {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState("dashboard"); // 'dashboard' or 'tasks' or 'notes' or 'account'
  const [accountInitialTab, setAccountInitialTab] = useState("plans"); // 'plans' | 'profile' | 'ai-credits' | 'file-storage'
  const [showMobileAppModal, setShowMobileAppModal] = useState(false);
  const [userAiCredits, setUserAiCredits] = useState(25);
  const [settingsSubmodule, setSettingsSubmodule] = useState(null);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('vivas_user') || sessionStorage.getItem('vivas_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [authToken, setAuthToken] = useState(() => {
    return localStorage.getItem('vivas_token') || sessionStorage.getItem('vivas_token') || null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(!!(localStorage.getItem('vivas_token') || sessionStorage.getItem('vivas_token')));

  // Active Farm Workspace & Popup Dropdown State
  const [activeFarm, setActiveFarm] = useState(() => {
    const saved = localStorage.getItem('vivas_active_farm') || sessionStorage.getItem('vivas_active_farm');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSelectingFarm, setIsSelectingFarm] = useState(false);
  const [userFarms, setUserFarms] = useState([]);
  const [showFarmDropdown, setShowFarmDropdown] = useState(false);
  const [farmSearchQuery, setFarmSearchQuery] = useState('');
  const [showAddFarmModal, setShowAddFarmModal] = useState(false);
  const [newFarmForm, setNewFarmForm] = useState({
    farm_name: '',
    legal_name: '',
    city: '',
    state_country: '',
    total_area_acres: '',
    farm_type: 'Organic Vegetables'
  });
  const [submittingFarm, setSubmittingFarm] = useState(false);

  const fetchUserFarms = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/farms`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        const list = data.data || data.farms || [];
        setUserFarms(list);
        if (!activeFarm && list.length > 0) {
          setActiveFarm(list[0]);
          localStorage.setItem('vivas_active_farm', JSON.stringify(list[0]));
        }
      }
    } catch (err) {
      console.error('Error fetching user farms:', err);
    }
  };

  const fetchUserAiCredits = async () => {
    try {
      const res = await fetch(`${API_BASE}/account/summary`);
      const data = await res.json();
      if (data.success && data.aiCredits) {
        setUserAiCredits(data.aiCredits.total_remaining ?? 25);
      }
    } catch (e) {
      // quiet fallback
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserAiCredits();
    }
  }, [isAuthenticated, currentScreen]);

  useEffect(() => {
    if (isAuthenticated && authToken) {
      fetchUserFarms();
    }
  }, [isAuthenticated, authToken]);

  const handleSelectFarm = async (farm) => {
    try {
      await fetch(`${API_BASE}/farms/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ farm_id: farm.id })
      });
    } catch (err) {
      console.warn('Select farm API warning:', err);
    }
    setActiveFarm(farm);
    localStorage.setItem('vivas_active_farm', JSON.stringify(farm));
    setShowFarmDropdown(false);
    setIsSelectingFarm(false);
    setCurrentScreen('dashboard');
  };

  const handleCreateFarmSubmit = async (e) => {
    e.preventDefault();
    if (!newFarmForm.farm_name.trim()) return;
    setSubmittingFarm(true);
    try {
      const res = await fetch(`${API_BASE}/farms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(newFarmForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddFarmModal(false);
        setShowFarmDropdown(false);
        setNewFarmForm({
          farm_name: '',
          legal_name: '',
          city: '',
          state_country: '',
          total_area_acres: '',
          farm_type: 'Organic Vegetables'
        });
        await fetchUserFarms();
        if (data.data) {
          handleSelectFarm(data.data);
        }
      } else {
        alert(data.error || data.message || 'Failed to create farm workspace');
      }
    } catch (err) {
      console.error('Error creating farm:', err);
      alert('Error creating farm workspace');
    } finally {
      setSubmittingFarm(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('vivas_token');
      localStorage.removeItem('vivas_user');
      localStorage.removeItem('vivas_active_farm');
      sessionStorage.removeItem('vivas_token');
      sessionStorage.removeItem('vivas_user');
      sessionStorage.removeItem('vivas_active_farm');
      setAuthToken(null);
      setCurrentUser(null);
      setActiveFarm(null);
      setIsAuthenticated(false);
      setIsSelectingFarm(false);
      setShowProfileDropdown(false);
      setShowFarmDropdown(false);
    }
  };

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        if (hash === 'reports') setCurrentScreen('reports');
        else if (hash === 'buy' || hash === 'buy/shopping-list' || hash === 'smart-shopping-list' || hash === 'purchase-orders' || hash === 'buy/purchase-orders') setCurrentScreen('buy');
        else if (hash === 'customers') setCurrentScreen('customers');
        else if (hash === 'vendors') setCurrentScreen('vendors');
        else if (hash === 'contact-directory') setCurrentScreen('contact-directory');
        else if (hash === 'transactions') setCurrentScreen('transactions');
        else if (hash === 'accounting-categories') setCurrentScreen('accounting-categories');
        else if (hash === 'financial-summary') setCurrentScreen('financial-summary');
        else if (hash === 'containers') setCurrentScreen('containers');
        else if (hash === 'equipment-tools') setCurrentScreen('equipment-tools');
        else if (hash === 'materials-inputs') setCurrentScreen('materials-inputs');
        else if (hash === 'time-attendance') setCurrentScreen('time-attendance');
        else if (hash === 'crew-manager') setCurrentScreen('crew-manager');
        else if (hash === 'labor-analytics') setCurrentScreen('labor-analytics');
        else if (hash === 'crop-library') setCurrentScreen('crop-library');
        else if (hash === 'crop-plan') setCurrentScreen('crop-plan');
        else if (hash === 'harvest-planner') setCurrentScreen('harvest-planner');
        else if (hash === 'sales-channels') setCurrentScreen('sales-channels');
        else if (hash === 'orders') setCurrentScreen('orders');
        else if (hash === 'pack-manager') setCurrentScreen('pack-manager');
        else if (hash === 'farm-map') setCurrentScreen('farm-map');
        else if (hash === 'settings' || hash.startsWith('settings/')) {
          setCurrentScreen('settings');
          const sub = hash.split('/')[1] || null;
          setSettingsSubmodule(sub);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Widget Visibility & Config State (Dashboard)
  const [widgetsConfig, setWidgetsConfig] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Dashboard Widget Data State
  const [tasksStats, setTasksStats] = useState({
    greenhouse_sow: { complete: 0, incomplete: 0 },
    field_planting: { complete: 0, incomplete: 0 },
    harvest: { complete: 0, incomplete: 0 }
  });
  const [ordersStats, setOrdersStats] = useState({ fulfilled: 0, not_fulfilled: 0 });
  const [yieldsData, setYieldsData] = useState([]);
  const [laborData, setLaborData] = useState([]);
  const [plantingsData, setPlantingsData] = useState([]);
  const [sowsData, setSowsData] = useState([]);
  const [todayTasksData, setTodayTasksData] = useState([]);

  // Tasks Screen State
  const [tasksList, setTasksList] = useState([]);
  const [tasksView, setTasksView] = useState("list"); // 'list' or 'calendar'
  const [groupBy, setGroupBy] = useState("task_type");
  const [hideZeroPlannedToHarvest, setHideZeroPlannedToHarvest] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Task Search and Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("This Week");
  const [statusFilter, setStatusFilter] = useState("All");
  const [taskTypeFilter, setTaskTypeFilter] = useState("All");
  const [plantingTypeFilter, setPlantingTypeFilter] = useState("All");
  const [cropFilter, setCropFilter] = useState("All");
  const [varietyFilter, setVarietyFilter] = useState("All");
  const [harvestStageFilter, setHarvestStageFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [locationTypeFilter, setLocationTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All");
  const [plantingIdFilter, setPlantingIdFilter] = useState("All");
  const [equipmentFilter, setEquipmentFilter] = useState("All");

  // Notes & Observations Screen State
  const [notesList, setNotesList] = useState([]);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddSoilTestModal, setShowAddSoilTestModal] = useState(false);

  // Soil Test Drawer — extended state
  const SOIL_TEXTURES = [
    'Clay', 'Sand', 'Silt', 'Loam',
    'Sandy Loam', 'Clay Loam', 'Silty Clay',
    'Silty Loam', 'Loamy Sand', 'Sandy Clay',
    'Sandy Clay Loam', 'Silty Clay Loam'
  ];
  const SOIL_TEST_TABS = ['Basic Info', 'Location', 'Soil Profile', 'Macronutrients', 'Micronutrients', 'Lab', 'Recommendations', 'Attachments'];
  const defaultSoilTestForm = {
    title: '', crop_category: '', crop: '', author_name: 'Vivas Owner',
    note_year: '2026', content: '',
    test_date: new Date().toISOString().split('T')[0], sample_id: '', status: 'Pending',
    location: '', gps_lat: '', gps_lng: '',
    soil_texture: '', soil_depth_cm: '', moisture: '', organic_matter: '', ec: '', cec: '',
    ph: '', nitrogen: '', phosphorus: '', potassium: '', calcium: '', magnesium: '', sulfur: '',
    iron: '', zinc: '', manganese: '', copper: '', boron: '',
    lab_id: null, lab_name: '', recommendations: ''
  };
  const [soilTestForm, setSoilTestForm] = useState({ ...defaultSoilTestForm });
  const [soilTestErrors, setSoilTestErrors] = useState({});
  const [soilTestAttachments, setSoilTestAttachments] = useState([]);
  const ST_ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
  const ST_ALLOWED_EXT = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
  const ST_MAX_SIZE_MB = 5;
  const [labsList, setLabsList] = useState([]);
  const [labSearch, setLabSearch] = useState('');
  const [labDropdownOpen, setLabDropdownOpen] = useState(false);
  const [locationsList, setLocationsList] = useState([]);
  const [showAddLabPopup, setShowAddLabPopup] = useState(false);
  const [showGpsMap, setShowGpsMap] = useState(false);
  const [newLabForm, setNewLabForm] = useState({ lab_name: '', lab_code: '', contact_person: '', phone: '', email: '', address: '', accreditation: '' });
  const [newLabErrors, setNewLabErrors] = useState({});
  const [showAddTaskRecordModal, setShowAddTaskRecordModal] = useState(false);
  const [customTaskTypes, setCustomTaskTypes] = useState([]);
  const [showAddTaskTypePopup, setShowAddTaskTypePopup] = useState(false);
  const [newTaskTypeName, setNewTaskTypeName] = useState('');
  const [taskSubType, setTaskSubType] = useState('');

  // Sub-task options per task type
  const TASK_SUBTYPES = {
    'Field Preparation': ['Land Clearing', 'Plowing & Tilling', 'Discing', 'Raised Bed Formation', 'Drip Line Layout', 'Soil Amendment', 'Mulch Application'],
    'Crop Maintenance': ['Weeding', 'Pruning', 'Thinning', 'Pest Scouting', 'Fertilizing', 'Disease Inspection', 'Canopy Management'],
    'Field Installation': ['Drip Tape Installation', 'Trellis Setup', 'Row Cover Installation', 'Shade Net Setup', 'Irrigation Head Fixing', 'Stake Driving'],
    'Field Removal': ['Post-Season Cleanup', 'Equipment Removal', 'Plastic Film Removal', 'Crop Termination', 'Debris Disposal', 'Irrigation Teardown'],
    'Production': ['Seeding', 'Transplanting', 'Direct Sowing', 'Harvesting', 'Grading', 'Packing', 'Brix Testing'],
    'Post Harvest': ['Sorting', 'Washing', 'Packaging', 'Cold Storage', 'Transport Preparation', 'Labelling', 'Quality Check'],
    'Nursery Operations': ['Seed Treatment', 'Germination Monitoring', 'Potting', 'Seedling Hardening', 'Nursery Labelling', 'Watering Schedule', 'Plug Tray Filling'],
    'Testing': ['Soil pH Test', 'Water Quality Test', 'Tissue Sampling', 'Pest Monitoring Trap', 'Yield Estimation', 'Residue Testing', 'Spectral Analysis'],
  };
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showAddRecordDropdown, setShowAddRecordDropdown] = useState(false);
  const [notesSearchQuery, setNotesSearchQuery] = useState("");
  const [notesTypeFilter, setNotesTypeFilter] = useState(["Notes"]);
  const [notesCropCategoryFilter, setNotesCropCategoryFilter] = useState("All");
  const [notesCropFilter, setNotesCropFilter] = useState("All");
  const [notesLocationFilter, setNotesLocationFilter] = useState("All");
  const [notesAuthorFilter, setNotesAuthorFilter] = useState("All");
  const [notesYearFilter, setNotesYearFilter] = useState("All");

  // New Task form state
  const [newTask, setNewTask] = useState({
    task_name: "",
    task_type: "greenhouse_sow",
    status: "incomplete",
    due_date: "2026-06-27",
    assigned_to: "",
    planting_type: "",
    crop: "",
    variety: "",
    harvest_stage: "N/A",
    location_type: "",
    location: "",
    priority: "Medium",
    tag: "",
    planting_id: "",
    equipment: ""
  });

  // New Note form state
  const [newNote, setNewNote] = useState({
    title: "",
    note_type: "Notes",
    crop_category: "",
    crop: "",
    location: "",
    author_name: "Vivas Owner",
    note_year: "2026",
    content: ""
  });

  // New Soil Test form state
  const [newSoilTest, setNewSoilTest] = useState({
    title: "",
    crop_category: "",
    crop: "",
    location: "",
    author_name: "Vivas Owner",
    note_year: "2026",
    ph: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    content: ""
  });

  // New Completed Task form state
  const [newTaskRecord, setNewTaskRecord] = useState({
    title: "",
    crop_category: "Vegetables",
    crop: "",
    location: "",
    author_name: "Vivas Owner",
    note_year: "2026",
    hours_spent: "",
    content: "",
    // Extended properties
    task_type: "greenhouse_sow",
    status: "Not Started",
    priority: "Medium",
    due_date: new Date().toISOString().split('T')[0],
    start_time: "09:00 AM",
    end_time: "05:00 PM",
    assignee: "",
    checklist: [], // Array of { text: "", done: false }
    instructions: "",
    tags: "",
    planting: "",
    equipment: [],
    inputs: [],
    estimated_labor: "",
    actual_labor: "0h 00m",
    external_links: []
  });

  // General UI States
  const [timeframe, setTimeframe] = useState("This Week");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showGuidedTip, setShowGuidedTip] = useState(true);
  const [growMenuOpen, setGrowMenuOpen] = useState(true);
  const [sellMenuOpen, setSellMenuOpen] = useState(true);
  const [assetsMenuOpen, setAssetsMenuOpen] = useState(true);
  const [laborMenuOpen, setLaborMenuOpen] = useState(true);
  const [contactsMenuOpen, setContactsMenuOpen] = useState(true);
  const [financialsMenuOpen, setFinancialsMenuOpen] = useState(true);
  const [buyMenuOpen, setBuyMenuOpen] = useState(true);
  const [pihMenuOpen, setPihMenuOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Default Mock Configurations
  const defaultWidgetsConfig = [
    { widget_key: 'greenhouse_sow_kpi', title: 'Planned Greenhouse Sow Tasks', is_visible: true, position: 1 },
    { widget_key: 'field_planting_kpi', title: 'Planned Field Plantings Tasks', is_visible: true, position: 2 },
    { widget_key: 'harvest_kpi', title: 'Planned Harvest Tasks', is_visible: true, position: 3 },
    { widget_key: 'orders_kpi', title: 'Committed Orders', is_visible: true, position: 4 },
    { widget_key: 'yield_chart', title: 'Est Yield Value by Crop', is_visible: true, position: 5 },
    { widget_key: 'completion_chart', title: 'Task Completion Status', is_visible: true, position: 6 },
    { widget_key: 'labor_chart', title: 'Est Labor Hours by Person', is_visible: true, position: 7 },
    { widget_key: 'planting_summary_table', title: 'New Field Planting Summary', is_visible: true, position: 8 },
    { widget_key: 'sow_summary_table', title: 'Greenhouse Sow Summary', is_visible: true, position: 9 },
    { widget_key: 'weather_widget', title: 'Weather Widget', is_visible: true, position: 10 },
    { widget_key: 'today_tasks_widget', title: 'Tasks to do today', is_visible: true, position: 11 },
  ];

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const configRes = await fetch(`${API_BASE}/widgets/config`);
      const configJson = await configRes.json();
      if (configJson.success) {
        setWidgetsConfig(configJson.data);
      } else {
        setWidgetsConfig(defaultWidgetsConfig);
      }

      const tasksRes = await fetch(`${API_BASE}/modules/tasks`);
      const tasksJson = await tasksRes.json();
      if (tasksJson.success) {
        setTasksStats(tasksJson.data);
      }

      const ordersRes = await fetch(`${API_BASE}/modules/orders`);
      const ordersJson = await ordersRes.json();
      if (ordersJson.success) {
        setOrdersStats(ordersJson.data);
      }

      const yieldsRes = await fetch(`${API_BASE}/modules/yields`);
      const yieldsJson = await yieldsRes.json();
      if (yieldsJson.success) {
        setYieldsData(yieldsJson.data);
      }

      const laborRes = await fetch(`${API_BASE}/modules/labor`);
      const laborJson = await laborRes.json();
      if (laborJson.success) {
        setLaborData(laborJson.data);
      }

      const plantingsRes = await fetch(`${API_BASE}/modules/plantings`);
      const plantingsJson = await plantingsRes.json();
      if (plantingsJson.success) {
        setPlantingsData(plantingsJson.data);
      }

      const sowsRes = await fetch(`${API_BASE}/modules/sows`);
      const sowsJson = await sowsRes.json();
      if (sowsJson.success) {
        setSowsData(sowsJson.data);
      }

      const todayTasksRes = await fetch(`${API_BASE}/modules/today-tasks`);
      const todayTasksJson = await todayTasksRes.json();
      if (todayTasksJson.success) {
        setTodayTasksData(todayTasksJson.data);
      }
    } catch (err) {
      console.warn("Backend not responding. Falling back to local mock datasets.", err.message);
      setWidgetsConfig(defaultWidgetsConfig);
      setTasksStats({
        greenhouse_sow: { complete: 4, incomplete: 2 },
        field_planting: { complete: 3, incomplete: 5 },
        harvest: { complete: 5, incomplete: 3 }
      });
      setOrdersStats({ fulfilled: 3, not_fulfilled: 3 });
      setYieldsData([
        { crop_name: 'Heirloom Tomatoes', estimated_value: 12000, actual_value: 11500 },
        { crop_name: 'Sweet Strawberries', estimated_value: 8500, actual_value: 9200 },
        { crop_name: 'Romaine Lettuce', estimated_value: 6000, actual_value: 5800 },
        { crop_name: 'Bell Peppers', estimated_value: 7500, actual_value: 7800 },
        { crop_name: 'Sweet Corn', estimated_value: 15000, actual_value: 0 },
        { crop_name: 'Baby Spinach', estimated_value: 4500, actual_value: 4700 }
      ]);
      setLaborData([
        { person_name: 'Alice Johnson', hours_worked: 38.5 },
        { person_name: 'Bob Smith', hours_worked: 42.0 },
        { person_name: 'Carol Danvers', hours_worked: 35.0 },
        { person_name: 'David Miller', hours_worked: 40.5 },
        { person_name: 'Emma Watson', hours_worked: 28.0 }
      ]);
      setPlantingsData([
        { field_name: 'North Field - Sec A', crop_name: 'Heirloom Tomatoes', area_planted: 4.5, planting_date: '2026-06-15' },
        { field_name: 'North Field - Sec B', crop_name: 'Sweet Corn', area_planted: 8.0, planting_date: '2026-06-17' },
        { field_name: 'East Field - Sec C', crop_name: 'Bell Peppers', area_planted: 3.2, planting_date: '2026-06-22' },
        { field_name: 'West Field - Sec D', crop_name: 'Romaine Lettuce', area_planted: 2.5, planting_date: '2026-06-25' },
        { field_name: 'South Field - Sec E', crop_name: 'Zucchini', area_planted: 5.0, planting_date: '2026-06-27' }
      ]);
      setSowsData([
        { greenhouse: 'Greenhouse 1 - Row A', crop_name: 'Heirloom Tomatoes', tray_count: 120, sow_date: '2026-06-12' },
        { greenhouse: 'Greenhouse 1 - Row B', crop_name: 'Sweet Strawberries', tray_count: 80, sow_date: '2026-06-15' },
        { greenhouse: 'Greenhouse 2 - Row A', crop_name: 'Romaine Lettuce', tray_count: 200, sow_date: '2026-06-19' },
        { greenhouse: 'Greenhouse 2 - Row B', crop_name: 'Sweet Basil', tray_count: 150, sow_date: '2026-06-23' },
        { greenhouse: 'Greenhouse 3 - Row A', crop_name: 'Cucumbers', tray_count: 100, sow_date: '2026-06-27' }
      ]);
      setTodayTasksData([
        { id: '1', task_name: 'Check soil moisture in Greenhouse 3', status: 'incomplete', assigned_to: 'Bob Smith' },
        { id: '2', task_name: 'Clean irrigation drip lines in Sector A', status: 'incomplete', assigned_to: 'Alice Johnson' },
        { id: '3', task_name: 'Apply organic compost to Sector C2', status: 'complete', assigned_to: 'Carol Danvers' },
        { id: '4', task_name: 'Calibrate temperature sensors in Greenhouse 1', status: 'incomplete', assigned_to: 'David Miller' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full filterable tasks list
  const fetchTasksList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (dateFilter) params.append("date_range", dateFilter);
      if (statusFilter !== "All") params.append("status", statusFilter);
      if (taskTypeFilter !== "All") params.append("task_type", taskTypeFilter);
      if (plantingTypeFilter !== "All") params.append("planting_type", plantingTypeFilter);
      if (cropFilter !== "All") params.append("crop", cropFilter);
      if (varietyFilter !== "All") params.append("variety", varietyFilter);
      if (harvestStageFilter !== "All") params.append("harvest_stage", harvestStageFilter);
      if (assigneeFilter !== "All") params.append("assigned_to", assigneeFilter);
      if (locationTypeFilter !== "All") params.append("location_type", locationTypeFilter);
      if (locationFilter !== "All") params.append("location", locationFilter);
      if (priorityFilter !== "All") params.append("priority", priorityFilter);
      if (tagFilter !== "All") params.append("tag", tagFilter);
      if (plantingIdFilter !== "All") params.append("planting_id", plantingIdFilter);
      if (equipmentFilter !== "All") params.append("equipment", equipmentFilter);

      const response = await fetch(`${API_BASE}/tasks?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setTasksList(result.data);

        const groups = {};
        result.data.forEach(t => {
          const key = t[groupBy] || 'Unassigned';
          groups[key] = true;
        });
        setExpandedGroups(groups);
      }
    } catch (err) {
      console.warn("Backend not responding. Falling back to local tasks array.", err.message);
      // fallback
    } finally {
      setLoading(false);
    }
  };

  // Fetch filterable Notes & Observations list
  const fetchNotesList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (notesSearchQuery) params.append("search", notesSearchQuery);
      if (notesTypeFilter && notesTypeFilter.length > 0) {
        params.append("note_type", notesTypeFilter.join(","));
      }
      if (notesCropCategoryFilter !== "All") params.append("crop_category", notesCropCategoryFilter);
      if (notesCropFilter !== "All") params.append("crop", notesCropFilter);
      if (notesLocationFilter !== "All") params.append("location", notesLocationFilter);
      if (notesAuthorFilter !== "All") params.append("author_name", notesAuthorFilter);
      if (notesYearFilter !== "All") params.append("note_year", notesYearFilter);

      const response = await fetch(`${API_BASE}/notes?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setNotesList(result.data);
      }
    } catch (err) {
      console.warn("Backend not responding. Falling back to local notes mock database.", err.message);
      // Seed fallback values
      let notes = [
        { id: '1', title: 'First signs of aphids on sweet corn', note_type: 'Observations', crop_category: 'Vegetables', crop: 'Sweet Corn', location: 'North Field - Sec B', author_name: 'Bob Smith', note_year: 2026, content: 'Spotted a small cluster of aphids on the lower leaves of sweet corn rows in Sector B. Need to monitor and potentially introduce ladybugs or apply neem oil.', created_at: new Date().toISOString() },
        { id: '2', title: 'Basil seedlings germination progress', note_type: 'Notes', crop_category: 'Herbs', crop: 'Sweet Basil', location: 'Greenhouse 2 - Row B', author_name: 'Alice Johnson', note_year: 2026, content: 'Germination rate is at ~92%. Starter trays in Greenhouse 2 look very healthy. Irrigation cycle is functioning well.', created_at: new Date().toISOString() },
        { id: '3', title: 'Eggplant transplanting complete', note_type: 'Notes', crop_category: 'Vegetables', crop: 'Eggplant', location: 'East Field - Sec C', author_name: 'Bob Smith', note_year: 2026, content: 'Successfully transplanted 250 eggplant seedlings to East Field Sector C. Soil was prepped with organic compost. Drip lines installed and tested.', created_at: new Date().toISOString() },
        { id: '4', title: 'Spring Soil Test Greenhouse 1', note_type: 'Soil Tests', crop_category: 'Vegetables', crop: 'Heirloom Tomatoes', location: 'Greenhouse 1 - Row A', author_name: 'Alice Johnson', note_year: 2026, ph: 6.5, nitrogen: 45.2, phosphorus: 12.5, potassium: 34.1, content: 'Soil pH is optimal. Nitrogen levels are slightly low; recommend adding organic compost before next planting cycle.', created_at: new Date().toISOString() },
        { id: '5', title: 'Weeding Greenhouse 2 Row B', note_type: 'Task', crop_category: 'Herbs', crop: 'Sweet Basil', location: 'Greenhouse 2 - Row B', author_name: 'Bob Smith', note_year: 2026, hours_spent: 2.5, content: 'Completed hand weeding along the basil starter beds. Seedlings look strong and healthy.', created_at: new Date().toISOString() },
        { id: '6', title: 'Greenhouse 3 Drip Tape Purchase', note_type: 'Expenses', crop_category: 'Vegetables', crop: 'Cucumbers', location: 'Greenhouse 3 - Row A', author_name: 'Vivas Owner', note_year: 2026, amount: 120.50, content: 'Purchased 500ft of heavy duty drip irrigation tape for Cucumber rows.', created_at: new Date().toISOString() }
      ];
      if (notesSearchQuery) {
        notes = notes.filter(n => n.title.toLowerCase().includes(notesSearchQuery.toLowerCase()));
      }
      if (notesTypeFilter && notesTypeFilter.length > 0) {
        notes = notes.filter(n => {
          if (notesTypeFilter.includes("Notes") && n.note_type === "Observations") return true;
          return notesTypeFilter.includes(n.note_type);
        });
      }
      setNotesList(notes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentScreen === "dashboard") {
      fetchDashboardData();
    } else if (currentScreen === "tasks") {
      fetchTasksList();
    } else if (currentScreen === "notes") {
      fetchNotesList();
    }
  }, [
    currentScreen, searchQuery, dateFilter, statusFilter, taskTypeFilter,
    plantingTypeFilter, cropFilter, varietyFilter, harvestStageFilter,
    assigneeFilter, locationTypeFilter, locationFilter, priorityFilter,
    tagFilter, plantingIdFilter, equipmentFilter, groupBy,
    notesSearchQuery, notesTypeFilter, notesCropCategoryFilter,
    notesCropFilter, notesLocationFilter, notesAuthorFilter, notesYearFilter
  ]);

  // Clean filters helpers
  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFilter("This Week");
    setStatusFilter("All");
    setTaskTypeFilter("All");
    setPlantingTypeFilter("All");
    setCropFilter("All");
    setVarietyFilter("All");
    setHarvestStageFilter("All");
    setAssigneeFilter("All");
    setLocationTypeFilter("All");
    setLocationFilter("All");
    setPriorityFilter("All");
    setTagFilter("All");
    setPlantingIdFilter("All");
    setEquipmentFilter("All");
  };

  const handleClearNotesFilters = () => {
    setNotesSearchQuery("");
    setNotesTypeFilter(["Notes"]);
    setNotesCropCategoryFilter("All");
    setNotesCropFilter("All");
    setNotesLocationFilter("All");
    setNotesAuthorFilter("All");
    setNotesYearFilter("All");
  };

  // Option lists helpers
  const getUniqueOptions = (fieldKey) => {
    const vals = tasksList.map(t => t[fieldKey]).filter(Boolean);
    return ["All", ...new Set(vals)];
  };

  const getUniqueNotesOptions = (fieldKey) => {
    const vals = notesList.map(n => n[fieldKey]).filter(Boolean);
    return ["All", ...new Set(vals)];
  };

  // Add Task Modal Submit Handler
  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ Task added successfully!");
        setShowAddTaskModal(false);
        setNewTask({
          task_name: "",
          task_type: "greenhouse_sow",
          status: "incomplete",
          due_date: "2026-06-27",
          assigned_to: "",
          planting_type: "",
          crop: "",
          variety: "",
          harvest_stage: "N/A",
          location_type: "",
          location: "",
          priority: "Medium",
          tag: "",
          planting_id: "",
          equipment: ""
        });
        fetchTasksList();
      }
    } catch (err) {
      console.warn("Backend server not responding. Simulating new task addition locally.", err.message);
      const fakeNewTask = {
        ...newTask,
        id: Math.random().toString(),
        created_at: new Date().toISOString()
      };
      setTasksList(prev => [fakeNewTask, ...prev]);
      alert("✅ Task added successfully (Local Mode)!");
      setShowAddTaskModal(false);
    }
  };

  // Add Note Modal Submit Handler
  const handleAddNoteSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote)
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ Note/Observation added successfully!");
        setShowAddNoteModal(false);
        setNewNote({
          title: "",
          note_type: "Notes",
          crop_category: "",
          crop: "",
          location: "",
          author_name: "Vivas Owner",
          note_year: "2026",
          content: ""
        });
        fetchNotesList();
      }
    } catch (err) {
      console.warn("Backend server not responding. Adding note locally.", err.message);
      const fakeNewNote = {
        ...newNote,
        id: Math.random().toString(),
        created_at: new Date().toISOString()
      };
      setNotesList(prev => [fakeNewNote, ...prev]);
      alert("✅ Note added successfully (Local Mode)!");
      setShowAddNoteModal(false);
    }
  };

  // ── Soil Test Drawer Handlers ──

  const fetchLabsList = async (q = '') => {
    try {
      const url = q ? `${API_BASE}/labs?search=${encodeURIComponent(q)}` : `${API_BASE}/labs`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setLabsList(data.data);
    } catch { setLabsList([]); }
  };

  const fetchLocationsList = async () => {
    try {
      const res = await fetch(`${API_BASE}/locations`);
      const data = await res.json();
      if (data.success) setLocationsList(data.data);
    } catch { setLocationsList([]); }
  };

  const validateSoilTestForm = () => {
    const errs = {};
    if (!soilTestForm.title.trim()) errs.title = 'Title is required';
    if (!soilTestForm.test_date) errs.test_date = 'Test date is required';
    if (!soilTestForm.author_name.trim()) errs.author_name = 'Author name is required';
    if (soilTestForm.ph !== '' && (parseFloat(soilTestForm.ph) < 0 || parseFloat(soilTestForm.ph) > 14))
      errs.ph = 'pH must be between 0 and 14';
    const numericFields = ['nitrogen', 'phosphorus', 'potassium', 'calcium', 'magnesium', 'sulfur', 'iron', 'zinc', 'manganese', 'copper', 'boron', 'cec', 'ec', 'moisture', 'soil_depth_cm', 'organic_matter', 'gps_lat', 'gps_lng'];
    numericFields.forEach(f => {
      if (soilTestForm[f] !== '' && isNaN(parseFloat(soilTestForm[f])))
        errs[f] = 'Must be a valid number';
      if (soilTestForm[f] !== '' && parseFloat(soilTestForm[f]) < 0 && !['gps_lat', 'gps_lng'].includes(f))
        errs[f] = 'Must be ≥ 0';
    });
    setSoilTestErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSoilTestDrawerOpen = () => {
    setSoilTestForm({ ...defaultSoilTestForm });
    setSoilTestErrors({});
    // Revoke any previous image preview URLs to avoid memory leaks
    soilTestAttachments.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
    setSoilTestAttachments([]);
    setLabSearch('');
    setLabDropdownOpen(false);
    fetchLabsList();
    fetchLocationsList();
    setShowAddSoilTestModal(true);
  };

  const handleSoilTestSubmit = async (e) => {
    e.preventDefault();
    if (!validateSoilTestForm()) return;
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...soilTestForm, note_type: 'Soil Tests' })
      });
      const result = await response.json();
      if (result.success) {
        alert('✅ Soil Test record saved successfully!');
        setShowAddSoilTestModal(false);
        setSoilTestForm({ ...defaultSoilTestForm });
        fetchNotesList();
      } else {
        alert('❌ Error: ' + (result.message || 'Could not save record'));
      }
    } catch (err) {
      console.warn('Offline mode:', err.message);
      setNotesList(prev => [{ ...soilTestForm, id: Math.random().toString(), note_type: 'Soil Tests', created_at: new Date().toISOString() }, ...prev]);
      alert('✅ Soil Test saved (Offline Mode)');
      setShowAddSoilTestModal(false);
    }
  };

  const handleAddLabSubmit = async () => {
    const errs = {};
    if (!newLabForm.lab_name.trim()) errs.lab_name = 'Lab name is required';
    if (newLabForm.email && !/\S+@\S+\.\S+/.test(newLabForm.email)) errs.email = 'Invalid email';
    setNewLabErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const res = await fetch(`${API_BASE}/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLabForm)
      });
      const data = await res.json();
      if (data.success) {
        setSoilTestForm(prev => ({ ...prev, lab_id: data.data.id, lab_name: data.data.lab_name }));
        setLabSearch(data.data.lab_name);
        await fetchLabsList();
        setShowAddLabPopup(false);
        setNewLabForm({ lab_name: '', lab_code: '', contact_person: '', phone: '', email: '', address: '', accreditation: '' });
        setNewLabErrors({});
      }
    } catch (err) {
      alert('Error saving lab: ' + err.message);
    }
  };

  const handleGpsCapture = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSoilTestForm(prev => ({
            ...prev,
            gps_lat: pos.coords.latitude.toFixed(8),
            gps_lng: pos.coords.longitude.toFixed(8)
          }));
          setShowGpsMap(false);
        },
        () => alert('Unable to get location. Please enter coordinates manually.')
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  // Add Completed Task Drawer Submit Handler
  const handleAddTaskRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTaskRecord,
          note_type: "Task"
        })
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ Completed Task record added successfully!");
        setShowAddTaskRecordModal(false);
        setNewTaskRecord({
          title: "",
          crop_category: "Vegetables",
          crop: "",
          location: "",
          author_name: "Vivas Owner",
          note_year: "2026",
          hours_spent: "",
          content: "",
          task_type: "greenhouse_sow",
          status: "Not Started",
          priority: "Medium",
          due_date: new Date().toISOString().split('T')[0],
          start_time: "09:00 AM",
          end_time: "05:00 PM",
          assignee: "",
          checklist: [],
          instructions: "",
          tags: "",
          planting: "",
          equipment: [],
          inputs: [],
          estimated_labor: "",
          actual_labor: "0h 00m",
          external_links: []
        });
        fetchNotesList();
      }
    } catch (err) {
      console.warn("Backend server not responding. Adding record locally.", err.message);
      const fakeRecord = {
        ...newTaskRecord,
        id: Math.random().toString(),
        note_type: "Task",
        created_at: new Date().toISOString()
      };
      setNotesList(prev => [fakeRecord, ...prev]);
      alert("✅ Completed Task added successfully (Local Mode)!");
      setShowAddTaskRecordModal(false);
      setNewTaskRecord({
        title: "",
        crop_category: "Vegetables",
        crop: "",
        location: "",
        author_name: "Vivas Owner",
        note_year: "2026",
        hours_spent: "",
        content: "",
        task_type: "greenhouse_sow",
        status: "Not Started",
        priority: "Medium",
        due_date: new Date().toISOString().split('T')[0],
        start_time: "09:00 AM",
        end_time: "05:00 PM",
        assignee: "",
        checklist: [],
        instructions: "",
        tags: "",
        planting: "",
        equipment: [],
        inputs: [],
        estimated_labor: "",
        actual_labor: "0h 00m",
        external_links: []
      });
    }
  };

  // Toggle status of a task
  const handleToggleTaskStatus = async (task) => {
    const nextStatus = task.status === 'complete' ? 'incomplete' : 'complete';

    setTasksList(prev =>
      prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t)
    );

    try {
      await fetch(`${API_BASE}/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: nextStatus })
      });
    } catch (err) {
      console.warn("Backend server not responding. Checked status locally.", err.message);
    }
  };

  // Delete task handler
  const handleDeleteTask = async (id) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setTasksList(prev => prev.filter(t => t.id !== id));

    try {
      await fetch(`${API_BASE}/tasks/${id}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.warn("Backend server not responding. Task deleted locally.", err.message);
    }
  };

  // Delete note handler
  const handleDeleteNote = async (id) => {
    const note = notesList.find(n => n.id === id);
    if (!note) return;
    if (!confirm(`Are you sure you want to delete this ${note.note_type.toLowerCase() || 'record'}?`)) return;

    setNotesList(prev => prev.filter(n => n.id !== id));

    try {
      await fetch(`${API_BASE}/notes/${id}?type=${encodeURIComponent(note.note_type)}`, {
        method: "DELETE"
      });
    } catch (err) {
      console.warn("Backend server not responding. Note deleted locally.", err.message);
    }
  };

  // Toggle widget visibility checkbox in configuration state
  const handleToggleWidget = (widgetKey) => {
    setWidgetsConfig(prev =>
      prev.map(w => w.widget_key === widgetKey ? { ...w, is_visible: !w.is_visible } : w)
    );
  };

  // Reorder widget positions
  const handleMoveWidget = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === widgetsConfig.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...widgetsConfig];

    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    const reindexed = updated.map((w, idx) => ({ ...w, position: idx + 1 }));
    setWidgetsConfig(reindexed);
  };

  // Save Dashboard Config back to DB
  const handleSaveWidgetConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/widgets/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(widgetsConfig)
      });
      const result = await response.json();
      if (result.success) {
        alert("✅ Dashboard widgets configuration saved successfully!");
        setShowConfigModal(false);
      }
    } catch (err) {
      console.warn("Backend server not responding. Saving settings to local memory only.", err.message);
      alert("✅ Configuration saved locally!");
      setShowConfigModal(false);
    }
  };

  // Toggle Today's Task Completion (Right Sidebar)
  const handleToggleSidebarTask = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'complete' ? 'incomplete' : 'complete';

    setTodayTasksData(prev =>
      prev.map(t => t.id === id ? { ...t, status: nextStatus } : t)
    );

    try {
      await fetch(`${API_BASE}/modules/today-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (err) {
      console.warn("Backend server not responding. Checked task status locally.", err.message);
    }
  };

  // Accordion Expand/Collapse helper
  const toggleGroupExpand = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Check if a widget is visible helper
  const isWidgetVisible = (widgetKey) => {
    const found = widgetsConfig.find(w => w.widget_key === widgetKey);
    return found ? found.is_visible : true;
  };

  // Helper date displays
  const formatDayDate = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    const days = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    return `${dayName} ${dateNum} ${monthName}, ${year}`;
  };

  const getDateRangeText = (tf, startStr, endStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getWeekMonday = (d) => {
      const day = d.getDay();
      const diffToMon = (day === 0 ? -6 : 1 - day);
      const mon = new Date(d);
      mon.setDate(d.getDate() + diffToMon);
      return mon;
    };

    switch (tf) {
      case "Today": {
        return formatDayDate(today);
      }
      case "Tomorrow": {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return formatDayDate(tomorrow);
      }
      case "Yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return formatDayDate(yesterday);
      }
      case "This Week": {
        const mon = getWeekMonday(today);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return `${formatDayDate(mon)} - ${formatDayDate(sun)}`;
      }
      case "Next Week": {
        const mon = getWeekMonday(today);
        mon.setDate(mon.getDate() + 7);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return `${formatDayDate(mon)} - ${formatDayDate(sun)}`;
      }
      case "Last Week": {
        const mon = getWeekMonday(today);
        mon.setDate(mon.getDate() - 7);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        return `${formatDayDate(mon)} - ${formatDayDate(sun)}`;
      }
      case "This Month": {
        const first = new Date(today.getFullYear(), today.getMonth(), 1);
        const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return `${formatDayDate(first)} - ${formatDayDate(last)}`;
      }
      case "Next Month": {
        const first = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const last = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        return `${formatDayDate(first)} - ${formatDayDate(last)}`;
      }
      case "Last Month": {
        const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const last = new Date(today.getFullYear(), today.getMonth(), 0);
        return `${formatDayDate(first)} - ${formatDayDate(last)}`;
      }
      case "This Season": {
        const m = today.getMonth();
        let seasonName = '';
        let first, last;
        if (m >= 2 && m <= 4) {
          seasonName = 'Spring';
          first = new Date(today.getFullYear(), 2, 1);
          last = new Date(today.getFullYear(), 5, 0);
        } else if (m >= 5 && m <= 7) {
          seasonName = 'Summer';
          first = new Date(today.getFullYear(), 5, 1);
          last = new Date(today.getFullYear(), 8, 0);
        } else if (m >= 8 && m <= 10) {
          seasonName = 'Fall';
          first = new Date(today.getFullYear(), 8, 1);
          last = new Date(today.getFullYear(), 11, 0);
        } else {
          seasonName = 'Winter';
          const y = m === 11 ? today.getFullYear() : today.getFullYear() - 1;
          first = new Date(y, 11, 1);
          last = new Date(y + 1, 2, 0);
        }
        return `${seasonName} (${formatDayDate(first)} - ${formatDayDate(last)})`;
      }
      case "Next Season": {
        const m = today.getMonth();
        let seasonName = '';
        let first, last;
        if (m >= 2 && m <= 4) {
          seasonName = 'Summer';
          first = new Date(today.getFullYear(), 5, 1);
          last = new Date(today.getFullYear(), 8, 0);
        } else if (m >= 5 && m <= 7) {
          seasonName = 'Fall';
          first = new Date(today.getFullYear(), 8, 1);
          last = new Date(today.getFullYear(), 11, 0);
        } else if (m >= 8 && m <= 10) {
          seasonName = 'Winter';
          first = new Date(today.getFullYear(), 11, 1);
          last = new Date(today.getFullYear() + 1, 2, 0);
        } else {
          seasonName = 'Spring';
          const y = m === 11 ? today.getFullYear() + 1 : today.getFullYear();
          first = new Date(y, 2, 1);
          last = new Date(y, 5, 0);
        }
        return `${seasonName} (${formatDayDate(first)} - ${formatDayDate(last)})`;
      }
      case "Custom Range": {
        if (startStr && endStr) {
          const s = new Date(startStr + 'T00:00:00');
          const e = new Date(endStr + 'T00:00:00');
          return `${formatDayDate(s)} - ${formatDayDate(e)}`;
        }
        if (startStr) {
          const s = new Date(startStr + 'T00:00:00');
          return `From ${formatDayDate(s)}`;
        }
        if (endStr) {
          const e = new Date(endStr + 'T00:00:00');
          return `Until ${formatDayDate(e)}`;
        }
        return "Select From & To dates";
      }
      default:
        return formatDayDate(today);
    }
  };

  const dateText = getDateRangeText(timeframe, customStartDate, customEndDate);

  // Calculate dynamic task completion counts for Dashboard Donut chart
  const totalTasksCount =
    (tasksStats.greenhouse_sow?.complete || 0) + (tasksStats.greenhouse_sow?.incomplete || 0) +
    (tasksStats.field_planting?.complete || 0) + (tasksStats.field_planting?.incomplete || 0) +
    (tasksStats.harvest?.complete || 0) + (tasksStats.harvest?.incomplete || 0);

  const completedTasksCount =
    (tasksStats.greenhouse_sow?.complete || 0) +
    (tasksStats.field_planting?.complete || 0) +
    (tasksStats.harvest?.complete || 0);

  const incompleteTasksCount = totalTasksCount - completedTasksCount;

  // Sorted widgets list by position
  const sortedWidgets = [...widgetsConfig].sort((a, b) => a.position - b.position);

  // Grouped tasks list compilation
  const groupedTasks = {};
  tasksList.forEach(t => {
    if (hideZeroPlannedToHarvest && t.task_type === 'harvest' && t.status === 'complete') {
      return;
    }
    const key = t[groupBy] || 'Unassigned';
    if (!groupedTasks[key]) groupedTasks[key] = [];
    groupedTasks[key].push(t);
  });

  if (!isAuthenticated) {
    return (
      <AuthContainer
        onLoginSuccess={(user, token) => {
          setCurrentUser(user);
          setAuthToken(token);
          setIsAuthenticated(true);
          setIsSelectingFarm(true);
        }}
      />
    );
  }

  if (isSelectingFarm) {
    return (
      <SelectFarmScreen
        currentUser={currentUser}
        authToken={authToken}
        onSelectFarm={(farm) => {
          handleSelectFarm(farm);
        }}
        onSkip={() => {
          setIsSelectingFarm(false);
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app-container">

      {/* 1. LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/logo.jpg" alt="Vivas AI Logo" className="logo-img" />
          </div>

          {/* SIDEBAR ACTIVE FARM WORKSPACE BADGE */}
          <div className="relative mb-3 w-full">
            <button
              onClick={() => setIsSelectingFarm(true)}
              title="Click to switch farm workspace"
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#cbd5e1] hover:border-[#10b981] transition-all text-left shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-[#fce7f3] border border-[#fbcfe8] text-[#9d174d] font-bold text-xs flex items-center justify-center shrink-0">
                  {getInitials(activeFarm?.farm_name || currentUser?.farm_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[#0f291e] truncate group-hover:text-[#10b981] transition-colors">
                      {activeFarm?.farm_name || currentUser?.farm_name || 'Vivas AI Demo Farm'}
                    </span>
                    <RefreshCw size={12} className="text-[#64748b] group-hover:text-[#10b981] shrink-0" />
                  </div>
                  <div className="text-[11px] text-[#64748b] font-medium">
                    {activeFarm?.role_in_farm || 'Owner'}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="#import-hub" className="nav-item nav-item-blue">
            <span className="nav-icon-badge blue"><Layers className="nav-item-icon" /></span>
            <span>Import Hub</span>
          </a>
          <button
            onClick={() => setCurrentScreen("dashboard")}
            className={`nav-item nav-item-blue ${currentScreen === 'dashboard' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge blue"><LayoutGrid className="nav-item-icon" /></span>
            <span>Dashboards</span>
          </button>
          <button
            onClick={() => setCurrentScreen("tasks")}
            className={`nav-item nav-item-green ${currentScreen === 'tasks' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge green"><CheckSquare className="nav-item-icon" /></span>
            <span>Tasks</span>
          </button>
          <button
            onClick={() => setCurrentScreen("notes")}
            className={`nav-item nav-item-blue ${currentScreen === 'notes' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge blue"><FileText className="nav-item-icon" /></span>
            <span>Notes</span>
          </button>
          <button
            onClick={() => setCurrentScreen('farm-map')}
            className={`nav-item nav-item-brown ${currentScreen === 'farm-map' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge brown"><Map className="nav-item-icon" /></span>
            <span>Farm Map</span>
          </button>

          {/* Grow Dropdown Menu */}
          <button onClick={() => setGrowMenuOpen(!growMenuOpen)} className={`nav-item nav-item-green ${['crop-library', 'crop-plan', 'harvest-planner', 'crop-health'].includes(currentScreen) ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}>
            <span className="nav-icon-badge green"><TrendingUp className="nav-item-icon" /></span>
            <span>Grow</span>
            {growMenuOpen ? <ChevronUp className="nav-item-arrow" /> : <ChevronDown className="nav-item-arrow" />}
          </button>

          {growMenuOpen && (
            <div className="submenu">
              <button
                onClick={() => setCurrentScreen("crop-library")}
                className={`submenu-item ${currentScreen === 'crop-library' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Crop Library
              </button>
              <button
                onClick={() => setCurrentScreen("crop-plan")}
                className={`submenu-item ${currentScreen === 'crop-plan' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Crop Plan
              </button>
              <button
                onClick={() => setCurrentScreen("harvest-planner")}
                className={`submenu-item ${currentScreen === 'harvest-planner' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Harvest Planner
              </button>
              <button
                onClick={() => setCurrentScreen("crop-health")}
                className={`submenu-item ${currentScreen === 'crop-health' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Crop Health
              </button>
            </div>
          )}

          {/* Sell Dropdown Menu */}
          <button
            onClick={() => setSellMenuOpen(!sellMenuOpen)}
            className={`nav-item nav-item-blue ${['sales-channels', 'orders', 'pack-manager'].includes(currentScreen) ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge blue"><IndianRupee className="nav-item-icon" /></span>
            <span>Sell</span>
            {sellMenuOpen ? <ChevronUp className="nav-item-arrow" /> : <ChevronDown className="nav-item-arrow" />}
          </button>

          {sellMenuOpen && (
            <div className="submenu">
              <button
                onClick={() => setCurrentScreen("sales-channels")}
                className={`submenu-item ${currentScreen === 'sales-channels' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Sales Channels
              </button>
              <button
                onClick={() => setCurrentScreen("orders")}
                className={`submenu-item ${currentScreen === 'orders' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Orders
              </button>
              <button
                onClick={() => setCurrentScreen("pack-manager")}
                className={`submenu-item ${currentScreen === 'pack-manager' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Pack Manager
              </button>
            </div>
          )}

          {/* Buy & Procurement Dropdown Menu (Next to Sell) */}
          <button
            onClick={() => setBuyMenuOpen(!buyMenuOpen)}
            className={`nav-item nav-item-blue ${['buy', 'smart-shopping-list', 'purchase-orders'].includes(currentScreen) ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge blue"><ShoppingBag className="nav-item-icon" /></span>
            <span>Buy & Procurement</span>
            {buyMenuOpen ? <ChevronUp className="nav-item-arrow" /> : <ChevronDown className="nav-item-arrow" />}
          </button>

          {buyMenuOpen && (
            <div className="submenu">
              <button
                onClick={() => {
                  setCurrentScreen("buy");
                  window.location.hash = "buy/shopping-list";
                }}
                className={`submenu-item ${currentScreen === 'buy' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Smart Shopping List
              </button>
              <button
                onClick={() => {
                  setCurrentScreen("buy");
                  window.location.hash = "buy/purchase-orders";
                }}
                className={`submenu-item ${currentScreen === 'buy' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Purchase Orders (POs)
              </button>
            </div>
          )}

          {/* Input Partner Hub Dropdown Menu */}
          <button
            onClick={() => {
              if (!currentScreen.startsWith('pih-')) {
                setPihMenuOpen(true);
                setCurrentScreen('pih-marketplace');
              } else {
                setPihMenuOpen(!pihMenuOpen);
              }
            }}
            className={`nav-item nav-item-blue ${currentScreen.startsWith('pih-') ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge blue"><Building2 className="nav-item-icon" /></span>
            <span>Input Partner Hub</span>
            {pihMenuOpen ? <ChevronUp className="nav-item-arrow" /> : <ChevronDown className="nav-item-arrow" />}
          </button>

          {pihMenuOpen && (
            <div className="submenu">
              {[
                { id: 'pih-marketplace', label: 'Marketplace' },
                { id: 'pih-recommendations', label: 'For My Farm (AI Picks)' },
                { id: 'pih-orders', label: 'My Input Orders' },
                { id: 'pih-results', label: 'Product Results' },
                { id: 'pih-consent', label: 'DPDP Privacy & Consent' },
                { id: 'pih-partner-dashboard', label: 'Partner Overview' },
                { id: 'pih-partner-products', label: 'My Products' },
                { id: 'pih-insights', label: 'AI Field Insights' },
                { id: 'pih-trials', label: 'Field Trials' },
                { id: 'pih-partner-orders', label: 'Store Orders' },
                { id: 'pih-integrations', label: 'Integrations & API' },
                { id: 'pih-admin', label: 'Partner Verification' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentScreen(item.id)}
                  className={`submenu-item ${currentScreen === item.id ? 'active' : ''}`}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {/* Assets Dropdown Menu */}
          <button
            onClick={() => setAssetsMenuOpen(!assetsMenuOpen)}
            className={`nav-item nav-item-brown ${['containers', 'equipment-tools', 'materials-inputs'].includes(currentScreen) ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge brown"><Folder className="nav-item-icon" /></span>
            <span>Assets</span>
            {assetsMenuOpen ? <ChevronUp className="nav-item-arrow" /> : <ChevronDown className="nav-item-arrow" />}
          </button>

          {assetsMenuOpen && (
            <div className="submenu">
              <button
                onClick={() => setCurrentScreen("containers")}
                className={`submenu-item ${currentScreen === 'containers' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Containers
              </button>
              <button
                onClick={() => setCurrentScreen("equipment-tools")}
                className={`submenu-item ${currentScreen === 'equipment-tools' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Equipment & Tools
              </button>
              <button
                onClick={() => setCurrentScreen("materials-inputs")}
                className={`submenu-item ${currentScreen === 'materials-inputs' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Materials & Inputs
              </button>
            </div>
          )}

          {/* Labor Dropdown Menu */}
          <button
            onClick={() => setLaborMenuOpen(!laborMenuOpen)}
            className={`nav-item nav-item-blue ${['time-attendance', 'crew-manager', 'labor-analytics'].includes(currentScreen) ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge blue"><Users className="nav-item-icon" /></span>
            <span>Labor</span>
            {laborMenuOpen ? <ChevronUp className="nav-item-arrow" /> : <ChevronDown className="nav-item-arrow" />}
          </button>

          {laborMenuOpen && (
            <div className="submenu">
              <button
                onClick={() => setCurrentScreen("time-attendance")}
                className={`submenu-item ${currentScreen === 'time-attendance' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Time & Attendance
              </button>
              <button
                onClick={() => setCurrentScreen("crew-manager")}
                className={`submenu-item ${currentScreen === 'crew-manager' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Crew & Workers
              </button>
              <button
                onClick={() => setCurrentScreen("labor-analytics")}
                className={`submenu-item ${currentScreen === 'labor-analytics' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Labor Analytics
              </button>
            </div>
          )}

          {/* Contacts Dropdown Menu */}
          <button
            onClick={() => setContactsMenuOpen(!contactsMenuOpen)}
            className={`nav-item nav-item-blue ${['customers', 'vendors', 'contact-directory'].includes(currentScreen) ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge blue"><Contact className="nav-item-icon" /></span>
            <span>Contacts</span>
            {contactsMenuOpen ? <ChevronUp className="nav-item-arrow" /> : <ChevronDown className="nav-item-arrow" />}
          </button>

          {contactsMenuOpen && (
            <div className="submenu">
              <button
                onClick={() => setCurrentScreen("customers")}
                className={`submenu-item ${currentScreen === 'customers' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Customers
              </button>
              <button
                onClick={() => setCurrentScreen("vendors")}
                className={`submenu-item ${currentScreen === 'vendors' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Vendors / Suppliers
              </button>
              <button
                onClick={() => setCurrentScreen("contact-directory")}
                className={`submenu-item ${currentScreen === 'contact-directory' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Contact Directory
              </button>
            </div>
          )}

          {/* Financials Dropdown Menu */}
          <button
            onClick={() => setFinancialsMenuOpen(!financialsMenuOpen)}
            className={`nav-item nav-item-blue ${['transactions', 'accounting-categories', 'financial-summary'].includes(currentScreen) ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="nav-icon-badge blue"><IndianRupee className="nav-item-icon" /></span>
            <span>Financials</span>
            {financialsMenuOpen ? <ChevronUp className="nav-item-arrow" /> : <ChevronDown className="nav-item-arrow" />}
          </button>

          {financialsMenuOpen && (
            <div className="submenu">
              <button
                onClick={() => setCurrentScreen("transactions")}
                className={`submenu-item ${currentScreen === 'transactions' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Transactions
              </button>
              <button
                onClick={() => setCurrentScreen("accounting-categories")}
                className={`submenu-item ${currentScreen === 'accounting-categories' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Accounting Categories
              </button>
              <button
                onClick={() => setCurrentScreen("financial-summary")}
                className={`submenu-item ${currentScreen === 'financial-summary' ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Financial Summary / P&L
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setCurrentScreen("reports");
              window.location.hash = "reports";
            }}
            className={`nav-item nav-item-blue ${currentScreen === 'reports' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="nav-icon-badge blue"><BarChart className="nav-item-icon" /></span>
            <span>Reports & Analytics</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={() => {
              setCurrentScreen('settings');
              setSettingsSubmodule(null);
              window.location.hash = 'settings';
            }}
            className={`nav-item ${currentScreen === 'settings' ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Settings className="nav-item-icon" />
            <span>Settings</span>
          </button>
          <a href="#onboarding" className="nav-item">
            <Clock className="nav-item-icon" />
            <span>Guided Onboarding</span>
          </a>
          <a href="#help" className="nav-item">
            <HelpCircle className="nav-item-icon" />
            <span>Help Docs</span>
          </a>
        </div>
      </aside>

      {/* DOCK MAIN WRAPPER */}
      <div className="main-wrapper">

        {/* Onboarding Header status bar */}
        <div className="onboarding-banner">
          <span>Start Your Guided Onboarding</span>
          <span className="onboarding-arrow">→</span>
          <span style={{ marginLeft: '1rem', opacity: 0.9 }}>0/5 Steps Completed</span>
        </div>

        {/* Tip announcement banner */}
        {showGuidedTip && (
          <div className="tip-banner">
            <div className="tip-content">
              <Info size={16} />
              <span>Toggle between seeing <strong>This Week</strong> and <strong>Next Week</strong> on the top menu filters to plan agriculture tasks ahead of time.</span>
            </div>
            <button className="tip-close-btn" onClick={() => setShowGuidedTip(false)}>Close And Don't Show Again</button>
          </div>
        )}

        {/* Top Header filter bar */}
        <header className="top-header">
          <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="timeframe-select"
            >
              <option value="Today">Today</option>
              <option value="Tomorrow">Tomorrow</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="Next Week">Next Week</option>
              <option value="Last Week">Last Week</option>
              <option value="This Month">This Month</option>
              <option value="Next Month">Next Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Season">This Season</option>
              <option value="Next Season">Next Season</option>
              <option value="Custom Range">Custom Range</option>
            </select>

            {timeframe === "Custom Range" && (
              <div className="custom-date-pickers" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#0f172a' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#0f172a' }}
                />
              </div>
            )}

            <span className="date-display">{timeframe}: {dateText}</span>
          </div>

          <div className="header-right">
            {currentScreen === "dashboard" && (
              <button className="configure-layout-btn" onClick={() => setShowConfigModal(true)}>
                <Grid size={15} />
                <span>Configure Dashboard</span>
              </button>
            )}

            <div className="user-profile-menu" style={{ position: 'relative' }}>
              <button
                className="profile-avatar-btn"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '24px',
                  padding: '4px 10px 4px 4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  className="avatar-circle"
                  style={{
                    backgroundColor: '#a38253',
                    color: '#ffffff',
                    fontWeight: 700,
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.82rem'
                  }}
                >
                  {getInitials(currentUser?.full_name || 'Gopikrishna Santhanam')}
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1e293b',
                    maxWidth: '130px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {currentUser?.full_name || 'Gopikrishna Santhanam'}
                </span>
                <ChevronDown size={14} style={{ color: '#64748b' }} />
              </button>

              {showProfileDropdown && (
                <div
                  className="dropdown-menu"
                  style={{
                    width: '280px',
                    padding: '12px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.06)',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    zIndex: 1000
                  }}
                >
                  {/* Top user header with avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 6px 12px 6px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#a38253',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        flexShrink: 0
                      }}
                    >
                      {getInitials(currentUser?.full_name || 'Gopikrishna Santhanam')}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {currentUser?.full_name || 'Gopikrishna Santhanam'}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '1px'
                        }}
                      >
                        {currentUser?.email || 'gksvijay@gmail.com'}
                      </div>
                    </div>
                  </div>

                  {/* Tend-style AI Credits Card inside Dropdown */}
                  <div
                    onClick={() => {
                      setAccountInitialTab('ai-credits');
                      setCurrentScreen('account');
                      setShowProfileDropdown(false);
                    }}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      marginBottom: '10px',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          background: '#16a34a',
                          color: '#fff'
                        }}
                      >
                        <Zap size={13} style={{ fill: '#ffffff' }} />
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>AI Credits</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>
                        {userAiCredits}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>AI credits remaining</span>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '5px',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, (userAiCredits / 25) * 100)}%`,
                          height: '100%',
                          backgroundColor: '#8b5cf6'
                        }}
                      />
                    </div>
                  </div>

                  {/* Tend-style My Profile Button */}
                  <button
                    onClick={() => {
                      setAccountInitialTab('profile');
                      setCurrentScreen('account');
                      setShowProfileDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      color: '#0f172a',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      marginBottom: '8px',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  >
                    My Profile
                  </button>

                  <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0 6px 0' }} />

                  {/* Submenu links */}
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setAccountInitialTab('plans');
                      setCurrentScreen('account');
                      setShowProfileDropdown(false);
                    }}
                    style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    <CreditCard size={15} style={{ color: '#64748b' }} />
                    <span>Plans & Billing</span>
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setAccountInitialTab('file-storage');
                      setCurrentScreen('account');
                      setShowProfileDropdown(false);
                    }}
                    style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    <Database size={15} style={{ color: '#64748b' }} />
                    <span>File Storage</span>
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowMobileAppModal(true);
                      setShowProfileDropdown(false);
                    }}
                    style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    <Smartphone size={15} style={{ color: '#64748b' }} />
                    <span>Mobile app</span>
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setCurrentScreen('settings');
                      setSettingsSubmodule(null);
                      setShowProfileDropdown(false);
                      window.location.hash = 'settings';
                    }}
                    style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    <Settings size={15} style={{ color: '#064f32' }} />
                    <span style={{ fontWeight: 600, color: '#064f32' }}>Farm Settings</span>
                  </button>

                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowConfigModal(true);
                      setShowProfileDropdown(false);
                    }}
                    style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    <Settings size={15} style={{ color: '#64748b' }} />
                    <span>Layout Config</span>
                  </button>

                  <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '6px 0' }} />

                  <button
                    className="dropdown-item"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#dc2626',
                      borderRadius: '4px'
                    }}
                  >
                    <LogOut size={15} color="#dc2626" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ==========================================
           SCREEN 1: DASHBOARD VIEW
           ========================================== */}
        {currentScreen === "dashboard" && (
          <main className="dashboard-content">
            <div className="dashboard-main-area">
              <div className="overview-header">
                <div className="overview-title-group">
                  <h1>Vivas AI Dashboard</h1>
                  <p>Here's a quick peek at your data statistics for {timeframe.toLowerCase()}! Below is your overview.</p>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#fff', borderRadius: '8px' }}>
                  <Clock className="no-data-icon" style={{ animation: 'spin 2s linear infinite' }} />
                  <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>Loading Dashboard widgets...</p>
                </div>
              ) : (
                <>
                  <div className="kpis-grid">
                    {isWidgetVisible('greenhouse_sow_kpi') && (
                      <div className="kpi-card green">
                        <button onClick={() => setCurrentScreen("tasks")} className="kpi-card-link">↗</button>
                        <div className="kpi-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="kpi-title">Planned Greenhouse Sow Tasks</span>
                          <span className="kpi-badge-icon green"><Sprout size={16} /></span>
                        </div>
                        <div className="kpi-numbers">
                          <span>{tasksStats.greenhouse_sow?.complete || 0}</span>
                          <span className="kpi-divider">|</span>
                          <span style={{ color: '#777777', fontWeight: 500 }}>
                            {tasksStats.greenhouse_sow?.incomplete || 0}
                          </span>
                        </div>
                        <span className="kpi-subtitle">Complete | Incomplete</span>
                      </div>
                    )}

                    {isWidgetVisible('field_planting_kpi') && (
                      <div className="kpi-card green">
                        <button onClick={() => setCurrentScreen("tasks")} className="kpi-card-link">↗</button>
                        <div className="kpi-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="kpi-title">Planned Field Plantings Tasks</span>
                          <span className="kpi-badge-icon green"><TrendingUp size={16} /></span>
                        </div>
                        <div className="kpi-numbers">
                          <span>{tasksStats.field_planting?.complete || 0}</span>
                          <span className="kpi-divider">|</span>
                          <span style={{ color: '#777777', fontWeight: 500 }}>
                            {tasksStats.field_planting?.incomplete || 0}
                          </span>
                        </div>
                        <span className="kpi-subtitle">Complete | Incomplete</span>
                      </div>
                    )}

                    {isWidgetVisible('harvest_kpi') && (
                      <div className="kpi-card maroon">
                        <button onClick={() => setCurrentScreen("tasks")} className="kpi-card-link">↗</button>
                        <div className="kpi-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="kpi-title">Planned Harvest Tasks</span>
                          <span className="kpi-badge-icon maroon"><AlertTriangle size={16} /></span>
                        </div>
                        <div className="kpi-numbers">
                          <span>{tasksStats.harvest?.complete || 0}</span>
                          <span className="kpi-divider">|</span>
                          <span style={{ color: '#777777', fontWeight: 500 }}>
                            {tasksStats.harvest?.incomplete || 0}
                          </span>
                        </div>
                        <span className="kpi-subtitle">Complete | Incomplete</span>
                      </div>
                    )}

                    {isWidgetVisible('orders_kpi') && (
                      <div className="kpi-card blue">
                        <a href="#orders" className="kpi-card-link">↗</a>
                        <div className="kpi-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="kpi-title">Committed Orders</span>
                          <span className="kpi-badge-icon blue"><IndianRupee size={16} /></span>
                        </div>
                        <div className="kpi-numbers">
                          <span>{ordersStats.fulfilled || 0}</span>
                          <span className="kpi-divider">|</span>
                          <span style={{ color: '#777777', fontWeight: 500 }}>
                            {ordersStats.not_fulfilled || 0}
                          </span>
                        </div>
                        <span className="kpi-subtitle">Fulfilled | Not Fulfilled</span>
                      </div>
                    )}
                  </div>

                  <div className="charts-grid">
                    {sortedWidgets
                      .filter(w => !w.widget_key.endsWith('_kpi') && w.widget_key !== 'weather_widget' && w.widget_key !== 'today_tasks_widget')
                      .map(widget => {
                        if (!widget.is_visible) return null;

                        switch (widget.widget_key) {
                          case 'yield_chart':
                            return (
                              <div className="dashboard-widget" key={widget.widget_key}>
                                <div className="widget-header">
                                  <h3>Est Yield Value by Crop</h3>
                                  <TrendingUp size={16} style={{ color: 'var(--brand-green)' }} />
                                </div>
                                <div className="widget-body">
                                  {yieldsData.length === 0 ? (
                                    <div className="no-data-box">
                                      <XCircle className="no-data-icon" />
                                      <span>No Yield valuation data available</span>
                                    </div>
                                  ) : (
                                    <div className="chart-container">
                                      <svg className="bar-chart-svg" viewBox="0 0 400 220">
                                        <line x1="40" y1="20" x2="380" y2="20" stroke="#f0f0f0" />
                                        <line x1="40" y1="70" x2="380" y2="70" stroke="#f0f0f0" />
                                        <line x1="40" y1="120" x2="380" y2="120" stroke="#f0f0f0" />
                                        <line x1="40" y1="170" x2="380" y2="170" stroke="#cccccc" strokeWidth="2" />

                                        {yieldsData.slice(0, 4).map((crop, i) => {
                                          const x = 60 + i * 85;
                                          const estHeight = (crop.estimated_value / 15000) * 130;
                                          const actHeight = (crop.actual_value / 15000) * 130;

                                          return (
                                            <g key={crop.crop_name}>
                                              <rect x={x} y={170 - estHeight} width="24" height={estHeight} fill="#a3e635" rx="2" />
                                              <rect x={x + 28} y={170 - actHeight} width="24" height={actHeight} fill="var(--brand-green)" rx="2" />
                                              <text x={x + 26} y="190" fontSize="9" textAnchor="middle" fill="#555555" fontWeight="600">
                                                {crop.crop_name.split(' ')[0]}
                                              </text>
                                              <text x={x + 26} y="202" fontSize="8" textAnchor="middle" fill="#999999">
                                                ${(crop.estimated_value / 1000).toFixed(1)}k
                                              </text>
                                            </g>
                                          );
                                        })}

                                        <circle cx="120" cy="10" r="4" fill="#a3e635" />
                                        <text x="128" y="13" fontSize="8" fill="#555555">Est Value</text>
                                        <circle cx="200" cy="10" r="4" fill="var(--brand-green)" />
                                        <text x="208" y="13" fontSize="8" fill="#555555">Actual Value</text>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );

                          case 'completion_chart':
                            const completePercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
                            return (
                              <div className="dashboard-widget" key={widget.widget_key}>
                                <div className="widget-header">
                                  <h3>Task Completion Status</h3>
                                  <CheckCircle size={16} style={{ color: 'var(--brand-green)' }} />
                                </div>
                                <div className="widget-body">
                                  {totalTasksCount === 0 ? (
                                    <div className="no-data-box">
                                      <XCircle className="no-data-icon" />
                                      <span>No farm tasks found</span>
                                    </div>
                                  ) : (
                                    <div className="chart-container" style={{ alignItems: 'center' }}>
                                      <svg className="donut-chart-svg" viewBox="0 0 200 200">
                                        <circle cx="100" cy="100" r="70" fill="none" stroke="#f1f5f9" strokeWidth="22" />
                                        <circle
                                          cx="100"
                                          cy="100"
                                          r="70"
                                          fill="none"
                                          stroke="var(--brand-green)"
                                          strokeWidth="22"
                                          strokeDasharray={`${2 * Math.PI * 70 * (completePercent / 100)} ${2 * Math.PI * 70}`}
                                          strokeDashoffset={2 * Math.PI * 70 * 0.25}
                                          strokeLinecap="round"
                                        />
                                        <text x="100" y="102" textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--brand-blue)">
                                          {completePercent}%
                                        </text>
                                        <text x="100" y="122" textAnchor="middle" fontSize="9" fontWeight="600" fill="#777777" letterSpacing="0.05em">
                                          COMPLETED
                                        </text>
                                      </svg>

                                      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '-0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                        <span style={{ color: 'var(--brand-green)' }}>● Complete ({completedTasksCount})</span>
                                        <span style={{ color: '#94a3b8' }}>● Incomplete ({incompleteTasksCount})</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );

                          case 'labor_chart':
                            return (
                              <div className="dashboard-widget widget-full-width" key={widget.widget_key}>
                                <div className="widget-header">
                                  <h3>Est Labor Hours by Person</h3>
                                  <Users size={16} style={{ color: 'var(--brand-green)' }} />
                                </div>
                                <div className="widget-body">
                                  {laborData.length === 0 ? (
                                    <div className="no-data-box">
                                      <XCircle className="no-data-icon" />
                                      <span>No labor tracked</span>
                                    </div>
                                  ) : (
                                    <div className="chart-container">
                                      <svg className="bar-chart-svg" viewBox="0 0 800 200" style={{ height: '180px' }}>
                                        <line x1="40" y1="20" x2="760" y2="20" stroke="#f0f0f0" />
                                        <line x1="40" y1="70" x2="760" y2="70" stroke="#f0f0f0" />
                                        <line x1="40" y1="120" x2="760" y2="120" stroke="#f0f0f0" />
                                        <line x1="40" y1="160" x2="760" y2="160" stroke="#cccccc" strokeWidth="2" />

                                        {laborData.slice(0, 5).map((person, i) => {
                                          const x = 70 + i * 140;
                                          const barHeight = (person.hours_worked / 50) * 130;

                                          return (
                                            <g key={person.person_name}>
                                              <rect x={x} y={160 - barHeight} width="50" height={barHeight} fill="var(--brand-green)" rx="4" />
                                              <text x={x + 25} y={150 - barHeight} fontSize="9" textAnchor="middle" fill="var(--brand-green)" fontWeight="700">
                                                {person.hours_worked} hrs
                                              </text>
                                              <text x={x + 25} y="178" fontSize="9" textAnchor="middle" fill="#555555" fontWeight="600">
                                                {person.person_name}
                                              </text>
                                            </g>
                                          );
                                        })}
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );

                          case 'planting_summary_table':
                            return (
                              <div className="dashboard-widget" key={widget.widget_key}>
                                <div className="widget-header">
                                  <h3>New Field Planting Summary</h3>
                                  <Layers size={16} style={{ color: 'var(--brand-green)' }} />
                                </div>
                                <div className="widget-body" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                                  {plantingsData.length === 0 ? (
                                    <div className="no-data-box" style={{ margin: 'auto' }}>
                                      <XCircle className="no-data-icon" />
                                      <span>No planting records found</span>
                                    </div>
                                  ) : (
                                    <div className="widget-table-container">
                                      <table className="widget-table">
                                        <thead>
                                          <tr>
                                            <th>Field Section</th>
                                            <th>Crop Name</th>
                                            <th>Acres</th>
                                            <th>Planted On</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {plantingsData.slice(0, 4).map((row, idx) => (
                                            <tr key={idx}>
                                              <td>{row.field_name}</td>
                                              <td><strong>{row.crop_name}</strong></td>
                                              <td>{row.area_planted} ac</td>
                                              <td>{new Date(row.planting_date).toLocaleDateString()}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );

                          case 'sow_summary_table':
                            return (
                              <div className="dashboard-widget" key={widget.widget_key}>
                                <div className="widget-header">
                                  <h3>Greenhouse Sow Summary</h3>
                                  <Grid size={16} style={{ color: 'var(--brand-green)' }} />
                                </div>
                                <div className="widget-body" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                                  {sowsData.length === 0 ? (
                                    <div className="no-data-box" style={{ margin: 'auto' }}>
                                      <XCircle className="no-data-icon" />
                                      <span>No greenhouse sows recorded</span>
                                    </div>
                                  ) : (
                                    <div className="widget-table-container">
                                      <table className="widget-table">
                                        <thead>
                                          <tr>
                                            <th>Greenhouse</th>
                                            <th>Crop Name</th>
                                            <th>Tray Count</th>
                                            <th>Sowed On</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sowsData.slice(0, 4).map((row, idx) => (
                                            <tr key={idx}>
                                              <td>{row.greenhouse}</td>
                                              <td><strong>{row.crop_name}</strong></td>
                                              <td>{row.tray_count} trays</td>
                                              <td>{new Date(row.sow_date).toLocaleDateString()}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );

                          default:
                            return null;
                        }
                      })}
                  </div>
                </>
              )}
            </div>

            {/* RIGHT SIDEBAR / WIDGETS PANEL */}
            <div className="right-panel">
              {isWidgetVisible('weather_widget') && (
                <div className="weather-widget">
                  <div className="weather-header">
                    <span className="weather-location">Louisiana, United States</span>
                    <span>27 June</span>
                  </div>
                  <div className="weather-main">
                    <Sun className="weather-icon" size={32} style={{ color: '#ea580c' }} />
                    <span className="weather-temp">31.7° C</span>
                    <span className="weather-desc">Sunny</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.8, fontWeight: 500 }}>
                    Hum: 54% • Wind: 8 km/h • Precip: 0%
                  </div>
                </div>
              )}

              {isWidgetVisible('today_tasks_widget') && (
                <div className="tasks-today-widget">
                  <div className="tasks-today-header">
                    <h3>Task to do today</h3>
                    <button onClick={() => setCurrentScreen("tasks")} className="tasks-details-link">Details &gt;</button>
                  </div>

                  <div className="tasks-list">
                    {todayTasksData.length === 0 ? (
                      <div className="no-data-box" style={{ padding: '1rem 0' }}>
                        <CheckCircle className="no-data-icon" />
                        <span>All tasks completed!</span>
                      </div>
                    ) : (
                      todayTasksData.map((task) => (
                        <div className="task-item" key={task.id}>
                          <div className="task-checkbox-container">
                            <input
                              type="checkbox"
                              className="task-checkbox"
                              checked={task.status === 'complete'}
                              onChange={() => handleToggleSidebarTask(task.id, task.status)}
                            />
                          </div>
                          <div className={`task-label ${task.status === 'complete' ? 'completed' : ''}`}>
                            <span className="task-text">{task.task_name}</span>
                            <span className="task-meta">Assigned to: {task.assigned_to || 'Unassigned'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        {/* ==========================================
           SCREEN 2: TASKS MANAGEMENT SCREEN
           ========================================== */}
        {currentScreen === "tasks" && (
          <main className="tasks-page">
            <div className="tasks-header">
              <div className="tasks-title-area">
                <h1>Tasks</h1>
                <HelpIcon size={16} className="tasks-help-icon" />
              </div>
            </div>

            <div className="filters-bar-wrapper">
              <div className="search-and-add-row">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon-inside" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    className="search-field"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="add-task-blue-btn" onClick={() => setShowAddTaskModal(true)}>
                    <Plus size={16} />
                    <span>Add New</span>
                  </button>
                  <button className="more-actions-btn" onClick={() => alert("Actions menu: Exporting CSV summary...")}>
                    More Actions
                  </button>
                </div>
              </div>

              <div className="filters-dropdowns-row">
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="filter-select-box">
                  <option value="All">All Dates</option>
                  <option value="This Week">This Week</option>
                  <option value="Next Week">Next Week</option>
                </select>

                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Status: All</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                </select>

                <select value={taskTypeFilter} onChange={(e) => setTaskTypeFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Task Type: All</option>
                  <option value="greenhouse_sow">Greenhouse Sow</option>
                  <option value="field_planting">Field Planting</option>
                  <option value="harvest">Harvest</option>
                  <option value="today_task">Today's Tasks</option>
                </select>

                <select value={plantingTypeFilter} onChange={(e) => setPlantingTypeFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Planting Type: All</option>
                  <option value="Starter Trays">Starter Trays</option>
                  <option value="Transplant">Transplant</option>
                  <option value="Direct Seed">Direct Seed</option>
                  <option value="Cuttings">Cuttings</option>
                  <option value="Grafting">Grafting</option>
                  <option value="Specialized Plant Part">Specialized Plant Part</option>
                  <option value="Setts">Setts</option>
                  <option value="Division">Division</option>
                  <option value="Budding">Budding</option>
                  <option value="Bare-Root">Bare-Root</option>
                  <option value="Hydroponic">Hydroponic</option>
                </select>

                <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Crop: All</option>
                  {getUniqueOptions("crop").filter(o => o !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select value={varietyFilter} onChange={(e) => setVarietyFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Variety: All</option>
                  {getUniqueOptions("variety").filter(o => o !== "All").map(v => <option key={v} value={v}>{v}</option>)}
                </select>

                <select value={harvestStageFilter} onChange={(e) => setHarvestStageFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Harvest Stage: All</option>
                  <option value="First Pick">First Pick</option>
                  <option value="Main Crop">Main Crop</option>
                  <option value="Clean Up">Clean Up</option>
                </select>

                <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Assignee: All</option>
                  {getUniqueOptions("assigned_to").filter(o => o !== "All").map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                <select value={locationTypeFilter} onChange={(e) => setLocationTypeFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Location Type: All</option>
                  <option value="Greenhouse">Greenhouse</option>
                  <option value="Sector Field">Sector Field</option>
                  <option value="Orchard">Orchard</option>
                </select>

                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Location: All</option>
                  {getUniqueOptions("location").filter(o => o !== "All").map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Priority: All</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>

                <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Tag: All</option>
                  <option value="Organic">Organic</option>
                  <option value="Premium">Premium</option>
                  <option value="Standard">Standard</option>
                  <option value="Export">Export</option>
                </select>

                <select value={plantingIdFilter} onChange={(e) => setPlantingIdFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Planting ID: All</option>
                  {getUniqueOptions("planting_id").filter(o => o !== "All").map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <select value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Equipment: All</option>
                  {getUniqueOptions("equipment").filter(o => o !== "All").map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>

                <button className="clear-filters-link" onClick={handleClearFilters}>Clear filters</button>
              </div>
            </div>

            <div className="view-tabs-and-grouping-row">
              <div className="view-tabs-group">
                <button className={`view-tab-btn ${tasksView === 'list' ? 'active' : ''}`} onClick={() => setTasksView("list")}>
                  <ListFilter size={15} />
                  <span>List</span>
                </button>
                <button className={`view-tab-btn ${tasksView === 'calendar' ? 'active' : ''}`} onClick={() => setTasksView("calendar")}>
                  <CalendarDays size={15} />
                  <span>Calendar</span>
                </button>
              </div>

              <div className="grouping-and-toggles">
                <label className="toggle-label-wrap">
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked={hideZeroPlannedToHarvest}
                    onChange={(e) => setHideZeroPlannedToHarvest(e.target.checked)}
                  />
                  <span>Hide Completed Harvest</span>
                </label>

                {tasksView === 'list' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brand-blue)' }}>Group by:</span>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="group-by-select">
                      <option value="task_type">Task Type</option>
                      <option value="assigned_to">Assignee</option>
                      <option value="priority">Priority</option>
                      <option value="status">Status</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* LIST VIEW */}
            {tasksView === 'list' && (
              <div className="grouped-tasks-container">
                {Object.keys(groupedTasks).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fff', borderRadius: '12px' }}>
                    <XCircle className="no-data-icon" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-light)' }}>No tasks found matching your filters</p>
                    <button className="clear-filters-link" onClick={handleClearFilters} style={{ display: 'inline-block', marginTop: '0.5rem' }}>
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  Object.entries(groupedTasks).map(([groupName, tasks]) => {
                    const isExpanded = expandedGroups[groupName] !== false;
                    return (
                      <div className="task-group-card" key={groupName}>
                        <div className="task-group-header" onClick={() => toggleGroupExpand(groupName)}>
                          <div className="task-group-title-info">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span className="task-group-title">{groupName.replace('_', ' ')}</span>
                            <span className="task-group-count">{tasks.length}</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="tasks-table-wrapper">
                            <table className="tasks-list-table">
                              <thead>
                                <tr>
                                  <th className="task-checkbox-col"></th>
                                  <th>Task Name</th>
                                  <th>Crop</th>
                                  <th>Variety</th>
                                  <th>Location</th>
                                  <th>Due Date</th>
                                  <th>Priority</th>
                                  <th>Assignee</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tasks.map((task) => (
                                  <tr key={task.id} style={{ opacity: task.status === 'complete' ? 0.7 : 1 }}>
                                    <td className="task-checkbox-col">
                                      <input
                                        type="checkbox"
                                        className="task-checkbox"
                                        checked={task.status === 'complete'}
                                        onChange={() => handleToggleTaskStatus(task)}
                                      />
                                    </td>
                                    <td>
                                      <span style={{
                                        fontWeight: 600,
                                        color: 'var(--brand-blue)',
                                        textDecoration: task.status === 'complete' ? 'line-through' : 'none'
                                      }}>
                                        {task.task_name}
                                      </span>
                                    </td>
                                    <td>{task.crop || 'N/A'}</td>
                                    <td>{task.variety || 'N/A'}</td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#555' }}>
                                        <MapPin size={12} style={{ color: 'var(--brand-green)' }} />
                                        <span>{task.location || 'N/A'}</span>
                                      </div>
                                    </td>
                                    <td>{new Date(task.due_date).toLocaleDateString()}</td>
                                    <td><span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                                    <td>
                                      {task.assigned_to ? (
                                        <div className="assignee-badge-circle" title={task.assigned_to} style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                                          {task.assigned_to.split(' ').map(n => n.charAt(0)).join('')}
                                        </div>
                                      ) : <span style={{ color: '#aaa', fontSize: '0.75rem' }}>None</span>}
                                    </td>
                                    <td>
                                      <div className="task-action-buttons">
                                        <button className="task-action-btn delete-btn" onClick={() => handleDeleteTask(task.id)} title="Delete task">
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* CALENDAR VIEW */}
            {tasksView === 'calendar' && (
              <div className="calendar-view-container">
                <div className="calendar-month-header">
                  <h2>June 2026</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: '#22c55e' }}>● Greenhouse Sow</span>
                    <span style={{ color: '#eab308' }}>● Field Planting</span>
                    <span style={{ color: '#3b82f6' }}>● Harvest</span>
                    <span style={{ color: '#6366f1' }}>● Today's Tasks</span>
                  </div>
                </div>

                <div className="calendar-days-grid">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div className="calendar-weekday-label" key={day}>{day}</div>
                  ))}

                  {Array.from({ length: 30 }).map((_, idx) => {
                    const dayNumber = idx + 1;
                    const dateString = `2026-06-${dayNumber < 10 ? '0' + dayNumber : dayNumber}`;
                    const dayTasks = tasksList.filter(t => t.due_date.substring(0, 10) === dateString);

                    return (
                      <div className={`calendar-day-cell ${dayNumber === 27 ? 'today' : ''}`} key={dayNumber}>
                        <span className="calendar-day-number">{dayNumber}</span>
                        {dayTasks.map(task => (
                          <div
                            className={`calendar-task-chip ${task.task_type} ${task.status === 'complete' ? 'completed' : ''}`}
                            key={task.id}
                            title={`${task.task_name} (${task.assigned_to || 'Unassigned'})`}
                            onClick={() => handleToggleTaskStatus(task)}
                          >
                            {task.task_name}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        )}

        {/* ==========================================
           SCREEN 3: NOTES & OBSERVATIONS MODULE SCREEN
           ========================================== */}
        {/* SCREEN: FARM MAP */}
        {currentScreen === 'farm-map' && (
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <FarmMapScreen />
          </main>
        )}

        {/* SCREEN: CROP LIBRARY */}
        {currentScreen === 'crop-library' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <CropLibraryScreen />
          </main>
        )}

        {/* SCREEN: CROP PLAN */}
        {currentScreen === 'crop-plan' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <CropPlanScreen />
          </main>
        )}

        {/* SCREEN: HARVEST PLANNER */}
        {currentScreen === 'harvest-planner' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <HarvestPlannerScreen />
          </main>
        )}

        {/* SCREEN: CROP HEALTH */}
        {currentScreen === 'crop-health' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <CropHealthScreen />
          </main>
        )}

        {/* SCREEN: SALES CHANNELS */}
        {currentScreen === 'sales-channels' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <SalesChannelsScreen />
          </main>
        )}

        {/* SCREEN: ORDERS */}
        {currentScreen === 'orders' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <OrdersManagerScreen />
          </main>
        )}

        {/* SCREEN: PACK MANAGER */}
        {currentScreen === 'pack-manager' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <PackManagerScreen />
          </main>
        )}

        {/* SCREEN: CONTAINERS */}
        {currentScreen === 'containers' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <ContainersScreen />
          </main>
        )}

        {/* SCREEN: EQUIPMENT & TOOLS */}
        {currentScreen === 'equipment-tools' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <EquipmentToolsScreen />
          </main>
        )}

        {/* SCREEN: MATERIALS & INPUTS */}
        {currentScreen === 'materials-inputs' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <MaterialsInputsScreen />
          </main>
        )}

        {/* SCREEN: TIME & ATTENDANCE */}
        {currentScreen === 'time-attendance' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <TimeAttendanceScreen />
          </main>
        )}

        {/* SCREEN: CREW & WORKERS */}
        {currentScreen === 'crew-manager' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <CrewManagerScreen />
          </main>
        )}

        {/* SCREEN: LABOR ANALYTICS */}
        {currentScreen === 'labor-analytics' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <LaborAnalyticsScreen />
          </main>
        )}

        {/* SCREEN: TRANSACTIONS */}
        {currentScreen === 'transactions' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <TransactionsScreen />
          </main>
        )}

        {/* SCREEN: ACCOUNTING CATEGORIES */}
        {currentScreen === 'accounting-categories' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <AccountingCategoriesScreen />
          </main>
        )}

        {/* SCREEN: FINANCIAL SUMMARY / P&L */}
        {currentScreen === 'financial-summary' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <FinancialSummaryScreen />
          </main>
        )}

        {/* SCREEN: CUSTOMERS */}
        {currentScreen === 'customers' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <CustomersScreen />
          </main>
        )}

        {/* SCREEN: VENDORS */}
        {currentScreen === 'vendors' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <VendorsScreen />
          </main>
        )}

        {/* SCREEN: CONTACT DIRECTORY */}
        {currentScreen === 'contact-directory' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <ContactDirectoryScreen />
          </main>
        )}

        {/* SCREEN: REPORTS & ANALYTICS */}
        {currentScreen === 'reports' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <ReportsDashboardScreen />
          </main>
        )}

        {/* SCREEN: BUY & PROCUREMENT */}
        {currentScreen === 'buy' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <BuyDashboardScreen />
          </main>
        )}

        {/* SCREEN: INPUT PARTNER HUB */}
        {currentScreen.startsWith('pih-') && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <PartnerHubContainer activeTab={currentScreen} setActiveTab={setCurrentScreen} selectedFarm={activeFarm} />
          </main>
        )}

        {/* SCREEN: ACCOUNT MANAGEMENT (Tend-style) */}
        {currentScreen === 'account' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            <AccountManagement
              API_BASE={API_BASE}
              currentUser={currentUser}
              initialTab={accountInitialTab}
              onUserUpdate={(updated) => {
                setCurrentUser(updated);
                localStorage.setItem('vivas_user', JSON.stringify(updated));
              }}
              onBackToDashboard={() => setCurrentScreen('dashboard')}
            />
          </main>
        )}

        {/* SCREEN: TEND SETTINGS (Full 12-Module Suite) */}
        {currentScreen === 'settings' && (
          <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
            <SettingsHub
              apiBase={API_BASE}
              currentFarmId={activeFarm?.id || "e772d1ba-6841-44ba-86a2-c429a7e007e4"}
              initialSubmodule={settingsSubmodule}
              onBackToApp={() => {
                setCurrentScreen('dashboard');
                window.location.hash = 'dashboard';
              }}
            />
          </main>
        )}


        {currentScreen === "notes" && (
          <main className="notes-page">

            {/* Title & Help Header */}
            <div className="tasks-header">
              <div className="tasks-title-area">
                <h1>Notes and Observations</h1>
                <HelpIcon size={16} className="tasks-help-icon" />
              </div>
            </div>

            {/* Horizontal Filter Bar */}
            <div className="filters-bar-wrapper">

              {/* Row 1: Search and Add Note/Record buttons */}
              <div className="search-and-add-row">
                <div className="search-input-wrapper">
                  <Search size={16} className="search-icon-inside" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    className="search-field"
                    value={notesSearchQuery}
                    onChange={(e) => setNotesSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
                  {/* Add Note Button */}
                  <button className="add-task-blue-btn" onClick={() => setShowAddNoteModal(true)}>
                    <Plus size={16} />
                    <span>Add Note</span>
                  </button>

                  {/* Add Record Dropdown Button */}
                  <div className="add-record-dropdown-container">
                    <button
                      type="button"
                      className="add-record-btn"
                      onClick={() => setShowAddRecordDropdown(!showAddRecordDropdown)}
                    >
                      <span>Add Record</span>
                      <ChevronDown size={14} />
                    </button>

                    {showAddRecordDropdown && (
                      <>
                        <div className="dropdown-click-overlay" onClick={() => setShowAddRecordDropdown(false)} />
                        <div className="add-record-menu">
                          <button
                            type="button"
                            className="add-record-menu-item"
                            onClick={() => {
                              setShowAddRecordDropdown(false);
                              setShowAddTaskRecordModal(true);
                            }}
                          >
                            Add Completed Task
                          </button>
                          <button
                            type="button"
                            className="add-record-menu-item"
                            onClick={() => {
                              setShowAddRecordDropdown(false);
                              setShowAddNoteModal(true);
                            }}
                          >
                            Add Note
                          </button>
                          <button
                            type="button"
                            className="add-record-menu-item"
                            onClick={() => {
                              setShowAddRecordDropdown(false);
                              setShowAddSoilTestModal(true);
                            }}
                          >
                            Add Soil Test
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <button className="more-actions-btn" onClick={() => alert("Exporting Notes Summary...")}>
                    Export Notes
                  </button>
                </div>
              </div>

              {/* Row 2: Select dropdowns */}
              <div className="filters-dropdowns-row">

                {/* Custom Multi-Select Dropdown Filter for Notes Type */}
                <div className="custom-dropdown-container">
                  <button
                    type="button"
                    className={`custom-dropdown-trigger ${notesTypeFilter.length > 0 ? 'active' : ''}`}
                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  >
                    <span>Type: {notesTypeFilter.length === 0 ? "All" : notesTypeFilter.join(", ")}</span>
                    {notesTypeFilter.length > 0 && (
                      <span
                        className="clear-dropdown-selection"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotesTypeFilter([]);
                        }}
                        title="Clear type filters"
                      >
                        <X size={12} />
                      </span>
                    )}
                    <ChevronDown size={14} className="dropdown-arrow-icon" />
                  </button>

                  {showTypeDropdown && (
                    <>
                      <div className="dropdown-click-overlay" onClick={() => setShowTypeDropdown(false)} />
                      <div className="custom-dropdown-menu">
                        {["Task", "Harvest & Yield", "Expenses", "Notes", "Soil Tests"].map((type) => {
                          const isChecked = notesTypeFilter.includes(type);
                          return (
                            <label className="custom-dropdown-item" key={type}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setNotesTypeFilter(notesTypeFilter.filter(t => t !== type));
                                  } else {
                                    setNotesTypeFilter([...notesTypeFilter, type]);
                                  }
                                }}
                              />
                              <span>{type}</span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <select value={notesCropCategoryFilter} onChange={(e) => setNotesCropCategoryFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Crop Category: All</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruit">Fruit</option>
                  <option value="Herbs">Herbs</option>
                </select>

                <select value={notesCropFilter} onChange={(e) => setNotesCropFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Crop: All</option>
                  {getUniqueNotesOptions("crop").filter(o => o !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select value={notesLocationFilter} onChange={(e) => setNotesLocationFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Location: All</option>
                  {getUniqueNotesOptions("location").filter(o => o !== "All").map(l => <option key={l} value={l}>{l}</option>)}
                </select>

                <select value={notesAuthorFilter} onChange={(e) => setNotesAuthorFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Author: All</option>
                  {getUniqueNotesOptions("author_name").filter(o => o !== "All").map(a => <option key={a} value={a}>{a}</option>)}
                </select>

                <select value={notesYearFilter} onChange={(e) => setNotesYearFilter(e.target.value)} className="filter-select-box">
                  <option value="All">Year: All</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>

                <button className="clear-filters-link" onClick={handleClearNotesFilters}>
                  Clear filters
                </button>
              </div>

            </div>

            {/* Empty State view (hand-drawn bell pepper) if list is empty */}
            {notesList.length === 0 ? (
              <div className="notes-empty-state">
                {/* Custom SVG pepper representation */}
                <svg width="150" height="150" viewBox="0 0 100 100" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                  <path d="M50 15 C 53 10, 56 10, 58 15 C 60 20, 55 25, 50 25 C 45 25, 40 20, 42 15 C 44 10, 47 10, 50 15 Z" fill="#e2e8f0" />
                  <path d="M50 25 C 38 25, 22 28, 22 48 C 22 68, 32 85, 50 85 C 68 85, 78 68, 78 48 C 78 28, 62 25, 50 25 Z" fill="#f8fafc" />
                  <path d="M50 25 C 47 40, 47 70, 50 85" strokeDasharray="2 2" />
                  <path d="M22 48 C 32 48, 42 53, 50 85" strokeDasharray="2 2" />
                  <path d="M78 48 C 68 48, 58 53, 50 85" strokeDasharray="2 2" />
                </svg>

                <h3>Add your first record.</h3>
                <p>All records will appear here.</p>

                {/* Add Record Dropdown Button in Empty State */}
                <div className="add-record-dropdown-container">
                  <button
                    type="button"
                    className="add-record-btn blue-dropdown-btn"
                    onClick={() => setShowAddRecordDropdown(!showAddRecordDropdown)}
                  >
                    <span>Add Record</span>
                    <ChevronDown size={14} />
                  </button>

                  {showAddRecordDropdown && (
                    <>
                      <div className="dropdown-click-overlay" onClick={() => setShowAddRecordDropdown(false)} />
                      <div className="add-record-menu">
                        <button
                          type="button"
                          className="add-record-menu-item"
                          onClick={() => {
                            setShowAddRecordDropdown(false);
                            setShowAddTaskRecordModal(true);
                          }}
                        >
                          Add Completed Task
                        </button>
                        <button
                          type="button"
                          className="add-record-menu-item"
                          onClick={() => {
                            setShowAddRecordDropdown(false);
                            setShowAddNoteModal(true);
                          }}
                        >
                          Add Note
                        </button>
                        <button
                          type="button"
                          className="add-record-menu-item"
                          onClick={() => {
                            setShowAddRecordDropdown(false);
                            setShowAddSoilTestModal(true);
                          }}
                        >
                          Add Soil Test
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Grid layout of notes cards */
              <div className="notes-grid">
                {notesList.map((note) => (
                  <div className="note-card" key={note.id}>

                    <div className="note-card-header">
                      <span className={`note-type-badge ${note.note_type ? note.note_type.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-') : 'notes'}`}>
                        {note.note_type}
                      </span>
                      <button className="note-delete-btn" onClick={() => handleDeleteNote(note.id)} title="Delete note">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <h3 className="note-title">{note.title}</h3>

                    {/* Metadata tags */}
                    <div className="note-meta-row">
                      {note.crop && (
                        <div className="note-meta-item">
                          <TrendingUp size={11} style={{ color: 'var(--brand-green)' }} />
                          <span>{note.crop} ({note.crop_category || 'Crop'})</span>
                        </div>
                      )}
                      {note.location && (
                        <div className="note-meta-item">
                          <MapPin size={11} style={{ color: 'var(--brand-green)' }} />
                          <span>{note.location}</span>
                        </div>
                      )}
                    </div>

                    <p className="note-content">{note.content}</p>

                    {/* Type-Specific Metrics Renderers */}
                    {note.note_type === "Soil Tests" && (note.ph || note.nitrogen || note.phosphorus || note.potassium) && (
                      <div className="soil-metrics-grid">
                        {note.ph && <div className="soil-metric-pill">pH: <strong>{note.ph}</strong></div>}
                        {note.nitrogen && <div className="soil-metric-pill">N: <strong>{note.nitrogen} ppm</strong></div>}
                        {note.phosphorus && <div className="soil-metric-pill">P: <strong>{note.phosphorus} ppm</strong></div>}
                        {note.potassium && <div className="soil-metric-pill">K: <strong>{note.potassium} ppm</strong></div>}
                      </div>
                    )}

                    {note.note_type === "Task" && (
                      <div className="task-extended-info-block">
                        <div className="task-sub-meta-row">
                          {note.task_type && (
                            <span className="task-type-badge-pill">
                              {note.task_type.replace('_', ' ').toUpperCase()}
                            </span>
                          )}
                          {note.status && (
                            <span className={`task-status-badge-pill ${note.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {note.status}
                            </span>
                          )}
                          {note.priority && (
                            <span className={`task-priority-badge-pill ${note.priority.toLowerCase()}`}>
                              {note.priority}
                            </span>
                          )}
                        </div>

                        {/* Location & Planting */}
                        {(note.location || note.planting) && (
                          <div className="task-locations-plantings-row">
                            {note.location && <span className="task-loc-badge"><MapPin size={10} /> {note.location}</span>}
                            {note.planting && <span className="task-crop-badge"><Layers size={10} /> {note.planting}</span>}
                          </div>
                        )}

                        {/* Labor details */}
                        <div className="task-hours-badges-row">
                          {note.actual_labor && (
                            <div className="task-hours-badge">
                              <Clock size={12} style={{ color: 'var(--brand-green)' }} />
                              <span>Actual: <strong>{note.actual_labor}</strong></span>
                            </div>
                          )}
                          {note.estimated_labor && (
                            <div className="task-hours-badge estimated">
                              <span>Est: <strong>{note.estimated_labor}h</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Checklist summary */}
                        {note.checklist && Array.isArray(note.checklist) && note.checklist.length > 0 && (
                          <div className="task-checklist-summary">
                            <span className="chk-summary-label">
                              Checklist: <strong>{note.checklist.filter(c => c.done).length}/{note.checklist.length}</strong> complete
                            </span>
                            <div className="chk-progress-bar-bg">
                              <div
                                className="chk-progress-bar-fill"
                                style={{ width: `${(note.checklist.filter(c => c.done).length / note.checklist.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Tags */}
                        {note.tags && (
                          <div className="task-tags-row">
                            {note.tags.split(',').map((t, idx) => (
                              <span key={idx} className="task-tag-pill">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {note.note_type === "Expenses" && note.amount && (
                      <div className="expense-amount-badge">
                        <IndianRupee size={12} style={{ color: '#ef4444' }} />
                        <span>Cost: <strong>₹{parseFloat(note.amount).toFixed(2)}</strong></span>
                      </div>
                    )}

                    <div className="note-card-footer">
                      <div className="note-author">
                        <div className="avatar-circle" style={{ backgroundColor: '#fed7aa', color: '#ea580c' }}>
                          {note.author_name ? note.author_name.split(' ').map(n => n.charAt(0)).join('') : 'U'}
                        </div>
                        <span className="note-author-name">{note.author_name}</span>
                      </div>

                      <span className="note-year-badge">{note.note_year || 2026}</span>
                    </div>

                  </div>
                ))}
              </div>
            )}

            {/* Floating circular green add button bottom-right dropdown */}
            <div className="floating-add-btn-wrapper" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
              <button className="floating-add-btn" onClick={() => setShowAddRecordDropdown(!showAddRecordDropdown)} title="Add Record">
                <Plus size={24} />
              </button>
              {showAddRecordDropdown && (
                <>
                  <div className="dropdown-click-overlay" onClick={() => setShowAddRecordDropdown(false)} />
                  <div className="floating-add-menu" style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '180px' }}>
                    <button type="button" className="add-record-menu-item" style={{ border: 'none', background: 'none', padding: '0.5rem', textAlign: 'left', width: '100%', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--brand-blue)', fontWeight: 600 }} onClick={() => { setShowAddRecordDropdown(false); setShowAddTaskRecordModal(true); }}>Add Completed Task</button>
                    <button type="button" className="add-record-menu-item" style={{ border: 'none', background: 'none', padding: '0.5rem', textAlign: 'left', width: '100%', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--brand-blue)', fontWeight: 600 }} onClick={() => { setShowAddRecordDropdown(false); setShowAddNoteModal(true); }}>Add Note</button>
                    <button type="button" className="add-record-menu-item" style={{ border: 'none', background: 'none', padding: '0.5rem', textAlign: 'left', width: '100%', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--brand-blue)', fontWeight: 600 }} onClick={() => { setShowAddRecordDropdown(false); handleSoilTestDrawerOpen(); }}>Add Soil Test</button>
                  </div>
                </>
              )}
            </div>

          </main>
        )}

        {/* SYSTEM FOOTER */}
        <footer className="footer">
          <div>&copy; 2026 Vivas AI — Intelligence for Living Agriculture. All Rights Reserved.</div>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#support">Customer Support</a>
          </div>
        </footer>

      </div>

      {/* FLOATING SIDE DOCK TABS */}
      <div className="dock-tabs">
        <a href="#support" className="dock-tab">Support</a>
        <a href="#feedback" className="dock-tab feedback-tab">Feedback</a>
      </div>

      {/* DASHBOARD WIDGET CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Configure Dashboard Layout</h2>
              <button className="modal-close-btn" onClick={() => setShowConfigModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-intro">
                Toggle widgets to customize your Vivas AI Dashboard screen. Use the arrows to reorder their position.
              </p>

              <div className="config-item-list">
                {sortedWidgets.map((widget, index) => (
                  <div className="config-item" key={widget.widget_key}>
                    <div className="config-label-group">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          onClick={() => handleMoveWidget(index, 'up')}
                          disabled={index === 0}
                          style={{ opacity: index === 0 ? 0.3 : 1, padding: '2px' }}
                          title="Move Up"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => handleMoveWidget(index, 'down')}
                          disabled={index === widgetsConfig.length - 1}
                          style={{ opacity: index === widgetsConfig.length - 1 ? 0.3 : 1, padding: '2px' }}
                          title="Move Down"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <span className="config-widget-title">{widget.title}</span>
                    </div>

                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={widget.is_visible}
                        onChange={() => handleToggleWidget(widget.widget_key)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveWidgetConfig}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW TASK FORM MODAL */}
      {showAddTaskModal && (
        <div className="modal-overlay" onClick={() => setShowAddTaskModal(false)}>
          <div className="modal-container" style={{ width: '650px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Farm Task</h2>
              <button className="modal-close-btn" onClick={() => setShowAddTaskModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTaskSubmit}>
              <div className="modal-body">
                <div className="add-task-form-grid">

                  <div className="form-group-full">
                    <label className="form-field-label">Task Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input-text"
                      placeholder="e.g. Clean drip hose Sector A"
                      value={newTask.task_name}
                      onChange={(e) => setNewTask(prev => ({ ...prev, task_name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Task Type *</label>
                    <select
                      className="form-select-input"
                      value={newTask.task_type}
                      onChange={(e) => setNewTask(prev => ({ ...prev, task_type: e.target.value }))}
                    >
                      <option value="greenhouse_sow">Greenhouse Sow</option>
                      <option value="field_planting">Field Planting</option>
                      <option value="harvest">Harvest</option>
                      <option value="today_task">Today's Task Checklist</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Due Date *</label>
                    <input
                      type="date"
                      required
                      className="form-input-text"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Assignee</label>
                    <select
                      className="form-select-input"
                      value={newTask.assigned_to}
                      onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                    >
                      <option value="">Select Assignee</option>
                      <option value="Alice Johnson">Alice Johnson</option>
                      <option value="Bob Smith">Bob Smith</option>
                      <option value="Carol Danvers">Carol Danvers</option>
                      <option value="David Miller">David Miller</option>
                      <option value="Emma Watson">Emma Watson</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Priority</label>
                    <select
                      className="form-select-input"
                      value={newTask.priority}
                      onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Crop Name</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. Heirloom Tomatoes"
                      value={newTask.crop}
                      onChange={(e) => setNewTask(prev => ({ ...prev, crop: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Crop Variety</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. Red Cherry"
                      value={newTask.variety}
                      onChange={(e) => setNewTask(prev => ({ ...prev, variety: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Planting Type / Method</label>
                    <select
                      className="form-select-input"
                      value={newTask.planting_type}
                      onChange={(e) => setNewTask(prev => ({ ...prev, planting_type: e.target.value }))}
                    >
                      <option value="">Select Planting Type</option>
                      <option value="Starter Trays">Starter Trays</option>
                      <option value="Transplant">Transplant</option>
                      <option value="Direct Seed">Direct Seed</option>
                      <option value="Cuttings">Cuttings</option>
                      <option value="Grafting">Grafting</option>
                      <option value="Specialized Plant Part">Specialized Plant Part</option>
                      <option value="Setts">Setts</option>
                      <option value="Division">Division</option>
                      <option value="Budding">Budding</option>
                      <option value="Bare-Root">Bare-Root</option>
                      <option value="Hydroponic">Hydroponic</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Harvest Stage</label>
                    <select
                      className="form-select-input"
                      value={newTask.harvest_stage}
                      onChange={(e) => setNewTask(prev => ({ ...prev, harvest_stage: e.target.value }))}
                    >
                      <option value="N/A">N/A</option>
                      <option value="First Pick">First Pick</option>
                      <option value="Main Crop">Main Crop</option>
                      <option value="Clean Up">Clean Up</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Location Type</label>
                    <select
                      className="form-select-input"
                      value={newTask.location_type}
                      onChange={(e) => setNewTask(prev => ({ ...prev, location_type: e.target.value }))}
                    >
                      <option value="">Select Location Type</option>
                      <option value="Greenhouse">Greenhouse</option>
                      <option value="Sector Field">Sector Field</option>
                      <option value="Orchard">Orchard</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Location</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. Greenhouse 1 - Row A"
                      value={newTask.location}
                      onChange={(e) => setNewTask(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Tag</label>
                    <select
                      className="form-select-input"
                      value={newTask.tag}
                      onChange={(e) => setNewTask(prev => ({ ...prev, tag: e.target.value }))}
                    >
                      <option value="">Select Tag</option>
                      <option value="Organic">Organic</option>
                      <option value="Premium">Premium</option>
                      <option value="Standard">Standard</option>
                      <option value="Export">Export</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Planting ID</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. PL-2026-01"
                      value={newTask.planting_id}
                      onChange={(e) => setNewTask(prev => ({ ...prev, planting_id: e.target.value }))}
                    />
                  </div>

                  <div className="form-group-full">
                    <label className="form-field-label">Equipment Used</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. Seeder, Tractor, Harvest Bins"
                      value={newTask.equipment}
                      onChange={(e) => setNewTask(prev => ({ ...prev, equipment: e.target.value }))}
                    />
                  </div>

                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW NOTE / RECORD FORM MODAL */}
      {showAddNoteModal && (
        <div className="modal-overlay" onClick={() => setShowAddNoteModal(false)}>
          <div className="modal-container" style={{ width: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Notes & Observations</h2>
              <button className="modal-close-btn" onClick={() => setShowAddNoteModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNoteSubmit}>
              <div className="modal-body">
                <div className="add-task-form-grid">

                  <div className="form-group-full">
                    <label className="form-field-label">Note Title *</label>
                    <input
                      type="text"
                      required
                      className="form-input-text"
                      placeholder="e.g. Blight warning in Greenhouse 1"
                      value={newNote.title}
                      onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Record Type *</label>
                    <select
                      className="form-select-input"
                      value={newNote.note_type}
                      onChange={(e) => setNewNote(prev => ({ ...prev, note_type: e.target.value }))}
                    >
                      <option value="Notes">Notes</option>
                      <option value="Observations">Observations</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Crop Category</label>
                    <select
                      className="form-select-input"
                      value={newNote.crop_category}
                      onChange={(e) => setNewNote(prev => ({ ...prev, crop_category: e.target.value }))}
                    >
                      <option value="">Select Category</option>
                      <option value="Vegetables">Vegetables</option>
                      <option value="Fruit">Fruit</option>
                      <option value="Herbs">Herbs</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-field-label">Crop Name</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. Heirloom Tomatoes"
                      value={newNote.crop}
                      onChange={(e) => setNewNote(prev => ({ ...prev, crop: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Location</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. Greenhouse 1 - Row A"
                      value={newNote.location}
                      onChange={(e) => setNewNote(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Author Name *</label>
                    <input
                      type="text"
                      required
                      className="form-input-text"
                      value={newNote.author_name}
                      onChange={(e) => setNewNote(prev => ({ ...prev, author_name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="form-field-label">Year</label>
                    <select
                      className="form-select-input"
                      value={newNote.note_year}
                      onChange={(e) => setNewNote(prev => ({ ...prev, note_year: e.target.value }))}
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                    </select>
                  </div>

                  <div className="form-group-full">
                    <label className="form-field-label">Observation Details / Description</label>
                    <textarea
                      rows="4"
                      className="form-input-text"
                      placeholder="Write your notes or observations detail here..."
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      value={newNote.content}
                      onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                    />
                  </div>

                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddNoteModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW SOIL TEST FORM MODAL */}
      {/* ── SOIL TEST FULL DRAWER ── */}
      {showAddSoilTestModal && (
        <div className="drawer-overlay" onClick={() => setShowAddSoilTestModal(false)}>
          <div className="drawer-container st-drawer" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSoilTestSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

              {/* Header */}
              <div className="ct-header">
                <div className="ct-header-left">
                  <select className="ct-status-select" value={soilTestForm.status}
                    onChange={(e) => setSoilTestForm(p => ({ ...p, status: e.target.value }))}>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                  </select>
                  <span className="st-header-tag">🧪 Soil Test</span>
                </div>
                <div className="ct-header-right">
                  <button type="submit" className="ct-save-btn">Save</button>
                  <button type="button" className="ct-close-btn" onClick={() => setShowAddSoilTestModal(false)}>×</button>
                </div>
              </div>

              {/* Title block */}
              <div className="ct-title-row" style={{ paddingLeft: 20, paddingRight: 20 }}>
                <div className="ct-title-block" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <span className="st-sample-badge">Sample ID</span>
                    <input className="st-sample-id-input" placeholder="e.g. ST-2026-001"
                      value={soilTestForm.sample_id}
                      onChange={(e) => setSoilTestForm(p => ({ ...p, sample_id: e.target.value }))} />
                  </div>
                  <input className="ct-title-input" placeholder="Soil Test Title *"
                    value={soilTestForm.title}
                    onChange={(e) => { setSoilTestForm(p => ({ ...p, title: e.target.value })); setSoilTestErrors(p => ({ ...p, title: '' })); }} />
                  {soilTestErrors.title && <span className="st-err">{soilTestErrors.title}</span>}
                  <div className="ct-priority-date-row" style={{ marginTop: 6 }}>
                    <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Test Date *</label>
                    <input type="date" className="ct-date-input" value={soilTestForm.test_date}
                      onChange={(e) => { setSoilTestForm(p => ({ ...p, test_date: e.target.value })); setSoilTestErrors(p => ({ ...p, test_date: '' })); }} />
                    {soilTestErrors.test_date && <span className="st-err">{soilTestErrors.test_date}</span>}
                  </div>
                </div>
              </div>

              {/* Tab Nav */}
              <nav className="ct-tab-nav">
                {SOIL_TEST_TABS.map(tab => (
                  <button key={tab} type="button" className="ct-tab-btn"
                    onClick={() => document.getElementById('st-sec-' + tab.toLowerCase().replace(/\s+/g, '-'))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >{tab}</button>
                ))}
              </nav>

              {/* Scrollable Body */}
              <div className="ct-body">

                {/* ── BASIC INFO ── */}
                <div id="st-sec-basic-info" className="ct-section">
                  <div className="ct-section-header">Basic Info</div>
                  <div className="ct-section-body">
                    <div className="ct-field-row">
                      <label className="ct-field-label">Author *</label>
                      <div style={{ flex: 1 }}>
                        <input className="ct-field-input" value={soilTestForm.author_name}
                          onChange={(e) => { setSoilTestForm(p => ({ ...p, author_name: e.target.value })); setSoilTestErrors(p => ({ ...p, author_name: '' })); }} />
                        {soilTestErrors.author_name && <span className="st-err">{soilTestErrors.author_name}</span>}
                      </div>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">Year</label>
                      <select className="ct-field-select" value={soilTestForm.note_year}
                        onChange={(e) => setSoilTestForm(p => ({ ...p, note_year: e.target.value }))}>
                        {['2026', '2025', '2024', '2023'].map(y => <option key={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">Crop Category</label>
                      <select className="ct-field-select" value={soilTestForm.crop_category}
                        onChange={(e) => setSoilTestForm(p => ({ ...p, crop_category: e.target.value }))}>
                        <option value="">Select…</option>
                        {['Vegetables', 'Fruits', 'Herbs', 'Grains', 'Legumes', 'Flowers', 'Cover Crops', 'Other'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">Crop Name</label>
                      <input className="ct-field-input" placeholder="e.g. Heirloom Tomatoes"
                        value={soilTestForm.crop}
                        onChange={(e) => setSoilTestForm(p => ({ ...p, crop: e.target.value }))} />
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">Notes</label>
                      <textarea className="ct-field-textarea" rows={3} placeholder="Additional observations..."
                        value={soilTestForm.content}
                        onChange={(e) => setSoilTestForm(p => ({ ...p, content: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* ── LOCATION ── */}
                <div id="st-sec-location" className="ct-section">
                  <div className="ct-section-header">Location</div>
                  <div className="ct-section-body">
                    <div className="ct-field-row">
                      <label className="ct-field-label">Location</label>
                      <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <select className="ct-field-select" value={soilTestForm.location}
                          onChange={(e) => setSoilTestForm(p => ({ ...p, location: e.target.value }))}>
                          <option value="">Select existing…</option>
                          {locationsList.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>or</span>
                        <input className="ct-field-input" placeholder="Type new location"
                          value={soilTestForm.location}
                          onChange={(e) => setSoilTestForm(p => ({ ...p, location: e.target.value }))}
                          style={{ flex: 1 }} />
                      </div>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">GPS Latitude</label>
                      <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input className="ct-field-input" placeholder="e.g. 12.97160000"
                          value={soilTestForm.gps_lat}
                          onChange={(e) => { setSoilTestForm(p => ({ ...p, gps_lat: e.target.value })); setSoilTestErrors(p => ({ ...p, gps_lat: '' })); }} />
                        {soilTestErrors.gps_lat && <span className="st-err">{soilTestErrors.gps_lat}</span>}
                      </div>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">GPS Longitude</label>
                      <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input className="ct-field-input" placeholder="e.g. 77.59460000"
                          value={soilTestForm.gps_lng}
                          onChange={(e) => { setSoilTestForm(p => ({ ...p, gps_lng: e.target.value })); setSoilTestErrors(p => ({ ...p, gps_lng: '' })); }} />
                        {soilTestErrors.gps_lng && <span className="st-err">{soilTestErrors.gps_lng}</span>}
                      </div>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label"></label>
                      <button type="button" className="st-gps-btn"
                        onClick={handleGpsCapture}>
                        📍 Capture My Current GPS Location
                      </button>
                    </div>
                    {soilTestForm.gps_lat && soilTestForm.gps_lng && (
                      <div className="ct-field-row">
                        <label className="ct-field-label"></label>
                        <div className="st-map-preview">
                          <iframe
                            title="GPS Map"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(soilTestForm.gps_lng) - 0.005},${parseFloat(soilTestForm.gps_lat) - 0.005},${parseFloat(soilTestForm.gps_lng) + 0.005},${parseFloat(soilTestForm.gps_lat) + 0.005}&layer=mapnik&marker=${soilTestForm.gps_lat},${soilTestForm.gps_lng}`}
                            style={{ width: '100%', height: 180, border: 'none', borderRadius: 8 }}
                          />
                          <p className="st-map-coords">📍 {soilTestForm.gps_lat}, {soilTestForm.gps_lng}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── SOIL PROFILE ── */}
                <div id="st-sec-soil-profile" className="ct-section">
                  <div className="ct-section-header">Soil Profile</div>
                  <div className="ct-section-body">
                    <div className="ct-field-row">
                      <label className="ct-field-label">Soil Texture</label>
                      <select className="ct-field-select" value={soilTestForm.soil_texture}
                        onChange={(e) => setSoilTestForm(p => ({ ...p, soil_texture: e.target.value }))}>
                        <option value="">Select texture…</option>
                        {SOIL_TEXTURES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">Depth (cm)</label>
                      <div style={{ flex: 1 }}>
                        <input type="number" step="0.1" min="0" className="ct-field-input"
                          placeholder="e.g. 30"
                          value={soilTestForm.soil_depth_cm}
                          onChange={(e) => { setSoilTestForm(p => ({ ...p, soil_depth_cm: e.target.value })); setSoilTestErrors(p => ({ ...p, soil_depth_cm: '' })); }} />
                        {soilTestErrors.soil_depth_cm && <span className="st-err">{soilTestErrors.soil_depth_cm}</span>}
                      </div>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">Moisture (%)</label>
                      <div style={{ flex: 1 }}>
                        <input type="number" step="0.1" min="0" max="100" className="ct-field-input"
                          placeholder="e.g. 45.5"
                          value={soilTestForm.moisture}
                          onChange={(e) => { setSoilTestForm(p => ({ ...p, moisture: e.target.value })); setSoilTestErrors(p => ({ ...p, moisture: '' })); }} />
                        {soilTestErrors.moisture && <span className="st-err">{soilTestErrors.moisture}</span>}
                      </div>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">Organic Matter (%)</label>
                      <div style={{ flex: 1 }}>
                        <input type="number" step="0.001" min="0" className="ct-field-input"
                          placeholder="e.g. 3.5"
                          value={soilTestForm.organic_matter}
                          onChange={(e) => { setSoilTestForm(p => ({ ...p, organic_matter: e.target.value })); setSoilTestErrors(p => ({ ...p, organic_matter: '' })); }} />
                        {soilTestErrors.organic_matter && <span className="st-err">{soilTestErrors.organic_matter}</span>}
                      </div>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">EC (dS/m)</label>
                      <div style={{ flex: 1 }}>
                        <input type="number" step="0.0001" min="0" className="ct-field-input"
                          placeholder="e.g. 1.2"
                          value={soilTestForm.ec}
                          onChange={(e) => { setSoilTestForm(p => ({ ...p, ec: e.target.value })); setSoilTestErrors(p => ({ ...p, ec: '' })); }} />
                        {soilTestErrors.ec && <span className="st-err">{soilTestErrors.ec}</span>}
                      </div>
                    </div>
                    <div className="ct-field-row">
                      <label className="ct-field-label">CEC (meq/100g)</label>
                      <div style={{ flex: 1 }}>
                        <input type="number" step="0.001" min="0" className="ct-field-input"
                          placeholder="e.g. 18.5"
                          value={soilTestForm.cec}
                          onChange={(e) => { setSoilTestForm(p => ({ ...p, cec: e.target.value })); setSoilTestErrors(p => ({ ...p, cec: '' })); }} />
                        {soilTestErrors.cec && <span className="st-err">{soilTestErrors.cec}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── MACRONUTRIENTS ── */}
                <div id="st-sec-macronutrients" className="ct-section">
                  <div className="ct-section-header">Macronutrients</div>
                  <div className="ct-section-body">
                    {[
                      { key: 'ph', label: 'pH (0–14)', step: '0.01', min: '0', max: '14', ph: 'e.g. 6.5' },
                      { key: 'nitrogen', label: 'Nitrogen / N (ppm)', step: '0.1', min: '0', ph: 'e.g. 45' },
                      { key: 'phosphorus', label: 'Phosphorus / P (ppm)', step: '0.1', min: '0', ph: 'e.g. 12' },
                      { key: 'potassium', label: 'Potassium / K (ppm)', step: '0.1', min: '0', ph: 'e.g. 34' },
                      { key: 'calcium', label: 'Calcium / Ca (ppm)', step: '0.1', min: '0', ph: 'e.g. 1200' },
                      { key: 'magnesium', label: 'Magnesium / Mg (ppm)', step: '0.1', min: '0', ph: 'e.g. 200' },
                      { key: 'sulfur', label: 'Sulfur / S (ppm)', step: '0.1', min: '0', ph: 'e.g. 25' },
                    ].map(({ key, label, step, min, max, ph: placeholder }) => (
                      <div key={key} className="ct-field-row">
                        <label className="ct-field-label">{label}</label>
                        <div style={{ flex: 1 }}>
                          <input type="number" step={step} min={min} max={max} className="ct-field-input"
                            placeholder={placeholder}
                            value={soilTestForm[key]}
                            onChange={(e) => { setSoilTestForm(p => ({ ...p, [key]: e.target.value })); setSoilTestErrors(p => ({ ...p, [key]: '' })); }} />
                          {soilTestErrors[key] && <span className="st-err">{soilTestErrors[key]}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── MICRONUTRIENTS ── */}
                <div id="st-sec-micronutrients" className="ct-section">
                  <div className="ct-section-header">Micronutrients</div>
                  <div className="ct-section-body">
                    {[
                      { key: 'iron', label: 'Iron / Fe (ppm)', ph: 'e.g. 5.0' },
                      { key: 'zinc', label: 'Zinc / Zn (ppm)', ph: 'e.g. 1.5' },
                      { key: 'manganese', label: 'Manganese / Mn (ppm)', ph: 'e.g. 3.0' },
                      { key: 'copper', label: 'Copper / Cu (ppm)', ph: 'e.g. 0.8' },
                      { key: 'boron', label: 'Boron / B (ppm)', ph: 'e.g. 0.5' },
                    ].map(({ key, label, ph: placeholder }) => (
                      <div key={key} className="ct-field-row">
                        <label className="ct-field-label">{label}</label>
                        <div style={{ flex: 1 }}>
                          <input type="number" step="0.001" min="0" className="ct-field-input"
                            placeholder={placeholder}
                            value={soilTestForm[key]}
                            onChange={(e) => { setSoilTestForm(p => ({ ...p, [key]: e.target.value })); setSoilTestErrors(p => ({ ...p, [key]: '' })); }} />
                          {soilTestErrors[key] && <span className="st-err">{soilTestErrors[key]}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── LAB ── */}
                <div id="st-sec-lab" className="ct-section">
                  <div className="ct-section-header">Lab</div>
                  <div className="ct-section-body">
                    <div className="ct-field-row">
                      <label className="ct-field-label">Search Lab</label>
                      <div className="st-lab-search-wrap" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <input
                              className="ct-field-input"
                              placeholder="Type lab name or select…"
                              value={labSearch}
                              onFocus={() => { setLabDropdownOpen(true); fetchLabsList(labSearch); }}
                              onChange={(e) => {
                                setLabSearch(e.target.value);
                                setSoilTestForm(p => ({ ...p, lab_id: null, lab_name: e.target.value }));
                                fetchLabsList(e.target.value);
                                setLabDropdownOpen(true);
                              }}
                              onBlur={() => setTimeout(() => setLabDropdownOpen(false), 200)}
                            />
                            {labDropdownOpen && labsList.length > 0 && (
                              <div className="st-lab-dropdown">
                                {labsList.map(lab => (
                                  <div key={lab.id} className="st-lab-option"
                                    onMouseDown={() => {
                                      setSoilTestForm(p => ({ ...p, lab_id: lab.id, lab_name: lab.lab_name }));
                                      setLabSearch(lab.lab_name);
                                      setLabDropdownOpen(false);
                                    }}>
                                    <div className="st-lab-name">{lab.lab_name}</div>
                                    <div className="st-lab-meta">{lab.lab_code && `${lab.lab_code} · `}{lab.accreditation}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button type="button" className="ct-add-new-type-btn"
                            onClick={() => { setNewLabForm({ lab_name: '', lab_code: '', contact_person: '', phone: '', email: '', address: '', accreditation: '' }); setNewLabErrors({}); setShowAddLabPopup(true); }}>
                            + Add Lab
                          </button>
                        </div>
                        {soilTestForm.lab_id && (
                          <div className="st-lab-selected-card">
                            {(() => {
                              const lab = labsList.find(l => l.id === soilTestForm.lab_id);
                              return lab ? (
                                <>
                                  <span className="st-lab-selected-name">🏢 {lab.lab_name}</span>
                                  {lab.contact_person && <span className="st-lab-selected-meta">👤 {lab.contact_person}</span>}
                                  {lab.phone && <span className="st-lab-selected-meta">📞 {lab.phone}</span>}
                                  {lab.accreditation && <span className="st-lab-accr">{lab.accreditation}</span>}
                                </>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RECOMMENDATIONS ── */}
                <div id="st-sec-recommendations" className="ct-section">
                  <div className="ct-section-header">Recommendations</div>
                  <div className="ct-section-body">
                    <div className="ct-field-row">
                      <label className="ct-field-label">Recommendations</label>
                      <textarea className="ct-field-textarea" rows={5}
                        placeholder="e.g. Increase nitrogen application by 20%, lime treatment recommended to raise pH above 6.8…"
                        value={soilTestForm.recommendations}
                        onChange={(e) => setSoilTestForm(p => ({ ...p, recommendations: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* ── ATTACHMENTS ── */}
                <div id="st-sec-attachments" className="ct-section">
                  <div className="ct-section-header">Attachments</div>
                  <div className="ct-section-body">
                    <div className="ct-field-row" style={{ flexDirection: 'column', gap: 10 }}>

                      {/* Drop Zone */}
                      <div
                        className="st-dropzone"
                        onClick={() => document.getElementById('st-file-input').click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('st-dropzone--active'); }}
                        onDragLeave={(e) => e.currentTarget.classList.remove('st-dropzone--active')}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('st-dropzone--active');
                          const files = Array.from(e.dataTransfer.files);
                          const errs = [];
                          const valid = files.filter(f => {
                            if (!ST_ALLOWED_TYPES.includes(f.type)) { errs.push(`"${f.name}" — unsupported type`); return false; }
                            if (f.size > ST_MAX_SIZE_MB * 1024 * 1024) { errs.push(`"${f.name}" — exceeds 5 MB`); return false; }
                            if (soilTestAttachments.find(a => a.name === f.name)) { errs.push(`"${f.name}" — already attached`); return false; }
                            return true;
                          });
                          if (errs.length) alert('Skipped files:\n' + errs.join('\n'));
                          if (valid.length) setSoilTestAttachments(prev => [...prev, ...valid.map(f => ({ file: f, name: f.name, size: f.size, type: f.type, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }))]);
                        }}
                      >
                        <div className="st-dropzone-icon">📎</div>
                        <div className="st-dropzone-text">Drag & drop files here or <span className="st-dropzone-link">browse</span></div>
                        <div className="st-dropzone-hint">PDF, DOCX, PNG, JPEG · Max 5 MB each · Multiple files allowed</div>
                      </div>

                      {/* Hidden real file input */}
                      <input
                        id="st-file-input"
                        type="file"
                        multiple
                        accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          const errs = [];
                          const valid = files.filter(f => {
                            if (!ST_ALLOWED_TYPES.includes(f.type)) { errs.push(`"${f.name}" — unsupported type`); return false; }
                            if (f.size > ST_MAX_SIZE_MB * 1024 * 1024) { errs.push(`"${f.name}" — exceeds 5 MB`); return false; }
                            if (soilTestAttachments.find(a => a.name === f.name)) { errs.push(`"${f.name}" — already attached`); return false; }
                            return true;
                          });
                          if (errs.length) alert('Skipped files:\n' + errs.join('\n'));
                          if (valid.length) setSoilTestAttachments(prev => [...prev, ...valid.map(f => ({ file: f, name: f.name, size: f.size, type: f.type, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }))]);
                          e.target.value = '';
                        }}
                      />

                      {/* Attached files list */}
                      {soilTestAttachments.length > 0 && (
                        <div className="st-attach-list">
                          {soilTestAttachments.map((att, idx) => (
                            <div key={idx} className="st-attach-item">
                              <div className="st-attach-thumb">
                                {att.preview
                                  ? <img src={att.preview} alt={att.name} className="st-attach-img" />
                                  : <span className="st-attach-icon">{att.type === 'application/pdf' ? '📄' : '📝'}</span>
                                }
                              </div>
                              <div className="st-attach-info">
                                <span className="st-attach-name" title={att.name}>{att.name}</span>
                                <span className="st-attach-size">{(att.size / 1024).toFixed(1)} KB · {att.name.split('.').pop().toUpperCase()}</span>
                              </div>
                              <button
                                type="button"
                                className="st-attach-remove"
                                title="Remove attachment"
                                onClick={() => {
                                  if (att.preview) URL.revokeObjectURL(att.preview);
                                  setSoilTestAttachments(prev => prev.filter((_, i) => i !== idx));
                                }}
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {soilTestAttachments.length > 0 && (
                        <div className="st-attach-summary">
                          {soilTestAttachments.length} file{soilTestAttachments.length > 1 ? 's' : ''} attached
                          &nbsp;·&nbsp;
                          {(soilTestAttachments.reduce((s, a) => s + a.size, 0) / 1024).toFixed(1)} KB total
                        </div>
                      )}

                    </div>
                  </div>
                </div>

              </div>{/* end ct-body */}
            </form>
          </div>
        </div>
      )}

      {/* ADD LAB POPUP */}
      {showAddLabPopup && (
        <div className="att-popup-overlay" onClick={() => setShowAddLabPopup(false)}>
          <div className="att-popup" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="att-popup-header">
              <span className="att-popup-title">🏢 Add New Lab</span>
              <button type="button" className="att-popup-close" onClick={() => setShowAddLabPopup(false)}>×</button>
            </div>
            <div className="att-popup-body" style={{ gap: 12 }}>
              <div className="st-lab-form-row">
                <div className="st-lab-form-group" style={{ flex: 2 }}>
                  <label className="att-popup-label">Lab Name *</label>
                  <input className="att-popup-input" placeholder="e.g. AgriTest Laboratories"
                    value={newLabForm.lab_name}
                    onChange={(e) => { setNewLabForm(p => ({ ...p, lab_name: e.target.value })); setNewLabErrors(p => ({ ...p, lab_name: '' })); }} />
                  {newLabErrors.lab_name && <span className="st-err">{newLabErrors.lab_name}</span>}
                </div>
                <div className="st-lab-form-group" style={{ flex: 1 }}>
                  <label className="att-popup-label">Lab Code</label>
                  <input className="att-popup-input" placeholder="e.g. ATL-001"
                    value={newLabForm.lab_code}
                    onChange={(e) => setNewLabForm(p => ({ ...p, lab_code: e.target.value }))} />
                </div>
              </div>
              <div className="st-lab-form-row">
                <div className="st-lab-form-group" style={{ flex: 1 }}>
                  <label className="att-popup-label">Contact Person</label>
                  <input className="att-popup-input" placeholder="e.g. Dr. Rajan Mehta"
                    value={newLabForm.contact_person}
                    onChange={(e) => setNewLabForm(p => ({ ...p, contact_person: e.target.value }))} />
                </div>
                <div className="st-lab-form-group" style={{ flex: 1 }}>
                  <label className="att-popup-label">Phone</label>
                  <input className="att-popup-input" type="tel" placeholder="+91-80-22334455"
                    value={newLabForm.phone}
                    onChange={(e) => setNewLabForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div className="st-lab-form-group">
                <label className="att-popup-label">Email</label>
                <input className="att-popup-input" type="email" placeholder="info@lab.com"
                  value={newLabForm.email}
                  onChange={(e) => { setNewLabForm(p => ({ ...p, email: e.target.value })); setNewLabErrors(p => ({ ...p, email: '' })); }} />
                {newLabErrors.email && <span className="st-err">{newLabErrors.email}</span>}
              </div>
              <div className="st-lab-form-group">
                <label className="att-popup-label">Address</label>
                <textarea className="att-popup-input" rows={2} placeholder="Lab full address"
                  value={newLabForm.address}
                  onChange={(e) => setNewLabForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="st-lab-form-group">
                <label className="att-popup-label">Accreditation</label>
                <input className="att-popup-input" placeholder="e.g. NABL Accredited, ISO 17025"
                  value={newLabForm.accreditation}
                  onChange={(e) => setNewLabForm(p => ({ ...p, accreditation: e.target.value }))} />
              </div>
            </div>
            <div className="att-popup-footer">
              <button type="button" className="att-popup-cancel" onClick={() => setShowAddLabPopup(false)}>Cancel</button>
              <button type="button" className="att-popup-create" onClick={handleAddLabSubmit}>Create Lab</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD COMPLETED TASK FORM DRAWER */}
      {showAddTaskRecordModal && (
        <div className="drawer-overlay" onClick={() => setShowAddTaskRecordModal(false)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleAddTaskRecordSubmit}>

              {/* ── Sticky Top Header ── */}
              <div className="ct-header">
                <div className="ct-header-left">
                  <select
                    className="ct-status-select"
                    value={newTaskRecord.status}
                    onChange={(e) => setNewTaskRecord(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option>Not Started</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                    <option>Deferred</option>
                  </select>
                  <button
                    type="button"
                    className="ct-details-link"
                    onClick={() => document.getElementById('ct-sec-general')?.scrollIntoView({ behavior: 'smooth' })}
                  >Details</button>
                </div>
                <div className="ct-header-right">
                  <button type="submit" className="ct-save-btn">Save</button>
                  <button type="button" className="ct-close-btn" onClick={() => setShowAddTaskRecordModal(false)}>×</button>
                </div>
              </div>

              {/* ── Title + Meta Row ── */}
              <div className="ct-title-row">
                <div className="ct-title-block">

                  {/* Task Type row (was in General section — now at top) */}
                  <div className="ct-top-type-row">
                    <select
                      className="ct-top-type-select"
                      value={newTaskRecord.task_type}
                      onChange={(e) => {
                        setNewTaskRecord(prev => ({ ...prev, task_type: e.target.value }));
                        setTaskSubType('');
                      }}
                    >
                      <option value="">Task Type</option>
                      <option value="Field Preparation">Field Preparation</option>
                      <option value="Crop Maintenance">Crop Maintenance</option>
                      <option value="Field Installation">Field Installation</option>
                      <option value="Field Removal">Field Removal</option>
                      <option value="Production">Production</option>
                      <option value="Post Harvest">Post Harvest</option>
                      <option value="Nursery Operations">Nursery Operations</option>
                      <option value="Testing">Testing</option>
                      {customTaskTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ct-add-new-type-btn"
                      onClick={() => { setNewTaskTypeName(''); setShowAddTaskTypePopup(true); }}
                    >+ Add New</button>
                  </div>

                  {/* Sub-task dropdown — shown only when task type has sub-tasks */}
                  {TASK_SUBTYPES[newTaskRecord.task_type] && (
                    <div className="ct-top-subtype-row">
                      <select
                        className="ct-top-subtype-select"
                        value={taskSubType}
                        onChange={(e) => setTaskSubType(e.target.value)}
                      >
                        <option value="">— Select Sub-task —</option>
                        {TASK_SUBTYPES[newTaskRecord.task_type].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    className="ct-title-input"
                    placeholder="Write a name"
                    value={newTaskRecord.title}
                    onChange={(e) => setNewTaskRecord(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                  <div className="ct-priority-date-row">
                    {['Low', 'Medium', 'High'].map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`ct-priority-pill ${newTaskRecord.priority === p ? 'active-' + p.toLowerCase() : ''}`}
                        onClick={() => setNewTaskRecord(prev => ({ ...prev, priority: p }))}
                      >{p}</button>
                    ))}
                    <input
                      type="date"
                      className="ct-date-input"
                      value={newTaskRecord.due_date}
                      onChange={(e) => setNewTaskRecord(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                    <input
                      type="time"
                      className="ct-time-input"
                      value={newTaskRecord.start_time?.replace(/ AM| PM/, '') || ''}
                      onChange={(e) => setNewTaskRecord(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                    <span className="ct-time-sep">–</span>
                    <input
                      type="time"
                      className="ct-time-input"
                      value={newTaskRecord.end_time?.replace(/ AM| PM/, '') || ''}
                      onChange={(e) => setNewTaskRecord(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* ── Tab Nav ── */}
              <nav className="ct-tab-nav">
                {['General', 'Task Details', 'Planting', 'Location', 'Equipment', 'Inputs', 'Labor', 'Other'].map(tab => (
                  <button
                    key={tab}
                    type="button"
                    className="ct-tab-btn"
                    onClick={() => document.getElementById('ct-sec-' + tab.toLowerCase().replace(/\s/g, '-'))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >{tab}</button>
                ))}
              </nav>

              {/* ── Scrollable Body ── */}
              <div className="ct-body">

                {/* ── GENERAL ── */}
                <div id="ct-sec-general" className="ct-section">
                  <div className="ct-section-header">General</div>
                  <div className="ct-section-body">

                    <div className="ct-field-row">
                      <label className="ct-field-label">Assignee</label>
                      <select
                        className="ct-field-select"
                        value={newTaskRecord.assignee}
                        onChange={(e) => setNewTaskRecord(prev => ({ ...prev, assignee: e.target.value }))}
                      >
                        <option value="">Add assignee</option>
                        <option>Vivas Owner</option>
                        <option>Farm Manager</option>
                        <option>Harvest Lead</option>
                        <option>Field Worker 1</option>
                        <option>Field Worker 2</option>
                      </select>
                    </div>

                    <div className="ct-field-row">
                      <label className="ct-field-label">Notes</label>
                      <textarea
                        className="ct-field-textarea"
                        placeholder="Write a note..."
                        rows={3}
                        value={newTaskRecord.content}
                        onChange={(e) => setNewTaskRecord(prev => ({ ...prev, content: e.target.value }))}
                      />
                    </div>

                    <div className="ct-field-row ct-checklist-row">
                      <label className="ct-field-label">Checklist</label>
                      <div className="ct-checklist-wrap">
                        {(newTaskRecord.checklist || []).map((item, idx) => (
                          <div key={idx} className="ct-checklist-item">
                            <input
                              type="checkbox"
                              className="ct-check"
                              checked={item.done}
                              onChange={() => {
                                const cl = [...(newTaskRecord.checklist || [])];
                                cl[idx] = { ...cl[idx], done: !cl[idx].done };
                                setNewTaskRecord(prev => ({ ...prev, checklist: cl }));
                              }}
                            />
                            <input
                              type="text"
                              className="ct-checklist-input"
                              placeholder="Checklist item"
                              value={item.text}
                              onChange={(e) => {
                                const cl = [...(newTaskRecord.checklist || [])];
                                cl[idx] = { ...cl[idx], text: e.target.value };
                                setNewTaskRecord(prev => ({ ...prev, checklist: cl }));
                              }}
                            />
                            <button
                              type="button"
                              className="ct-remove-btn"
                              onClick={() => {
                                const cl = (newTaskRecord.checklist || []).filter((_, i) => i !== idx);
                                setNewTaskRecord(prev => ({ ...prev, checklist: cl }));
                              }}
                            >×</button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="ct-add-more-btn"
                          onClick={() => setNewTaskRecord(prev => ({ ...prev, checklist: [...(prev.checklist || []), { text: '', done: false }] }))}
                        >+ Add More</button>
                      </div>
                    </div>

                    <div className="ct-field-row">
                      <label className="ct-field-label">Attachment</label>
                      <button type="button" className="ct-link-btn">+ Add Attachments</button>
                    </div>

                    <div className="ct-field-row">
                      <label className="ct-field-label">Instruction</label>
                      <input
                        type="text"
                        className="ct-field-input"
                        placeholder=""
                        value={newTaskRecord.instructions}
                        onChange={(e) => setNewTaskRecord(prev => ({ ...prev, instructions: e.target.value }))}
                      />
                    </div>

                  </div>
                </div>

                {/* ── TASK DETAILS ── */}
                <div id="ct-sec-task-details" className="ct-section">
                  <div className="ct-section-header">Task Details</div>
                  <div className="ct-section-body">

                    <div className="ct-field-row">
                      <label className="ct-field-label">Tags</label>
                      <div className="ct-tags-wrap">
                        <select
                          className="ct-field-select"
                          value={newTaskRecord.tags}
                          onChange={(e) => setNewTaskRecord(prev => ({ ...prev, tags: e.target.value }))}
                        >
                          <option value="">Add your tag</option>
                          <option>Harvesting</option>
                          <option>Seeding</option>
                          <option>Maintenance</option>
                          <option>Pest Control</option>
                          <option>Irrigation</option>
                          <option>Pruning</option>
                        </select>
                        <button type="button" className="ct-manage-link">Manage</button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── PLANTING ── */}
                <div id="ct-sec-planting" className="ct-section">
                  <div className="ct-section-header">Planting</div>
                  <div className="ct-section-body">

                    <div className="ct-field-row">
                      <label className="ct-field-label">Planting</label>
                      <select
                        className="ct-field-select"
                        value={newTaskRecord.planting}
                        onChange={(e) => setNewTaskRecord(prev => ({ ...prev, planting: e.target.value }))}
                      >
                        <option value="">🌱 Planting</option>
                        <option>Sweet Basil 2026-A</option>
                        <option>Beefsteak Tomatoes Lot 3</option>
                        <option>Romaine Lettuce Row 4</option>
                        <option>English Cucumber GH1</option>
                        <option>Cherry Tomatoes GH2</option>
                        <option>Jalapeño Pepper Row 7</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* ── LOCATION ── */}
                <div id="ct-sec-location" className="ct-section">
                  <div className="ct-section-header">Location</div>
                  <div className="ct-section-body">

                    <div className="ct-field-row">
                      <label className="ct-field-label">Location</label>
                      <select
                        className="ct-field-select"
                        value={newTaskRecord.location}
                        onChange={(e) => setNewTaskRecord(prev => ({ ...prev, location: e.target.value }))}
                      >
                        <option value="">📍 Location</option>
                        <option>Greenhouse 1</option>
                        <option>Greenhouse 2</option>
                        <option>Field Sector A</option>
                        <option>Field Sector B</option>
                        <option>Storage Room</option>
                        <option>Packing Area</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* ── EQUIPMENT ── */}
                <div id="ct-sec-equipment" className="ct-section">
                  <div className="ct-section-header">Equipment</div>
                  <div className="ct-section-body">

                    {(newTaskRecord.equipment || ['']).map((eq, idx) => (
                      <div key={idx} className="ct-field-row ct-list-row">
                        <label className="ct-field-label">{idx === 0 ? 'Equipment' : ''}</label>
                        <select
                          className="ct-field-select"
                          value={eq}
                          onChange={(e) => {
                            const arr = [...(newTaskRecord.equipment || [''])];
                            arr[idx] = e.target.value;
                            setNewTaskRecord(prev => ({ ...prev, equipment: arr }));
                          }}
                        >
                          <option value="">Select...</option>
                          <option>John Deere Utility Tractor</option>
                          <option>Greenhouse Drip System</option>
                          <option>Handheld Harvest Knife</option>
                          <option>Leaf Blower</option>
                          <option>Sprayer Backpack 20L</option>
                          <option>Seeder Manual Roller</option>
                        </select>
                        {idx > 0 && (
                          <button
                            type="button"
                            className="ct-trash-btn"
                            onClick={() => {
                              const arr = (newTaskRecord.equipment || []).filter((_, i) => i !== idx);
                              setNewTaskRecord(prev => ({ ...prev, equipment: arr }));
                            }}
                          >🗑</button>
                        )}
                      </div>
                    ))}
                    <div className="ct-field-row">
                      <label className="ct-field-label"></label>
                      <button
                        type="button"
                        className="ct-add-more-btn"
                        onClick={() => setNewTaskRecord(prev => ({ ...prev, equipment: [...(prev.equipment || ['']), ''] }))}
                      >+ Add More</button>
                    </div>

                  </div>
                </div>

                {/* ── INPUTS ── */}
                <div id="ct-sec-inputs" className="ct-section">
                  <div className="ct-section-header">Inputs</div>
                  <div className="ct-section-body">

                    {(newTaskRecord.inputs || ['']).map((inp, idx) => (
                      <div key={idx} className="ct-field-row ct-list-row">
                        <label className="ct-field-label">{idx === 0 ? 'Inputs' : ''}</label>
                        <select
                          className="ct-field-select"
                          value={inp}
                          onChange={(e) => {
                            const arr = [...(newTaskRecord.inputs || [''])];
                            arr[idx] = e.target.value;
                            setNewTaskRecord(prev => ({ ...prev, inputs: arr }));
                          }}
                        >
                          <option value="">Select...</option>
                          <option>Organic Leafy Compost 100lb</option>
                          <option>Fish Emulsion Fertilizer 5L</option>
                          <option>Neem Oil Spray 1L</option>
                          <option>Perlite Soil Amendment 50lb</option>
                          <option>Calcium Nitrate 25kg</option>
                          <option>Copper Fungicide Solution</option>
                        </select>
                        <button
                          type="button"
                          className="ct-trash-btn"
                          onClick={() => {
                            const arr = (newTaskRecord.inputs || []).filter((_, i) => i !== idx);
                            setNewTaskRecord(prev => ({ ...prev, inputs: arr.length ? arr : [''] }));
                          }}
                        >🗑</button>
                      </div>
                    ))}
                    <div className="ct-field-row">
                      <label className="ct-field-label"></label>
                      <button
                        type="button"
                        className="ct-add-more-btn"
                        onClick={() => setNewTaskRecord(prev => ({ ...prev, inputs: [...(prev.inputs || ['']), ''] }))}
                      >+ Add More</button>
                    </div>

                  </div>
                </div>

                {/* ── LABOR ── */}
                <div id="ct-sec-labor" className="ct-section">
                  <div className="ct-section-header">Labor</div>
                  <div className="ct-section-body">

                    <div className="ct-field-row">
                      <label className="ct-field-label">Estimated Labor Time</label>
                      <div className="ct-labor-est-wrap">
                        <span className="ct-clock-icon">🕐</span>
                        <input
                          type="text"
                          className="ct-field-input ct-labor-input"
                          placeholder="Input value"
                          value={newTaskRecord.estimated_labor || ''}
                          onChange={(e) => setNewTaskRecord(prev => ({ ...prev, estimated_labor: e.target.value }))}
                        />
                        <span className="ct-labor-unit">hr</span>
                      </div>
                    </div>

                    <div className="ct-field-row">
                      <label className="ct-field-label">Actual Labor Time</label>
                      <div className="ct-actual-labor-wrap">
                        <div className="ct-labor-capsule">
                          {newTaskRecord.actual_labor || '0h 0:0m'}
                        </div>
                        <button
                          type="button"
                          className="ct-add-time-btn"
                          onClick={() => {
                            const t = prompt('Enter actual labor time (e.g. 2h 30m):');
                            if (t) setNewTaskRecord(prev => ({ ...prev, actual_labor: t }));
                          }}
                        >+ Add time</button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── OTHER ── */}
                <div id="ct-sec-other" className="ct-section">
                  <div className="ct-section-header">Other</div>
                  <div className="ct-section-body">

                    <div className="ct-other-table-header">
                      <span>Entity</span>
                      <span>Input</span>
                    </div>
                    {(newTaskRecord.external_links || [{ entity: '', input: '' }]).map((lnk, idx) => (
                      <div key={idx} className="ct-field-row ct-other-row">
                        <label className="ct-field-label">Links {idx + 1}</label>
                        <select
                          className="ct-field-select ct-other-entity"
                          value={lnk.entity}
                          onChange={(e) => {
                            const arr = [...(newTaskRecord.external_links || [])];
                            arr[idx] = { ...arr[idx], entity: e.target.value };
                            setNewTaskRecord(prev => ({ ...prev, external_links: arr }));
                          }}
                        >
                          <option value="">Select entity</option>
                          <option>Greenhouse</option>
                          <option>Field</option>
                          <option>Crop</option>
                          <option>Supplier</option>
                          <option>Equipment</option>
                        </select>
                        <span className="ct-arrow-sep">›</span>
                        <select
                          className="ct-field-select ct-other-input"
                          value={lnk.input}
                          onChange={(e) => {
                            const arr = [...(newTaskRecord.external_links || [])];
                            arr[idx] = { ...arr[idx], input: e.target.value };
                            setNewTaskRecord(prev => ({ ...prev, external_links: arr }));
                          }}
                        >
                          <option value="">Select</option>
                          <option>Greenhouse 1</option>
                          <option>Greenhouse 2</option>
                          <option>Field A</option>
                          <option>Field B</option>
                          <option>Basil 2026-A</option>
                        </select>
                        {idx > 0 && (
                          <button
                            type="button"
                            className="ct-trash-btn"
                            onClick={() => {
                              const arr = (newTaskRecord.external_links || []).filter((_, i) => i !== idx);
                              setNewTaskRecord(prev => ({ ...prev, external_links: arr }));
                            }}
                          >🗑</button>
                        )}
                      </div>
                    ))}
                    <div className="ct-field-row">
                      <label className="ct-field-label"></label>
                      <button
                        type="button"
                        className="ct-add-more-btn"
                        onClick={() => setNewTaskRecord(prev => ({ ...prev, external_links: [...(prev.external_links || []), { entity: '', input: '' }] }))}
                      >+ Add More</button>
                    </div>

                  </div>
                </div>

              </div>{/* end ct-body */}
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW TASK TYPE POPUP */}
      {showAddTaskTypePopup && (
        <div className="att-popup-overlay" onClick={() => setShowAddTaskTypePopup(false)}>
          <div className="att-popup" onClick={(e) => e.stopPropagation()}>
            <div className="att-popup-header">
              <span className="att-popup-title">Add New</span>
              <button type="button" className="att-popup-close" onClick={() => setShowAddTaskTypePopup(false)}>×</button>
            </div>
            <div className="att-popup-body">
              <label className="att-popup-label">New Task Type</label>
              <input
                className="att-popup-input"
                type="text"
                placeholder="e.g. Soil Sampling"
                value={newTaskTypeName}
                onChange={(e) => setNewTaskTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTaskTypeName.trim()) {
                      setCustomTaskTypes(prev => [...prev, newTaskTypeName.trim()]);
                      setNewTaskRecord(prev => ({ ...prev, task_type: newTaskTypeName.trim() }));
                      setShowAddTaskTypePopup(false);
                    }
                  }
                }}
                autoFocus
              />
            </div>
            <div className="att-popup-footer">
              <button type="button" className="att-popup-cancel" onClick={() => setShowAddTaskTypePopup(false)}>Cancel</button>
              <button
                type="button"
                className="att-popup-create"
                onClick={() => {
                  if (newTaskTypeName.trim()) {
                    setCustomTaskTypes(prev => [...prev, newTaskTypeName.trim()]);
                    setNewTaskRecord(prev => ({ ...prev, task_type: newTaskTypeName.trim() }));
                    setShowAddTaskTypePopup(false);
                  }
                }}
              >Create</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW FARM MODAL DIALOG */}
      {showAddFarmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white border border-[#e2e8f0] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-xs text-[#0f291e]">
            <button
              onClick={() => setShowAddFarmModal(false)}
              className="absolute top-4 right-4 text-[#94a3b8] hover:text-[#0f291e] p-1 rounded-lg hover:bg-[#f8faf8]"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#e6f4ea] text-[#10b981] flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0f291e]">
                  Create New Farm Workspace
                </h3>
                <p className="text-xs text-[#64748b]">
                  Enter farm title, region, land size, and operation category
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateFarmSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">
                  Farm Name <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gopikrishna's Farm"
                  value={newFarmForm.farm_name}
                  onChange={(e) => setNewFarmForm({ ...newFarmForm, farm_name: e.target.value })}
                  className="w-full bg-[#f8faf8] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 text-[#0f291e] placeholder-[#94a3b8] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Legal Entity / Business Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vivas Organics Private Limited"
                  value={newFarmForm.legal_name}
                  onChange={(e) => setNewFarmForm({ ...newFarmForm, legal_name: e.target.value })}
                  className="w-full bg-[#f8faf8] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 text-[#0f291e] placeholder-[#94a3b8] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">
                    City / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    value={newFarmForm.city}
                    onChange={(e) => setNewFarmForm({ ...newFarmForm, city: e.target.value })}
                    className="w-full bg-[#f8faf8] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 text-[#0f291e] placeholder-[#94a3b8] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    State / Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    value={newFarmForm.state_country}
                    onChange={(e) => setNewFarmForm({ ...newFarmForm, state_country: e.target.value })}
                    className="w-full bg-[#f8faf8] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 text-[#0f291e] placeholder-[#94a3b8] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">
                    Total Area (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 25.0"
                    value={newFarmForm.total_area_acres}
                    onChange={(e) => setNewFarmForm({ ...newFarmForm, total_area_acres: e.target.value })}
                    className="w-full bg-[#f8faf8] border border-[#cbd5e1] rounded-xl px-3.5 py-2.5 text-[#0f291e] placeholder-[#94a3b8] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Production Category
                  </label>
                  <select
                    value={newFarmForm.farm_type}
                    onChange={(e) => setNewFarmForm({ ...newFarmForm, farm_type: e.target.value })}
                    className="w-full bg-[#f8faf8] border border-[#cbd5e1] rounded-xl px-3 py-2.5 text-[#0f291e] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                  >
                    <option value="Organic Vegetables">Organic Vegetables</option>
                    <option value="Commercial Greenhouse">Commercial Greenhouse</option>
                    <option value="Fruit Orchard">Fruit Orchard</option>
                    <option value="Mixed Cropping">Mixed Cropping</option>
                    <option value="Hydroponics / Indoor">Hydroponics / Indoor</option>
                    <option value="Livestock & Crops">Livestock & Crops</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => setShowAddFarmModal(false)}
                  className="px-4 py-2 text-[#64748b] hover:text-[#0f291e] rounded-xl bg-[#f8faf8] hover:bg-[#f1f5f9] border border-[#e2e8f0] font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingFarm}
                  className="flex items-center gap-2 px-5 py-2 text-white bg-[#10b981] hover:bg-[#059669] rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>Create Farm Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tend-style Mobile App Download Modal */}
      <MobileAppModal
        isOpen={showMobileAppModal}
        onClose={() => setShowMobileAppModal(false)}
      />

    </div>
  );
}


