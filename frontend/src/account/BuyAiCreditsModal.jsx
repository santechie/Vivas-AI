import React, { useState } from 'react';
import { X, Sparkles, Zap } from 'lucide-react';

export default function BuyAiCreditsModal({ isOpen, onClose, currentCredits = 25, onBuyCredits }) {
  const [selectedPkg, setSelectedPkg] = useState('200');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const packages = [
    { id: '50', name: '+50 AI Credits', credits: 50, price: '$5 USD' },
    { id: '200', name: '+200 AI Credits', credits: 200, price: '$15 USD', popular: true },
    { id: '500', name: '+500 AI Credits', credits: 500, price: '$30 USD', bestValue: true },
    { id: '1000', name: '+1,000 AI Credits', credits: 1000, price: '$50 USD' }
  ];

  const handleCheckout = async () => {
    if (!selectedPkg) return;
    setSubmitting(true);
    try {
      await onBuyCredits(selectedPkg);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = packages.find(p => p.id === selectedPkg);

  return (
    <div className="tend-modal-overlay" onClick={onClose}>
      <div className="tend-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="tend-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} style={{ color: '#8b5cf6' }} />
            <h3>Buy AI Credits Add-On</h3>
          </div>
          <button className="tend-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="tend-modal-body">
          <p style={{ fontSize: '0.86rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
            Purchased add-on credits never expire and are consumed after your monthly plan allowance.
          </p>

          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`tier-radio-card ${selectedPkg === pkg.id ? 'selected' : ''}`}
              onClick={() => setSelectedPkg(pkg.id)}
            >
              <div className="tier-radio-left">
                <input
                  type="radio"
                  name="credits_pkg"
                  checked={selectedPkg === pkg.id}
                  onChange={() => setSelectedPkg(pkg.id)}
                  style={{ accentColor: '#8b5cf6', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>{pkg.name}</span>
                {pkg.popular && <span className="best-value-pill" style={{ background: '#f3e8ff', color: '#6b21a8' }}>Popular</span>}
                {pkg.bestValue && <span className="best-value-pill">Best Value</span>}
              </div>
              <div className="tier-radio-price">{pkg.price}</div>
            </div>
          ))}

          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>Current remaining credits:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{currentCredits} credits</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>New balance after purchase:</span>
              <span style={{ fontWeight: 700, color: '#8b5cf6' }}>
                {currentCredits + (selectedItem?.credits || 0)} credits
              </span>
            </div>
          </div>
        </div>

        <div className="tend-modal-footer">
          <button className="btn-tend-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn-tend-green"
            onClick={handleCheckout}
            disabled={!selectedPkg || submitting}
            style={{ backgroundColor: '#8b5cf6' }}
          >
            {submitting ? 'Processing...' : 'Confirm & Add Credits'}
          </button>
        </div>
      </div>
    </div>
  );
}
