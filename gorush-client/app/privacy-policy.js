import React from 'react';
import { Text } from 'react-native';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useLanguage } from '../context/LanguageContext';

export default function PrivacyPolicy() {
  const { t } = useLanguage();
  const formStyles = useFormStyles();

  const SECTIONS = [
    { icon: '🏢', title: t('static.privacyPolicy.overview'), body: t('static.privacyPolicy.overviewBody') },
    { icon: '✅', title: t('static.privacyPolicy.consent'), body: t('static.privacyPolicy.consentBody') },
    { icon: '📋', title: t('static.privacyPolicy.infoWeCollect'), body: t('static.privacyPolicy.infoWeCollectBody') },
    { icon: '🔄', title: t('static.privacyPolicy.sharing'), body: t('static.privacyPolicy.sharingBody') },
    { icon: '📱', title: t('static.privacyPolicy.mobileLocation'), body: t('static.privacyPolicy.mobileLocationBody') },
    { icon: '📍', title: t('static.privacyPolicy.locationInfo'), body: t('static.privacyPolicy.locationInfoBody') },
    { icon: '🔒', title: t('static.privacyPolicy.sensitiveInfo'), body: t('static.privacyPolicy.sensitiveInfoBody') },
    { icon: '🍪', title: t('static.privacyPolicy.cookies'), body: t('static.privacyPolicy.cookiesBody') },
    { icon: '✉️', title: t('static.privacyPolicy.contactUs'), body: t('static.privacyPolicy.contactUsBody') },
  ];

  return (
    <PageScroll title={t('footer.privacyPolicy')}>
      <Text style={formStyles.title}>{t('static.privacyPolicy.pageTitle')}</Text>
      <Text style={formStyles.subtitle}>{t('static.privacyPolicy.subtitle')}</Text>

      {SECTIONS.map((section) => (
        <Card key={section.title} icon={section.icon} title={section.title}>
          <Text style={formStyles.bodyText}>{section.body}</Text>
        </Card>
      ))}
    </PageScroll>
  );
}
