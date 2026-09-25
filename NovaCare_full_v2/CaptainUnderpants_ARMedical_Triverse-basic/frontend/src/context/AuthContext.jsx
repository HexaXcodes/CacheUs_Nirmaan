// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate user from token on mount
  useEffect(() => {
    const init = async () => {
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }
      try {
        const me = await authService.me();
        setUser(me);
      } catch {
        authService.clearToken();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    authService.saveToken(data.token);
    const me = await authService.me();
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authService.register(payload);
    authService.saveToken(data.token);
    const me = await authService.me();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    authService.clearToken();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const me = await authService.getProfile();
    setUser(me);
    return me;
  }, []);

  const updateMedicalInfo = useCallback(async (info) => {
    const res = await authService.updateMedicalInfo(info);
    setUser((prev) => (prev ? { ...prev, medicalInfo: res.medicalInfo } : prev));
    return res;
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshProfile, updateMedicalInfo }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
