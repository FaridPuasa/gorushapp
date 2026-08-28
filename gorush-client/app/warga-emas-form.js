import React, { useState } from 'react';
import { Text, TextInput, View, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { PageScroll, Card, Field, useFormStyles, makeInputStyle, makeFocusHandlers } from '../lib/formPrimitives';
import { AnimatedPressable } from '../lib/animations';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { COUNTRY_CODES, splitPhoneNumber, combinePhoneNumber } from '../lib/validators';
import { api } from '../lib/api';

export default function WargaEmas() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { scaleFont } = useFontScale();
  const formStyles = useFormStyles();

  const [phone, setPhone] = useState('');
  const [icFront, setIcFront] = useState('');
  const [icBack, setIcBack] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const pickImage = async (setter) => {
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
      setter(`data:${mime};base64,${asset.base64}`);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const newErrors = {};
    if (!splitPhoneNumber(phone).localNumber) newErrors.phone = t('wargaEmasForm.phoneRequired');
    if (!icFront) newErrors.icFront = t('wargaEmasForm.icFrontRequired');
    if (!icBack) newErrors.icBack = t('wargaEmasForm.icBackRequired');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    setStatusMessage(null);
    try {
      await api.post('/api/warga-emas-orders', {
        receiverPhoneNumber: phone,
        icPictureFront: icFront,
        icPictureBack: icBack,
      });
      setSubmitted(true);
    } catch (error) {
      setStatusMessage({ text: error.response?.data?.error || t('wargaEmasForm.genericSubmitError') });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <PageScroll title={t('nav.wargaEmas')}>
        <Card icon="✅" title={t('wargaEmasForm.submittedTitle')}>
          <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color, lineHeight: 20 }}>
            {t('wargaEmasForm.submittedBody')}
          </Text>
        </Card>
      </PageScroll>
    );
  }

  return (
    <PageScroll title={t('nav.wargaEmas')}>
      <Text style={formStyles.title}>{t('nav.wargaEmas')}</Text>
      <Text style={formStyles.subtitle}>{t('wargaEmasForm.subtitle')}</Text>

      {statusMessage && (
        <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
          <Text style={formStyles.statusTextError}>⚠️  {statusMessage.text}</Text>
        </View>
      )}

      <Card icon="👴" title={t('wargaEmasForm.cardTitle')}>
        <Field label={t('contact.phoneNumber')} required error={errors.phone}>
          <View style={formStyles.phoneRow}>
            <View style={formStyles.miniPicker}>
              <Picker
                style={formStyles.pickerControl}
                selectedValue={splitPhoneNumber(phone).countryCode}
                onValueChange={(cc) => setPhone(combinePhoneNumber(cc, splitPhoneNumber(phone).localNumber))}
              >
                {COUNTRY_CODES.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
              </Picker>
            </View>
            <TextInput
              style={[inputStyle('phone'), formStyles.phoneInput]}
              placeholder={t('contact.phoneNoPlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={splitPhoneNumber(phone).localNumber}
              onChangeText={(v) => setPhone(combinePhoneNumber(splitPhoneNumber(phone).countryCode, v.replace(/[^0-9]/g, '')))}
              {...focusHandlers('phone')}
            />
          </View>
        </Field>

        <Field label={t('wargaEmasForm.icFront')} required error={errors.icFront}>
          {icFront ? (
            <Image source={{ uri: icFront }} style={{ width: 160, height: 100, borderRadius: 8, marginBottom: 10 }} resizeMode="cover" />
          ) : null}
          <AnimatedPressable scaleTo={1.03} style={formStyles.button} onPress={() => pickImage(setIcFront)}>
            <Text style={formStyles.buttonText}>{icFront ? t('order.changeImage') : t('order.chooseImage')}</Text>
          </AnimatedPressable>
        </Field>

        <Field label={t('wargaEmasForm.icBack')} required error={errors.icBack}>
          {icBack ? (
            <Image source={{ uri: icBack }} style={{ width: 160, height: 100, borderRadius: 8, marginBottom: 10 }} resizeMode="cover" />
          ) : null}
          <AnimatedPressable scaleTo={1.03} style={formStyles.button} onPress={() => pickImage(setIcBack)}>
            <Text style={formStyles.buttonText}>{icBack ? t('order.changeImage') : t('order.chooseImage')}</Text>
          </AnimatedPressable>
        </Field>
      </Card>

      <AnimatedPressable scaleTo={1.03} style={formStyles.buttonAccent} onPress={handleSubmit} disabled={submitting}>
        <Text style={formStyles.buttonText}>{submitting ? t('wargaEmasForm.submitting') : t('wargaEmasForm.submit')}</Text>
      </AnimatedPressable>
    </PageScroll>
  );
}
