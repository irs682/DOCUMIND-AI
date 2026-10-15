/**
 * DOCUMIND-AI Mobile Theme Context
 * Synchronizes with shared design tokens and provides dark/light mode themes
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radii, typography } from '../../../packages/design-tokens/index.js';

const ThemeContext = createContext(null);
const THEME_PREF_KEY = 'documind_theme_preference';

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('dark'); // 'dark' | 'light' | 'system'

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_PREF_KEY);
        if (saved) {
          setThemeMode(saved);
        } else {
          setThemeMode(systemScheme === 'light' ? 'light' : 'dark');
        }
      } catch (_) {}
    })();
  }, [systemScheme]);

  const activeTheme = themeMode === 'system'
    ? (systemScheme === 'light' ? 'light' : 'dark')
    : themeMode;

  const currentTokens = {
    mode: activeTheme,
    colors: {
      ...colors,
      current: colors[activeTheme] || colors.dark,
    },
    spacing,
    radii,
    typography,
  };

  const toggleTheme = async () => {
    const next = activeTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    try {
      await AsyncStorage.setItem(THEME_PREF_KEY, next);
    } catch (_) {}
  };

  const setTheme = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_PREF_KEY, mode);
    } catch (_) {}
  };

  return (
    <ThemeContext.Provider value={{ activeTheme, themeMode, toggleTheme, setTheme, tokens: currentTokens }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;
