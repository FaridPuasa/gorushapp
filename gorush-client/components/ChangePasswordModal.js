// Change Password as a popup, for roles (partners: pdu/mglobal/ewe) that
// have no use for a full Edit Profile page - old/new/confirm fields with
// Cancel/Change Password buttons, same shape as grfmxstatusupdate's navbar
// change-password modal. Posts straight to the same PUT /api/profile/password
// route edit-profile.js's PasswordSection already uses.
import React, { useState } from 'react';
import { Text, TextInput, View, Modal, Pressable, ActivityIndicator } from 'react-native';
import { api } from '../lib/api';
import { useFormStyles } from '../lib/formPrimitives';
import { useTheme } from '../context/ThemeContext';
import { useFontScale } from '../context/FontScaleContext';
import { AnimatedPressable } from '../lib/animations';

export default function ChangePasswordModal({ visible, onClose, token }) {
  const formStyles = useFormStyles();
  const { colors } = useTheme();
  const { scaleFont } = useFontScale();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/api/profile/password', { currentPassword, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(true);
      setTimeout(close, 1200);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }} onPress={close}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}>
          <Text style={{ fontSize: scaleFont(18), fontWeight: '700', color: colors.textPrimary, marginBottom: 16 }}>Change Password</Text>

          <Text style={{ fontSize: scaleFont(12), fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Old Password</Text>
          <TextInput style={[formStyles.input, { marginBottom: 12 }]} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />

          <Text style={{ fontSize: scaleFont(12), fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>New Password</Text>
          <TextInput style={[formStyles.input, { marginBottom: 12 }]} secureTextEntry value={newPassword} onChangeText={setNewPassword} />

          <Text style={{ fontSize: scaleFont(12), fontWeight: '600', color: colors.textMuted, marginBottom: 4 }}>Confirm New Password</Text>
          <TextInput style={[formStyles.input, { marginBottom: 12 }]} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

          {error ? <Text style={[formStyles.fieldError, { marginBottom: 8 }]}>{error}</Text> : null}
          {success ? <Text style={{ color: colors.success, fontWeight: '600', marginBottom: 8 }}>Password changed.</Text> : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { flex: 1, backgroundColor: colors.subtleBackground }]} onPress={close} disabled={saving}>
              <Text style={[formStyles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
            </AnimatedPressable>
            <AnimatedPressable scaleTo={1.03} style={[formStyles.button, { flex: 1 }, saving && formStyles.buttonDisabled]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={formStyles.buttonText}>Change Password</Text>}
            </AnimatedPressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
