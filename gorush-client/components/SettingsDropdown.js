import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable, PopTransition } from '../lib/animations';
import ThemeToggle from './ThemeToggle';
import LanguagePicker from './LanguagePicker';
import FontScalePicker from './FontScalePicker';

export default function SettingsDropdown({ isOpen, onToggle, align = 'left', label, extraItems = [], showLanguage = true }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const router = useRouter();
  const chevronSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronSpin, { toValue: isOpen ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [isOpen, chevronSpin]);

  const chevronRotate = chevronSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.wrapper}>
      <AnimatedPressable scaleTo={1.04} style={styles.trigger} onPress={onToggle}>
        <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: scaleFont(13) }}>⚙️ {label || t('nav.settings')}</Text>
        <Animated.Text style={{ color: colors.textSecondary, fontSize: scaleFont(11), marginLeft: 4, transform: [{ rotate: chevronRotate }] }}>▾</Animated.Text>
      </AnimatedPressable>

      {isOpen && (
        <PopTransition style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }, align === 'right' ? { right: 0 } : { left: 0 }]}>
          <Text style={[styles.groupLabel, { color: colors.textMuted, fontSize: scaleFont(11) }]}>{t('themeToggle.light')}/{t('themeToggle.dark')}</Text>
          <ThemeToggle />

          {showLanguage && (
            <>
              <Text style={[styles.groupLabel, { color: colors.textMuted, marginTop: 14, fontSize: scaleFont(11) }]}>{t('languagePicker.groupLabel')}</Text>
              <LanguagePicker />
            </>
          )}

          <Text style={[styles.groupLabel, { color: colors.textMuted, marginTop: 14, fontSize: scaleFont(11) }]}>{t('fontScale.groupLabel')}</Text>
          <FontScalePicker />

          {extraItems.length > 0 && (
            <View style={[styles.extraItems, { borderTopColor: colors.border }]}>
              {extraItems.map((item) => (
                <AnimatedPressable
                  key={item.href}
                  scaleTo={1.03}
                  style={styles.extraItem}
                  href={item.href}
                  onPress={() => { router.push(item.href); onToggle(); }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: scaleFont(14) }}>{item.icon ? `${item.icon} ` : ''}{item.label}</Text>
                </AnimatedPressable>
              ))}
            </View>
          )}
        </PopTransition>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  trigger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 },
  panel: {
    position: 'absolute',
    top: '100%',
    marginTop: 8,
    minWidth: 240,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    zIndex: 100,
  },
  groupLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  extraItems: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  extraItem: { paddingVertical: 8 },
});
