const API_BASE =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5001/api'
    : '/api';

export const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pih-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getStoredContextHeaders = (overrideRole = null, overridePartnerId = null) => {
  let user = null;
  let farm = null;
  let storedRole = null;
  let storedPartnerId = null;
  try {
    const uRaw = localStorage.getItem('vivas_user') || sessionStorage.getItem('vivas_user');
    if (uRaw) user = JSON.parse(uRaw);
    const fRaw = localStorage.getItem('vivas_active_farm') || sessionStorage.getItem('vivas_active_farm');
    if (fRaw) farm = JSON.parse(fRaw);
    storedRole = localStorage.getItem('pih_active_role');
    storedPartnerId = localStorage.getItem('pih_active_partner_id');
  } catch {
    // ignore storage parse errors
  }

  const headers = {
    'Content-Type': 'application/json'
  };
  if (user?.id) headers['x-user-id'] = user.id;
  if (farm?.id) headers['x-farm-id'] = farm.id;
  const effectiveRole = overrideRole || storedRole;
  const effectivePartnerId = overridePartnerId || storedPartnerId;
  if (effectiveRole) headers['x-pih-role'] = effectiveRole;
  if (effectivePartnerId) headers['x-partner-id'] = effectivePartnerId;

  return headers;
};

export async function pihRequest(endpoint, { method = 'GET', body = null, role = null, partnerId = null, idempotencyKey = null } = {}) {
  const headers = getStoredContextHeaders(role, partnerId);
  if (method.toUpperCase() === 'POST') {
    headers['Idempotency-Key'] = idempotencyKey || generateIdempotencyKey();
  }

  const res = await fetch(`${API_BASE}/pih${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const json = await res.json().catch(() => ({
    success: false,
    message: `HTTP ${res.status}`
  }));

  if (!res.ok || json.success === false) {
    const err = new Error(json.message || json.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = json.errors || {};
    throw err;
  }

  return json;
}

export async function coreApiRequest(endpoint, { method = 'GET', body = null } = {}) {
  const headers = getStoredContextHeaders();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

export const formatINR = (val) => {
  const n = Number(val || 0);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

