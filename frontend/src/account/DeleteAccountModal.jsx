import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

export default function DeleteAccountModal({ isOpen, onClose, farmName, API_BASE, onDeleteConfirmed }) {
  const [confirmationText, setConfirmationText] = useState('');
  const [reason, setReason] = useState('Missing features');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isConfirmed = confirmationText.trim() === 'DELETE' || confirmationText.trim() === farmName;

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!isConfirmed) {
      setError('Please type DELETE to confirm cancellation.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/account/delete-farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: confirmationText.trim(), reason, password })
      });
      const data = await res.json();
      if (data.success) {
        if (onDeleteConfirmed) onDeleteConfirmed();
        onClose();
      } else {
        setError(data.message || 'Error processing deletion.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tend-modal-overlay" onClick={onClose}>
      <div className="tend-modal-card" style={{ maxWidth: '500px', borderTop: '4px solid #dc2626' }} onClick={(e) => e.stopPropagation()}>
        <div className="tend-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
            <AlertTriangle size={20} />
            <h3 style={{ color: '#dc2626' }}>Delete my farm account</h3>
          </div>
          <button className="tend-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleDelete}>
          <div className="tend-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.85rem 1rem' }}>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#991b1b', lineHeight: '1.5' }}>
                <strong>Warning:</strong> Deleting your farm account will permanently remove all bed maps, crop growth logs, sensor histories, and financial records. This action cannot be undone.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Reason for leaving
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="profile-field-input"
              >
                <option value="Missing features">Missing features I need</option>
                <option value="Too expensive">Subscription pricing</option>
                <option value="Closing farm operations">Closing or reducing farm operations</option>
                <option value="Switching software">Switching to another platform</option>
                <option value="Temporary pause">Temporary pause / Seasonal</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Type <strong style={{ color: '#dc2626' }}>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                required
                placeholder="DELETE"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="profile-field-input"
                style={{ borderColor: confirmationText && !isConfirmed ? '#f87171' : undefined }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Confirm Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="profile-field-input"
              />
            </div>

            {error && (
              <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>

          <div className="tend-modal-footer">
            <button type="button" className="btn-tend-outline" onClick={onClose} disabled={submitting}>
              Keep My Account
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || submitting}
              style={{
                backgroundColor: isConfirmed ? '#dc2626' : '#cbd5e1',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.15rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: isConfirmed ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Trash2 size={16} />
              {submitting ? 'Canceling...' : 'Permanently Delete Farm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
