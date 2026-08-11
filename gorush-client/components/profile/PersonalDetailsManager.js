import React, { useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card, Field, useFormStyles, makeInputStyle, makeFocusHandlers, SaveCancelRow, DeleteConfirm } from '../../lib/formPrimitives';
import { formatICNumber, formatBruHims, dmyToIso, dmyToDate } from '../../lib/validators';
import { useIsMobile } from '../../lib/responsive';
import { AnimatedPressable } from '../../lib/animations';
import { getBruneiNow, getBruneiTodayISO } from '../../lib/bruneiTime';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { useTheme } from '../../context/ThemeContext';

function emptyDetails() {
  return {
    receivername: '', dateofbirth: '', idType: 'IC',
    icnum: '', passportnum: '', bruhimsnum: '', appointmentdistrict: '',
    patientphcnum: '', patientjpmcnum: '', payingpatient: '',
  };
}

function toFormData(entry) {
  return {
    receivername: entry.receivername || '',
    dateofbirth: entry.dateofbirth || '',
    idType: entry.icnum ? 'IC' : (entry.passportnum ? 'Passport' : 'IC'),
    icnum: entry.icnum || '',
    passportnum: entry.passportnum || '',
    bruhimsnum: entry.bruhimsnum || '',
    appointmentdistrict: entry.appointmentdistrict || '',
    patientphcnum: entry.patientphcnum || '',
    patientjpmcnum: entry.patientjpmcnum || '',
    payingpatient: entry.payingpatient || '',
  };
}

function validateDetails(data, t) {
  const errors = {};
  if (!data.receivername.trim()) errors.receivername = t('identity.receiverNameRequired');
  if (!data.dateofbirth) errors.dateofbirth = t('identity.dobRequired');
  if (data.idType === 'IC') {
    if (data.icnum.length !== 8) errors.icnum = t('identity.icInvalid');
  } else if (!data.passportnum.trim()) {
    errors.passportnum = t('identity.passportRequired');
  }
  if (data.bruhimsnum && data.bruhimsnum.length !== 10) {
    errors.bruhimsnum = t('identity.bruHimsInvalid');
  }
  return errors;
}

function DetailsForm({ initial, onSave, onCancel, saving }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [data, setData] = useState(initial);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rawDate, setRawDate] = useState(() => dmyToDate(initial.dateofbirth));

  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const update = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setRawDate(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      update('dateofbirth', `${day}.${month}.${year}`);
    }
  };

  const handleSave = () => {
    const newErrors = validateDetails(data, t);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave(data);
  };

  return (
    <View style={{ marginTop: 8 }}>
      <Field label={t('identity.receiverName')} required error={errors.receivername}>
        <TextInput accessibilityLabel={t('identity.receiverName')} style={inputStyle('receivername')} value={data.receivername} onChangeText={(v) => update('receivername', v)} {...focusHandlers('receivername')} />
      </Field>

      <Field label={t('identity.dateOfBirth')} required error={errors.dateofbirth}>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            max={getBruneiTodayISO()}
            value={dmyToIso(data.dateofbirth)}
            style={formStyles.webDatePicker}
            onChange={(e) => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-');
                update('dateofbirth', `${d}.${m}.${y}`);
              }
            }}
          />
        ) : (
          <AnimatedPressable style={formStyles.datePickerButton} onPress={() => setShowDatePicker(true)} scaleTo={1.04}>
            <Text style={formStyles.datePickerButtonText}>{data.dateofbirth ? `📅 ${data.dateofbirth}` : t('identity.selectDob')}</Text>
          </AnimatedPressable>
        )}
      </Field>

      {showDatePicker && (
        <DateTimePicker value={rawDate} mode="date" display="default" maximumDate={getBruneiNow()} onValueChange={onChangeDate} onDismiss={() => setShowDatePicker(false)} />
      )}

      <Text style={formStyles.fieldLabel}>{t('identity.primaryIdDocument')}<Text style={formStyles.requiredMark}> *</Text></Text>
      <View style={formStyles.toggleRow}>
        <AnimatedPressable style={[formStyles.toggleBtn, data.idType === 'IC' && formStyles.toggleBtnActive]} onPress={() => update('idType', 'IC')} scaleTo={1.04}>
          <Text style={data.idType === 'IC' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('identity.useIc')}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={[formStyles.toggleBtn, data.idType === 'Passport' && formStyles.toggleBtnActive]} onPress={() => update('idType', 'Passport')} scaleTo={1.04}>
          <Text style={data.idType === 'Passport' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('identity.usePassport')}</Text>
        </AnimatedPressable>
      </View>
      {data.idType === 'IC' ? (
        <Field error={errors.icnum}>
          <TextInput
            style={inputStyle('icnum')}
            placeholder={t('identity.icPlaceholder')}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            maxLength={8}
            value={data.icnum}
            onChangeText={(v) => update('icnum', formatICNumber(v))}
            {...focusHandlers('icnum')}
          />
        </Field>
      ) : (
        <Field error={errors.passportnum}>
          <TextInput style={inputStyle('passportnum')} placeholder={t('identity.passportNumber')} placeholderTextColor={colors.textMuted} value={data.passportnum} onChangeText={(v) => update('passportnum', v)} {...focusHandlers('passportnum')} />
        </Field>
      )}

      <Field label={t('identity.bruHimsNo')} error={errors.bruhimsnum} hint={t('identity.bruHimsHint')}>
        <TextInput
          style={inputStyle('bruhimsnum')}
          maxLength={10}
          value={data.bruhimsnum}
          onFocus={() => { setFocusedField('bruhimsnum'); if (!data.bruhimsnum) update('bruhimsnum', 'BN'); }}
          onBlur={() => setFocusedField(null)}
          onChangeText={(v) => update('bruhimsnum', formatBruHims(v))}
        />
      </Field>

      <Field label={t('order.appointmentDistrict')}>
        <View style={formStyles.pickerContainer}>
          <Picker style={formStyles.pickerControl} selectedValue={data.appointmentdistrict} onValueChange={(v) => update('appointmentdistrict', v)}>
            <Picker.Item label={t('common.notSet')} value="" />
            <Picker.Item label={t('address.districtBrunei')} value="Brunei" />
            <Picker.Item label={t('address.districtTutong')} value="Tutong" />
            <Picker.Item label={t('address.districtTemburong')} value="Temburong" />
            <Picker.Item label={t('address.districtBelait')} value="Belait" />
          </Picker>
        </View>
      </Field>

      <Field label={t('identity.phcPatientNo')}>
        <TextInput style={inputStyle('patientphcnum')} value={data.patientphcnum} onChangeText={(v) => update('patientphcnum', v)} {...focusHandlers('patientphcnum')} />
      </Field>

      <Field label={t('identity.jpmcPatientNo')}>
        <TextInput style={inputStyle('patientjpmcnum')} value={data.patientjpmcnum} onChangeText={(v) => update('patientjpmcnum', v)} {...focusHandlers('patientjpmcnum')} />
      </Field>

      <Text style={formStyles.fieldLabel}>{t('identity.payingPatient')}</Text>
      <View style={formStyles.toggleRow}>
        <AnimatedPressable style={[formStyles.toggleBtn, data.payingpatient === 'Yes' && formStyles.toggleBtnActive]} onPress={() => update('payingpatient', 'Yes')} scaleTo={1.04}>
          <Text style={data.payingpatient === 'Yes' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('common.yes')}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={[formStyles.toggleBtn, data.payingpatient === 'No' && formStyles.toggleBtnActive]} onPress={() => update('payingpatient', 'No')} scaleTo={1.04}>
          <Text style={data.payingpatient === 'No' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('common.no')}</Text>
        </AnimatedPressable>
      </View>

      <SaveCancelRow onSave={handleSave} onCancel={onCancel} saving={saving} />
    </View>
  );
}

export default function PersonalDetailsManager({ items, onAdd, onEdit, onDelete, onSetDefault }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const [editingId, setEditingId] = useState(null); // entry _id, 'new', or null
  const [confirmingId, setConfirmingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isMobile = useIsMobile();

  const closeForm = () => { setEditingId(null); setError(null); };

  const handleSave = async (data) => {
    setSaving(true);
    setError(null);
    try {
      if (editingId === 'new') await onAdd(data);
      else await onEdit(editingId, data);
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || t('editProfile.detailsSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    setConfirmingId(null);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err.response?.data?.error || t('editProfile.detailsRemoveError'));
    }
  };

  const handleSetDefault = async (id) => {
    setError(null);
    try {
      await onSetDefault(id);
    } catch (err) {
      setError(err.response?.data?.error || t('editProfile.detailsDefaultError'));
    }
  };

  const sortedItems = [...items].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

  return (
    <Card icon="🪪" title={t('editProfile.personalDetails')}>
      {error && (
        <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
          <Text style={formStyles.statusTextError}>⚠️  {error}</Text>
        </View>
      )}

      {sortedItems.map((entry) => (
        <View key={entry._id} style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: formStyles.card.borderColor }}>
          {editingId === entry._id ? (
            <DetailsForm initial={toFormData(entry)} onSave={handleSave} onCancel={closeForm} saving={saving} />
          ) : (
            <>
              {entry.isDefault && (
                <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: formStyles.statusTextSuccess.color, marginBottom: 4, textAlign: isMobile ? 'center' : 'left' }}>{t('common.default')}</Text>
              )}
              <Text style={{ fontSize: scaleFont(14), color: formStyles.fieldLabel.color, fontWeight: '600', textAlign: isMobile ? 'center' : 'left' }}>{entry.receivername}</Text>
              <Text style={{ fontSize: scaleFont(13), color: formStyles.subtitle.color, textAlign: isMobile ? 'center' : 'left' }}>{t('editProfile.dob')}: {entry.dateofbirth}</Text>
              <Text style={{ fontSize: scaleFont(13), color: formStyles.subtitle.color, textAlign: isMobile ? 'center' : 'left' }}>
                {entry.icnum ? `${t('editProfile.icLabel')}: ${entry.icnum}` : `${t('editProfile.passportLabel')}: ${entry.passportnum}`}
              </Text>

              {confirmingId === entry._id ? (
                <View style={{ marginTop: 8, alignItems: isMobile ? 'center' : 'flex-start' }}>
                  <DeleteConfirm onConfirm={() => handleDelete(entry._id)} onCancel={() => setConfirmingId(null)} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', marginTop: 8, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                  <AnimatedPressable onPress={() => setEditingId(entry._id)} style={{ marginRight: 16 }} scaleTo={1.12}>
                    <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '600', fontSize: scaleFont(13) }}>{t('common.edit')}</Text>
                  </AnimatedPressable>
                  {!entry.isDefault && (
                    <AnimatedPressable onPress={() => handleSetDefault(entry._id)} style={{ marginRight: 16 }} scaleTo={1.12}>
                      <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '600', fontSize: scaleFont(13) }}>{t('common.setDefault')}</Text>
                    </AnimatedPressable>
                  )}
                  {items.length > 1 && (
                    <AnimatedPressable onPress={() => setConfirmingId(entry._id)} scaleTo={1.12}>
                      <Text style={{ color: formStyles.statusTextError.color, fontWeight: '600', fontSize: scaleFont(13) }}>{t('common.delete')}</Text>
                    </AnimatedPressable>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      ))}

      {editingId === 'new' ? (
        <DetailsForm initial={emptyDetails()} onSave={handleSave} onCancel={closeForm} saving={saving} />
      ) : (
        <AnimatedPressable onPress={() => setEditingId('new')} scaleTo={1.04}>
          <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '700', fontSize: scaleFont(14) }}>{t('editProfile.addPersonalDetails')}</Text>
        </AnimatedPressable>
      )}
    </Card>
  );
}
