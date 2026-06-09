/**
 * Centralized Permission Handling — Phase 5
 *
 * Provides a single point of control for checking user permissions
 * before performing actions. Currently role-based with the existing
 * single-user auth model, but structured for future multi-role expansion.
 *
 * Permission checks are synchronous and lightweight.
 */

const Permission = {
  READ_RECORDS: 'read:records',
  WRITE_RECORDS: 'write:records',
  DELETE_RECORDS: 'delete:records',
  READ_DEBTS: 'read:debts',
  WRITE_DEBTS: 'write:debts',
  READ_APPOINTMENTS: 'read:appointments',
  WRITE_APPOINTMENTS: 'write:appointments',
  MANAGE_CONFIG: 'manage:config',
  UPLOAD_IMAGES: 'upload:images',
  DELETE_IMAGES: 'delete:images',
  EXPORT_DATA: 'export:data',
  MANAGE_USERS: 'manage:users',
}

const ROLE_PERMISSIONS = {
  owner: Object.values(Permission),
  admin: Object.values(Permission).filter(p => p !== Permission.MANAGE_USERS),
  viewer: [
    Permission.READ_RECORDS,
    Permission.READ_DEBTS,
    Permission.READ_APPOINTMENTS,
  ],
}

let _currentRole = 'owner'
let _currentUid = null

/**
 * Set the current user context for permission checks.
 */
export function setPermissionContext(uid, role = 'owner') {
  _currentUid = uid
  _currentRole = role
}

/**
 * Clear permissions on logout.
 */
export function clearPermissionContext() {
  _currentUid = null
  _currentRole = null
}

/**
 * Check if the current user has a specific permission.
 */
export function hasPermission(permission) {
  if (!_currentUid || !_currentRole) return false
  const perms = ROLE_PERMISSIONS[_currentRole]
  if (!perms) return false
  return perms.includes(permission)
}

/**
 * Guard a function call with a permission check.
 * Throws if permission is denied.
 */
export function requirePermission(permission) {
  if (!hasPermission(permission)) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

/**
 * Check if user is authenticated (has a valid context).
 */
export function isAuthenticated() {
  return !!_currentUid
}

/**
 * Get the current user's role.
 */
export function getCurrentRole() {
  return _currentRole
}

export { Permission }
