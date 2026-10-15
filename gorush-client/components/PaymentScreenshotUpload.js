import React, { useState } from 'react';
import { Text, View, Image, ActivityIndicator, Modal, Pressable, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { useLanguage } from '../context/LanguageContext';
import { useFormStyles } from '../lib/formPrimitives';
import { AnimatedPressable } from '../lib/animations';

// On web, expo-image-picker's base64 option can come back as an already-
// complete data URI (browsers' FileReader.readAsDataURL includes the
// "data:<mime>;base64," header itself) rather than bare base64 - same fix as
// components/careers/DocumentUploads.js's stripDataUriPrefix.
function stripDataUriPrefix(value) {
  const match = typeof value === 'string' && value.match(/^data:[^;]+;base64,(.+)$/s);
  return match ? match[1] : value;
}

// Upload/view a Bank Transfer/Bill Payment order's payment screenshot - used
// both right after order submission (order-form.js, guest or logged in) and
// from My Orders (registered users). One-shot by design: once uploaded, the
// customer can only View it - no reupload/remove (that's reserved for staff
// on grfmxstatusupdate's own /bankTransferBillPayment page; the backend
// rejects a second upload for the same reason). Guest-safe: the backend
// endpoints are optionalAuth (keyed by orderId, not a logged-in user), so
// `token` here is optional and only included for the audit trail when
// available. Separate feature/field from JPMC's own payment-proof control
// (app/jpmc-portal.js's PaymentProofControl) - not shared, different
// product/workflow.
export default function PaymentScreenshotUpload({ orderId, initialHasScreenshot = false, token }) {
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const { t } = useLanguage();
  const formStyles = useFormStyles();

  const [hasScreenshot, setHasScreenshot] = useState(!!initialHasScreenshot);
  const [picking, setPicking] = useState(false);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [loadingView, setLoadingView] = useState(false);
  const [error, setError] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const pickAndUpload = async () => {
    setError('');
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const dataUri = `data:${mime};base64,${stripDataUriPrefix(asset.base64)}`;
      await api.post(`/api/orders/${orderId}/payment-screenshot`, { imageBase64: dataUri }, { headers: authHeader });
      setHasScreenshot(true);
      setShowThankYou(true);
    } catch (e) {
      setError(e.response?.data?.error || t('order.paymentScreenshotUploadFailed'));
    } finally {
      setPicking(false);
    }
  };

  const openViewer = async () => {
    setError('');
    setLoadingView(true);
    try {
      const res = await api.get(`/api/orders/${orderId}/payment-screenshot`, { headers: authHeader });
      setViewerUrl(res.data.url);
    } catch (e) {
      setError(e.response?.data?.error || t('order.paymentScreenshotLoadFailed'));
    } finally {
      setLoadingView(false);
    }
  };

  const busy = picking || loadingView;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {hasScreenshot ? (
          <AnimatedPressable
            scaleTo={1.04}
            onPress={openViewer}
            disabled={busy}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          >
            {loadingView ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: colors.textPrimary }}>🖼️ {t('order.viewPaymentScreenshot')}</Text>}
          </AnimatedPressable>
        ) : (
          <AnimatedPressable
            scaleTo={1.03}
            onPress={pickAndUpload}
            disabled={busy}
            style={[formStyles.button, { paddingHorizontal: 20, alignSelf: 'center' }]}
          >
            {picking ? <ActivityIndicator color="#fff" size="small" /> : <Text style={formStyles.buttonText}>📤 {t('order.uploadPaymentScreenshot')}</Text>}
          </AnimatedPressable>
        )}
      </View>
      {error ? <Text style={[formStyles.fieldError, { marginTop: 6, textAlign: 'center' }]}>{error}</Text> : null}

      <Modal visible={!!viewerUrl} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 }} onPress={() => setViewerUrl(null)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, width: '100%', maxWidth: 560 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: scaleFont(15), fontWeight: '700', color: colors.textPrimary }}>{t('order.viewPaymentScreenshot')}</Text>
              <AnimatedPressable scaleTo={1.1} onPress={() => setViewerUrl(null)} style={{ padding: 4 }}>
                <Text style={{ fontSize: scaleFont(18), color: colors.textMuted }}>✕</Text>
              </AnimatedPressable>
            </View>
            {viewerUrl && <Image source={{ uri: viewerUrl }} accessibilityLabel="Payment screenshot" style={{ width: '100%', height: 360, borderRadius: 8, backgroundColor: colors.subtleBackground }} resizeMode="contain" />}
            <AnimatedPressable
              scaleTo={1.03}
              onPress={() => viewerUrl && Linking.openURL(viewerUrl)}
              style={[formStyles.button, { alignSelf: 'flex-start', paddingHorizontal: 20, marginTop: 12 }]}
            >
              <Text style={formStyles.buttonText}>Download</Text>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showThankYou} transparent animationType="fade" onRequestClose={() => setShowThankYou(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 }} onPress={() => setShowThankYou(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <Text style={{ fontSize: scaleFont(40), marginBottom: 10 }}>✅</Text>
            <Text style={{ fontSize: scaleFont(17), fontWeight: '700', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' }}>
              {t('order.paymentScreenshotThankYouTitle')}
            </Text>
            <Text style={{ fontSize: scaleFont(13), color: colors.textMuted, textAlign: 'center', marginBottom: 18, lineHeight: scaleFont(19) }}>
              {t('order.paymentScreenshotThankYouBody')}
            </Text>
            <AnimatedPressable scaleTo={1.03} onPress={() => setShowThankYou(false)} style={[formStyles.button, { paddingHorizontal: 32, alignSelf: 'center' }]}>
              <Text style={formStyles.buttonText}>{t('order.gotIt')}</Text>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
