import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SocialIcon } from '../lib/formPrimitives';
import { AnimatedPressable } from '../lib/animations';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { useIsMobile } from '../lib/responsive';
import { getBruneiNow } from '../lib/bruneiTime';
import { FACEBOOK_URL, INSTAGRAM_URL, TIKTOK_URL } from '../lib/contactInfo';
import BruneiClock from './BruneiClock';

export default function Footer() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const isMobile = useIsMobile();
  const styles = useMemo(() => makeStyles(colors, scaleFont), [colors, scaleFont]);

  // On mobile, navigation moves to the sticky bottom nav bar (see Navbar.js) — the
  // footer's links/social/clock become redundant screen-space there.
  if (isMobile) return null;

  const LINKS = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.aboutUs'), href: '/about-us' },
    { label: t('nav.deliveryPrice'), href: '/delivery-rates' },
    { label: t('nav.careers'), href: '/careers' },
    { label: t('nav.contactUs'), href: '/contact-us' },
    { label: t('footer.privacyPolicy'), href: '/privacy-policy' },
  ];

  return (
    <View style={styles.footer}>
      <View style={styles.linkRow}>
        {LINKS.map((link) => (
          <AnimatedPressable key={link.href} scaleTo={1.05} style={styles.linkItem} href={link.href} onPress={() => router.push(link.href)}>
            <Text style={styles.linkText}>{link.label}</Text>
          </AnimatedPressable>
        ))}
      </View>

      <View style={styles.socialRow}>
        <SocialIcon platform="facebook" url={FACEBOOK_URL} size={30} />
        <SocialIcon platform="instagram" url={INSTAGRAM_URL} size={30} />
        <SocialIcon platform="tiktok" url={TIKTOK_URL} size={30} />
      </View>

      <BruneiClock style={styles.clock} />
      <Text style={styles.copyright}>{t('footer.copyright').replace('{year}', String(getBruneiNow().getUTCFullYear()))}</Text>
    </View>
  );
}

function makeStyles(colors, scaleFont) {
  return StyleSheet.create({
    footer: {
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      paddingTop: 16,
      paddingBottom: 24,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    linkRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginBottom: 16,
    },
    linkItem: { paddingHorizontal: 12, paddingVertical: 6 },
    linkText: { fontSize: scaleFont(13), color: colors.textSecondary, fontWeight: '500' },
    socialRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
    clock: { fontSize: scaleFont(11), color: colors.textMuted, marginBottom: 6 },
    copyright: { fontSize: scaleFont(11), color: colors.textMuted },
  });
}
