import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export const ALL_PLANTING_METHODS = [
  'Direct Sow',
  'Transplant',
  'Cuttings',
  'Grafting',
  'Specialized Plant Part',
  'Setts',
  'Division',
  'Budding',
  'Bare-Root',
  'Hydroponic'
];

/**
 * PlantingMethodSelect
 * Multi-selection dropdown with individual checkboxes for each planting method.
 * Accepts either an Array of strings or a comma-separated String.
 * Calls onChange(selectedArray, selectedString).
 */
export default function PlantingMethodSelect({
  value = [],
  onChange,
  disabled = false,
  placeholder = 'Select Planting Method(s)...',
  style = {},
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize incoming value into an array of strings
  const selectedMethods = useMemo(() => {
    if (Array.isArray(value)) return value.filter(Boolean).map(s => String(s).trim());
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleMethod = (method) => {
    if (disabled) return;
    let newSelected;
    if (selectedMethods.includes(method)) {
      newSelected = selectedMethods.filter(m => m !== method);
    } else {
      newSelected = [...selectedMethods, method];
    }
    if (onChange) {
      onChange(newSelected, newSelected.join(', '));
    }
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) {
      onChange(ALL_PLANTING_METHODS, ALL_PLANTING_METHODS.join(', '));
    }
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (onChange) {
      onChange([], '');
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        ...style
      }}
      className={className}
    >
      {/* Trigger Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          minHeight: '34px',
          padding: '5px 10px',
          borderRadius: '6px',
          border: isOpen ? '1px solid #0284c7' : '1px solid #cbd5e1',
          backgroundColor: disabled ? '#f8fafc' : '#ffffff',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          boxShadow: isOpen ? '0 0 0 2px rgba(2, 132, 199, 0.15)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
          {selectedMethods.length === 0 ? (
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>{placeholder}</span>
          ) : selectedMethods.length <= 2 ? (
            selectedMethods.map((m) => (
              <span
                key={m}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  lineHeight: '1.2'
                }}
              >
                {m}
              </span>
            ))
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                {selectedMethods[0]}
              </span>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                +{selectedMethods.length - 1} more
              </span>
            </div>
          )}
        </div>
        <ChevronDown
          size={14}
          color="#64748b"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink: 0
          }}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.08)',
            maxHeight: '230px',
            overflowY: 'auto',
            padding: '4px 0'
          }}
        >
          {/* Quick Action Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 12px',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
              fontSize: '11px',
              color: '#64748b',
              fontWeight: 600
            }}
          >
            <span>{selectedMethods.length} of {ALL_PLANTING_METHODS.length} selected</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Select All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearAll}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Options with Checkbox */}
          {ALL_PLANTING_METHODS.map((method) => {
            const isChecked = selectedMethods.includes(method);
            return (
              <div
                key={method}
                onClick={() => toggleMethod(method)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '7px 12px',
                  cursor: 'pointer',
                  backgroundColor: isChecked ? '#f0f9ff' : 'transparent',
                  transition: 'background-color 0.1s ease',
                  borderLeft: isChecked ? '3px solid #0284c7' : '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isChecked) e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}} // Handled by parent row onClick
                  style={{
                    width: '15px',
                    height: '15px',
                    accentColor: '#0284c7',
                    cursor: 'pointer',
                    margin: 0
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: isChecked ? '#0369a1' : '#334155',
                    fontWeight: isChecked ? 600 : 400
                  }}
                >
                  {method}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
