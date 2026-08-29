import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Card, Field, useFormStyles, makeInputStyle, makeFocusHandlers, SaveCancelRow, DeleteConfirm } from '../../lib/formPrimitives';
import { formatPostalCode, isValidPostalCode, applyPrefix, isPrefixOnly } from '../../lib/validators';
import { useIsMobile } from '../../lib/responsive';
import { AnimatedPressable } from '../../lib/animations';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';

function emptyAddress() {
  return { houseunitno: '', jalan: '', kampong: '', simpang: '', district: 'Brunei', postalcode: '' };
}

function validateAddress(data, t) {
  const errors = {};
  if (!data.houseunitno.trim()) errors.houseunitno = t('common.required');
  if (isPrefixOnly('Jln ', data.jalan)) errors.jalan = t('common.required');
  if (isPrefixOnly('Kg ', data.kampong)) errors.kampong = t('common.required');
  if (data.postalcode && !isValidPostalCode(data.postalcode)) errors.postalcode = t('address.postalCodeInvalid');
  return errors;
}

function AddressForm({ initial, onSave, onCancel, saving }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  const [data, setData] = useState(initial);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
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

  const handleSave = () => {
    const newErrors = validateAddress(data, t);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave(data);
  };

  return (
    <View style={{ marginTop: 8 }}>
      <Field label={t('address.houseUnitNo')} required error={errors.houseunitno}>
        <TextInput accessibilityLabel={t('address.houseUnitNo')} style={inputStyle('houseunitno')} value={data.houseunitno} onChangeText={(v) => update('houseunitno', v)} {...focusHandlers('houseunitno')} />
      </Field>
      <Field label={t('address.jalan')} required error={errors.jalan}>
        <TextInput
          accessibilityLabel={t('address.jalan')}
          style={inputStyle('jalan')}
          value={data.jalan}
          onFocus={() => { setFocusedField('jalan'); if (!data.jalan) update('jalan', 'Jln '); }}
          onBlur={() => setFocusedField(null)}
          onChangeText={(v) => update('jalan', applyPrefix('Jln ', v))}
        />
      </Field>
      <Field label={t('address.kampong')} required error={errors.kampong}>
        <TextInput
          accessibilityLabel={t('address.kampong')}
          style={inputStyle('kampong')}
          value={data.kampong}
          onFocus={() => { setFocusedField('kampong'); if (!data.kampong) update('kampong', 'Kg '); }}
          onBlur={() => setFocusedField(null)}
          onChangeText={(v) => update('kampong', applyPrefix('Kg ', v))}
        />
      </Field>
      <Field label={t('address.simpang')}>
        <TextInput
          accessibilityLabel={t('address.simpang')}
          style={inputStyle('simpang')}
          value={data.simpang}
          onFocus={() => { setFocusedField('simpang'); if (!data.simpang) update('simpang', 'Spg '); }}
          onBlur={() => setFocusedField(null)}
          onChangeText={(v) => update('simpang', applyPrefix('Spg ', v))}
        />
      </Field>
      <Field label={t('address.district')} required>
        <View style={formStyles.pickerContainer}>
          <Picker style={formStyles.pickerControl} selectedValue={data.district} onValueChange={(v) => update('district', v)}>
            <Picker.Item label={t('address.districtBrunei')} value="Brunei" />
            <Picker.Item label={t('address.districtTutong')} value="Tutong" />
            <Picker.Item label={t('address.districtTemburong')} value="Temburong" />
            <Picker.Item label={t('address.districtBelait')} value="Belait" />
          </Picker>
        </View>
      </Field>
      <Field label={t('address.postalCode')} error={errors.postalcode}>
        <TextInput
          accessibilityLabel={t('address.postalCode')}
          style={inputStyle('postalcode')}
          maxLength={6}
          value={data.postalcode}
          onChangeText={(v) => update('postalcode', formatPostalCode(v))}
          {...focusHandlers('postalcode')}
        />
      </Field>
      <SaveCancelRow onSave={handleSave} onCancel={onCancel} saving={saving} />
    </View>
  );
}

export default function AddressManager({ addresses, onAdd, onEdit, onDelete, onSetDefault }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const [editingId, setEditingId] = useState(null); // address _id, 'new', or null
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
      setError(err.response?.data?.error || t('editProfile.addressSaveError'));
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
      setError(err.response?.data?.error || t('editProfile.addressRemoveError'));
    }
  };

  const handleSetDefault = async (id) => {
    setError(null);
    try {
      await onSetDefault(id);
    } catch (err) {
      setError(err.response?.data?.error || t('editProfile.addressDefaultError'));
    }
  };

  const sortedAddresses = [...addresses].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

  return (
    <Card icon="📍" title={t('editProfile.addresses')}>
      {error && (
        <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
          <Text style={formStyles.statusTextError}>⚠️  {error}</Text>
        </View>
      )}

      {sortedAddresses.map((addr) => (
        <View key={addr._id} style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: formStyles.card.borderColor }}>
          {editingId === addr._id ? (
            <AddressForm
              initial={{
                houseunitno: addr.houseunitno, jalan: addr.jalan, kampong: addr.kampong,
                simpang: addr.simpang || '', district: addr.district, postalcode: addr.postalcode,
              }}
              onSave={handleSave}
              onCancel={closeForm}
              saving={saving}
            />
          ) : (
            <>
              {addr.isDefault && (
                <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: formStyles.statusTextSuccess.color, marginBottom: 4, textAlign: isMobile ? 'center' : 'left' }}>{t('common.default')}</Text>
              )}
              <Text style={{ fontSize: scaleFont(14), color: formStyles.fieldLabel.color, fontWeight: '600', textAlign: isMobile ? 'center' : 'left' }}>{addr.houseunitno}, {addr.jalan}</Text>
              <Text style={{ fontSize: scaleFont(13), color: formStyles.subtitle.color, textAlign: isMobile ? 'center' : 'left' }}>{addr.kampong}{addr.simpang ? `, ${addr.simpang}` : ''}</Text>
              <Text style={{ fontSize: scaleFont(13), color: formStyles.subtitle.color, textAlign: isMobile ? 'center' : 'left' }}>{addr.district}, {addr.postalcode}</Text>

              {confirmingId === addr._id ? (
                <View style={{ marginTop: 8, alignItems: isMobile ? 'center' : 'flex-start' }}>
                  <DeleteConfirm onConfirm={() => handleDelete(addr._id)} onCancel={() => setConfirmingId(null)} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', marginTop: 8, justifyContent: isMobile ? 'center' : 'flex-start' }}>
                  <AnimatedPressable onPress={() => setEditingId(addr._id)} style={{ marginRight: 16 }} scaleTo={1.12}>
                    <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '600', fontSize: scaleFont(13) }}>{t('common.edit')}</Text>
                  </AnimatedPressable>
                  {!addr.isDefault && (
                    <AnimatedPressable onPress={() => handleSetDefault(addr._id)} style={{ marginRight: 16 }} scaleTo={1.12}>
                      <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '600', fontSize: scaleFont(13) }}>{t('common.setDefault')}</Text>
                    </AnimatedPressable>
                  )}
                  {addresses.length > 1 && (
                    <AnimatedPressable onPress={() => setConfirmingId(addr._id)} scaleTo={1.12}>
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
        <AddressForm initial={emptyAddress()} onSave={handleSave} onCancel={closeForm} saving={saving} />
      ) : (
        <AnimatedPressable onPress={() => setEditingId('new')} scaleTo={1.04}>
          <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '700', fontSize: scaleFont(14) }}>{t('editProfile.addAddress')}</Text>
        </AnimatedPressable>
      )}
    </Card>
  );
}
