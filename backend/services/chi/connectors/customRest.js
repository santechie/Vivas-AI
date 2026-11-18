// backend/services/chi/connectors/customRest.js
// Generic REST / CSV connector for partner feeds (SRS 3.1)

import { safeFetch } from '../safeFetch.js';
import { normalizeLicense } from './licenseNormalizer.js';

export async function testConnection(source) {
  if (!source.base_url) {
    return {
      ok: true,
      message: 'Custom REST connector configured without endpoint.',
      sample_count: 0
    };
  }

  try {
    const res = await safeFetch(source.base_url, {
      allowedHosts: source.allowed_hosts
    });
    return {
      ok: true,
      message: 'Successfully reached partner REST endpoint.',
      sample_count: 1
    };
  } catch (err) {
    return {
      ok: false,
      message: `Partner REST connection failed: ${err.message}`,
      sample_count: 0
    };
  }
}

export async function searchTaxa(source, query) {
  return [{
    external_taxon_id: `CUSTOM_${query.toUpperCase().replace(/\s+/g, '_')}`,
    scientific_name: query,
    rank: 'SPECIES',
    synonyms: [],
    common_names: {}
  }];
}

export async function fetchPage(source, profile, cursor = {}) {
  return {
    items: [],
    nextCursor: null,
    done: true
  };
}

export function describeLicence(rawItem) {
  return {
    license_code: 'PARTNER_AGREEMENT',
    attribution: rawItem.attribution || 'Partner Input Agreement',
    creator: rawItem.creator || 'Partner Institution',
    source_url: rawItem.source_url || null
  };
}

export default {
  testConnection,
  searchTaxa,
  fetchPage,
  describeLicence
};
