// Shared tracking-number detail popup for the partner Dashboard and Search
// Jobs pages - replaces both the dashboard's old inline search-result card
// and Search Jobs' own inline "View Details" modal, since both need the
// exact same content plus the "Other Parcels for This Customer" panel
// (grfmxstatusupdate's dashboard.ejs loadRelatedOrders) and clicking any
// related tracking number must open ITS OWN detail popup in turn - which
// only works cleanly from one shared component.
//
// Usage: render once per page with `trackingNumber` set to whatever's
// currently open (or null), and pass the same setter as `onOpenTracking` so
// a click on a related-order chip swaps which tracking number is shown.
import React, { useEffect, useState, useRef } from 'react';
import { Text, View, Modal, Pressable, ScrollView, ActivityIndicator, Image, Linking } from 'react-native';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AnimatedPressable } from '../lib/animations';
import { Badge, Section, DetailField, formatDMY, gdexStyleLocation, useDenseFontScale } from '../lib/partnerUi';
import {
  buildHistoryTimeline, canonicalStatus, displayStatusLabel, formatHistoryDate,
  getStatusStyle, historyReason,
} from '../lib/trackingHistory';

const FALLBACK_STATUS_LABEL = 'Status Update';

// For "Out for Delivery"/"Self Collect"/"Failed Delivery", grfmxstatusupdate's
// own backend writes the DRIVER/DISPATCHER'S NAME into lastLocation
// (confirmed live: "Out for Delivery" | lastLocation: "Leo" - the same value
// as lastAssignedTo) rather than an actual place. gdexStyleLocation()
// replaces those specific statuses with the exact generic wording
// grfmxstatusupdate's own GDEX API integration already uses for them ("Go
// Rush Driver" / "Go Rush Kiulap Office" / "Go Rush Warehouse" - see its
// own definition for the confirmed source), so a step still shows something
// rather than going blank, just never the person's identity.
function safeStepLocation(entry, status, order) {
  return gdexStyleLocation(entry.lastLocation, status, order);
}

// A real GPS coordinate captured by the driver app at the moment of this
// event - unlike lastLocation (a free-text label that doubles as a driver
// name for some statuses, see above), this is never an identity, just a
// place, so it's always safe to show. Matches grfmxstatusupdate's own rule:
// shown only for Completed or a failed-delivery step, via a Google Maps link.
function GpsLink({ entry, status, colors, scaleFont }) {
  if (entry.latitude == null || entry.longitude == null) return null;
  const isRelevant = status.toLowerCase() === 'completed' || status.toLowerCase().includes('failed');
  if (!isRelevant) return null;
  const url = `https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`;
  return (
    <AnimatedPressable scaleTo={1.04} onPress={() => Linking.openURL(url)}>
      <Text style={{ fontSize: scaleFont(11), color: colors.primary, textAlign: 'center', marginTop: 2, textDecorationLine: 'underline' }}>
        📍 {Number(entry.latitude).toFixed(5)}, {Number(entry.longitude).toFixed(5)}
      </Text>
    </AnimatedPressable>
  );
}

// Full-screen lightbox - matches grfmxstatusupdate's own #podPhotoLightbox
// exactly: near-black backdrop, image capped at 92% of the screen,
// double-click/double-tap toggles 2x zoom, clicking the backdrop (not the
// photo itself) or the X closes and resets zoom.
const DOUBLE_TAP_MS = 300;
function PodPhotoLightbox({ url, onClose, colors, scaleFont }) {
  const [zoomed, setZoomed] = useState(false);
  const lastTapRef = React.useRef(0);

  const close = () => { setZoomed(false); onClose(); };
  const handleImagePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) setZoomed((z) => !z);
    lastTapRef.current = now;
  };

  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }} onPress={close}>
        <AnimatedPressable scaleTo={1.1} onPress={close} style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
          <Text style={{ color: '#fff', fontSize: scaleFont(22) }}>✕</Text>
        </AnimatedPressable>
        {url && (
          // Double-click/double-tap toggles 2x zoom (same gesture
          // grfmxstatusupdate's lightbox uses) - stopPropagation so tapping
          // the photo itself never closes the viewer, only the backdrop does.
          <Pressable onPress={(e) => { e.stopPropagation(); handleImagePress(); }} style={{ width: '92%', height: '92%' }}>
            <Image
              source={{ uri: url }}
              style={{ width: '100%', height: '100%', transform: [{ scale: zoomed ? 2 : 1 }] }}
              resizeMode="contain"
            />
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}

// POD (proof-of-delivery) photos for this Complete/Fail event - fetched
// lazily (signed URLs from a private Supabase bucket, see
// gorush-server/lib/podImageStorage.js) only once the button is pressed.
// Matches grfmxstatusupdate's own flow: "View Photos (N)" reveals small
// clickable thumbnails inline, and clicking one opens the full-screen
// lightbox above - not a single photo swapped inside a card.
function PodPhotosButton({ historyId, token, colors, scaleFont }) {
  const [urls, setUrls] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const toggle = async () => {
    if (urls) { setUrls(null); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/partner/history/${historyId}/pod-photos`, { headers: { Authorization: `Bearer ${token}` } });
      setUrls(res.data.urls);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load photos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedPressable scaleTo={1.04} onPress={toggle} disabled={loading} style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : (
          <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: colors.primary }}>🖼️ View Photo{urls ? `s (${urls.length})` : 's'}</Text>
        )}
      </AnimatedPressable>
      {error ? <Text style={{ fontSize: scaleFont(10), color: colors.error, marginTop: 2 }}>{error}</Text> : null}

      {urls && urls.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {urls.map((u, i) => (
            <AnimatedPressable key={i} scaleTo={1.08} onPress={() => setLightboxUrl(u)}>
              <Image source={{ uri: u }} style={{ width: 48, height: 48, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.subtleBackground }} resizeMode="cover" />
            </AnimatedPressable>
          ))}
        </View>
      )}

      <PodPhotoLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} colors={colors} scaleFont={scaleFont} />
    </>
  );
}

// Desktop stepper node, same design as TrackingResultModal.js's own desktop
// branch (the customer-facing tracking popup) - a small dot joined to its
// neighbors by a connecting line, current step gets a bordered bubble with a
// big icon. Reused here rather than reinvented so both popups in this app
// look and behave identically. Adds one line beyond that component's own
// design: the step's location (K1/K2 collapsed to "Warehouse", and never the
// assigned driver's name - see safeStepLocation above).
function HistoryStep({ entry, isCurrent, isLast, colors, scaleFont, t, token, order }) {
  const status = canonicalStatus(entry, FALLBACK_STATUS_LABEL);
  const label = displayStatusLabel(status, t);
  const reason = historyReason(entry);
  const style = getStatusStyle(status, colors);
  const location = safeStepLocation(entry, status, order);
  return (
    // alignItems: 'center' (both here and on the row these steps are mapped
    // into) centers each step's whole content block - dot+text, or the much
    // taller "current" bubble - on the row's shared vertical center, so the
    // connector lines (which sit on that same center line) run straight
    // through the middle of every step's details instead of along their top.
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 150, alignItems: 'center' }}>
        {!isCurrent && (
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: style.color }} />
        )}
        {isCurrent ? (
          <View style={{
            alignItems: 'center', width: 140,
            backgroundColor: colors.background, borderRadius: 16, borderWidth: 1, borderColor: style.color,
            paddingVertical: 12, paddingHorizontal: 10,
          }}>
            <Text style={{ fontSize: scaleFont(24), marginBottom: 4 }}>{style.icon}</Text>
            <Text style={{ fontSize: scaleFont(14), fontWeight: '700', color: style.color, textAlign: 'center' }}>{label}</Text>
            <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>{formatHistoryDate(entry.dateUpdated)}</Text>
            {location ? <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>📍 {location}</Text> : null}
            <GpsLink entry={entry} status={status} colors={colors} scaleFont={scaleFont} />
            {reason && <Text style={{ fontSize: scaleFont(11), color: colors.error, textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>{reason}</Text>}
            {entry.hasPodPhotos && <PodPhotosButton historyId={entry.id} token={token} colors={colors} scaleFont={scaleFont} />}
          </View>
        ) : (
          <>
            <Text style={{ fontSize: scaleFont(13), fontWeight: '600', color: colors.textPrimary, textAlign: 'center', marginTop: 8 }}>{label}</Text>
            <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>{formatHistoryDate(entry.dateUpdated)}</Text>
            {location ? <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>📍 {location}</Text> : null}
            <GpsLink entry={entry} status={status} colors={colors} scaleFont={scaleFont} />
            {reason && <Text style={{ fontSize: scaleFont(11), color: colors.error, textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>{reason}</Text>}
            {entry.hasPodPhotos && <PodPhotosButton historyId={entry.id} token={token} colors={colors} scaleFont={scaleFont} />}
          </>
        )}
      </View>
      {!isLast && <View style={{ width: 30, height: 2, backgroundColor: colors.border }} />}
    </View>
  );
}

function RelatedOrdersGroup({ title, orders, onOpenTracking, colors, scaleFont }) {
  if (!orders || orders.length === 0) return null;
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>{title} ({orders.length})</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {orders.map((o) => (
          <AnimatedPressable
            key={o.doTrackingNumber}
            scaleTo={1.04}
            onPress={() => onOpenTracking(o.doTrackingNumber)}
            style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.subtleBackground, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ fontSize: scaleFont(12), fontWeight: '700', color: colors.primary }}>
              {o.doTrackingNumber} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>({o.currentStatus})</Text>
            </Text>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
}

export default function TrackingDetailModal({ trackingNumber, token, onClose, onOpenTracking }) {
  const { colors } = useTheme();
  const { scaleFont } = useDenseFontScale();
  const { t } = useLanguage();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const historyScrollRef = useRef(null);

  useEffect(() => {
    if (!trackingNumber) { setResult(null); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get(`/api/partner/tracking/${encodeURIComponent(trackingNumber)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => { if (!cancelled) setResult(res.data); })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || 'Failed to load tracking number.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [trackingNumber, token]);

  const visible = !!trackingNumber;
  const { historyEntries } = result
    ? buildHistoryTimeline(result.history, FALLBACK_STATUS_LABEL, result.currentStatus)
    : { historyEntries: [] };
  const related = result?.relatedOrders;
  // The viewed order itself is already included in each relatedOrders group
  // (server-side, matching grfmxstatusupdate's own "all" list) - drop it here
  // so it isn't shown as a clickable chip pointing at the popup already open.
  const otherNotAtWarehouse = (related?.notAtWarehouse || []).filter((o) => o.doTrackingNumber !== trackingNumber);
  const otherAtWarehouse = (related?.atWarehouse || []).filter((o) => o.doTrackingNumber !== trackingNumber);
  const totalOther = otherNotAtWarehouse.length + otherAtWarehouse.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 1160, maxHeight: '90%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ fontSize: scaleFont(18), fontWeight: '700', color: colors.textPrimary }}>Tracking Number Search</Text>
            <AnimatedPressable scaleTo={1.1} onPress={onClose}><Text style={{ fontSize: scaleFont(18), color: colors.textMuted }}>✕</Text></AnimatedPressable>
          </View>

          {loading && <ActivityIndicator color={colors.primary} />}
          {!loading && error && <Text style={{ color: colors.error }}>{error}</Text>}

          {!loading && !error && result && (
            <ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Text style={{ fontSize: scaleFont(18), fontWeight: '700', color: colors.textPrimary }}>{result.doTrackingNumber}</Text>
                <Badge label={null} value={result.currentStatus} bg={colors.primaryLight} fg={colors.primary} scaleFont={scaleFont} />
              </View>

              {totalOther > 0 && (
                <Section icon="👥" title={`Other Parcels for This Customer (${totalOther})`} colors={colors} scaleFont={scaleFont}>
                  <View style={{ width: '100%' }}>
                    <RelatedOrdersGroup title="Parcels not at Warehouse" orders={otherNotAtWarehouse} onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                    <RelatedOrdersGroup title="Parcels at Warehouse" orders={otherAtWarehouse} onOpenTracking={onOpenTracking} colors={colors} scaleFont={scaleFont} />
                  </View>
                </Section>
              )}

              <Section icon="📦" title="Shipment Info" colors={colors} scaleFont={scaleFont}>
                <DetailField label="Job Status" value={result.currentStatus} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Job Method" value={result.jobMethod} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Latest Location" value={gdexStyleLocation(result.latestLocation, result.currentStatus, result)} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Attempt" value={result.attempt ?? 0} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Job Date" value={formatDMY(result.jobDate)} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Job Created Date" value={formatDMY(result.creationDate)} colors={colors} scaleFont={scaleFont} />
                <DetailField label="MAWB No." value={result.mawbNo} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Latest Reason" value={result.latestReason} colors={colors} scaleFont={scaleFont} />
              </Section>

              <Section icon="👤" title="Customer Info" colors={colors} scaleFont={scaleFont}>
                <DetailField label="Name" value={result.receiverName} minWidth={180} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Main Phone No." value={result.receiverPhoneNumber} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Address" value={result.receiverAddress} minWidth={260} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Postal Code" value={result.receiverPostalCode} colors={colors} scaleFont={scaleFont} />
                <DetailField label="Area" value={result.area} colors={colors} scaleFont={scaleFont} />
              </Section>

              <Section icon="💬" title="Remarks" colors={colors} scaleFont={scaleFont}>
                <DetailField label="Customer Remark" value={result.remarks} minWidth={260} colors={colors} scaleFont={scaleFont} />
              </Section>

              {/* No copy/print-label buttons, and each history step below omits
                  "updated by" and "assigned driver" - per the agreed scope.
                  historyEntries already has internal audit notes (e.g.
                  "Warehouse location updated to Warehouse K1.") filtered out
                  and back-to-back repeats collapsed, via the same pipeline
                  the customer-facing tracking popup uses. */}
              {historyEntries.length > 0 && (
                <Section icon="🕒" title="Status History" colors={colors} scaleFont={scaleFont}>
                  <ScrollView
                    ref={historyScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator
                    style={{ width: '100%' }}
                    // The latest status (rightmost step) is what actually
                    // matters at a glance - auto-scroll there instead of
                    // leaving a long history sitting on its oldest step.
                    onContentSizeChange={(width) => historyScrollRef.current?.scrollTo({ x: width, animated: false })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                      {historyEntries.map((entry, i) => (
                        <HistoryStep
                          key={i}
                          entry={entry}
                          isCurrent={i === historyEntries.length - 1}
                          isLast={i === historyEntries.length - 1}
                          colors={colors}
                          scaleFont={scaleFont}
                          t={t}
                          token={token}
                          order={result}
                        />
                      ))}
                    </View>
                  </ScrollView>
                </Section>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
