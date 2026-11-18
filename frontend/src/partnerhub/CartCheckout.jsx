import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Truck,
  ShieldCheck,
  CreditCard,
  X,
  ArrowRight,
  FileText
} from 'lucide-react';
import { pihRequest } from './pihApi';

const INDIAN_STATES = [
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Andhra Pradesh',
  'Telangana',
  'Gujarat',
  'Madhya Pradesh',
  'Punjab',
  'Haryana',
  'Uttar Pradesh',
  'Rajasthan'
];

export default function CartCheckout({ isOpen, onClose, onOrderSuccess }) {
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderComplete, setOrderComplete] = useState(null);

  const [paymentMode, setPaymentMode] = useState('online');
  const [address, setAddress] = useState({
    recipient_name: 'Ramesh Gowda (Farm Manager)',
    phone: '+91 98450 22334',
    line1: 'Plot 14, Doddaballapura Main Road',
    village: 'Kasaba Hobli',
    district: 'Bengaluru Rural',
    state: 'Karnataka',
    pincode: '561203'
  });
  const [notes, setNotes] = useState('');

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await pihRequest('/cart');
      setCartData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOrderComplete(null);
      loadCart();
    }
  }, [isOpen, loadCart]);

  if (!isOpen) return null;

  const handleUpdateQty = async (itemId, newQty) => {
    try {
      setError('');
      await pihRequest(`/cart/items/${itemId}`, { method: 'PUT', body: { qty: newQty } });
      await loadCart();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      setError('');
      await pihRequest(`/cart/items/${itemId}`, { method: 'DELETE' });
      await loadCart();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await pihRequest('/checkout', {
        method: 'POST',
        body: {
          payment_mode: paymentMode,
          delivery_address: address,
          notes
        }
      });
      setOrderComplete(res.orders || [res.data]);
      await loadCart();
      if (onOrderSuccess) onOrderSuccess(res.orders || [res.data]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const carts = cartData?.carts || [];
  const grandSummary = cartData?.grand_summary || { subtotal: 0, gst_amount: 0, shipping: 0, total: 0 };
  const anyBelowMinOrder = carts.some((c) => !c.summary?.meets_min_order);

  return (
    <div className="pih-drawer-backdrop" onClick={onClose}>
      <div
        className="pih-drawer"
        style={{ maxWidth: '640px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pih-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={20} color="#006647" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                AgriInput Cart & Direct PO Checkout
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Auto-syncs Purchase Orders (`vivas_purchase_orders`) & Approved Farm Vendors
              </span>
            </div>
          </div>
          <button className="pih-btn pih-btn-secondary pih-btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="pih-drawer-body">
          {error && (
            <div className="pih-alert pih-alert-error" style={{ marginBottom: 14 }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {orderComplete ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center'
              }}
            >
              <CheckCircle2 size={44} color="#15803d" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ margin: '0 0 6px', color: '#14532d' }}>
                Order Placed & Linked to Buy Module!
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#166534' }}>
                Your Partner Store order has been created and synced with your farm&apos;s Purchase Orders &
                Vendor Directory.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 18 }}>
                {orderComplete.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      background: '#fff',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                        {ord.order_no} • {ord.partner_brand}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                        Linked PO: <strong>{ord.po_code}</strong> • Vendor: <strong>{ord.vendor_code}</strong>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#006647', fontSize: '1rem' }}>
                      ₹{Number(ord.total || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="pih-btn pih-btn-primary" onClick={onClose}>
                  Done & Track in My Input Orders
                </button>
              </div>
            </div>
          ) : loading ? (
            <div style={{ padding: 36, textAlign: 'center', color: '#64748b' }}>Loading your cart...</div>
          ) : carts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <ShoppingBag size={42} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>Your AgriInput Cart is Empty</div>
              <div style={{ fontSize: '0.85rem' }}>
                Browse SME-verified seeds, nano-fertilisers, bio-stimulants, and crop protection products in the
                Marketplace.
              </div>
            </div>
          ) : (
            <form onSubmit={handleCheckout}>
              {carts.map((cart) => (
                <div
                  key={cart.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 14
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: 8,
                      marginBottom: 10
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem' }}>
                        {cart.store_name || cart.brand_name}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                        Direct Manufacturer Fulfilment • Free shipping above ₹
                        {Number(cart.free_shipping_above || 2500).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="pih-badge pih-badge-approved">{cart.partner_type}</span>
                  </div>

                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px dashed #f1f5f9',
                        gap: 10
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
                          {item.product_name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          Pack: {item.pack_size} {item.pack_unit} • SKU: {item.sku_code} • GST {item.gst_pct}% (HSN{' '}
                          {item.hsn_code})
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#006647', fontWeight: 600, marginTop: 2 }}>
                          ₹{Number(item.unit_price).toLocaleString('en-IN')} / pack
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="pih-btn pih-btn-secondary pih-btn-sm"
                          style={{ padding: '4px 7px' }}
                          onClick={() => handleUpdateQty(item.id, Number(item.qty) - 1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ minWidth: 26, textAlign: 'center', fontWeight: 700, fontSize: '0.88rem' }}>
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          className="pih-btn pih-btn-secondary pih-btn-sm"
                          style={{ padding: '4px 7px' }}
                          onClick={() => handleUpdateQty(item.id, Number(item.qty) + 1)}
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          className="pih-btn pih-btn-secondary pih-btn-sm"
                          style={{ padding: '4px 7px', color: '#dc2626' }}
                          onClick={() => handleRemoveItem(item.id)}
                          title="Remove SKU"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div style={{ minWidth: 82, textAlign: 'right', fontWeight: 700, fontSize: '0.88rem' }}>
                        ₹{Number(item.line_total).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}

                  {!cart.summary.meets_min_order && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: '#fffbeb',
                        color: '#b45309',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}
                    >
                      Minimum order value for {cart.brand_name} is ₹
                      {Number(cart.summary.min_order_value).toLocaleString('en-IN')}. Add ₹
                      {(Number(cart.summary.min_order_value) - Number(cart.summary.subtotal)).toFixed(0)} more to
                      checkout.
                    </div>
                  )}
                </div>
              ))}

              {/* Delivery Address */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 14
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Truck size={16} color="#006647" />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                    Farm Delivery Address (PII Masked from Partner)
                  </span>
                </div>
                <div className="pih-form-grid">
                  <div className="pih-form-group">
                    <label>Recipient (Internal Only)</label>
                    <input
                      className="pih-input"
                      value={address.recipient_name}
                      onChange={(e) => setAddress({ ...address, recipient_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="pih-form-group">
                    <label>Phone (Internal Only)</label>
                    <input
                      className="pih-input"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="pih-form-group">
                    <label>District</label>
                    <input
                      className="pih-input"
                      value={address.district}
                      onChange={(e) => setAddress({ ...address, district: e.target.value })}
                      required
                    />
                  </div>
                  <div className="pih-form-group">
                    <label>State</label>
                    <select
                      className="pih-select"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="pih-form-group">
                    <label>PIN Code</label>
                    <input
                      className="pih-input"
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                      required
                    />
                  </div>
                  <div className="pih-form-group">
                    <label>Payment Mode</label>
                    <select
                      className="pih-select"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="online">Online Instant (UPI / NetBanking)</option>
                      <option value="credit">Farm Input Credit (Net 30 PO)</option>
                      <option value="cod">Cash on Farm Delivery (COD)</option>
                    </select>
                  </div>
                </div>
                <div className="pih-form-group" style={{ marginTop: 8 }}>
                  <label>PO / Delivery Notes</label>
                  <input
                    className="pih-input"
                    placeholder="Gate delivery instructions or batch requirements..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Items Subtotal (Excl. GST)</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(grandSummary.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>GST Input Tax Credit (5% / 12% / 18%)</span>
                  <span style={{ fontWeight: 600 }}>₹{Number(grandSummary.gst_amount).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Cold-Chain / Express Logistics</span>
                  <span style={{ fontWeight: 600 }}>
                    {Number(grandSummary.shipping) === 0 ? 'FREE' : `₹${grandSummary.shipping}`}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: 8,
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    color: '#0f172a'
                  }}
                >
                  <span>Total Purchase Order Value</span>
                  <span style={{ color: '#006647' }}>₹{Number(grandSummary.total).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.76rem',
                  color: '#475569',
                  marginBottom: 14
                }}
              >
                <ShieldCheck size={16} color="#006647" />
                <span>
                  Placing this order automatically creates a formal Purchase Order in <strong>Buy &amp; Procurement</strong>{' '}
                  and links the manufacturer in your <strong>Approved Vendors</strong>.
                </span>
              </div>

              <button
                type="submit"
                className="pih-btn pih-btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', fontSize: '0.95rem' }}
                disabled={submitting || anyBelowMinOrder}
              >
                <CreditCard size={17} />
                {submitting
                  ? 'Creating Purchase Order & Syncing...'
                  : `Place Order & Create Farm PO (₹${Number(grandSummary.total).toLocaleString('en-IN')})`}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
