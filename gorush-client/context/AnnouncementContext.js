import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAVBAR_HEIGHT, ANNOUNCEMENT_BAR_HEIGHT } from '../lib/theme';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const AnnouncementContext = createContext(null);

export function AnnouncementProvider({ children }) {
  const { isGuest, loading: authLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    // The list itself (/api/announcements) is the same for everyone - wait
    // for auth to resolve just to know which banner field (guest vs
    // logged-in) applies to this visitor before picking one, so it doesn't
    // show the wrong audience's pick for a moment.
    if (authLoading) return;
    // Server already sorts by date descending — the first one banner-
    // eligible for THIS viewer's audience (showOnBannerToGuests/
    // showOnBannerToLoggedIn) is the one shown here. Controlled
    // independently per audience - an announcement can be on the banner for
    // guests but not logged-in users, or vice versa. Independent of the
    // full Latest Updates list, which always shows every announcement to
    // everyone regardless of either banner flag.
    const bannerField = isGuest ? 'showOnBannerToGuests' : 'showOnBannerToLoggedIn';
    api.get('/api/announcements')
      .then((res) => setAnnouncement(res.data.find((a) => a[bannerField] !== false) || null))
      .catch(() => setAnnouncement(null));
  }, [authLoading, isGuest]);

  const value = {
    dismissed,
    dismiss: () => setDismissed(true),
    announcement,
  };

  return <AnnouncementContext.Provider value={value}>{children}</AnnouncementContext.Provider>;
}

export function useAnnouncement() {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) throw new Error('useAnnouncement must be used within an AnnouncementProvider');
  return ctx;
}

export function useChromeHeight() {
  const insets = useSafeAreaInsets();
  const { dismissed, announcement } = useAnnouncement();
  return insets.top + NAVBAR_HEIGHT + (dismissed || !announcement ? 0 : ANNOUNCEMENT_BAR_HEIGHT);
}
