export const CONTROL_HEIGHT = 48;
export const NAVBAR_HEIGHT = 64;
export const ANNOUNCEMENT_BAR_HEIGHT = 40;
export const BOTTOM_NAV_HEIGHT = 60;
export const CONTENT_MAX_WIDTH = 900;

// Brand colors sampled directly from the Go Rush logo (assets/logo.png):
// blue #1b75bc (pin + wordmark), red #be1e2d (the "G" + runner icon).
// Both palettes share the same key names — only the values change per mode — so
// consuming code never needs to special-case which theme is active.
export const LIGHT_COLORS = {
  primary: '#1b75bc',
  primaryDark: '#14588d',
  primaryLight: '#e8f1f8',
  secondary: '#be1e2d',
  secondaryDark: '#8f1620',
  tertiary: '#f39c12',
  background: '#f4f7fa',
  card: '#ffffff',
  border: '#dce3ea',
  error: '#e74c3c',
  errorLight: '#fdecea',
  success: '#219653',
  successLight: '#e6f4ea',
  warning: '#f9a825',
  warningLight: '#fff8e1',
  tertiaryLight: '#fdf1e3',
  textPrimary: '#1c2733',
  textSecondary: '#5b6b7c',
  textMuted: '#93a1b0',
  inputBackground: '#ffffff',
  subtleBackground: '#f7f7f8',
};

export const DARK_COLORS = {
  primary: '#3f92d1',
  primaryDark: '#8ec7ea',
  primaryLight: '#12293b',
  secondary: '#be1e2d',
  secondaryDark: '#8f1620',
  tertiary: '#f39c12',
  background: '#0f1620',
  card: '#1a2430',
  border: '#2e3a48',
  error: '#f26a5c',
  errorLight: '#3a1614',
  success: '#4caf7d',
  successLight: '#123222',
  warning: '#f5c451',
  warningLight: '#3a3012',
  tertiaryLight: '#3a2a12',
  textPrimary: '#eef1f5',
  textSecondary: '#a8b4c0',
  textMuted: '#6b7785',
  inputBackground: '#232f3d',
  subtleBackground: '#1f2833',
};

// Deprecated: kept only so any stray direct `COLORS` import doesn't hard-crash
// mid-refactor. New code should use `useTheme()` and never import this directly.
export const COLORS = LIGHT_COLORS;
