import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function FileUploadModal({ isOpen, onClose, availableMB, API_BASE, onFileUploaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('Soil Test');
  const [notes, setNotes] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileSizeMB, setFileSizeMB] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFile = (file) => {
    if (!file) return;

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > availableMB) {
      setError(`File size (${sizeMB.toFixed(2)} MB) exceeds available storage (${availableMB} MB). Please add a storage add-on first.`);
      return;
    }

    setError('');
    setSelectedFile(file);
    setFileName(file.name);
    setFileSizeMB(sizeMB);

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileBase64(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !fileBase64) {
      setError('Please select a file to upload.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/account/storage/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: fileName || selectedFile.name,
          file_data: fileBase64,
          mime_type: selectedFile.type,
          category,
          notes
        })
      });
      const data = await res.json();
      if (data.success) {
        if (onFileUploaded) onFileUploaded(data.file);
        onClose();
      } else {
        setError(data.message || 'Error uploading file.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tend-modal-overlay" onClick={onClose}>
      <div className="tend-modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="tend-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} style={{ color: '#16a34a' }} />
            <h3>Upload File to Storage</h3>
          </div>
          <button className="tend-modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="tend-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? '#16a34a' : '#cbd5e1'}`,
                borderRadius: '10px',
                padding: '1.75rem 1rem',
                textAlign: 'center',
                backgroundColor: dragActive ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              <Upload size={32} style={{ color: '#16a34a', margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a' }}>
                {selectedFile ? selectedFile.name : 'Click to browse or drop file here'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                PDF, JPG, PNG, WEBP, CSV, XLSX, DOCX (Max: {availableMB} MB available)
              </div>
            </div>

            {selectedFile && (
              <div style={{ padding: '0.65rem 0.85rem', background: '#dcfce7', borderRadius: '6px', fontSize: '0.82rem', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Selected: <strong>{selectedFile.name}</strong></span>
                <span>{(fileSizeMB).toFixed(2)} MB</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Display Name
              </label>
              <input
                type="text"
                required
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. Bed 4 Soil Nitrogen Report"
                className="profile-field-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Category / Classification
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="profile-field-input"
                >
                  <option value="Soil Test">Soil Test & Lab Analysis</option>
                  <option value="Crop Photos">Crop Photos & Field Inspection</option>
                  <option value="Invoices">Invoices & Expense Receipts</option>
                  <option value="Certifications">Organic Certifications & Audits</option>
                  <option value="SOPs & Guides">SOPs & Farming Protocols</option>
                  <option value="General">General Farm Documents</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Pre-planting lab analysis test for plot A"
                  className="profile-field-input"
                />
              </div>
            </div>

            {error && (
              <div style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="tend-modal-footer">
            <button type="button" className="btn-tend-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-tend-green"
              disabled={!selectedFile || submitting}
              style={{
                backgroundColor: selectedFile ? '#1a8f15' : '#94a3b8',
                cursor: selectedFile ? 'pointer' : 'not-allowed'
              }}
            >
              {submitting ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
