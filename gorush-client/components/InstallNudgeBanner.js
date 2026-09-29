import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { useAuth } from '../context/AuthContext';
import { AnimatedPressable } from '../lib/animations';
import { isAlreadyInstalled } from '../lib/pwaInstall';

// One-time "get the app" nudge (2026-09-29) - same dismissible-bar shape
// as AnnouncementBar, shown to anyone who hasn't installed yet and
// hasn't dismissed this before on this device. Web-only (PWA install has
// no meaning inside an already-native app build), and hidden on the
// guide page itself since showing "go install it" there is redundant.
const DISMISS_KEY = 'gorush_install_banner_dismissed';

export default function InstallNudgeBanner() {
    const router = useRouter();
    const pathname = usePathname();
    const { isAdmin, isJpmc } = useAuth();
    const { colors } = useTheme();
    const { t } = useLanguage();
    const { scaleFont } = useFontScale();
    const [visible, setVisible] = useState(false);
    const styles = useMemo(() => makeStyles(colors, scaleFont), [colors, scaleFont]);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        (async () => {
            if (isAlreadyInstalled()) return;
            const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
            if (dismissed === '1') return;
            setVisible(true);
        })();
    }, []);

    const dismiss = useCallback(() => {
        setVisible(false);
        AsyncStorage.setItem(DISMISS_KEY, '1').catch(() => {});
    }, []);

    if (!visible || pathname === '/get-the-app' || isAdmin || isJpmc) return null;

    return (
        <View style={styles.bar}>
            <AnimatedPressable style={styles.body} onPress={() => router.push('/get-the-app')} scaleTo={1.05}>
                <Text style={styles.text} numberOfLines={1}>📲  {t('installBanner.text')}</Text>
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
            height: 40,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary,
            position: 'relative',
        },
        body: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: '100%', paddingHorizontal: 44 },
        text: { flexShrink: 1, color: '#fff', fontSize: scaleFont(12), fontWeight: '600', textAlign: 'center' },
        chevron: { color: '#fff', fontSize: scaleFont(16), fontWeight: 'bold', marginLeft: 8 },
        dismiss: { position: 'absolute', right: 0, top: 0, bottom: 0, paddingHorizontal: 16, justifyContent: 'center' },
        dismissText: { color: '#fff', fontSize: scaleFont(13), fontWeight: 'bold' },
    });
}
