import React, { useState, useEffect } from 'react';
import { X, FileText, Download, CheckCircle } from 'lucide-react';

export default function BillingHistoryModal({ isOpen, onClose, API_BASE }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/account/invoices`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = (inv) => {
    // Generate text/csv receipt for demonstration
    const invoiceContent = `=========================================
VIVAS AI - BILLING INVOICE / RECEIPT
=========================================
Invoice Number: ${inv.invoice_number}
Date: ${new Date(inv.invoice_date).toLocaleDateString()}
Description: ${inv.description}
Amount: $${Number(inv.amount).toFixed(2)} ${inv.currency || 'USD'}
Payment Method: ${inv.payment_method || 'Credit Card'}
Status: ${inv.status}
-----------------------------------------
Thank you for growing with Vivas AI!
=========================================`;

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="tend-modal-overlay" onClick={onClose}>
      <div className="tend-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="tend-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: '#16a34a' }} />
            <h3>Billing history</h3>
          </div>
          <button className="tend-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="tend-modal-body" style={{ padding: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              Loading billing history...
            </div>
          ) : invoices.length === 0 ? (
            <div className="acc-empty-state">
              <FileText size={36} />
              <p>No billing invoices found yet.</p>
            </div>
          ) : (
            <div className="acc-table-wrap">
              <table className="acc-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{inv.invoice_number}</td>
                      <td>{new Date(inv.invoice_date).toLocaleDateString()}</td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.description}
                      </td>
                      <td style={{ fontWeight: 700 }}>${Number(inv.amount).toFixed(2)}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px'
                        }}>
                          <CheckCircle size={12} />
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="file-action-btn"
                          title="Download Receipt"
                          onClick={() => handleDownloadInvoice(inv)}
                        >
                          <Download size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="tend-modal-footer">
          <button className="btn-tend-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
