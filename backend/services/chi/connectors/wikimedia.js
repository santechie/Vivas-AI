// backend/services/chi/connectors/wikimedia.js
// Wikimedia Commons API connector (SRS 3.1)
// Base URL: https://commons.wikimedia.org/w/api.php

import { safeFetch } from '../safeFetch.js';
import { normalizeLicense } from './licenseNormalizer.js';

export async function testConnection(source) {
  const baseUrl = source.base_url || 'https://commons.wikimedia.org/w/api.php';
  const url = `${baseUrl}?action=query&format=json&meta=siteinfo`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['commons.wikimedia.org']
    });
    const data = JSON.parse(res.buffer.toString());
    return {
      ok: !!data.query?.general?.sitename,
      message: 'Successfully connected to Wikimedia Commons API.',
      sample_count: 1
    };
  } catch (err) {
    return {
      ok: false,
      message: `Wikimedia test failed: ${err.message}`,
      sample_count: 0
    };
  }
}

export async function searchTaxa(source, query) {
  const baseUrl = source.base_url || 'https://commons.wikimedia.org/w/api.php';
  const url = `${baseUrl}?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=14&format=json`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['commons.wikimedia.org']
    });
    const data = JSON.parse(res.buffer.toString());
    const titles = data[1] || [];
    return titles.map((t, idx) => ({
      external_taxon_id: t.replace(/^Category:/, ''),
      scientific_name: t.replace(/^Category:/, ''),
      rank: 'SPECIES',
      synonyms: [],
      common_names: {}
    }));
  } catch (err) {
    console.error('[Wikimedia searchTaxa] Error:', err.message);
    return [];
  }
}

export async function fetchPage(source, profile, cursor = {}) {
  const baseUrl = source.base_url || 'https://commons.wikimedia.org/w/api.php';
  const taxon = cursor.scientific_name || cursor.external_taxon_id || 'Plant diseases';
  const gcmcontinue = cursor.gcmcontinue || null;

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'categorymembers',
    gcmtitle: `Category:${taxon}`,
    gcmtype: 'file',
    gcmlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|timestamp|user'
  });

  if (gcmcontinue) {
    params.set('gcmcontinue', gcmcontinue);
  }

  const url = `${baseUrl}?${params.toString()}`;
  try {
    const res = await safeFetch(url, {
      allowedHosts: source.allowed_hosts?.length ? source.allowed_hosts : ['commons.wikimedia.org']
    });
    const data = JSON.parse(res.buffer.toString());
    const pages = Object.values(data.query?.pages || {});

    const items = [];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info || !info.url) continue;

      const meta = info.extmetadata || {};
      const licenseCode = normalizeLicense(meta.LicenseShortName?.value || meta.License?.value);
      const attribution = meta.Artist?.value?.replace(/<[^>]*>/g, '') || info.user || 'Wikimedia Contributor';

      items.push({
        external_record_id: String(page.pageid),
        external_media_id: String(page.pageid),
        media_url: info.url,
        source_page_url: info.descriptionurl || `https://commons.wikimedia.org/?curid=${page.pageid}`,
        external_taxon_id: taxon,
        taxon_scientific_name: taxon,
        host_scientific_name: null,
        observed_at: info.timestamp || null,
        country_code: 'IN',
        state: null,
        district: null,
        lat: meta.GPSLatitude?.value ? parseFloat(meta.GPSLatitude.value) : null,
        lng: meta.GPSLongitude?.value ? parseFloat(meta.GPSLongitude.value) : null,
        quality_grade: 'RESEARCH',
        plant_part_hint: null,
        life_stage_hint: null,
        license_code: licenseCode,
        attribution,
        creator: info.user || 'Wikimedia User',
        raw: {
          title: page.title,
          pageid: page.pageid
        }
      });
    }

    const nextContinue = data.continue?.gcmcontinue || null;
    return {
      items,
      nextCursor: nextContinue ? { ...cursor, gcmcontinue: nextContinue } : null,
      done: !nextContinue
    };
  } catch (err) {
    throw new Error(`Wikimedia fetchPage failed: ${err.message}`);
  }
}

export function describeLicence(rawItem) {
  return {
    license_code: normalizeLicense(rawItem.license_code),
    attribution: rawItem.attribution || 'Wikimedia Commons',
    creator: rawItem.creator || 'Wikimedia Contributor',
    source_url: rawItem.source_page_url || null
  };
}

export default {
  testConnection,
  searchTaxa,
  fetchPage,
  describeLicence
};
