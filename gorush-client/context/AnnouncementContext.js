import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAVBAR_HEIGHT, ANNOUNCEMENT_BAR_HEIGHT } from '../lib/theme';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

const AnnouncementContext = createContext(null);

export function AnnouncementProvider({ children }) {
  const { token, isGuest, loading: authLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    // Wait for auth to resolve first - the server picks announcements by
    // guest-vs-logged-in audience, so fetching before we know which one this
    // visitor is would risk showing the wrong list for a moment (or the
    // wrong one permanently, if this effect didn't also depend on auth
    // state and re-run once it resolves).
    if (authLoading) return;
    // Server already sorts by date descending — the first one banner-eligible
    // (showOnBanner !== false) is the one shown here. This is a separate
    // concern from the audience toggles above (already applied server-side)
    // and from the full Latest Updates list, which always shows every
    // audience-eligible announcement regardless of this flag.
    api.get('/api/announcements', { headers: !isGuest && token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => setAnnouncement(res.data.find((a) => a.showOnBanner !== false) || null))
      .catch(() => setAnnouncement(null));
  }, [authLoading, isGuest, token]);

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
