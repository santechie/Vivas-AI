import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Upload, Download, CheckCircle, AlertTriangle,
  Building2, FileText, Store, Search, LayoutGrid, List, Eye,
  Send, PauseCircle, PlayCircle, Trash2, X, ShieldCheck
} from 'lucide-react';
import { pihRequest, coreApiRequest } from './pihApi';
import './PartnerHub.css';

const PRODUCT_TYPES = [
  'SEED', 'FERTILISER', 'UREA', 'NANO_FERTILISER',
  'BIO_STIMULANT', 'MICRONUTRIENT', 'CROP_PROTECTION',
  'ORGANIC_INPUT', 'OTHER'
];

const DOC_TYPES = ['FCO', 'CIBRC', 'SEED_LICENCE', 'GST', 'ISO', 'ORGANIC', 'OTHER'];

const WIZARD_STEPS = [
  '1. Basic Info',
  '2. Composition',
  '3. SKUs & Price',
  '4. Crop Suitability',
  '5. Problem Claims',
  '6. Media & Label',
  '7. Compliance & Submit'
];

export default function PartnerProducts({ activePartnerId, onSelectPartner }) {
  const [subTab, setSubTab] = useState('catalogue'); // 'catalogue' | 'licences' | 'store'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(activePartnerId || '');
  const [partnerDetail, setPartnerDetail] = useState(null);
  const [products, setProducts] = useState([]);
  const [crops, setCrops] = useState([]);
  const [nutrients, setNutrients] = useState([]);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState(null);
  const [bannerErr, setBannerErr] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Filters
  const [searchQ, setSearchQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals & Drawers
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState(null);

  // Partner Registration Form
  const [partnerForm, setPartnerForm] = useState({
    legal_name: '',
    brand_name: '',
    partner_type: 'FERTILISER',
    gstin: '29AABCI1234F1Z5',
    pan: 'AABCI1234F',
    address: '',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    pincode: '560001',
    phone: '9845012345',
    email: '',
    website: ''
  });

  // Document Upload Form
  const [docForm, setDocForm] = useState({
    doc_type: 'FCO',
    doc_number: '',
    issued_on: '2025-01-01',
    expires_on: '2028-12-31',
    file_url: '/uploads/partner_hub/fco_licence_sample.pdf',
    remarks: ''
  });

  // Store Profile Form
  const [storeForm, setStoreForm] = useState({
    store_name: '',
    slug: '',
    banner_url: '',
    about: '',
    service_states: 'Karnataka, Tamil Nadu, Maharashtra',
    service_districts: 'Bengaluru Urban, Mysuru, Kolar, Belagavi, Coimbatore',
    support_phone: '',
    support_email: '',
    return_policy: '',
    min_order_value: 500,
    cod_enabled: true,
    credit_enabled: false,
    is_live: false
  });

  // 7-Step Product Wizard Form
  const defaultProductForm = {
    name: '',
    brand: '',
    product_type: 'NANO_FERTILISER',
    sub_type: 'Foliar Nano Nitrogen',
    formulation: 'Liquid Suspension',
    registration_no: 'FCO-KAR-2025-8891',
    hsn_code: '31021000',
    gst_pct: 5,
    is_organic: false,
    shelf_life_months: 24,
    storage_instructions: 'Store in a cool, dry place away from direct sunlight below 35°C.',
    safety_precautions: 'Wear gloves and eye protection during foliar spray.',
    phi_days: 3,
    reentry_hours: 4,
    description: '',
    how_it_works: '',
    label_pdf_url: '/uploads/partner_hub/product_label.pdf',
    composition: [
      { component_name: 'Nano Nitrogen (N)', nutrient_code: 'N', active_ingredient: 'Nano Urea Particles', value: 4.0, unit: '% w/v' }
    ],
    skus: [
      { sku_code: '', pack_size: 500, pack_unit: 'ml', mrp: 240, selling_price: 225, stock_qty: 400, batch_no: 'BN-2026-101', expiry_date: '2028-06-30' }
    ],
    suitability: [
      { crop_id: '', crop_stage: 'Vegetative to Flowering', dose_value: 4, dose_min: 2, dose_max: 5, dose_unit: 'ml', dose_basis: 'per litre', application_method: 'Foliar Spray', interval_days: 14, max_applications: 2 }
    ],
    claims: [
      { problem_id: '', crop_id: '', claim_type: 'correct_deficiency', evidence_note: 'Multi-location ICAR & state SAU trials showing rapid foliar N uptake.' }
    ],
    media: [
      { media_type: 'image', url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=600&auto=format&fit=crop&q=80', caption: 'Product Pack' }
    ]
  };
  const [productForm, setProductForm] = useState(defaultProductForm);

  // Bulk Import State
  const [csvText, setCsvText] = useState(
    'product_code,name,brand,product_type,sub_type,formulation,registration_no,hsn_code,gst_pct,is_organic,phi_days,reentry_hours,sku_code,pack_size,pack_unit,mrp,selling_price,stock_qty\n' +
    'IMP-BIO-01,Seaweed Kelp Bio-Stimulant,Multiplex Bio,BIO_STIMULANT,Ascophyllum Extract,Liquid,FCO-BIO-901,31010099,12,true,0,0,SKU-KELP-1L,1,L,680,590,250'
  );
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (selectedPartnerId) {
      loadPartnerAndProducts(selectedPartnerId);
      if (onSelectPartner) onSelectPartner(selectedPartnerId);
    }
  }, [selectedPartnerId, typeFilter, statusFilter, searchQ]);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const [pRes, cropsRes, nutRes, probRes] = await Promise.all([
        pihRequest('/partners'),
        coreApiRequest('/crops'),
        coreApiRequest('/ch/nutrients'),
        coreApiRequest('/ch/problems?limit=100')
      ]);

      const partnerList = pRes.data || [];
      setPartners(partnerList);
      const cropList = cropsRes.data || [];
      setCrops(cropList);
      setNutrients(nutRes.data || []);
      const probList = probRes.data || [];
      setProblems(probList);

      if (partnerList.length > 0 && !selectedPartnerId) {
        setSelectedPartnerId(partnerList[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setBannerErr(err.message);
      setLoading(false);
    }
  };

  const loadPartnerAndProducts = async (pId) => {
    try {
      setLoading(true);
      const qParams = new URLSearchParams({ partner_id: pId });
      if (typeFilter) qParams.set('type', typeFilter);
      if (statusFilter) qParams.set('status', statusFilter);
      if (searchQ.trim()) qParams.set('q', searchQ.trim());

      const [detRes, prodRes] = await Promise.all([
        pihRequest(`/partners/${pId}`),
        pihRequest(`/products?${qParams.toString()}`)
      ]);

      const det = detRes.data;
      setPartnerDetail(det);
      setProducts(prodRes.data || []);

      if (det?.store) {
        setStoreForm({
          store_name: det.store.store_name || '',
          slug: det.store.slug || '',
          banner_url: det.store.banner_url || '',
          about: det.store.about || '',
          service_states: (det.store.service_states || []).join(', '),
          service_districts: (det.store.service_districts || []).join(', '),
          support_phone: det.store.support_phone || '',
          support_email: det.store.support_email || '',
          return_policy: det.store.return_policy || '',
          min_order_value: det.store.min_order_value || 500,
          cod_enabled: Boolean(det.store.cod_enabled),
          credit_enabled: Boolean(det.store.credit_enabled),
          is_live: Boolean(det.store.is_live)
        });
      }
    } catch (err) {
      setBannerErr(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPartner = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setBannerErr(null);
    try {
      const res = await pihRequest('/partners', { method: 'POST', body: partnerForm });
      setBannerMsg(res.message);
      setShowRegisterModal(false);
      const pList = await pihRequest('/partners');
      setPartners(pList.data || []);
      setSelectedPartnerId(res.data.id);
    } catch (err) {
      setFieldErrors(err.errors || {});
      setBannerErr(err.message);
    }
  };

  const handleSubmitPartnerForReview = async () => {
    if (!selectedPartnerId) return;
    setBannerErr(null);
    try {
      const res = await pihRequest(`/partners/${selectedPartnerId}/submit`, { method: 'POST', body: {} });
      setBannerMsg(res.message);
      loadPartnerAndProducts(selectedPartnerId);
    } catch (err) {
      setBannerErr(err.message);
    }
  };

  const handleUploadLicence = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setBannerErr(null);
    try {
      const res = await pihRequest(`/partners/${selectedPartnerId}/documents`, {
        method: 'POST',
        body: docForm
      });
      setBannerMsg(res.message);
      setShowDocModal(false);
      setDocForm({ ...docForm, doc_number: '' });
      loadPartnerAndProducts(selectedPartnerId);
    } catch (err) {
      setFieldErrors(err.errors || {});
      setBannerErr(err.message);
    }
  };

  const handleCreateProduct = async (submitImmediately = false) => {
    setFieldErrors({});
    setBannerErr(null);
    try {
      const cleanSuitability = productForm.suitability
        .filter((s) => s.crop_id || crops[0]?.id)
        .map((s) => ({ ...s, crop_id: s.crop_id || crops[0]?.id }));

      const cleanClaims = productForm.claims
        .filter((c) => c.problem_id || problems[0]?.id)
        .map((c) => ({
          ...c,
          problem_id: c.problem_id || problems[0]?.id,
          crop_id: c.crop_id || cleanSuitability[0]?.crop_id || null
        }));

      const payload = {
        ...productForm,
        partner_id: selectedPartnerId,
        brand: productForm.brand || partnerDetail?.brand_name || 'Agri Brand',
        suitability: cleanSuitability,
        claims: cleanClaims
      };

      const createRes = await pihRequest('/products', { method: 'POST', body: payload });
      let finalMsg = createRes.message;

      if (submitImmediately && createRes.data?.id) {
        const subRes = await pihRequest(`/products/${createRes.data.id}/submit`, { method: 'POST', body: {} });
        finalMsg = subRes.message;
      }

      setBannerMsg(finalMsg);
      setShowWizardModal(false);
      setWizardStep(0);
      loadPartnerAndProducts(selectedPartnerId);
    } catch (err) {
      setFieldErrors(err.errors || {});
      setBannerErr(err.message);
    }
  };

  const handleSubmitProduct = async (productId) => {
    setBannerErr(null);
    try {
      const res = await pihRequest(`/products/${productId}/submit`, { method: 'POST', body: {} });
      setBannerMsg(res.message);
      loadPartnerAndProducts(selectedPartnerId);
    } catch (err) {
      setBannerErr(`${err.message}${err.errors ? ' — ' + Object.values(err.errors).join('; ') : ''}`);
    }
  };

  const handleToggleProductStatus = async (prod) => {
    const nextStatus = prod.status === 'live' ? 'paused' : 'live';
    setBannerErr(null);
    try {
      const res = await pihRequest(`/products/${prod.id}/status`, {
        method: 'POST',
        body: { status: nextStatus }
      });
      setBannerMsg(res.message);
      loadPartnerAndProducts(selectedPartnerId);
    } catch (err) {
      setBannerErr(`${err.message}${err.errors ? ' — ' + Object.values(err.errors).join('; ') : ''}`);
    }
  };

  const handleOpenProductDrawer = async (productId) => {
    try {
      const res = await pihRequest(`/products/${productId}`);
      setDrawerProduct(res.data);
    } catch (err) {
      setBannerErr(err.message);
    }
  };

  const handleSaveStoreProfile = async (e) => {
    e.preventDefault();
    setBannerErr(null);
    try {
      const body = {
        ...storeForm,
        min_order_value: Number(storeForm.min_order_value || 0),
        service_states: String(storeForm.service_states).split(',').map((s) => s.trim()).filter(Boolean),
        service_districts: String(storeForm.service_districts).split(',').map((s) => s.trim()).filter(Boolean)
      };
      const res = await pihRequest(`/stores/${selectedPartnerId}`, { method: 'PUT', body });
      setBannerMsg(res.message);
      loadPartnerAndProducts(selectedPartnerId);
    } catch (err) {
      setBannerErr(`${err.message}${err.errors ? ' — ' + Object.values(err.errors).join('; ') : ''}`);
    }
  };

  const handleRunBulkImport = async () => {
    setBannerErr(null);
    try {
      const res = await pihRequest('/import', {
        method: 'POST',
        body: {
          partner_id: selectedPartnerId,
          file_name: 'partner_catalogue_import.csv',
          csv_text: csvText
        }
      });
      setImportResult(res.data);
      setBannerMsg(res.message);
      loadPartnerAndProducts(selectedPartnerId);
    } catch (err) {
      setBannerErr(err.message);
    }
  };

  const liveCount = products.filter((p) => p.status === 'live').length;
  const submittedCount = products.filter((p) => p.status === 'submitted').length;
  const approvedDocsCount = (partnerDetail?.documents || []).filter((d) => d.review_status === 'approved').length;

  return (
    <div className="pih-page">
      {/* Header */}
      <div className="pih-header">
        <div>
          <div className="pih-eyebrow">
            <Building2 size={13} /> PARTNER PORTAL // CATALOGUE & COMPLIANCE
          </div>
          <h1 className="pih-title">Products, Licences & Store Management</h1>
          <p className="pih-subtitle">
            Manage FCO / CIB&RC / Seed Act licences, product formulations, crop suitability matrices, and Crop Health efficacy claims
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="pih-select"
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
            style={{ minWidth: '240px', fontWeight: 600 }}
          >
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.brand_name} ({p.partner_type}) — [{p.status.toUpperCase()}]
              </option>
            ))}
          </select>

          <button className="pih-btn pih-btn-secondary" onClick={() => setShowRegisterModal(true)}>
            <Plus size={15} /> Register New Partner
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="pih-alert pih-alert-success">
          <CheckCircle size={17} />
          <div style={{ flex: 1 }}>{bannerMsg}</div>
          <button onClick={() => setBannerMsg(null)}><X size={15} /></button>
        </div>
      )}

      {bannerErr && (
        <div className="pih-alert pih-alert-error">
          <AlertTriangle size={17} />
          <div style={{ flex: 1 }}>{bannerErr}</div>
          <button onClick={() => setBannerErr(null)}><X size={15} /></button>
        </div>
      )}

      {/* Partner Compliance Banner */}
      {partnerDetail && (
        <div className="pih-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1b4332', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
              {partnerDetail.brand_name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>{partnerDetail.legal_name}</strong>
                <span className={`pih-chip pih-chip-${partnerDetail.status}`}>{partnerDetail.status}</span>
                <span style={{ fontFamily: 'var(--pih-mono)', fontSize: '12px', color: '#475569' }}>
                  GSTIN: {partnerDetail.gstin} · PAN: {partnerDetail.pan}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
                {partnerDetail.address}, {partnerDetail.district}, {partnerDetail.state} - {partnerDetail.pincode} · Commission: {partnerDetail.commission_pct}%
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={() => setShowDocModal(true)}>
              <Upload size={14} /> Upload Licence (FCO / CIB&RC / Seed)
            </button>
            {partnerDetail.status === 'draft' && (
              <button className="pih-btn pih-btn-primary pih-btn-sm" onClick={handleSubmitPartnerForReview}>
                <Send size={14} /> Submit Partner for SME Verification
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="pih-stats-grid">
        <div className="pih-stat-card">
          <div className="pih-stat-label">
            <span>TOTAL CATALOGUE SKUS</span>
            <Package size={16} color="#1b4332" />
          </div>
          <div className="pih-stat-value">{products.length}</div>
          <div className="pih-stat-meta">Across {partnerDetail?.brand_name || 'Partner'}</div>
        </div>

        <div className="pih-stat-card">
          <div className="pih-stat-label">
            <span>LIVE IN MARKETPLACE</span>
            <CheckCircle size={16} color="#16a34a" />
          </div>
          <div className="pih-stat-value" style={{ color: '#16a34a' }}>{liveCount}</div>
          <div className="pih-stat-meta">SME-verified & compliance cleared</div>
        </div>

        <div className="pih-stat-card">
          <div className="pih-stat-label">
            <span>AWAITING SME APPROVAL</span>
            <Send size={16} color="#d97706" />
          </div>
          <div className="pih-stat-value" style={{ color: '#d97706' }}>{submittedCount}</div>
          <div className="pih-stat-meta">Under agronomist & claim review</div>
        </div>

        <div className="pih-stat-card">
          <div className="pih-stat-label">
            <span>APPROVED LICENCES</span>
            <ShieldCheck size={16} color="#0284c7" />
          </div>
          <div className="pih-stat-value" style={{ color: '#0284c7' }}>
            {approvedDocsCount} / {(partnerDetail?.documents || []).length}
          </div>
          <div className="pih-stat-meta">FCO, CIB&RC, Seed Act & GST docs</div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="pih-tabs">
          <button
            className={`pih-tab-btn ${subTab === 'catalogue' ? 'active' : ''}`}
            onClick={() => setSubTab('catalogue')}
          >
            <Package size={15} /> Product Catalogue
            <span className="pih-tab-badge">{products.length}</span>
          </button>
          <button
            className={`pih-tab-btn ${subTab === 'licences' ? 'active' : ''}`}
            onClick={() => setSubTab('licences')}
          >
            <FileText size={15} /> Regulatory Licences (FCO / CIB&RC)
            <span className="pih-tab-badge">{(partnerDetail?.documents || []).length}</span>
          </button>
          <button
            className={`pih-tab-btn ${subTab === 'store' ? 'active' : ''}`}
            onClick={() => setSubTab('store')}
          >
            <Store size={15} /> Store Profile & Service Regions
          </button>
        </div>

        {subTab === 'catalogue' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="pih-btn pih-btn-secondary" onClick={() => setShowImportModal(true)}>
              <Upload size={15} /> Bulk CSV Upload
            </button>
            <button
              className="pih-btn pih-btn-primary"
              onClick={() => {
                setProductForm({
                  ...defaultProductForm,
                  brand: partnerDetail?.brand_name || '',
                  product_type: partnerDetail?.partner_type || 'FERTILISER'
                });
                setWizardStep(0);
                setShowWizardModal(true);
              }}
            >
              <Plus size={15} /> Add Product Wizard
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: PRODUCT CATALOGUE */}
      {subTab === 'catalogue' && (
        <>
          <div className="pih-filter-bar">
            <div className="pih-search-wrap">
              <Search size={15} color="#64748b" style={{ position: 'absolute', left: 12, top: 10 }} />
              <input
                className="pih-search-input"
                placeholder="Search by product name, code, brand, or active ingredient..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="pih-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All Input Types</option>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>

              <select className="pih-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="live">Live</option>
                <option value="paused">Paused</option>
              </select>

              <div className="pih-tabs" style={{ padding: '2px' }}>
                <button className={`pih-tab-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} style={{ padding: '6px 10px' }}>
                  <List size={15} />
                </button>
                <button className={`pih-tab-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')} style={{ padding: '6px 10px' }}>
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="pih-card" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Loading partner catalogue...
            </div>
          ) : viewMode === 'table' ? (
            <div className="pih-card">
              <div className="pih-table-wrap">
                <table className="pih-table">
                  <thead>
                    <tr>
                      <th>Code / Product</th>
                      <th>Category & HSN</th>
                      <th>SKUs & Price</th>
                      <th>Target Crops</th>
                      <th>Problem Claims</th>
                      <th>FPS Score</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                          No products found for this partner. Click "Add Product Wizard" to create one.
                        </td>
                      </tr>
                    ) : (
                      products.map((prod) => {
                        const firstSku = prod.skus?.[0];
                        return (
                          <tr key={prod.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{prod.name}</div>
                              <div style={{ fontFamily: 'var(--pih-mono)', fontSize: '11px', color: '#64748b' }}>
                                {prod.product_code} · {prod.brand} {prod.is_organic ? '· 🌱 Organic' : ''}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{prod.product_type.replace('_', ' ')}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                HSN {prod.hsn_code} · GST {prod.gst_pct}% · PHI {prod.phi_days}d
                              </div>
                            </td>
                            <td>
                              {firstSku ? (
                                <>
                                  <div style={{ fontWeight: 700, color: '#166534' }}>
                                    ₹{Number(firstSku.selling_price).toLocaleString('en-IN')}{' '}
                                    <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontWeight: 400, fontSize: '11px' }}>
                                      ₹{Number(firstSku.mrp).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    {firstSku.pack_size} {firstSku.pack_unit} · Stock: {firstSku.stock_qty}
                                  </div>
                                </>
                              ) : (
                                <span style={{ color: '#dc2626', fontSize: '12px' }}>No SKU</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {(prod.suitability || []).slice(0, 3).map((s, i) => (
                                  <span key={i} style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: '6px', fontSize: '11px' }}>
                                    {s.crop_icon} {s.crop_name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              {(prod.claims || []).map((cl, i) => (
                                <div key={i} style={{ fontSize: '11px', marginBottom: '3px' }}>
                                  <span className={`pih-chip pih-chip-${cl.sme_status}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                    {cl.sme_status}
                                  </span>{' '}
                                  {cl.problem_name} ({cl.claim_type})
                                </div>
                              ))}
                            </td>
                            <td>
                              <div style={{ fontFamily: 'var(--pih-mono)', fontWeight: 700, color: '#1b4332' }}>
                                ★ {Number(prod.rating?.fps || 0).toFixed(2)} / 5.0
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {prod.rating?.badge?.replace('_', ' ') || 'Needs Data'} (n={prod.rating?.verified_count || 0})
                              </div>
                            </td>
                            <td>
                              <span className={`pih-chip pih-chip-${prod.status}`}>{prod.status}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={() => handleOpenProductDrawer(prod.id)}>
                                  <Eye size={13} /> Details
                                </button>
                                {prod.status === 'draft' && (
                                  <button className="pih-btn pih-btn-primary pih-btn-sm" onClick={() => handleSubmitProduct(prod.id)}>
                                    <Send size={13} /> Submit
                                  </button>
                                )}
                                {['live', 'paused'].includes(prod.status) && (
                                  <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={() => handleToggleProductStatus(prod)}>
                                    {prod.status === 'live' ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                                    {prod.status === 'live' ? 'Pause' : 'Resume'}
                                  </button>
                                )}
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
          ) : (
            <div className="pih-cards-grid">
              {products.map((prod) => {
                const firstSku = prod.skus?.[0];
                return (
                  <div key={prod.id} className="pih-product-card">
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--pih-mono)', fontSize: '11px', color: '#64748b' }}>{prod.product_code}</span>
                        <span className={`pih-chip pih-chip-${prod.status}`}>{prod.status}</span>
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a' }}>{prod.name}</h3>
                      <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
                        {prod.brand} · {prod.product_type.replace('_', ' ')} · HSN {prod.hsn_code}
                      </div>
                      {firstSku && (
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
                          ₹{Number(firstSku.selling_price).toLocaleString('en-IN')}{' '}
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
                            / {firstSku.pack_size} {firstSku.pack_unit}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={() => handleOpenProductDrawer(prod.id)}>
                        <Eye size={13} /> Inspect
                      </button>
                      {prod.status === 'draft' && (
                        <button className="pih-btn pih-btn-primary pih-btn-sm" onClick={() => handleSubmitProduct(prod.id)}>
                          <Send size={13} /> Submit to SME
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: REGULATORY LICENCES */}
      {subTab === 'licences' && (
        <div className="pih-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pih-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Compliance & Regulatory Licence Documents</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Fertilisers & Nano-fertilisers require FCO; Crop Protection requires CIB&RC; Seeds require a Seed Act Licence. Products are auto-paused if their licence expires.
              </p>
            </div>
            <button className="pih-btn pih-btn-primary pih-btn-sm" onClick={() => setShowDocModal(true)}>
              <Upload size={14} /> Upload Licence
            </button>
          </div>
          <div className="pih-table-wrap">
            <table className="pih-table">
              <thead>
                <tr>
                  <th>Licence Type</th>
                  <th>Registration / Licence No.</th>
                  <th>Issued On</th>
                  <th>Expires On</th>
                  <th>SME Review Status</th>
                  <th>Reviewed By</th>
                  <th>Document</th>
                </tr>
              </thead>
              <tbody>
                {(partnerDetail?.documents || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                      No compliance documents uploaded yet.
                    </td>
                  </tr>
                ) : (
                  (partnerDetail?.documents || []).map((doc) => (
                    <tr key={doc.id}>
                      <td><strong>{doc.doc_type}</strong></td>
                      <td style={{ fontFamily: 'var(--pih-mono)' }}>{doc.doc_number}</td>
                      <td>{doc.issued_on ? new Date(doc.issued_on).toLocaleDateString() : '—'}</td>
                      <td>{doc.expires_on ? new Date(doc.expires_on).toLocaleDateString() : '—'}</td>
                      <td><span className={`pih-chip pih-chip-${doc.review_status}`}>{doc.review_status}</span></td>
                      <td>{doc.reviewed_by_name || 'Pending SME'}</td>
                      <td>
                        <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 600 }}>
                          View File
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STORE PROFILE */}
      {subTab === 'store' && (
        <div className="pih-card" style={{ padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Partner Storefront Configuration</h3>
          <form onSubmit={handleSaveStoreProfile}>
            <div className="pih-form-grid">
              <div className="pih-field">
                <label>Store Name *</label>
                <input
                  className="pih-input"
                  value={storeForm.store_name}
                  onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                  required
                />
              </div>
              <div className="pih-field">
                <label>Store URL Slug *</label>
                <input
                  className="pih-input"
                  value={storeForm.slug}
                  onChange={(e) => setStoreForm({ ...storeForm, slug: e.target.value })}
                  required
                />
              </div>
              <div className="pih-field">
                <label>Minimum Order Value (₹)</label>
                <input
                  type="number"
                  className="pih-input"
                  value={storeForm.min_order_value}
                  onChange={(e) => setStoreForm({ ...storeForm, min_order_value: e.target.value })}
                />
              </div>
              <div className="pih-field">
                <label>Support Phone</label>
                <input
                  className="pih-input"
                  value={storeForm.support_phone}
                  onChange={(e) => setStoreForm({ ...storeForm, support_phone: e.target.value })}
                />
              </div>
              <div className="pih-field">
                <label>Service States (comma-separated)</label>
                <input
                  className="pih-input"
                  value={storeForm.service_states}
                  onChange={(e) => setStoreForm({ ...storeForm, service_states: e.target.value })}
                />
              </div>
              <div className="pih-field">
                <label>Service Districts (comma-separated)</label>
                <input
                  className="pih-input"
                  value={storeForm.service_districts}
                  onChange={(e) => setStoreForm({ ...storeForm, service_districts: e.target.value })}
                />
              </div>
            </div>

            <div className="pih-field" style={{ marginTop: '14px' }}>
              <label>About Partner Store</label>
              <textarea
                className="pih-textarea"
                rows={3}
                value={storeForm.about}
                onChange={(e) => setStoreForm({ ...storeForm, about: e.target.value })}
              />
            </div>

            <div className="pih-field" style={{ marginTop: '14px' }}>
              <label>Return & Replacement Policy</label>
              <textarea
                className="pih-textarea"
                rows={2}
                value={storeForm.return_policy}
                onChange={(e) => setStoreForm({ ...storeForm, return_policy: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '16px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={storeForm.cod_enabled}
                  onChange={(e) => setStoreForm({ ...storeForm, cod_enabled: e.target.checked })}
                />
                Enable Cash on Delivery (COD)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={storeForm.credit_enabled}
                  onChange={(e) => setStoreForm({ ...storeForm, credit_enabled: e.target.checked })}
                />
                Allow Partner Credit Terms for Verified Farms
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={storeForm.is_live}
                  onChange={(e) => setStoreForm({ ...storeForm, is_live: e.target.checked })}
                />
                Store Live in Farmer Marketplace
              </label>
            </div>

            <div style={{ marginTop: '20px' }}>
              <button type="submit" className="pih-btn pih-btn-primary">
                Save Store Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: REGISTER NEW PARTNER */}
      {showRegisterModal && (
        <div className="pih-overlay">
          <div className="pih-modal" style={{ maxWidth: '680px' }}>
            <div className="pih-modal-header">
              <h3 style={{ margin: 0 }}>Register AgriInput Manufacturer Partner</h3>
              <button onClick={() => setShowRegisterModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleRegisterPartner}>
              <div className="pih-modal-body">
                <div className="pih-form-grid">
                  <div className="pih-field">
                    <label>Legal Company Name *</label>
                    <input className="pih-input" value={partnerForm.legal_name} onChange={(e) => setPartnerForm({ ...partnerForm, legal_name: e.target.value })} required />
                    {fieldErrors.legal_name && <span className="pih-field-error">{fieldErrors.legal_name}</span>}
                  </div>
                  <div className="pih-field">
                    <label>Brand Name *</label>
                    <input className="pih-input" value={partnerForm.brand_name} onChange={(e) => setPartnerForm({ ...partnerForm, brand_name: e.target.value })} required />
                    {fieldErrors.brand_name && <span className="pih-field-error">{fieldErrors.brand_name}</span>}
                  </div>
                  <div className="pih-field">
                    <label>Primary Partner Category *</label>
                    <select className="pih-select" value={partnerForm.partner_type} onChange={(e) => setPartnerForm({ ...partnerForm, partner_type: e.target.value })}>
                      {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="pih-field">
                    <label>GSTIN (15-char India Regex) *</label>
                    <input className="pih-input" value={partnerForm.gstin} onChange={(e) => setPartnerForm({ ...partnerForm, gstin: e.target.value.toUpperCase() })} required />
                    {fieldErrors.gstin && <span className="pih-field-error">{fieldErrors.gstin}</span>}
                  </div>
                  <div className="pih-field">
                    <label>PAN (10-char) *</label>
                    <input className="pih-input" value={partnerForm.pan} onChange={(e) => setPartnerForm({ ...partnerForm, pan: e.target.value.toUpperCase() })} required />
                    {fieldErrors.pan && <span className="pih-field-error">{fieldErrors.pan}</span>}
                  </div>
                  <div className="pih-field">
                    <label>10-Digit Mobile Phone *</label>
                    <input className="pih-input" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} required />
                    {fieldErrors.phone && <span className="pih-field-error">{fieldErrors.phone}</span>}
                  </div>
                  <div className="pih-field">
                    <label>Official Email *</label>
                    <input type="email" className="pih-input" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} required />
                    {fieldErrors.email && <span className="pih-field-error">{fieldErrors.email}</span>}
                  </div>
                  <div className="pih-field">
                    <label>Pincode (6 digits) *</label>
                    <input className="pih-input" value={partnerForm.pincode} onChange={(e) => setPartnerForm({ ...partnerForm, pincode: e.target.value })} required />
                    {fieldErrors.pincode && <span className="pih-field-error">{fieldErrors.pincode}</span>}
                  </div>
                  <div className="pih-field">
                    <label>State *</label>
                    <input className="pih-input" value={partnerForm.state} onChange={(e) => setPartnerForm({ ...partnerForm, state: e.target.value })} required />
                  </div>
                  <div className="pih-field">
                    <label>District *</label>
                    <input className="pih-input" value={partnerForm.district} onChange={(e) => setPartnerForm({ ...partnerForm, district: e.target.value })} required />
                  </div>
                </div>
                <div className="pih-field" style={{ marginTop: '12px' }}>
                  <label>Registered Office Address *</label>
                  <input className="pih-input" value={partnerForm.address} onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })} required />
                </div>
              </div>
              <div className="pih-modal-footer">
                <button type="button" className="pih-btn pih-btn-secondary" onClick={() => setShowRegisterModal(false)}>Cancel</button>
                <button type="submit" className="pih-btn pih-btn-primary">Register Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD LICENCE DOCUMENT */}
      {showDocModal && (
        <div className="pih-overlay">
          <div className="pih-modal" style={{ maxWidth: '540px' }}>
            <div className="pih-modal-header">
              <h3 style={{ margin: 0 }}>Upload Regulatory Licence Document</h3>
              <button onClick={() => setShowDocModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUploadLicence}>
              <div className="pih-modal-body">
                <div className="pih-form-grid">
                  <div className="pih-field">
                    <label>Document Type *</label>
                    <select className="pih-select" value={docForm.doc_type} onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })}>
                      {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="pih-field">
                    <label>Licence / Registration Number *</label>
                    <input className="pih-input" placeholder="e.g. FCO/KAR/2025/0912" value={docForm.doc_number} onChange={(e) => setDocForm({ ...docForm, doc_number: e.target.value })} required />
                    {fieldErrors.doc_number && <span className="pih-field-error">{fieldErrors.doc_number}</span>}
                  </div>
                  <div className="pih-field">
                    <label>Issued On *</label>
                    <input type="date" className="pih-input" value={docForm.issued_on} onChange={(e) => setDocForm({ ...docForm, issued_on: e.target.value })} required />
                  </div>
                  <div className="pih-field">
                    <label>Expires On (Must be future date) *</label>
                    <input type="date" className="pih-input" value={docForm.expires_on} onChange={(e) => setDocForm({ ...docForm, expires_on: e.target.value })} required />
                    {fieldErrors.expires_on && <span className="pih-field-error">{fieldErrors.expires_on}</span>}
                  </div>
                </div>
                <div className="pih-field" style={{ marginTop: '12px' }}>
                  <label>Certificate File URL / PDF Reference *</label>
                  <input className="pih-input" value={docForm.file_url} onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })} required />
                </div>
              </div>
              <div className="pih-modal-footer">
                <button type="button" className="pih-btn pih-btn-secondary" onClick={() => setShowDocModal(false)}>Cancel</button>
                <button type="submit" className="pih-btn pih-btn-primary">Upload for SME Verification</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: 7-STEP ADD PRODUCT WIZARD */}
      {showWizardModal && (
        <div className="pih-overlay">
          <div className="pih-modal">
            <div className="pih-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>New AgriInput Product Wizard</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Partner: {partnerDetail?.brand_name}</span>
              </div>
              <button onClick={() => setShowWizardModal(false)}><X size={18} /></button>
            </div>
            <div className="pih-modal-body">
              <div className="pih-stepper">
                {WIZARD_STEPS.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setWizardStep(idx)}
                    className={`pih-step-pill ${wizardStep === idx ? 'active' : idx < wizardStep ? 'done' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* STEP 0: BASIC */}
              {wizardStep === 0 && (
                <div className="pih-form-grid">
                  <div className="pih-field">
                    <label>Product Name *</label>
                    <input className="pih-input" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="e.g. IFFCO Nano DAP Liquid" />
                  </div>
                  <div className="pih-field">
                    <label>Brand Name *</label>
                    <input className="pih-input" value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} />
                  </div>
                  <div className="pih-field">
                    <label>Product Type *</label>
                    <select className="pih-select" value={productForm.product_type} onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value })}>
                      {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="pih-field">
                    <label>Sub-type</label>
                    <input className="pih-input" value={productForm.sub_type} onChange={(e) => setProductForm({ ...productForm, sub_type: e.target.value })} />
                  </div>
                  <div className="pih-field">
                    <label>Formulation</label>
                    <input className="pih-input" value={productForm.formulation} onChange={(e) => setProductForm({ ...productForm, formulation: e.target.value })} placeholder="SL / EC / WP / Granular / Liquid" />
                  </div>
                  <div className="pih-field">
                    <label style={{ marginTop: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" checked={productForm.is_organic} onChange={(e) => setProductForm({ ...productForm, is_organic: e.target.checked })} />
                      Certified Organic Input (NPOP / OMRI)
                    </label>
                  </div>
                  <div className="pih-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Product Description & Mode of Action</label>
                    <textarea className="pih-textarea" rows={3} value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} />
                  </div>
                </div>
              )}

              {/* STEP 1: COMPOSITION */}
              {wizardStep === 1 && (
                <div>
                  <p style={{ fontSize: '12px', color: '#475569', marginTop: 0 }}>
                    Every nutrient line maps to a Crop Health nutrient code (`ch_nutrient`). Total `% w/w` cannot exceed 100%. Organic products cannot list synthetic active ingredients.
                  </p>
                  {productForm.composition.map((comp, idx) => (
                    <div key={idx} className="pih-form-grid" style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div className="pih-field">
                        <label>Component Name *</label>
                        <input
                          className="pih-input"
                          value={comp.component_name}
                          onChange={(e) => {
                            const next = [...productForm.composition];
                            next[idx].component_name = e.target.value;
                            setProductForm({ ...productForm, composition: next });
                          }}
                        />
                      </div>
                      <div className="pih-field">
                        <label>Nutrient Code (`ch_nutrient`)</label>
                        <select
                          className="pih-select"
                          value={comp.nutrient_code || ''}
                          onChange={(e) => {
                            const next = [...productForm.composition];
                            next[idx].nutrient_code = e.target.value || null;
                            setProductForm({ ...productForm, composition: next });
                          }}
                        >
                          <option value="">None (Active Ingredient)</option>
                          {nutrients.map((n) => (
                            <option key={n.code} value={n.code}>{n.code} — {n.name} ({n.category})</option>
                          ))}
                        </select>
                      </div>
                      <div className="pih-field">
                        <label>Concentration Value *</label>
                        <input
                          type="number"
                          step="0.01"
                          className="pih-input"
                          value={comp.value}
                          onChange={(e) => {
                            const next = [...productForm.composition];
                            next[idx].value = e.target.value;
                            setProductForm({ ...productForm, composition: next });
                          }}
                        />
                      </div>
                      <div className="pih-field">
                        <label>Unit *</label>
                        <select
                          className="pih-select"
                          value={comp.unit}
                          onChange={(e) => {
                            const next = [...productForm.composition];
                            next[idx].unit = e.target.value;
                            setProductForm({ ...productForm, composition: next });
                          }}
                        >
                          <option value="% w/w">% w/w</option>
                          <option value="% w/v">% w/v</option>
                          <option value="g/L">g/L</option>
                          <option value="CFU/g">CFU/g</option>
                          <option value="ppm">ppm</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="pih-btn pih-btn-secondary pih-btn-sm"
                    onClick={() =>
                      setProductForm({
                        ...productForm,
                        composition: [...productForm.composition, { component_name: '', nutrient_code: 'N', value: 1.0, unit: '% w/w' }]
                      })
                    }
                  >
                    <Plus size={13} /> Add Composition Line
                  </button>
                </div>
              )}

              {/* STEP 2: SKUS & PRICE */}
              {wizardStep === 2 && (
                <div>
                  {productForm.skus.map((sk, idx) => (
                    <div key={idx} className="pih-form-grid" style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div className="pih-field">
                        <label>Pack Size *</label>
                        <input
                          type="number"
                          className="pih-input"
                          value={sk.pack_size}
                          onChange={(e) => {
                            const next = [...productForm.skus];
                            next[idx].pack_size = e.target.value;
                            setProductForm({ ...productForm, skus: next });
                          }}
                        />
                      </div>
                      <div className="pih-field">
                        <label>Pack Unit *</label>
                        <select
                          className="pih-select"
                          value={sk.pack_unit}
                          onChange={(e) => {
                            const next = [...productForm.skus];
                            next[idx].pack_unit = e.target.value;
                            setProductForm({ ...productForm, skus: next });
                          }}
                        >
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="packet">packet</option>
                          <option value="bag">bag</option>
                        </select>
                      </div>
                      <div className="pih-field">
                        <label>MRP (₹) *</label>
                        <input
                          type="number"
                          className="pih-input"
                          value={sk.mrp}
                          onChange={(e) => {
                            const next = [...productForm.skus];
                            next[idx].mrp = e.target.value;
                            setProductForm({ ...productForm, skus: next });
                          }}
                        />
                      </div>
                      <div className="pih-field">
                        <label>Selling Price (₹, ≤ MRP) *</label>
                        <input
                          type="number"
                          className="pih-input"
                          value={sk.selling_price}
                          onChange={(e) => {
                            const next = [...productForm.skus];
                            next[idx].selling_price = e.target.value;
                            setProductForm({ ...productForm, skus: next });
                          }}
                        />
                      </div>
                      <div className="pih-field">
                        <label>Stock Quantity *</label>
                        <input
                          type="number"
                          className="pih-input"
                          value={sk.stock_qty}
                          onChange={(e) => {
                            const next = [...productForm.skus];
                            next[idx].stock_qty = e.target.value;
                            setProductForm({ ...productForm, skus: next });
                          }}
                        />
                      </div>
                      <div className="pih-field">
                        <label>Batch No.</label>
                        <input
                          className="pih-input"
                          value={sk.batch_no}
                          onChange={(e) => {
                            const next = [...productForm.skus];
                            next[idx].batch_no = e.target.value;
                            setProductForm({ ...productForm, skus: next });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 3: CROP SUITABILITY */}
              {wizardStep === 3 && (
                <div>
                  {productForm.suitability.map((cs, idx) => (
                    <div key={idx} className="pih-form-grid" style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div className="pih-field">
                        <label>Crop (`vivas_crops`) *</label>
                        <select
                          className="pih-select"
                          value={cs.crop_id || crops[0]?.id || ''}
                          onChange={(e) => {
                            const next = [...productForm.suitability];
                            next[idx].crop_id = e.target.value;
                            setProductForm({ ...productForm, suitability: next });
                          }}
                        >
                          {crops.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                      </div>
                      <div className="pih-field">
                        <label>Crop Stage</label>
                        <input
                          className="pih-input"
                          value={cs.crop_stage}
                          onChange={(e) => {
                            const next = [...productForm.suitability];
                            next[idx].crop_stage = e.target.value;
                            setProductForm({ ...productForm, suitability: next });
                          }}
                        />
                      </div>
                      <div className="pih-field">
                        <label>Recommended Dose *</label>
                        <input
                          type="number"
                          className="pih-input"
                          value={cs.dose_value}
                          onChange={(e) => {
                            const next = [...productForm.suitability];
                            next[idx].dose_value = e.target.value;
                            setProductForm({ ...productForm, suitability: next });
                          }}
                        />
                      </div>
                      <div className="pih-field">
                        <label>Dose Unit & Basis</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            className="pih-input"
                            style={{ width: '80px' }}
                            value={cs.dose_unit}
                            onChange={(e) => {
                              const next = [...productForm.suitability];
                              next[idx].dose_unit = e.target.value;
                              setProductForm({ ...productForm, suitability: next });
                            }}
                          />
                          <select
                            className="pih-select"
                            value={cs.dose_basis}
                            onChange={(e) => {
                              const next = [...productForm.suitability];
                              next[idx].dose_basis = e.target.value;
                              setProductForm({ ...productForm, suitability: next });
                            }}
                          >
                            <option value="per acre">per acre</option>
                            <option value="per litre">per litre</option>
                            <option value="per kg seed">per kg seed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 4: PROBLEM CLAIMS */}
              {wizardStep === 4 && (
                <div>
                  <p style={{ fontSize: '12px', color: '#475569', marginTop: 0 }}>
                    Link product efficacy claims to `ch_problem` entries from the Crop Health library. Claims are shown to farmers only after a Vivas SME marks them Verified.
                  </p>
                  {productForm.claims.map((cl, idx) => (
                    <div key={idx} className="pih-form-grid" style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div className="pih-field">
                        <label>Target Field Problem (`ch_problem`) *</label>
                        <select
                          className="pih-select"
                          value={cl.problem_id || problems[0]?.id || ''}
                          onChange={(e) => {
                            const next = [...productForm.claims];
                            next[idx].problem_id = e.target.value;
                            setProductForm({ ...productForm, claims: next });
                          }}
                        >
                          {problems.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.problem_type}] {p.code} — {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="pih-field">
                        <label>Claim Type *</label>
                        <select
                          className="pih-select"
                          value={cl.claim_type}
                          onChange={(e) => {
                            const next = [...productForm.claims];
                            next[idx].claim_type = e.target.value;
                            setProductForm({ ...productForm, claims: next });
                          }}
                        >
                          <option value="correct_deficiency">Correct Deficiency</option>
                          <option value="control">Control</option>
                          <option value="cure">Cure</option>
                          <option value="prevent">Prevent</option>
                          <option value="yield_boost">Yield Boost</option>
                        </select>
                      </div>
                      <div className="pih-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Trial / Agronomic Evidence Note *</label>
                        <input
                          className="pih-input"
                          value={cl.evidence_note}
                          onChange={(e) => {
                            const next = [...productForm.claims];
                            next[idx].evidence_note = e.target.value;
                            setProductForm({ ...productForm, claims: next });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STEP 5: MEDIA & LABEL */}
              {wizardStep === 5 && (
                <div className="pih-form-grid">
                  <div className="pih-field">
                    <label>Primary Product Image URL</label>
                    <input
                      className="pih-input"
                      value={productForm.media[0]?.url || ''}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          media: [{ media_type: 'image', url: e.target.value, caption: 'Primary Pack Image' }]
                        })
                      }
                    />
                  </div>
                  <div className="pih-field">
                    <label>Approved Label PDF URL</label>
                    <input
                      className="pih-input"
                      value={productForm.label_pdf_url}
                      onChange={(e) => setProductForm({ ...productForm, label_pdf_url: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* STEP 6: COMPLIANCE & SUBMIT */}
              {wizardStep === 6 && (
                <div>
                  <div className="pih-form-grid">
                    <div className="pih-field">
                      <label>FCO / CIB&RC / Seed Registration No. *</label>
                      <input className="pih-input" value={productForm.registration_no} onChange={(e) => setProductForm({ ...productForm, registration_no: e.target.value })} />
                    </div>
                    <div className="pih-field">
                      <label>HSN Code (4, 6, or 8 digits) *</label>
                      <input className="pih-input" value={productForm.hsn_code} onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })} />
                    </div>
                    <div className="pih-field">
                      <label>GST % *</label>
                      <select className="pih-select" value={productForm.gst_pct} onChange={(e) => setProductForm({ ...productForm, gst_pct: Number(e.target.value) })}>
                        {[0, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
                      </select>
                    </div>
                    <div className="pih-field">
                      <label>Pre-Harvest Interval (PHI Days) *</label>
                      <input type="number" className="pih-input" value={productForm.phi_days} onChange={(e) => setProductForm({ ...productForm, phi_days: e.target.value })} />
                    </div>
                    <div className="pih-field">
                      <label>Re-entry Interval (Hours)</label>
                      <input type="number" className="pih-input" value={productForm.reentry_hours} onChange={(e) => setProductForm({ ...productForm, reentry_hours: e.target.value })} />
                    </div>
                    <div className="pih-field">
                      <label>Shelf Life (Months)</label>
                      <input type="number" className="pih-input" value={productForm.shelf_life_months} onChange={(e) => setProductForm({ ...productForm, shelf_life_months: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pih-modal-footer">
              <div>
                {wizardStep > 0 && (
                  <button type="button" className="pih-btn pih-btn-secondary" onClick={() => setWizardStep(wizardStep - 1)}>
                    Previous Step
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <button type="button" className="pih-btn pih-btn-primary" onClick={() => setWizardStep(wizardStep + 1)}>
                    Next Step
                  </button>
                ) : (
                  <>
                    <button type="button" className="pih-btn pih-btn-secondary" onClick={() => handleCreateProduct(false)}>
                      Save as Draft
                    </button>
                    <button type="button" className="pih-btn pih-btn-primary" onClick={() => handleCreateProduct(true)}>
                      Save & Submit for SME Approval
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK CSV IMPORT */}
      {showImportModal && (
        <div className="pih-overlay">
          <div className="pih-modal" style={{ maxWidth: '720px' }}>
            <div className="pih-modal-header">
              <h3 style={{ margin: 0 }}>Bulk Catalogue CSV Upload</h3>
              <button onClick={() => setShowImportModal(false)}><X size={18} /></button>
            </div>
            <div className="pih-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  Upload or paste CSV rows matching the Partner Hub bulk template. Per-row errors are logged in `pih_import_errors`.
                </span>
                <a
                  href="http://localhost:5001/api/pih/import/template"
                  target="_blank"
                  rel="noreferrer"
                  className="pih-btn pih-btn-secondary pih-btn-sm"
                >
                  <Download size={14} /> Download CSV Template
                </a>
              </div>

              <textarea
                className="pih-textarea"
                style={{ width: '100%', fontFamily: 'var(--pih-mono)', fontSize: '12px' }}
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />

              {importResult && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                    Batch Status: {importResult.batch?.status?.toUpperCase()} — OK Rows: {importResult.batch?.ok_rows} · Error Rows: {importResult.batch?.error_rows}
                  </div>
                  {(importResult.errors || []).length > 0 && (
                    <table className="pih-table">
                      <thead>
                        <tr>
                          <th>Row #</th>
                          <th>Field</th>
                          <th>Error Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((er) => (
                          <tr key={er.id}>
                            <td>Row {er.row_no}</td>
                            <td><code>{er.field}</code></td>
                            <td style={{ color: '#dc2626' }}>{er.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
            <div className="pih-modal-footer">
              <button className="pih-btn pih-btn-secondary" onClick={() => setShowImportModal(false)}>Close</button>
              <button className="pih-btn pih-btn-primary" onClick={handleRunBulkImport}>
                <Upload size={14} /> Validate & Import Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: PRODUCT 360 DETAIL */}
      {drawerProduct && (
        <div className="pih-drawer-overlay" onClick={() => setDrawerProduct(null)}>
          <div className="pih-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="pih-modal-header">
              <div>
                <span className={`pih-chip pih-chip-${drawerProduct.status}`}>{drawerProduct.status}</span>
                <h3 style={{ margin: '6px 0 0 0' }}>{drawerProduct.name}</h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {drawerProduct.product_code} · {drawerProduct.brand} · Reg: {drawerProduct.registration_no || 'N/A'}
                </div>
              </div>
              <button onClick={() => setDrawerProduct(null)}><X size={18} /></button>
            </div>
            <div className="pih-modal-body">
              <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>{drawerProduct.description}</p>

              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#475569', marginTop: '18px' }}>Composition</h4>
              <table className="pih-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Nutrient</th>
                    <th>Concentration</th>
                  </tr>
                </thead>
                <tbody>
                  {(drawerProduct.composition || []).map((c) => (
                    <tr key={c.id}>
                      <td>{c.component_name}</td>
                      <td>{c.nutrient_code ? `${c.nutrient_code} (${c.nutrient_name})` : c.active_ingredient || '—'}</td>
                      <td>{c.value} {c.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#475569', marginTop: '18px' }}>SKUs & Pricing</h4>
              <table className="pih-table">
                <thead>
                  <tr>
                    <th>SKU Code</th>
                    <th>Pack</th>
                    <th>MRP</th>
                    <th>Selling Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {(drawerProduct.skus || []).map((s) => (
                    <tr key={s.id}>
                      <td><code>{s.sku_code}</code></td>
                      <td>{s.pack_size} {s.pack_unit}</td>
                      <td>₹{s.mrp}</td>
                      <td><strong>₹{s.selling_price}</strong></td>
                      <td>{s.stock_qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#475569', marginTop: '18px' }}>Crop Suitability Matrix</h4>
              <table className="pih-table">
                <thead>
                  <tr>
                    <th>Crop</th>
                    <th>Stage</th>
                    <th>Dose</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {(drawerProduct.suitability || []).map((s) => (
                    <tr key={s.id}>
                      <td>{s.crop_icon} {s.crop_name}</td>
                      <td>{s.crop_stage}</td>
                      <td>{s.dose_value} {s.dose_unit} {s.dose_basis}</td>
                      <td>{s.application_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', color: '#475569', marginTop: '18px' }}>Problem-Solving Claims (`ch_problem`)</h4>
              <table className="pih-table">
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th>Claim Type</th>
                    <th>SME Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(drawerProduct.claims || []).map((cl) => (
                    <tr key={cl.id}>
                      <td>[{cl.problem_type}] {cl.problem_code} — {cl.problem_name}</td>
                      <td>{cl.claim_type}</td>
                      <td><span className={`pih-chip pih-chip-${cl.sme_status}`}>{cl.sme_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
