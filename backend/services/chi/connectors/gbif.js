// backend/services/chi/connectors/gbif.js
// GBIF occurrence API connector (SRS 3.1)
// Base URL: https://api.gbif.org/v1

import { safeFetch } from '../safeFetch.js';
import { normalizeLicense } from './licenseNormalizer.js';

export async function testConnection(source) {
  const baseUrl = source.base_url || 'https://api.gbif.org/v1';
  const url = `${baseUrl}/occurrence/search?mediaType=StillImage&limit=1`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['api.gbif.org']
    });
    const data = JSON.parse(res.buffer.toString());
    return {
      ok: true,
      message: 'Successfully connected to GBIF Occurrence API.',
      sample_count: data.count || 0
    };
  } catch (err) {
    return {
      ok: false,
      message: `GBIF test failed: ${err.message}`,
      sample_count: 0
    };
  }
}

export async function searchTaxa(source, query) {
  const baseUrl = source.base_url || 'https://api.gbif.org/v1';
  const url = `${baseUrl}/species/match?name=${encodeURIComponent(query)}`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['api.gbif.org']
    });
    const data = JSON.parse(res.buffer.toString());
    if (data.usageKey) {
      return [{
        external_taxon_id: String(data.usageKey),
        scientific_name: data.scientificName || data.canonicalName,
        rank: data.rank,
        synonyms: data.synonym ? [data.scientificName] : [],
        common_names: {}
      }];
    }
    return [];
  } catch (err) {
    console.error('[GBIF searchTaxa] Error:', err.message);
    return [];
  }
}

export async function fetchPage(source, profile, cursor = {}) {
  const baseUrl = source.base_url || 'https://api.gbif.org/v1';
  const offset = cursor.offset || 0;
  const limit = Math.min(profile.max_images_per_problem || 20, 50);

  const params = new URLSearchParams({
    mediaType: 'StillImage',
    limit: String(limit),
    offset: String(offset)
  });

  if (cursor.external_taxon_id) {
    params.set('taxonKey', cursor.external_taxon_id);
  }
  if (profile.country_codes?.includes('IN')) {
    params.set('country', 'IN');
  }

  const url = `${baseUrl}/occurrence/search?${params.toString()}`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['api.gbif.org']
    });
    const data = JSON.parse(res.buffer.toString());
    const results = data.results || [];

    const items = [];
    for (const occ of results) {
      if (!occ.media || occ.media.length === 0) continue;

      for (let i = 0; i < occ.media.length; i++) {
        const m = occ.media[i];
        if (m.type !== 'StillImage' || !m.identifier) continue;

        const licenseCode = normalizeLicense(m.license || occ.license);

        items.push({
          external_record_id: String(occ.key),
          external_media_id: `${occ.key}_m${i}`,
          media_url: m.identifier,
          source_page_url: `https://www.gbif.org/occurrence/${occ.key}`,
          external_taxon_id: occ.taxonKey ? String(occ.taxonKey) : null,
          taxon_scientific_name: occ.scientificName,
          host_scientific_name: null,
          observed_at: occ.eventDate || null,
          country_code: occ.countryCode || 'IN',
          state: occ.stateProvince || null,
          district: null,
          lat: occ.decimalLatitude || null,
          lng: occ.decimalLongitude || null,
          quality_grade: 'RESEARCH',
          plant_part_hint: null,
          life_stage_hint: null,
          license_code: licenseCode,
          attribution: m.rightsHolder || m.creator || occ.recordedBy || 'GBIF Publisher',
          creator: m.creator || occ.recordedBy || 'GBIF Contributor',
          raw: {
            occurrence_key: occ.key,
            dataset_key: occ.datasetKey
          }
        });
      }
    }

    const nextOffset = offset + limit;
    const hasNext = nextOffset < (data.count || 0) && items.length > 0;

    return {
      items,
      nextCursor: hasNext ? { ...cursor, offset: nextOffset } : null,
      done: !hasNext
    };
  } catch (err) {
    throw new Error(`GBIF fetchPage failed: ${err.message}`);
  }
}

export function describeLicence(rawItem) {
  return {
    license_code: normalizeLicense(rawItem.license_code || rawItem.license),
    attribution: rawItem.attribution || 'GBIF contributor',
    creator: rawItem.creator || 'GBIF user',
    source_url: rawItem.source_page_url || null
  };
}

export default {
  testConnection,
  searchTaxa,
  fetchPage,
  describeLicence
};
