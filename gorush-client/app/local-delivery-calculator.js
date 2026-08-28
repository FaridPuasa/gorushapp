import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '../lib/animations';
import { PageScroll, Card, Field, useFormStyles, makeInputStyle, makeFocusHandlers } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { getChargeOptions, formatChargeLabel, computeWeightSurcharge, computeTotalPrice, formatPrice, usePricingRules } from '../lib/pricing';
import { isChargeCurrentlyAvailable, getAvailabilityNote, useHolidayDates } from '../lib/availability';

const DISTRICT_ITEMS = [
  { value: 'Brunei', labelKey: 'address.districtBrunei' },
  { value: 'Tutong', labelKey: 'address.districtTutong' },
  { value: 'Temburong', labelKey: 'address.districtTemburong' },
  { value: 'Belait', labelKey: 'address.districtBelait' },
];

export default function Calculator() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const formStyles = useFormStyles();

  const [weight, setWeight] = useState('');
  const [district, setDistrict] = useState('');
  const [chargeCode, setChargeCode] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const inputStyle = makeInputStyle(formStyles, focusedField, {});
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const pricingRules = usePricingRules();
  const options = getChargeOptions(pricingRules, 'Local Delivery', district);
  const selected = options.find((o) => o.code === chargeCode);
  const surcharge = computeWeightSurcharge(weight);
  const total = selected ? computeTotalPrice('Local Delivery', selected.price, weight) : null;
  const holidayDates = useHolidayDates();

  return (
    <PageScroll title={t('nav.calculator')}>
      <Text style={formStyles.title}>{t('nav.calculator')}</Text>
      <Text style={formStyles.subtitle}>{t('calculator.subtitle')}</Text>

      <Card icon="🧮" title={t('calculator.cardTitle')}>
        <Field label={t('order.productWeight')} hint={t('order.productWeightHint')}>
          <TextInput
            style={inputStyle('weight')}
            keyboardType="numeric"
            placeholder={t('order.productWeightPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={weight}
            onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ''))}
            {...focusHandlers('weight')}
          />
        </Field>
        {surcharge > 0 && (
          <View style={[formStyles.statusBanner, formStyles.statusSuccess]}>
            <Text style={formStyles.statusTextSuccess}>{t('order.weightSurcharge').replace('${amount}', surcharge.toFixed(2))}</Text>
          </View>
        )}

        <Field label={t('address.district')} required>
          <View style={formStyles.pickerContainer}>
            <Picker
              style={formStyles.pickerControl}
              selectedValue={district}
              onValueChange={(v) => { setDistrict(v); setChargeCode(''); }}
            >
              <Picker.Item label={t('common.selectEllipsis')} value="" />
              {DISTRICT_ITEMS.map((d) => <Picker.Item key={d.value} label={t(d.labelKey)} value={d.value} />)}
            </Picker>
          </View>
        </Field>

        <Field label={t('order.charges')} hint={!district ? t('order.selectChargesHint') : undefined}>
          <View style={formStyles.pickerContainer}>
            <Picker style={formStyles.pickerControl} selectedValue={chargeCode} onValueChange={setChargeCode} enabled={options.length > 0}>
              <Picker.Item label={t('order.selectChargesPlaceholder')} value="" />
              {options.map((o) => {
                const available = isChargeCurrentlyAvailable('localdelivery', o.code, holidayDates);
                const note = getAvailabilityNote('localdelivery', o.code);
                const label = available ? formatChargeLabel(o) : `${formatChargeLabel(o)} — ${t('order.closedNow')} (${note})`;
                return <Picker.Item key={`${o.code}-${o.price}`} label={label} value={o.code} enabled={available} />;
              })}
            </Picker>
          </View>
        </Field>

        <View style={[formStyles.statusBanner, formStyles.statusSuccess, { alignItems: 'center' }]}>
          <Text style={{ fontSize: scaleFont(13), color: formStyles.statusTextSuccess.color, marginBottom: 4 }}>{t('order.totalPrice')}</Text>
          <Text style={{ fontSize: scaleFont(22), fontWeight: 'bold', color: formStyles.statusTextSuccess.color }}>
            {total != null ? formatPrice(total) : t('order.selectChargesToSeeTotal')}
          </Text>
        </View>
      </Card>

      <AnimatedPressable style={formStyles.buttonAccent} onPress={() => router.push('/order-form')} scaleTo={1.04}>
        <Text style={formStyles.buttonText}>{t('calculator.goToOrder')}</Text>
      </AnimatedPressable>
    </PageScroll>
  );
}
