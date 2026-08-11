import React, { useRef, useEffect } from 'react';
import { Animated, ScrollView, View, useWindowDimensions } from 'react-native';
import Head from 'expo-router/head';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormStyles } from '../lib/formPrimitives';
import { BOTTOM_NAV_HEIGHT } from '../lib/theme';
import { useIsMobile } from '../lib/responsive';
import { useChromeHeight } from '../context/AnnouncementContext';
import { RevealProvider, useRevealRegistry } from '../lib/animations';
import Footer from '../components/Footer';
import HeroSlideshow from '../components/HeroSlideshow';
import TrackingLookup from '../components/TrackingLookup';
import FaqAccordion from '../components/FaqAccordion';
import ReviewsSection from '../components/ReviewsSection';

export default function Home() {
  const formStyles = useFormStyles();
  const scrollRef = useRef(null);
  const revealRegistry = useRevealRegistry();
  const scrollY = useRef(new Animated.Value(0)).current;
  const handleScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: false,
      listener: revealRegistry.handleScroll,
    })
  ).current;
  const { height } = useWindowDimensions();
  const chromeHeight = useChromeHeight();
  const { section } = useLocalSearchParams();
  const isMobile = useIsMobile();
  const insets = useSafeAreaInsets();
  // Footer (which normally closes off the page) renders nothing on mobile — the sticky
  // bottom nav bar sits on top of the scroll content instead, so without this the last
  // section (Reviews) ends up covered by it rather than scrolling clear.
  const bottomClearance = isMobile ? BOTTOM_NAV_HEIGHT + insets.bottom : 0;

  useEffect(() => {
    if (section === 'tracking') {
      const heroHeight = Math.max(height - chromeHeight, 320);
      scrollRef.current?.scrollTo({ y: heroHeight, animated: true });
    }
  }, [section, height, chromeHeight]);

  return (
    <>
      <Head>
        <title>Home — Go Rush</title>
      </Head>
      <ScrollView
        ref={scrollRef}
        style={formStyles.masterScroll}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomClearance }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Hero is the page's own header — rendered outside the reveal provider below so
            it always shows instantly, never gated on scroll position. */}
        <HeroSlideshow />
        <RevealProvider registry={revealRegistry}>
          <TrackingLookup scrollY={scrollY} />
          <View style={formStyles.masterContent}>
            <View style={formStyles.formWrapper}>
              <FaqAccordion />
            </View>
          </View>
          <View style={{ width: '100%', backgroundColor: '#3976ba', paddingVertical: 48 }}>
            <ReviewsSection />
          </View>
        </RevealProvider>
        <Footer />
      </ScrollView>
    </>
  );
}
