import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFormStyles, Card, Field, InfoNotice, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { getChargeOptions, formatChargeLabel, computeTotalPrice, formatPrice, usePricingRules, PRODUCT_CODES, PAYMENT_METHODS } from '../../lib/pricing';
import { isChargeCurrentlyAvailable, getAvailabilityNote, useHolidayDates } from '../../lib/availability';

export default function ChargesAndPayment({
  product, district, weightKg,
  chargeCode, onChargeCodeChange,
  paymentMethod, onPaymentMethodChange,
  remarks, onRemarksChange,
  focusedField, setFocusedField, errors = {},
  noChargeRequired = false, registerFieldRef,
}) {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const pricingRules = usePricingRules();
  const options = getChargeOptions(pricingRules, product, district);
  const selected = options.find((o) => o.code === chargeCode);
  const total = selected ? computeTotalPrice(product, selected.price, weightKg) : null;
  const holidayDates = useHolidayDates();
  const productCode = PRODUCT_CODES[product];

  return (
    <Card icon="💰" title={t('order.chargesAndPayment')}>
      {!noChargeRequired && (
        <Field label={t('order.charges')} required error={errors.chargeCode} hint={!district ? t('order.selectChargesHint') : undefined} fieldKey="chargeCode" registerRef={registerFieldRef}>
          <View style={formStyles.pickerContainer}>
            <Picker style={formStyles.pickerControl} selectedValue={chargeCode} onValueChange={onChargeCodeChange} enabled={options.length > 0}>
              <Picker.Item label={t('order.selectChargesPlaceholder')} value="" />
              {options.map((o) => {
                const available = isChargeCurrentlyAvailable(productCode, o.code, holidayDates);
                const note = getAvailabilityNote(productCode, o.code);
                const label = available ? formatChargeLabel(o) : `${formatChargeLabel(o)} — ${t('order.closedNow')} (${note})`;
                return <Picker.Item key={`${o.code}-${o.price}`} label={label} value={o.code} enabled={available} />;
              })}
            </Picker>
          </View>
        </Field>
      )}

      <Field label={t('order.paymentMethod')} required error={errors.paymentMethod} fieldKey="paymentMethod" registerRef={registerFieldRef}>
        <View style={formStyles.pickerContainer}>
          <Picker style={formStyles.pickerControl} selectedValue={paymentMethod} onValueChange={onPaymentMethodChange}>
            <Picker.Item label={t('order.selectPaymentPlaceholder')} value="" />
            {PAYMENT_METHODS.map((m) => <Picker.Item key={m.value} label={t(m.labelKey)} value={m.value} />)}
          </Picker>
        </View>
      </Field>

      {paymentMethod !== '' && paymentMethod !== 'Cash' ? (
        <InfoNotice icon="💳" title={product === 'Cross Border Service Limbang' ? t('order.paymentNoticeTitleCbsl') : t('order.paymentNoticeTitle')}>
          {product === 'Cross Border Service Limbang' ? t('order.paymentNoticeAccountsCbsl') : t('order.paymentNoticeAccounts')}
        </InfoNotice>
      ) : null}

      <Field label={t('order.remarks')} hint={t('order.remarksHint')}>
        <TextInput
          style={[inputStyle('remarks'), { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
          multiline
          value={remarks}
          onChangeText={onRemarksChange}
          {...focusHandlers('remarks')}
        />
      </Field>

      {!noChargeRequired && (
        <View style={[formStyles.statusBanner, formStyles.statusSuccess, { alignItems: 'center' }]}>
          <Text style={{ fontSize: scaleFont(13), color: formStyles.statusTextSuccess.color, marginBottom: 4 }}>{t('order.totalPrice')}</Text>
          <Text style={{ fontSize: scaleFont(22), fontWeight: 'bold', color: formStyles.statusTextSuccess.color }}>
            {total != null ? formatPrice(total) : t('order.selectChargesToSeeTotal')}
          </Text>
        </View>
      )}
    </Card>
  );
}
