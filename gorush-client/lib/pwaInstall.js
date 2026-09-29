// Shared PWA-install detection helpers (2026-09-29) - used by both the
// /get-the-app guide page and the install nudge banner, so platform
// detection logic lives in exactly one place.

// Real browser/OS detection, distinct from useIsMobile() (which is a
// viewport-width breakpoint, not an actual device check).
export function detectPlatform() {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
}

// Every iOS browser is required by Apple's own policy to run on Safari's
// WebKit engine - but only actual Safari's Share sheet can turn "Add to
// Home Screen" into a real standalone app; Chrome/Firefox/Edge/Opera for
// iOS either don't offer it at all or it just makes a plain bookmark.
export function isNonSafariIOSBrowser() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export function isAlreadyInstalled() {
    if (typeof window === 'undefined') return false;
    // Chromium standalone-display check (Android/desktop) OR iOS Safari's
    // own (non-standard, iOS-only) navigator.standalone flag.
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}
