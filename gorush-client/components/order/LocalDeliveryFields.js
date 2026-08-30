import React, { useState } from 'react';
import { Text, TextInput, View, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFormStyles, Card, Field, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { computeWeightSurcharge } from '../../lib/pricing';
import { dmyToIso, dmyToDate } from '../../lib/validators';
import { getBruneiNow, getBruneiTodayISO } from '../../lib/bruneiTime';
import PartyDetailsForm from './PartyDetailsForm';
import { AnimatedPressable } from '../../lib/animations';

export default function LocalDeliveryFields({
  values, onChange, errors = {}, focusedField, setFocusedField,
  receiverValues, onReceiverChange, receiverErrors, isGuest, registerFieldRef,
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);
  const surcharge = computeWeightSurcharge(values.ldProductWeight);
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [pickupDateError, setPickupDateError] = useState(null);
  const isPickupAndDelivery = values.ldPickupOrDelivery === 'Pickup and Delivery';

  const onChangePickupDate = (event, selectedDate) => {
    setShowPickupDatePicker(false);
    if (selectedDate) {
      if (selectedDate.getDay() === 0) {
        setPickupDateError(t('order.validation.pickupDateNoSunday'));
        return;
      }
      setPickupDateError(null);
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      onChange('pickupDate', `${day}.${month}.${year}`);
    }
  };

  return (
    <>
      <Card icon="📦" title={t('order.localDeliveryDetails')}>
        <Text style={formStyles.fieldLabel}>{t('order.pickupOrDelivery')}<Text style={formStyles.requiredMark}> *</Text></Text>
        <View style={formStyles.toggleRow} ref={registerFieldRef ? (el) => registerFieldRef('ldPickupOrDelivery', el) : undefined}>
          <AnimatedPressable style={[formStyles.toggleBtn, values.ldPickupOrDelivery === 'Delivery Only' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('ldPickupOrDelivery', 'Delivery Only')}>
            <Text style={values.ldPickupOrDelivery === 'Delivery Only' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.pickup')}</Text>
          </AnimatedPressable>
          <AnimatedPressable style={[formStyles.toggleBtn, values.ldPickupOrDelivery === 'Pickup and Delivery' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('ldPickupOrDelivery', 'Pickup and Delivery')}>
            <Text style={values.ldPickupOrDelivery === 'Pickup and Delivery' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.pickupAndDelivery')}</Text>
          </AnimatedPressable>
        </View>

        {isPickupAndDelivery && (
          <>
            <Field label={t('order.pickupDate')} required error={pickupDateError || errors.pickupDate} fieldKey="pickupDate" registerRef={registerFieldRef}>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  min={getBruneiTodayISO()}
                  value={dmyToIso(values.pickupDate)}
                  style={formStyles.webDatePicker}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m, d] = e.target.value.split('-');
                      if (new Date(Number(y), Number(m) - 1, Number(d)).getDay() === 0) {
                        setPickupDateError(t('order.validation.pickupDateNoSunday'));
                        return;
                      }
                      setPickupDateError(null);
                      onChange('pickupDate', `${d}.${m}.${y}`);
                    }
                  }}
                />
              ) : (
                <AnimatedPressable style={formStyles.datePickerButton} scaleTo={1.03} onPress={() => setShowPickupDatePicker(true)}>
                  <Text style={formStyles.datePickerButtonText}>{values.pickupDate ? `📅 ${values.pickupDate}` : t('order.pickupDate')}</Text>
                </AnimatedPressable>
              )}
            </Field>

            {showPickupDatePicker && (
              <DateTimePicker
                value={dmyToDate(values.pickupDate)}
                mode="date"
                display="default"
                minimumDate={getBruneiNow()}
                onValueChange={onChangePickupDate}
                onDismiss={() => setShowPickupDatePicker(false)}
              />
            )}

            <Field label={t('order.pickupAddress')} required error={errors.pickupAddress} fieldKey="pickupAddress" registerRef={registerFieldRef}>
              <TextInput style={inputStyle('pickupAddress')} placeholder={t('order.pickupAddressPlaceholder')} placeholderTextColor={colors.textMuted} value={values.pickupAddress} onChangeText={(v) => onChange('pickupAddress', v)} {...focusHandlers('pickupAddress')} />
            </Field>
          </>
        )}

        <Field label={t('order.productDescription')} required error={errors.itemContains} fieldKey="itemContains" registerRef={registerFieldRef}>
          <TextInput style={inputStyle('itemContains')} placeholder={t('order.productDescriptionPlaceholder')} placeholderTextColor={colors.textMuted} value={values.itemContains} onChangeText={(v) => onChange('itemContains', v)} {...focusHandlers('itemContains')} />
        </Field>

        <Field label={t('order.productType')} required error={errors.ldProductType} fieldKey="ldProductType" registerRef={registerFieldRef}>
          <TextInput style={inputStyle('ldProductType')} placeholder={t('order.productTypePlaceholder')} placeholderTextColor={colors.textMuted} value={values.ldProductType} onChangeText={(v) => onChange('ldProductType', v)} {...focusHandlers('ldProductType')} />
        </Field>

        <Field label={t('order.productWeight')} required error={errors.ldProductWeight} hint={t('order.productWeightHint')} fieldKey="ldProductWeight" registerRef={registerFieldRef}>
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
        requireEmail={false}
        fieldKeyPrefix="receiver."
        registerFieldRef={registerFieldRef}
      />

      <Card icon="💳" title={t('order.billTo')}>
        <View style={formStyles.toggleRow} ref={registerFieldRef ? (el) => registerFieldRef('billTo', el) : undefined}>
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
