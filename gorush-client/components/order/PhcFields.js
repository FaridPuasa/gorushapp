import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useFormStyles, Card, Field, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import IdentityFields from './IdentityFields';
import { AnimatedPressable } from '../../lib/animations';

export default function PhcFields({ values, onChange, errors = {}, focusedField, setFocusedField, viewOnlyIdentity = false, patientNumberSaved = false, payingPatientSaved = false, registerFieldRef }) {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  return (
    <Card icon="🩺" title={t('order.phcDetails')}>
      {patientNumberSaved ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={formStyles.fieldLabel}>{t('order.patientNo')}</Text>
          <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color }}>{values.patientNumber}</Text>
        </View>
      ) : (
        <Field label={t('order.patientNo')} required error={errors.patientNumber} fieldKey="patientNumber" registerRef={registerFieldRef}>
          <TextInput style={inputStyle('patientNumber')} value={values.patientNumber} onChangeText={(v) => onChange('patientNumber', v)} {...focusHandlers('patientNumber')} />
        </Field>
      )}

      <IdentityFields
        values={values}
        onChange={onChange}
        errors={errors}
        focusedField={focusedField}
        setFocusedField={setFocusedField}
        viewOnly={viewOnlyIdentity}
        registerFieldRef={registerFieldRef}
      />

      {payingPatientSaved ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={formStyles.fieldLabel}>{t('identity.payingPatient')}</Text>
          <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color }}>
            {values.payingPatient === 'Yes' ? t('common.yes') : t('common.no')}
          </Text>
        </View>
      ) : (
        <>
          <Text style={formStyles.fieldLabel}>{t('identity.payingPatient')}<Text style={formStyles.requiredMark}> *</Text></Text>
          <View style={formStyles.toggleRow} ref={registerFieldRef ? (el) => registerFieldRef('payingPatient', el) : undefined}>
            <AnimatedPressable style={[formStyles.toggleBtn, values.payingPatient === 'Yes' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('payingPatient', 'Yes')}>
              <Text style={values.payingPatient === 'Yes' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('common.yes')}</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[formStyles.toggleBtn, values.payingPatient === 'No' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('payingPatient', 'No')}>
              <Text style={values.payingPatient === 'No' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('common.no')}</Text>
            </AnimatedPressable>
          </View>
        </>
      )}
    </Card>
  );
}
