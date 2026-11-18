import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

export default function AddStorageModal({ isOpen, onClose, currentStorageMB = 500, onAddStorage }) {
  const [selectedTier, setSelectedTier] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const tiers = [
    { id: '10gb', name: '+10 GB', price: '$5 USD/Mo', gb: 10 },
    { id: '50gb', name: '+50 GB', price: '$20 USD/Mo', gb: 50, bestValue: true },
    { id: '100gb', name: '+100 GB', price: '$35 USD/Mo', gb: 100 },
    { id: '1tb', name: '+1 TB', price: '$250 USD/Mo', gb: 1000 }
  ];

  const handleCheckout = async () => {
    if (!selectedTier) return;
    setSubmitting(true);
    try {
      await onAddStorage(selectedTier);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatStorage = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  return (
    <div className="tend-modal-overlay" onClick={onClose}>
      <div className="tend-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="tend-modal-header">
          <h3>Add storage</h3>
          <button className="tend-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="tend-modal-body">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`tier-radio-card ${selectedTier === tier.id ? 'selected' : ''}`}
              onClick={() => setSelectedTier(tier.id)}
            >
              <div className="tier-radio-left">
                <input
                  type="radio"
                  name="storage_tier"
                  checked={selectedTier === tier.id}
                  onChange={() => setSelectedTier(tier.id)}
                  style={{ accentColor: '#16a34a', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>{tier.name}</span>
                {tier.bestValue && <span className="best-value-pill">Best Value</span>}
              </div>
              <div className="tier-radio-price">{tier.price}</div>
            </div>
          ))}

          <div style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Current total storage</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatStorage(currentStorageMB)}</span>
          </div>
        </div>

        <div className="tend-modal-footer">
          <button className="btn-tend-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn-tend-green"
            onClick={handleCheckout}
            disabled={!selectedTier || submitting}
            style={{
              backgroundColor: selectedTier ? '#1a8f15' : '#94a3b8',
              cursor: selectedTier ? 'pointer' : 'not-allowed'
            }}
          >
            {submitting ? 'Processing...' : 'Continue To Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}
