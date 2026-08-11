import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FONT_SCALE_KEY = 'gorush_fontscale';
// PC/web screens sit further from the eye than a phone and have far more room, so each
// step reads comfortably larger there — mobile keeps its original, more compact scale.
const MULTIPLIERS = Platform.OS === 'web'
  ? { small: 1.0, regular: 1.3, large: 1.6 }
  : { small: 0.8, regular: 1, large: 1.3 };
const FontScaleContext = createContext(null);

export function FontScaleProvider({ children }) {
  const [scale, setScaleState] = useState('regular');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(FONT_SCALE_KEY);
      if (stored && MULTIPLIERS[stored]) setScaleState(stored);
    })();
  }, []);

  const setScale = useCallback(async (next) => {
    setScaleState(next);
    await AsyncStorage.setItem(FONT_SCALE_KEY, next);
  }, []);

  const scaleFont = useCallback((base) => Math.round(base * MULTIPLIERS[scale]), [scale]);

  const value = useMemo(() => ({ scale, setScale, scaleFont }), [scale, setScale, scaleFont]);

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

export function useFontScale() {
  const ctx = useContext(FontScaleContext);
  if (!ctx) throw new Error('useFontScale must be used within a FontScaleProvider');
  return ctx;
}
