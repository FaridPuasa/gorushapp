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
import React, { useEffect, useState } from 'react';
import { Text, View, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable } from '../lib/animations';
import { Badge, Section, DetailField, formatDMY, formatDMYTime, historyIcon, historyStepColor, displayLocation } from '../lib/partnerUi';

const STEP_CIRCLE = 36;
const STEP_RING = 44;
const STEP_WIDTH = 150;

// One stepper node: a colored circle (icon inside) joined to its neighbors
// by a horizontal line, title/date/location below - matches
// grfmxstatusupdate's own Status History timeline design. The current step
// gets a ring around its circle plus a "Current" badge, same as there.
function HistoryStep({ step, isFirst, isLast, isCurrent, colors, scaleFont }) {
  const color = historyStepColor(step.status);
  return (
    <View style={{ width: STEP_WIDTH, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
        <View style={{ flex: isFirst ? 0 : 1, height: 2, backgroundColor: colors.border }} />
        <View style={{
          width: isCurrent ? STEP_RING : STEP_CIRCLE,
          height: isCurrent ? STEP_RING : STEP_CIRCLE,
          borderRadius: STEP_RING,
          borderWidth: isCurrent ? 3 : 0,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{ width: STEP_CIRCLE, height: STEP_CIRCLE, borderRadius: STEP_CIRCLE / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: scaleFont(16) }}>{historyIcon(step.status)}</Text>
          </View>
        </View>
        <View style={{ flex: isLast ? 0 : 1, height: 2, backgroundColor: colors.border }} />
      </View>
      <Text style={{ fontSize: scaleFont(13), fontWeight: '700', color, marginTop: 8, textAlign: 'center' }}>{step.status || '—'}</Text>
      {isCurrent && (
        <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.primaryLight }}>
          <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: colors.primary }}>Current</Text>
        </View>
      )}
      <Text style={{ fontSize: scaleFont(12), color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>{formatDMYTime(step.dateUpdated)}</Text>
      {step.reason ? <Text style={{ fontSize: scaleFont(11), color: colors.textSecondary, marginTop: 2, textAlign: 'center' }}>{step.reason}</Text> : null}
      {step.lastLocation ? <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, marginTop: 2, textAlign: 'center' }}>📍 {displayLocation(step.lastLocation)}</Text> : null}
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
  const { scaleFont } = useFontScale();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
                <DetailField label="Latest Location" value={displayLocation(result.latestLocation)} colors={colors} scaleFont={scaleFont} />
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
                  "updated by" and "assigned driver" - per the agreed scope. */}
              {result.history?.length > 0 && (
                <Section icon="🕒" title="Status History" colors={colors} scaleFont={scaleFont}>
                  <ScrollView horizontal showsHorizontalScrollIndicator style={{ width: '100%' }}>
                    <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
                      {result.history.map((h, i) => (
                        <HistoryStep
                          key={i}
                          step={h}
                          isFirst={i === 0}
                          isLast={i === result.history.length - 1}
                          isCurrent={i === result.history.length - 1}
                          colors={colors}
                          scaleFont={scaleFont}
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
