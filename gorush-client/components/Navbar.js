import React, { useState, useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform, Modal, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { NAVBAR_HEIGHT, BOTTOM_NAV_HEIGHT } from '../lib/theme';
import { maskEmail } from '../lib/validators';
import { MOBILE_BREAKPOINT } from '../lib/responsive';
import NavDropdown from './NavDropdown';
import CompanyMegaMenu from './CompanyMegaMenu';
import SettingsDropdown from './SettingsDropdown';
import ThemeToggle from './ThemeToggle';
import LanguagePicker from './LanguagePicker';
import FontScalePicker from './FontScalePicker';
import { AnimatedPressable } from '../lib/animations';

const BAR_HEIGHT = NAVBAR_HEIGHT;

export default function Navbar() {
  const { user, isGuest, isAdmin, loading, logout } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const styles = useMemo(() => makeStyles(colors, scaleFont), [colors, scaleFont]);

  const COMPANY_ITEMS = [
    { label: t('nav.aboutUs'), description: t('nav.aboutUsDesc'), href: '/about-us', icon: 'information-circle-outline' },
    { label: t('nav.deliveryPrice'), description: t('nav.deliveryPriceDesc'), href: '/delivery-rates', icon: 'cash-outline' },
    { label: t('nav.calculator'), description: t('nav.calculatorDesc'), href: '/local-delivery-calculator', icon: 'calculator-outline' },
    { label: t('nav.careers'), description: t('nav.careersDesc'), href: '/careers', icon: 'people-outline' },
    { label: t('nav.contactUs'), description: t('nav.contactUsDesc'), href: '/contact-us', icon: 'call-outline' },
  ];

  // Same set as COMPANY_ITEMS plus Privacy Policy (previously footer-only), minus Contact
  // Us — that one gets its own bottom-nav icon instead, so Order Now can sit dead-center
  // with two items on each side.
  const INFO_ITEMS = [
    { label: t('nav.aboutUs'), href: '/about-us', icon: '🏢' },
    { label: t('nav.deliveryPrice'), href: '/delivery-rates', icon: '🚚' },
    { label: t('nav.calculator'), href: '/local-delivery-calculator', icon: '🧮' },
    { label: t('nav.careers'), href: '/careers', icon: '💼' },
    { label: t('footer.privacyPolicy'), href: '/privacy-policy', icon: '🔒' },
  ];

  const GUEST_MENU_ITEMS = [
    { label: t('nav.logIn'), href: '/login', icon: '🔑' },
    { label: t('nav.register'), href: '/sign-up', icon: '📝' },
  ];

  const [openMenu, setOpenMenu] = useState(null); // 'company' | 'user' | 'settings' | null
  const [infoOpen, setInfoOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(null); // 'settings' | 'user' | null

  const closeAll = () => setOpenMenu(null);

  const closeAccountMenu = () => {
    setAccountMenuOpen(false);
    setAccountExpanded(null);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const userItems = [
    { label: t('nav.myOrders'), href: '/my-orders' },
    { label: t('nav.editProfile'), href: '/edit-profile' },
    { label: t('nav.logOut'), onPress: handleLogout },
  ];

  const goTo = (href) => router.push(href);

  return (
    <>
      <View style={styles.wrapper}>
        <View style={[styles.bar, isMobile && styles.barMobile]}>
          {isMobile ? (
            <>
              <View style={styles.mobileLogoCenter} pointerEvents="box-none">
                <AnimatedPressable scaleTo={1.08} href={isAdmin ? '/admin' : '/'} onPress={() => goTo(isAdmin ? '/admin' : '/')}>
                  <Image source={require('../assets/logo.png')} style={styles.brandImage} resizeMode="contain" />
                </AnimatedPressable>
              </View>
              <AnimatedPressable scaleTo={1.12} style={[styles.hamburger, styles.hamburgerMobile]} onPress={() => setAccountMenuOpen((v) => !v)}>
                <Text style={styles.hamburgerIcon}>{accountMenuOpen ? '✕' : '☰'}</Text>
              </AnimatedPressable>
            </>
          ) : (
          <AnimatedPressable scaleTo={1.08} href={isAdmin ? '/admin' : '/'} onPress={() => goTo(isAdmin ? '/admin' : '/')}>
            <Image source={require('../assets/logo.png')} style={styles.brandImage} resizeMode="contain" />
          </AnimatedPressable>
          )}
          {!isMobile && (
          <View style={styles.desktopLinks}>
            {isAdmin ? (
              !loading && (
                <>
                  <SettingsDropdown
                    align="right"
                    isOpen={openMenu === 'settings'}
                    onToggle={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}
                  />
                  <AnimatedPressable scaleTo={1.04} style={styles.navItem} onPress={handleLogout}>
                    <Text style={styles.navText}>{t('nav.logOut')}</Text>
                  </AnimatedPressable>
                </>
              )
            ) : (
              <>
                <AnimatedPressable scaleTo={1.04} style={styles.navItem} href="/" onPress={() => goTo('/')}>
                  <Text style={styles.navText}>{t('nav.home')}</Text>
                </AnimatedPressable>

                <AnimatedPressable scaleTo={1.04} style={styles.orderButton} href="/order-form" onPress={() => goTo('/order-form')}>
                  <Text style={styles.orderButtonText}>{t('nav.orderNow')}</Text>
                </AnimatedPressable>

                {isGuest && (
                  <AnimatedPressable scaleTo={1.04} style={styles.wargaEmasButton} href="/warga-emas-form" onPress={() => goTo('/warga-emas-form')}>
                    <Text style={styles.wargaEmasButtonText}>{t('nav.wargaEmas')}</Text>
                  </AnimatedPressable>
                )}

                <AnimatedPressable
                  scaleTo={1.04}
                  style={styles.trackOrderButton}
                  href="/?section=tracking"
                  onPress={() => router.push({ pathname: '/', params: { section: 'tracking' } })}
                >
                  <Text style={styles.trackOrderButtonText}>{t('nav.trackOrder')}</Text>
                </AnimatedPressable>

                <CompanyMegaMenu
                  label={t('nav.ourCompany')}
                  items={COMPANY_ITEMS}
                  isOpen={openMenu === 'company'}
                  onToggle={() => setOpenMenu(openMenu === 'company' ? null : 'company')}
                  onClose={closeAll}
                  align="right"
                />

                {!loading && (
                  isGuest ? (
                    <>
                      <SettingsDropdown
                        align="right"
                        isOpen={openMenu === 'settings'}
                        onToggle={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}
                      />
                      <AnimatedPressable scaleTo={1.04} style={styles.navItem} href="/login" onPress={() => goTo('/login')}>
                        <Text style={styles.navText}>{t('nav.logIn')}</Text>
                      </AnimatedPressable>
                      <AnimatedPressable scaleTo={1.04} style={styles.registerButton} href="/sign-up" onPress={() => goTo('/sign-up')}>
                        <Text style={styles.registerButtonText}>{t('nav.register')}</Text>
                      </AnimatedPressable>
                    </>
                  ) : (
                    <>
                      <SettingsDropdown
                        align="right"
                        isOpen={openMenu === 'settings'}
                        onToggle={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}
                      />
                      <NavDropdown
                        label={user?.email ? maskEmail(user.email) : t('nav.account')}
                        items={userItems}
                        isOpen={openMenu === 'user'}
                        onToggle={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
                        onClose={closeAll}
                        align="right"
                      />
                    </>
                  )
                )}
              </>
            )}
          </View>
          )}
        </View>

        {openMenu && (
          <Pressable
            onPress={closeAll}
            style={[styles.dropdownOverlay, { top: BAR_HEIGHT, width, height }]}
          />
        )}
      </View>

      {isMobile && !isAdmin && (
        <View style={[styles.bottomNav, { height: BOTTOM_NAV_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
          <AnimatedPressable scaleTo={1.15} style={styles.bottomNavItem} href="/" onPress={() => goTo('/')}>
            <Ionicons name="home" size={scaleFont(24)} color={colors.textPrimary} />
          </AnimatedPressable>
          <AnimatedPressable
            scaleTo={1.15}
            style={styles.bottomNavItem}
            href="/?section=tracking"
            onPress={() => router.push({ pathname: '/', params: { section: 'tracking' } })}
          >
            <Ionicons name="search" size={scaleFont(24)} color={colors.textPrimary} />
          </AnimatedPressable>
          <AnimatedPressable scaleTo={1.06} style={styles.bottomNavCenterButton} href="/order-form" onPress={() => goTo('/order-form')}>
            <Text style={styles.bottomNavCenterText}>{t('nav.orderNow').replace(' ', '\n')}</Text>
          </AnimatedPressable>
          <AnimatedPressable scaleTo={1.15} style={styles.bottomNavItem} onPress={() => setInfoOpen(true)}>
            <Ionicons name="information-circle" size={scaleFont(24)} color={colors.textPrimary} />
          </AnimatedPressable>
          <AnimatedPressable scaleTo={1.15} style={styles.bottomNavItem} href="/contact-us" onPress={() => goTo('/contact-us')}>
            <Ionicons name="call" size={scaleFont(24)} color={colors.textPrimary} />
          </AnimatedPressable>
        </View>
      )}

      {isMobile && (
        <Modal visible={infoOpen} transparent animationType="slide" onRequestClose={() => setInfoOpen(false)}>
          <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setInfoOpen(false)} />
            <SafeAreaView style={[styles.sheetContainer, { height: Math.round(height * 0.55) }]} edges={['bottom']}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.mobileItemText}>ℹ️ {t('nav.information')}</Text>
                <AnimatedPressable scaleTo={1.12} style={styles.hamburger} onPress={() => setInfoOpen(false)}>
                  <Text style={styles.hamburgerIcon}>✕</Text>
                </AnimatedPressable>
              </View>
              <ScrollView style={{ flex: 1 }}>
                {isGuest && (
                  <AnimatedPressable
                    scaleTo={1.02}
                    style={[styles.mobileItem, { backgroundColor: '#FFC72C' }]}
                    href="/warga-emas-form"
                    onPress={() => { goTo('/warga-emas-form'); setInfoOpen(false); }}
                  >
                    <Text style={[styles.mobileItemText, { color: '#000' }]}>{t('nav.wargaEmas')}</Text>
                  </AnimatedPressable>
                )}
                {INFO_ITEMS.map((item) => (
                  <AnimatedPressable
                    key={item.href}
                    scaleTo={1.02}
                    style={styles.mobileItem}
                    href={item.href}
                    onPress={() => { goTo(item.href); setInfoOpen(false); }}
                  >
                    <Text style={styles.mobileItemText}>{item.icon} {item.label}</Text>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </SafeAreaView>
          </View>
        </Modal>
      )}

      {isMobile && (
        <Modal visible={accountMenuOpen} transparent={false} animationType="none" onRequestClose={closeAccountMenu}>
          <SafeAreaView style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <AnimatedPressable scaleTo={1.08}>
                <Image source={require('../assets/logo.png')} style={styles.brandImage} resizeMode="contain" />
              </AnimatedPressable>
              <AnimatedPressable scaleTo={1.12} style={styles.hamburger} onPress={closeAccountMenu}>
                <Text style={styles.hamburgerIcon}>✕</Text>
              </AnimatedPressable>
            </View>
            <ScrollView style={styles.mobileMenu}>
              <AnimatedPressable
                scaleTo={1.02}
                style={styles.mobileItem}
                onPress={() => setAccountExpanded(accountExpanded === 'settings' ? null : 'settings')}
              >
                <Text style={styles.mobileItemText}>⚙️ {t('nav.settings')} {accountExpanded === 'settings' ? '▴' : '▾'}</Text>
              </AnimatedPressable>
              {accountExpanded === 'settings' && (
                <View style={styles.mobileSettingsPanel}>
                  <ThemeToggle />
                  <View style={{ height: 10 }} />
                  <LanguagePicker />
                  <View style={{ height: 10 }} />
                  <FontScalePicker />
                </View>
              )}

              {!loading && (
                isAdmin ? (
                  <AnimatedPressable scaleTo={1.02} style={styles.mobileItem} onPress={() => { handleLogout(); closeAccountMenu(); }}>
                    <Text style={styles.mobileItemText}>{t('nav.logOut')}</Text>
                  </AnimatedPressable>
                ) : isGuest ? (
                  GUEST_MENU_ITEMS.map((item) => (
                    <AnimatedPressable
                      key={item.href}
                      scaleTo={1.02}
                      style={styles.mobileItem}
                      href={item.href}
                      onPress={() => { goTo(item.href); closeAccountMenu(); }}
                    >
                      <Text style={styles.mobileItemText}>{item.icon} {item.label}</Text>
                    </AnimatedPressable>
                  ))
                ) : (
                  <>
                    <AnimatedPressable
                      scaleTo={1.02}
                      style={styles.mobileItem}
                      onPress={() => setAccountExpanded(accountExpanded === 'user' ? null : 'user')}
                    >
                      <Text style={styles.mobileItemText}>
                        {user?.email ? maskEmail(user.email) : t('nav.account')} {accountExpanded === 'user' ? '▴' : '▾'}
                      </Text>
                    </AnimatedPressable>
                    {accountExpanded === 'user' && userItems.map((item) => (
                      <AnimatedPressable
                        key={item.label}
                        scaleTo={1.02}
                        style={styles.mobileSubItem}
                        href={item.href}
                        onPress={() => {
                          if (item.href) goTo(item.href);
                          item.onPress?.();
                          closeAccountMenu();
                        }}
                      >
                        <Text style={styles.mobileSubItemText}>{item.label}</Text>
                      </AnimatedPressable>
                    ))}
                  </>
                )
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

function makeStyles(colors, scaleFont) {
  return StyleSheet.create({
    wrapper: { position: 'relative', zIndex: 20 },
    bar: {
      height: BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      ...Platform.select({ web: { position: 'sticky', top: 0, zIndex: 20 } }),
    },
    barMobile: { paddingHorizontal: 10 },
    // Absolutely centered within `bar` (which spans the full width) so the logo sits in
    // the true middle of the screen regardless of the hamburger's width on the right.
    mobileLogoCenter: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    brandImage: { width: 122, height: 32 },
    desktopLinks: { flexDirection: 'row', alignItems: 'center' },
    navItem: { paddingHorizontal: 12, paddingVertical: 9 },
    navText: { color: colors.textPrimary, fontWeight: '600', fontSize: scaleFont(13) },
    orderButton: { backgroundColor: colors.secondary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, marginHorizontal: 6 },
    orderButtonText: { color: '#fff', fontWeight: 'bold', fontSize: scaleFont(13) },
    trackOrderButton: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, marginHorizontal: 6 },
    trackOrderButtonText: { color: '#fff', fontWeight: 'bold', fontSize: scaleFont(13) },
    wargaEmasButton: { backgroundColor: '#FFC72C', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, marginHorizontal: 6 },
    wargaEmasButtonText: { color: '#000', fontWeight: 'bold', fontSize: scaleFont(13) },
    registerButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, marginLeft: 8 },
    registerButtonText: { color: colors.primary, fontWeight: '700', fontSize: scaleFont(13) },

    hamburger: { padding: 8 },
    hamburgerMobile: { marginLeft: 'auto', zIndex: 1 },
    hamburgerIcon: { fontSize: scaleFont(22), color: colors.textPrimary },

    dropdownOverlay: { position: 'absolute', left: 0, zIndex: 15 },

    // Sticky bottom nav (mobile only) — absolutely positioned within AppShell's full-height
    // flex:1 container (the nearest positioned ancestor spanning the whole viewport), so
    // bottom:0 pins it to the screen edge regardless of how much page content scrolls above it.
    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      zIndex: 10,
    },
    bottomNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // Deliberately a FIXED width, not flex:1 like the icon items — equal flex-share widths
    // computed the same on paper still rendered visibly wider in the native app (icon glyphs
    // occupy far less of their column than a solid color fill does), so instead of relying on
    // flex math to "look" equal across platforms, this is pinned to a small fixed size that
    // reads the same everywhere. The 2 flex:1 items on each side keep it perfectly centered.
    bottomNavCenterButton: {
      width: 104,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.secondary,
    },
    // Fixed narrow width forces the label to wrap onto two lines instead of spilling wide.
    // No fixed width here — the label is force-broken onto exactly two lines via an explicit
    // '\n' at the space (see usage), not width-constrained auto-wrap. A fixed narrow width
    // wrapped "Order Now" fine but broke longer translations (e.g. Malay "Tempah Sekarang")
    // at larger font scales, where even a single word no longer fit the constrained width.
    bottomNavCenterText: { color: '#fff', fontWeight: 'bold', fontSize: scaleFont(12), textAlign: 'center' },

    // Bottom sheet for the Information panel — triggered from the bottom nav, so it's anchored
    // to the bottom and capped at a modest height rather than a full-screen modal, keeping the
    // close controls (header ✕ and the tap-outside backdrop) within easy thumb reach.
    sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    // Height is set inline as an explicit pixel value (not '%') — percentage heights can fail
    // to resolve reliably inside a transparent native Modal, silently collapsing this to ~0
    // and leaving only the header visible.
    sheetContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    // The account menu (Settings/Login-Register/Account) reuses a full-screen <Modal> —
    // triggered from the top-bar hamburger, so a top-anchored close control makes sense there.
    modalRoot: { flex: 1, backgroundColor: colors.card },
    modalHeader: {
      height: BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mobileMenu: {
      flex: 1,
      backgroundColor: colors.card,
      paddingVertical: 8,
    },
    mobileItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    mobileItemText: { fontSize: scaleFont(15), fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
    mobileSubItem: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: colors.background },
    mobileSubItemText: { fontSize: scaleFont(14), color: colors.textSecondary, fontWeight: '500', textAlign: 'center' },
    mobileSettingsPanel: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.background },
  });
}
