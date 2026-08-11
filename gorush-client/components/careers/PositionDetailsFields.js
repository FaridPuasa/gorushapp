import React from 'react';
import { Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFormStyles, Card, Field } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { HIGHEST_ACHIEVEMENT_OPTIONS, DURATION_OPTIONS, PARCEL_NUM_OPTIONS, CAR_OWN_OPTIONS, getApplicationTypeConfig } from '../../lib/careersOptions';
import { AnimatedPressable } from '../../lib/animations';

function ToggleField({ label, required, error, value, onChange, formStyles }) {
  const { t } = useLanguage();
  return (
    <Field label={label} required={required} error={error}>
      <View style={formStyles.toggleRow}>
        <AnimatedPressable scaleTo={1.03} style={[formStyles.toggleBtn, value === 'Yes' && formStyles.toggleBtnActive]} onPress={() => onChange('Yes')}>
          <Text style={value === 'Yes' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('common.yes')}</Text>
        </AnimatedPressable>
        <AnimatedPressable scaleTo={1.03} style={[formStyles.toggleBtn, value === 'No' && formStyles.toggleBtnActive]} onPress={() => onChange('No')}>
          <Text style={value === 'No' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('common.no')}</Text>
        </AnimatedPressable>
      </View>
    </Field>
  );
}

export default function PositionDetailsFields({ vacancy, values, onChange, errors = {} }) {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const config = getApplicationTypeConfig(vacancy.applicationType);

  return (
    <Card icon="📋" title={t('careers.applicationDetails')}>
      <Field label={t('careers.positionApplied')}>
        <View style={[formStyles.pickerContainer, { justifyContent: 'center', paddingHorizontal: 12 }]}>
          <Text style={{ color: formStyles.subtitle.color, fontSize: 14 }}>{vacancy.title}</Text>
        </View>
      </Field>

      <Field label={t('careers.highestAchievement')} required error={errors.highestAchievement}>
        <View style={formStyles.pickerContainer}>
          <Picker style={formStyles.pickerControl} selectedValue={values.highestAchievement} onValueChange={(v) => onChange('highestAchievement', v)}>
            {HIGHEST_ACHIEVEMENT_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
          </Picker>
        </View>
      </Field>

      {config.needsPartTime && (
        <Field label={t('careers.partTimeDuration')} required error={errors.partTimeDuration}>
          <View style={formStyles.pickerContainer}>
            <Picker style={formStyles.pickerControl} selectedValue={values.partTimeDuration} onValueChange={(v) => onChange('partTimeDuration', v)}>
              <Picker.Item label={t('common.selectEllipsis')} value="" />
              {DURATION_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
            </Picker>
          </View>
        </Field>
      )}

      {config.needsCarOwn && (
        <Field label={t('careers.carOwn')} required error={errors.carOwn}>
          <View style={formStyles.pickerContainer}>
            <Picker style={formStyles.pickerControl} selectedValue={values.carOwn} onValueChange={(v) => onChange('carOwn', v)}>
              <Picker.Item label={t('common.selectEllipsis')} value="" />
              {CAR_OWN_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
            </Picker>
          </View>
        </Field>
      )}

      {config.needsDeliverBefore && (
        <>
          <ToggleField
            label={t('careers.deliverBefore')}
            required
            error={errors.deliverBefore}
            value={values.deliverBefore}
            onChange={(v) => onChange('deliverBefore', v)}
            formStyles={formStyles}
          />
          {values.deliverBefore === 'Yes' && (
            <>
              <Field label={t('careers.experienceDelivery')} required error={errors.experienceDelivery}>
                <View style={formStyles.pickerContainer}>
                  <Picker style={formStyles.pickerControl} selectedValue={values.experienceDelivery} onValueChange={(v) => onChange('experienceDelivery', v)}>
                    <Picker.Item label={t('common.selectEllipsis')} value="" />
                    {DURATION_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
                  </Picker>
                </View>
              </Field>
              <Field label={t('careers.parcelNum')} required error={errors.parcelNum}>
                <View style={formStyles.pickerContainer}>
                  <Picker style={formStyles.pickerControl} selectedValue={values.parcelNum} onValueChange={(v) => onChange('parcelNum', v)}>
                    <Picker.Item label={t('common.selectEllipsis')} value="" />
                    {PARCEL_NUM_OPTIONS.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
                  </Picker>
                </View>
              </Field>
            </>
          )}
        </>
      )}

      {config.needsDriveManual && (
        <ToggleField
          label={t('careers.driveManual')}
          required
          error={errors.driveManual}
          value={values.driveManual}
          onChange={(v) => onChange('driveManual', v)}
          formStyles={formStyles}
        />
      )}
    </Card>
  );
}
