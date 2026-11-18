import React, { useState, useEffect } from 'react';
import {
  Building2, CheckSquare, Users, Package, Store, Bell, Tag,
  Printer, CreditCard, Clock, Sliders, Grid, Search, ArrowLeft,
  ChevronRight, RefreshCw, Sparkles, Shield, CheckCircle2, ImageDown
} from 'lucide-react';
import './SettingsStyles.css';

// Import all 13 modules
import FarmProfileSettings from './modules/FarmProfileSettings';
import TaskTypeSettings from './modules/TaskTypeSettings';
import UsersRolesSettings from './modules/UsersRolesSettings';
import ProductSettings from './modules/ProductSettings';
import OnlineStoreSettings from './modules/OnlineStoreSettings';
import NotificationSettings from './modules/NotificationSettings';
import PlantingIdSettings from './modules/PlantingIdSettings';
import LabelManagementSettings from './modules/LabelManagementSettings';
import CommercePaymentSettings from './modules/CommercePaymentSettings';
import TimeAttendanceSettings from './modules/TimeAttendanceSettings';
import CustomFieldsSettings from './modules/CustomFieldsSettings';
import AppsIntegrationsSettings from './modules/AppsIntegrationsSettings';
import CropHealthImageSourcesSettings from './modules/CropHealthImageSourcesSettings';

// Helper to normalize submodule IDs from URLs, hashes or legacy aliases
const normalizeSubmodule = (id) => {
  if (!id) return null;
  const clean = id.toLowerCase().replace(/^settings\/?/, '').replace(/-/g, '_');
  const map = {
    'farm_settings': 'farm-settings',
    'farm_profile': 'farm-settings',
    'farm': 'farm-settings',
    'task_type_management': 'task-type-management',
    'task_types': 'task-type-management',
    'task_type': 'task-type-management',
    'tasks': 'task-type-management',
    'people': 'people',
    'users': 'people',
    'roles': 'people',
    'users_roles': 'people',
    'product_settings': 'product-settings',
    'product': 'product-settings',
    'inventory': 'product-settings',
    'online_store_setting': 'online-store-setting',
    'online_store': 'online-store-setting',
    'store': 'online-store-setting',
    'delivery': 'online-store-setting',
    'notification_settings': 'notification-settings',
    'notifications': 'notification-settings',
    'planting_id_config': 'planting-id-config',
    'planting_id': 'planting-id-config',
    'label_management': 'label-management',
    'labels': 'label-management',
    'commerce_payment': 'commerce-payment',
    'commerce': 'commerce-payment',
    'payments': 'commerce-payment',
    'time_attendance': 'time-attendance',
    'time': 'time-attendance',
    'attendance': 'time-attendance',
    'custom_data_fields': 'custom-data-fields',
    'custom_fields': 'custom-data-fields',
    'apps': 'apps',
    'integrations': 'apps',
    'api_tokens': 'apps',
    'crop_health_image_sources': 'crop-health-image-sources',
    'crop_health_images': 'crop-health-image-sources',
    'chi': 'crop-health-image-sources'
  };
  return map[clean] || id;
};

export default function SettingsHub({ apiBase = 'http://localhost:5001', currentFarmId = 'e772d1ba-6841-44ba-86a2-c429a7e007e4', initialSubmodule = null, onBackToApp = null }) {
  // Normalize apiBase to remove trailing /api since submodules append /api/settings/...
  const cleanApiBase = (apiBase !== undefined && apiBase !== null ? apiBase : (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5001' : '')).replace(/\/api\/?$/, '');

  const [activeSubmodule, setActiveSubmodule] = useState(() => {
    if (initialSubmodule) return normalizeSubmodule(initialSubmodule);
    const h = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '');
    if (h.startsWith('settings/')) {
      return normalizeSubmodule(h.split('/')[1]);
    }
    return null;
  });

  const [search, setSearch] = useState('');
  const [overviewData, setOverviewData] = useState(null);
  const [chiOverviewData, setChiOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSelectSubmodule = (id) => {
    const norm = normalizeSubmodule(id);
    setActiveSubmodule(norm);
    if (typeof window !== 'undefined') {
      window.location.hash = norm ? `settings/${norm}` : 'settings';
    }
  };

  const handleBackToOverview = () => {
    setActiveSubmodule(null);
    if (typeof window !== 'undefined') {
      window.location.hash = 'settings';
    }
  };

  // Sync initialSubmodule prop if it changes
  useEffect(() => {
    setActiveSubmodule(normalizeSubmodule(initialSubmodule));
  }, [initialSubmodule]);

  // Listen to hash changes for browser forward/back buttons
  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      if (h === 'settings' || h === '') {
        setActiveSubmodule(null);
      } else if (h.startsWith('settings/')) {
        const sub = h.split('/')[1];
        setActiveSubmodule(normalizeSubmodule(sub));
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('vivas_token') || sessionStorage.getItem('vivas_token') || localStorage.getItem('token'))
        : '';

      const [res, chiRes] = await Promise.all([
        fetch(`${cleanApiBase}/api/settings/overview?farm_id=${currentFarmId}`).then(r => r.json()).catch(() => null),
        fetch(`${cleanApiBase}/api/chi/overview`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'x-farm-id': currentFarmId
          }
        }).then(r => r.json()).catch(() => null)
      ]);

      if (res && res.success) {
        setOverviewData(res.data || res);
      }
      if (chiRes && chiRes.success) {
        setChiOverviewData(chiRes.data || {});
      }
    } catch (err) {
      console.error('Error fetching settings overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [currentFarmId]);

  // Extract live counts with sensible fallbacks
  const farmName = overviewData?.farmProfile?.farm_name || overviewData?.farm?.name || "Gopikrishna's Farm";
  const counts = overviewData?.counts || {};

  // Card definitions matching Tend.com /settings
  const settingsCards = [
    {
      id: 'farm-settings',
      title: 'Farm Profile & Operations',
      description: 'Farm name, primary address, production practices, units of measure, and operational season dates.',
      icon: Building2,
      badge: farmName,
      component: FarmProfileSettings
    },
    {
      id: 'task-type-management',
      title: 'Task Type Management',
      description: 'Configure custom task categories, calendar color schemes, abbreviations, and active workflow statuses.',
      icon: CheckSquare,
      badge: `${counts.taskTypes ?? 23} Task Types`,
      component: TaskTypeSettings
    },
    {
      id: 'people',
      title: 'Users & Roles',
      description: 'Invite team members, assign permission roles, manage hourly labor rates, and configure module access security.',
      icon: Users,
      badge: `${counts.users ?? 5} Members`,
      component: UsersRolesSettings
    },
    {
      id: 'product-settings',
      title: 'Product & Inventory',
      description: 'Produce shelf life tracking, automated harvest inventory depletion triggers, and low stock thresholds.',
      icon: Package,
      badge: 'Active Tracking',
      component: ProductSettings
    },
    {
      id: 'online-store-setting',
      title: 'Online Store & Offer Sheets',
      description: 'Storefront branding, tax rates, delivery methods & shipping fees, and farm gate pickup spots.',
      icon: Store,
      badge: `${counts.deliveryMethods ?? 3} Delivery Zones`,
      component: OnlineStoreSettings
    },
    {
      id: 'notification-settings',
      title: 'Notification Preferences',
      description: 'Configure automated email and in-app alerts for tasks, equipment maintenance, and new orders.',
      icon: Bell,
      badge: 'Email & In-App',
      component: NotificationSettings
    },
    {
      id: 'planting-id-config',
      title: 'Planting ID Configuration',
      description: 'Automate unique identifier patterns for successive crop plantings, bed batches, and harvest lot codes.',
      icon: Tag,
      badge: 'Smart Field Pattern',
      component: PlantingIdSettings
    },
    {
      id: 'label-management',
      title: 'Label & Barcode Management',
      description: 'Printable harvest bin labels, clamshell barcode tags, and seedling flat markers for thermal & laser printers.',
      icon: Printer,
      badge: `${counts.labelTemplates ?? 3} Templates`,
      component: LabelManagementSettings
    },
    {
      id: 'commerce-payment',
      title: 'Commerce & Payment Processors',
      description: 'Connect Razorpay UPI, Stripe, Square POS readers, and direct bank transfers for wholesale & retail orders.',
      icon: CreditCard,
      badge: `${counts.activeProcessors ?? 2} Active Gateways`,
      component: CommercePaymentSettings
    },
    {
      id: 'time-attendance',
      title: 'Time & Attendance',
      description: 'Digital mobile punch clock, task requirement upon clock-in, overtime multipliers, and automated shift boundaries.',
      icon: Clock,
      badge: 'Digital Clock-In',
      component: TimeAttendanceSettings
    },
    {
      id: 'custom-data-fields',
      title: 'Custom Data Fields',
      description: 'Add tailored attributes like Brix sweetness, moisture readings, and organic seed certificates across farm entities.',
      icon: Sliders,
      badge: `${counts.customFields ?? 4} Fields`,
      component: CustomFieldsSettings
    },
    {
      id: 'apps',
      title: 'Apps & Integrations',
      description: 'Personal Access Tokens (PAT), Webhook subscriptions, Google Sheets live sync, and weather station APIs.',
      icon: Grid,
      badge: `${counts.activeTokens ?? 0} Tokens`,
      component: AppsIntegrationsSettings
    },
    {
      id: 'crop-health-image-sources',
      title: 'Crop Health Image Sources',
      description: 'Import pest, disease and deficiency images from licensed sources, review them, file them under crops and build AI training sets.',
      icon: ImageDown,
      badge: `${chiOverviewData?.imported_media_count ?? 0} Images · ${chiOverviewData?.total_sources ?? 7} Sources`,
      component: CropHealthImageSourcesSettings
    }
  ];

  // Active module component lookup
  const currentCard = settingsCards.find(c => c.id === activeSubmodule);
  const ActiveComponent = currentCard ? currentCard.component : null;

  // Filtered cards in search
  const filteredCards = settingsCards.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="vivas-settings-hub-root" style={{ minHeight: '100%', backgroundColor: '#f8fafc', padding: '24px 32px' }}>
      {/* Top Breadcrumb Navigation */}
      <div className="settings-breadcrumb-bar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.925rem' }}>
          <button
            onClick={handleBackToOverview}
            style={{
              background: 'none',
              border: 'none',
              color: activeSubmodule ? '#064f32' : '#0f172a',
              fontWeight: activeSubmodule ? 500 : 700,
              cursor: activeSubmodule ? 'pointer' : 'default',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {activeSubmodule && <ArrowLeft size={16} />}
            <span>Settings</span>
          </button>

          {activeSubmodule && currentCard && (
            <>
              <ChevronRight size={15} style={{ color: '#94a3b8' }} />
              <span style={{ color: '#0f172a', fontWeight: 700 }}>
                {currentCard.title}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {activeSubmodule ? (
            <button
              className="settings-btn-secondary"
              onClick={handleBackToOverview}
              style={{ fontSize: '0.8125rem' }}
            >
              <ArrowLeft size={14} /> Back to All Settings
            </button>
          ) : (
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search settings..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="settings-form-control"
                style={{ paddingLeft: '32px', height: '34px', fontSize: '0.85rem' }}
              />
            </div>
          )}

          {onBackToApp && (
            <button
              className="settings-btn-secondary"
              onClick={onBackToApp}
              style={{ fontSize: '0.8125rem' }}
            >
              Back to Farm
            </button>
          )}
        </div>
      </div>

      {/* Render either Submodule Component OR 12-Card Grid */}
      {activeSubmodule && ActiveComponent ? (
        <ActiveComponent apiBase={cleanApiBase} farmId={currentFarmId} />
      ) : (
        <div>
          {/* Hub Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #064f32 0%, #0d734a 100%)',
            borderRadius: '12px',
            padding: '28px 32px',
            color: '#ffffff',
            marginBottom: '32px',
            boxShadow: '0 4px 16px rgba(6, 79, 50, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Farm Administration
                </span>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  • {overviewData?.farm?.name || 'Gopikrishna’s Farm'}
                </span>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px' }}>
                Settings & Configuration
              </h1>
              <p style={{ margin: 0, opacity: 0.85, fontSize: '0.95rem', maxWidth: '620px' }}>
                Configure farm profiles, team roles, custom task codes, ecommerce storefronts, and third-party integrations matching Tend.com capabilities.
              </p>
            </div>
            <div style={{ display: 'none', md: 'block' }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                borderRadius: '10px',
                padding: '16px 20px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>12 / 12</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Modules Configured</div>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="settings-overview-grid">
            {filteredCards.map(card => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="settings-overview-card"
                  onClick={() => handleSelectSubmodule(card.id)}
                >
                  <div className="card-top-row">
                    <div className="card-icon-wrapper">
                      <Icon size={24} />
                    </div>
                    {card.badge && (
                      <span className="card-badge">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-desc">{card.description}</p>
                  <div className="card-footer">
                    <span>Manage Settings</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
