import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useFormStyles, Card, Field, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { computeWeightSurcharge } from '../../lib/pricing';
import PartyDetailsForm from './PartyDetailsForm';
import { AnimatedPressable } from '../../lib/animations';

export default function LocalDeliveryFields({
  values, onChange, errors = {}, focusedField, setFocusedField,
  receiverValues, onReceiverChange, receiverErrors, isGuest,
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);
  const surcharge = computeWeightSurcharge(values.ldProductWeight);

  return (
    <>
      <Card icon="📦" title={t('order.localDeliveryDetails')}>
        <Text style={formStyles.fieldLabel}>{t('order.pickupOrDelivery')}<Text style={formStyles.requiredMark}> *</Text></Text>
        <View style={formStyles.toggleRow}>
          <AnimatedPressable style={[formStyles.toggleBtn, values.ldPickupOrDelivery === 'Pickup' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('ldPickupOrDelivery', 'Pickup')}>
            <Text style={values.ldPickupOrDelivery === 'Pickup' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.pickup')}</Text>
          </AnimatedPressable>
          <AnimatedPressable style={[formStyles.toggleBtn, values.ldPickupOrDelivery === 'Pickup & Delivery' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('ldPickupOrDelivery', 'Pickup & Delivery')}>
            <Text style={values.ldPickupOrDelivery === 'Pickup & Delivery' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.pickupAndDelivery')}</Text>
          </AnimatedPressable>
        </View>

        <Field label={t('order.productDescription')} required error={errors.itemContains}>
          <TextInput style={inputStyle('itemContains')} placeholder={t('order.productDescriptionPlaceholder')} placeholderTextColor={colors.textMuted} value={values.itemContains} onChangeText={(v) => onChange('itemContains', v)} {...focusHandlers('itemContains')} />
        </Field>

        <Field label={t('order.productType')} required error={errors.ldProductType}>
          <TextInput style={inputStyle('ldProductType')} placeholder={t('order.productTypePlaceholder')} placeholderTextColor={colors.textMuted} value={values.ldProductType} onChangeText={(v) => onChange('ldProductType', v)} {...focusHandlers('ldProductType')} />
        </Field>

        <Field label={t('order.productWeight')} required error={errors.ldProductWeight} hint={t('order.productWeightHint')}>
          <TextInput
            style={inputStyle('ldProductWeight')}
            keyboardType="numeric"
            placeholder={t('order.productWeightPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={values.ldProductWeight}
            onChangeText={(v) => onChange('ldProductWeight', v.replace(/[^0-9.]/g, ''))}
            {...focusHandlers('ldProductWeight')}
          />
        </Field>
        {surcharge > 0 && (
          <View style={[formStyles.statusBanner, formStyles.statusSuccess]}>
            <Text style={formStyles.statusTextSuccess}>{t('order.weightSurcharge').replace('${amount}', surcharge.toFixed(2))}</Text>
          </View>
        )}
      </Card>

      <PartyDetailsForm
        icon="📍"
        title={t('order.receiverDetails')}
        values={receiverValues}
        onChange={onReceiverChange}
        errors={receiverErrors}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        showAdditionalPhone={false}
        isGuest={isGuest}
      />

      <Card icon="💳" title={t('order.billTo')}>
        <View style={formStyles.toggleRow}>
          <AnimatedPressable style={[formStyles.toggleBtn, values.billTo === 'Sender' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('billTo', 'Sender')}>
            <Text style={values.billTo === 'Sender' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.billToSender')}</Text>
          </AnimatedPressable>
          <AnimatedPressable style={[formStyles.toggleBtn, values.billTo === 'Receiver' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('billTo', 'Receiver')}>
            <Text style={values.billTo === 'Receiver' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.billToReceiver')}</Text>
          </AnimatedPressable>
        </View>
      </Card>
    </>
  );
}
