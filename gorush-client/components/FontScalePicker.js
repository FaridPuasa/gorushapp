import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { useLanguage } from '../context/LanguageContext';
import { AnimatedPressable } from '../lib/animations';

export default function FontScalePicker() {
  const { colors } = useTheme();
  const { scale, setScale, scaleFont } = useFontScale();
  const { t } = useLanguage();

  return (
    <View style={styles.row}>
      {['small', 'regular', 'large'].map((s) => {
        const active = scale === s;
        return (
          <AnimatedPressable
            key={s}
            style={[styles.pill, { backgroundColor: active ? colors.primary : colors.subtleBackground, borderColor: colors.border }]}
            onPress={() => setScale(s)}
            scaleTo={1.05}
          >
            <Text style={{ color: active ? '#fff' : colors.textPrimary, fontWeight: '700', fontSize: scaleFont(13) }}>
              {t(`fontScale.${s}`)}
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
