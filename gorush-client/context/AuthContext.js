import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';

const TOKEN_KEY = 'gorush_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (authToken) => {
    const response = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setUser(response.data);
  }, []);

  const applyToken = useCallback(async (authToken) => {
    await AsyncStorage.setItem(TOKEN_KEY, authToken);
    setToken(authToken);
    await fetchProfile(authToken);
  }, [fetchProfile]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          setToken(storedToken);
          await fetchProfile(storedToken);
        }
      } catch (err) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProfile]);

  const login = useCallback(async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    await applyToken(response.data.token);
    return response.data;
  }, [applyToken]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (token) await fetchProfile(token);
  }, [token, fetchProfile]);

  const value = {
    user,
    token,
    isGuest: !token,
    isAdmin: user?.role === 'admin',
    isJpmc: user?.role === 'jpmc',
    isGorush: user?.role === 'gorush',
    // Anyone allowed onto the JPMC portal page - admin can see it too, for support.
    canViewJpmcPortal: ['jpmc', 'gorush', 'admin'].includes(user?.role),
    loading,
    login,
    logout,
    applyToken,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
