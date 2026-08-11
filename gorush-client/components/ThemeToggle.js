import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable } from '../lib/animations';

export default function ThemeToggle() {
  const { mode, setMode, colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();

  return (
    <View style={styles.row}>
      {['light', 'dark'].map((m) => {
        const active = mode === m;
        return (
          <AnimatedPressable
            key={m}
            style={[styles.pill, { backgroundColor: active ? colors.primary : colors.subtleBackground, borderColor: colors.border }]}
            onPress={() => setMode(m)}
            scaleTo={1.05}
          >
            <Text style={{ color: active ? '#fff' : colors.textPrimary, fontWeight: '600', fontSize: scaleFont(13) }}>
              {m === 'light' ? '☀️ ' : '🌙 '}{t(`themeToggle.${m}`)}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  pill: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginRight: 6 },
});
