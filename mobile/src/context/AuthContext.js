/**
 * DOCUMIND-AI Mobile Authentication Context
 * Shared session handling, token persistence via SecureStore,
 * and unified API client configuration
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, configureApiClient } from '../../../packages/api-client/index.js';
import {
  saveAuthToken,
  getAuthToken,
  removeAuthToken,
  saveLocalUser,
  getLocalUser,
} from '../services/storage.js';

const AuthContext = createContext(null);
const API_URL_KEY = 'documind_api_base_url';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const defaultUrl = (typeof process !== 'undefined' && (process.env.EXPO_PUBLIC_API_URL || process.env.API_URL)) || 'http://localhost:5000/api';
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultUrl);

  // Initialize API client & restore session
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Load custom or saved API URL (e.g. for LAN testing or production on physical phone)
        const savedUrl = await AsyncStorage.getItem(API_URL_KEY);
        const resolvedUrl = savedUrl || defaultUrl;
        setApiBaseUrl(resolvedUrl);

        configureApiClient({
          baseUrl: resolvedUrl,
          getToken: getAuthToken,
          onUnauthorized: async () => {
            await removeAuthToken();
            setUser(null);
            setIsAuthenticated(false);
          },
        });

        const token = await getAuthToken();
        const cachedUser = await getLocalUser();

        if (token && cachedUser) {
          setUser(cachedUser);
          setIsAuthenticated(true);
        }

        if (token) {
          try {
            const profileRes = await apiClient.auth.getProfile();
            const activeUser = profileRes.data?.user || profileRes.user || profileRes.data;
            if (activeUser) {
              setUser(activeUser);
              setIsAuthenticated(true);
              await saveLocalUser(activeUser);
            }
          } catch (err) {
            console.warn('Profile fetch failed with existing token, maintaining cached session:', err);
          }
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const updateApiBaseUrl = async (newUrl) => {
    try {
      const formatted = newUrl.replace(/\/$/, '');
      setApiBaseUrl(formatted);
      await AsyncStorage.setItem(API_URL_KEY, formatted);
      configureApiClient({
        baseUrl: formatted,
        getToken: getAuthToken,
      });
    } catch (err) {
      console.warn('Failed to save API URL:', err);
    }
  };

  const login = async (email, password) => {
    const res = await apiClient.auth.login({ email, password });
    const token = res.token || res.data?.token;
    const userData = res.user || res.data?.user;

    if (token) {
      await saveAuthToken(token);
    }
    if (userData) {
      setUser(userData);
      await saveLocalUser(userData);
    }
    setIsAuthenticated(true);
    return res;
  };

  const register = async (userData) => {
    const res = await apiClient.auth.register(userData);
    const token = res.token || res.data?.token;
    const newUser = res.user || res.data?.user;

    if (token) {
      await saveAuthToken(token);
    }
    if (newUser) {
      setUser(newUser);
      await saveLocalUser(newUser);
    }
    setIsAuthenticated(true);
    return res;
  };

  const logout = async () => {
    try {
      await apiClient.auth.logout();
    } catch (_) {}
    await removeAuthToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        apiBaseUrl,
        updateApiBaseUrl,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
