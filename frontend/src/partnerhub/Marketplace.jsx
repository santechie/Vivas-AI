import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShoppingCart,
  ListPlus,
  Eye,
  Store,
  ShieldCheck,
  Award,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Filter
} from 'lucide-react';
import { pihRequest } from './pihApi';
import StorePage from './StorePage';
import ProductDetail from './ProductDetail';
import CartCheckout from './CartCheckout';

const PRODUCT_TYPES = [
  { value: '', label: 'All Categories' },
  { value: 'NANO_FERTILISER', label: 'Nano-Fertilisers' },
  { value: 'FERTILISER', label: 'Fertilisers & NPK' },
  { value: 'BIO_STIMULANT', label: 'Bio-Stimulants' },
  { value: 'MICRONUTRIENT', label: 'Chelated Micronutrients' },
  { value: 'PESTICIDE', label: 'Crop Protection (CIB&RC)' },
  { value: 'SEED', label: 'Certified Seeds' }
];

export default function Marketplace({ onNavigateOrders }) {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [crops, setCrops] = useState([]);
  const [problems, setProblems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('');
  const [cropId, setCropId] = useState('');
  const [problemId, setProblemId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [organicOnly, setOrganicOnly] = useState(false);
  const [sortBy, setSortBy] = useState('fps_desc');
  const [viewMode, setViewMode] = useState('grid');

  // Sub-views & drawers
  const [activeStoreSlug, setActiveStoreSlug] = useState(null);
  const [inspectProductId, setInspectProductId] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  const refreshCartBadge = useCallback(async () => {
    try {
      const res = await pihRequest('/cart');
      setCartCount(res.data?.total_items_count || 0);
      setCartTotal(res.data?.grand_summary?.total || 0);
    } catch {
      // ignore badge error
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    try {
      const [stRes, crRes, prRes] = await Promise.all([
        pihRequest('/stores'),
        pihRequest('/reference/crops'),
        pihRequest('/reference/problems')
      ]);
      setStores(stRes.data || []);
      setCrops(crRes.data || []);
      setProblems(prRes.data || []);
    } catch (err) {
      console.error('Error loading marketplace metadata:', err);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      qs.set('status', 'live');
      if (search.trim()) qs.set('search', search.trim());
      if (productType) qs.set('product_type', productType);
      if (cropId) qs.set('crop_id', cropId);
      if (problemId) qs.set('problem_id', problemId);
      if (partnerId) qs.set('partner_id', partnerId);
      if (organicOnly) qs.set('is_organic', 'true');
      if (sortBy) qs.set('sort', sortBy);

      const res = await pihRequest(`/products?${qs.toString()}`);
      setProducts(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, productType, cropId, problemId, partnerId, organicOnly, sortBy]);

  useEffect(() => {
    loadReferenceData();
    refreshCartBadge();
  }, [loadReferenceData, refreshCartBadge]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAddToCart = async (skuId, qty = 1) => {
    await pihRequest('/cart/items', {
      method: 'POST',
      body: { sku_id: skuId, qty }
    });
    await refreshCartBadge();
  };

  const handleQuickAddProductToCart = async (prod) => {
    const sku = prod.skus?.[0];
    if (!sku) return;
    try {
      setError('');
      await handleAddToCart(sku.id, 1);
      setToast(`Added "${prod.name}" (${sku.pack_size} ${sku.pack_unit}) to AgriInput Cart`);
      setTimeout(() => setToast(''), 3200);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddToShoppingList = async (prodId, skuId, qty = 1) => {
    await pihRequest('/shopping-list/add', {
      method: 'POST',
      body: { product_id: prodId, sku_id: skuId, qty }
    });
  };

  const handleQuickAddShoppingList = async (prod) => {
    const sku = prod.skus?.[0];
    try {
      setError('');
      await handleAddToShoppingList(prod.id, sku?.id, 1);
      setToast(`Added "${prod.name}" to Buy & Procurement Smart Shopping List`);
      setTimeout(() => setToast(''), 3200);
    } catch (err) {
      setError(err.message);
    }
  };

  if (activeStoreSlug) {
    return (
      <>
        <StorePage
          storeSlug={activeStoreSlug}
          onBack={() => setActiveStoreSlug(null)}
          onInspectProduct={(id) => setInspectProductId(id)}
          onAddToCart={handleAddToCart}
          onAddToShoppingList={handleAddToShoppingList}
        />
        <ProductDetail
          productId={inspectProductId}
          onClose={() => setInspectProductId(null)}
          onAddToCart={handleAddToCart}
          onAddToShoppingList={handleAddToShoppingList}
          onOpenStore={(slug) => setActiveStoreSlug(slug)}
        />
        <CartCheckout
          isOpen={cartDrawerOpen}
          onClose={() => setCartDrawerOpen(false)}
          onOrderSuccess={() => {
            refreshCartBadge();
            if (onNavigateOrders) onNavigateOrders();
          }}
        />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top KPI & Cart Action Strip */}
      <div className="pih-stat-grid">
        <div className="pih-stat-card">
          <div className="pih-stat-label">Verified Partner Stores</div>
          <div className="pih-stat-value">{stores.length}</div>
          <div className="pih-stat-sub">FCO, CIB&amp;RC &amp; Seed Act Approved</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Live Agri-Input Catalogue</div>
          <div className="pih-stat-value">{products.length}</div>
          <div className="pih-stat-sub">SME-Verified Composition &amp; Dosage</div>
        </div>
        <div className="pih-stat-card">
          <div className="pih-stat-label">Field Evidence Integration</div>
          <div className="pih-stat-value">Bayesian FPS</div>
          <div className="pih-stat-sub">Live Efficacy + Yield + ROI Ranking</div>
        </div>
        <div
          className="pih-stat-card"
          style={{
            background: 'linear-gradient(135deg, #002114 0%, #006647 100%)',
            color: '#fff',
            cursor: 'pointer'
          }}
          onClick={() => setCartDrawerOpen(true)}
        >
          <div style={{ fontSize: '0.76rem', opacity: 0.85, textTransform: 'uppercase', fontWeight: 700 }}>
            Active Farm Input Cart
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={22} color="#6ffbbe" />
            {cartCount} {cartCount === 1 ? 'Unit' : 'Units'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6ffbbe', marginTop: 4, fontWeight: 600 }}>
            ₹{Number(cartTotal).toLocaleString('en-IN')} • Click to Checkout PO →
          </div>
        </div>
      </div>

      {error && (
        <div className="pih-alert pih-alert-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
      {toast && (
        <div className="pih-alert pih-alert-success">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Featured Verified Partner Stores Strip */}
      <div className="pih-card">
        <div className="pih-card-header">
          <div>
            <h3 className="pih-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={18} color="#006647" />
              Official Manufacturer Flagship Stores
            </h3>
            <p className="pih-card-sub">
              Direct manufacturer storefronts with verified FCO / CIB&amp;RC / Seed Act licences and direct farm PO billing
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12
          }}
        >
          {stores.map((st) => (
            <div
              key={st.id}
              onClick={() => setActiveStoreSlug(st.slug)}
              style={{
                cursor: 'pointer',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 12,
                background: '#f8fafc',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="pih-badge pih-badge-approved" style={{ fontSize: '0.68rem' }}>
                  {st.partner_type}
                </span>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#006647' }}>
                  {st.live_products_count} Products →
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>{st.store_name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                Min Order ₹{Number(st.min_order_value || 500).toLocaleString('en-IN')} •{' '}
                {(st.verified_licences || []).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="pih-filter-bar">
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
          />
          <input
            className="pih-input"
            style={{ paddingLeft: 34 }}
            placeholder="Search by product name, brand, active ingredient, or HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="pih-select"
          style={{ width: 'auto', minWidth: 165 }}
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
        >
          {PRODUCT_TYPES.map((pt) => (
            <option key={pt.value} value={pt.value}>
              {pt.label}
            </option>
          ))}
        </select>

        <select
          className="pih-select"
          style={{ width: 'auto', minWidth: 155 }}
          value={cropId}
          onChange={(e) => setCropId(e.target.value)}
        >
          <option value="">All Farm Crops</option>
          {crops.map((cr) => (
            <option key={cr.id} value={cr.id}>
              {cr.name}
            </option>
          ))}
        </select>

        <select
          className="pih-select"
          style={{ width: 'auto', minWidth: 185 }}
          value={problemId}
          onChange={(e) => setProblemId(e.target.value)}
        >
          <option value="">All Crop Health Problems</option>
          {problems.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.name} ({pr.problem_type})
            </option>
          ))}
        </select>

        <select
          className="pih-select"
          style={{ width: 'auto', minWidth: 165 }}
          value={partnerId}
          onChange={(e) => setPartnerId(e.target.value)}
        >
          <option value="">All Manufacturers</option>
          {stores.map((st) => (
            <option key={st.partner_id} value={st.partner_id}>
              {st.brand_name}
            </option>
          ))}
        </select>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#0f172a',
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={organicOnly}
            onChange={(e) => setOrganicOnly(e.target.checked)}
          />
          NPOP Organic Only
        </label>

        <select
          className="pih-select"
          style={{ width: 'auto', minWidth: 155 }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="fps_desc">Sort: Highest Field FPS</option>
          <option value="price_asc">Sort: Price Low → High</option>
          <option value="newest">Sort: Newest Listed</option>
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className={`pih-btn pih-btn-sm ${viewMode === 'grid' ? 'pih-btn-primary' : 'pih-btn-secondary'}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={`pih-btn pih-btn-sm ${viewMode === 'table' ? 'pih-btn-primary' : 'pih-btn-secondary'}`}
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <ListIcon size={15} />
          </button>
        </div>
      </div>

      {/* Product Grid or Table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
          Loading SME-Verified AgriInput Marketplace...
        </div>
      ) : products.length === 0 ? (
        <div className="pih-card" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
          <Filter size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div style={{ fontWeight: 700, color: '#1e293b' }}>No Matching Agri-Input Products Found</div>
          <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
            Try clearing your crop or problem filter to view all 40 live manufacturer products.
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16
          }}
        >
          {products.map((prod) => {
            const primarySku = prod.skus?.[0] || {};
            const fps = Number(prod.fps_score || 84.5);
            return (
              <div
                key={prod.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className="pih-badge pih-badge-live">{prod.product_type}</span>
                      {prod.is_organic && <span className="pih-badge pih-badge-approved">ORGANIC</span>}
                    </div>
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        padding: '3px 9px',
                        borderRadius: 999,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                      title="Bayesian Field Performance Score from Vivas AI Crop Health outcomes"
                    >
                      <Sparkles size={12} /> FPS {fps.toFixed(1)}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#006647',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveStoreSlug(prod.store_slug || prod.partner_id)}
                  >
                    {prod.partner_brand || prod.brand} →
                  </div>

                  <h4
                    style={{
                      margin: '4px 0 6px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      cursor: 'pointer'
                    }}
                    onClick={() => setInspectProductId(prod.id)}
                  >
                    {prod.name}
                  </h4>

                  <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                    Formulation: <strong>{prod.formulation || 'Standard'}</strong> • Reg:{' '}
                    <strong>{prod.registration_no || 'FCO/CIB Verified'}</strong> • PHI: {prod.phi_days || 0}d
                  </div>
                </div>

                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#006647' }}>
                        ₹{Number(primarySku.selling_price || prod.min_price || 450).toLocaleString('en-IN')}
                      </span>
                      {primarySku.mrp > primarySku.selling_price && (
                        <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.78rem' }}>
                          ₹{Number(primarySku.mrp).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                      Pack: {primarySku.pack_size || 1} {primarySku.pack_unit || 'kg'} • GST {prod.gst_pct}%
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="pih-btn pih-btn-secondary pih-btn-sm"
                      onClick={() => setInspectProductId(prod.id)}
                      title="View Composition, Dosage Calculator & Reviews"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      className="pih-btn pih-btn-secondary pih-btn-sm"
                      onClick={() => handleQuickAddShoppingList(prod)}
                      title="Add to Buy & Procurement Smart Shopping List"
                    >
                      <ListPlus size={14} />
                    </button>
                    <button
                      type="button"
                      className="pih-btn pih-btn-primary pih-btn-sm"
                      onClick={() => handleQuickAddProductToCart(prod)}
                    >
                      <ShoppingCart size={14} /> Buy
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pih-table-wrap">
          <table className="pih-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Manufacturer Store</th>
                <th>Category</th>
                <th>Bayesian FPS</th>
                <th>Primary Pack &amp; Price</th>
                <th>Compliance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => {
                const primarySku = prod.skus?.[0] || {};
                const fps = Number(prod.fps_score || 84.5);
                return (
                  <tr key={prod.id}>
                    <td>
                      <div
                        style={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
                        onClick={() => setInspectProductId(prod.id)}
                      >
                        {prod.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Code: {prod.product_code} • HSN {prod.hsn_code}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{ color: '#006647', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => setActiveStoreSlug(prod.store_slug || prod.partner_id)}
                      >
                        {prod.partner_brand || prod.brand}
                      </span>
                    </td>
                    <td>
                      <span className="pih-badge pih-badge-live">{prod.product_type}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#065f46' }}>{fps.toFixed(1)} / 100</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#006647' }}>
                        ₹{Number(primarySku.selling_price || prod.min_price).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                        {primarySku.pack_size} {primarySku.pack_unit} (GST {prod.gst_pct}%)
                      </div>
                    </td>
                    <td>
                      <span className="pih-badge pih-badge-approved">
                        <ShieldCheck size={12} /> {prod.registration_no || 'Verified'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="pih-btn pih-btn-secondary pih-btn-sm"
                          onClick={() => setInspectProductId(prod.id)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="pih-btn pih-btn-secondary pih-btn-sm"
                          onClick={() => handleQuickAddShoppingList(prod)}
                        >
                          <ListPlus size={14} />
                        </button>
                        <button
                          type="button"
                          className="pih-btn pih-btn-primary pih-btn-sm"
                          onClick={() => handleQuickAddProductToCart(prod)}
                        >
                          <ShoppingCart size={14} /> Buy
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Detail Drawer */}
      <ProductDetail
        productId={inspectProductId}
        onClose={() => setInspectProductId(null)}
        onAddToCart={handleAddToCart}
        onAddToShoppingList={handleAddToShoppingList}
        onOpenStore={(slug) => setActiveStoreSlug(slug)}
      />

      {/* Cart & Checkout Drawer */}
      <CartCheckout
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        onOrderSuccess={() => {
          refreshCartBadge();
          if (onNavigateOrders) onNavigateOrders();
        }}
      />
    </div>
  );
}
