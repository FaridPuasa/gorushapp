import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { useFormStyles, Card } from '../../lib/formPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { formatAnnouncementDate } from '../../lib/announcements';
import VacancyDetailModal from './VacancyDetailModal';
import { AnimatedPressable } from '../../lib/animations';

export default function VacancyList({ onApply }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const [vacancies, setVacancies] = useState(null);
  const [selectedVacancy, setSelectedVacancy] = useState(null);

  useEffect(() => {
    api.get('/api/vacancies').then((res) => setVacancies(res.data)).catch(() => setVacancies([]));
  }, []);

  if (vacancies === null) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />;
  }

  if (vacancies.length === 0) {
    return (
      <Card icon="💼" title={t('careers.noOpenPositionsTitle')}>
        <Text style={formStyles.bodyText}>{t('careers.noOpenPositionsBody')}</Text>
      </Card>
    );
  }

  return (
    <>
      {vacancies.map((v) => (
        <Card key={v._id} icon="💼" title={v.title}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {v.department ? (
              <View style={{ backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8, marginBottom: 6 }}>
                <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 12 }}>{v.department}</Text>
              </View>
            ) : null}
            {v.employmentType ? (
              <View style={{ backgroundColor: colors.subtleBackground, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }}>🕐 {v.employmentType}</Text>
              </View>
            ) : null}
          </View>

          {v.closingDate ? (
            <Text style={{ color: colors.error, fontWeight: '600', fontSize: 12, marginBottom: 10 }}>
              ⏳ {t('careers.closesOn').replace('${date}', formatAnnouncementDate(v.closingDate))}
            </Text>
          ) : null}

          {v.description ? <Text style={[formStyles.bodyText, { marginBottom: 14 }]}>{v.description}</Text> : null}

          <View style={{ flexDirection: 'row' }}>
            <AnimatedPressable
              scaleTo={1.03}
              style={[formStyles.button, { flex: 1, marginRight: 8, backgroundColor: colors.subtleBackground }]}
              onPress={() => setSelectedVacancy(v)}
            >
              <Text style={[formStyles.buttonText, { color: colors.textPrimary }]}>{t('careers.viewDetails')}</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleTo={1.03} style={[formStyles.buttonAccent, { flex: 1 }]} onPress={() => onApply(v)}>
              <Text style={formStyles.buttonText}>{t('careers.applyNow')}</Text>
            </AnimatedPressable>
          </View>
        </Card>
      ))}

      <VacancyDetailModal
        vacancy={selectedVacancy}
        onClose={() => setSelectedVacancy(null)}
        onApply={(v) => { setSelectedVacancy(null); onApply(v); }}
      />
    </>
  );
}
