import React, { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { useLanguage } from '../context/LanguageContext';
import { AnimatedPressable } from '../lib/animations';
import { buildHistoryTimeline } from '../lib/trackingHistory';
import TrackingResultModal from './TrackingResultModal';

// A compact "Track Order" button for anywhere a tracking number is already known (My
// Orders row) — fetches the same GET /api/orders/track/:trackingNumber Home's own "Track
// Your Order" section uses, then opens the same shared TrackingResultModal.
export default function TrackOrderButton({ trackingNumber }) {
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePress = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/orders/track/${encodeURIComponent(trackingNumber)}`);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || t('home.tracking.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const fallbackLabel = t('home.tracking.statusUpdate');
  const { historyEntries, currentStatusValue } = result
    ? buildHistoryTimeline(result.history, fallbackLabel, result.status)
    : { historyEntries: [], currentStatusValue: null };

  return (
    <>
      <AnimatedPressable
        scaleTo={1.04}
        onPress={handlePress}
        disabled={loading}
        style={{
          alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 9,
          borderRadius: 8, marginTop: 12,
        }}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={{ color: '#fff', fontWeight: '700', fontSize: scaleFont(13) }}>🔍 {t('myOrders.trackOrder')}</Text>}
      </AnimatedPressable>

      {error && (
        <Text style={{ color: colors.error, fontSize: scaleFont(12), marginTop: 6 }}>{error}</Text>
      )}

      <TrackingResultModal
        visible={!!result}
        trackingNumber={result?.trackingNumber || trackingNumber}
        historyEntries={historyEntries}
        currentStatusValue={currentStatusValue}
        onClose={() => setResult(null)}
      />
    </>
  );
}
