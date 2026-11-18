// backend/services/chi/connectors/licenseNormalizer.js
// Normalizes varied license strings from external APIs (iNaturalist, GBIF, Wikimedia, etc.)
// into canonical chi_license ENUM values (SRS Section 3.2).

export const CANONICAL_LICENSES = [
  'CC0',
  'CC-BY',
  'CC-BY-SA',
  'CC-BY-NC',
  'CC-BY-NC-SA',
  'CC-BY-ND',
  'CC-BY-NC-ND',
  'PARTNER_AGREEMENT',
  'ALL_RIGHTS_RESERVED',
  'UNKNOWN'
];

/**
 * Normalizes an arbitrary license code or description into a chi_license enum value.
 * @param {string} rawLicense
 * @returns {string} One of CANONICAL_LICENSES
 */
export function normalizeLicense(rawLicense) {
  if (!rawLicense || typeof rawLicense !== 'string') {
    return 'UNKNOWN';
  }

  const clean = rawLicense.trim().toUpperCase().replace(/[\s_]+/g, '-');

  // Exact canonical match
  if (CANONICAL_LICENSES.includes(clean)) {
    return clean;
  }

  // CC0 / Public Domain
  if (clean.includes('CC0') || clean.includes('PUBLIC-DOMAIN') || clean.includes('ZERO')) {
    return 'CC0';
  }

  // Partner Agreement
  if (clean.includes('PARTNER') || clean.includes('AGREEMENT')) {
    return 'PARTNER_AGREEMENT';
  }

  // All rights reserved / Copyright
  if (clean.includes('ALL-RIGHTS-RESERVED') || clean.includes('COPYRIGHT') || clean === 'ARR') {
    return 'ALL_RIGHTS_RESERVED';
  }

  // Creative Commons variations
  // Check most restrictive / compound ones first
  if (clean.includes('CC-BY-NC-SA') || (clean.includes('BY') && clean.includes('NC') && clean.includes('SA'))) {
    return 'CC-BY-NC-SA';
  }
  if (clean.includes('CC-BY-NC-ND') || (clean.includes('BY') && clean.includes('NC') && clean.includes('ND'))) {
    return 'CC-BY-NC-ND';
  }
  if (clean.includes('CC-BY-NC') || (clean.includes('BY') && clean.includes('NC'))) {
    return 'CC-BY-NC';
  }
  if (clean.includes('CC-BY-ND') || (clean.includes('BY') && clean.includes('ND'))) {
    return 'CC-BY-ND';
  }
  if (clean.includes('CC-BY-SA') || (clean.includes('BY') && clean.includes('SA'))) {
    return 'CC-BY-SA';
  }
  if (clean.includes('CC-BY') || clean === 'BY') {
    return 'CC-BY';
  }

  return 'UNKNOWN';
}

/**
 * Checks whether a normalized license code is permitted under the provided license list.
 * @param {string} licenseCode
 * @param {string[]|string} allowedLicenses - Array of strings or PostgreSQL string representation e.g. "{CC0,CC-BY}"
 * @returns {boolean}
 */
export function isLicenseAllowed(licenseCode, allowedLicenses = []) {
  if (!licenseCode || licenseCode === 'UNKNOWN' || licenseCode === 'ALL_RIGHTS_RESERVED') {
    return false;
  }
  let list = allowedLicenses;
  if (typeof list === 'string') {
    // Parse PostgreSQL array string representation "{A,B,C}"
    list = list.replace(/[\{\}"]/g, '').split(',').map(s => s.trim());
  }
  return Array.isArray(list) && list.includes(licenseCode);
}

export default {
  CANONICAL_LICENSES,
  normalizeLicense,
  isLicenseAllowed
};
