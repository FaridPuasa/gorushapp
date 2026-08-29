import React, { useState, useEffect } from 'react';
import { Text, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { formatAnnouncementDate, localizeAnnouncement, renderRichText } from '../lib/announcements';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { api } from '../lib/api';

export default function Announcements() {
  const { colors } = useTheme();
  const { t, locale } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);

  // Announcement bodies only ever carry an internal path (e.g. "/sign-up")
  // or a full external URL - manually written straight into the database,
  // since the admin rich-text toolbar has no link button yet.
  const onLinkPress = (href) => {
    if (/^https?:\/\//i.test(href)) Linking.openURL(href);
    else router.push(href);
  };
  const styles = {
    date: { fontSize: scaleFont(11), fontWeight: '700', color: colors.primary, marginBottom: 8, textAlign: 'center' },
  };

  useEffect(() => {
    // Same list for every visitor - no guest/logged-in filtering here (that
    // only applies to the top notification bar, AnnouncementContext.js).
    api.get('/api/announcements')
      .then((res) => setAnnouncements(res.data))
      .catch(() => {});
  }, []);

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
            <Text style={[formStyles.bodyText, { textAlign: align }]}>{renderRichText(body, formStyles.bodyText, { onLinkPress, linkColor: colors.primary })}</Text>
          </Card>
        );
      })}
    </PageScroll>
  );
}
