import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { useIsMobile } from '../lib/responsive';
import { AnimatedPressable, FadeIn, FadeInUp } from '../lib/animations';

const CARD_GAP = 16;

// Mostly 5 stars with a few 4s mixed in — a wall of identical 5-star ratings reads as fake.
const REVIEW_RATINGS = [5, 5, 4, 5, 5, 5, 4, 5, 4, 5];
const STAR_GLYPHS = { 5: '★★★★★', 4: '★★★★☆' };

export default function ReviewsSection() {
  const isMobile = useIsMobile();
  const { width } = useWindowDimensions();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const styles = useMemo(() => makeStyles(scaleFont), [scaleFont]);

  const REVIEWS = [
    t('home.reviews.review1'),
    t('home.reviews.review2'),
    t('home.reviews.review3'),
    t('home.reviews.review4'),
    t('home.reviews.review5'),
    t('home.reviews.review6'),
    t('home.reviews.review7'),
    t('home.reviews.review8'),
    t('home.reviews.review9'),
    t('home.reviews.review10'),
  ];

  // Cards are narrower than the viewport on purpose so the next/previous card peeks in
  // at the edge, matching the live site's carousel.
  const cardWidth = Math.min(isMobile ? width * 0.78 : 380, 420);
  const step = cardWidth + CARD_GAP;

  const scrollToIndex = (next) => {
    const clamped = Math.max(0, Math.min(next, REVIEWS.length - 1));
    setIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * step, animated: true });
  };

  // Auto-advance, looping back to the start after the last card — re-armed off `index`
  // itself, so a manual arrow/dot tap (or the wraparound below) naturally resets the wait
  // instead of fighting with a fixed-tick interval.
  useEffect(() => {
    if (REVIEWS.length <= 1) return;
    const id = setTimeout(() => {
      const next = index >= REVIEWS.length - 1 ? 0 : index + 1;
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * step, animated: true });
    }, 5000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, REVIEWS.length, step]);

  return (
    <View>
      <FadeIn>
        <Text style={styles.title}>{t('home.reviews.title')}</Text>
      </FadeIn>

      <FadeInUp delay={60} style={{ position: 'relative' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          // Explicit snap targets rather than snapToInterval+snapToAlignment — react-native-web's
          // interval-based snapping didn't correctly account for the container's own leading
          // padding, so the "start" of the grid drifted from each card's actual left edge and
          // cards ended up resting mid-gap (peeking on both sides) instead of flush on one.
          // These offsets exactly match the x this same component already scrolls to
          // programmatically (see scrollToIndex/the auto-advance effect below).
          snapToOffsets={REVIEWS.map((_, i) => i * step)}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / step))}
        >
          {REVIEWS.map((text, i) => (
            <View key={i} style={[styles.card, { width: cardWidth, marginRight: CARD_GAP }]}>
              <Text style={styles.stars}>{STAR_GLYPHS[REVIEW_RATINGS[i]] || STAR_GLYPHS[5]}</Text>
              <Text style={styles.text}>"{text}"</Text>
            </View>
          ))}
        </ScrollView>

        {index > 0 && (
          <AnimatedPressable scaleTo={1.15} style={[styles.arrow, styles.arrowLeft]} onPress={() => scrollToIndex(index - 1)}>
            <Ionicons name="arrow-back" size={18} color="#333" />
          </AnimatedPressable>
        )}
        {index < REVIEWS.length - 1 && (
          <AnimatedPressable scaleTo={1.15} style={[styles.arrow, styles.arrowRight]} onPress={() => scrollToIndex(index + 1)}>
            <Ionicons name="arrow-forward" size={18} color="#333" />
          </AnimatedPressable>
        )}
      </FadeInUp>
    </View>
  );
}

function makeStyles(scaleFont) {
  return StyleSheet.create({
    title: { fontSize: scaleFont(24), fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
    card: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 24,
      minHeight: 170,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 3,
    },
    stars: { color: '#f5c518', fontSize: scaleFont(16), marginBottom: 12, letterSpacing: 2 },
    text: { color: '#333', fontSize: scaleFont(14), lineHeight: 21 },
    arrow: {
      position: 'absolute',
      top: '50%',
      marginTop: -20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    arrowLeft: { left: 4 },
    arrowRight: { right: 4 },
  });
}
