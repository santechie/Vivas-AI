import React from 'react';
import { X, Apple, Play } from 'lucide-react';

export default function MobileAppModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="tend-modal-overlay" onClick={onClose}>
      <div className="tend-modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1rem 0 1rem' }}>
          <button 
            className="tend-modal-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mobile-app-modal-body">
          <h2 className="mobile-app-title">Bring your farm to your mobile phone.</h2>
          <p className="mobile-app-desc">
            Click below to download Vivas AI Mobile from the App Store (iOS) or Google Play (Android)
          </p>

          <div className="mobile-store-badges">
            <a 
              href="https://apps.apple.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="store-badge-btn"
            >
              <Apple size={26} />
              <div className="store-badge-text">
                <div className="store-badge-sub">Download on the</div>
                <div className="store-badge-main">App Store</div>
              </div>
            </a>

            <a 
              href="https://play.google.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="store-badge-btn"
            >
              <Play size={24} style={{ fill: '#ffffff' }} />
              <div className="store-badge-text">
                <div className="store-badge-sub">GET IT ON</div>
                <div className="store-badge-main">Google Play</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
