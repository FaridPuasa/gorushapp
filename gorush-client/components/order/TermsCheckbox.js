import React from 'react';
import { Text, View, Linking } from 'react-native';
import { useFormStyles, Card } from '../../lib/formPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { BASE_URL } from '../../lib/api';
import { AnimatedPressable } from '../../lib/animations';

export default function TermsCheckbox({ agreed, onToggle, error }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();

  return (
    <Card icon="📜" title={t('order.termsAndConditions')}>
      <AnimatedPressable scaleTo={1.03} onPress={() => Linking.openURL(`${BASE_URL}/terms-and-conditions.pdf`)}>
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: scaleFont(13), marginBottom: 10 }}>{t('order.viewDownloadTerms')}</Text>
      </AnimatedPressable>

      <AnimatedPressable
        style={[formStyles.checkboxFake, agreed ? formStyles.checkboxActive : error && formStyles.checkboxErrorBox]}
        scaleTo={1.02}
        onPress={onToggle}
      >
        <Text style={formStyles.checkboxText}>{agreed ? t('order.agreedTerms') : t('order.tapAgreeTerms')}</Text>
      </AnimatedPressable>
      {error && <Text style={formStyles.fieldError}>{error}</Text>}
    </Card>
  );
}
