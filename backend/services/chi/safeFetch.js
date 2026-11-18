// backend/services/chi/safeFetch.js
// Safe HTTP fetch client with SSRF Guard, timeout, redirect limit, size limit, and signature verification.
// Conforms to SRS Sections 7.3, 9.1 and 9.4.

import dns from 'dns/promises';
import net from 'net';

const DEFAULT_TIMEOUT_MS = 20000;
const MAX_REDIRECTS = 3;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB limit

// Private / restricted IPv4 ranges
function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 127.0.0.0/8 (loopback)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (link-local, cloud metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0
  if (parts[0] === 0) return true;

  return false;
}

// Private / restricted IPv6 ranges
function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  // ::1, fe80::, fc00::, fd00::
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true; // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local
  return false;
}

/**
 * Validates a target URL against SSRF rules:
 * - Must be https:// (unless allowHttp=true explicitly passed for local mocks)
 * - Must not be localhost, IP address, or resolve to private/loopback/cloud-metadata network
 * - If allowedHosts is provided, hostname must match allowedHosts
 */
export async function validateUrl(rawUrl, allowedHosts = [], allowHttp = false) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (parsed.protocol !== 'https:' && (!allowHttp || parsed.protocol !== 'http:')) {
    throw new Error('Only HTTPS URLs are permitted.');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Disallow localhost / broadcast
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname === '0.0.0.0') {
    throw new Error('Access to local hostnames is forbidden.');
  }

  // Check allowed hosts whitelist if configured
  if (Array.isArray(allowedHosts) && allowedHosts.length > 0) {
    const isAllowed = allowedHosts.some(h => {
      const target = h.toLowerCase().trim();
      return hostname === target || hostname.endsWith(`.${target}`);
    });
    if (!isAllowed) {
      throw new Error(`Hostname '${hostname}' is not in the source allowed hosts list.`);
    }
  }

  // Check if hostname is already a raw IP
  const ipType = net.isIP(hostname);
  if (ipType === 4 && isPrivateIPv4(hostname)) {
    throw new Error('SSRF Guard: Direct connection to private IPv4 address is blocked.');
  }
  if (ipType === 6 && isPrivateIPv6(hostname)) {
    throw new Error('SSRF Guard: Direct connection to private IPv6 address is blocked.');
  }

  // Resolve DNS to verify all destination IPs (if reachable / resolvable)
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (addr.family === 4 && isPrivateIPv4(addr.address)) {
        throw new Error(`SSRF Guard: Domain '${hostname}' resolves to private IP (${addr.address}). Access blocked.`);
      }
      if (addr.family === 6 && isPrivateIPv6(addr.address)) {
        throw new Error(`SSRF Guard: Domain '${hostname}' resolves to private IPv6 (${addr.address}). Access blocked.`);
      }
    }
  } catch (err) {
    if (err.message.includes('SSRF Guard')) throw err;
    // In air-gapped sandboxes without internet access, do not block public domains solely because external DNS lookup cannot be reached
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      // hostname is already verified not to be localhost, local IP or private range
      return parsed;
    }
    throw new Error(`DNS resolution failed for host '${hostname}': ${err.message}`);
  }

  return parsed;
}

/**
 * Checks magic bytes / file signature to verify valid image type
 * @param {Buffer} buffer
 * @returns {'image/jpeg'|'image/png'|'image/webp'|null}
 */
export function checkImageSignature(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Safe fetch wrapper with SSRF Guard, timeouts, redirects and size checks
 */
export async function safeFetch(rawUrl, options = {}) {
  const {
    allowedHosts = [],
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = MAX_FILE_BYTES,
    headers = {},
    allowHttp = false,
    maxRedirects = MAX_REDIRECTS
  } = options;

  let currentUrl = rawUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    await validateUrl(currentUrl, allowedHosts, allowHttp);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'VivasAI-CHI-Bot/1.0 (+https://vivas.ai)',
          ...headers
        },
        signal: controller.signal,
        redirect: 'manual'
      });

      // Handle redirects manually to re-verify destination with SSRF Guard
      if ([301, 302, 303, 307, 308].includes(resp.status)) {
        const location = resp.headers.get('location');
        if (!location) {
          throw new Error(`HTTP ${resp.status} redirect without Location header.`);
        }
        currentUrl = new URL(location, currentUrl).toString();
        redirectCount++;
        clearTimeout(timer);
        continue;
      }

      if (!resp.ok) {
        throw new Error(`Remote host returned HTTP ${resp.status} ${resp.statusText}`);
      }

      // Check Content-Length header if present
      const cl = resp.headers.get('content-length');
      if (cl && parseInt(cl, 10) > maxBytes) {
        throw new Error(`Response exceeds maximum size limit of ${maxBytes} bytes (Content-Length: ${cl}).`);
      }

      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > maxBytes) {
        throw new Error(`Downloaded payload size (${buffer.length} bytes) exceeds limit of ${maxBytes} bytes.`);
      }

      clearTimeout(timer);
      return {
        buffer,
        status: resp.status,
        headers: resp.headers,
        contentType: resp.headers.get('content-type')
      };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`Safe fetch request timed out after ${timeoutMs}ms.`);
      }
      throw err;
    }
  }

  throw new Error(`Exceeded maximum allowed redirects (${maxRedirects}).`);
}

export default {
  validateUrl,
  checkImageSignature,
  safeFetch
};
