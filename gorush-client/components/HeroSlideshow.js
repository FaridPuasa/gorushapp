import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, useWindowDimensions, ImageBackground, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { useChromeHeight } from '../context/AnnouncementContext';
import { useIsMobile } from '../lib/responsive';
import { renderRichText } from '../lib/announcements';
import { api } from '../lib/api';
import { AnimatedPressable } from '../lib/animations';

const FALLBACK_COLORS = (colors) => [colors.primary, colors.secondary, colors.tertiary];

export default function HeroSlideshow() {
  const { width, height } = useWindowDimensions();
  const chromeHeight = useChromeHeight();
  const heroHeight = Math.max(height - chromeHeight, 320);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slides, setSlides] = useState([]);
  const listRef = useRef(null);
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const isMobile = useIsMobile();
  const styles = useMemo(() => makeStyles(scaleFont), [scaleFont]);
  const fallbackColors = FALLBACK_COLORS(colors);

  useEffect(() => {
    api.get('/api/slides')
      .then((res) => setSlides(res.data))
      .catch(() => {});
  }, []);

  const handleMomentumEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  // The dots and arrows are the only way to move between slides with a mouse — a horizontal
  // FlatList has no drag-to-scroll on web (only touch/trackpad swipe), so desktop visitors
  // with neither had no way to advance the slideshow at all.
  const goToIndex = (index) => {
    if (slides.length === 0) return;
    const wrapped = (index + slides.length) % slides.length;
    listRef.current?.scrollToOffset({ offset: wrapped * width, animated: true });
    setActiveIndex(wrapped);
  };

  // Auto-advance, wrapping back to the first slide — re-armed off `activeIndex` itself, so
  // a manual arrow/dot tap resets the wait instead of fighting with a fixed-tick interval.
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setTimeout(() => goToIndex(activeIndex + 1), 5000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, slides.length, width]);

  if (slides.length === 0) return <View style={[styles.wrapper, { height: heroHeight }]} />;

  return (
    <View style={[styles.wrapper, { height: heroHeight }]}>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        keyExtractor={(item, index) => item._id || String(index)}
        renderItem={({ item, index }) => {
          const slideStyle = [styles.slide, { width, height: heroHeight, backgroundColor: fallbackColors[index % fallbackColors.length] }];
          const inner = (
            <>
              {!!item.headline && <Text style={styles.headline}>{renderRichText(item.headline, styles.headline)}</Text>}
              {!!item.subtext && <Text style={styles.subtext}>{renderRichText(item.subtext, styles.subtext)}</Text>}
            </>
          );
          const content = item.image ? (
            <ImageBackground source={{ uri: item.image }} style={slideStyle}>{inner}</ImageBackground>
          ) : (
            <View style={slideStyle}>{inner}</View>
          );
          return item.linkUrl ? (
            <Pressable onPress={() => Linking.openURL(item.linkUrl)}>{content}</Pressable>
          ) : content;
        }}
      />
      {!isMobile && slides.length > 1 && (
        <>
          <AnimatedPressable scaleTo={1.12} style={[styles.arrow, styles.arrowLeft]} onPress={() => goToIndex(activeIndex - 1)}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </AnimatedPressable>
          <AnimatedPressable scaleTo={1.12} style={[styles.arrow, styles.arrowRight]} onPress={() => goToIndex(activeIndex + 1)}>
            <Ionicons name="chevron-forward" size={26} color="#fff" />
          </AnimatedPressable>
        </>
      )}
      <View style={styles.dots}>
        {slides.map((_, index) => (
          <AnimatedPressable key={index} scaleTo={1.3} onPress={() => goToIndex(index)} style={styles.dotHitArea}>
            <View style={[styles.dot, index === activeIndex && styles.dotActive]} />
          </AnimatedPressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(scaleFont) {
  return StyleSheet.create({
    wrapper: { width: '100%' },
    slide: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    headline: { color: '#fff', fontSize: scaleFont(38), fontWeight: 'bold', textAlign: 'center', marginBottom: 16, lineHeight: scaleFont(44) },
    subtext: { color: 'rgba(255,255,255,0.92)', fontSize: scaleFont(17), textAlign: 'center', maxWidth: 560, lineHeight: scaleFont(25) },
    dots: { position: 'absolute', bottom: 24, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
    dotHitArea: { paddingHorizontal: 6, paddingVertical: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
    dotActive: { backgroundColor: '#fff', width: 22 },
    arrow: {
      position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    },
    arrowLeft: { left: 20 },
    arrowRight: { right: 20 },
  });
}
