// backend/services/chi/storage.js
// Storage service for Crop Health Image Sources
// Manages imported files under backend/uploads/crop_health/imported

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory for imported CHI files
const BASE_STORAGE_DIR = path.resolve(__dirname, '../../uploads/crop_health/imported');

// Ensure base storage directory exists
if (!fs.existsSync(BASE_STORAGE_DIR)) {
  fs.mkdirSync(BASE_STORAGE_DIR, { recursive: true });
}

/**
 * Normalizes and guards relative path against directory traversal
 */
function resolveSafePath(relPath) {
  const safeRel = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
  const absPath = path.resolve(BASE_STORAGE_DIR, safeRel);
  if (!absPath.startsWith(BASE_STORAGE_DIR)) {
    throw new Error('Access denied: Invalid storage path traversal.');
  }
  return absPath;
}

/**
 * Saves a buffer or string to storage
 * @param {string} relPath - Relative file path under imported/
 * @param {Buffer|string} data - Content to write
 * @returns {string} Relative URL or relative path
 */
export async function put(relPath, data) {
  const targetPath = resolveSafePath(relPath);
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    await fs.promises.mkdir(targetDir, { recursive: true });
  }
  await fs.promises.writeFile(targetPath, data);
  return `/uploads/crop_health/imported/${path.normalize(relPath).replace(/\\/g, '/')}`;
}

/**
 * Reads a file from storage as a Buffer
 * @param {string} relPath
 * @returns {Buffer|null}
 */
export async function get(relPath) {
  const targetPath = resolveSafePath(relPath);
  if (!fs.existsSync(targetPath)) {
    return null;
  }
  return await fs.promises.readFile(targetPath);
}

/**
 * Removes a file from storage
 * @param {string} relPath
 */
export async function remove(relPath) {
  const targetPath = resolveSafePath(relPath);
  if (fs.existsSync(targetPath)) {
    await fs.promises.unlink(targetPath);
    return true;
  }
  return false;
}

/**
 * Moves a file from source relative path to target relative path
 * @param {string} srcRelPath
 * @param {string} destRelPath
 */
export async function move(srcRelPath, destRelPath) {
  const src = resolveSafePath(srcRelPath);
  const dest = resolveSafePath(destRelPath);
  if (!fs.existsSync(src)) {
    throw new Error(`Source file does not exist: ${srcRelPath}`);
  }
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    await fs.promises.mkdir(destDir, { recursive: true });
  }
  await fs.promises.rename(src, dest);
  return `/uploads/crop_health/imported/${path.normalize(destRelPath).replace(/\\/g, '/')}`;
}

/**
 * Checks available storage disk space (or mock safeguard)
 */
export async function checkFreeSpace() {
  try {
    const stats = await fs.promises.statfs(BASE_STORAGE_DIR);
    const freeBytes = stats.bfree * stats.bsize;
    return freeBytes;
  } catch {
    // If statfs is not supported on platform, return safe default (10 GB)
    return 10 * 1024 * 1024 * 1024;
  }
}

export default {
  put,
  get,
  remove,
  move,
  checkFreeSpace,
  BASE_STORAGE_DIR
};
