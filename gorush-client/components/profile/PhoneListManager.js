import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Card, useFormStyles, SaveCancelRow, DeleteConfirm } from '../../lib/formPrimitives';
import { COUNTRY_CODES, splitPhoneNumber, combinePhoneNumber } from '../../lib/validators';
import { useIsMobile } from '../../lib/responsive';
import { AnimatedPressable } from '../../lib/animations';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { useTheme } from '../../context/ThemeContext';

export default function PhoneListManager({ title, icon, items, valueKey, supportsDefault, onAdd, onEdit, onDelete, onSetDefault }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const [editingId, setEditingId] = useState(null); // item _id, 'new', or null
  const [confirmingId, setConfirmingId] = useState(null);
  const isMobile = useIsMobile();
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].value);
  const [localNumber, setLocalNumber] = useState('');
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const openEdit = (item) => {
    const { countryCode: cc, localNumber: local } = splitPhoneNumber(item[valueKey]);
    setEditingId(item._id);
    setCountryCode(cc);
    setLocalNumber(local);
    setFormError(null);
  };
  const openAdd = () => {
    setEditingId('new');
    setCountryCode(COUNTRY_CODES[0].value);
    setLocalNumber('');
    setFormError(null);
  };
  const closeForm = () => {
    setEditingId(null);
    setLocalNumber('');
    setFormError(null);
  };

  const handleSave = async () => {
    if (!localNumber.trim()) {
      setFormError(t('editProfile.phoneRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const combined = combinePhoneNumber(countryCode, localNumber.trim());
      if (editingId === 'new') await onAdd(combined);
      else await onEdit(editingId, combined);
      closeForm();
    } catch (err) {
      setError(err.response?.data?.error || t('editProfile.phoneSaveError'));
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
      setError(err.response?.data?.error || t('editProfile.phoneRemoveError'));
    }
  };

  const handleSetDefault = async (id) => {
    setError(null);
    try {
      await onSetDefault(id);
    } catch (err) {
      setError(err.response?.data?.error || t('editProfile.phoneDefaultError'));
    }
  };

  const renderForm = () => (
    <View>
      <View style={formStyles.phoneRow}>
        <View style={formStyles.miniPicker}>
          <Picker style={formStyles.pickerControl} selectedValue={countryCode} onValueChange={setCountryCode}>
            {COUNTRY_CODES.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
          </Picker>
        </View>
        <TextInput
          style={[formStyles.input, formStyles.phoneInput]}
          value={localNumber}
          onChangeText={(v) => setLocalNumber(v.replace(/[^0-9]/g, ''))}
          keyboardType="phone-pad"
          placeholder={t('contact.phoneNoPlaceholder')}
          placeholderTextColor={colors.textMuted}
        />
      </View>
      {formError && <Text style={formStyles.fieldError}>{formError}</Text>}
      <SaveCancelRow onSave={handleSave} onCancel={closeForm} saving={saving} />
    </View>
  );

  const sortedItems = supportsDefault
    ? [...items].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
    : items;

  return (
    <Card icon={icon} title={title}>
      {error && (
        <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
          <Text style={formStyles.statusTextError}>⚠️  {error}</Text>
        </View>
      )}

      {sortedItems.map((item) => (
        <View key={item._id} style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: formStyles.card.borderColor }}>
          {editingId === item._id ? (
            renderForm()
          ) : confirmingId === item._id ? (
            <View style={{ alignItems: isMobile ? 'center' : 'flex-start' }}>
              <DeleteConfirm onConfirm={() => handleDelete(item._id)} onCancel={() => setConfirmingId(null)} />
            </View>
          ) : (
            <View style={isMobile
              ? { alignItems: 'center' }
              : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <View style={isMobile && { alignItems: 'center' }}>
                {supportsDefault && item.isDefault && (
                  <Text style={{ fontSize: scaleFont(11), fontWeight: '700', color: formStyles.statusTextSuccess.color, textAlign: isMobile ? 'center' : 'left' }}>{t('common.default')}</Text>
                )}
                <Text style={{ fontSize: scaleFont(14), fontWeight: '600', color: formStyles.fieldLabel.color, textAlign: isMobile ? 'center' : 'left' }}>{item[valueKey]}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginTop: isMobile ? 8 : 0 }}>
                <AnimatedPressable onPress={() => openEdit(item)} style={{ marginRight: 14 }} scaleTo={1.12}>
                  <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '600', fontSize: scaleFont(13) }}>{t('common.edit')}</Text>
                </AnimatedPressable>
                {supportsDefault && !item.isDefault && (
                  <AnimatedPressable onPress={() => handleSetDefault(item._id)} style={{ marginRight: 14 }} scaleTo={1.12}>
                    <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '600', fontSize: scaleFont(13) }}>{t('common.setDefault')}</Text>
                  </AnimatedPressable>
                )}
                {(!supportsDefault || items.length > 1) && (
                  <AnimatedPressable onPress={() => setConfirmingId(item._id)} scaleTo={1.12}>
                    <Text style={{ color: formStyles.statusTextError.color, fontWeight: '600', fontSize: scaleFont(13) }}>{t('common.delete')}</Text>
                  </AnimatedPressable>
                )}
              </View>
            </View>
          )}
        </View>
      ))}

      {editingId === 'new' ? (
        renderForm()
      ) : (
        <AnimatedPressable onPress={openAdd} scaleTo={1.04}>
          <Text style={{ color: formStyles.button.backgroundColor, fontWeight: '700', fontSize: scaleFont(14) }}>{t('editProfile.addPhoneNumber')}</Text>
        </AnimatedPressable>
      )}
    </Card>
  );
}
