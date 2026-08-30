import React from 'react';
import { Text, TextInput, View, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFormStyles, Card, Field, InfoNotice, makeInputStyle, makeFocusHandlers } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AnimatedPressable } from '../../lib/animations';

export default function CrossBorderFields({
  values, onChange, errors = {}, focusedField, setFocusedField,
  items, itemErrors = [], onItemChange, onAddItem, onRemoveItem, registerFieldRef,
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const itemsTotal = items.reduce((sum, item) => sum + (Number(item.totalItemPrice) || 0), 0);

  const pickInvoice = async (index) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      onItemChange(index, 'screenshotInvoice', `data:${mime};base64,${asset.base64}`);
    }
  };

  return (
    <Card icon="🌏" title={t('order.crossBorderDetails')}>
      <InfoNotice icon="📍" title={t('order.limbangAddressNoticeTitle')}>
        {t('order.limbangAddressBlock')}
      </InfoNotice>

      <Text style={formStyles.fieldLabel}>{t('order.deliveryOrSelfCollect')}<Text style={formStyles.requiredMark}> *</Text></Text>
      <View style={formStyles.toggleRow} ref={registerFieldRef ? (el) => registerFieldRef('shipmentMethod', el) : undefined}>
        <AnimatedPressable style={[formStyles.toggleBtn, values.shipmentMethod === 'Delivery' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('shipmentMethod', 'Delivery')}>
          <Text style={values.shipmentMethod === 'Delivery' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.delivery')}</Text>
        </AnimatedPressable>
        <AnimatedPressable style={[formStyles.toggleBtn, values.shipmentMethod === 'Self Collect' && formStyles.toggleBtnActive]} scaleTo={1.04} onPress={() => onChange('shipmentMethod', 'Self Collect')}>
          <Text style={values.shipmentMethod === 'Self Collect' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('order.selfCollect')}</Text>
        </AnimatedPressable>
      </View>

      <Field label={t('order.originalTrackingNo')} required error={errors.parcelTrackingNum} hint={t('order.originalTrackingNoHint')} fieldKey="parcelTrackingNum" registerRef={registerFieldRef}>
        <TextInput style={inputStyle('parcelTrackingNum')} value={values.parcelTrackingNum} onChangeText={(v) => onChange('parcelTrackingNum', v)} {...focusHandlers('parcelTrackingNum')} />
      </Field>

      <Field label={t('order.courier')} required error={errors.supplierName} hint={t('order.courierHint')} fieldKey="supplierName" registerRef={registerFieldRef}>
        <TextInput style={inputStyle('supplierName')} value={values.supplierName} onChangeText={(v) => onChange('supplierName', v)} {...focusHandlers('supplierName')} />
      </Field>

      {items.map((item, index) => {
        const itemErrs = itemErrors[index] || {};
        const itemFieldKey = (name) => `cbslItem_${index}_${name}`;
        const itemInputStyle = makeInputStyle(formStyles, focusedField, {
          [itemFieldKey('itemContains')]: itemErrs.itemContains,
          [itemFieldKey('quantity')]: itemErrs.quantity,
          [itemFieldKey('totalItemPrice')]: itemErrs.totalItemPrice,
        });

        return (
          <View key={index} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={formStyles.fieldLabel}>{t('order.itemNumber').replace('${number}', index + 1)}</Text>
              {items.length > 1 && (
                <AnimatedPressable scaleTo={1.1} onPress={() => onRemoveItem(index)}>
                  <Text style={{ color: colors.error, fontWeight: 'bold' }}>{t('order.removeItem')}</Text>
                </AnimatedPressable>
              )}
            </View>

            <Field label={t('order.itemDescription')} required error={itemErrs.itemContains} fieldKey={`cbslItems[${index}].itemContains`} registerRef={registerFieldRef}>
              <TextInput
                style={itemInputStyle(itemFieldKey('itemContains'))}
                value={item.itemContains}
                onChangeText={(v) => onItemChange(index, 'itemContains', v)}
                {...focusHandlers(itemFieldKey('itemContains'))}
              />
            </Field>

            <Field label={t('order.quantity')} required error={itemErrs.quantity} fieldKey={`cbslItems[${index}].quantity`} registerRef={registerFieldRef}>
              <TextInput
                style={itemInputStyle(itemFieldKey('quantity'))}
                keyboardType="numeric"
                value={item.quantity}
                onChangeText={(v) => onItemChange(index, 'quantity', v.replace(/[^0-9]/g, ''))}
                {...focusHandlers(itemFieldKey('quantity'))}
              />
            </Field>

            <Field label={t('order.totalItemPrice')} required error={itemErrs.totalItemPrice} fieldKey={`cbslItems[${index}].totalItemPrice`} registerRef={registerFieldRef}>
              <TextInput
                style={itemInputStyle(itemFieldKey('totalItemPrice'))}
                keyboardType="numeric"
                value={item.totalItemPrice}
                onChangeText={(v) => onItemChange(index, 'totalItemPrice', v.replace(/[^0-9.]/g, ''))}
                {...focusHandlers(itemFieldKey('totalItemPrice'))}
              />
            </Field>

            <Field label={t('order.uploadInvoice')} required error={itemErrs.screenshotInvoice} fieldKey={`cbslItems[${index}].screenshotInvoice`} registerRef={registerFieldRef}>
              {item.screenshotInvoice ? (
                <Image source={{ uri: item.screenshotInvoice }} style={{ width: 120, height: 120, borderRadius: 8, marginBottom: 10 }} resizeMode="cover" />
              ) : null}
              <AnimatedPressable style={formStyles.button} scaleTo={1.03} onPress={() => pickInvoice(index)}>
                <Text style={formStyles.buttonText}>{item.screenshotInvoice ? t('order.changeImage') : t('order.chooseImage')}</Text>
              </AnimatedPressable>
            </Field>
          </View>
        );
      })}

      <AnimatedPressable style={formStyles.button} scaleTo={1.03} onPress={onAddItem}>
        <Text style={formStyles.buttonText}>{t('order.addItem')}</Text>
      </AnimatedPressable>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Text style={[formStyles.fieldLabel, { marginBottom: 0 }]}>{t('order.itemsPriceTotal')}</Text>
        <Text style={{ color: formStyles.statusTextSuccess.color, fontWeight: 'bold', fontSize: 16 }}>RM {itemsTotal.toFixed(2)}</Text>
      </View>
    </Card>
  );
}
