import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  ShoppingCart,
  ListPlus,
  Eye,
  Award,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { pihRequest } from './pihApi';

export default function StorePage({
  storeSlug,
  onBack,
  onInspectProduct,
  onAddToCart,
  onAddToShoppingList
}) {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const loadStore = useCallback(async () => {
    if (!storeSlug) return;
    setLoading(true);
    setError('');
    try {
      const res = await pihRequest(`/stores/slug/${storeSlug}`);
      setStore(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
        Loading Partner Storefront...
      </div>
    );
  }

  if (error || !store) {
    return (
      <div style={{ padding: 24 }}>
        <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={onBack} style={{ marginBottom: 14 }}>
          <ArrowLeft size={15} /> Back to Marketplace
        </button>
        <div className="pih-alert pih-alert-error">
          <AlertTriangle size={16} />
          <span>{error || 'Partner Store not found'}</span>
        </div>
      </div>
    );
  }

  const products = (store.products || []).filter(
    (p) => selectedType === 'ALL' || p.product_type === selectedType
  );
  const productTypes = ['ALL', ...Array.from(new Set((store.products || []).map((p) => p.product_type)))];

  const handleQuickAddCart = async (prod) => {
    const sku = prod.skus?.[0];
    if (!sku) return;
    try {
      await onAddToCart(sku.id, 1);
      setToast(`Added ${prod.name} (${sku.pack_size} ${sku.pack_unit}) to cart`);
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuickShoppingList = async (prod) => {
    const sku = prod.skus?.[0];
    try {
      await onAddToShoppingList(prod.id, sku?.id, 1);
      setToast(`Added "${prod.name}" to Buy & Procurement Smart Shopping List`);
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={onBack}>
          <ArrowLeft size={15} /> Back to AgriInput Marketplace
        </button>
        <span className="pih-badge pih-badge-approved">
          <ShieldCheck size={13} /> Official Verified Manufacturer Storefront
        </span>
      </div>

      {toast && (
        <div className="pih-alert pih-alert-success">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Store Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #002114 0%, #006647 100%)',
          color: '#fff',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 20
        }}
      >
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Store size={24} color="#6ffbbe" />
            <span
              style={{
                background: 'rgba(111, 251, 190, 0.16)',
                color: '#6ffbbe',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {store.partner_type} • {store.tier?.toUpperCase()} TIER PARTNER
            </span>
            <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>GSTIN: {store.gstin}</span>
          </div>

          <h2 style={{ margin: '0 0 8px', fontSize: '1.6rem', fontWeight: 800 }}>{store.store_name}</h2>
          <p style={{ margin: '0 0 14px', fontSize: '0.9rem', opacity: 0.92, lineHeight: 1.5 }}>
            {store.about_md || `${store.legal_name} official manufacturer store on Vivas AI.`}
          </p>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', opacity: 0.9 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={14} color="#6ffbbe" />
              Ships to: {(store.serviceable_states || []).join(', ')}
            </span>
            {store.support_phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={14} color="#6ffbbe" /> {store.support_phone}
              </span>
            )}
            {store.support_email && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={14} color="#6ffbbe" /> {store.support_email}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
            padding: 16,
            minWidth: 230
          }}
        >
          <div style={{ fontSize: '0.75rem', opacity: 0.85, textTransform: 'uppercase' }}>
            Store Compliance &amp; Terms
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: 6 }}>
            Min Order: <strong>₹{Number(store.min_order_value || 500).toLocaleString('en-IN')}</strong>
          </div>
          <div style={{ fontSize: '0.85rem', marginTop: 3 }}>
            Free Shipping Above:{' '}
            <strong>₹{Number(store.free_shipping_above || 2500).toLocaleString('en-IN')}</strong>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {(store.verified_licences || []).map((lic, i) => (
              <span
                key={i}
                style={{
                  background: '#6ffbbe',
                  color: '#064e3b',
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}
              >
                ✓ {lic.licence_type} ({lic.issuing_state})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {productTypes.map((pt) => (
            <button
              key={pt}
              type="button"
              className={`pih-btn pih-btn-sm ${selectedType === pt ? 'pih-btn-primary' : 'pih-btn-secondary'}`}
              onClick={() => setSelectedType(pt)}
            >
              {pt === 'ALL' ? `All Store Products (${store.products?.length || 0})` : pt}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Return Policy: {store.return_policy || '7-day sealed pack replacement guarantee'}
        </div>
      </div>

      {/* Store Products Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 16
        }}
      >
        {products.map((prod) => {
          const primarySku = prod.skus?.[0] || {};
          const fps = Number(prod.fps_score || 84.2);
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
                boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="pih-badge pih-badge-live">{prod.product_type}</span>
                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      padding: '3px 8px',
                      borderRadius: 999,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <Award size={13} /> FPS {fps.toFixed(1)}
                  </span>
                </div>

                <h4
                  style={{
                    margin: '4px 0',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    cursor: 'pointer'
                  }}
                  onClick={() => onInspectProduct(prod.id)}
                >
                  {prod.name}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Formulation: {prod.formulation || 'Standard'} • Reg: {prod.registration_no || 'Verified'}
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}
              >
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#006647' }}>
                    ₹{Number(primarySku.selling_price || prod.min_price || 450).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Pack: {primarySku.pack_size || 1} {primarySku.pack_unit || 'L'} • GST {prod.gst_pct}%
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="pih-btn pih-btn-secondary pih-btn-sm"
                    onClick={() => onInspectProduct(prod.id)}
                    title="Inspect Formula & Field Score"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className="pih-btn pih-btn-secondary pih-btn-sm"
                    onClick={() => handleQuickShoppingList(prod)}
                    title="Add to Buy & Procurement Smart Shopping List"
                  >
                    <ListPlus size={14} />
                  </button>
                  <button
                    type="button"
                    className="pih-btn pih-btn-primary pih-btn-sm"
                    onClick={() => handleQuickAddCart(prod)}
                  >
                    <ShoppingCart size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
