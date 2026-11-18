import React, { useState } from 'react';
import { X, Award, CheckCircle2, Calendar, Clock, Phone } from 'lucide-react';

export default function PriorityOnboardingModal({ isOpen, onClose, API_BASE, user, onSubmitted }) {
  const [formData, setFormData] = useState({
    preferred_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    preferred_time_slot: '10:00 AM - 12:00 PM',
    contact_phone: user?.phone_number || '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/account/priority-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        if (onSubmitted) onSubmitted(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tend-modal-overlay" onClick={onClose}>
      <div className="tend-modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="tend-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} style={{ color: '#eab308' }} />
            <h3>Purchase Priority Onboarding</h3>
          </div>
          <button className="tend-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="tend-modal-body" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Priority Onboarding Booked!
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5', maxWidth: '380px', margin: '0 auto 1.5rem auto' }}>
              Our Senior Agricultural Specialist has received your request and will contact you at <strong>{formData.contact_phone || user?.email}</strong> to confirm your personalized setup session.
            </p>
            <button className="btn-tend-green" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="tend-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#854d0e', marginBottom: '0.5rem' }}>
                  What's included in Priority Onboarding ($199 USD):
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: '#713f12', lineHeight: '1.6' }}>
                  <li>1-on-1 Dedicated 90-minute live screen share session with an agronomist</li>
                  <li>Assistance importing soil test reports, bed maps, and seed catalogs</li>
                  <li>Custom crop rotation and harvest scheduling review</li>
                  <li>30-day VIP direct WhatsApp/Phone priority support channel</li>
                </ul>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.preferred_date}
                    onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                    className="profile-field-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Preferred Time Slot
                  </label>
                  <select
                    value={formData.preferred_time_slot}
                    onChange={(e) => setFormData({ ...formData, preferred_time_slot: e.target.value })}
                    className="profile-field-input"
                  >
                    <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                    <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                    <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 9940091521"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="profile-field-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Farm Specifics & Goals (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 5-acre organic farm, polyhouse vegetables, need help setting up 4-season succession plantings..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="profile-field-input"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="tend-modal-footer">
              <button type="button" className="btn-tend-outline" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn-tend-green" disabled={submitting}>
                {submitting ? 'Confirming...' : 'Book Onboarding ($199 USD)'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
