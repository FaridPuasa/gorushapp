import React, { useState, useRef } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../lib/animations';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { useIsMobile } from '../lib/responsive';
import { usePricingRules } from '../lib/pricing';

// The real site uses its own custom SVG icon set here (standardicon/expressicon/
// immediateicon/selfcollecticon/dropofficon) — those aren't reliably renderable
// cross-platform without adding an SVG-rendering dependency, so this uses our
// existing Ionicons set as an equivalent instead.
const TIER_ICONS = {
  Standard: 'time-outline',
  Express: 'flash-outline',
  Immediate: 'rocket-outline',
  'Self Collect': 'storefront-outline',
  'Drop-off': 'cube-outline',
};

// Section title -> the PricingRule product code its tiers' prices come from. "All Pharmacy"
// is deliberately absent — its shared Self Collect tile is sourced from MOH specifically
// (see displayPrice below).
const SECTION_PRODUCT_CODES = {
  MOH: 'pharmacymoh',
  'JPMC/PJSC': 'pharmacyjpmc',
  PANAGA: 'pharmacyphc',
  'Local Delivery': 'localdelivery',
};

// This page's tier codes don't quite match PricingRule's chargeCode spelling.
const CHARGE_CODE_ALIASES = { 'Drop-off': 'Drop off' };

// A price entry's `label` describes a district or group of districts sharing one price
// (e.g. "Tutong & Belait" both being $8) — map it to one real district to look up, since
// the underlying rows are per-district and any one of a shared group has the same value.
const LABEL_DISTRICTS = {
  'Brunei-Muara': 'Brunei',
  'Tutong & Belait': 'Tutong',
  'Belait & Temburong': 'Belait',
  Tutong: 'Tutong',
  Belait: 'Belait',
  Temburong: 'Temburong',
};

// Live prices from the admin-editable PricingRule table, falling back to this file's
// hardcoded number while the fetch is in flight (or if a row is ever missing) so the page
// never shows a blank/zero price.
function displayPrice(rules, sectionTitle, tierCode, priceEntry) {
  const productCode = sectionTitle === 'All Pharmacy' ? 'pharmacymoh' : SECTION_PRODUCT_CODES[sectionTitle];
  if (!productCode) return priceEntry.price;
  const chargeCode = CHARGE_CODE_ALIASES[tierCode] || tierCode;
  const district = priceEntry.label ? (LABEL_DISTRICTS[priceEntry.label] || 'Brunei') : 'Brunei';
  const row = rules.find((r) => r.product === productCode && r.chargeCode === chargeCode && r.district === district);
  return row ? row.price : priceEntry.price;
}

const RATE_SECTIONS = [
  {
    icon: '💊',
    title: 'MOH',
    tiers: [
      {
        code: 'Standard',
        tagline: 'A dependable option for those who prioritize cost-effectiveness and flexibility in their delivery timelines.',
        location: 'Nation-Wide',
        duration: '2-3 Working Days after medicine collected from Pharmacy',
        prices: [{ label: null, price: 4 }],
      },
      {
        code: 'Express',
        tagline: "The perfect solution when you need your essentials urgently and can't afford to wait.",
        location: 'Bandar Seri Begawan Area Only',
        duration: 'Next Working Day after medicine collected from Pharmacy',
        prices: [{ label: null, price: 5.5 }],
      },
      {
        code: 'Immediate',
        tagline: 'Need your items in a hurry? Opt for our immediate delivery that can be done within the same day.',
        location: 'Bandar Seri Begawan Area Only',
        duration: 'Within the same day after medicine collected from Pharmacy',
        prices: [{ label: null, price: 20 }],
      },
    ],
    notes: [
      'All orders will be processed before 11am daily except Friday, Sunday and Public Holiday. Any orders that go through after the stated time will be processed on the next working day.',
      'Immediate Orders are available from 8am until 2pm everyday except for Friday and Sunday.',
      'Delivery duration will start after medicine is collected from Pharmacy.',
      'Paying Patient: 3% or $2 surcharge, whichever is higher.',
    ],
  },
  {
    icon: '🏥',
    title: 'JPMC/PJSC',
    tiers: [
      {
        code: 'Standard',
        tagline: 'A dependable option for those who prioritize cost-effectiveness and flexibility in their delivery timelines.',
        location: 'Nation-Wide',
        duration: '2-3 Working Days after medicine collected from Pharmacy',
        prices: [
          { label: 'Brunei-Muara', price: 4 },
          { label: 'Tutong & Belait', price: 8 },
          { label: 'Temburong', price: 11 },
        ],
      },
      {
        code: 'Express',
        tagline: "The perfect solution when you need your essentials urgently and can't afford to wait.",
        location: 'Bandar Seri Begawan Area Only',
        duration: 'Next Working Day after medicine collected from Pharmacy',
        prices: [{ label: null, price: 5.5 }],
      },
      {
        code: 'Immediate',
        tagline: 'Need your items in a hurry? Opt for our immediate delivery that can be done within the same day.',
        location: 'Bandar Seri Begawan Area Only',
        duration: 'Within the same day after medicine collected from Pharmacy',
        prices: [{ label: null, price: 20 }],
      },
    ],
    notes: [
      'All orders will be processed before 11am daily except Friday, Sunday and Public Holiday. Any orders that go through after the stated time will be processed on the next working day.',
      'Immediate Orders are available from 8am until 11am everyday except for Sunday.',
      'Delivery duration will start after medicine is collected from Pharmacy.',
      'Direct payment to JPMC is available.',
      'Paying Patient: 3% or $2 surcharge, whichever is higher.',
    ],
  },
  {
    icon: '🏨',
    title: 'PANAGA',
    tiers: [
      {
        code: 'Standard',
        tagline: 'A dependable option for those who prioritize cost-effectiveness and flexibility in their delivery timelines.',
        location: 'Nation-Wide',
        duration: 'Same Day',
        prices: [
          { label: 'Brunei-Muara', price: 7 },
          { label: 'Tutong', price: 5 },
          { label: 'Belait', price: 3 },
          { label: 'Temburong', price: 10 },
        ],
      },
    ],
    notes: [
      'All orders will be processed before 11am daily except Friday, Sunday and Public Holiday. Any orders that go through after the stated time will be processed on the next working day.',
      'Pickup available on Wednesday and Saturday.',
    ],
  },
  {
    icon: '💉',
    title: 'All Pharmacy',
    tiers: [
      {
        code: 'Self Collect',
        tagline: 'Self Collect at Go Rush Office.',
        location: 'Go Rush Office',
        duration: 'Next Working Day after medicine collected from Pharmacy',
        prices: [{ label: null, price: 4 }],
      },
    ],
    notes: [
      'All orders will be processed before 11am daily except Friday, Sunday and Public Holiday. Any orders that go through after the stated time will be processed on the next working day.',
    ],
  },
  {
    icon: '🚚',
    title: 'Local Delivery',
    tiers: [
      {
        code: 'Standard',
        tagline: 'A dependable option for those who prioritize cost-effectiveness and flexibility in their delivery timelines.',
        location: 'Nation-Wide',
        duration: '2-3 Working Days',
        prices: [
          { label: 'Brunei-Muara', price: 5 },
          { label: 'Tutong', price: 8 },
          { label: 'Belait & Temburong', price: 15 },
        ],
      },
      {
        code: 'Express',
        tagline: "The perfect solution when you need your essentials urgently and can't afford to wait.",
        location: 'Bandar Seri Begawan Area Only',
        duration: 'Same Day Delivery',
        prices: [{ label: null, price: 5.5 }],
      },
      {
        code: 'Drop-off',
        tagline: 'Drop-off item at Go Rush Office. Go Rush will deliver.',
        location: 'Nation-Wide except Temburong',
        duration: null,
        prices: [
          { label: 'Brunei-Muara', price: 4 },
          { label: 'Tutong', price: 6 },
          { label: 'Belait', price: 8 },
        ],
      },
    ],
    notes: [
      'For any orders above 3kg, there will be additional charges of $1 per kg.',
      'Delivery trips to Belait only available on Wednesday and Saturday.',
    ],
  },
];

function RateTier({ tier, styles, iconColor, rules, sectionTitle }) {
  const { t } = useLanguage();
  return (
    <View style={styles.tierBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
        <Ionicons name={TIER_ICONS[tier.code] || 'pricetag-outline'} size={18} color={iconColor} style={{ marginRight: 8 }} />
        <Text style={styles.tierCode}>{tier.code}</Text>
      </View>
      <Text style={styles.tierTagline}>{tier.tagline}</Text>
      <View style={styles.tierDivider} />
      <Text style={styles.tierLabel}>{t('static.deliveryRates.deliveryLocation')}</Text>
      <Text style={styles.tierValue}>{tier.location}</Text>
      {tier.duration && (
        <>
          <Text style={[styles.tierLabel, { marginTop: 8 }]}>{t('static.deliveryRates.deliveryDuration')}</Text>
          <Text style={styles.tierValue}>{tier.duration}</Text>
        </>
      )}
      <View style={styles.tierDivider} />
      <Text style={styles.tierLabel}>{t('static.deliveryRates.priceCharge')}</Text>
      {tier.prices.map((p, i) => (
        <Text key={i} style={tier.prices.length > 1 ? styles.tierPriceMulti : styles.tierPrice}>
          ${displayPrice(rules, sectionTitle, tier.code, p).toFixed(2).replace(/\.00$/, '')}{p.label ? ` — ${p.label}` : ''}
        </Text>
      ))}
    </View>
  );
}

const TABS = RATE_SECTIONS;

export default function DeliveryPrice() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState(TABS[0].title);
  const pricingRules = usePricingRules();
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Crossfade: fade the current tab's tiers/notes out, swap the active tab once invisible,
  // then fade the new content back in — reads as a handoff rather than an instant swap.
  const selectTab = (title) => {
    if (title === activeTab) return;
    const useNativeDriver = Platform.OS !== 'web';
    Animated.timing(contentOpacity, { toValue: 0, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver }).start(() => {
      setActiveTab(title);
      Animated.timing(contentOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver }).start();
    });
  };

  const styles = {
    tabRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20, gap: 8 },
    tab: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.subtleBackground, borderWidth: 1, borderColor: colors.border },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: scaleFont(13), fontWeight: '600', color: colors.textSecondary },
    tabTextActive: { fontSize: scaleFont(13), fontWeight: '700', color: '#fff' },
    tiersGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginBottom: 4 },
    tierBox: {
      flexBasis: isMobile ? '100%' : '31%',
      flexGrow: isMobile ? 0 : 1,
      minWidth: isMobile ? undefined : 160,
      marginBottom: 16, padding: 16, borderRadius: 12, backgroundColor: colors.subtleBackground, alignItems: 'center',
    },
    tierCode: { fontSize: scaleFont(20), fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    tierTagline: { fontSize: scaleFont(12), color: colors.textSecondary, marginBottom: 12, lineHeight: scaleFont(17), fontStyle: 'italic', textAlign: 'center' },
    tierDivider: { height: 1, width: '100%', backgroundColor: colors.border, marginVertical: 10 },
    tierLabel: { fontSize: scaleFont(12), color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
    tierValue: { fontSize: scaleFont(14), color: colors.textPrimary, fontWeight: '600', textAlign: 'center', marginTop: 2 },
    tierPrice: { fontSize: scaleFont(32), color: colors.primary, fontWeight: '800', marginTop: 6, textAlign: 'center' },
    // Multiple district-specific prices stack up under one tier — a smaller size keeps
    // that list compact instead of each line reading as loud as a single flat price, and
    // keeps each "$X — District" line on one row instead of wrapping even at larger font
    // scale settings.
    tierPriceMulti: { fontSize: scaleFont(14), color: colors.primary, fontWeight: '800', marginTop: 3, textAlign: 'center' },
    notesTitle: { fontSize: scaleFont(12), fontWeight: '700', color: colors.textPrimary, marginTop: 8, marginBottom: 6, textAlign: 'center' },
    noteLine: { fontSize: scaleFont(11), color: colors.textMuted, marginBottom: 4, lineHeight: 17, textAlign: 'center' },
  };

  const activeSection = TABS.find((s) => s.title === activeTab);

  return (
    <PageScroll title={t('static.deliveryRates.pageTitle')}>
      <Text style={formStyles.title}>{t('static.deliveryRates.pageTitle')}</Text>
      <Text style={formStyles.subtitle}>{t('static.deliveryRates.subtitle')}</Text>
      <Text style={[formStyles.subtitle, { fontSize: scaleFont(13), marginBottom: 16 }]}>{t('static.deliveryRates.tagline')}</Text>

      <Card icon={activeSection.icon} title={activeSection.title} centered titleStyle={{ fontSize: scaleFont(22), lineHeight: scaleFont(28) }}>
        <View style={styles.tabRow}>
          {TABS.map((section) => {
            const isActive = section.title === activeTab;
            return (
              <AnimatedPressable
                key={section.title}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => selectTab(section.title)}
                scaleTo={1.05}
              >
                <Text style={isActive ? styles.tabTextActive : styles.tabText}>{section.title}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <Animated.View style={{ opacity: contentOpacity }}>
          <View style={styles.tiersGrid}>
            {activeSection.tiers.map((tier, i) => (
              <RateTier key={i} tier={tier} styles={styles} iconColor={colors.primary} rules={pricingRules} sectionTitle={activeSection.title} />
            ))}
          </View>
          <Text style={styles.notesTitle}>{t('static.deliveryRates.notesTitle')}</Text>
          {activeSection.notes.map((note, i) => (
            <Text key={i} style={styles.noteLine}>* {note}</Text>
          ))}

          {activeSection.title === 'Local Delivery' && (
            <>
              <Text style={[formStyles.bodyText, { marginTop: 12, marginBottom: 10 }]}>
                {t('static.deliveryRates.localDeliveryBody')}
              </Text>
              <AnimatedPressable style={formStyles.button} onPress={() => router.push('/local-delivery-calculator')} scaleTo={1.04}>
                <Text style={formStyles.buttonText}>{t('static.deliveryRates.openCalculator')}</Text>
              </AnimatedPressable>
            </>
          )}
        </Animated.View>
      </Card>
    </PageScroll>
  );
}
