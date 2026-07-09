const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function login(user, token) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getUser() {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    logout();
    return null;
  }
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken() && getUser());
}

export function hasRole(role) {
  const user = getUser();
  const userRole = normalizeRole(user?.role);

  if (Array.isArray(role)) {
    return Boolean(userRole && role.map(normalizeRole).includes(userRole));
  }

  return Boolean(userRole && userRole === normalizeRole(role));
}
