import React, { useState, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Text, View, StyleSheet } from 'react-native';
import { Card } from '../lib/formPrimitives';
import { AnimatedPressable, FadeToggle } from '../lib/animations';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { useIsMobile } from '../lib/responsive';

const useNativeDriver = Platform.OS !== 'web';

export default function FaqAccordion() {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const isMobile = useIsMobile();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const styles = useMemo(() => makeStyles(colors, scaleFont), [colors, scaleFont]);
  const listOpacity = useRef(new Animated.Value(1)).current;

  const CATEGORIES = [
    { key: 'pharmacy', label: t('home.faq.categoryPharmacy'), nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    { key: 'local', label: t('home.faq.categoryLocal'), nums: [11, 12, 13, 14] },
    { key: 'general', label: t('home.faq.categoryGeneral'), nums: [15, 16, 17, 18] },
  ];
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);

  const activeFaqs = (CATEGORIES.find((c) => c.key === activeCategory)?.nums || [])
    .map((n) => ({ question: t(`home.faq.q${n}`), answer: t(`home.faq.a${n}`) }));

  // Crossfade: fade the current list out, swap category once it's invisible, then fade
  // the new list back in — reads as one tab's content handing off to the next rather
  // than an instant swap.
  const selectCategory = (key) => {
    if (key === activeCategory) return;
    Animated.timing(listOpacity, { toValue: 0, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver }).start(() => {
      setActiveCategory(key);
      setExpandedIndex(null);
      Animated.timing(listOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver }).start();
    });
  };

  return (
    <Card icon="❓" title={t('home.faq.title')} centered>
      <View style={styles.tabRow}>
        {CATEGORIES.map((cat) => {
          const isActive = cat.key === activeCategory;
          return (
            <AnimatedPressable
              key={cat.key}
              scaleTo={1.05}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => selectCategory(cat.key)}
            >
              <Text style={isActive ? styles.tabTextActive : styles.tabText}>{cat.label}</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <Animated.View style={{ opacity: listOpacity }}>
        {activeFaqs.map((faq, index) => {
          const isOpen = expandedIndex === index;
          return (
            <AnimatedPressable
              key={index}
              scaleTo={1.01}
              style={[styles.row, index === activeFaqs.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setExpandedIndex(isOpen ? null : index)}
            >
              <View style={styles.questionRow}>
                <Text style={styles.question}>{faq.question}</Text>
                <Text style={styles.toggleIcon}>{isOpen ? '−' : '+'}</Text>
              </View>
              <FadeToggle visible={isOpen}>
                <Text style={styles.answer}>{faq.answer}</Text>
              </FadeToggle>
            </AnimatedPressable>
          );
        })}
      </Animated.View>
    </Card>
  );
}

function makeStyles(colors, scaleFont) {
  return StyleSheet.create({
    tabRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { fontSize: scaleFont(13), fontWeight: '600', color: colors.textSecondary },
    tabTextActive: { fontSize: scaleFont(13), fontWeight: '700', color: colors.primary },
    row: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    questionRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    question: { fontSize: scaleFont(14), fontWeight: '600', color: colors.textPrimary, marginRight: 10, lineHeight: scaleFont(20), textAlign: 'center' },
    toggleIcon: { fontSize: scaleFont(18), fontWeight: 'bold', color: colors.primary },
    answer: { fontSize: scaleFont(13), color: colors.textSecondary, marginTop: 10, lineHeight: scaleFont(20), textAlign: 'center' },
  });
}
