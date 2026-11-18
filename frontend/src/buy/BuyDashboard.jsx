import React, { useState, useEffect } from 'react';
import SmartShoppingList from './SmartShoppingList';
import PurchaseOrders from './PurchaseOrders';
import { ShoppingBag, ShoppingCart, FileText } from 'lucide-react';

export default function BuyDashboard({ initialTab = 'smart-shopping-list' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'buy/shopping-list' || hash === 'smart-shopping-list') {
        setActiveSubTab('smart-shopping-list');
      } else if (hash === 'buy/purchase-orders' || hash === 'purchase-orders') {
        setActiveSubTab('purchase-orders');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabKey) => {
    setActiveSubTab(tabKey);
    window.location.hash = `buy/${tabKey}`;
  };

  return (
    <div className="grow-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', background: '#f8fafc', minHeight: '100%', color: '#1e293b' }}>
      
      {/* ── HEADER & SUB-MODULE NAVIGATION ── */}
      <div className="grow-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-block', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px' }}>
            BUY & PROCUREMENT
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>
            Buy & Procurement Dashboard
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Streamline material requirements, vendor purchase orders, inventory restocking, and financial expense tracking
          </p>
        </div>

        {/* Sub-module Tab Switcher */}
        <div style={{ display: 'flex', gap: '6px', background: '#cbd5e1', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => handleTabChange('smart-shopping-list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: activeSubTab === 'smart-shopping-list' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'smart-shopping-list' ? '#0f172a' : '#475569',
              boxShadow: activeSubTab === 'smart-shopping-list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <ShoppingCart size={15} color={activeSubTab === 'smart-shopping-list' ? '#16a34a' : '#64748b'} />
            Smart Shopping List
          </button>

          <button
            onClick={() => handleTabChange('purchase-orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              backgroundColor: activeSubTab === 'purchase-orders' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'purchase-orders' ? '#0f172a' : '#475569',
              boxShadow: activeSubTab === 'purchase-orders' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <FileText size={15} color={activeSubTab === 'purchase-orders' ? '#0284c7' : '#64748b'} />
            Purchase Orders (POs)
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      {activeSubTab === 'smart-shopping-list' && (
        <SmartShoppingList activeTab={activeSubTab} onTabChange={handleTabChange} />
      )}

      {activeSubTab === 'purchase-orders' && (
        <PurchaseOrders activeTab={activeSubTab} onTabChange={handleTabChange} />
      )}
    </div>
  );
}
