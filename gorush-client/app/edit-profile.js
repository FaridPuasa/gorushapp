import React, { useEffect, useState, useCallback } from 'react';
import { Text, TextInput, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, Field, useFormStyles, makeInputStyle, makeFocusHandlers, useFieldFocus } from '../lib/formPrimitives';
import { isValidEmail, getPasswordStrength } from '../lib/validators';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import AddressManager from '../components/profile/AddressManager';
import PhoneListManager from '../components/profile/PhoneListManager';
import PersonalDetailsManager from '../components/profile/PersonalDetailsManager';
import { AnimatedPressable } from '../lib/animations';

function StatusBanner({ statusMessage }) {
  const formStyles = useFormStyles();
  if (!statusMessage) return null;
  const success = statusMessage.type === 'success';
  return (
    <View style={[formStyles.statusBanner, success ? formStyles.statusSuccess : formStyles.statusErrorBanner]}>
      <Text style={success ? formStyles.statusTextSuccess : formStyles.statusTextError}>
        {success ? '✅  ' : '⚠️  '}{statusMessage.text}
      </Text>
    </View>
  );
}

function SaveButton({ onPress, saving, label }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  return (
    <AnimatedPressable scaleTo={1.03} style={[formStyles.button, saving && formStyles.buttonDisabled]} onPress={onPress} disabled={saving}>
      {saving ? (
        <View style={formStyles.buttonRow}>
          <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          <Text style={formStyles.buttonText}>{t('common.saving')}</Text>
        </View>
      ) : (
        <Text style={formStyles.buttonText}>{label || t('common.saveChanges')}</Text>
      )}
    </AnimatedPressable>
  );
}

function AccountSection({ profile, headers, onSaved, scrollRef }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  const [email, setEmail] = useState(profile.email);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const { registerFieldRef, scrollToFirstError } = useFieldFocus();

  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);

  const handleSave = async () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = t('contact.emailRequired');
    else if (!isValidEmail(email)) newErrors.email = t('contact.emailInvalid');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(['email'], newErrors, scrollRef);
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      await api.put('/api/profile/basic', { email }, headers);
      setStatusMessage({ type: 'success', text: t('editProfile.accountUpdated') });
      await onSaved();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.error || t('editProfile.accountUpdateError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card icon="👤" title={t('editProfile.accountDetails')}>
      <StatusBanner statusMessage={statusMessage} />
      <Field label={t('contact.email')} required error={errors.email} fieldKey="email" registerRef={registerFieldRef}>
        <TextInput
          style={inputStyle('email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          {...focusHandlers('email')}
        />
      </Field>
      <SaveButton onPress={handleSave} saving={saving} />
    </Card>
  );
}

function PasswordSection({ headers, scrollRef }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hideCurrent, setHideCurrent] = useState(true);
  const [hideNew, setHideNew] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const { registerFieldRef, scrollToFirstError } = useFieldFocus();

  const inputStyle = makeInputStyle(formStyles, focusedField, errors);
  const focusHandlers = makeFocusHandlers(setFocusedField);
  const passwordStrength = getPasswordStrength(newPassword, colors, t);

  const handleSave = async () => {
    const newErrors = {};
    if (!currentPassword) newErrors.currentPassword = t('editProfile.currentPasswordRequired');
    if (!newPassword) newErrors.newPassword = t('editProfile.newPasswordRequired');
    if (!confirmPassword) newErrors.confirmPassword = t('editProfile.confirmNewPasswordRequired');
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = t('editProfile.passwordsNoMatch');
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(['currentPassword', 'newPassword', 'confirmPassword'], newErrors, scrollRef);
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      await api.put('/api/profile/password', { currentPassword, newPassword }, headers);
      setStatusMessage({ type: 'success', text: t('editProfile.passwordUpdated') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.response?.data?.error || t('editProfile.passwordUpdateError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card icon="🔑" title={t('editProfile.changePassword')}>
      <StatusBanner statusMessage={statusMessage} />

      <Field label={t('editProfile.currentPassword')} required error={errors.currentPassword} fieldKey="currentPassword" registerRef={registerFieldRef}>
        <View style={formStyles.passwordContainer}>
          <TextInput
            style={[inputStyle('currentPassword'), formStyles.passwordInput]}
            accessibilityLabel={t('editProfile.currentPassword')}
            secureTextEntry={hideCurrent}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            {...focusHandlers('currentPassword')}
          />
          <AnimatedPressable scaleTo={1.1} style={formStyles.revealButton} onPress={() => setHideCurrent(!hideCurrent)}>
            <Text style={formStyles.revealText}>{hideCurrent ? t('common.show') : t('common.hide')}</Text>
          </AnimatedPressable>
        </View>
      </Field>

      <Field label={t('editProfile.newPassword')} required error={errors.newPassword} fieldKey="newPassword" registerRef={registerFieldRef}>
        <View style={formStyles.passwordContainer}>
          <TextInput
            style={[inputStyle('newPassword'), formStyles.passwordInput]}
            accessibilityLabel={t('editProfile.newPassword')}
            secureTextEntry={hideNew}
            value={newPassword}
            onChangeText={setNewPassword}
            {...focusHandlers('newPassword')}
          />
          <AnimatedPressable scaleTo={1.1} style={formStyles.revealButton} onPress={() => setHideNew(!hideNew)}>
            <Text style={formStyles.revealText}>{hideNew ? t('common.show') : t('common.hide')}</Text>
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

      <Field label={t('editProfile.confirmNewPassword')} required error={errors.confirmPassword} fieldKey="confirmPassword" registerRef={registerFieldRef}>
        <View style={formStyles.passwordContainer}>
          <TextInput
            style={[inputStyle('confirmPassword'), formStyles.passwordInput]}
            accessibilityLabel={t('editProfile.confirmNewPassword')}
            secureTextEntry={hideConfirm}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            {...focusHandlers('confirmPassword')}
          />
          <AnimatedPressable scaleTo={1.1} style={formStyles.revealButton} onPress={() => setHideConfirm(!hideConfirm)}>
            <Text style={formStyles.revealText}>{hideConfirm ? t('common.show') : t('common.hide')}</Text>
          </AnimatedPressable>
        </View>
        {confirmPassword.length > 0 && !errors.confirmPassword && (
          <Text style={newPassword === confirmPassword ? formStyles.matchOk : formStyles.matchFail}>
            {newPassword === confirmPassword ? t('editProfile.passwordsMatchIndicator') : t('editProfile.passwordsNoMatchIndicator')}
          </Text>
        )}
      </Field>

      <SaveButton onPress={handleSave} saving={saving} label={t('editProfile.updatePassword')} />
    </Card>
  );
}

export default function EditProfile() {
  const { isGuest, loading: authLoading, token, refreshProfile } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const formStyles = useFormStyles();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    if (!authLoading && isGuest) {
      router.replace('/login');
    }
  }, [authLoading, isGuest]);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.get('/api/profile', { headers: { Authorization: `Bearer ${token}` } });
      setProfile(response.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.response?.data?.error || t('editProfile.loadError'));
    } finally {
      setLoadingProfile(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadProfile();
  }, [token, loadProfile]);

  if (authLoading || isGuest) return null;

  if (loadingProfile) {
    return (
      <PageScroll title={t('editProfile.title')}>
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </PageScroll>
    );
  }

  if (loadError || !profile) {
    return (
      <PageScroll title={t('editProfile.title')}>
        <StatusBanner statusMessage={{ type: 'error', text: loadError || t('editProfile.genericLoadError') }} />
      </PageScroll>
    );
  }

  const headers = { headers: { Authorization: `Bearer ${token}` } };

  return (
    <PageScroll ref={scrollRef} title={t('editProfile.title')}>
      <Text style={formStyles.title}>{t('editProfile.title')}</Text>
      <Text style={formStyles.subtitle}>{t('editProfile.subtitle')}</Text>

      <AccountSection profile={profile} headers={headers} onSaved={async () => { await loadProfile(); await refreshProfile(); }} scrollRef={scrollRef} />
      <PasswordSection headers={headers} scrollRef={scrollRef} />
      <PersonalDetailsManager
        items={profile.userdetails}
        onAdd={(data) => api.post('/api/profile/userdetails', data, headers).then(loadProfile)}
        onEdit={(id, data) => api.put(`/api/profile/userdetails/${id}`, data, headers).then(loadProfile)}
        onDelete={(id) => api.delete(`/api/profile/userdetails/${id}`, headers).then(loadProfile)}
        onSetDefault={(id) => api.put(`/api/profile/userdetails/${id}/default`, {}, headers).then(loadProfile)}
        scrollRef={scrollRef}
      />

      <AddressManager
        addresses={profile.addresses}
        onAdd={(data) => api.post('/api/profile/addresses', data, headers).then(loadProfile)}
        onEdit={(id, data) => api.put(`/api/profile/addresses/${id}`, data, headers).then(loadProfile)}
        onDelete={(id) => api.delete(`/api/profile/addresses/${id}`, headers).then(loadProfile)}
        onSetDefault={(id) => api.put(`/api/profile/addresses/${id}/default`, {}, headers).then(loadProfile)}
      />

      <PhoneListManager
        title={t('editProfile.phoneNumbers')}
        icon="📞"
        items={profile.phonenumbers}
        valueKey="phonenum"
        supportsDefault
        onAdd={(val) => api.post('/api/profile/phonenumbers', { phonenum: val }, headers).then(loadProfile)}
        onEdit={(id, val) => api.put(`/api/profile/phonenumbers/${id}`, { phonenum: val }, headers).then(loadProfile)}
        onDelete={(id) => api.delete(`/api/profile/phonenumbers/${id}`, headers).then(loadProfile)}
        onSetDefault={(id) => api.put(`/api/profile/phonenumbers/${id}/default`, {}, headers).then(loadProfile)}
      />

      <PhoneListManager
        title={t('editProfile.additionalPhoneNumbers')}
        icon="📱"
        items={profile.additionalphonenumbers}
        valueKey="addphonenum"
        supportsDefault={false}
        onAdd={(val) => api.post('/api/profile/additionalphonenumbers', { addphonenum: val }, headers).then(loadProfile)}
        onEdit={(id, val) => api.put(`/api/profile/additionalphonenumbers/${id}`, { addphonenum: val }, headers).then(loadProfile)}
        onDelete={(id) => api.delete(`/api/profile/additionalphonenumbers/${id}`, headers).then(loadProfile)}
      />
    </PageScroll>
  );
}
