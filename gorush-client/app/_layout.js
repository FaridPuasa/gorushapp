import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AnnouncementProvider } from '../context/AnnouncementContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { FontScaleProvider } from '../context/FontScaleContext';
import Navbar from '../components/Navbar';
import AnnouncementBar from '../components/AnnouncementBar';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <FontScaleProvider>
              <AnnouncementProvider>
                <AppShell />
              </AnnouncementProvider>
            </FontScaleProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Confines staff accounts (admin, jpmc) to their own area, and — the other direction —
// keeps everyone else out of it, since neither /admin nor /jpmc-portal has a guard of its own
// and would otherwise render for any guest or customer who navigates there directly (the
// server-side requireAdmin/requireRole checks only protect the write endpoints, not the page
// itself). A single check here instead of guarding every page individually. Login/register stay
// reachable so logging out and back in as a different account still works.
function AdminGuard() {
  const { isAdmin, isJpmc, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (isAdmin) {
      const allowed = pathname === '/admin' || pathname === '/jpmc-portal' || pathname === '/login';
      if (!allowed) router.replace('/admin');
    } else if (isJpmc) {
      const allowed = pathname === '/jpmc-portal' || pathname === '/login';
      if (!allowed) router.replace('/jpmc-portal');
    } else if (pathname === '/admin' || pathname === '/jpmc-portal') {
      router.replace('/');
    }
  }, [loading, isAdmin, isJpmc, pathname]);

  return null;
}

// Forces any logged-in customer whose saved JPMC/PJSC Patient No. predates the
// Appointment Location field (added with no way to say which location the number
// belongs to) to fix it before using the rest of the app - `needsJpmcAppointmentLocation`
// is computed server-side in /api/auth/me across ALL of the user's saved personal-detail
// entries, not just the default one. /edit-profile and /login stay reachable so the fix
// itself, and switching accounts, both still work.
function JpmcAppointmentGuard() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user?.needsJpmcAppointmentLocation) return;
    if (pathname !== '/edit-profile' && pathname !== '/login') router.replace('/edit-profile');
  }, [loading, user?.needsJpmcAppointmentLocation, pathname]);

  return null;
}

// GA's automatic pageview only fires once on the initial document load; expo-router
// navigates client-side after that, so each route change is reported here instead.
function AnalyticsPageViews() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.gtag) return;
    window.gtag('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
    });
  }, [pathname]);

  return null;
}

function AppShell() {
  const insets = useSafeAreaInsets();
  const { mode, colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AdminGuard />
      <JpmcAppointmentGuard />
      <AnalyticsPageViews />
      <AnnouncementBar />
      <Navbar />
      <Slot />
    </View>
  );
}
