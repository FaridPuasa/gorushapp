import React from 'react';
import { Text, View, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFormStyles } from '../../lib/formPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatAnnouncementDate } from '../../lib/announcements';
import { AnimatedPressable } from '../../lib/animations';

export default function VacancyDetailModal({ vacancy, onClose, onApply }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formStyles = useFormStyles();

  return (
    <Modal visible={!!vacancy} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {vacancy ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <Text style={[formStyles.sectionHeader, { marginBottom: 0, flex: 1 }]} numberOfLines={2}>💼 {vacancy.title}</Text>
              <AnimatedPressable scaleTo={1.15} onPress={onClose} style={styles.closeButton}>
                <Text style={{ fontSize: 18, color: colors.textSecondary }}>✕</Text>
              </AnimatedPressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {vacancy.department ? (
                  <View style={{ backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8, marginBottom: 6 }}>
                    <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 12 }}>{vacancy.department}</Text>
                  </View>
                ) : null}
                {vacancy.employmentType ? (
                  <View style={{ backgroundColor: colors.subtleBackground, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }}>🕐 {vacancy.employmentType}</Text>
                  </View>
                ) : null}
              </View>

              {vacancy.closingDate ? (
                <Text style={{ color: colors.error, fontWeight: '600', fontSize: 12, marginBottom: 12 }}>
                  ⏳ {t('careers.closesOn').replace('${date}', formatAnnouncementDate(vacancy.closingDate))}
                </Text>
              ) : null}

              {vacancy.description ? <Text style={[formStyles.bodyText, { marginBottom: 16 }]}>{vacancy.description}</Text> : null}

              {vacancy.requirements ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[formStyles.sectionHeader, { fontSize: 15, marginBottom: 8 }]}>{t('careers.requirements')}</Text>
                  <Text style={formStyles.bodyText}>{vacancy.requirements}</Text>
                </View>
              ) : null}

              {vacancy.responsibilities ? (
                <View style={{ marginBottom: 4 }}>
                  <Text style={[formStyles.sectionHeader, { fontSize: 15, marginBottom: 8 }]}>{t('careers.responsibilities')}</Text>
                  <Text style={formStyles.bodyText}>{vacancy.responsibilities}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <AnimatedPressable scaleTo={1.03} style={formStyles.buttonAccent} onPress={() => onApply(vacancy)}>
                <Text style={formStyles.buttonText}>{t('careers.applyNow')}</Text>
              </AnimatedPressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: 20 },
  card: { width: '100%', maxWidth: 520, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  closeButton: { paddingLeft: 12, paddingVertical: 4 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
});
