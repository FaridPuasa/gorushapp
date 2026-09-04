import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, Pressable } from 'react-native';

const useNativeDriver = Platform.OS !== 'web';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

// Drop-in replacement for TouchableOpacity/Pressable that adds a hover-in/press-in scale
// (the "zoom in" feedback) — same style/onPress/disabled API, so most call sites are a
// straight rename. The scale lives directly on the Pressable's own style (not a wrapping
// View) so the whole box — background, padding and all — grows together instead of just
// its children, and no layout-affecting style needs to be split out.
export function AnimatedPressable({ children, style, scaleTo = 1.05, pressScaleTo, onPress, disabled, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const hovered = useRef(false);
  const pressDownScale = pressScaleTo ?? Math.max(1 - (scaleTo - 1) * 1.6, 0.9);

  const animateTo = (value) => {
    Animated.spring(scale, { toValue: value, useNativeDriver, speed: 20, bounciness: 6 }).start();
  };

  return (
    <AnimatedPressableBase
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => { hovered.current = true; animateTo(scaleTo); }}
      onHoverOut={() => { hovered.current = false; animateTo(1); }}
      onPressIn={() => animateTo(pressDownScale)}
      onPressOut={() => animateTo(hovered.current ? scaleTo : 1)}
      style={[style, { transform: [{ scale }] }]}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  );
}

// A simple "always play on mount" fade+slide, used for transient popups (dropdown panels)
// that should animate open every single time regardless of scroll position — unlike
// FadeIn/FadeInUp below, this has no notion of scroll visibility.
export function PopTransition({ children, delay = 0, style, duration = 180, distance = -8 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver }),
      Animated.timing(translateY, { toValue: 0, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver }),
    ]);
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

// Mounts/unmounts `children` based on `visible` — fading/sliding down into place on the
// way in, fading/sliding up on the way out (unmounting only once that finishes) — for
// toggle-style UI like an accordion answer or a tab's content, as opposed to
// FadeIn/FadeInUp's one-way, scroll-triggered reveal.
export function FadeToggle({ visible, children, style, duration = 180, distance = 12 }) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(visible ? 0 : -distance)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver }),
        Animated.timing(translateY, { toValue: 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver }),
        Animated.timing(translateY, { toValue: -distance, duration, easing: Easing.out(Easing.cubic), useNativeDriver }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

// --- Scroll-triggered reveal ---------------------------------------------------------
//
// One registry per scrollable page (created by PageScroll, or by any screen that owns
// its own ScrollView) tracks every FadeIn/FadeInUp mounted under it. Shortly after mount
// it measures each one's on-screen position: whatever is already inside the viewport at
// that point is shown immediately with no animation (so the page never looks like it's
// still loading), and whatever is off-screen stays invisible until a later scroll event
// brings it into view, at which point it plays its fade-in.
const RevealContext = createContext(null);

export function useRevealRegistry() {
  const entriesRef = useRef([]);
  const lastCheckRef = useRef(0);
  const pendingCheckRef = useRef(false);
  const everCheckedRef = useRef(false);

  return useMemo(() => {
    const runCheck = (isInitial) => {
      const winHeight = Dimensions.get('window').height;
      entriesRef.current.forEach((entry) => {
        if (entry.revealed) return;
        const node = entry.ref.current;
        if (!node || typeof node.measureInWindow !== 'function') return;
        node.measureInWindow((x, y) => {
          if (entry.revealed) return;
          // A little slack (60px) so content reveals a touch before it's fully on-screen.
          if (y < winHeight - 60) {
            entry.revealed = true;
            entry.onReveal(isInitial);
          }
        });
      });
    };

    // Re-armed on every batch of new registrations, not just the page's first one — a
    // Card that mounts later because of a user action (picking a product, opening a form)
    // needs its own visibility check too, or it just sits invisible until a scroll event
    // happens to trigger one, which reads as "the page didn't finish loading."
    const scheduleCheck = () => {
      if (pendingCheckRef.current) return;
      pendingCheckRef.current = true;
      const isInitial = !everCheckedRef.current;
      requestAnimationFrame(() => {
        pendingCheckRef.current = false;
        everCheckedRef.current = true;
        runCheck(isInitial);
      });
    };

    return {
      register: (entry) => { entriesRef.current.push(entry); scheduleCheck(); },
      unregister: (entry) => { entriesRef.current = entriesRef.current.filter((e) => e !== entry); },
      handleScroll: () => {
        if (!everCheckedRef.current) return;
        const now = Date.now();
        if (now - lastCheckRef.current < 120) return;
        lastCheckRef.current = now;
        runCheck(false);
      },
      recheck: () => {
        if (!everCheckedRef.current) return;
        runCheck(false);
      },
    };
  }, []);
}

// On mobile web, opening/closing the on-screen keyboard resizes `window.innerHeight`
// without firing a scroll event. A Card that measured as "below the fold" while the
// keyboard was open (and so was never revealed) would otherwise stay invisible forever
// even after the keyboard closes and it would now fit on screen — this re-runs the
// check whenever the viewport itself changes size, not just when the user scrolls.
export function useRevealOnResize(registry) {
  useEffect(() => {
    if (!registry) return undefined;
    const subscription = Dimensions.addEventListener('change', () => registry.recheck());
    return () => subscription?.remove?.();
  }, [registry]);
}

export function RevealProvider({ registry, children }) {
  return <RevealContext.Provider value={registry}>{children}</RevealContext.Provider>;
}

function useScrollReveal() {
  const registry = useContext(RevealContext);
  const ref = useRef(null);
  const [state, setState] = useState(() => (registry ? { revealed: false, instant: false } : { revealed: true, instant: true }));

  useEffect(() => {
    if (!registry) return;
    const entry = { ref, revealed: false, onReveal: (instant) => setState({ revealed: true, instant }) };
    registry.register(entry);
    return () => registry.unregister(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry]);

  return { ref, ...state };
}

// Opacity-only reveal, for section headers — appears in place, no movement. Instant (no
// animation) if already on-screen when the page's initial visibility check runs;
// otherwise fades in the moment it's scrolled into view.
export function FadeIn({ children, delay = 0, style, duration = 350 }) {
  const { ref, revealed, instant } = useScrollReveal();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!revealed) return;
    const anim = Animated.timing(opacity, {
      toValue: 1,
      duration: instant ? 0 : duration,
      delay: instant ? 0 : delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver,
    });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return <Animated.View ref={ref} style={[style, { opacity }]}>{children}</Animated.View>;
}

// Opacity + upward-translate reveal, for section body content — same instant-if-already-
// visible / animate-when-scrolled-into-view behavior as FadeIn, plus a rise into place.
export function FadeInUp({ children, delay = 0, style, duration = 450, distance = 20 }) {
  const { ref, revealed, instant } = useScrollReveal();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    if (!revealed) return;
    const d = instant ? 0 : duration;
    const dl = instant ? 0 : delay;
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: d, delay: dl, easing: Easing.out(Easing.cubic), useNativeDriver }),
      Animated.timing(translateY, { toValue: 0, duration: d, delay: dl, easing: Easing.out(Easing.cubic), useNativeDriver }),
    ]);
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  return <Animated.View ref={ref} style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
