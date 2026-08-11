import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { AnimatedPressable } from '../../lib/animations';

export default function WargaEmasBanner() {
  const router = useRouter();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const styles = useMemo(() => makeStyles(scaleFont), [scaleFont]);

  return (
    <AnimatedPressable style={styles.banner} scaleTo={1.03} onPress={() => router.push('/warga-emas')}>
      <Text style={styles.text}>{t('order.wargaEmasBanner')}</Text>
    </AnimatedPressable>
  );
}

function makeStyles(scaleFont) {
  return StyleSheet.create({
    banner: {
      backgroundColor: '#FFC72C',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 18,
    },
    text: { color: '#000', fontWeight: 'bold', fontSize: scaleFont(15) },
  });
}
