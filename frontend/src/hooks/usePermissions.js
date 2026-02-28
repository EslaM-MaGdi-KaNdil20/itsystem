/**
 * usePermissions — reads user permissions from localStorage
 * can(key)  → true if allowed (super_admin always true; admin with empty perms = all true for backward compat)
 * isSuperAdmin() → true if role === 'super_admin'
 */
export function usePermissions() {
  const getUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  };

  const can = (key) => {
    const user = getUser();
    if (!user || !user.role) return false;
    if (user.role === 'super_admin') return true;
    // Backward compat: if no permissions set yet, grant all (until admin explicitly configures them)
    const perms = user.permissions;
    if (!perms || Object.keys(perms).length === 0) return true;
    return perms[key] === true;
  };

  const canAny = (...keys) => keys.some(k => can(k));

  const isSuperAdmin = () => getUser()?.role === 'super_admin';
  const getRole      = () => getUser()?.role || 'user';
  const getUser_     = () => getUser();

  return { can, canAny, isSuperAdmin, getRole, getUser: getUser_ };
}

export default usePermissions;

