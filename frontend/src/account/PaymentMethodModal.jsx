import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck } from 'lucide-react';

export default function PaymentMethodModal({ isOpen, onClose, currentPaymentMethod, onSavePaymentMethod }) {
  const [formData, setFormData] = useState({
    cardholder_name: currentPaymentMethod?.cardholder_name || '',
    card_number: currentPaymentMethod ? `•••• •••• •••• ${currentPaymentMethod.last4}` : '',
    exp_month: currentPaymentMethod?.exp_month || '12',
    exp_year: currentPaymentMethod?.exp_year || '2028',
    cvc: '•••',
    billing_country: currentPaymentMethod?.billing_country || 'India',
    billing_postal_code: currentPaymentMethod?.billing_postal_code || '600001'
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.cardholder_name.trim()) errs.cardholder_name = 'Cardholder name is required.';
    
    // Clean card number
    const cleanNum = formData.card_number.replace(/\s+/g, '');
    if (!cleanNum || (!cleanNum.includes('•') && cleanNum.length < 13)) {
      errs.card_number = 'A valid 13 to 19 digit card number is required.';
    }

    const month = parseInt(formData.exp_month, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      errs.exp_month = 'Invalid month (1-12).';
    }

    const year = parseInt(formData.exp_year, 10);
    if (isNaN(year) || year < 2024) {
      errs.exp_year = 'Invalid expiration year.';
    }

    if (!formData.cvc || (!formData.cvc.includes('•') && formData.cvc.length < 3)) {
      errs.cvc = 'CVC must be 3 or 4 digits.';
    }

    if (!formData.billing_postal_code.trim()) {
      errs.billing_postal_code = 'Postal code is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSavePaymentMethod(formData);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    // Add space every 4 digits
    val = val.replace(/(\d{4})/g, '$1 ').trim();
    setFormData({ ...formData, card_number: val });
  };

  return (
    <div className="tend-modal-overlay" onClick={onClose}>
      <div className="tend-modal-card" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="tend-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} style={{ color: '#16a34a' }} />
            <h3>Change payment method</h3>
          </div>
          <button className="tend-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="tend-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Name on card
              </label>
              <input
                type="text"
                placeholder="e.g. Gopikrishna Santhanam"
                value={formData.cardholder_name}
                onChange={(e) => setFormData({ ...formData, cardholder_name: e.target.value })}
                className="profile-field-input"
              />
              {errors.cardholder_name && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{errors.cardholder_name}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Card number
              </label>
              <input
                type="text"
                placeholder="4242 4242 4242 4242"
                value={formData.card_number}
                onChange={handleCardNumberChange}
                className="profile-field-input"
              />
              {errors.card_number && <span style={{ color: '#dc2626', fontSize: '0.78rem' }}>{errors.card_number}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Month
                </label>
                <select
                  value={formData.exp_month}
                  onChange={(e) => setFormData({ ...formData, exp_month: e.target.value })}
                  className="profile-field-input"
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Year
                </label>
                <select
                  value={formData.exp_year}
                  onChange={(e) => setFormData({ ...formData, exp_year: e.target.value })}
                  className="profile-field-input"
                >
                  {[2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  CVC
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="123"
                  value={formData.cvc}
                  onChange={(e) => setFormData({ ...formData, cvc: e.target.value.replace(/\D/g, '') })}
                  className="profile-field-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Country
                </label>
                <select
                  value={formData.billing_country}
                  onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                  className="profile-field-input"
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Postal code
                </label>
                <input
                  type="text"
                  placeholder="600001"
                  value={formData.billing_postal_code}
                  onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                  className="profile-field-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', color: '#15803d', fontSize: '0.8rem' }}>
              <ShieldCheck size={16} />
              <span>Card details are encrypted with 256-bit SSL security.</span>
            </div>
          </div>

          <div className="tend-modal-footer">
            <button type="button" className="btn-tend-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-tend-green" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Payment Method'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
