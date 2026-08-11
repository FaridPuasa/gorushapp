import React from 'react';
import { Text, View, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageScroll, Card, useFormStyles, SocialIcon } from '../lib/formPrimitives';
import { AnimatedPressable } from '../lib/animations';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  WHATSAPP_NUMBER, PHONE_NUMBERS, ADDRESS,
  GOOGLE_MAPS_URL, GOOGLE_MAPS_EMBED_URL,
  FACEBOOK_URL, INSTAGRAM_URL, TIKTOK_URL,
} from '../lib/contactInfo';

const EXTERNAL_LINK_ATTRS = { target: '_blank', rel: 'noopener noreferrer' };

// One consistent row style for every contact method — icon badge, label, number, chevron —
// so WhatsApp and phone numbers read as the same kind of thing instead of a big button
// next to small chips.
function ContactRow({ icon, iconColor, label, value, onPress, href, hrefAttrs, isLast, formStyles, colors }) {
  return (
    <AnimatedPressable
      scaleTo={1.02}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border,
      }}
      href={href}
      hrefAttrs={hrefAttrs}
      onPress={onPress}
    >
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: iconColor, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: formStyles.bodyText.fontSize - 2, color: colors.textMuted, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: formStyles.bodyText.fontSize + 1, fontWeight: '700', color: colors.textPrimary }}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ marginLeft: 14 }} />
    </AnimatedPressable>
  );
}

// A day/time row for the working-hours table — bold day on the left, muted time on the
// right, divided the same way ContactRow divides its own rows below.
function HoursRow({ day, time, isLast, formStyles, colors }) {
  return (
    <View
      style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: formStyles.bodyText.fontSize + 1, fontWeight: '700', color: colors.textPrimary }}>{day}</Text>
      <Text style={{ fontSize: formStyles.bodyText.fontSize, color: colors.textSecondary, textAlign: 'right', flexShrink: 1, marginLeft: 12 }}>{time}</Text>
    </View>
  );
}

export default function ContactUs() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const formStyles = useFormStyles();

  const HOURS = [
    { day: t('static.contactUs.hoursMonThuDay'), time: t('static.contactUs.hoursMonThuTime') },
    { day: t('static.contactUs.hoursFriDay'), time: t('static.contactUs.hoursFriTime') },
    { day: t('static.contactUs.hoursSatDay'), time: t('static.contactUs.hoursSatTime') },
  ];

  return (
    <PageScroll title={t('nav.contactUs')}>
      <Text style={formStyles.title}>{t('static.contactUs.pageTitle')}</Text>
      <Text style={formStyles.subtitle}>{t('static.contactUs.subtitle')}</Text>

      <Card icon="🕐" title={t('static.contactUs.workingHoursTitle')} centered>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
          {HOURS.map((row, i) => (
            <HoursRow key={row.day} day={row.day} time={row.time} isLast={i === HOURS.length - 1} formStyles={formStyles} colors={colors} />
          ))}
        </View>
        <Text style={{ fontSize: formStyles.bodyText.fontSize - 2, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
          * {t('static.contactUs.hoursClosed')}
        </Text>
      </Card>

      <Card icon="📍" title={t('static.contactUs.locationTitle')} centered>
        <Text style={[formStyles.bodyText, { textAlign: 'center', marginBottom: 12 }]}>{ADDRESS}</Text>

        {Platform.OS === 'web' && (
          <View style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
            {React.createElement('iframe', {
              src: GOOGLE_MAPS_EMBED_URL,
              width: '100%',
              height: 320,
              style: { border: 0, display: 'block' },
              allowFullScreen: true,
              loading: 'lazy',
              referrerPolicy: 'strict-origin-when-cross-origin',
            })}
          </View>
        )}

        <AnimatedPressable scaleTo={1.03} style={formStyles.button} href={GOOGLE_MAPS_URL} hrefAttrs={EXTERNAL_LINK_ATTRS} onPress={() => Linking.openURL(GOOGLE_MAPS_URL)}>
          <Text style={formStyles.buttonText}>{t('static.contactUs.viewOnMaps')}</Text>
        </AnimatedPressable>
      </Card>

      <Card icon="📞" title={t('static.contactUs.getInTouchTitle')} centered>
        <ContactRow
          icon="logo-whatsapp"
          iconColor="#25D366"
          label={t('static.contactUs.whatsapp')}
          value={`+${WHATSAPP_NUMBER}`}
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          hrefAttrs={EXTERNAL_LINK_ATTRS}
          onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`)}
          formStyles={formStyles}
          colors={colors}
        />
        {PHONE_NUMBERS.map((num, i) => (
          <ContactRow
            key={num}
            icon="call"
            iconColor={colors.primary}
            label={t('static.contactUs.callUs')}
            value={`+${num}`}
            href={`tel:+${num}`}
            onPress={() => Linking.openURL(`tel:+${num}`)}
            isLast={i === PHONE_NUMBERS.length - 1}
            formStyles={formStyles}
            colors={colors}
          />
        ))}
      </Card>

      <Card icon="🔗" title={t('static.contactUs.followUsTitle')} centered>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <SocialIcon platform="facebook" url={FACEBOOK_URL} size={40} />
          <SocialIcon platform="instagram" url={INSTAGRAM_URL} size={40} />
          <SocialIcon platform="tiktok" url={TIKTOK_URL} size={40} />
        </View>
      </Card>
    </PageScroll>
  );
}
