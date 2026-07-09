import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import {
  getToken,
  getUser,
  hasRole as authHasRole,
  isAuthenticated as authIsAuthenticated,
  login as saveAuth,
  logout as clearAuth
} from '../utils/auth.js';
import { connectSocket, disconnectSocket, joinSocketRoom, leaveSocketRoom } from '../services/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());

  useEffect(() => {
    const token = getToken();
    if (user && token) {
      connectSocket(token);
      joinSocketRoom(user._id || user.id);
    } else {
      disconnectSocket();
    }

    return () => {};
  }, [user]);

  async function login(email, password) {
    const payload = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    saveAuth(payload.data.user, payload.data.token);
    connectSocket(payload.data.token);
    joinSocketRoom(payload.data.user._id || payload.data.user.id);
    setUser(payload.data.user);
    return payload.data.user;
  }

  async function register(form) {
    const payload = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(form)
    });
    return payload;
  }

  function logout() {
    leaveSocketRoom(user?._id || user?.id);
    disconnectSocket();
    clearAuth();
    setUser(null);
  }

  function updateUser(nextUser) {
    const token = getToken();
    if (!token) return;

    saveAuth(nextUser, token);
    setUser(nextUser);
  }

  function isAuthenticated() {
    return authIsAuthenticated();
  }

  function hasRole(role) {
    return authHasRole(role);
  }

  const value = useMemo(
    () => ({ user, token: getToken(), login, register, logout, updateUser, getUser, getToken, isAuthenticated, hasRole }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
