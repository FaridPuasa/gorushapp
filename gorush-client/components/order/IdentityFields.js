import React, { useState } from 'react';
import { Text, TextInput, View, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFormStyles, Field, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { formatICNumber, dmyToIso, dmyToDate } from '../../lib/validators';
import { getBruneiNow, getBruneiTodayISO } from '../../lib/bruneiTime';
import { AnimatedPressable } from '../../lib/animations';

function ViewOnlyRow({ label, value }) {
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={formStyles.fieldLabel}>{label}</Text>
      <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color }}>{value || '—'}</Text>
    </View>
  );
}

export default function IdentityFields({ values, onChange, errors = {}, focusedField, setFocusedField, viewOnly = false, registerFieldRef }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  if (viewOnly) {
    return (
      <>
        <ViewOnlyRow label={t('identity.dateOfBirth')} value={values.dateOfBirth} />
        <ViewOnlyRow label={values.icNum ? t('identity.icNumber') : t('order.summary.passport')} value={values.icNum || values.passport} />
      </>
    );
  }

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      onChange('dateOfBirth', `${day}.${month}.${year}`);
    }
  };

  return (
    <>
      <Field label={t('identity.dateOfBirth')} required error={errors.dateOfBirth} fieldKey="dateOfBirth" registerRef={registerFieldRef}>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            max={getBruneiTodayISO()}
            value={dmyToIso(values.dateOfBirth)}
            style={formStyles.webDatePicker}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-');
                onChange('dateOfBirth', `${d}.${m}.${y}`);
              }
            }}
          />
        ) : (
          <AnimatedPressable style={formStyles.datePickerButton} scaleTo={1.03} onPress={() => setShowDatePicker(true)}>
            <Text style={formStyles.datePickerButtonText}>{values.dateOfBirth ? `📅 ${values.dateOfBirth}` : t('identity.selectDob')}</Text>
          </AnimatedPressable>
        )}
      </Field>

      {showDatePicker && (
        <DateTimePicker
          value={dmyToDate(values.dateOfBirth)}
          mode="date"
          display="default"
          maximumDate={getBruneiNow()}
          onValueChange={onChangeDate}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}

      <Text style={formStyles.fieldLabel}>{t('identity.icOrPassport')}<Text style={formStyles.requiredMark}> *</Text></Text>
      <View style={formStyles.toggleRow}>
        <AnimatedPressable style={[formStyles.toggleBtn, values.idType === 'IC' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('idType', 'IC')}>
          <Text style={values.idType === 'IC' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('identity.useIc')}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={[formStyles.toggleBtn, values.idType === 'Passport' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('idType', 'Passport')}>
          <Text style={values.idType === 'Passport' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('identity.usePassport')}</Text>
        </AnimatedPressable>
      </View>
      {values.idType === 'IC' ? (
        <Field error={errors.icNum} fieldKey="icNum" registerRef={registerFieldRef}>
          <TextInput
            style={inputStyle('icNum')}
            placeholder={t('identity.icPlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            maxLength={8}
            value={values.icNum}
            onChangeText={(v) => onChange('icNum', formatICNumber(v))}
            {...focusHandlers('icNum')}
          />
        </Field>
      ) : (
        <Field error={errors.passport} fieldKey="passport" registerRef={registerFieldRef}>
          <TextInput
            style={inputStyle('passport')}
            placeholder={t('identity.passportNumber')}
            placeholderTextColor={colors.textMuted}
            value={values.passport}
            onChangeText={(v) => onChange('passport', v)}
            {...focusHandlers('passport')}
          />
        </Field>
      )}
    </>
  );
}
