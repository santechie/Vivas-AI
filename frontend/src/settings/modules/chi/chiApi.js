/**
 * chiApi.js
 * Frontend API client wrapper for Crop Health Image Sources (/api/chi/*)
 * Adheres to SRS 10.1: sends bearer token and x-farm-id, with standard error handling.
 */

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:5001';
  }
  return '';
};

const getHeaders = (extraHeaders = {}) => {
  let token = null;
  let farmId = null;

  if (typeof window !== 'undefined') {
    token = localStorage.getItem('vivas_token') || sessionStorage.getItem('vivas_token') || localStorage.getItem('token');
    
    // Resolve farmId from vivas_active_farm object or direct key
    const activeFarmStr = localStorage.getItem('vivas_active_farm') || sessionStorage.getItem('vivas_active_farm');
    if (activeFarmStr) {
      try {
        const farmObj = JSON.parse(activeFarmStr);
        farmId = farmObj?.id || null;
      } catch (e) {
        farmId = activeFarmStr;
      }
    }
    if (!farmId) {
      farmId = localStorage.getItem('farmId') || sessionStorage.getItem('farmId') || 'e772d1ba-6841-44ba-86a2-c429a7e007e4';
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (farmId) {
    headers['x-farm-id'] = farmId;
  }

  return headers;
};

async function handleResponse(res) {
  const data = await res.json().catch(() => ({ success: false, error: 'Network response was not JSON' }));
  if (!res.ok) {
    const errorMsg = data.message || data.error || `HTTP ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export const chiApi = {
  // Overview
  getOverview: async (apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/overview`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Sources
  getSources: async (apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/sources`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getSource: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/sources/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createSource: async (payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/sources`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateSource: async (id, payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/sources/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  testSource: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/sources/${id}/test`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  acceptSourceTerms: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/sources/${id}/accept-terms`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  activateSource: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/sources/${id}/activate`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  deactivateSource: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/sources/${id}/deactivate`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Taxon Maps
  getTaxonMaps: async (params = {}, apiBase = getApiBase()) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${apiBase}/api/chi/taxon-maps?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createTaxonMap: async (payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/taxon-maps`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateTaxonMap: async (id, payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/taxon-maps/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Crop Maps
  getCropMaps: async (params = {}, apiBase = getApiBase()) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${apiBase}/api/chi/crop-maps?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createCropMap: async (payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/crop-maps`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateCropMap: async (id, payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/crop-maps/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  deleteCropMap: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/crop-maps/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Import Profiles
  getProfiles: async (params = {}, apiBase = getApiBase()) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${apiBase}/api/chi/profiles?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  createProfile: async (payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/profiles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  updateProfile: async (id, payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/profiles/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  deleteProfile: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/profiles/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  previewProfile: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/profiles/${id}/preview`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  runProfile: async (id, payload = {}, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/profiles/${id}/run`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Runs & Logs
  getRuns: async (params = {}, apiBase = getApiBase()) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${apiBase}/api/chi/runs?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getRun: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/runs/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getRunLogs: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/runs/${id}/logs`, { headers: getHeaders() });
    return handleResponse(res);
  },
  cancelRun: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/runs/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },
  retryRun: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/runs/${id}/retry`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Review Queue Items
  getItems: async (params = {}, apiBase = getApiBase()) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${apiBase}/api/chi/items?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getItem: async (id, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/items/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  updateItem: async (id, payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/items/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  approveItem: async (id, payload = {}, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/items/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  rejectItem: async (id, payload = {}, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/items/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  bulkItemsAction: async (payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/items/bulk`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Published Media
  getMedia: async (params = {}, apiBase = getApiBase()) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${apiBase}/api/chi/media?${query}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  updateMedia: async (id, payload, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/media/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },
  takedownMedia: async (id, payload = {}, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/media/${id}/takedown`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Crop & Remedy Extensions
  getCropProblems: async (cropId, apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/crops/${cropId}/problems`, { headers: getHeaders() });
    return handleResponse(res);
  },
  getRemedyGaps: async (apiBase = getApiBase()) => {
    const res = await fetch(`${apiBase}/api/chi/remedy-gaps`, { headers: getHeaders() });
    return handleResponse(res);
  },

  // Generic request helpers
  get: async (endpoint, apiBase = getApiBase()) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${apiBase}/api/chi${cleanEndpoint}`, { headers: getHeaders() });
    return handleResponse(res);
  },
  post: async (endpoint, payload = {}, apiBase = getApiBase()) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${apiBase}/api/chi${cleanEndpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  }
};

export default chiApi;
