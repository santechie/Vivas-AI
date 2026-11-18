import React, { useState, useEffect } from 'react';
import {
  Contact,
  Users,
  Truck,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Building,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  IndianRupee,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:5001/api"
  : "/api";

export default function ContactDirectoryScreen() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedType !== 'All') params.append('type', selectedType);

      const res = await fetch(`${API_BASE}/contacts/directory?${params.toString()}`);
      const json = await res.json();
      if (json.success) setContacts(json.data);
    } catch (err) {
      console.error('Error fetching directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [searchTerm, selectedType]);

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="grow-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100%' }}>
      
      {/* ── HEADER ── */}
      <div className="grow-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            CONTACTS & CRM
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>Contact Directory</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Unified address book for wholesale buyers, chefs, retail stores, input suppliers, and logistics partners
          </p>
        </div>

        <button
          onClick={() => {
            setSearchTerm('');
            setSelectedType('All');
            fetchDirectory();
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', cursor: 'pointer', fontSize: '13px', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          <RefreshCw size={14} />
          Refresh Directory
        </button>
      </div>

      {/* ── SEARCH & FILTER BAR (WHITE THEME) ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ position: 'relative', flex: '1 1 320px', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search address book by name, company, email, phone, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
            {['All', 'Customer', 'Vendor'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedType === t ? '#ffffff' : 'transparent',
                  color: selectedType === t ? '#0f172a' : '#64748b',
                  fontSize: '12px',
                  fontWeight: selectedType === t ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: selectedType === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {t === 'All' ? 'All Contacts' : `${t}s`}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedType('All');
            }}
            title="Reset Filters"
            style={{ padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 500 }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── CARDS GRID (WHITE THEME) ── */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: '#0284c7' }} />
          Loading contacts directory...
        </div>
      ) : contacts.length === 0 ? (
        <div style={{ background: '#ffffff', padding: '60px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
          <Contact size={36} style={{ margin: '0 auto 12px auto', display: 'block', color: '#94a3b8' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>No contacts found</h3>
          <p style={{ margin: 0, fontSize: '13px' }}>Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {contacts.map((c) => {
            const isCustomer = c.contact_type === 'Customer';
            return (
              <div
                key={`${c.contact_type}-${c.id}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = isCustomer ? '#86efac' : '#7dd3fc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {/* Top Badge & Initials */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: isCustomer ? '50%' : '10px',
                        background: isCustomer
                          ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                          : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '14px',
                        boxShadow: isCustomer
                          ? '0 2px 8px rgba(22, 163, 74, 0.25)'
                          : '0 2px 8px rgba(2, 132, 199, 0.25)'
                      }}
                    >
                      {getInitials(c.name)}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {c.name}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                        {c.company_name || 'Primary Contact'}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      background: isCustomer ? '#dcfce7' : '#e0f2fe',
                      color: isCustomer ? '#15803d' : '#0369a1'
                    }}
                  >
                    {c.contact_type}
                  </span>
                </div>

                {/* Sub Type */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#334155', fontWeight: 600 }}>
                    {c.sub_type || 'General'}
                  </span>
                  {c.city && (
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} style={{ color: '#94a3b8' }} /> {c.city}, {c.state}
                    </span>
                  )}
                </div>

                {/* Contact Links */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      <a href={`mailto:${c.email}`} style={{ color: '#0284c7', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.email}
                      </a>
                    </div>
                  )}
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      <a href={`tel:${c.phone}`} style={{ color: '#334155', textDecoration: 'none', fontWeight: 500 }}>
                        {c.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Financial Summary Line */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>
                    {isCustomer ? 'Lifetime Revenue:' : 'Total Spend:'}
                  </span>
                  <strong style={{ color: isCustomer ? '#16a34a' : '#0284c7', fontWeight: 700 }}>
                    ₹{parseFloat(c.lifetime_sales || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
