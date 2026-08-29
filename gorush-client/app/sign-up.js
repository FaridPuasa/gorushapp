import React, { useState, useEffect } from 'react';
import {
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useFormStyles, Card, Field, makeInputStyle, makeFocusHandlers, PageScroll } from '../lib/formPrimitives';
import { AnimatedPressable } from '../lib/animations';
import {
  isValidEmail, formatPostalCode, isValidPostalCode, formatICNumber,
  formatBruHims, applyPrefix, isPrefixOnly, getPasswordStrength, COUNTRY_CODES
} from '../lib/validators';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { getBruneiNow, getBruneiTodayISO } from '../lib/bruneiTime';

const INITIAL_FORM_DATA = {
  email: '', password: '', confirmPassword: '',
  houseunitno: '', jalan: '', kampong: '', simpang: '',
  district: 'Brunei', postalcode: '',
  countryCodeMain: '+673', phonenum: '',
  countryCodeAdd: '+673', addphonenum: '',
  receivername: '', dateofbirth: '',
  idType: 'IC', icnum: '', passportnum: '',
  bruhimsnum: '', patientphcnum: '', patientjpmcnum: '',
  Agreepolicy: false, Receivemarketing: false,
};

export default function Register() {
  const router = useRouter();
  const { applyToken, isGuest, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();

  useEffect(() => {
    if (!authLoading && !isGuest) {
      router.replace('/');
    }
  }, [authLoading, isGuest]);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rawDate, setRawDate] = useState(new Date());

  const [hidePass, setHidePass] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);

  const updateField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handlePrefixInput = (field, prefix, text) => {
    updateField(field, applyPrefix(prefix, text));
  };

  const handlePostalCode = (text) => updateField('postalcode', formatPostalCode(text));
  const handleICNumber = (text) => updateField('icnum', formatICNumber(text));
  const handleBruHims = (text) => updateField('bruhimsnum', formatBruHims(text));

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setRawDate(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      updateField('dateofbirth', `${day}.${month}.${year}`);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = t('auth.register.emailRequired');
    else if (!isValidEmail(formData.email)) newErrors.email = t('auth.register.emailInvalid');
    if (!formData.password) newErrors.password = t('auth.register.passwordRequired');
    if (!formData.confirmPassword) newErrors.confirmPassword = t('auth.register.confirmPasswordRequired');
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('auth.register.passwordsDontMatch');

    if (!formData.houseunitno.trim()) newErrors.houseunitno = t('auth.register.houseUnitRequired');
    if (isPrefixOnly('Jln ', formData.jalan)) newErrors.jalan = t('auth.register.jalanRequired');
    if (isPrefixOnly('Kg ', formData.kampong)) newErrors.kampong = t('auth.register.kampongRequired');
    if (formData.postalcode && !isValidPostalCode(formData.postalcode)) newErrors.postalcode = t('auth.register.postalCodeInvalid');

    if (!formData.phonenum) newErrors.phonenum = t('auth.register.phoneRequired');

    if (!formData.receivername.trim()) newErrors.receivername = t('auth.register.receiverNameRequired');
    if (!formData.dateofbirth) newErrors.dateofbirth = t('auth.register.dobRequired');

    if (formData.idType === 'IC') {
      if (formData.icnum.length !== 8) newErrors.icnum = t('auth.register.icInvalid');
    } else if (!formData.passportnum.trim()) {
      newErrors.passportnum = t('auth.register.passportRequired');
    }

    if (formData.bruhimsnum && formData.bruhimsnum.length !== 10) {
      newErrors.bruhimsnum = t('auth.register.bruHimsInvalid');
    }

    if (!formData.Agreepolicy) newErrors.Agreepolicy = t('auth.register.agreePolicyRequired');

    return newErrors;
  };

  const handleRegister = async () => {
    if (submitting) return;
    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setStatusMessage({ type: 'error', text: t('order.fixHighlighted') });
      return;
    }

    setStatusMessage(null);
    setSubmitting(true);
    try {
      const finalPayload = {
        ...formData,
        phonenum: `${formData.countryCodeMain}${formData.phonenum}`,
        addphonenum: formData.addphonenum ? `${formData.countryCodeAdd}${formData.addphonenum}` : ''
      };

      const response = await api.post('/api/auth/register', finalPayload);
      await applyToken(response.data.token);
      router.replace('/');
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.response?.data?.error || t('auth.register.genericError') });
      setSubmitting(false);
    }
  };

  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);
  const passwordStrength = getPasswordStrength(formData.password, colors, t);

  if (authLoading || !isGuest) return null;

  return (
    <PageScroll title={t('nav.register')}>
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        <Text style={formStyles.title}>{t('auth.register.title')}</Text>
        <Text style={formStyles.subtitle}>{t('auth.register.subtitle')}</Text>

        {statusMessage && (
          <View style={[formStyles.statusBanner, statusMessage.type === 'success' ? formStyles.statusSuccess : formStyles.statusErrorBanner]}>
            <Text style={statusMessage.type === 'success' ? formStyles.statusTextSuccess : formStyles.statusTextError}>
              {statusMessage.type === 'success' ? '✅  ' : '⚠️  '}{statusMessage.text}
            </Text>
          </View>
        )}

        <Card icon="👤" title={t('auth.register.accountDetails')}>
          <Field label={t('contact.email')} required error={errors.email}>
            <TextInput
              style={inputStyle('email')}
              placeholder={t('contact.emailPlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(val) => updateField('email', val)}
              {...focusHandlers('email')}
            />
          </Field>

          <Field label={t('auth.register.password')} required error={errors.password}>
            <View style={formStyles.passwordContainer}>
              <TextInput
                style={[inputStyle('password'), formStyles.passwordInput]}
                placeholder={t('auth.register.passwordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={hidePass}
                value={formData.password}
                onChangeText={(val) => updateField('password', val)}
                {...focusHandlers('password')}
              />
              <AnimatedPressable scaleTo={1.1} style={formStyles.revealButton} onPress={() => setHidePass(!hidePass)}>
                <Text style={formStyles.revealText}>{hidePass ? t('common.show') : t('common.hide')}</Text>
              </AnimatedPressable>
            </View>
            {passwordStrength && (
              <View style={formStyles.strengthRow}>
                <View style={formStyles.strengthTrack}>
                  <View style={[formStyles.strengthFill, { width: passwordStrength.width, backgroundColor: passwordStrength.color }]} />
                </View>
                <Text style={[formStyles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
              </View>
            )}
          </Field>

          <Field label={t('auth.register.confirmPassword')} required error={errors.confirmPassword}>
            <View style={formStyles.passwordContainer}>
              <TextInput
                style={[inputStyle('confirmPassword'), formStyles.passwordInput]}
                placeholder={t('auth.register.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={hideConfirm}
                value={formData.confirmPassword}
                onChangeText={(val) => updateField('confirmPassword', val)}
                {...focusHandlers('confirmPassword')}
              />
              <AnimatedPressable scaleTo={1.1} style={formStyles.revealButton} onPress={() => setHideConfirm(!hideConfirm)}>
                <Text style={formStyles.revealText}>{hideConfirm ? t('common.show') : t('common.hide')}</Text>
              </AnimatedPressable>
            </View>
            {formData.confirmPassword.length > 0 && !errors.confirmPassword && (
              <Text style={formData.password === formData.confirmPassword ? formStyles.matchOk : formStyles.matchFail}>
                {formData.password === formData.confirmPassword ? t('auth.register.passwordsMatch') : t('auth.register.passwordsNoMatch')}
              </Text>
            )}
          </Field>
        </Card>

        <Card icon="📍" title={t('auth.register.defaultAddress')}>
          <Field label={t('address.houseUnitNo')} required error={errors.houseunitno}>
            <TextInput
              style={inputStyle('houseunitno')}
              placeholder={t('address.houseUnitPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={formData.houseunitno}
              onChangeText={(val) => updateField('houseunitno', val)}
              {...focusHandlers('houseunitno')}
            />
          </Field>

          <Field label={t('address.jalan')} required error={errors.jalan}>
            <TextInput
              style={inputStyle('jalan')}
              accessibilityLabel={t('address.jalan')}
              value={formData.jalan}
              onFocus={() => { setFocusedField('jalan'); if (!formData.jalan) updateField('jalan', 'Jln '); }}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => handlePrefixInput('jalan', 'Jln ', text)}
            />
          </Field>

          <Field label={t('address.kampong')} required error={errors.kampong}>
            <TextInput
              style={inputStyle('kampong')}
              accessibilityLabel={t('address.kampong')}
              value={formData.kampong}
              onFocus={() => { setFocusedField('kampong'); if (!formData.kampong) updateField('kampong', 'Kg '); }}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => handlePrefixInput('kampong', 'Kg ', text)}
            />
          </Field>

          <Field label={t('address.simpang')}>
            <TextInput
              style={inputStyle('simpang')}
              accessibilityLabel={t('address.simpang')}
              value={formData.simpang}
              onFocus={() => { setFocusedField('simpang'); if (!formData.simpang) updateField('simpang', 'Spg '); }}
              onBlur={() => setFocusedField(null)}
              onChangeText={(text) => handlePrefixInput('simpang', 'Spg ', text)}
            />
          </Field>

          <Field label={t('address.district')} required>
            <View style={formStyles.pickerContainer}>
              <Picker style={formStyles.pickerControl} selectedValue={formData.district} onValueChange={(itemValue) => updateField('district', itemValue)}>
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
              value={formData.postalcode}
              onChangeText={handlePostalCode}
              {...focusHandlers('postalcode')}
            />
          </Field>
        </Card>

        <Card icon="📞" title={t('auth.register.contactInformation')}>
          <Text style={formStyles.infoHint}>{t('auth.register.phoneHint')}</Text>

          <Field label={t('contact.phoneNumber')} required error={errors.phonenum}>
            <View style={formStyles.phoneRow}>
              <View style={formStyles.miniPicker}>
                <Picker style={formStyles.pickerControl} selectedValue={formData.countryCodeMain} onValueChange={(val) => updateField('countryCodeMain', val)}>
                  {COUNTRY_CODES.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
                </Picker>
              </View>
              <TextInput
                style={[inputStyle('phonenum'), formStyles.phoneInput]}
                placeholder={t('contact.phoneNoPlaceholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={formData.phonenum}
                onChangeText={(val) => updateField('phonenum', val.replace(/[^0-9]/g, ''))}
                {...focusHandlers('phonenum')}
              />
            </View>
          </Field>

          <Field label={t('contact.additionalPhoneNumber')}>
            <View style={formStyles.phoneRow}>
              <View style={formStyles.miniPicker}>
                <Picker style={formStyles.pickerControl} selectedValue={formData.countryCodeAdd} onValueChange={(val) => updateField('countryCodeAdd', val)}>
                  {COUNTRY_CODES.map((c) => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
                </Picker>
              </View>
              <TextInput
                style={[inputStyle('addphonenum'), formStyles.phoneInput]}
                placeholder={t('common.optional')}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={formData.addphonenum}
                onChangeText={(val) => updateField('addphonenum', val.replace(/[^0-9]/g, ''))}
                {...focusHandlers('addphonenum')}
              />
            </View>
          </Field>
        </Card>

        <Card icon="🪪" title={t('auth.register.personalDetails')}>
          <Field label={t('auth.register.receiverName')} required error={errors.receivername}>
            <TextInput
              style={inputStyle('receivername')}
              placeholder={t('auth.register.receiverNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={formData.receivername}
              onChangeText={(val) => updateField('receivername', val)}
              {...focusHandlers('receivername')}
            />
          </Field>

          <Field label={t('identity.dateOfBirth')} required error={errors.dateofbirth}>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                max={getBruneiTodayISO()}
                style={formStyles.webDatePicker}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-');
                    updateField('dateofbirth', `${d}.${m}.${y}`);
                  }
                }}
              />
            ) : (
              <AnimatedPressable scaleTo={1.04} style={formStyles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                <Text style={formStyles.datePickerButtonText}>
                  {formData.dateofbirth ? `📅 ${formData.dateofbirth}` : t('identity.selectDob')}
                </Text>
              </AnimatedPressable>
            )}
          </Field>

          {showDatePicker && (
            <DateTimePicker
              value={rawDate}
              mode="date"
              display="default"
              maximumDate={getBruneiNow()}
              onValueChange={onChangeDate}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}

          <Text style={formStyles.fieldLabel}>{t('auth.register.primaryIdDocument')}<Text style={formStyles.requiredMark}> *</Text></Text>
          <View style={formStyles.toggleRow}>
            <AnimatedPressable scaleTo={1.02} style={[formStyles.toggleBtn, formData.idType === 'IC' && formStyles.toggleBtnActive]} onPress={() => updateField('idType', 'IC')}>
              <Text style={formData.idType === 'IC' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('identity.useIc')}</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleTo={1.02} style={[formStyles.toggleBtn, formData.idType === 'Passport' && formStyles.toggleBtnActive]} onPress={() => updateField('idType', 'Passport')}>
              <Text style={formData.idType === 'Passport' ? formStyles.toggleTextActive : formStyles.toggleText}>{t('identity.usePassport')}</Text>
            </AnimatedPressable>
          </View>
          {formData.idType === 'IC' ? (
            <Field error={errors.icnum}>
              <TextInput
                style={inputStyle('icnum')}
                placeholder={t('identity.icPlaceholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={8}
                value={formData.icnum}
                onChangeText={handleICNumber}
                {...focusHandlers('icnum')}
              />
            </Field>
          ) : (
            <Field error={errors.passportnum}>
              <TextInput
                style={inputStyle('passportnum')}
                placeholder={t('identity.passportNumber')}
                placeholderTextColor={colors.textMuted}
                value={formData.passportnum}
                onChangeText={(val) => updateField('passportnum', val)}
                {...focusHandlers('passportnum')}
              />
            </Field>
          )}

          <Field label={t('auth.register.bruHimsNo')} error={errors.bruhimsnum} hint={t('auth.register.bruHimsHint')}>
            <TextInput
              style={inputStyle('bruhimsnum')}
              maxLength={10}
              value={formData.bruhimsnum}
              onFocus={() => { setFocusedField('bruhimsnum'); if (!formData.bruhimsnum) updateField('bruhimsnum', 'BN'); }}
              onBlur={() => setFocusedField(null)}
              onChangeText={handleBruHims}
            />
          </Field>

          <Field label={t('auth.register.phcPatientNo')}>
            <TextInput
              style={inputStyle('patientphcnum')}
              value={formData.patientphcnum}
              onChangeText={(val) => updateField('patientphcnum', val)}
              {...focusHandlers('patientphcnum')}
            />
          </Field>

          <Field label={t('auth.register.jpmcPatientNo')}>
            <TextInput
              style={inputStyle('patientjpmcnum')}
              value={formData.patientjpmcnum}
              onChangeText={(val) => updateField('patientjpmcnum', val)}
              {...focusHandlers('patientjpmcnum')}
            />
          </Field>
        </Card>

        <Card icon="📜" title={t('auth.register.agreements')}>
          <AnimatedPressable
            scaleTo={1.02}
            style={[formStyles.checkboxFake, formData.Agreepolicy ? formStyles.checkboxActive : errors.Agreepolicy && formStyles.checkboxErrorBox]}
            onPress={() => updateField('Agreepolicy', !formData.Agreepolicy)}
          >
            <Text style={formStyles.checkboxText}>{formData.Agreepolicy ? t('auth.register.agreedPolicy') : t('auth.register.tapAgreePolicy')}</Text>
          </AnimatedPressable>
          {errors.Agreepolicy && <Text style={formStyles.fieldError}>{errors.Agreepolicy}</Text>}

          <AnimatedPressable
            scaleTo={1.02}
            style={[formStyles.checkboxFake, formData.Receivemarketing && formStyles.checkboxActive]}
            onPress={() => updateField('Receivemarketing', !formData.Receivemarketing)}
          >
            <Text style={formStyles.checkboxText}>{formData.Receivemarketing ? t('auth.register.agreedMarketing') : t('auth.register.tapAgreeMarketing')}</Text>
          </AnimatedPressable>
        </Card>

        <AnimatedPressable
          scaleTo={1.03}
          style={[formStyles.button, submitting && formStyles.buttonDisabled]}
          onPress={handleRegister}
          disabled={submitting}
        >
          {submitting ? (
            <View style={formStyles.buttonRow}>
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text style={formStyles.buttonText}>{t('auth.register.registering')}</Text>
            </View>
          ) : (
            <Text style={formStyles.buttonText}>{t('auth.register.registerAccount')}</Text>
          )}
        </AnimatedPressable>

        <AnimatedPressable scaleTo={1.04} style={{ marginTop: 16, alignItems: 'center' }} onPress={() => router.push('/login')}>
          <Text style={{ color: formStyles.subtitle.color, fontSize: scaleFont(13) }}>{t('auth.register.alreadyHaveAccount')} <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('auth.register.logInLink')}</Text></Text>
        </AnimatedPressable>
      </View>
    </PageScroll>
  );
}
