import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../lib/responsive';
import { AnimatedPressable } from '../lib/animations';
import {
  STATUS_ORDER, canonicalStatus, displayStatusLabel, formatHistoryDate,
  getStatusStyle, historyReason,
} from '../lib/trackingHistory';

// The status-header + timeline (mobile: vertical stepper, desktop: horizontal stepper) +
// status legend, shared by Home's "Track Your Order" section and My Orders' per-row
// "Track Order" button — same popup either way.
export default function TrackingResultModal({ visible, trackingNumber, historyEntries, currentStatusValue, onClose }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const isMobile = useIsMobile();
  const currentStatusStyle = getStatusStyle(currentStatusValue, colors);
  const fallbackLabel = t('home.tracking.statusUpdate');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
        <SafeAreaView
          edges={['bottom']}
          style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '82%', overflow: 'hidden' }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 6 }} />
          <View style={{ paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: scaleFont(16), fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' }}>
              📦 {trackingNumber}
            </Text>
            <AnimatedPressable scaleTo={1.15} onPress={onClose} style={{ position: 'absolute', right: 20, top: 0 }}>
              <Text style={{ fontSize: scaleFont(20), color: colors.textPrimary }}>✕</Text>
            </AnimatedPressable>
          </View>

          <View style={{ paddingHorizontal: 20, paddingVertical: 18, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: scaleFont(12), color: colors.textMuted, marginBottom: 6 }}>{t('home.tracking.currentStatus')}</Text>
            <Text style={{ fontSize: scaleFont(38), marginBottom: 6 }}>{currentStatusStyle.icon}</Text>
            <Text style={{ fontSize: scaleFont(20), fontWeight: 'bold', color: currentStatusStyle.color }}>
              {displayStatusLabel(currentStatusValue, t)}
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
            <Text style={{ fontSize: scaleFont(14), fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12, paddingHorizontal: 20, textAlign: 'center' }}>{t('home.tracking.historyTitle')}</Text>
            {historyEntries.length === 0 ? (
              <Text style={{ fontSize: scaleFont(13), color: colors.textMuted, paddingHorizontal: 20, textAlign: 'center' }}>{t('home.tracking.noHistory')}</Text>
            ) : isMobile ? (
              // A sideways-scrolling timeline is awkward on a phone-width screen — a vertical
              // stepper (top to bottom, connected by a line) reads the same way a delivery
              // app's own tracking screen normally does on mobile.
              <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
                {historyEntries.map((entry, i) => {
                  const status = canonicalStatus(entry, fallbackLabel);
                  const label = displayStatusLabel(status, t);
                  const reason = historyReason(entry);
                  const dotColor = getStatusStyle(status, colors).color;
                  const isCurrent = i === historyEntries.length - 1;
                  return (
                    <View key={entry._id || i} style={{ flexDirection: 'row', width: '100%', maxWidth: 260 }}>
                      <View style={{ width: 24, alignItems: 'center' }}>
                        <View style={{
                          width: isCurrent ? 16 : 12, height: isCurrent ? 16 : 12, borderRadius: 8,
                          backgroundColor: dotColor,
                          borderWidth: isCurrent ? 2 : 0, borderColor: colors.card,
                        }} />
                        {i < historyEntries.length - 1 && (
                          <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 }} />
                        )}
                      </View>
                      <View style={{ flex: 1, marginLeft: 10, paddingBottom: 18 }}>
                        <Text style={{ fontSize: scaleFont(13), fontWeight: isCurrent ? '700' : '600', color: colors.textPrimary }}>
                          {label}
                        </Text>
                        <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, marginTop: 2 }}>
                          {formatHistoryDate(entry.dateUpdated)}
                        </Text>
                        {reason && (
                          <Text style={{ fontSize: scaleFont(11), color: colors.error, marginTop: 4, fontStyle: 'italic' }}>
                            {reason}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {historyEntries.map((entry, i) => {
                    const status = canonicalStatus(entry, fallbackLabel);
                    const label = displayStatusLabel(status, t);
                    const reason = historyReason(entry);
                    const dotColor = getStatusStyle(status, colors).color;
                    const isCurrent = i === historyEntries.length - 1;
                    return (
                      <View key={entry._id || i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{ width: 150, alignItems: 'center' }}>
                          <View style={{
                            width: isCurrent ? 16 : 12, height: isCurrent ? 16 : 12, borderRadius: 8,
                            backgroundColor: dotColor,
                            borderWidth: isCurrent ? 2 : 0, borderColor: colors.card,
                          }} />
                          <Text style={{ fontSize: scaleFont(13), fontWeight: isCurrent ? '700' : '600', color: colors.textPrimary, textAlign: 'center', marginTop: 8 }}>
                            {label}
                          </Text>
                          <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, textAlign: 'center', marginTop: 2 }}>
                            {formatHistoryDate(entry.dateUpdated)}
                          </Text>
                          {reason && (
                            <Text style={{ fontSize: scaleFont(11), color: colors.error, textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
                              {reason}
                            </Text>
                          )}
                        </View>
                        {i < historyEntries.length - 1 && (
                          <View style={{ width: 30, height: 2, backgroundColor: colors.border, marginTop: 7 }} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <View style={{ paddingHorizontal: 20, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ fontSize: scaleFont(12), fontWeight: 'bold', color: colors.textPrimary, marginBottom: 10, textAlign: 'center' }}>{t('home.tracking.legendTitle')}</Text>
              {isMobile ? (
                // Same table-row treatment as desktop (icon, label, description, divider) —
                // just one column instead of two, since a phone-width screen has no room to
                // split it in half.
                <View>
                  {STATUS_ORDER.map((label, rowIndex) => (
                    <View
                      key={label}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        paddingVertical: 8,
                        borderBottomWidth: rowIndex < STATUS_ORDER.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getStatusStyle(label, colors).color, marginRight: 8, marginTop: 4 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: scaleFont(12), fontWeight: '600', color: colors.textPrimary }}>
                          {displayStatusLabel(label, t)}
                        </Text>
                        <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, marginTop: 1 }}>
                          {t('home.tracking.statusDescriptions')[label]}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                // Two side-by-side columns (first half of the statuses, then the rest) instead
                // of one long list — a table-like row per status, each with a divider, reads
                // easier than the old single centered block and keeps the popup from getting
                // too tall on a wide screen where a single column would leave lots of dead space.
                // Capped and centered so the table stays a reasonable reading width instead of
                // stretching edge-to-edge of the modal on a wide desktop screen.
                <View style={{ flexDirection: 'row', alignSelf: 'center', width: '100%', maxWidth: 640 }}>
                  {[STATUS_ORDER.slice(0, Math.ceil(STATUS_ORDER.length / 2)), STATUS_ORDER.slice(Math.ceil(STATUS_ORDER.length / 2))].map((column, colIndex) => (
                    <View key={colIndex} style={{ flex: 1, marginRight: colIndex === 0 ? 20 : 0 }}>
                      {column.map((label, rowIndex) => (
                        <View
                          key={label}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            paddingVertical: 8,
                            borderBottomWidth: rowIndex < column.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getStatusStyle(label, colors).color, marginRight: 8, marginTop: 4 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: scaleFont(12), fontWeight: '600', color: colors.textPrimary }}>
                              {displayStatusLabel(label, t)}
                            </Text>
                            <Text style={{ fontSize: scaleFont(11), color: colors.textMuted, marginTop: 1 }}>
                              {t('home.tracking.statusDescriptions')[label]}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
