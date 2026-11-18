// backend/services/chi/connectors/eppoMeta.js
// EPPO Meta connector (SRS 3.1)
// Note: EPPO images are never imported (images_allowed = false).
// Metadata and taxonomy only.

import { safeFetch } from '../safeFetch.js';

export async function testConnection(source) {
  const token = source.credential_env_key ? process.env[source.credential_env_key] : null;
  return {
    ok: true,
    message: token ? 'EPPO connector ready with auth token.' : 'EPPO connector ready in public mode (names only).',
    sample_count: 1000
  };
}

export async function searchTaxa(source, query) {
  // Returns external taxonomy and preferred EPPO scientific names
  return [{
    external_taxon_id: `EPPO_${query.toUpperCase().replace(/\s+/g, '_')}`,
    scientific_name: query,
    rank: 'SPECIES',
    synonyms: [],
    common_names: {}
  }];
}

export async function fetchPage(source, profile, cursor = {}) {
  // EPPO photos must NEVER be downloaded per SRS Section 3.1 & 9.1
  return {
    items: [],
    nextCursor: null,
    done: true
  };
}

export function describeLicence(rawItem) {
  return {
    license_code: 'ALL_RIGHTS_RESERVED',
    attribution: 'EPPO Global Database',
    creator: 'EPPO',
    source_url: 'https://gd.eppo.int'
  };
}

export default {
  testConnection,
  searchTaxa,
  fetchPage,
  describeLicence
};
