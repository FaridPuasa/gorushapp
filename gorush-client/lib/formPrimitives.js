import React, { useMemo, useRef, useEffect, forwardRef } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import Head from 'expo-router/head';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CONTROL_HEIGHT, CONTENT_MAX_WIDTH, BOTTOM_NAV_HEIGHT } from './theme';
import { useIsMobile, isMobileWidth } from './responsive';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { useLanguage } from '../context/LanguageContext';
import Footer from '../components/Footer';
import { AnimatedPressable, FadeIn, FadeInUp, RevealProvider, useRevealOnResize, useRevealRegistry } from './animations';

// All three platforms render as a solid-color circular badge with a white glyph on top —
// Instagram needs its signature gradient (via expo-linear-gradient) since a flat color
// wouldn't read as Instagram at all; Facebook and TikTok get their own flat brand color.
// Deliberately NOT the single-color "logo-facebook"/"logo-tiktok" glyphs on a transparent
// background (the old approach) — those render the whole mark (badge shape included) in
// one flat color, which on dark backgrounds (TikTok's glyph is black by default) or without
// a contrasting badge at all made them nearly disappear once dark mode was in play.
const INSTAGRAM_GRADIENT = ['#FEDA75', '#FA7E1E', '#D62976', '#962FBF', '#4F5BD5'];

const EXTERNAL_LINK_ATTRS = { target: '_blank', rel: 'noopener noreferrer' };

export function SocialIcon({ platform, url, size = 32 }) {
  const onPress = () => Linking.openURL(url);
  const radius = size * 0.28;

  if (platform === 'instagram') {
    return (
      <AnimatedPressable onPress={onPress} scaleTo={1.15} href={url} hrefAttrs={EXTERNAL_LINK_ATTRS}>
        <LinearGradient
          colors={INSTAGRAM_GRADIENT}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="logo-instagram" size={size * 0.62} color="#fff" />
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  const badgeColor = platform === 'tiktok' ? '#000000' : '#1877F2';
  const icon = platform === 'tiktok'
    ? <Ionicons name="logo-tiktok" size={size * 0.55} color="#fff" />
    : <FontAwesome5 name="facebook-f" size={size * 0.42} color="#fff" />;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={1.15}
      href={url}
      hrefAttrs={EXTERNAL_LINK_ATTRS}
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: badgeColor, alignItems: 'center', justifyContent: 'center' }}
    >
      {icon}
    </AnimatedPressable>
  );
}

// `scrollToTopKey` - pass a value that changes when the page swaps to an
// entirely different section of content (e.g. a multi-step form's current
// step) - e.g. Order Review: the scroll offset is left wherever it was on
// the long form (usually scrolled well down, near the button that got
// tapped), and FadeIn/FadeInUp's mount-time visibility check
// (useRevealRegistry, animations.js) measures each new section's position
// against that stale offset - sections that land off-screen because of it
// never get revealed until a manual scroll happens to trigger a recheck,
// which reads as the page still loading. Resetting to the top before that
// first check runs means everything above the fold measures correctly and
// appears immediately.
// `scrollRef` (optional) - forwarded ref to the underlying ScrollView, for a
// parent that needs to scroll to a specific position itself (e.g. jumping to
// the first invalid field on a failed form submit, via useFieldFocus below).
// PageScroll still works exactly as before for callers that don't pass one -
// it falls back to its own internal ref for the scrollToTopKey behavior.
export const PageScroll = forwardRef(function PageScroll({ children, title, beforeContent, scrollToTopKey }, forwardedScrollRef) {
  const formStyles = useFormStyles();
  const revealRegistry = useRevealRegistry();
  useRevealOnResize(revealRegistry);
  const ownScrollRef = useRef(null);
  const scrollRef = forwardedScrollRef || ownScrollRef;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToTopKey]);

  return (
    <>
      <Head>
        <title>{title ? `${title} — Go Rush` : 'Go Rush'}</title>
      </Head>
      <ScrollView
        ref={scrollRef}
        style={formStyles.masterScroll}
        contentContainerStyle={formStyles.masterContentOuter}
        onScroll={revealRegistry.handleScroll}
        scrollEventThrottle={100}
      >
        {/* The inner flex:1 wrapper (not the ScrollView's own contentContainerStyle) grows to
            fill any leftover viewport height, so Footer sits pinned to the true bottom on short
            pages instead of floating right after the content with empty space beneath it —
            while still scrolling normally once content is taller than the viewport. */}
        <View style={formStyles.masterContent}>
          {/* Rendered outside formWrapper — and outside the reveal provider below — so it
              isn't capped by CONTENT_MAX_WIDTH and always renders instantly, same as the
              page title/subtitle: it's the page's own header. */}
          {beforeContent}
          <View style={formStyles.formWrapper}>
            <RevealProvider registry={revealRegistry}>{children}</RevealProvider>
          </View>
        </View>
        <Footer />
      </ScrollView>
    </>
  );
});

export function Card({ icon, title, centered, titleStyle, eyebrow, eyebrowStyle, children }) {
  const formStyles = useFormStyles();
  const isMobile = useIsMobile();

  const eyebrowEl = eyebrow ? (
    <Text style={[formStyles.fieldHint, { marginBottom: 6 }, (isMobile || centered) && styles.centerText, eyebrowStyle]}>{eyebrow}</Text>
  ) : null;
  const headerEl = <Text style={[formStyles.sectionHeader, (isMobile || centered) && styles.centerText, titleStyle]}>{icon}  {title}</Text>;

  // Header fades in plainly, content fades in upward, content trailing its own header
  // slightly — both are instant (no animation) if this card is already on-screen when the
  // page loads, and only actually animate once scrolled into view.
  return (
    <View style={formStyles.card}>
      <FadeIn>
        {eyebrowEl}
        {headerEl}
      </FadeIn>
      <FadeInUp delay={60}>{children}</FadeInUp>
    </View>
  );
}

// `fieldKey` + `registerRef` (both optional) - when a parent form passes
// these (via useFieldFocus below), Field wraps itself in a ref registered
// under that key, so scrollToFirstError() can measure this field's position
// and scroll it into view on a failed submit. Every call site not passing
// them behaves exactly as before.
export function Field({ label, required, error, hint, children, fieldKey, registerRef }) {
  const formStyles = useFormStyles();
  const isMobile = useIsMobile();
  return (
    <View
      style={formStyles.fieldGroup}
      ref={fieldKey && registerRef ? (el) => registerRef(fieldKey, el) : undefined}
    >
      {label ? (
        <Text style={[formStyles.fieldLabel, isMobile && styles.centerText]}>
          {label}{required ? <Text style={formStyles.requiredMark}> *</Text> : null}
        </Text>
      ) : null}
      {hint ? <Text style={[formStyles.fieldHint, isMobile && styles.centerText]}>{hint}</Text> : null}
      {children}
      {error ? <Text style={[formStyles.fieldError, isMobile && styles.centerText]}>{error}</Text> : null}
    </View>
  );
}

// Shared "scroll to and focus the first invalid field" mechanism for any
// form using Field/PageScroll. Usage in a form component:
//   const scrollRef = useRef(null);
//   const { registerFieldRef, scrollToFirstError } = useFieldFocus();
//   <PageScroll ref={scrollRef}>...<Field fieldKey="party.fullName" registerRef={registerFieldRef}>...
//   scrollToFirstError(FIELD_ORDER, errors, scrollRef);
//
// FIELD_ORDER is a flat array of dot-path keys in the same visual top-to-
// bottom order the fields are rendered in - the first one present (with a
// truthy value) in the flattened `errors` object wins. Nested error shapes
// (e.g. `errors.party.fullName`, `errors.cbslItems[0].quantity`) are read via
// a simple dot/bracket path lookup, matching how the order form's own
// validateForm() already nests its errors object.
export function useFieldFocus() {
  const fieldRefs = useRef({});
  const registerFieldRef = (key, el) => {
    if (el) fieldRefs.current[key] = el;
    else delete fieldRefs.current[key];
  };

  const scrollToFirstError = (fieldOrder, errors, scrollRef) => {
    const firstKey = fieldOrder.find((key) => readPath(errors, key));
    const node = firstKey && fieldRefs.current[firstKey];
    if (!node || !scrollRef?.current) return;

    // measureLayout needs the target's underlying native node - ScrollView
    // itself is an acceptable target on both iOS/Android/web (RN forwards
    // the scroll responder's node for this exact purpose).
    //
    // On web specifically, react-native-web's measureLayout polyfill returns
    // y relative to the ScrollView's CURRENTLY VISIBLE viewport (computed
    // from live getBoundingClientRect-style geometry), not an absolute
    // position within the scrollable content - unlike true native RN, where
    // measureLayout already returns a scroll-offset-independent value. So on
    // web, a field sitting above the current scroll position measures as a
    // NEGATIVE y, which without correction just clamped to 0 - "scroll to
    // the very top" instead of to the field, confirmed live. Adding the
    // ScrollView's own current scrollTop (available directly since on web
    // scrollRef.current IS the real scrolling DOM node) converts that
    // viewport-relative offset back into an absolute scroll target.
    node.measureLayout(
      scrollRef.current,
      (x, y) => {
        const currentScrollTop = Platform.OS === 'web' ? (scrollRef.current.scrollTop || 0) : 0;
        // A little headroom above the field so its label isn't flush
        // against the top edge/header.
        scrollRef.current.scrollTo({ y: Math.max(currentScrollTop + y - 24, 0), animated: true });
      },
      () => {} // measurement can fail harmlessly (e.g. node not yet laid out) - just skip the scroll.
    );
  };

  return { registerFieldRef, scrollToFirstError };
}

function readPath(obj, path) {
  return path.split(/[.[\]]+/).filter(Boolean).reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

export function InfoNotice({ icon = 'ℹ️', title, children }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.primaryLight, borderColor: colors.tertiary, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 }}>
      {title ? (
        <Text style={{ color: colors.textPrimary, fontWeight: 'bold', marginBottom: 6 }}>
          {icon} {title}
        </Text>
      ) : null}
      {typeof children === 'string' ? (
        <Text style={{ color: colors.textPrimary, lineHeight: 20 }}>{children}</Text>
      ) : children}
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: { textAlign: 'center' },
});

export function SaveCancelRow({ onSave, onCancel, saving, saveLabel }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', marginTop: 8 }}>
      <AnimatedPressable
        scaleTo={1.03}
        style={[formStyles.button, { flex: 1, marginRight: 8 }, saving && formStyles.buttonDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>{saveLabel || t('common.save')}</Text>}
      </AnimatedPressable>
      <AnimatedPressable
        scaleTo={1.03}
        style={[formStyles.button, { flex: 1, backgroundColor: '#eee' }]}
        onPress={onCancel}
        disabled={saving}
      >
        <Text style={[formStyles.buttonText, { color: formStyles.subtitle.color }]}>{t('common.cancel')}</Text>
      </AnimatedPressable>
    </View>
  );
}

export function DeleteConfirm({ onConfirm, onCancel }) {
  const formStyles = useFormStyles();
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
      <Text style={{ fontSize: formStyles.fieldError.fontSize + 1, color: colors.error, fontWeight: '600', marginRight: 12 }}>{t('common.deleteThis')}</Text>
      <AnimatedPressable scaleTo={1.06} onPress={onConfirm} style={{ marginRight: 14 }}>
        <Text style={{ color: colors.error, fontWeight: '700', fontSize: formStyles.fieldError.fontSize + 1 }}>{t('common.yesDelete')}</Text>
      </AnimatedPressable>
      <AnimatedPressable scaleTo={1.06} onPress={onCancel}>
        <Text style={{ color: formStyles.subtitle.color, fontWeight: '600', fontSize: formStyles.fieldError.fontSize + 1 }}>{t('common.cancel')}</Text>
      </AnimatedPressable>
    </View>
  );
}

export function makeInputStyle(formStyles, focusedField, errors) {
  return (field) => [
    formStyles.input,
    isMobileWidth() && styles.centerText,
    focusedField === field && formStyles.inputFocused,
    errors[field] && formStyles.inputError,
  ];
}

export function makeFocusHandlers(setFocusedField) {
  return (field) => ({
    onFocus: () => setFocusedField(field),
    onBlur: () => setFocusedField(null),
  });
}

const shadow = Platform.select({
  web: { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
  android: { elevation: 2 },
  default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
});

export function useFormStyles() {
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const isMobile = useIsMobile();
  const insets = useSafeAreaInsets();
  // On mobile, a sticky bottom nav bar (see Navbar.js) covers the bottom of the
  // viewport — scrollable content needs extra clearance so it isn't hidden behind it.
  const bottomNavClearance = isMobile ? BOTTOM_NAV_HEIGHT + insets.bottom : 0;

  return useMemo(() => StyleSheet.create({
    safeAreaContainer: { flex: 1, backgroundColor: colors.background },
    masterScroll: { flex: 1, backgroundColor: colors.background },
    // flexGrow:1 lets the whole column (masterContent + Footer) stretch to fill the viewport
    // on short pages — see PageScroll's comment for why this is split from masterContent itself.
    masterContentOuter: { flexGrow: 1 },
    masterContent: { flex: 1, paddingVertical: Platform.OS === 'web' ? 48 : 28, paddingBottom: (Platform.OS === 'web' ? 48 : 60) + bottomNavClearance, alignItems: 'center' },
    formWrapper: {
      width: '100%',
      paddingHorizontal: isMobile ? 18 : 24,
      maxWidth: Platform.OS === 'web' ? CONTENT_MAX_WIDTH : '100%',
    },
    brandBadge: {
      alignSelf: 'center',
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    brandBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: scaleFont(16), letterSpacing: 0.5 },
    title: { fontSize: scaleFont(26), fontWeight: 'bold', textAlign: 'center', color: colors.textPrimary, lineHeight: scaleFont(32), letterSpacing: -0.3 },
    subtitle: { fontSize: scaleFont(14), textAlign: 'center', color: colors.textSecondary, marginTop: 8, marginBottom: 28, lineHeight: scaleFont(21) },
    bodyText: { fontSize: scaleFont(14), lineHeight: scaleFont(22), color: colors.textSecondary },

    statusBanner: { borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1 },
    statusSuccess: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    statusErrorBanner: { backgroundColor: colors.errorLight, borderColor: colors.error },
    statusTextSuccess: { color: colors.primaryDark, fontSize: scaleFont(14), fontWeight: '600' },
    statusTextError: { color: colors.error, fontSize: scaleFont(14), fontWeight: '600' },

    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: isMobile ? 18 : 22,
      marginBottom: 20,
      ...shadow,
    },
    sectionHeader: { fontSize: scaleFont(16), fontWeight: 'bold', marginBottom: 16, color: colors.textPrimary, lineHeight: scaleFont(22) },

    fieldGroup: { marginBottom: 14 },
    fieldLabel: { fontSize: scaleFont(13), fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
    requiredMark: { color: colors.error },
    fieldHint: { fontSize: scaleFont(11), color: colors.textMuted, marginBottom: 6 },
    fieldError: { fontSize: scaleFont(12), color: colors.error, marginTop: 5 },

    infoHint: { fontSize: scaleFont(12), color: '#e67e22', marginBottom: 14, fontWeight: '500' },

    input: { backgroundColor: colors.inputBackground, height: CONTROL_HEIGHT, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, fontSize: scaleFont(14), color: colors.textPrimary },
    inputFocused: { borderColor: colors.primary, borderWidth: 1.5 },
    inputError: { borderColor: colors.error, borderWidth: 1.5 },

    passwordContainer: { flexDirection: 'row', alignItems: 'stretch' },
    passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
    revealButton: { backgroundColor: colors.subtleBackground, paddingHorizontal: 15, borderTopRightRadius: 8, borderBottomRightRadius: 8, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    revealText: { fontSize: scaleFont(12), color: colors.textSecondary, fontWeight: '600' },

    strengthRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    strengthTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden', marginRight: 8 },
    strengthFill: { height: '100%', borderRadius: 3 },
    strengthLabel: { fontSize: scaleFont(11), fontWeight: '700' },

    matchOk: { fontSize: scaleFont(12), color: colors.primaryDark, marginTop: 5, fontWeight: '600' },
    matchFail: { fontSize: scaleFont(12), color: colors.error, marginTop: 5, fontWeight: '600' },

    datePickerButton: { backgroundColor: colors.inputBackground, height: CONTROL_HEIGHT, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
    datePickerButtonText: { color: colors.textPrimary, fontSize: scaleFont(14) },
    webDatePicker: { width: '100%', height: `${CONTROL_HEIGHT - 2}px`, paddingLeft: '12px', paddingRight: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: `${scaleFont(14)}px`, fontFamily: 'sans-serif', boxSizing: 'border-box', backgroundColor: colors.inputBackground, color: colors.textPrimary },

    pickerContainer: { backgroundColor: colors.inputBackground, height: CONTROL_HEIGHT, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', justifyContent: 'center' },
    pickerControl: { height: CONTROL_HEIGHT, width: '100%', paddingHorizontal: 10, backgroundColor: 'transparent', borderWidth: 0, color: colors.textPrimary, fontSize: scaleFont(14) },
    phoneRow: { flexDirection: 'row', alignItems: 'center' },
    miniPicker: { backgroundColor: colors.inputBackground, height: CONTROL_HEIGHT, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginRight: 10, width: 132, overflow: 'hidden', justifyContent: 'center' },
    phoneInput: { flex: 1 },

    toggleRow: { flexDirection: 'row', marginBottom: 12 },
    toggleBtn: { flex: 1, padding: 12, backgroundColor: colors.subtleBackground, alignItems: 'center', borderRadius: 8, marginRight: 5 },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleText: { color: colors.textPrimary, fontWeight: 'bold', fontSize: scaleFont(14) },
    toggleTextActive: { color: '#fff', fontWeight: 'bold', fontSize: scaleFont(14) },

    checkboxFake: { padding: 12, backgroundColor: colors.subtleBackground, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
    checkboxActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    checkboxErrorBox: { borderColor: colors.error },
    checkboxText: { fontSize: scaleFont(14), fontWeight: '500', color: colors.textPrimary },

    button: { backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 18, borderRadius: 12, marginTop: 6, alignItems: 'center' },
    buttonAccent: { backgroundColor: colors.secondary, paddingVertical: 15, paddingHorizontal: 18, borderRadius: 12, marginTop: 6, alignItems: 'center' },
    buttonDisabled: { opacity: 0.7 },
    buttonRow: { flexDirection: 'row', alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: scaleFont(16), fontWeight: 'bold', letterSpacing: 0.2 },
  }), [colors, scaleFont, bottomNavClearance]);
}
