import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useFormStyles, Card, Field, InfoNotice, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { formatJpmcPatientNumber } from '../../lib/validators';
import IdentityFields from './IdentityFields';
import { AnimatedPressable } from '../../lib/animations';

export default function JpmcFields({ values, onChange, errors = {}, focusedField, setFocusedField, viewOnlyIdentity = false, patientNumberSaved = false, appointmentPlaceSaved = false, payingPatientSaved = false, registerFieldRef }) {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  return (
    <Card icon="🏥" title={t('order.jpmcDetails')}>
      {appointmentPlaceSaved ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={formStyles.fieldLabel}>{t('order.appointmentLocation')}</Text>
          <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color }}>{values.appointmentPlace}</Text>
        </View>
      ) : (
        <>
          <Text style={formStyles.fieldLabel}>{t('order.appointmentLocation')}<Text style={formStyles.requiredMark}> *</Text></Text>
          <View style={formStyles.toggleRow} ref={registerFieldRef ? (el) => registerFieldRef('appointmentPlace', el) : undefined}>
            <AnimatedPressable style={[formStyles.toggleBtn, values.appointmentPlace === 'JPMC' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('appointmentPlace', 'JPMC')}>
              <Text style={values.appointmentPlace === 'JPMC' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.jpmc')}</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[formStyles.toggleBtn, values.appointmentPlace === 'PJSC' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('appointmentPlace', 'PJSC')}>
              <Text style={values.appointmentPlace === 'PJSC' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.pjsc')}</Text>
            </AnimatedPressable>
            <AnimatedPressable style={[formStyles.toggleBtn, values.appointmentPlace === 'GJPMC' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('appointmentPlace', 'GJPMC')}>
              <Text style={values.appointmentPlace === 'GJPMC' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.gjpmc')}</Text>
            </AnimatedPressable>
          </View>
        </>
      )}

      {patientNumberSaved ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={formStyles.fieldLabel}>{t('order.patientNoJpmc')}</Text>
          <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color }}>{values.patientNumber}</Text>
        </View>
      ) : (
        <Field
          label={t('order.patientNoJpmc')}
          required
          error={errors.patientNumber}
          hint={
            !values.appointmentPlace
              ? t('order.selectAppointmentLocationFirst')
              : values.appointmentPlace === 'GJPMC' ? t('identity.gjpmcFormatHint') : t('identity.jpmcDigitsFormatHint')
          }
          fieldKey="patientNumber"
          registerRef={registerFieldRef}
        >
          <TextInput
            style={inputStyle('patientNumber')}
            editable={!!values.appointmentPlace}
            maxLength={8}
            placeholder={values.appointmentPlace === 'GJPMC' ? 'G-123456' : values.appointmentPlace ? '12312312' : undefined}
            value={values.patientNumber}
            onChangeText={(v) => onChange('patientNumber', formatJpmcPatientNumber(values.appointmentPlace, v))}
            {...focusHandlers('patientNumber')}
          />
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

      <InfoNotice icon="📋" title={t('order.jpmcPayingPatientNoteTitle')}>
        {t('order.jpmcPayingPatientNote')}
      </InfoNotice>
    </Card>
  );
}
