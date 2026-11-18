// backend/services/chi/permissions.js
// Permissions helper for Crop Health Image Sources (CHI)
// Non-negotiable rule 4: Every /api/chi route requires an authenticated user and permission,
// even when AUTH_ENFORCE is false. Never call getContext() in CHI code.

import pool from '../../config/db.js';
import { isAdminRole } from '../../middleware/security.js';

export { isAdminRole };

/**
 * Check if the user has the required CHI permission.
 * Admin roles have all permissions.
 * Agronomist / other roles check vivas_settings_roles.permissions JSON.
 */
export async function hasPermission(user, requiredPerm) {
  if (!user) return false;
  
  // 1. Check if user has an Admin role
  if (isAdminRole(user.role)) {
    return true;
  }

  // 2. Query permissions from vivas_settings_roles if farm_id or user.role matches
  try {
    const res = await pool.query(
      `SELECT permissions 
       FROM vivas_settings_roles 
       WHERE role_name = $1 
       LIMIT 1`,
      [user.role]
    );

    if (res.rows.length > 0) {
      const perms = res.rows[0].permissions || {};
      if (perms.all === true) return true;
      if (perms.crop_health_images && typeof perms.crop_health_images === 'object') {
        if (perms.crop_health_images[requiredPerm] === true || perms.crop_health_images['*'] === true) {
          return true;
        }
      }
      // Also support direct key e.g. "crop_health_images:manage_sources" or "manage_sources"
      if (perms[`crop_health_images:${requiredPerm}`] === true || perms[requiredPerm] === true) {
        return true;
      }
    }
  } catch (err) {
    console.error('[CHI permissions] Error querying vivas_settings_roles:', err.message);
  }

  // 3. Fallback check for Agronomist / SME roles (SRS Section 4.3)
  const isAgronomist = /agronomist|sme|expert/i.test(String(user.role || ''));
  if (isAgronomist) {
    const agronomistPerms = [
      'view',
      'manage_mapping',
      'run_import',
      'review',
      'takedown'
    ];
    if (agronomistPerms.includes(requiredPerm)) {
      return true;
    }
  }

  // 4. View permission for farm owners/managers/viewers
  if (requiredPerm === 'view') {
    return true;
  }

  return false;
}

/**
 * Express middleware requiring a specific CHI permission.
 * Returns 401 if unauthenticated, 403 if permission is lacking.
 */
export function requirePerm(requiredPerm) {
  return async (req, res, next) => {
    if (!req.auth || !req.auth.uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for CHI endpoints.'
      });
    }

    const allowed = await hasPermission(req.auth, requiredPerm);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: permission 'crop_health_images.${requiredPerm}' is required.`
      });
    }

    next();
  };
}
