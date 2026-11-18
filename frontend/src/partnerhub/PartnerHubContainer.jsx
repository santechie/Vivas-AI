import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  BarChart3,
  FlaskConical,
  Webhook,
  CheckCircle2,
  Layers,
  Building2,
  KeyRound,
  LogOut,
  X,
  UserCheck
} from 'lucide-react';
import './PartnerHub.css';
import { pihRequest } from './pihApi';
import PartnerProducts from './PartnerProducts';
import PartnerAdmin from './PartnerAdmin';
import Marketplace from './Marketplace';
import MyOrders from './MyOrders';
import PartnerOrders from './PartnerOrders';
import ProductResults from './ProductResults';
import PartnerDashboard from './PartnerDashboard';
import FieldInsights from './FieldInsights';
import FieldTrials from './FieldTrials';
import Recommendations from './Recommendations';
import Integrations from './Integrations';
import DataSharingConsent from './DataSharingConsent';

const PIH_VIEWS = [
  // Farmer Views
  { id: 'pih-marketplace', label: 'Agri-Input Marketplace', icon: Store, phase: 3, defaultRole: 'farmer', roles: ['farmer', 'vivas_admin'] },
  { id: 'pih-recommendations', label: 'For My Farm (AI Picks)', icon: Sparkles, phase: 5, defaultRole: 'farmer', roles: ['farmer', 'vivas_admin'] },
  { id: 'pih-orders', label: 'My Input Orders', icon: ShoppingBag, phase: 3, defaultRole: 'farmer', roles: ['farmer', 'vivas_admin'] },
  { id: 'pih-results', label: 'Product Field Results', icon: CheckCircle2, phase: 4, defaultRole: 'farmer', roles: ['farmer', 'vivas_sme', 'vivas_admin'] },
  { id: 'pih-consent', label: 'DPDP Privacy & Consent', icon: ShieldCheck, phase: 6, defaultRole: 'farmer', roles: ['farmer', 'vivas_admin'] },

  // Partner Views
  { id: 'pih-partner-dashboard', label: 'Partner Overview', icon: Layers, phase: 4, defaultRole: 'partner_admin', roles: ['partner_admin', 'partner_user', 'vivas_admin'] },
  { id: 'pih-partner-products', label: 'My Products & Catalogue', icon: Package, phase: 2, defaultRole: 'partner_admin', roles: ['partner_admin', 'partner_user', 'vivas_admin'] },
  { id: 'pih-partner-orders', label: 'Store Orders & Settlements', icon: ShoppingBag, phase: 3, defaultRole: 'partner_admin', roles: ['partner_admin', 'partner_user', 'vivas_admin'] },
  { id: 'pih-insights', label: 'AI Field Insights', icon: BarChart3, phase: 4, defaultRole: 'partner_admin', roles: ['partner_admin', 'partner_user', 'vivas_sme', 'vivas_admin'] },
  { id: 'pih-trials', label: 'Field Trials', icon: FlaskConical, phase: 4, defaultRole: 'partner_admin', roles: ['partner_admin', 'partner_user', 'vivas_sme', 'vivas_admin'] },
  { id: 'pih-integrations', label: 'API Keys & Webhooks', icon: Webhook, phase: 6, defaultRole: 'partner_admin', roles: ['partner_admin', 'vivas_admin'] },

  // Vivas SME & Admin Console
  { id: 'pih-admin', label: 'Vivas SME & Admin Console', icon: ShieldCheck, phase: 2, defaultRole: 'vivas_sme', roles: ['vivas_sme', 'vivas_admin'] }
];

const ROLE_DEFAULT_VIEW = {
  farmer: 'pih-marketplace',
  partner_admin: 'pih-partner-dashboard',
  partner_user: 'pih-partner-products',
  vivas_sme: 'pih-admin',
  vivas_admin: 'pih-admin'
};

export default function PartnerHubContainer({ activeTab = 'pih-marketplace', setActiveTab, selectedFarm }) {
  const [internalTab, setInternalTab] = useState(
    activeTab && activeTab.startsWith('pih-') ? activeTab : 'pih-marketplace'
  );
  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem('pih_active_role') || 'farmer';
  });
  const [partners, setPartners] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(() => {
    return localStorage.getItem('pih_active_partner_id') || '';
  });
  const [showAllTabs, setShowAllTabs] = useState(false);

  // Partner Login Modal State
  const [showPartnerLoginModal, setShowPartnerLoginModal] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('partner123');
  const [loginRole, setLoginRole] = useState('partner_admin');
  const [loginError, setLoginError] = useState('');

  // Load partners list for Partner Login & Partner Switcher
  useEffect(() => {
    let mounted = true;
    pihRequest('/partners')
      .then((res) => {
        if (!mounted) return;
        const list = res.data || [];
        setPartners(list);
        if (!activePartnerId && list.length > 0) {
          const defaultId = list[0].id;
          setActivePartnerId(defaultId);
          localStorage.setItem('pih_active_partner_id', defaultId);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Sync when left sidebar changes activeTab
  useEffect(() => {
    if (activeTab && activeTab.startsWith('pih-')) {
      setInternalTab(activeTab);
      const matchedView = PIH_VIEWS.find((v) => v.id === activeTab);
      if (matchedView && !matchedView.roles.includes(activeRole)) {
        const nextRole = matchedView.defaultRole || 'farmer';
        setActiveRole(nextRole);
        localStorage.setItem('pih_active_role', nextRole);
      }
    }
  }, [activeTab]);

  const currentViewId = activeTab && activeTab.startsWith('pih-') ? activeTab : internalTab;
  const activePartner = partners.find((p) => p.id === activePartnerId) || partners[0] || null;

  const handleSelectView = (view) => {
    if (!view) return;
    setInternalTab(view.id);
    if (setActiveTab) {
      setActiveTab(view.id);
    }
    if (!view.roles.includes(activeRole) && view.defaultRole) {
      setActiveRole(view.defaultRole);
      localStorage.setItem('pih_active_role', view.defaultRole);
    }
  };

  const handleRoleChange = (newRole) => {
    setActiveRole(newRole);
    localStorage.setItem('pih_active_role', newRole);

    // Check if the current screen belongs to the newly selected role; if not, jump to that role's home view
    const currentViewObj = PIH_VIEWS.find((v) => v.id === currentViewId);
    if (!currentViewObj || !currentViewObj.roles.includes(newRole)) {
      const targetViewId = ROLE_DEFAULT_VIEW[newRole] || 'pih-marketplace';
      setInternalTab(targetViewId);
      if (setActiveTab) {
        setActiveTab(targetViewId);
      }
    }
  };

  const handlePartnerChange = (partnerId) => {
    setActivePartnerId(partnerId);
    localStorage.setItem('pih_active_partner_id', partnerId);
  };

  const handlePartnerLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');
    const q = loginIdentifier.trim().toLowerCase();
    if (!q) {
      setLoginError('Please enter your Partner Email, GSTIN, or Partner Code.');
      return;
    }

    const matched = partners.find(
      (p) =>
        (p.email && p.email.toLowerCase() === q) ||
        (p.gstin && p.gstin.toLowerCase() === q) ||
        (p.partner_code && p.partner_code.toLowerCase() === q) ||
        (p.brand_name && p.brand_name.toLowerCase().includes(q))
    );

    if (!matched) {
      setLoginError('No registered partner matched that Email, GSTIN, or Partner Code. Try one of the quick-login accounts below.');
      return;
    }

    handlePartnerQuickLogin(matched, loginRole);
  };

  const handlePartnerQuickLogin = (partnerObj, role = 'partner_admin') => {
    if (!partnerObj) return;
    setActivePartnerId(partnerObj.id);
    localStorage.setItem('pih_active_partner_id', partnerObj.id);
    setActiveRole(role);
    localStorage.setItem('pih_active_role', role);
    const targetView = role === 'partner_user' ? 'pih-partner-products' : 'pih-partner-dashboard';
    setInternalTab(targetView);
    if (setActiveTab) {
      setActiveTab(targetView);
    }
    setShowPartnerLoginModal(false);
    setLoginError('');
  };

  const visibleViews = showAllTabs
    ? PIH_VIEWS
    : PIH_VIEWS.filter((v) => v.roles.includes(activeRole));

  const isPartnerRole = activeRole === 'partner_admin' || activeRole === 'partner_user';

  return (
    <div className="pih-root">
      {/* Top Role, Partner Login & Screen Switcher Bar */}
      <div className="pih-topbar">
        {/* Row 1: Role Switcher + Partner Login / Active Partner Identity */}
        <div className="pih-topbar-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: '#064f32',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Building2 size={15} />
              Vivas AgriInput Partner Hub
            </span>

            {/* Role Quick-Switch Pills */}
            <div
              style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: 3,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                gap: 4
              }}
            >
              {[
                { id: 'farmer', label: 'Farmer View' },
                { id: 'partner_admin', label: 'Partner Admin View' },
                { id: 'vivas_sme', label: 'Vivas SME / Admin View' }
              ].map((r) => {
                const active =
                  r.id === activeRole ||
                  (r.id === 'partner_admin' && activeRole === 'partner_user') ||
                  (r.id === 'vivas_sme' && activeRole === 'vivas_admin');
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleChange(r.id)}
                    style={{
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 12px',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: active ? '#16a34a' : 'transparent',
                      color: active ? '#ffffff' : '#475569',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Active Partner Selector when in Partner role */}
            {isPartnerRole && partners.length > 0 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '3px 8px'
                }}
              >
                <UserCheck size={14} color="#15803d" />
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#166534' }}>Partner:</span>
                <select
                  className="pih-select"
                  style={{
                    padding: '2px 8px',
                    minHeight: 26,
                    fontSize: '0.76rem',
                    width: 'auto',
                    fontWeight: 700,
                    background: '#ffffff'
                  }}
                  value={activePartnerId}
                  onChange={(e) => handlePartnerChange(e.target.value)}
                >
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand_name} ({p.partner_code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Partner Login Button */}
            <button
              type="button"
              onClick={() => setShowPartnerLoginModal(true)}
              className="pih-btn pih-btn-sm pih-btn-secondary"
              style={{
                borderColor: '#16a34a',
                color: '#15803d',
                background: '#f0fdf4',
                fontWeight: 700
              }}
            >
              <KeyRound size={13} />
              {isPartnerRole && activePartner ? `Switch Partner Account` : `Partner Login`}
            </button>

            {isPartnerRole && (
              <button
                type="button"
                onClick={() => handleRoleChange('farmer')}
                className="pih-btn pih-btn-sm pih-btn-secondary"
                title="Exit Partner Portal back to Farmer View"
              >
                <LogOut size={13} />
                Exit Partner View
              </button>
            )}

            {/* Detailed RBAC Role Dropdown */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>RBAC Role:</span>
              <select
                className="pih-select"
                style={{ padding: '4px 8px', minHeight: 30, fontSize: '0.76rem', width: 'auto', fontWeight: 600 }}
                value={activeRole}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <option value="farmer">farmer (Farm Owner / Manager)</option>
                <option value="partner_admin">partner_admin (Manufacturer Admin)</option>
                <option value="partner_user">partner_user (Catalogue / Store Staff)</option>
                <option value="vivas_sme">vivas_sme (Vivas Agronomy SME)</option>
                <option value="vivas_admin">vivas_admin (Platform Super Admin)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Role-Filtered Navigation Tabs */}
        <div className="pih-topbar-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {visibleViews.map((v) => {
              const Icon = v.icon;
              const isActive = currentViewId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectView(v)}
                  className={`pih-btn pih-btn-sm ${isActive ? 'pih-btn-primary' : 'pih-btn-secondary'}`}
                >
                  <Icon size={14} />
                  {v.label}
                </button>
              );
            })}
          </div>

          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.74rem',
              color: '#64748b',
              cursor: 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            <input
              type="checkbox"
              checked={showAllTabs}
              onChange={(e) => setShowAllTabs(e.target.checked)}
            />
            Show all 12 screens
          </label>
        </div>
      </div>

      {/* Render Active Screen inside standardized .pih-page container */}
      <div className="pih-page" key={`${activeRole}-${activePartnerId}`}>
        {currentViewId === 'pih-marketplace' && (
          <Marketplace onNavigateOrders={() => handleSelectView(PIH_VIEWS.find((v) => v.id === 'pih-orders'))} />
        )}

        {currentViewId === 'pih-orders' && (
          <MyOrders />
        )}

        {currentViewId === 'pih-partner-products' && (
          <PartnerProducts activePartnerId={activePartnerId} activeRole={activeRole} selectedFarm={selectedFarm} />
        )}

        {currentViewId === 'pih-partner-orders' && (
          <PartnerOrders activePartnerId={activePartnerId} />
        )}

        {currentViewId === 'pih-admin' && (
          <PartnerAdmin activeRole={activeRole === 'vivas_admin' ? 'vivas_admin' : 'vivas_sme'} />
        )}

        {currentViewId === 'pih-results' && (
          <ProductResults />
        )}

        {currentViewId === 'pih-partner-dashboard' && (
          <PartnerDashboard
            activePartnerId={activePartnerId}
            onNavigate={(viewId) => {
              const target = PIH_VIEWS.find((v) => v.id === viewId);
              if (target) handleSelectView(target);
            }}
          />
        )}

        {currentViewId === 'pih-insights' && (
          <FieldInsights activeRole={activeRole} />
        )}

        {currentViewId === 'pih-trials' && (
          <FieldTrials activeRole={activeRole} />
        )}

        {currentViewId === 'pih-recommendations' && (
          <Recommendations
            onNavigate={(viewId) => {
              const target = PIH_VIEWS.find((v) => v.id === viewId);
              if (target) handleSelectView(target);
            }}
          />
        )}

        {currentViewId === 'pih-integrations' && (
          <Integrations activePartnerId={activePartnerId} />
        )}

        {currentViewId === 'pih-consent' && (
          <DataSharingConsent />
        )}
      </div>

      {/* Partner Portal Login Modal */}
      {showPartnerLoginModal && (
        <div className="pih-modal-overlay" onClick={() => setShowPartnerLoginModal(false)}>
          <div
            className="pih-modal"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pih-modal-header">
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} color="#16a34a" />
                  AgriInput Partner Portal Sign-In
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Sign in with your registered Manufacturer Email, GSTIN, or Partner Code — or select a verified partner account below.
                </p>
              </div>
              <button
                type="button"
                className="pih-btn pih-btn-sm pih-btn-secondary"
                onClick={() => setShowPartnerLoginModal(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="pih-modal-body">
              {loginError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    marginBottom: 14,
                    fontWeight: 600
                  }}
                >
                  {loginError}
                </div>
              )}

              <form onSubmit={handlePartnerLoginSubmit} style={{ marginBottom: 20 }}>
                <div className="pih-form-grid">
                  <div className="pih-form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="pih-label">Partner Email / GSTIN / Partner Code</label>
                    <input
                      type="text"
                      className="pih-input"
                      placeholder="e.g. partner.nano@iffco.in or 07AAACI1234F1Z5 or PIH-PRT-0001"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                    />
                  </div>
                  <div className="pih-form-group">
                    <label className="pih-label">Portal Password</label>
                    <input
                      type="password"
                      className="pih-input"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                  <div className="pih-form-group">
                    <label className="pih-label">Partner Staff Role</label>
                    <select
                      className="pih-select"
                      value={loginRole}
                      onChange={(e) => setLoginRole(e.target.value)}
                    >
                      <option value="partner_admin">partner_admin (Full Partner Admin)</option>
                      <option value="partner_user">partner_user (Catalogue & Store Staff)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="pih-btn pih-btn-primary">
                    <KeyRound size={14} />
                    Sign In to Partner Portal
                  </button>
                </div>
              </form>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <div
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#475569',
                    marginBottom: 10
                  }}
                >
                  Quick Demo Login — Onboarded Partner Accounts ({partners.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {partners.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: p.id === activePartnerId && isPartnerRole ? '2px solid #16a34a' : '1px solid #e2e8f0',
                        background: p.id === activePartnerId && isPartnerRole ? '#f0fdf4' : '#f8fafc'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                          {p.brand_name}{' '}
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                            ({p.partner_code})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>
                          Email: <code>{p.email}</code> • GSTIN: <code>{p.gstin}</code> • Type: {p.partner_type}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="pih-btn pih-btn-sm pih-btn-primary"
                        onClick={() => handlePartnerQuickLogin(p, loginRole)}
                      >
                        Login as Partner
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
