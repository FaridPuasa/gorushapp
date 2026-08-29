import React, { useState } from 'react';
import { Text, TextInput, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFormStyles, Card, Field, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { AnimatedPressable } from '../../lib/animations';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import {
  formatPostalCode, formatICNumber, applyPrefix, COUNTRY_CODES,
  splitPhoneNumber, combinePhoneNumber, dmyToIso, dmyToDate,
} from '../../lib/validators';
import { getBruneiNow, getBruneiTodayISO } from '../../lib/bruneiTime';

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

export default function PersonalDetailsFields({ values, onChange, errors = {}, focusedField, setFocusedField, viewOnly = false, isGuest = false }) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      onChange('dateofbirth', `${day}.${month}.${year}`);
    }
  };

  if (viewOnly) {
    const address = `${values.houseunitno}, ${values.jalan}, ${values.kampong}${values.simpang ? `, ${values.simpang}` : ''}, ${values.district}, ${values.postalcode}`;
    return (
      <Card icon="🪪" title={t('careers.personalDetails')}>
        <ViewOnlyRow label={t('contact.fullName')} value={values.name} />
        <ViewOnlyRow label={t('identity.dateOfBirth')} value={values.dateofbirth} />
        <ViewOnlyRow label={t('identity.icNumber')} value={values.icnumber} />
        <ViewOnlyRow label={t('order.summary.address')} value={address} />
        <ViewOnlyRow label={t('contact.email')} value={values.email} />
        <ViewOnlyRow label={t('contact.phoneNumber')} value={values.phonenum} />
        <ViewOnlyRow label={t('contact.additionalPhoneNumber')} value={values.addphonenum} />
        <AnimatedPressable scaleTo={1.03} onPress={() => router.push('/edit-profile')}>
          <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '600', fontSize: scaleFont(13) }}>{t('order.updateInEditProfile')}</Text>
        </AnimatedPressable>
      </Card>
    );
  }

  return (
    <Card icon="🪪" title={t('careers.personalDetails')}>
      <Field label={t('contact.fullName')} required error={errors.name}>
        <TextInput
          style={inputStyle('name')}
          value={values.name}
          onChangeText={(v) => onChange('name', v)}
          {...focusHandlers('name')}
        />
      </Field>

      <Field label={t('identity.dateOfBirth')} required error={errors.dateofbirth}>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            max={getBruneiTodayISO()}
            value={dmyToIso(values.dateofbirth)}
            style={formStyles.webDatePicker}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-');
                onChange('dateofbirth', `${d}.${m}.${y}`);
              }
            }}
          />
        ) : (
          <AnimatedPressable scaleTo={1.03} style={formStyles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <Text style={formStyles.datePickerButtonText}>
              {values.dateofbirth ? `📅 ${values.dateofbirth}` : t('identity.selectDob')}
            </Text>
          </AnimatedPressable>
        )}
      </Field>

      {showDatePicker && (
        <DateTimePicker
          value={dmyToDate(values.dateofbirth)}
          mode="date"
          display="default"
          maximumDate={getBruneiNow()}
          onValueChange={onChangeDate}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}

      <Field label={t('identity.icNumber')} required error={errors.icnumber}>
        <TextInput
          style={inputStyle('icnumber')}
          placeholder={t('identity.icPlaceholder')}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          maxLength={8}
          value={values.icnumber}
          onChangeText={(v) => onChange('icnumber', formatICNumber(v))}
          {...focusHandlers('icnumber')}
        />
      </Field>

      <Field label={t('address.houseUnitNo')} required error={errors.houseunitno}>
        <TextInput
          style={inputStyle('houseunitno')}
          placeholder={t('address.houseUnitPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={values.houseunitno}
          onChangeText={(v) => onChange('houseunitno', v)}
          {...focusHandlers('houseunitno')}
        />
      </Field>

      <Field label={t('address.jalan')} required error={errors.jalan}>
        <TextInput
          style={inputStyle('jalan')}
          placeholder="Jln"
          placeholderTextColor={colors.textMuted}
          value={values.jalan}
          onChangeText={(text) => onChange('jalan', applyPrefix('Jln ', text))}
          {...focusHandlers('jalan')}
        />
      </Field>

      <Field label={t('address.kampong')} required error={errors.kampong}>
        <TextInput
          style={inputStyle('kampong')}
          placeholder="Kg"
          placeholderTextColor={colors.textMuted}
          value={values.kampong}
          onChangeText={(text) => onChange('kampong', applyPrefix('Kg ', text))}
          {...focusHandlers('kampong')}
        />
      </Field>

      <Field label={t('address.simpang')}>
        <TextInput
          style={inputStyle('simpang')}
          placeholder="Spg"
          placeholderTextColor={colors.textMuted}
          value={values.simpang}
          onChangeText={(text) => onChange('simpang', applyPrefix('Spg ', text))}
          {...focusHandlers('simpang')}
        />
      </Field>

      <Field label={t('address.district')} required>
        <View style={formStyles.pickerContainer}>
          <Picker style={formStyles.pickerControl} selectedValue={values.district} onValueChange={(v) => onChange('district', v)}>
            <Picker.Item label={t('address.districtBrunei')} value="Brunei" />
            <Picker.Item label={t('address.districtTutong')} value="Tutong" />
            <Picker.Item label={t('address.districtTemburong')} value="Temburong" />
            <Picker.Item label={t('address.districtBelait')} value="Belait" />
          </Picker>
        </View>
      </Field>

      <Field label={t('address.postalCode')} error={errors.postalcode} hint={t('address.postalCodeHint')}>
        <TextInput
          style={inputStyle('postalcode')}
          placeholder={t('address.postalCodePlaceholder')}
          placeholderTextColor={colors.textMuted}
          maxLength={6}
          value={values.postalcode}
          onChangeText={(v) => onChange('postalcode', formatPostalCode(v))}
          {...focusHandlers('postalcode')}
        />
      </Field>

      <Field label={t('contact.email')} required={!isGuest} error={errors.email}>
        <TextInput
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

      <Field label={t('contact.phoneNumber')} required error={errors.phonenum}>
        <View style={formStyles.phoneRow}>
          <View style={formStyles.miniPicker}>
            <Picker
              style={formStyles.pickerControl}
              selectedValue={splitPhoneNumber(values.phonenum).countryCode}
              onValueChange={(cc) => onChange('phonenum', combinePhoneNumber(cc, splitPhoneNumber(values.phonenum).localNumber))}
            >
              {COUNTRY_CODES.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
            </Picker>
          </View>
          <TextInput
            style={[inputStyle('phonenum'), formStyles.phoneInput]}
            placeholder={t('contact.phoneNoPlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={splitPhoneNumber(values.phonenum).localNumber}
            onChangeText={(v) => onChange('phonenum', combinePhoneNumber(splitPhoneNumber(values.phonenum).countryCode, v.replace(/[^0-9]/g, '')))}
            {...focusHandlers('phonenum')}
          />
        </View>
      </Field>

      <Field label={t('contact.additionalPhoneNumber')}>
        <View style={formStyles.phoneRow}>
          <View style={formStyles.miniPicker}>
            <Picker
              style={formStyles.pickerControl}
              selectedValue={splitPhoneNumber(values.addphonenum).countryCode}
              onValueChange={(cc) => onChange('addphonenum', combinePhoneNumber(cc, splitPhoneNumber(values.addphonenum).localNumber))}
            >
              {COUNTRY_CODES.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
            </Picker>
          </View>
          <TextInput
            style={[inputStyle('addphonenum'), formStyles.phoneInput]}
            placeholder={t('common.optional')}
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={splitPhoneNumber(values.addphonenum).localNumber}
            onChangeText={(v) => onChange('addphonenum', combinePhoneNumber(splitPhoneNumber(values.addphonenum).countryCode, v.replace(/[^0-9]/g, '')))}
            {...focusHandlers('addphonenum')}
          />
        </View>
      </Field>
    </Card>
  );
}
