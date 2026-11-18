import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, CheckCircle2, AlertTriangle,
  Package, Award, Activity,
  Search, RefreshCw, Eye, Check, X, Sparkles
} from 'lucide-react';
import { pihRequest } from './pihApi';

export default function PartnerAdmin({ activeRole = 'vivas_sme' }) {
  const [activeTab, setActiveTab] = useState('partners');
  const [partners, setPartners] = useState([]);
  const [claims, setClaims] = useState([]);
  const [products, setProducts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedPartnerDetail, setSelectedPartnerDetail] = useState(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Review modal state
  const [reviewModal, setReviewModal] = useState(null); // { id, title, status, reason }
  const [commissionForm, setCommissionForm] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, prodRes, auditRes] = await Promise.all([
        pihRequest('/partners', { role: activeRole }),
        pihRequest('/claims', { role: activeRole }),
        pihRequest('/products?limit=100', { role: activeRole }),
        pihRequest('/audit-log?limit=100', { role: activeRole })
      ]);
      const pList = pRes.data || [];
      setPartners(pList);
      setClaims(cRes.data || []);
      setProducts(prodRes.data || []);
      setAuditLogs(auditRes.data || []);

      const commMap = {};
      pList.forEach(p => {
        commMap[p.id] = p.commission_pct ?? 5.0;
      });
      setCommissionForm(commMap);

      if (pList.length > 0 && !selectedPartnerDetail) {
        const det = await pihRequest(`/partners/${pList[0].id}`, { role: activeRole });
        setSelectedPartnerDetail(det.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load admin console data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeRole, selectedPartnerDetail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const inspectPartner = async (partnerId) => {
    try {
      const det = await pihRequest(`/partners/${partnerId}`, { role: activeRole });
      setSelectedPartnerDetail(det.data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const inspectProduct = async (productId) => {
    try {
      const det = await pihRequest(`/products/${productId}`, { role: activeRole });
      setSelectedProductDetail(det.data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePartnerReview = async (partnerId, status, reason = '') => {
    try {
      await pihRequest(`/partners/${partnerId}/review`, {
        method: 'POST',
        role: activeRole,
        body: { status, reason: reason || undefined }
      });
      showToast(`Partner status updated to ${status}`);
      setReviewModal(null);
      await loadData();
      await inspectPartner(partnerId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDocumentReview = async (docId, review_status, remarks = '') => {
    try {
      await pihRequest(`/documents/${docId}/review`, {
        method: 'PUT',
        role: activeRole,
        body: { review_status, remarks }
      });
      showToast(`Document marked as ${review_status}`);
      if (selectedPartnerDetail?.id) {
        await inspectPartner(selectedPartnerDetail.id);
      }
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleClaimReview = async (claimId, sme_status, sme_remarks = '') => {
    try {
      await pihRequest(`/claims/${claimId}/review`, {
        method: 'PUT',
        role: activeRole,
        body: { sme_status, sme_remarks }
      });
      showToast(`Claim marked as ${sme_status}`);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleProductReview = async (productId, action, remarks = '') => {
    try {
      await pihRequest(`/products/${productId}/review`, {
        method: 'POST',
        role: activeRole,
        body: { action, remarks }
      });
      showToast(`Product ${action === 'live' ? 'published Live' : action === 'approved' ? 'approved' : 'returned to draft'}`);
      await loadData();
      if (selectedProductDetail?.id === productId) {
        await inspectProduct(productId);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateCommission = async (partnerId) => {
    try {
      const pct = Number(commissionForm[partnerId]);
      await pihRequest(`/partners/${partnerId}`, {
        method: 'PUT',
        role: 'vivas_admin',
        body: { commission_pct: pct }
      });
      showToast(`Updated commission to ${pct}%`);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const pendingPartners = partners.filter(p => ['submitted', 'under_review', 'draft'].includes(p.status)).length;
  const pendingClaims = claims.filter(c => c.sme_status === 'pending').length;
  const pendingProducts = products.filter(p => ['submitted', 'approved'].includes(p.status)).length;
  const liveProducts = products.filter(p => p.status === 'live').length;

  return (
    <div className="pih-page">
      {/* Header */}
      <div className="pih-header">
        <div className="pih-header-title">
          <h1>
            <ShieldCheck size={24} color="#1b5e20" />
            Vivas SME & Partner Admin Console
          </h1>
          <p>
            Verify manufacturer KYC & India regulatory licences (FCO / CIB&RC / Seed Act), validate agronomic problem claims, approve products to Live, and inspect immutable audit logs.
          </p>
        </div>
        <div className="pih-header-actions">
          <span className="pih-badge pih-badge-verified">
            Role: {activeRole.toUpperCase()}
          </span>
          <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} /> Refresh Queue
          </button>
        </div>
      </div>

      {toast && (
        <div className={`pih-alert ${toast.type === 'error' ? 'pih-alert-danger' : 'pih-alert-info'}`}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Stat Strip */}
      <div className="pih-stat-strip">
        <div className="pih-stat-card orange">
          <div className="pih-stat-label">
            <span>Partner KYC Queue</span>
            <ShieldCheck size={16} color="#e65100" />
          </div>
          <div className="pih-stat-value">{pendingPartners}</div>
          <div className="pih-stat-sub">of {partners.length} total registered partners</div>
        </div>
        <div className="pih-stat-card blue">
          <div className="pih-stat-label">
            <span>Pending Claim Reviews</span>
            <Award size={16} color="#0277bd" />
          </div>
          <div className="pih-stat-value">{pendingClaims}</div>
          <div className="pih-stat-sub">of {claims.length} total problem claims</div>
        </div>
        <div className="pih-stat-card purple">
          <div className="pih-stat-label">
            <span>Product Approval Queue</span>
            <Package size={16} color="#6a1b9a" />
          </div>
          <div className="pih-stat-value">{pendingProducts}</div>
          <div className="pih-stat-sub">{liveProducts} products currently Live</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">
            <span>Audit Trail Events</span>
            <Activity size={16} color="#2e7d32" />
          </div>
          <div className="pih-stat-value">{auditLogs.length}</div>
          <div className="pih-stat-sub">Immutable parameterised change log</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="pih-tabs">
        <button className={`pih-tab ${activeTab === 'partners' ? 'active' : ''}`} onClick={() => setActiveTab('partners')}>
          1. Partner Verification ({partners.length})
        </button>
        <button className={`pih-tab ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          2. Document & Licence Review
        </button>
        <button className={`pih-tab ${activeTab === 'claims' ? 'active' : ''}`} onClick={() => setActiveTab('claims')}>
          3. Agronomic Claim Review ({claims.length})
        </button>
        <button className={`pih-tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
          4. Product Approval ({products.length})
        </button>
        <button className={`pih-tab ${activeTab === 'rating_ai' ? 'active' : ''}`} onClick={() => setActiveTab('rating_ai')}>
          5. AI Inference & Rating Rules
        </button>
        <button className={`pih-tab ${activeTab === 'commission' ? 'active' : ''}`} onClick={() => setActiveTab('commission')}>
          6. Commission & Settlements
        </button>
        <button className={`pih-tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          7. Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: PARTNER VERIFICATION */}
      {activeTab === 'partners' && (
        <div className="pih-card">
          <div className="pih-filter-bar">
            <div className="pih-search-box">
              <Search size={16} color="#64748b" />
              <input
                placeholder="Search partner legal name, brand, GSTIN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="pih-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="pih-table-wrap">
            <table className="pih-table">
              <thead>
                <tr>
                  <th>Brand / Legal Name</th>
                  <th>Partner Type</th>
                  <th>GSTIN & PAN</th>
                  <th>Location</th>
                  <th>Licences</th>
                  <th>Products</th>
                  <th>Status</th>
                  <th>SME / Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners
                  .filter(p => (!statusFilter || p.status === statusFilter) &&
                    (!searchQuery || `${p.brand_name} ${p.legal_name} ${p.gstin} ${p.partner_code}`.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.brand_name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{p.legal_name}</div>
                        <div className="pih-mono" style={{ fontSize: '0.71rem', color: '#64748b' }}>{p.partner_code}</div>
                      </td>
                      <td>{p.partner_type}</td>
                      <td>
                        <div className="pih-mono" style={{ fontSize: '0.78rem' }}>{p.gstin}</div>
                        <div className="pih-mono" style={{ fontSize: '0.72rem', color: '#64748b' }}>PAN: {p.pan || '—'}</div>
                      </td>
                      <td>{p.district}, {p.state}</td>
                      <td>
                        <span className="pih-badge pih-badge-approved">
                          {p.approved_document_count || 0}/{p.document_count || 0} Approved
                        </span>
                      </td>
                      <td>{p.live_product_count || 0}/{p.product_count || 0} Live</td>
                      <td>
                        <span className={`pih-badge pih-badge-${p.status}`}>{p.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="pih-btn pih-btn-secondary pih-btn-sm"
                            onClick={() => {
                              inspectPartner(p.id);
                              setActiveTab('documents');
                            }}
                          >
                            <Eye size={13} /> Docs
                          </button>
                          {p.status !== 'approved' && (
                            <button
                              className="pih-btn pih-btn-primary pih-btn-sm"
                              onClick={() => handlePartnerReview(p.id, 'approved')}
                            >
                              <Check size={13} /> Approve
                            </button>
                          )}
                          {p.status !== 'rejected' && (
                            <button
                              className="pih-btn pih-btn-danger pih-btn-sm"
                              onClick={() => setReviewModal({
                                id: p.id,
                                title: `Reject or Suspend ${p.brand_name}`,
                                status: 'rejected',
                                reason: ''
                              })}
                            >
                              <X size={13} /> Reject / Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENT & LICENCE REVIEW */}
      {activeTab === 'documents' && (
        <div className="pih-grid-2">
          <div className="pih-card">
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Select Partner to Inspect Licences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {partners.map(p => (
                <div
                  key={p.id}
                  onClick={() => inspectPartner(p.id)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: selectedPartnerDetail?.id === p.id ? '2px solid #2e7d32' : '1px solid #e2e8f0',
                    background: selectedPartnerDetail?.id === p.id ? '#f0fdf4' : '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.brand_name}</div>
                    <div className="pih-mono" style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.gstin}</div>
                  </div>
                  <span className={`pih-badge pih-badge-${p.status}`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pih-card">
            {selectedPartnerDetail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{selectedPartnerDetail.brand_name} — Regulatory Licences</h3>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      FCO (Fertilisers/Nano), CIB&RC (Pesticides), Seed Act, Organic, GST
                    </div>
                  </div>
                  <span className={`pih-badge pih-badge-${selectedPartnerDetail.status}`}>
                    Partner: {selectedPartnerDetail.status}
                  </span>
                </div>

                {(selectedPartnerDetail.documents || []).length === 0 ? (
                  <div className="pih-empty">No compliance documents uploaded yet for this partner.</div>
                ) : (
                  <div className="pih-table-wrap">
                    <table className="pih-table">
                      <thead>
                        <tr>
                          <th>Doc Type</th>
                          <th>Licence / Reg No.</th>
                          <th>Issued On</th>
                          <th>Expires On</th>
                          <th>Review Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPartnerDetail.documents.map(doc => (
                          <tr key={doc.id}>
                            <td><strong>{doc.doc_type}</strong></td>
                            <td className="pih-mono">{doc.doc_number}</td>
                            <td>{doc.issued_on ? String(doc.issued_on).slice(0, 10) : '—'}</td>
                            <td>{doc.expires_on ? String(doc.expires_on).slice(0, 10) : 'Permanent'}</td>
                            <td>
                              <span className={`pih-badge pih-badge-${doc.review_status}`}>{doc.review_status}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {doc.review_status !== 'approved' && (
                                  <button
                                    className="pih-btn pih-btn-primary pih-btn-sm"
                                    onClick={() => handleDocumentReview(doc.id, 'approved', 'Verified against regulatory registry by Vivas SME')}
                                  >
                                    <Check size={13} /> Approve
                                  </button>
                                )}
                                {doc.review_status !== 'rejected' && (
                                  <button
                                    className="pih-btn pih-btn-danger pih-btn-sm"
                                    onClick={() => handleDocumentReview(doc.id, 'rejected', 'Invalid or expired licence')}
                                  >
                                    <X size={13} /> Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="pih-empty">Select a partner on the left to review compliance documents.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AGRONOMIC CLAIM REVIEW */}
      {activeTab === 'claims' && (
        <div className="pih-card">
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Agronomic Problem Claims (`pih_product_claims` → `ch_problem`)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Manufacturer claims must be verified by a Vivas Agronomy SME before they are eligible for Farmer Crop Health AI recommendations.
            </p>
          </div>
          <div className="pih-table-wrap">
            <table className="pih-table">
              <thead>
                <tr>
                  <th>Partner & Product</th>
                  <th>Target Problem (`ch_problem`)</th>
                  <th>Target Crop</th>
                  <th>Claim Type</th>
                  <th>Evidence Note</th>
                  <th>SME Status</th>
                  <th>SME Decision</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{c.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.partner_brand_name} ({c.product_type})</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.problem_name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {c.problem_type} • <span className="pih-mono">{c.problem_code}</span>
                      </div>
                    </td>
                    <td>{c.crop_name || 'All Suitable Crops'}</td>
                    <td><span className="pih-mono">{c.claim_type}</span></td>
                    <td style={{ fontSize: '0.78rem', color: '#475569' }}>{c.evidence_note || '—'}</td>
                    <td>
                      <span className={`pih-badge pih-badge-${c.sme_status}`}>{c.sme_status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.sme_status !== 'verified' && (
                          <button
                            className="pih-btn pih-btn-primary pih-btn-sm"
                            onClick={() => handleClaimReview(c.id, 'verified', 'Agronomically sound dose and target problem verified by Vivas SME')}
                          >
                            <Check size={13} /> Verify Claim
                          </button>
                        )}
                        {c.sme_status !== 'rejected' && (
                          <button
                            className="pih-btn pih-btn-danger pih-btn-sm"
                            onClick={() => handleClaimReview(c.id, 'rejected', 'Unsupported dose or non-registered target')}
                          >
                            <X size={13} /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {claims.length === 0 && (
                  <tr>
                    <td colSpan={7} className="pih-empty">No agronomic claims submitted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCT APPROVAL */}
      {activeTab === 'products' && (
        <div className="pih-card">
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Catalogue Approval & Compliance Gate</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Products cannot be approved or published Live unless the partner holds an unexpired SME-approved licence matching the product category (FCO / CIB&RC / Seed Act / Organic).
            </p>
          </div>
          <div className="pih-table-wrap">
            <table className="pih-table">
              <thead>
                <tr>
                  <th>Product Name & Code</th>
                  <th>Partner</th>
                  <th>Type & Formulation</th>
                  <th>Regulatory Reg No.</th>
                  <th>HSN & GST</th>
                  <th>SKUs</th>
                  <th>Status</th>
                  <th>Publish / Review</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => (
                  <tr key={prod.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{prod.name}</div>
                      <div className="pih-mono" style={{ fontSize: '0.74rem', color: '#64748b' }}>{prod.product_code}</div>
                    </td>
                    <td>{prod.partner_brand_name}</td>
                    <td>
                      <div>{prod.product_type}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {prod.formulation || prod.sub_type || 'Standard'} {prod.is_organic ? '• ORGANIC' : ''}
                      </div>
                    </td>
                    <td className="pih-mono" style={{ fontSize: '0.76rem' }}>
                      {prod.registration_no || '—'}
                    </td>
                    <td>
                      <div className="pih-mono">{prod.hsn_code}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>GST {prod.gst_pct}%</div>
                    </td>
                    <td>
                      <div>{(prod.skus || []).length} SKUs</div>
                      {prod.skus?.[0]?.selling_price && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1b5e20' }}>
                          From ₹{Number(prod.skus[0].selling_price).toFixed(0)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`pih-badge pih-badge-${prod.status}`}>{prod.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          className="pih-btn pih-btn-secondary pih-btn-sm"
                          onClick={() => inspectProduct(prod.id)}
                        >
                          <Eye size={13} /> Inspect
                        </button>
                        {prod.status !== 'live' && (
                          <button
                            className="pih-btn pih-btn-primary pih-btn-sm"
                            onClick={() => handleProductReview(prod.id, 'live', 'Compliance & SKUs verified by Vivas SME')}
                          >
                            <Check size={13} /> Approve to Live
                          </button>
                        )}
                        {prod.status !== 'draft' && (
                          <button
                            className="pih-btn pih-btn-danger pih-btn-sm"
                            onClick={() => handleProductReview(prod.id, 'draft', 'Returned to draft by SME')}
                          >
                            Return to Draft
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AI INFERENCE & RATING RULES */}
      {activeTab === 'rating_ai' && (
        <div className="pih-grid-2">
          <div className="pih-card">
            <div className="pih-ai-card" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={18} color="#2e7d32" />
                <strong style={{ color: '#1b5e20' }}>Bayesian Field Performance Score (FPS) Weights</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155' }}>
                Governed by SRS §7: Shrinkage prior <code>m = 10</code> verified farm outcomes against category prior <code>C</code>. Minimum <code>n &gt;= 5</code> verified farms required before displaying a star rating.
              </p>
            </div>
            <div className="pih-table-wrap">
              <table className="pih-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Formula Term</th>
                    <th>Weight</th>
                    <th>Threshold / Rule</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Field Efficacy</strong></td>
                    <td className="pih-mono">E = resolved_weight / total</td>
                    <td><strong>45%</strong></td>
                    <td>Resolved = 1.0, Improved = 0.6, No Change = 0.1, Worsened = 0.0</td>
                  </tr>
                  <tr>
                    <td><strong>Speed vs Benchmark</strong></td>
                    <td className="pih-mono">S = clamp(1 - (d - b)/(2b))</td>
                    <td><strong>20%</strong></td>
                    <td>Days to recovery vs category benchmark</td>
                  </tr>
                  <tr>
                    <td><strong>Safety (No Phytotoxicity)</strong></td>
                    <td className="pih-mono">F = 1 - phytotoxicity_rate</td>
                    <td><strong>15%</strong></td>
                    <td>Penalises scorching, stunting, residue alerts</td>
                  </tr>
                  <tr>
                    <td><strong>Farmer Satisfaction</strong></td>
                    <td className="pih-mono">R = (avg_stars - 1) / 4</td>
                    <td><strong>15%</strong></td>
                    <td>Verified purchase & field application reviews</td>
                  </tr>
                  <tr>
                    <td><strong>Repeat Purchase Rate</strong></td>
                    <td className="pih-mono">P = repeat_buyers / buyers</td>
                    <td><strong>5%</strong></td>
                    <td>Unique farm re-orders across seasons</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="pih-card">
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>AI Governance & Privacy Rules</h3>
            <ul style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.7, paddingLeft: 18 }}>
              <li><strong>Auditability:</strong> Every AI call logs to <code>ch_ai_request</code> with prefix <code>pih_</code> and stores <code>model_name</code>, <code>model_version</code>, <code>sample_size</code>, and <code>source_case_ids</code>.</li>
              <li><strong>Privacy K-Anonymity:</strong> Partner Field Insights enforce district-level aggregation with a hard minimum of <strong>5 consenting farms</strong> (<code>pih_data_sharing_consents.revoked_at IS NULL</code>).</li>
              <li><strong>No Paid Ranking:</strong> Recommendation ranking is strictly <code>0.50 * FPS + 0.25 * Crop/Stage/Soil Fit + 0.15 * Cost/Acre Score + 0.10 * Stock Availability</code>. Commercial sponsorships cannot alter rank.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 6: COMMISSION & SETTLEMENTS */}
      {activeTab === 'commission' && (
        <div className="pih-card">
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Partner Platform Commission Configuration (`vivas_admin`)</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 16 }}>
            Configure platform commission percentage per partner for Phase 3 Store Checkout & Partner Settlements.
          </p>
          <div className="pih-table-wrap">
            <table className="pih-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>GSTIN</th>
                  <th>Status</th>
                  <th>Commission %</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.brand_name}</strong></td>
                    <td className="pih-mono">{p.gstin}</td>
                    <td><span className={`pih-badge pih-badge-${p.status}`}>{p.status}</span></td>
                    <td style={{ maxWidth: 140 }}>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="50"
                        className="pih-input"
                        value={commissionForm[p.id] ?? 5.0}
                        onChange={e => setCommissionForm({ ...commissionForm, [p.id]: e.target.value })}
                      />
                    </td>
                    <td>
                      <button
                        className="pih-btn pih-btn-primary pih-btn-sm"
                        onClick={() => handleUpdateCommission(p.id)}
                      >
                        Save Commission
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: IMMUTABLE AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="pih-card">
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Immutable Security & Compliance Audit Log (`pih_audit_log`)</h3>
          <div className="pih-table-wrap">
            <table className="pih-table">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity Table</th>
                  <th>Entity ID</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td className="pih-mono" style={{ fontSize: '0.75rem' }}>
                      {new Date(log.created_at).toISOString()}
                    </td>
                    <td>
                      <span className="pih-badge pih-badge-verified">
                        {log.actor_user_name || log.actor_partner_name || 'System'}
                      </span>
                    </td>
                    <td><strong>{log.action}</strong></td>
                    <td className="pih-mono">{log.entity}</td>
                    <td className="pih-mono" style={{ fontSize: '0.74rem' }}>{log.entity_id}</td>
                    <td className="pih-mono" style={{ fontSize: '0.74rem' }}>{log.ip || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Partner Reject/Suspend Modal */}
      {reviewModal && (
        <div className="pih-modal-backdrop" onClick={() => setReviewModal(null)}>
          <div className="pih-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="pih-modal-header">
              <h2>{reviewModal.title}</h2>
              <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={() => setReviewModal(null)}>
                <X size={15} />
              </button>
            </div>
            <div className="pih-modal-body">
              <div className="pih-form-group" style={{ marginBottom: 12 }}>
                <label>Target Status *</label>
                <select
                  className="pih-select"
                  value={reviewModal.status}
                  onChange={e => setReviewModal({ ...reviewModal, status: e.target.value })}
                >
                  <option value="rejected">Rejected</option>
                  <option value="suspended">Suspended (Auto-pauses all Live products)</option>
                  <option value="under_review">Under Review</option>
                </select>
              </div>
              <div className="pih-form-group">
                <label>Mandatory Reason *</label>
                <textarea
                  className="pih-textarea"
                  placeholder="Provide regulatory or compliance reason..."
                  value={reviewModal.reason}
                  onChange={e => setReviewModal({ ...reviewModal, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="pih-modal-footer">
              <button className="pih-btn pih-btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
              <button
                className="pih-btn pih-btn-danger"
                onClick={() => handlePartnerReview(reviewModal.id, reviewModal.status, reviewModal.reason)}
              >
                Confirm {reviewModal.status}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Drawer */}
      {selectedProductDetail && (
        <div className="pih-drawer-backdrop" onClick={() => setSelectedProductDetail(null)}>
          <div className="pih-drawer" onClick={e => e.stopPropagation()}>
            <div className="pih-modal-header">
              <div>
                <h2 style={{ margin: 0 }}>{selectedProductDetail.name}</h2>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {selectedProductDetail.partner_brand_name} • {selectedProductDetail.product_type} • <span className="pih-mono">{selectedProductDetail.product_code}</span>
                </div>
              </div>
              <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={() => setSelectedProductDetail(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="pih-modal-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <span className={`pih-badge pih-badge-${selectedProductDetail.status}`}>{selectedProductDetail.status}</span>
                <span className="pih-badge pih-badge-approved">HSN: {selectedProductDetail.hsn_code}</span>
                <span className="pih-badge pih-badge-approved">GST: {selectedProductDetail.gst_pct}%</span>
              </div>

              <h4>1. Composition (`pih_product_composition`)</h4>
              <div className="pih-table-wrap" style={{ marginBottom: 16 }}>
                <table className="pih-table">
                  <thead>
                    <tr>
                      <th>Component / Nutrient</th>
                      <th>Active Ingredient</th>
                      <th>Concentration</th>
                      <th>Nutrient Code (`ch_nutrient`)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedProductDetail.composition || []).map(c => (
                      <tr key={c.id}>
                        <td>{c.component_name}</td>
                        <td>{c.active_ingredient || '—'}</td>
                        <td>{c.value} {c.unit}</td>
                        <td className="pih-mono">{c.nutrient_code || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4>2. Pack SKUs (`pih_product_skus`)</h4>
              <div className="pih-table-wrap" style={{ marginBottom: 16 }}>
                <table className="pih-table">
                  <thead>
                    <tr>
                      <th>SKU Code</th>
                      <th>Pack Size</th>
                      <th>MRP</th>
                      <th>Selling Price</th>
                      <th>Stock</th>
                      <th>Batch / Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedProductDetail.skus || []).map(s => (
                      <tr key={s.id}>
                        <td className="pih-mono">{s.sku_code}</td>
                        <td>{s.pack_size} {s.pack_unit}</td>
                        <td>₹{Number(s.mrp).toFixed(2)}</td>
                        <td><strong>₹{Number(s.selling_price).toFixed(2)}</strong></td>
                        <td>{s.stock_qty}</td>
                        <td style={{ fontSize: '0.75rem' }}>
                          {s.batch_no || '—'} (Exp: {s.expiry_date ? String(s.expiry_date).slice(0, 10) : '—'})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h4>3. Problem Claims (`pih_product_claims`)</h4>
              <div className="pih-table-wrap">
                <table className="pih-table">
                  <thead>
                    <tr>
                      <th>Problem</th>
                      <th>Claim Type</th>
                      <th>Evidence Note</th>
                      <th>SME Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedProductDetail.claims || []).map(cl => (
                      <tr key={cl.id}>
                        <td>{cl.problem_name} ({cl.problem_type})</td>
                        <td>{cl.claim_type}</td>
                        <td>{cl.evidence_note || '—'}</td>
                        <td><span className={`pih-badge pih-badge-${cl.sme_status}`}>{cl.sme_status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="pih-modal-footer">
              {selectedProductDetail.status !== 'live' && (
                <button
                  className="pih-btn pih-btn-primary"
                  onClick={() => handleProductReview(selectedProductDetail.id, 'live', 'Verified and published Live by SME')}
                >
                  <Check size={15} /> Publish Product Live
                </button>
              )}
              <button className="pih-btn pih-btn-secondary" onClick={() => setSelectedProductDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
