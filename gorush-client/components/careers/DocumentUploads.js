import React, { useState } from 'react';
import { Text, View, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFormStyles, Card, Field } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { getApplicationTypeConfig } from '../../lib/careersOptions';
import { AnimatedPressable } from '../../lib/animations';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/*',
];

// expo-document-picker only returns base64 content directly on web (via its `base64`
// option) — on native it only gives a file `uri`, which has to be read separately
// through expo-file-system's File class. See AGENTS.md: this SDK's file APIs changed
// recently, so this mirrors the current (SDK 54) documented approach rather than the
// deprecated expo-file-system/legacy readAsStringAsync.
async function readNativeDocumentAsBase64(asset) {
  const { File } = await import('expo-file-system');
  const file = new File(asset.uri);
  const base64 = await file.base64();
  return `data:${asset.mimeType || 'application/octet-stream'};base64,${base64}`;
}

export default function DocumentUploads({ vacancy, values, onChange, errors = {}, registerFieldRef }) {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const config = getApplicationTypeConfig(vacancy.applicationType);
  const [resumeError, setResumeError] = useState('');

  const pickImage = async (field) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.5 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      onChange(field, `data:${mime};base64,${asset.base64}`);
    }
  };

  const pickResume = async () => {
    setResumeError('');
    const result = await DocumentPicker.getDocumentAsync({ type: RESUME_MIME_TYPES, base64: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_FILE_BYTES) {
      setResumeError(t('careers.fileTooLarge'));
      return;
    }
    const dataUri = asset.base64
      ? `data:${asset.mimeType || 'application/octet-stream'};base64,${asset.base64}`
      : await readNativeDocumentAsBase64(asset);
    onChange('resumeCv', dataUri);
    onChange('resumeCvName', asset.name);
  };

  return (
    <Card icon="📎" title={t('careers.documents')}>
      <Field label={t('careers.uploadIcFront')} required error={errors.icFront} fieldKey="icFront" registerRef={registerFieldRef}>
        {values.icFront ? (
          <Image source={{ uri: values.icFront }} style={{ width: 160, height: 100, borderRadius: 8, marginBottom: 10 }} resizeMode="cover" />
        ) : null}
        <AnimatedPressable scaleTo={1.04} style={formStyles.button} onPress={() => pickImage('icFront')}>
          <Text style={formStyles.buttonText}>{values.icFront ? t('order.changeImage') : t('order.chooseImage')}</Text>
        </AnimatedPressable>
      </Field>

      <Field label={t('careers.uploadResume')} required error={errors.resumeCv || resumeError} hint={t('careers.uploadResumeHint')} fieldKey="resumeCv" registerRef={registerFieldRef}>
        {values.resumeCvName ? <Text style={[formStyles.bodyText, { marginBottom: 10 }]}>📄 {values.resumeCvName}</Text> : null}
        <AnimatedPressable scaleTo={1.04} style={formStyles.button} onPress={pickResume}>
          <Text style={formStyles.buttonText}>{values.resumeCv ? t('careers.changeFile') : t('careers.chooseFile')}</Text>
        </AnimatedPressable>
      </Field>

      {config.needsLicense && (
        <>
          <Field label={t('careers.uploadLicenseFront')} required error={errors.drivingLicenseFront} fieldKey="drivingLicenseFront" registerRef={registerFieldRef}>
            {values.drivingLicenseFront ? (
              <Image source={{ uri: values.drivingLicenseFront }} style={{ width: 160, height: 100, borderRadius: 8, marginBottom: 10 }} resizeMode="cover" />
            ) : null}
            <AnimatedPressable scaleTo={1.04} style={formStyles.button} onPress={() => pickImage('drivingLicenseFront')}>
              <Text style={formStyles.buttonText}>{values.drivingLicenseFront ? t('order.changeImage') : t('order.chooseImage')}</Text>
            </AnimatedPressable>
          </Field>

          <Field label={t('careers.uploadLicenseBack')} required error={errors.drivingLicenseBack} fieldKey="drivingLicenseBack" registerRef={registerFieldRef}>
            {values.drivingLicenseBack ? (
              <Image source={{ uri: values.drivingLicenseBack }} style={{ width: 160, height: 100, borderRadius: 8, marginBottom: 10 }} resizeMode="cover" />
            ) : null}
            <AnimatedPressable scaleTo={1.04} style={formStyles.button} onPress={() => pickImage('drivingLicenseBack')}>
              <Text style={formStyles.buttonText}>{values.drivingLicenseBack ? t('order.changeImage') : t('order.chooseImage')}</Text>
            </AnimatedPressable>
          </Field>
        </>
      )}
    </Card>
  );
}
