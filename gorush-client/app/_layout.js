import React, { useEffect } from 'react';
import { View } from 'react-native';
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

// Confines the admin account to the /admin area, and — the other direction — keeps everyone
// else out of it, since /admin has no guard of its own and would otherwise render for any
// guest or customer who navigates there directly (the server-side requireAdmin check only
// protects the write endpoints, not the page itself). A single check here instead of guarding
// every page individually. Login/register stay reachable so logging out and back in as a
// different account still works.
function AdminGuard() {
  const { isAdmin, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (isAdmin) {
      const allowed = pathname === '/admin' || pathname === '/login';
      if (!allowed) router.replace('/admin');
    } else if (pathname === '/admin') {
      router.replace('/');
    }
  }, [loading, isAdmin, pathname]);

  return null;
}

function AppShell() {
  const insets = useSafeAreaInsets();
  const { mode, colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AdminGuard />
      <AnnouncementBar />
      <Navbar />
      <Slot />
    </View>
  );
}
