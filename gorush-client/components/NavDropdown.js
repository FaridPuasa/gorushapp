import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable, PopTransition } from '../lib/animations';

export default function NavDropdown({ label, items, isOpen, onToggle, onClose, align = 'left' }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const styles = useMemo(() => makeStyles(colors, scaleFont), [colors, scaleFont]);
  const chevronSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(chevronSpin, { toValue: isOpen ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [isOpen, chevronSpin]);

  const chevronRotate = chevronSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.wrapper}>
      <AnimatedPressable scaleTo={1.04} style={styles.trigger} onPress={onToggle}>
        <Text style={styles.triggerText}>{label}</Text>
        <Animated.Text style={[styles.chevron, { transform: [{ rotate: chevronRotate }] }]}>▾</Animated.Text>
      </AnimatedPressable>

      {isOpen && (
        <PopTransition style={[styles.panel, align === 'right' ? { right: 0 } : { left: 0 }]}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <AnimatedPressable
                key={item.label}
                scaleTo={1.02}
                style={[styles.item, !isLast && styles.itemDivider]}
                href={item.href}
                onPress={() => {
                  if (item.href) router.push(item.href);
                  item.onPress?.();
                  onClose?.();
                }}
              >
                <Text style={styles.itemText}>{item.icon ? `${item.icon} ` : ''}{item.label}</Text>
              </AnimatedPressable>
            );
          })}
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
      minWidth: 210,
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      zIndex: 100,
    },
    item: { paddingVertical: 11, paddingHorizontal: 16 },
    itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
    itemText: { fontSize: scaleFont(13), color: colors.textPrimary, fontWeight: '500' },
  });
}
