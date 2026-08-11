import { getBruneiNow } from './bruneiTime';

export function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 3) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export function formatPostalCode(text) {
  const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letters = formatted.replace(/[^A-Z]/g, '').slice(0, 2);
  const numbers = formatted.replace(/[^0-9]/g, '').slice(0, 4);
  return letters + numbers;
}

export function isValidPostalCode(postalcode) {
  return postalcode.length === 6;
}

export function formatICNumber(text) {
  return text.replace(/[^0-9]/g, '').slice(0, 8);
}

export function formatBruHims(text) {
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const numbers = cleaned.replace(/[^0-9]/g, '').slice(0, 8);
  return text.length > 0 ? `BN${numbers}` : '';
}

export const COUNTRY_CODES = [
  { label: '🇧🇳 +673', value: '+673' },
  { label: '🇲🇾 +60', value: '+60' },
  { label: '🇸🇬 +65', value: '+65' },
];

export function splitPhoneNumber(fullNumber) {
  const match = COUNTRY_CODES.find((c) => (fullNumber || '').startsWith(c.value));
  if (match) {
    return { countryCode: match.value, localNumber: fullNumber.slice(match.value.length) };
  }
  return { countryCode: COUNTRY_CODES[0].value, localNumber: (fullNumber || '').replace(/^\+/, '') };
}

export function combinePhoneNumber(countryCode, localNumber) {
  return `${countryCode}${localNumber}`;
}

export function applyPrefix(prefix, text) {
  let cleanText = text;
  while (cleanText.startsWith(prefix)) {
    cleanText = cleanText.slice(prefix.length);
  }
  return cleanText.length > 0 ? `${prefix}${cleanText}` : '';
}

export function dmyToIso(str) {
  const parts = (str || '').split('.');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  return `${y}-${m}-${d}`;
}

export function dmyToDate(str) {
  const parts = (str || '').split('.');
  if (parts.length !== 3) return getBruneiNow();
  const [d, m, y] = parts;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function getPasswordStrength(password, colors, t) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { label: t('common.passwordWeak'), color: colors.error, width: '33%' };
  if (score <= 3) return { label: t('common.passwordMedium'), color: '#f39c12', width: '66%' };
  return { label: t('common.passwordStrong'), color: colors.primary, width: '100%' };
}
