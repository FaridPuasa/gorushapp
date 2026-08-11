import React, { useState } from 'react';
import { Animated, Text, TextInput, View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { api } from '../lib/api';
import { useFormStyles } from '../lib/formPrimitives';
import { AnimatedPressable, FadeIn, FadeInUp } from '../lib/animations';
import { CONTENT_MAX_WIDTH } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useChromeHeight } from '../context/AnnouncementContext';
import { buildHistoryTimeline } from '../lib/trackingHistory';
import TrackingResultModal from './TrackingResultModal';

const BG_IMAGE = require('../assets/home-bg.jpg');

export default function TrackingLookup({ scrollY }) {
  const { height } = useWindowDimensions();
  const chromeHeight = useChromeHeight();
  const sectionHeight = Math.max(height - chromeHeight, 320);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sectionTop, setSectionTop] = useState(0);

  const handleCheck = async () => {
    const trimmed = trackingNumber.trim();
    if (!trimmed) {
      setError(t('home.tracking.emptyError'));
      setResult(null);
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const response = await api.get(`/api/orders/track/${encodeURIComponent(trimmed)}`);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || t('home.tracking.genericError'));
    } finally {
      setLoading(false);
    }
  };

  // The order's own currentStatus field can drift out of sync with its history (a real
  // data-consistency gap on the legacy system's side) — deriving "current" from the latest
  // timeline entry instead guarantees the modal's header never contradicts the timeline
  // below it. See lib/trackingHistory.js for the full pipeline (shared with My Orders'
  // per-row "Track Order" button).
  const fallbackLabel = t('home.tracking.statusUpdate');
  const { historyEntries, currentStatusValue } = buildHistoryTimeline(result?.history, fallbackLabel, result?.status);

  const content = (
    <View style={{ width: '100%', minHeight: sectionHeight, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 40 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.12)' }} />
      <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH }}>
        <FadeIn>
          <Text style={[formStyles.title, { fontSize: formStyles.title.fontSize + 10, marginBottom: 10, color: '#fff' }]}>{t('home.tracking.title')}</Text>
          <Text style={[formStyles.subtitle, { fontSize: formStyles.subtitle.fontSize + 2, marginBottom: 26, color: '#eee' }]}>{t('home.tracking.description')}</Text>
        </FadeIn>

        <FadeInUp delay={60}>
          <TextInput
            style={[formStyles.input, { marginBottom: 10 }]}
            placeholder={t('home.tracking.placeholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            value={trackingNumber}
            onChangeText={setTrackingNumber}
          />
          <AnimatedPressable scaleTo={1.04} style={[formStyles.button, { backgroundColor: colors.secondary, marginTop: 0 }]} onPress={handleCheck} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{t('home.tracking.check')}</Text>}
          </AnimatedPressable>

          {error && (
            <View style={[formStyles.statusBanner, formStyles.statusErrorBanner, { marginTop: 12 }]}>
              <Text style={formStyles.statusTextError}>⚠️  {error}</Text>
            </View>
          )}
        </FadeInUp>
      </View>
    </View>
  );

  const modal = (
    <TrackingResultModal
      visible={!!result}
      trackingNumber={result?.trackingNumber}
      historyEntries={historyEntries}
      currentStatusValue={currentStatusValue}
      onClose={() => setResult(null)}
    />
  );

  // "Pin" the background to the viewport while this section scrolls past it, without
  // relying on position:'fixed' (which ignores this section's own bounds entirely and
  // bleeds across the whole page — background-attachment:'fixed' has the same escape-its-
  // container risk once nested inside another scrolling element). Instead this drives an
  // oversized background image with a scroll-linked transform: as the section moves up
  // by some amount, the image is nudged down by the same amount, canceling out its own
  // motion so it reads as fixed — clipped correctly to the section by overflow:'hidden'
  // (transforms, unlike fixed-position children, are always clipped normally).
  // Kept small on purpose — a large range needs a much taller `cover`-mode image to have
  // room to travel, which visibly crops in tighter (reads as "zoomed in"); this trades a
  // little travel distance (the image can drift with the page on a very long scroll once
  // it hits this limit) for keeping the image looking like its normal, un-zoomed self.
  const parallaxRange = 50;
  const translateY = scrollY
    ? Animated.subtract(scrollY, sectionTop).interpolate({
      inputRange: [-parallaxRange, parallaxRange],
      outputRange: [-parallaxRange, parallaxRange],
      extrapolate: 'clamp',
    })
    : 0;

  return (
    <>
      <View
        style={{ width: '100%', minHeight: sectionHeight, position: 'relative', overflow: 'hidden' }}
        onLayout={(e) => setSectionTop(e.nativeEvent.layout.y)}
      >
        <Animated.Image
          source={BG_IMAGE}
          resizeMode="cover"
          style={{
            position: 'absolute',
            top: -parallaxRange,
            left: 0,
            width: '100%',
            height: sectionHeight + parallaxRange * 2,
            transform: [{ translateY }],
          }}
        />
        {content}
      </View>
      {modal}
    </>
  );
}
