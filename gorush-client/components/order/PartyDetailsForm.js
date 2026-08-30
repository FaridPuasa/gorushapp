import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useFormStyles, Card, Field, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { formatPostalCode, COUNTRY_CODES, splitPhoneNumber, combinePhoneNumber, applyPrefix } from '../../lib/validators';
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

export default function PartyDetailsForm({
  icon = '📇', title, values, onChange, errors = {}, focusedField, setFocusedField,
  viewOnly = false, showAdditionalPhone = false, isGuest = false, addressLocked = false, requireEmail = !isGuest,
  fieldKeyPrefix = '', registerFieldRef,
}) {
  const fk = (name) => `${fieldKeyPrefix}${name}`;
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useTheme();
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

  if (viewOnly) {
    return (
      <Card icon={icon} title={title}>
        <ViewOnlyRow label={t('contact.fullName')} value={values.fullName} />
        <ViewOnlyRow
          label={t('order.summary.address')}
          value={`${values.houseunitno}, ${values.jalan}, ${values.kampong}${values.simpang ? `, ${values.simpang}` : ''}, ${values.district}, ${values.postalcode}`}
        />
        <ViewOnlyRow label={t('contact.email')} value={values.email} />
        <ViewOnlyRow label={t('contact.phoneNumber')} value={values.phone} />
        {showAdditionalPhone && <ViewOnlyRow label={t('contact.additionalPhoneNumber')} value={values.additionalPhone} />}
        <AnimatedPressable scaleTo={1.03} onPress={() => router.push('/edit-profile')}>
          <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '600', fontSize: scaleFont(13) }}>{t('order.updateInEditProfile')}</Text>
        </AnimatedPressable>
      </Card>
    );
  }

  return (
    <Card icon={icon} title={title}>
      <Field label={t('contact.fullName')} required error={errors.fullName} fieldKey={fk('fullName')} registerRef={registerFieldRef}>
        <TextInput accessibilityLabel={t('contact.fullName')} style={inputStyle('fullName')} value={values.fullName} onChangeText={(v) => onChange('fullName', v)} {...focusHandlers('fullName')} />
      </Field>

      {addressLocked && (
        <Text style={[formStyles.fieldHint, { marginBottom: 10 }]}>{t('address.selfCollectLocked')}</Text>
      )}

      <Field label={t('address.houseUnitNo')} required error={errors.houseunitno} fieldKey={fk('houseunitno')} registerRef={registerFieldRef}>
        <TextInput accessibilityLabel={t('address.houseUnitNo')} editable={!addressLocked} style={inputStyle('houseunitno')} placeholder={t('address.houseUnitPlaceholder')} placeholderTextColor={colors.textMuted} value={values.houseunitno} onChangeText={(v) => onChange('houseunitno', v)} {...focusHandlers('houseunitno')} />
      </Field>

      <Field label={t('address.jalan')} required error={errors.jalan} fieldKey={fk('jalan')} registerRef={registerFieldRef}>
        <TextInput
          accessibilityLabel={t('address.jalan')}
          editable={!addressLocked}
          style={inputStyle('jalan')}
          placeholder="Jln"
          placeholderTextColor={colors.textMuted}
          value={values.jalan}
          onChangeText={(v) => onChange('jalan', applyPrefix('Jln ', v))}
          {...focusHandlers('jalan')}
        />
      </Field>

      <Field label={t('address.kampong')} required error={errors.kampong} fieldKey={fk('kampong')} registerRef={registerFieldRef}>
        <TextInput
          accessibilityLabel={t('address.kampong')}
          editable={!addressLocked}
          style={inputStyle('kampong')}
          placeholder="Kg"
          placeholderTextColor={colors.textMuted}
          value={values.kampong}
          onChangeText={(v) => onChange('kampong', applyPrefix('Kg ', v))}
          {...focusHandlers('kampong')}
        />
      </Field>

      <Field label={t('address.simpang')}>
        <TextInput
          accessibilityLabel={t('address.simpang')}
          editable={!addressLocked}
          style={inputStyle('simpang')}
          placeholder="Spg"
          placeholderTextColor={colors.textMuted}
          value={values.simpang}
          onChangeText={(v) => onChange('simpang', applyPrefix('Spg ', v))}
          {...focusHandlers('simpang')}
        />
      </Field>

      <Field label={t('address.district')} required>
        <View style={formStyles.pickerContainer}>
          <Picker enabled={!addressLocked} style={formStyles.pickerControl} selectedValue={values.district} onValueChange={(v) => onChange('district', v)}>
            {DISTRICT_ITEMS.map((d) => <Picker.Item key={d.value} label={d.label} value={d.value} />)}
          </Picker>
        </View>
      </Field>

      <Field label={t('address.postalCode')} error={errors.postalcode} hint={t('address.postalCodeHint')} fieldKey={fk('postalcode')} registerRef={registerFieldRef}>
        <TextInput
          editable={!addressLocked}
          style={inputStyle('postalcode')}
          placeholder={t('address.postalCodePlaceholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={6}
          value={values.postalcode}
          onChangeText={(v) => onChange('postalcode', formatPostalCode(v))}
          {...focusHandlers('postalcode')}
        />
      </Field>

      <Field label={t('contact.email')} required={requireEmail} error={errors.email} fieldKey={fk('email')} registerRef={registerFieldRef}>
        <TextInput
          accessibilityLabel={t('contact.email')}
          style={inputStyle('email')}
          placeholder={t('contact.emailPlaceholder')}
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={values.email}
          onChangeText={(v) => onChange('email', v)}
          {...focusHandlers('email')}
        />
      </Field>

      <Field label={t('contact.phoneNumber')} required error={errors.phone} fieldKey={fk('phone')} registerRef={registerFieldRef}>
        <View style={formStyles.phoneRow}>
          <View style={formStyles.miniPicker}>
            <Picker
              style={formStyles.pickerControl}
              selectedValue={splitPhoneNumber(values.phone).countryCode}
              onValueChange={(cc) => onChange('phone', combinePhoneNumber(cc, splitPhoneNumber(values.phone).localNumber))}
            >
              {COUNTRY_CODES.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
            </Picker>
          </View>
          <TextInput
            style={[inputStyle('phone'), formStyles.phoneInput]}
            placeholder={t('contact.phoneNoPlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={splitPhoneNumber(values.phone).localNumber}
            onChangeText={(v) => onChange('phone', combinePhoneNumber(splitPhoneNumber(values.phone).countryCode, v.replace(/[^0-9]/g, '')))}
            {...focusHandlers('phone')}
          />
        </View>
      </Field>

      {showAdditionalPhone && (
        <Field label={t('contact.additionalPhoneNumber')}>
          <View style={formStyles.phoneRow}>
            <View style={formStyles.miniPicker}>
              <Picker
                style={formStyles.pickerControl}
                selectedValue={splitPhoneNumber(values.additionalPhone).countryCode}
                onValueChange={(cc) => onChange('additionalPhone', combinePhoneNumber(cc, splitPhoneNumber(values.additionalPhone).localNumber))}
              >
                {COUNTRY_CODES.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
              </Picker>
            </View>
            <TextInput
              style={[inputStyle('additionalPhone'), formStyles.phoneInput]}
              placeholder={t('common.optional')}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={splitPhoneNumber(values.additionalPhone).localNumber}
              onChangeText={(v) => onChange('additionalPhone', combinePhoneNumber(splitPhoneNumber(values.additionalPhone).countryCode, v.replace(/[^0-9]/g, '')))}
              {...focusHandlers('additionalPhone')}
            />
          </View>
        </Field>
      )}
    </Card>
  );
}
