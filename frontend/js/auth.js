function getSession() {
  return JSON.parse(sessionStorage.getItem('thrissurSession') || 'null');
}

function saveSession(session, username, password) {
  sessionStorage.setItem('thrissurSession', JSON.stringify(session));
  localStorage.removeItem('thrissurSession');
}

function clearSession() {
  sessionStorage.removeItem('thrissurSession');
  localStorage.removeItem('thrissurSession');
}

function loginPathForRole(role) {
  if (role === 'SHOP_OWNER') return 'login.html?role=shop';
  if (role === 'PLATFORM_ADMIN') return 'login.html?role=admin';
  return 'login.html';
}

function dashboardRole() {
  const page = document.body && document.body.dataset ? document.body.dataset.page : '';
  if (page === 'shop-owner-dashboard') return 'SHOP_OWNER';
  if (page === 'admin-dashboard') return 'PLATFORM_ADMIN';
  if (page === 'customer-dashboard') return 'CUSTOMER';
  return null;
}

const reauthenticationRole = dashboardRole();
const navigationEntry = window.performance && window.performance.getEntriesByType
  ? window.performance.getEntriesByType('navigation')[0] : null;
const isPageReload = navigationEntry
  ? navigationEntry.type === 'reload'
  : window.performance && window.performance.navigation
    ? window.performance.navigation.type === 1 : false;
if (reauthenticationRole && isPageReload) {
  apiPost('/auth/logout', {}).finally(() => {
    clearSession();
    window.location.replace(loginPathForRole(reauthenticationRole));
  });
}

function requireRole(role) {
  const session = getSession();
  if (!session || session.role !== role) {
    window.location.replace(loginPathForRole(role));
    return null;
  }
  return session;
}

async function requireAuthenticatedRole(requiredRole) {
  try {
    console.info('[AUTH] checking authenticated role:', requiredRole);
    const identity = await apiGet('/auth/me');
    console.info('[AUTH] current user:', { role: identity.role, username: identity.username });

    if (identity.role !== requiredRole) {
      clearSession();
      window.location.replace(loginPathForRole(requiredRole));
      return null;
    }

    const local = getSession() || {};
    const session = { ...local, ...identity, role: requiredRole };
    saveSession(session);
    return session;
  } catch (error) {
    console.error('[AUTH] identity check failed:', error.status || error.message);
    clearSession();
    window.location.replace(loginPathForRole(requiredRole));
    return null;
  }
}

window.requireAuthenticatedRole = requireAuthenticatedRole;
console.log('[AUTH DEBUG] requireAuthenticatedRole:', typeof window.requireAuthenticatedRole);

function handleAuthError(error) {
  if (error.status === 401 || error.status === 403) {
    clearSession();
    const role = dashboardRole();
    window.location.replace(role ? loginPathForRole(role) : 'login.html');
  }
}
