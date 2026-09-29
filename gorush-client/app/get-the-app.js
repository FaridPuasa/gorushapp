import React, { useEffect, useState, useCallback } from 'react';
import { Text, View, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { detectPlatform, isNonSafariIOSBrowser, isAlreadyInstalled } from '../lib/pwaInstall';

export default function GetTheApp() {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const formStyles = useFormStyles();
    const [platform, setPlatform] = useState('desktop');
    const [installed, setInstalled] = useState(false);
    const [nonSafariIOS, setNonSafariIOS] = useState(false);
    // Only Chromium browsers (Chrome/Edge/Samsung Internet) ever fire
    // beforeinstallprompt - Firefox Android and any older/unsupported
    // browser never will, so this button simply doesn't render for them
    // and the manual instructions below (always shown) are what they use
    // instead. Nobody is stuck without SOME working path.
    const [canAutoInstall, setCanAutoInstall] = useState(false);

    useEffect(() => {
        setPlatform(detectPlatform());
        setInstalled(isAlreadyInstalled());
        setNonSafariIOS(isNonSafariIOSBrowser());
        if (typeof window !== 'undefined' && window.__deferredInstallPrompt) {
            setCanAutoInstall(true);
        }
    }, []);

    const handleAutoInstall = useCallback(async () => {
        const promptEvent = typeof window !== 'undefined' && window.__deferredInstallPrompt;
        if (!promptEvent) return;
        if (typeof window.gtag === 'function') window.gtag('event', 'pwa_install_prompt_shown');
        const choice = await promptEvent.prompt();
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'pwa_install_prompt_outcome', { outcome: choice?.outcome || 'unknown' });
        }
        window.__deferredInstallPrompt = null;
        setCanAutoInstall(false);
    }, []);

    const pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://gorushbn.com/get-the-app';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pageUrl)}`;

    return (
        <PageScroll title={t('getApp.pageTitle')}>
            <Text style={formStyles.title}>{t('getApp.pageTitle')}</Text>
            <Text style={formStyles.subtitle}>{t('getApp.subtitle')}</Text>

            {installed ? (
                <Card icon="🎉" title={t('getApp.alreadyInstalled')} />
            ) : (
                <>
                    {platform === 'android' && (
                        <Card icon="🤖" title={t('getApp.androidTitle')}>
                            {canAutoInstall && (
                                <Pressable style={[styles.installButton, { backgroundColor: colors.primary }]} onPress={handleAutoInstall}>
                                    <Text style={styles.installButtonText}>{t('getApp.androidInstallButton')}</Text>
                                </Pressable>
                            )}
                            <Text style={[formStyles.fieldHint, { marginTop: canAutoInstall ? 16 : 0 }]}>{t('getApp.androidManualEyebrow')}</Text>
                            <Text style={formStyles.bodyText}>{t('getApp.androidManualBody')}</Text>
                        </Card>
                    )}

                    {platform === 'ios' && (
                        <Card icon="🍎" title={t('getApp.iosTitle')}>
                            {nonSafariIOS && (
                                <Text style={[formStyles.bodyText, { color: colors.warning, fontWeight: '600', marginBottom: 12 }]}>
                                    {t('getApp.iosNonSafariNote')}
                                </Text>
                            )}
                            <Text style={formStyles.sectionHeader}>{t('getApp.iosStep1')}</Text>
                            <Text style={formStyles.bodyText}>{t('getApp.iosStep1Body')}</Text>
                            <Text style={[formStyles.sectionHeader, { marginTop: 12 }]}>{t('getApp.iosStep2')}</Text>
                            <Text style={formStyles.bodyText}>{t('getApp.iosStep2Body')}</Text>
                            <Text style={[formStyles.sectionHeader, { marginTop: 12 }]}>{t('getApp.iosStep3')}</Text>
                            <Text style={formStyles.bodyText}>{t('getApp.iosStep3Body')}</Text>
                        </Card>
                    )}

                    {platform === 'desktop' && (
                        <Card icon="💻" title={t('getApp.desktopTitle')}>
                            <Text style={formStyles.bodyText}>{t('getApp.desktopBody')}</Text>
                            <View style={styles.qrWrap}>
                                <Image source={{ uri: qrUrl }} style={styles.qrImage} />
                            </View>
                        </Card>
                    )}
                </>
            )}
        </PageScroll>
    );
}

const styles = StyleSheet.create({
    installButton: {
        alignSelf: Platform.OS === 'web' ? 'flex-start' : 'stretch',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 10,
        alignItems: 'center',
    },
    installButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    qrWrap: { alignItems: 'center', marginTop: 16 },
    qrImage: { width: 220, height: 220 },
});
