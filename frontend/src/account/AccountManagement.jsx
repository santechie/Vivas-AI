import React, { useState, useEffect } from 'react';
import {
  Calendar,
  User,
  Cpu,
  Database,
  ArrowLeft,
  ChevronRight,
  CreditCard,
  History,
  Award,
  Trash2,
  Plus,
  Search,
  Upload,
  Download,
  Check,
  X,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  AlertCircle,
  Zap,
  Smartphone,
  Info,
  CheckCircle2,
  Edit2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

import './AccountStyles.css';
import MobileAppModal from './MobileAppModal.jsx';
import AddStorageModal from './AddStorageModal.jsx';
import BuyAiCreditsModal from './BuyAiCreditsModal.jsx';
import PaymentMethodModal from './PaymentMethodModal.jsx';
import BillingHistoryModal from './BillingHistoryModal.jsx';
import PriorityOnboardingModal from './PriorityOnboardingModal.jsx';
import DeleteAccountModal from './DeleteAccountModal.jsx';
import FileUploadModal from './FileUploadModal.jsx';

export default function AccountManagement({
  API_BASE,
  currentUser,
  onUserUpdate,
  initialTab = 'plans',
  onBackToDashboard
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Data states
  const [accountSummary, setAccountSummary] = useState(null);
  const [plansData, setPlansData] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_country_code: '+91',
    phone_number: '',
    transfer_owner_id: '',
    labor_rate: 0
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [storageFiles, setStorageFiles] = useState([]);
  const [storageFilter, setStorageFilter] = useState('All');
  const [storageSearch, setStorageSearch] = useState('');
  const [aiCreditsData, setAiCreditsData] = useState(null);
  const [creditPurchases, setCreditPurchases] = useState([]);

  // Modals
  const [showAddStorage, setShowAddStorage] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMobileAppModal, setShowMobileAppModal] = useState(false);

  // Password update toggle
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordFields, setPasswordFields] = useState({ current: '', newPass: '', confirm: '' });

  // Rename File Modal / Prompt
  const [editingFile, setEditingFile] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch summary
  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/account/summary`);
      const data = await res.json();
      if (data.success) {
        setAccountSummary(data);
        setCurrentSub(data.subscription);
        setAiCreditsData(data.aiCredits);
        setProfileData({
          first_name: data.user.first_name || data.user.full_name?.split(' ')[0] || '',
          last_name: data.user.last_name || data.user.full_name?.split(' ').slice(1).join(' ') || '',
          email: data.user.email || '',
          phone_country_code: data.user.phone_country_code || '+91',
          phone_number: data.user.phone_number || '',
          transfer_owner_id: data.user.transfer_owner_id || '',
          labor_rate: data.user.labor_rate || 0
        });
      }
    } catch (err) {
      console.error('Error loading account summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch plans
  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_BASE}/account/plans`);
      const data = await res.json();
      if (data.success) {
        setPlansData(data.availablePlans || []);
        if (data.currentSubscription) {
          setCurrentSub(data.currentSubscription);
        }
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  // Fetch files
  const fetchFiles = async () => {
    try {
      const params = new URLSearchParams();
      if (storageFilter && storageFilter !== 'All') params.append('category', storageFilter);
      if (storageSearch.trim()) params.append('search', storageSearch.trim());

      const res = await fetch(`${API_BASE}/account/storage?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStorageFiles(data.files || []);
        if (data.storage && accountSummary) {
          setAccountSummary(prev => ({
            ...prev,
            storage: {
              ...prev.storage,
              ...data.storage
            }
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  // Fetch AI credits
  const fetchAiCredits = async () => {
    try {
      const res = await fetch(`${API_BASE}/account/ai-credits`);
      const data = await res.json();
      if (data.success) {
        setAiCreditsData(data.aiCredits);
        setCreditPurchases(data.purchases || []);
      }
    } catch (err) {
      console.error('Error fetching AI credits:', err);
    }
  };

  // Team members for transfer owner
  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_BASE}/account/profile`);
      const data = await res.json();
      if (data.success && data.teamMembers) {
        setTeamMembers(data.teamMembers);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchPlans();
    fetchFiles();
    fetchAiCredits();
    fetchTeam();
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [storageFilter, storageSearch]);

  // Handle Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/account/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Profile saved successfully!');
        if (onUserUpdate) onUserUpdate(data.profile);
        fetchSummary();
      } else {
        showToast(data.message || 'Error saving profile', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Plan Upgrade
  const handleUpgradePlan = async (tierId) => {
    try {
      const res = await fetch(`${API_BASE}/account/upgrade-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_tier: tierId, billing_cycle: billingCycle })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Plan upgraded successfully!');
        fetchSummary();
        fetchPlans();
      } else {
        showToast(data.message || 'Could not upgrade plan', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Add Storage
  const handleAddStorage = async (tierId) => {
    const res = await fetch(`${API_BASE}/account/storage/add-on`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: tierId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Storage add-on purchased successfully!');
      fetchSummary();
      fetchFiles();
    } else {
      showToast(data.message || 'Error purchasing storage', 'error');
    }
  };

  // Handle Buy AI Credits
  const handleBuyCredits = async (packageId) => {
    const res = await fetch(`${API_BASE}/account/ai-credits/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Credits added successfully!');
      fetchSummary();
      fetchAiCredits();
    } else {
      showToast(data.message || 'Error purchasing credits', 'error');
    }
  };

  // Handle Test/Use Credit
  const handleUseCredit = async () => {
    try {
      const res = await fetch(`${API_BASE}/account/ai-credits/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1 })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Consumed 1 AI credit for analysis simulation');
        fetchSummary();
        fetchAiCredits();
      } else {
        showToast(data.message || 'Insufficient credits', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Save Payment Method
  const handleSavePaymentMethod = async (formData) => {
    const res = await fetch(`${API_BASE}/account/payment-methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Payment method saved successfully!');
      fetchSummary();
    } else {
      showToast(data.message || 'Error saving card', 'error');
    }
  };

  // Delete file
  const handleDeleteFile = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/account/storage/files/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showToast('File deleted and storage reclaimed!');
        fetchSummary();
        fetchFiles();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Rename File
  const handleSaveRename = async () => {
    if (!editingFile || !renameValue.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/account/storage/files/${editingFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: renameValue.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('File renamed successfully!');
        setEditingFile(null);
        fetchFiles();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // File Icon Helper
  const getFileIcon = (mime = '') => {
    if (mime.includes('pdf')) return <FileText size={18} style={{ color: '#dc2626' }} />;
    if (mime.includes('image')) return <ImageIcon size={18} style={{ color: '#16a34a' }} />;
    if (mime.includes('sheet') || mime.includes('csv') || mime.includes('excel'))
      return <FileSpreadsheet size={18} style={{ color: '#059669' }} />;
    return <FileText size={18} style={{ color: '#64748b' }} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  // Storage and credits calculation for visuals
  const storageStats = accountSummary?.storage || {
    planStorageMB: 500,
    addonStorageMB: 0,
    totalStorageMB: 500,
    usedMB: 2,
    availableMB: 498,
    totalAddonCost: 0,
    storageAddons: []
  };

  const creditsRemaining = (aiCreditsData?.monthly_credits_remaining || 0) + (aiCreditsData?.addon_credits_remaining || 0);
  const creditsTotal = (aiCreditsData?.monthly_credits_total || 25) + (aiCreditsData?.addon_credits_total || 0);
  const creditsUsed = aiCreditsData?.credits_used || 0;

  // Monthly credits remaining for progress bar
  const monthlyRemaining = aiCreditsData?.monthly_credits_remaining || 0;
  const addonRemaining = aiCreditsData?.addon_credits_remaining || 0;
  const totalBaseAndAddon = Math.max(1, (aiCreditsData?.monthly_credits_total || 25) + (aiCreditsData?.addon_credits_total || 0));

  const monthlyPct = Math.min(100, (monthlyRemaining / totalBaseAndAddon) * 100);
  const addonPct = Math.min(100 - monthlyPct, (addonRemaining / totalBaseAndAddon) * 100);
  const usedPct = Math.min(100, (creditsUsed / (totalBaseAndAddon + creditsUsed || 1)) * 100);

  // Storage Progress Percentages
  const storageTotal = Math.max(1, storageStats.totalStorageMB || 500);
  const planStorageMB = storageStats.planStorageMB || 500;
  const addonStorageMB = storageStats.addonStorageMB || 0;
  const usedStorageMB = storageStats.usedMB || 2;

  const usedStoragePct = Math.min(100, (usedStorageMB / storageTotal) * 100);
  const planStoragePct = Math.max(0, ((planStorageMB - usedStorageMB) / storageTotal) * 100);
  const addonStoragePct = Math.min(100, (addonStorageMB / storageTotal) * 100);

  return (
    <div className="account-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`acc-toast ${toast.type}`}>
          <CheckCircle2 size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="account-top-bar">
        <button className="account-back-btn" onClick={onBackToDashboard}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-tend-outline" onClick={() => setShowMobileAppModal(true)}>
            <Smartphone size={15} />
            <span>Mobile App</span>
          </button>
        </div>
      </div>

      <div className="account-title-wrap">
        <h1>Manage Vivas AI Account</h1>
        <p>Review and configure your subscription plans, user credentials, AI credit quotas, and file storage.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="account-tabs-nav" style={{ marginTop: '1.25rem' }}>
        <button
          className={`account-tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <Calendar size={18} />
          <span>Plans</span>
        </button>

        <button
          className={`account-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} />
          <span>My Profile</span>
        </button>

        <button
          className={`account-tab-btn ${activeTab === 'ai-credits' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-credits')}
        >
          <Cpu size={18} />
          <span>AI Credits</span>
          <span className="tab-badge">{creditsRemaining} left</span>
        </button>

        <button
          className={`account-tab-btn ${activeTab === 'file-storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('file-storage')}
        >
          <Database size={18} />
          <span>File Storage</span>
          <span className="tab-badge">{storageStats.usedMB} MB</span>
        </button>
      </div>

      {/* =========================================================
          TAB 1: PLANS & SUBSCRIPTIONS
          ========================================================= */}
      {activeTab === 'plans' && (
        <div className="account-tab-content">
          {/* Current Plan Card */}
          <div className="current-plan-card">
            <div className="current-plan-badge">Current Plan</div>
            <h2 className="current-plan-title">
              {currentSub?.plan_name || 'Free Monthly'}
            </h2>
            <div className="current-plan-sub">
              {currentSub?.plan_price > 0 ? `$${currentSub.plan_price} USD / ${currentSub.billing_cycle}` : 'Free'}
            </div>

            <div className="plan-stats-row">
              <div className="plan-stat-chip">
                <User size={20} />
                <div className="plan-stat-info">
                  <span className="plan-stat-label">Users</span>
                  <span className="plan-stat-value">{currentSub?.max_users || 1} user</span>
                </div>
              </div>

              <div className="plan-stat-chip">
                <Cpu size={20} />
                <div className="plan-stat-info">
                  <span className="plan-stat-label">AI Credits</span>
                  <span className="plan-stat-value">{currentSub?.base_ai_credits || 25} credits</span>
                </div>
              </div>

              <div className="plan-stat-chip">
                <Database size={20} />
                <div className="plan-stat-info">
                  <span className="plan-stat-label">Storage</span>
                  <span className="plan-stat-value">
                    {currentSub?.base_storage_mb >= 1024
                      ? `${(currentSub.base_storage_mb / 1024).toFixed(0)} GB`
                      : `${currentSub?.base_storage_mb || 500} MB`}
                  </span>
                </div>
              </div>

              <div className="plan-stat-chip">
                <Clock size={20} />
                <div className="plan-stat-info">
                  <span className="plan-stat-label">Data Retention</span>
                  <span className="plan-stat-value">
                    {currentSub?.data_retention_years >= 90 ? 'Unlimited' : `${currentSub?.data_retention_years || 3} years`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Submenu Action Items (Tend Chevron List) */}
          <div className="account-options-list">
            <button className="account-option-item" onClick={() => setShowPaymentMethod(true)}>
              <div className="account-option-left">
                <CreditCard size={18} />
                <span>Change payment method</span>
              </div>
              <ChevronRight size={18} className="account-option-chevron" />
            </button>

            <button className="account-option-item" onClick={() => setShowBillingHistory(true)}>
              <div className="account-option-left">
                <History size={18} />
                <span>Billing history</span>
              </div>
              <ChevronRight size={18} className="account-option-chevron" />
            </button>

            <button className="account-option-item" onClick={() => setActiveTab('ai-credits')}>
              <div className="account-option-left">
                <Cpu size={18} />
                <span>Manage AI Credits</span>
              </div>
              <ChevronRight size={18} className="account-option-chevron" />
            </button>

            <button className="account-option-item" onClick={() => setActiveTab('file-storage')}>
              <div className="account-option-left">
                <Database size={18} />
                <span>Manage File Storage</span>
              </div>
              <ChevronRight size={18} className="account-option-chevron" />
            </button>

            <button className="account-option-item" onClick={() => setShowOnboarding(true)}>
              <div className="account-option-left">
                <Award size={18} />
                <span>Purchase Priority Onboarding</span>
              </div>
              <ChevronRight size={18} className="account-option-chevron" />
            </button>

            <button className="account-option-item danger-option" onClick={() => setShowDeleteModal(true)}>
              <div className="account-option-left">
                <Trash2 size={18} />
                <span>Delete my farm account</span>
              </div>
              <ChevronRight size={18} className="account-option-chevron" />
            </button>
          </div>

          {/* Upgrade Your Plan Grid */}
          <div className="upgrade-plan-section">
            <div className="upgrade-header-wrap">
              <h2>Upgrade your plan</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                Scale your agricultural operations with enhanced AI diagnostics, team seats, and storage.
              </p>

              <div className="billing-toggle-container">
                <button
                  className={`billing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`billing-toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
                  onClick={() => setBillingCycle('annual')}
                >
                  <span>Annual</span>
                  <span className="save-pill">Save 33%</span>
                </button>
              </div>
            </div>

            <div className="plans-grid">
              {plansData.map((plan) => {
                const isCurrent = currentSub?.plan_tier === plan.id;
                const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

                return (
                  <div key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''}`}>
                    {plan.popular && <div className="plan-popular-ribbon">Most Popular</div>}

                    <div className="plan-name">{plan.name}</div>

                    <div className="plan-price-wrap">
                      <span className="plan-price-val">${price}</span>
                      <span className="plan-price-period">
                        {price === 0 ? 'forever' : `/mo (${billingCycle})`}
                      </span>
                    </div>

                    <div className="plan-desc">{plan.description}</div>

                    <ul className="plan-features-list">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className={`plan-feature-item ${!feat.included ? 'disabled' : ''}`}>
                          {feat.included ? (
                            <Check size={16} className="check" />
                          ) : (
                            <X size={16} className="cross" />
                          )}
                          <span>{feat.text}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`plan-action-btn ${isCurrent ? 'current-btn' : 'active-btn'}`}
                      disabled={isCurrent}
                      onClick={() => handleUpgradePlan(plan.id)}
                    >
                      {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: MY PROFILE (Matching Tend Screenshot)
          ========================================================= */}
      {activeTab === 'profile' && (
        <div className="account-tab-content">
          <div className="acc-card">
            <div className="acc-card-header">
              <h3 className="acc-card-title">Edit User</h3>
              <button
                type="button"
                className="btn-tend-green"
                onClick={handleSaveProfile}
              >
                Save
              </button>
            </div>

            <div className="profile-card-content">
              {/* Form Column */}
              <form onSubmit={handleSaveProfile} className="profile-form-grid">
                <div className="profile-field-row">
                  <label className="profile-field-label">First name</label>
                  <input
                    type="text"
                    required
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    className="profile-field-input"
                  />
                </div>

                <div className="profile-field-row">
                  <label className="profile-field-label">Last name</label>
                  <input
                    type="text"
                    required
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    className="profile-field-input"
                  />
                </div>

                <div className="profile-field-row">
                  <label className="profile-field-label">Email</label>
                  <input
                    type="email"
                    required
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="profile-field-input"
                  />
                </div>

                <div className="profile-field-row">
                  <label className="profile-field-label">Phone number</label>
                  <div className="phone-input-group">
                    <select
                      value={profileData.phone_country_code}
                      onChange={(e) => setProfileData({ ...profileData, phone_country_code: e.target.value })}
                      className="phone-code-select"
                    >
                      <option value="+91">🇮🇳 (+91)</option>
                      <option value="+1">🇺🇸 (+1)</option>
                      <option value="+44">🇬🇧 (+44)</option>
                      <option value="+61">🇦🇺 (+61)</option>
                      <option value="+49">🇩🇪 (+49)</option>
                      <option value="+971">🇦🇪 (+971)</option>
                    </select>
                    <input
                      type="text"
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                      placeholder="9940091521"
                      className="profile-field-input"
                    />
                  </div>
                </div>

                <div className="profile-field-row">
                  <label className="profile-field-label">
                    <span>Transfer Owner</span>
                    <span className="profile-info-tooltip" title="Transfer primary administrative ownership of this farm account to another team member">
                      <Info size={14} />
                    </span>
                  </label>
                  <select
                    value={profileData.transfer_owner_id}
                    onChange={(e) => setProfileData({ ...profileData, transfer_owner_id: e.target.value })}
                    className="profile-field-input"
                  >
                    <option value="">Select account</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="profile-field-row">
                  <label className="profile-field-label">
                    <span>Labor rate</span>
                    <span className="profile-info-tooltip" title="Standard base hourly wage for task costing and labor calculations">
                      <Info size={14} />
                    </span>
                  </label>
                  <div className="currency-input-group">
                    <input
                      type="number"
                      step="0.01"
                      value={profileData.labor_rate}
                      onChange={(e) => setProfileData({ ...profileData, labor_rate: e.target.value })}
                      className="profile-field-input"
                      style={{ paddingRight: '32px' }}
                    />
                    <span className="currency-symbol-addon">₹</span>
                  </div>
                </div>
              </form>

              {/* Avatar Column */}
              <div className="profile-avatar-column">
                <div className="profile-avatar-large">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Profile" />
                  ) : (
                    <span>
                      {((profileData.first_name?.[0] || 'V') + (profileData.last_name?.[0] || 'I')).toUpperCase()}
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                  {currentUser?.role || 'Farm Manager'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  {currentUser?.farm_name || 'Vivas Organics Farm'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: AI CREDITS (Matching Tend Screenshot)
          ========================================================= */}
      {activeTab === 'ai-credits' && (
        <div className="account-tab-content">
          {/* Card 1: Manage AI Credits */}
          <div className="acc-card">
            <div className="acc-card-header">
              <div className="acc-card-title-group">
                <Cpu size={22} className="acc-card-icon" />
                <h3 className="acc-card-title">Manage AI Credits</h3>
              </div>
              <button className="btn-tend-green" onClick={() => setShowBuyCredits(true)}>
                <Plus size={16} />
                <span>Buy AI Credits Add-On</span>
              </button>
            </div>

            <div style={{ marginBottom: '0.5rem' }}>
              <span className="credits-hero-number">{creditsRemaining}</span>
              <span className="credits-hero-sub">of {creditsTotal} AI credits remaining</span>
            </div>
            <div className="credits-used-text">{creditsUsed} AI credits used</div>

            {/* Progress Track */}
            <div className="acc-progress-track">
              <div
                className="progress-segment-purple"
                style={{ width: `${monthlyPct}%` }}
                title={`Monthly credits: ${monthlyRemaining}`}
              />
              <div
                className="progress-segment-teal"
                style={{ width: `${addonPct}%` }}
                title={`Add-on credits: ${addonRemaining}`}
              />
              <div
                className="progress-segment-used"
                style={{ width: `${usedPct}%` }}
                title={`Used credits: ${creditsUsed}`}
              />
            </div>

            {/* Legend */}
            <div className="progress-legend">
              <div className="legend-item">
                <div className="legend-dot purple" />
                <span>Monthly AI credits ({monthlyRemaining} remaining)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot teal" />
                <span>Purchased AI credits add-ons ({addonRemaining} remaining)</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot gray" />
                <span>Used ({creditsUsed})</span>
              </div>
            </div>
          </div>

          {/* Card 2: Monthly AI credits */}
          <div className="acc-card">
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Monthly AI credits
            </h4>

            <div style={{ marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                {monthlyRemaining}
              </span>
              <span style={{ fontSize: '0.9rem', color: '#475569', marginLeft: '6px' }}>
                of {aiCreditsData?.monthly_credits_total || 25} AI credits remaining
              </span>
            </div>

            <div className="acc-progress-track" style={{ height: '8px' }}>
              <div className="progress-segment-purple" style={{ width: `${monthlyPct}%` }} />
            </div>

            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.5rem' }}>
              Resets on{' '}
              {aiCreditsData?.cycle_reset_date
                ? new Date(aiCreditsData.cycle_reset_date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'next cycle'}
            </div>
          </div>

          {/* Section 3: Purchased AI credits add-ons */}
          <div className="acc-card">
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Purchased AI credits add-ons
            </h4>

            {creditPurchases.length === 0 ? (
              <div className="acc-empty-state" style={{ padding: '2rem 1rem' }}>
                <p style={{ margin: 0 }}>No purchased add-ons</p>
              </div>
            ) : (
              <div className="acc-table-wrap">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Credits Added</th>
                      <th>Amount Paid</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditPurchases.map((cp) => (
                      <tr key={cp.id}>
                        <td style={{ fontWeight: 600 }}>{cp.package_name}</td>
                        <td>+{cp.credits_amount}</td>
                        <td>${Number(cp.amount_paid).toFixed(2)} {cp.currency}</td>
                        <td>{new Date(cp.created_at).toLocaleDateString()}</td>
                        <td>
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.8rem' }}>
                            {cp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: FILE STORAGE (Matching Tend Screenshot)
          ========================================================= */}
      {activeTab === 'file-storage' && (
        <div className="account-tab-content">
          {/* Search bar matching Tend */}
          <div className="storage-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search files and documents..."
              value={storageSearch}
              onChange={(e) => setStorageSearch(e.target.value)}
              className="storage-search-input"
            />
          </div>

          {/* File Storage Usage Card matching Tend screenshot */}
          <div className="acc-card">
            <div className="acc-card-header">
              <div className="acc-card-title-group">
                <Database size={22} className="acc-card-icon" />
                <h3 className="acc-card-title">File Storage</h3>
              </div>
              <button className="btn-tend-green" onClick={() => setShowAddStorage(true)}>
                <Plus size={16} />
                <span>Add Storage</span>
              </button>
            </div>

            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>
                {storageStats.usedMB} MB
              </span>
              <span style={{ fontSize: '0.95rem', color: '#475569', marginLeft: '6px' }}>
                of {storageStats.totalStorageMB >= 1024 ? `${(storageStats.totalStorageMB / 1024).toFixed(1)} GB` : `${storageStats.totalStorageMB} MB`} used
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
              {storageStats.availableMB >= 1024
                ? `${(storageStats.availableMB / 1024).toFixed(1)} GB`
                : `${storageStats.availableMB} MB`}{' '}
              available
            </div>

            {/* Tend Storage Progress Bar */}
            <div className="acc-progress-track">
              <div
                className="progress-segment-darkgreen"
                style={{ width: `${Math.max(1, usedStoragePct)}%` }}
                title={`Used: ${storageStats.usedMB} MB`}
              />
              <div
                className="progress-segment-green"
                style={{ width: `${planStoragePct}%` }}
                title={`Plan storage available: ${planStorageMB} MB`}
              />
              <div
                className="progress-segment-lightgreen"
                style={{ width: `${addonStoragePct}%` }}
                title={`Add-on storage: ${addonStorageMB} MB`}
              />
            </div>

            {/* Legend matching Tend screenshot */}
            <div className="progress-legend">
              <div className="legend-item">
                <div className="legend-dot green" />
                <span>Plan storage ({planStorageMB >= 1024 ? `${(planStorageMB / 1024).toFixed(0)} GB` : `${planStorageMB} MB`})</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot lightgreen" />
                <span>Add-on storage ({addonStorageMB >= 1024 ? `${(addonStorageMB / 1024).toFixed(0)} GB` : `${addonStorageMB} MB`})</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot darkgreen" />
                <span>Used ({storageStats.usedMB} MB)</span>
              </div>
            </div>
          </div>

          {/* Storage add-ons section matching Tend */}
          <div className="acc-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                Storage add-ons
              </h4>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                ${Number(storageStats.totalAddonCost || 0).toFixed(2)} USD/mo total
              </span>
            </div>

            {(!storageStats.storageAddons || storageStats.storageAddons.length === 0) ? (
              <div className="acc-empty-state" style={{ padding: '2rem 1rem' }}>
                <p style={{ margin: 0 }}>No storage add-ons</p>
              </div>
            ) : (
              <div className="acc-table-wrap">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>Add-on Package</th>
                      <th>Storage Added</th>
                      <th>Price</th>
                      <th>Date Subscribed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storageStats.storageAddons.map((addon) => (
                      <tr key={addon.id}>
                        <td style={{ fontWeight: 600 }}>{addon.package_name}</td>
                        <td>+{addon.storage_gb} GB</td>
                        <td>${Number(addon.price_usd_per_mo).toFixed(2)} USD / month</td>
                        <td>{new Date(addon.created_at).toLocaleDateString()}</td>
                        <td>
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.8rem' }}>
                            {addon.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Document & Files Management Library */}
          <div className="acc-card">
            <div className="acc-card-header">
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Uploaded Farm Documents & Files ({storageFiles.length})
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Upload soil test lab reports, field inspection photos, organic certifications, and invoices.
                </p>
              </div>

              <button className="btn-tend-green" onClick={() => setShowUploadModal(true)}>
                <Upload size={16} />
                <span>Upload Document</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="file-category-pills">
              {['All', 'Soil Test', 'Crop Photos', 'Invoices', 'Certifications', 'SOPs & Guides', 'General'].map(cat => (
                <button
                  key={cat}
                  className={`category-pill ${storageFilter === cat ? 'active' : ''}`}
                  onClick={() => setStorageFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Files Table */}
            {storageFiles.length === 0 ? (
              <div className="acc-empty-state">
                <FileText size={40} />
                <p style={{ margin: '0 0 0.75rem 0' }}>No documents uploaded yet in this category.</p>
                <button className="btn-tend-green" onClick={() => setShowUploadModal(true)}>
                  Upload First File
                </button>
              </div>
            ) : (
              <div className="acc-table-wrap">
                <table className="acc-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Category</th>
                      <th>Size</th>
                      <th>Uploaded By</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storageFiles.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <div className="file-name-cell">
                            {getFileIcon(file.mime_type)}
                            <div>
                              <div>{file.file_name}</div>
                              {file.notes && (
                                <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 400 }}>
                                  {file.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`file-category-badge ${file.category?.replace(/\s+/g, '')}`}>
                            {file.category || 'General'}
                          </span>
                        </td>
                        <td style={{ color: '#475569' }}>{formatFileSize(file.file_size_bytes)}</td>
                        <td style={{ color: '#475569' }}>{file.uploaded_by || 'Admin'}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          {new Date(file.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            {file.file_url && (
                              <a
                                href={`${API_BASE.replace('/api', '')}${file.file_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="file-action-btn"
                                title="Open / Download"
                              >
                                <Download size={15} />
                              </a>
                            )}
                            <button
                              className="file-action-btn"
                              title="Rename File"
                              onClick={() => {
                                setEditingFile(file);
                                setRenameValue(file.file_name);
                              }}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="file-action-btn delete"
                              title="Delete File"
                              onClick={() => handleDeleteFile(file.id, file.file_name)}
                            >
                              <Trash2 size={15} />
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
        </div>
      )}

      {/* =========================================================
          MODALS & POPUPS
          ========================================================= */}
      <MobileAppModal
        isOpen={showMobileAppModal}
        onClose={() => setShowMobileAppModal(false)}
      />

      <AddStorageModal
        isOpen={showAddStorage}
        onClose={() => setShowAddStorage(false)}
        currentStorageMB={storageStats.totalStorageMB}
        onAddStorage={handleAddStorage}
      />

      <BuyAiCreditsModal
        isOpen={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
        currentCredits={creditsRemaining}
        onBuyCredits={handleBuyCredits}
      />

      <PaymentMethodModal
        isOpen={showPaymentMethod}
        onClose={() => setShowPaymentMethod(false)}
        currentPaymentMethod={accountSummary?.defaultPaymentMethod}
        onSavePaymentMethod={handleSavePaymentMethod}
      />

      <BillingHistoryModal
        isOpen={showBillingHistory}
        onClose={() => setShowBillingHistory(false)}
        API_BASE={API_BASE}
      />

      <PriorityOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        API_BASE={API_BASE}
        user={currentUser}
        onSubmitted={(msg) => showToast(msg)}
      />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        farmName={currentUser?.farm_name || 'Vivas Farm'}
        API_BASE={API_BASE}
        onDeleteConfirmed={() => {
          showToast('Farm account deleted.');
          onBackToDashboard();
        }}
      />

      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        availableMB={storageStats.availableMB}
        API_BASE={API_BASE}
        onFileUploaded={(file) => {
          showToast(`File "${file.file_name}" uploaded successfully!`);
          fetchSummary();
          fetchFiles();
        }}
      />

      {/* Rename File Prompt Modal */}
      {editingFile && (
        <div className="tend-modal-overlay" onClick={() => setEditingFile(null)}>
          <div className="tend-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="tend-modal-header">
              <h3>Rename File</h3>
              <button className="tend-modal-close-btn" onClick={() => setEditingFile(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="tend-modal-body">
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                New file name
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="profile-field-input"
                autoFocus
              />
            </div>
            <div className="tend-modal-footer">
              <button className="btn-tend-outline" onClick={() => setEditingFile(null)}>
                Cancel
              </button>
              <button className="btn-tend-green" onClick={handleSaveRename}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
