import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable, PopTransition } from '../lib/animations';

const shadow = Platform.select({
  web: { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
  android: { elevation: 6 },
  default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
});

// A wider, two-column "mega menu" for Our Company — each item gets an icon badge, a bold
// title, and a short description line, matching the live site's own dropdown layout.
// Sibling to NavDropdown (same trigger/onToggle/onClose contract) rather than a variant of
// it, since NavDropdown's plain single-column list is still the right shape for the
// account/settings menus.
export default function CompanyMegaMenu({ label, items, isOpen, onToggle, onClose, align = 'left' }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const styles = useMemo(() => makeStyles(colors, scaleFont), [colors, scaleFont]);
  const chevronSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronSpin, { toValue: isOpen ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [isOpen, chevronSpin]);

  const chevronRotate = chevronSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  // Explicit rows of (up to) 2 items rather than a single flexWrap:'wrap' row — flexBasis
  // percentages can still end up reading as 3-up/uneven once item content (title +
  // description) gets wide at larger font-scale settings, whereas chunking into fixed
  // rows guarantees the intended 2-2-1 layout regardless of content width.
  const rows = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={styles.wrapper}>
      <AnimatedPressable scaleTo={1.04} style={styles.trigger} onPress={onToggle}>
        <Text style={styles.triggerText}>{label}</Text>
        <Animated.Text style={[styles.chevron, { transform: [{ rotate: chevronRotate }] }]}>▾</Animated.Text>
      </AnimatedPressable>

      {isOpen && (
        <PopTransition style={[styles.panel, align === 'right' ? { right: 0 } : { left: 0 }]}>
          {rows.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((item) => (
                <AnimatedPressable
                  key={item.label}
                  scaleTo={1.02}
                  style={styles.item}
                  href={item.href}
                  onPress={() => {
                    if (item.href) router.push(item.href);
                    item.onPress?.();
                    onClose?.();
                  }}
                >
                  <View style={styles.badge}>
                    <Ionicons name={item.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{item.label}</Text>
                    {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                  </View>
                </AnimatedPressable>
              ))}
            </View>
          ))}
        </PopTransition>
      )}
    </View>
  );
}

function makeStyles(colors, scaleFont) {
  return StyleSheet.create({
    wrapper: { position: 'relative' },
    trigger: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9 },
    triggerText: { color: colors.textPrimary, fontWeight: '600', fontSize: scaleFont(13) },
    chevron: { color: colors.textSecondary, fontSize: scaleFont(11), marginLeft: 4 },
    panel: {
      position: 'absolute',
      top: '100%',
      marginTop: 8,
      width: 440,
      maxWidth: Platform.OS === 'web' ? 'calc(100vw - 32px)' : undefined,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      zIndex: 100,
      ...shadow,
    },
    row: { flexDirection: 'row' },
    item: { flexBasis: '50%', flexDirection: 'row', alignItems: 'flex-start', padding: 8, borderRadius: 10 },
    badge: {
      width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryLight,
      alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0,
    },
    itemText: { flex: 1 },
    itemTitle: { fontSize: scaleFont(14), fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    itemDesc: { fontSize: scaleFont(12), color: colors.textMuted, lineHeight: scaleFont(16) },
  });
}
