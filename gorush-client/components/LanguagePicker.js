import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable } from '../lib/animations';

export default function LanguagePicker() {
  const { colors } = useTheme();
  const { locale, setLocale, t } = useLanguage();
  const { scaleFont } = useFontScale();

  return (
    <View style={styles.row}>
      {['en', 'bm'].map((code) => {
        const active = locale === code;
        return (
          <AnimatedPressable
            key={code}
            style={[styles.pill, { backgroundColor: active ? colors.primary : colors.subtleBackground, borderColor: colors.border }]}
            onPress={() => setLocale(code)}
            scaleTo={1.05}
          >
            <Text style={{ color: active ? '#fff' : colors.textPrimary, fontWeight: '600', fontSize: scaleFont(13) }}>
              {t(`languagePicker.${code === 'en' ? 'english' : 'malay'}`)}
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
