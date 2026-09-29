import React, { useEffect, useState, useCallback } from 'react';
import { Text, View, Image, Pressable, StyleSheet } from 'react-native';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { detectPlatform, isNonSafariIOSBrowser, isAlreadyInstalled } from '../lib/pwaInstall';

// One numbered step - shared by both the Android manual fallback and the
// iOS instructions, so both read the same clear "step 1, step 2..." way
// instead of a wall of plain paragraph text.
function Step({ number, title, body, colors }) {
    return (
        <View style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>{number}</Text>
            </View>
            <View style={styles.stepTextWrap}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.stepBody, { color: colors.textSecondary }]}>{body}</Text>
            </View>
        </View>
    );
}

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
    // and the manual steps below (always shown) are what they use
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
                                <View style={styles.installButtonWrap}>
                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.installButton,
                                            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                                        ]}
                                        onPress={handleAutoInstall}
                                    >
                                        <Text style={styles.installButtonIcon}>⬇️</Text>
                                        <Text style={styles.installButtonText}>{t('getApp.androidInstallButton')}</Text>
                                    </Pressable>
                                </View>
                            )}
                            <Text style={[formStyles.fieldHint, { marginTop: canAutoInstall ? 20 : 0, marginBottom: 12 }]}>
                                {t('getApp.androidManualEyebrow')}
                            </Text>
                            <Step number="1" title={t('getApp.androidManualStep1')} body={t('getApp.androidManualStep1Body')} colors={colors} />
                            <Step number="2" title={t('getApp.androidManualStep2')} body={t('getApp.androidManualStep2Body')} colors={colors} />
                        </Card>
                    )}

                    {platform === 'ios' && (
                        <Card icon="🍎" title={t('getApp.iosTitle')}>
                            {nonSafariIOS && (
                                <Text style={[formStyles.bodyText, { color: colors.warning, fontWeight: '600', marginBottom: 16 }]}>
                                    {t('getApp.iosNonSafariNote')}
                                </Text>
                            )}
                            <Step number="1" title={t('getApp.iosStep1')} body={t('getApp.iosStep1Body')} colors={colors} />
                            <Step number="2" title={t('getApp.iosStep2')} body={t('getApp.iosStep2Body')} colors={colors} />
                            <Step number="3" title={t('getApp.iosStep3')} body={t('getApp.iosStep3Body')} colors={colors} />
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
    installButtonWrap: { alignItems: 'center' },
    installButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 36,
        borderRadius: 14,
        minWidth: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    installButtonIcon: { fontSize: 18 },
    installButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
    stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    stepBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    stepTextWrap: { flex: 1 },
    stepTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    stepBody: { fontSize: 14, lineHeight: 20 },
    qrWrap: { alignItems: 'center', marginTop: 16 },
    qrImage: { width: 220, height: 220 },
});
