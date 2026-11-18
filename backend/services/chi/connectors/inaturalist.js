// backend/services/chi/connectors/inaturalist.js
// iNaturalist API connector (SRS 3.1 & 3.4)
// Base URL: https://api.inaturalist.org/v1

import { safeFetch } from '../safeFetch.js';
import { normalizeLicense } from './licenseNormalizer.js';

export async function testConnection(source) {
  const baseUrl = source.base_url || 'https://api.inaturalist.org/v1';
  const url = `${baseUrl}/observations?per_page=1&quality_grade=research`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['api.inaturalist.org']
    });
    const data = JSON.parse(res.buffer.toString());
    return {
      ok: true,
      message: 'Successfully connected to iNaturalist API.',
      sample_count: data.total_results || 0
    };
  } catch (err) {
    return {
      ok: false,
      message: `iNaturalist test failed: ${err.message}`,
      sample_count: 0
    };
  }
}

export async function searchTaxa(source, query) {
  const baseUrl = source.base_url || 'https://api.inaturalist.org/v1';
  const url = `${baseUrl}/taxa?q=${encodeURIComponent(query)}&per_page=10`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['api.inaturalist.org']
    });
    const data = JSON.parse(res.buffer.toString());
    return (data.results || []).map(t => ({
      external_taxon_id: String(t.id),
      scientific_name: t.name,
      rank: t.rank,
      synonyms: t.matched_term && t.matched_term !== t.name ? [t.matched_term] : [],
      common_names: t.preferred_common_name ? { en: t.preferred_common_name } : {}
    }));
  } catch (err) {
    console.error('[iNaturalist searchTaxa] Error:', err.message);
    return [];
  }
}

export async function fetchPage(source, profile, cursor = {}) {
  const baseUrl = source.base_url || 'https://api.inaturalist.org/v1';
  const page = cursor.page || 1;
  const perPage = Math.min(profile.max_images_per_problem || 30, 100);

  // Build query parameters
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    photos: 'true',
    photo_license: 'cc-by,cc-by-sa,cc0',
    quality_grade: profile.quality_filter === 'RESEARCH' ? 'research' : 'needs_id,research',
    order: 'desc',
    order_by: 'created_at'
  });

  if (profile.country_codes && profile.country_codes.length > 0) {
    // iNaturalist place_id for India is 6681
    if (profile.country_codes.includes('IN')) {
      params.set('place_id', '6681');
    }
  }

  // Taxon parameter if external_taxon_id supplied via cursor
  if (cursor.external_taxon_id) {
    params.set('taxon_id', cursor.external_taxon_id);
  } else if (cursor.scientific_name) {
    params.set('q', cursor.scientific_name);
  }

  const url = `${baseUrl}/observations?${params.toString()}`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['api.inaturalist.org']
    });
    const data = JSON.parse(res.buffer.toString());
    const observations = data.results || [];

    const items = [];
    for (const obs of observations) {
      if (!obs.photos || obs.photos.length === 0) continue;

      for (const photo of obs.photos) {
        // Image URL selection based on download_size
        let mediaUrl = photo.url;
        if (mediaUrl) {
          if (source.download_size === 'LARGE') {
            mediaUrl = mediaUrl.replace('/square.', '/large.');
          } else if (source.download_size === 'ORIGINAL') {
            mediaUrl = mediaUrl.replace('/square.', '/original.');
          } else {
            mediaUrl = mediaUrl.replace('/square.', '/medium.');
          }
        }

        const normLic = normalizeLicense(photo.license_code);
        const attribution = photo.attribution || (obs.user ? `Photo © ${obs.user.name || obs.user.login}` : 'iNaturalist Contributor');

        items.push({
          external_record_id: String(obs.id),
          external_media_id: String(photo.id),
          media_url: mediaUrl,
          source_page_url: obs.uri || `https://www.inaturalist.org/observations/${obs.id}`,
          external_taxon_id: obs.taxon ? String(obs.taxon.id) : null,
          taxon_scientific_name: obs.taxon ? obs.taxon.name : null,
          host_scientific_name: null,
          observed_at: obs.time_observed_at || obs.observed_on || null,
          country_code: 'IN',
          state: obs.place_guess || null,
          district: null,
          lat: obs.geojson?.coordinates ? obs.geojson.coordinates[1] : null,
          lng: obs.geojson?.coordinates ? obs.geojson.coordinates[0] : null,
          quality_grade: obs.quality_grade,
          plant_part_hint: null,
          life_stage_hint: null,
          license_code: normLic,
          attribution,
          creator: obs.user?.name || obs.user?.login || 'iNaturalist User',
          raw: {
            observation_id: obs.id,
            photo_id: photo.id,
            taxon: obs.taxon?.name
          }
        });
      }
    }

    const totalPages = Math.ceil((data.total_results || 0) / perPage);
    const hasNext = page < totalPages && items.length > 0;
    const nextCursor = hasNext ? { ...cursor, page: page + 1 } : null;

    return {
      items,
      nextCursor,
      done: !hasNext
    };
  } catch (err) {
    throw new Error(`iNaturalist fetchPage failed: ${err.message}`);
  }
}

export function describeLicence(rawItem) {
  return {
    license_code: normalizeLicense(rawItem.license_code || rawItem.license),
    attribution: rawItem.attribution || 'iNaturalist contributor',
    creator: rawItem.creator || 'iNaturalist user',
    source_url: rawItem.source_page_url || null
  };
}

export default {
  testConnection,
  searchTaxa,
  fetchPage,
  describeLicence
};
