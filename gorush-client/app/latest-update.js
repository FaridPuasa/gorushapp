import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { formatAnnouncementDate, localizeAnnouncement, renderRichText } from '../lib/announcements';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Announcements() {
  const { colors } = useTheme();
  const { t, locale } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const { token, isGuest, loading: authLoading } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const styles = {
    date: { fontSize: scaleFont(11), fontWeight: '700', color: colors.primary, marginBottom: 8, textAlign: 'center' },
  };

  useEffect(() => {
    // Wait for auth to resolve - the server picks announcements by
    // guest-vs-logged-in audience.
    if (authLoading) return;
    api.get('/api/announcements', { headers: !isGuest && token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => setAnnouncements(res.data))
      .catch(() => {});
  }, [authLoading, isGuest, token]);

  return (
    <PageScroll title={t('static.announcements.pageTitle')}>
      <Text style={formStyles.title}>{t('static.announcements.pageTitle')}</Text>
      <Text style={formStyles.subtitle}>{t('static.announcements.subtitle')}</Text>

      {announcements.map((item) => {
        const { title, body } = localizeAnnouncement(item, locale);
        const align = item.bodyAlign || 'center';
        return (
          <Card
            key={item._id}
            icon="📢"
            title={title}
            centered
            eyebrow={formatAnnouncementDate(item.date)}
            eyebrowStyle={styles.date}
          >
            <Text style={[formStyles.bodyText, { textAlign: align }]}>{renderRichText(body, formStyles.bodyText)}</Text>
          </Card>
        );
      })}
    </PageScroll>
  );
}
