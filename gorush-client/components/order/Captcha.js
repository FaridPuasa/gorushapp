import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { api } from '../../lib/api';
import { useFormStyles, Field, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { AnimatedPressable } from '../../lib/animations';

export default function Captcha({ answer, onAnswerChange, onTokenChange, focusedField, setFocusedField, error }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const formStyles = useFormStyles();
  const inputStyle = makeInputStyle(formStyles, focusedField, error ? { captcha: error } : {});
  const focusHandlers = makeFocusHandlers(setFocusedField);
  const styles = useMemo(() => makeStyles(colors, scaleFont), [colors, scaleFont]);

  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/orders/captcha');
      setCode(response.data.code);
      onTokenChange(response.data.token);
    } finally {
      setLoading(false);
    }
  }, [onTokenChange]);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  return (
    <Field label={t('order.captcha')} required error={error}>
      <View style={styles.codeRow}>
        <View style={styles.codeBox}>
          {loading ? (
            <Text style={styles.codeText}>...</Text>
          ) : (
            code.split('').map((char, i) => (
              <Text
                key={i}
                style={[
                  styles.codeChar,
                  { transform: [{ rotate: `${(i % 2 === 0 ? -1 : 1) * (6 + i * 2)}deg` }] },
                ]}
              >
                {char}
              </Text>
            ))
          )}
        </View>
        <AnimatedPressable style={styles.refreshBtn} scaleTo={1.1} onPress={fetchCaptcha}>
          <Text style={styles.refreshText}>⟳</Text>
        </AnimatedPressable>
      </View>
      <TextInput
        style={inputStyle('captcha')}
        placeholder={t('order.captchaPlaceholder')}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        value={answer}
        onChangeText={onAnswerChange}
        {...focusHandlers('captcha')}
      />
    </Field>
  );
}

function makeStyles(colors, scaleFont) {
  return StyleSheet.create({
    codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    codeBox: {
      flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
      backgroundColor: colors.subtleBackground, borderRadius: 8, height: 48, marginRight: 10,
    },
    codeChar: { fontSize: scaleFont(20), fontWeight: 'bold', color: colors.textPrimary, marginHorizontal: 3, letterSpacing: 1 },
    codeText: { fontSize: scaleFont(16), color: colors.textPrimary },
    refreshBtn: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.subtleBackground, alignItems: 'center', justifyContent: 'center' },
    refreshText: { fontSize: scaleFont(20), color: colors.textPrimary },
  });
}
