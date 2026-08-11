import React, { useState, useEffect, useRef } from 'react';
import { Text, TextInput, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useFormStyles, Card, Field, makeInputStyle, makeFocusHandlers, PageScroll } from '../lib/formPrimitives';
import { AnimatedPressable } from '../lib/animations';
import { isValidEmail } from '../lib/validators';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';

export default function Login() {
  const router = useRouter();
  const { login, isGuest, isAdmin, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();

  useEffect(() => {
    if (!authLoading && !isGuest) {
      router.replace(isAdmin ? '/admin' : '/');
    }
  }, [authLoading, isGuest, isAdmin]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hidePass, setHidePass] = useState(true);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const passwordRef = useRef(null);

  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const handleLogin = async () => {
    if (submitting) return;
    const newErrors = {};
    if (!email.trim()) newErrors.email = t('auth.login.emailRequired');
    else if (!isValidEmail(email)) newErrors.email = t('auth.login.emailInvalid');
    if (!password) newErrors.password = t('auth.login.passwordRequired');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setStatusMessage(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      router.replace(result.user?.role === 'admin' ? '/admin' : '/');
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.response?.data?.error || t('auth.login.genericError') });
      setSubmitting(false);
    }
  };

  if (authLoading || !isGuest) return null;

  return (
    <PageScroll title={t('nav.logIn')}>
      <View style={{ width: '100%', maxWidth: 460, alignSelf: 'center', marginBottom: 24 }}>
        <Text style={formStyles.title}>{t('auth.login.title')}</Text>
        <Text style={formStyles.subtitle}>{t('auth.login.subtitle')}</Text>

        {statusMessage && (
          <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
            <Text style={formStyles.statusTextError}>⚠️  {statusMessage.text}</Text>
          </View>
        )}

        <Card icon="🔐" title={t('auth.login.cardTitle')}>
          <Field label={t('contact.email')} required error={errors.email}>
            <TextInput
              style={inputStyle('email')}
              placeholder={t('contact.emailPlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
              {...focusHandlers('email')}
            />
          </Field>

          <Field label={t('auth.login.password')} required error={errors.password}>
            <View style={formStyles.passwordContainer}>
              <TextInput
                ref={passwordRef}
                style={[inputStyle('password'), formStyles.passwordInput]}
                placeholder={t('auth.login.passwordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={hidePass}
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                {...focusHandlers('password')}
              />
              <AnimatedPressable scaleTo={1.1} style={formStyles.revealButton} onPress={() => setHidePass(!hidePass)}>
                <Text style={formStyles.revealText}>{hidePass ? t('common.show') : t('common.hide')}</Text>
              </AnimatedPressable>
            </View>
          </Field>
        </Card>

        <AnimatedPressable
          scaleTo={1.03}
          style={[formStyles.button, submitting && formStyles.buttonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <View style={formStyles.buttonRow}>
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text style={formStyles.buttonText}>{t('auth.login.loggingIn')}</Text>
            </View>
          ) : (
            <Text style={formStyles.buttonText}>{t('auth.login.logIn')}</Text>
          )}
        </AnimatedPressable>

        <AnimatedPressable scaleTo={1.04} style={{ marginTop: 16, alignItems: 'center' }} onPress={() => router.push('/register')}>
          <Text style={{ color: formStyles.subtitle.color, fontSize: scaleFont(13) }}>{t('auth.login.noAccount')} <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('auth.login.registerLink')}</Text></Text>
        </AnimatedPressable>

        <AnimatedPressable scaleTo={1.04} style={{ marginTop: 10, alignItems: 'center' }} onPress={() => router.push('/order')}>
          <Text style={{ color: formStyles.subtitle.color, fontSize: scaleFont(13) }}>{t('auth.login.orContinueAs')} <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('auth.login.guestLink')}</Text></Text>
        </AnimatedPressable>
      </View>
    </PageScroll>
  );
}
