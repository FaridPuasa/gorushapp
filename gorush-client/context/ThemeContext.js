import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS } from '../lib/theme';

const THEME_KEY = 'gorush_theme';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('light');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') setModeState(stored);
    })();
  }, []);

  const setMode = useCallback(async (next) => {
    setModeState(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  // Native <select>/<option> dropdown popups, scrollbars, etc. are rendered by the browser
  // itself and ignore our own CSS colors — color-scheme is the standard way to tell the
  // browser to render those native controls in their dark variant too.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.style.colorScheme = mode;
    }
  }, [mode]);

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  // TextInput's placeholder color is a separate native `placeholderTextColor` prop, not
  // covered by our `color` style — on web the actual <input>/<textarea> placeholder is
  // styled via CSS `::placeholder`, so inject/update one global rule here rather than
  // threading placeholderTextColor through every TextInput call site in the app.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let styleEl = document.getElementById('theme-placeholder-color');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-placeholder-color';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `::placeholder { color: ${colors.textMuted} !important; opacity: 1 !important; }`;
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
