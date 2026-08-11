import React from 'react';
import { Text } from 'react-native';
import { PageScroll, useFormStyles, Card } from '../lib/formPrimitives';
import { useLanguage } from '../context/LanguageContext';

export default function ComingSoon({ title }) {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  return (
    <PageScroll title={title}>
      <Text style={formStyles.title}>{title}</Text>
      <Text style={formStyles.subtitle}>{t('static.comingSoonTitle')}</Text>
      <Card icon="🚧" title={t('static.comingSoonCardTitle')}>
        <Text style={formStyles.bodyText}>
          {t('static.comingSoonBody')}
        </Text>
      </Card>
    </PageScroll>
  );
}
