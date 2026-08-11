import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../lib/translations/en';
import bm from '../lib/translations/bm';

const LOCALE_KEY = 'gorush_locale';
const DICTIONARIES = { en, bm };
const LanguageContext = createContext(null);

function lookup(dict, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), dict);
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState('en');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(LOCALE_KEY);
      if (stored === 'en' || stored === 'bm') setLocaleState(stored);
    })();
  }, []);

  const setLocale = useCallback(async (next) => {
    setLocaleState(next);
    await AsyncStorage.setItem(LOCALE_KEY, next);
  }, []);

  const t = useCallback((path) => {
    const value = lookup(DICTIONARIES[locale], path);
    if (value !== undefined) return value;
    const fallback = lookup(DICTIONARIES.en, path);
    return fallback !== undefined ? fallback : path;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
