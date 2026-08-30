import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator, Image } from 'react-native';
import { AnimatedPressable } from '../lib/animations';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { PageScroll, useFormStyles, Card, useFieldFocus } from '../lib/formPrimitives';
import { isValidEmail, isValidPostalCode, splitPhoneNumber } from '../lib/validators';
import { getApplicationTypeConfig } from '../lib/careersOptions';
import VacancyList from '../components/careers/VacancyList';
import PersonalDetailsFields from '../components/careers/PersonalDetailsFields';
import PositionDetailsFields from '../components/careers/PositionDetailsFields';
import DocumentUploads from '../components/careers/DocumentUploads';
import ApplicationSummary from '../components/careers/ApplicationSummary';

// Flat, top-to-bottom visual order of every field the 'form' step can show,
// used by scrollToFirstError (useFieldFocus, lib/formPrimitives) to jump to
// whichever one actually has an error after a failed handleReview. Fields
// gated by the vacancy's applicationType config (partTimeDuration, carOwn,
// etc.) simply have no matching key in `errors` when not applicable, so
// including all of them unconditionally is safe.
const FIELD_ORDER = [
  'name', 'dateofbirth', 'icnumber', 'houseunitno', 'jalan', 'kampong', 'postalcode', 'email', 'phonenum',
  'highestAchievement', 'partTimeDuration', 'carOwn', 'deliverBefore', 'experienceDelivery', 'parcelNum', 'driveManual',
  'icFront', 'resumeCv', 'drivingLicenseFront', 'drivingLicenseBack',
];

function emptyPersonal() {
  return {
    name: '', dateofbirth: '', icnumber: '',
    houseunitno: '', jalan: '', kampong: '', simpang: '', district: 'Brunei', postalcode: '',
    email: '', phonenum: '', addphonenum: '',
  };
}
function emptyApplication() {
  return { highestAchievement: 'None', partTimeDuration: '', carOwn: '', deliverBefore: '', experienceDelivery: '', parcelNum: '', driveManual: '' };
}
function emptyFiles() {
  return { icFront: '', resumeCv: '', resumeCvName: '', drivingLicenseFront: '', drivingLicenseBack: '' };
}

export default function Careers() {
  const { token, isGuest, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();

  const [step, setStep] = useState('list'); // 'list' | 'form' | 'summary' | 'submitted'
  const [vacancy, setVacancy] = useState(null);
  const [personal, setPersonal] = useState(emptyPersonal());
  const [application, setApplication] = useState(emptyApplication());
  const [files, setFiles] = useState(emptyFiles());
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [applicantName, setApplicantName] = useState('');
  const [profile, setProfile] = useState(null);
  const scrollRef = React.useRef(null);
  const { registerFieldRef, scrollToFirstError } = useFieldFocus();

  // AuthContext's `user` is a flattened summary — fetch the full profile separately, same
  // as order.js, so personal details can be pre-filled (and locked) from the saved profile.
  useEffect(() => {
    if (isGuest || authLoading || !token) return;
    api.get('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null));
  }, [isGuest, authLoading, token]);

  const defaultAddress = profile?.addresses?.find((a) => a.isDefault) || profile?.addresses?.[0];
  const defaultPhone = profile?.phonenumbers?.find((p) => p.isDefault) || profile?.phonenumbers?.[0];
  const defaultAdditionalPhone = profile?.additionalphonenumbers?.[0];
  const defaultDetails = profile?.userdetails?.find((d) => d.isDefault) || profile?.userdetails?.[0];
  // Mirrors order.js's PartyDetailsForm: once a logged-in user has a saved address, their
  // personal details are locked to what's on the profile, with a link to Edit Profile —
  // rather than editable-but-prefilled — so the application can't drift from the account.
  const viewOnlyPersonal = !isGuest && !authLoading && !!defaultAddress;

  useEffect(() => {
    if (isGuest || authLoading || !profile) return;
    setPersonal((prev) => ({
      ...prev,
      name: defaultDetails?.receivername || prev.name,
      dateofbirth: defaultDetails?.dateofbirth || prev.dateofbirth,
      icnumber: defaultDetails?.icnum || prev.icnumber,
      houseunitno: defaultAddress?.houseunitno || prev.houseunitno,
      jalan: defaultAddress?.jalan || prev.jalan,
      kampong: defaultAddress?.kampong || prev.kampong,
      simpang: defaultAddress?.simpang || prev.simpang,
      district: defaultAddress?.district || prev.district,
      postalcode: defaultAddress?.postalcode || prev.postalcode,
      email: profile.email || prev.email,
      phonenum: defaultPhone?.phonenum || prev.phonenum,
      addphonenum: defaultAdditionalPhone?.addphonenum || prev.addphonenum,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, authLoading, profile]);

  const updatePersonal = (key, value) => {
    setPersonal((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };
  const updateApplication = (key, value) => {
    setApplication((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };
  const updateFile = (key, value) => {
    setFiles((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleApply = (v) => {
    setVacancy(v);
    setApplication(emptyApplication());
    setFiles(emptyFiles());
    setErrors({});
    setStatusMessage(null);
    setStep('form');
  };

  const handleCancel = () => {
    setStep('list');
    setVacancy(null);
  };

  const validate = () => {
    const e = {};
    if (!personal.name.trim()) e.name = t('careers.validation.nameRequired');
    if (!personal.dateofbirth) e.dateofbirth = t('order.validation.dobRequired');
    if (personal.icnumber.length !== 8) e.icnumber = t('order.validation.icInvalid');
    if (!personal.houseunitno.trim()) e.houseunitno = t('order.validation.required');
    if (!personal.jalan.trim()) e.jalan = t('order.validation.required');
    if (!personal.kampong.trim()) e.kampong = t('order.validation.required');
    if (personal.postalcode && !isValidPostalCode(personal.postalcode)) e.postalcode = t('order.validation.postalCodeInvalid');
    if (!isGuest && !personal.email.trim()) e.email = t('order.validation.emailRequired');
    else if (personal.email.trim() && !isValidEmail(personal.email)) e.email = t('order.validation.emailInvalid');
    if (!splitPhoneNumber(personal.phonenum).localNumber) e.phonenum = t('order.validation.phoneRequired');

    if (!application.highestAchievement) e.highestAchievement = t('order.validation.required');

    const config = getApplicationTypeConfig(vacancy.applicationType);
    if (config.needsPartTime && !application.partTimeDuration) e.partTimeDuration = t('order.validation.required');
    if (config.needsCarOwn && !application.carOwn) e.carOwn = t('order.validation.required');
    if (config.needsDeliverBefore && !application.deliverBefore) e.deliverBefore = t('order.validation.required');
    if (config.needsDeliverBefore && application.deliverBefore === 'Yes') {
      if (!application.experienceDelivery) e.experienceDelivery = t('order.validation.required');
      if (!application.parcelNum) e.parcelNum = t('order.validation.required');
    }
    if (config.needsDriveManual && !application.driveManual) e.driveManual = t('order.validation.required');

    if (!files.icFront) e.icFront = t('careers.validation.icFrontRequired');
    if (!files.resumeCv) e.resumeCv = t('careers.validation.resumeRequired');
    if (config.needsLicense) {
      if (!files.drivingLicenseFront) e.drivingLicenseFront = t('careers.validation.licenseFrontRequired');
      if (!files.drivingLicenseBack) e.drivingLicenseBack = t('careers.validation.licenseBackRequired');
    }

    return e;
  };

  const handleReview = () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      setStatusMessage({ type: 'error', text: t('order.fixHighlighted') });
      scrollToFirstError(FIELD_ORDER, newErrors, scrollRef);
      return;
    }
    setStatusMessage(null);
    setStep('summary');
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!ack) { setStatusMessage({ type: 'error', text: t('careers.acknowledgeRequired') }); return; }

    setSubmitting(true);
    setStatusMessage(null);
    try {
      await api.post('/api/careers/apply', {
        vacancyId: vacancy._id,
        ...personal,
        ...application,
        icFront: files.icFront,
        resumeCv: files.resumeCv,
        drivingLicenseFront: files.drivingLicenseFront,
        drivingLicenseBack: files.drivingLicenseBack,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setApplicantName(personal.name);
      setStep('submitted');
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.response?.data?.error || t('careers.genericSubmitError') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyAnother = () => {
    setStep('list');
    setVacancy(null);
    setApplication(emptyApplication());
    setFiles(emptyFiles());
    setAck(false);
    setErrors({});
    setStatusMessage(null);
  };

  if (step === 'submitted') {
    return (
      <PageScroll ref={scrollRef} title={t('nav.careers')}>
        <Card icon="✅" title={t('careers.thankYou').replace('${name}', applicantName)}>
          <Text style={[formStyles.bodyText, { marginBottom: 16 }]}>{t('careers.submittedBody')}</Text>
          <AnimatedPressable style={formStyles.buttonAccent} onPress={handleApplyAnother} scaleTo={1.04}>
            <Text style={formStyles.buttonText}>{t('careers.backToVacancies')}</Text>
          </AnimatedPressable>
        </Card>
      </PageScroll>
    );
  }

  return (
    <PageScroll ref={scrollRef} title={t('nav.careers')}>
      <Text style={formStyles.title}>{t('careers.title')}</Text>
      <Text style={formStyles.subtitle}>
        {step === 'list' ? t('careers.subtitle') : t('careers.applyingFor').replace('${title}', vacancy.title)}
      </Text>

      {statusMessage && (
        <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
          <Text style={formStyles.statusTextError}>⚠️  {statusMessage.text}</Text>
        </View>
      )}

      {step === 'list' && (
        <>
          <VacancyList onApply={handleApply} />
          <Image
            source={require('../assets/careers-hero.jpg')}
            style={{ width: '100%', height: 620, borderRadius: 16, marginTop: 4 }}
            resizeMode="cover"
          />
        </>
      )}

      {step === 'form' && vacancy && (
        <>
          <PersonalDetailsFields values={personal} onChange={updatePersonal} errors={errors} focusedField={focusedField} setFocusedField={setFocusedField} viewOnly={viewOnlyPersonal} isGuest={isGuest} registerFieldRef={registerFieldRef} />
          <PositionDetailsFields vacancy={vacancy} values={application} onChange={updateApplication} errors={errors} registerFieldRef={registerFieldRef} />
          <DocumentUploads vacancy={vacancy} values={files} onChange={updateFile} errors={errors} registerFieldRef={registerFieldRef} />

          <AnimatedPressable style={formStyles.buttonAccent} onPress={handleReview} scaleTo={1.04}>
            <Text style={formStyles.buttonText}>{t('careers.reviewApplication')}</Text>
          </AnimatedPressable>
          <AnimatedPressable style={{ marginTop: 14, alignItems: 'center' }} onPress={handleCancel} scaleTo={1.03}>
            <Text style={{ color: formStyles.subtitle.color, fontSize: scaleFont(13) }}>{t('careers.cancelApplication')}</Text>
          </AnimatedPressable>
        </>
      )}

      {step === 'summary' && vacancy && (
        <>
          <ApplicationSummary vacancy={vacancy} personal={personal} application={application} files={files} />

          <Card icon="📜" title={t('careers.acknowledgement')}>
            <AnimatedPressable style={[formStyles.checkboxFake, ack && formStyles.checkboxActive]} onPress={() => setAck((v) => !v)} scaleTo={1.05}>
              <Text style={formStyles.checkboxText}>{ack ? t('careers.acknowledged') : t('careers.tapAcknowledge')}</Text>
            </AnimatedPressable>
          </Card>

          <AnimatedPressable
            style={[formStyles.buttonAccent, (submitting || !ack) && formStyles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !ack}
            scaleTo={1.04}
          >
            {submitting ? (
              <View style={formStyles.buttonRow}>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text style={formStyles.buttonText}>{t('careers.submitting')}</Text>
              </View>
            ) : (
              <Text style={formStyles.buttonText}>{t('careers.agreeAndSubmit')}</Text>
            )}
          </AnimatedPressable>
          <AnimatedPressable style={{ marginTop: 14, alignItems: 'center' }} onPress={() => setStep('form')} disabled={submitting} scaleTo={1.03}>
            <Text style={{ color: formStyles.subtitle.color, fontSize: scaleFont(13) }}>{t('order.backToEdit')}</Text>
          </AnimatedPressable>
        </>
      )}
    </PageScroll>
  );
}
