import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAVBAR_HEIGHT, ANNOUNCEMENT_BAR_HEIGHT } from '../lib/theme';
import { api } from '../lib/api';

const AnnouncementContext = createContext(null);

export function AnnouncementProvider({ children }) {
  const [dismissed, setDismissed] = useState(false);
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    // Server already sorts by date descending — the first one is the latest.
    api.get('/api/announcements')
      .then((res) => setAnnouncement(res.data[0] || null))
      .catch(() => setAnnouncement(null));
  }, []);

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
