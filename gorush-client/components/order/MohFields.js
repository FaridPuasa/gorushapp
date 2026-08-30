import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFormStyles, Card, Field, InfoNotice, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { formatBruHims } from '../../lib/validators';
import IdentityFields from './IdentityFields';
import { AnimatedPressable } from '../../lib/animations';

export default function MohFields({ values, onChange, errors = {}, focusedField, setFocusedField, viewOnlyIdentity = false, bruhimsSaved = false, payingPatientSaved = false, appointmentDistrictSaved = false, registerFieldRef }) {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const DISTRICT_ITEMS = [
    { label: t('address.districtBrunei'), value: 'Brunei' },
    { label: t('address.districtTutong'), value: 'Tutong' },
    { label: t('address.districtTemburong'), value: 'Temburong' },
    { label: t('address.districtBelait'), value: 'Belait' },
  ];
  const districtLabel = DISTRICT_ITEMS.find((d) => d.value === values.appointmentDistrict)?.label || values.appointmentDistrict;

  return (
    <Card icon="💊" title={t('order.mohDetails')}>
      {bruhimsSaved ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={formStyles.fieldLabel}>{t('order.bruHimsNo')}</Text>
          <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color }}>{values.bruhimsnum}</Text>
        </View>
      ) : (
        <Field label={t('order.bruHimsNo')} required hint={t('order.bruHimsHint')} error={errors.bruhimsnum} fieldKey="bruhimsnum" registerRef={registerFieldRef}>
          <TextInput
            style={inputStyle('bruhimsnum')}
            maxLength={10}
            value={values.bruhimsnum}
            onFocus={() => { setFocusedField('bruhimsnum'); if (!values.bruhimsnum) onChange('bruhimsnum', 'BN'); }}
            onBlur={() => setFocusedField(null)}
            onChangeText={(v) => onChange('bruhimsnum', formatBruHims(v))}
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

      {appointmentDistrictSaved ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={formStyles.fieldLabel}>{t('order.appointmentDistrict')}</Text>
          <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color }}>{districtLabel}</Text>
        </View>
      ) : (
        <Field label={t('order.appointmentDistrict')} required fieldKey="appointmentDistrict" registerRef={registerFieldRef}>
          <View style={formStyles.pickerContainer}>
            <Picker style={formStyles.pickerControl} selectedValue={values.appointmentDistrict} onValueChange={(v) => onChange('appointmentDistrict', v)}>
              {DISTRICT_ITEMS.map((d) => <Picker.Item key={d.value} label={d.label} value={d.value} />)}
            </Picker>
          </View>
        </Field>
      )}

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

      <InfoNotice icon="📋" title={t('order.mohPayingPatientNoteTitle')}>
        {t('order.mohPayingPatientNote')}
      </InfoNotice>
    </Card>
  );
}
