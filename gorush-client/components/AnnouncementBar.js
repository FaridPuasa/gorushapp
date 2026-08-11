import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAnnouncement } from '../context/AnnouncementContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { ANNOUNCEMENT_BAR_HEIGHT } from '../lib/theme';
import { localizeAnnouncement } from '../lib/announcements';
import { AnimatedPressable } from '../lib/animations';

export default function AnnouncementBar() {
  const router = useRouter();
  const { colors } = useTheme();
  const { locale } = useLanguage();
  const { scaleFont } = useFontScale();
  const { dismissed, dismiss, announcement } = useAnnouncement();
  const styles = useMemo(() => makeStyles(colors, scaleFont), [colors, scaleFont]);

  if (dismissed || !announcement) return null;

  const { title } = localizeAnnouncement(announcement, locale);

  return (
    <View style={styles.bar}>
      <AnimatedPressable style={styles.body} onPress={() => router.push('/announcements')} scaleTo={1.05}>
        <Text style={styles.text} numberOfLines={1}>📢  {title}</Text>
        <Text style={styles.chevron}>›</Text>
      </AnimatedPressable>
      <AnimatedPressable style={styles.dismiss} onPress={dismiss} scaleTo={1.15}>
        <Text style={styles.dismissText}>✕</Text>
      </AnimatedPressable>
    </View>
  );
}

function makeStyles(colors, scaleFont) {
  return StyleSheet.create({
    bar: {
      height: ANNOUNCEMENT_BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.secondary,
      position: 'relative',
    },
    body: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: '100%', paddingHorizontal: 44 },
    text: { flexShrink: 1, color: '#fff', fontSize: scaleFont(12), fontWeight: '600', textAlign: 'center' },
    chevron: { color: '#fff', fontSize: scaleFont(16), fontWeight: 'bold', marginLeft: 8 },
    dismiss: { position: 'absolute', right: 0, top: 0, bottom: 0, paddingHorizontal: 16, justifyContent: 'center' },
    dismissText: { color: '#fff', fontSize: scaleFont(13), fontWeight: 'bold' },
  });
}
