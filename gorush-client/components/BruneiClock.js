import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { formatBruneiDateTime } from '../lib/bruneiTime';
import { useLanguage } from '../context/LanguageContext';

export default function BruneiClock({ style }) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => formatBruneiDateTime());

  useEffect(() => {
    const interval = setInterval(() => setNow(formatBruneiDateTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return <Text style={style}>🇧🇳 {t('footer.bruneiTime')}: {now}</Text>;
}
