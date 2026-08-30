import React, { useState, useEffect, useRef } from 'react';
import { Text, TextInput, View, ActivityIndicator, Platform } from 'react-native';
import { AnimatedPressable } from '../lib/animations';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useFormStyles, Card, PageScroll, useFieldFocus } from '../lib/formPrimitives';
import { useLanguage } from '../context/LanguageContext';
import { useFontScale } from '../context/FontScaleContext';
import { isValidEmail, isValidPostalCode, splitPhoneNumber, isPrefixOnly } from '../lib/validators';
import { PRODUCT_CODES } from '../lib/pricing';

import WargaEmasBanner from '../components/order/WargaEmasBanner';
import ProductPicker from '../components/order/ProductPicker';
import PartyDetailsForm from '../components/order/PartyDetailsForm';
import MohFields from '../components/order/MohFields';
import JpmcFields from '../components/order/JpmcFields';
import PhcFields from '../components/order/PhcFields';
import LocalDeliveryFields from '../components/order/LocalDeliveryFields';
import CrossBorderFields from '../components/order/CrossBorderFields';
import ChargesAndPayment from '../components/order/ChargesAndPayment';
import Captcha from '../components/order/Captcha';
import TermsCheckbox from '../components/order/TermsCheckbox';
import OrderSummary from '../components/order/OrderSummary';

function emptyParty() {
  return { fullName: '', houseunitno: '', jalan: '', kampong: '', simpang: '', district: 'Brunei', postalcode: '', email: '', phone: '', additionalPhone: '' };
}
function emptyIdentity() {
  return { dateOfBirth: '', idType: 'IC', icNum: '', passport: '' };
}
function emptyDetails() {
  return {
    bruhimsnum: '', patientNumber: '', appointmentDistrict: 'Brunei', appointmentPlace: '', payingPatient: '',
    ldPickupOrDelivery: '', itemContains: '', ldProductType: '', ldProductWeight: '', billTo: '',
    shipmentMethod: '', parcelTrackingNum: '', supplierName: '',
    chargeCode: '', paymentMethod: '', remarks: '',
  };
}
function emptyCbslItem() {
  return { itemContains: '', quantity: '', totalItemPrice: '', screenshotInvoice: '' };
}

// Real customer address is irrelevant for Self Collect - the parcel/medicine is picked up
// here instead of delivered, so this replaces whatever address the customer would otherwise
// enter (or their saved default, for logged-in users) while Self Collect is selected.
const SELF_COLLECT_ADDRESS = {
  houseunitno: 'Unit 7, 1st Floor, Block B',
  jalan: '-',
  kampong: 'Kg Kiulap',
  simpang: '',
  district: 'Brunei',
  postalcode: 'BE1518',
};

// Flat, top-to-bottom visual order of every field the 'form' step can show,
// used by scrollToFirstError (useFieldFocus, lib/formPrimitives) to jump to
// whichever one actually has an error after a failed handleReviewOrder. Only
// one product's conditional section is ever populated with real fields at a
// time, so including every product's fields here unconditionally is safe -
// the others simply have no matching key in `errors` and are skipped over.
const PARTY_FIELD_ORDER = ['party.fullName', 'party.houseunitno', 'party.jalan', 'party.kampong', 'party.postalcode', 'party.email', 'party.phone'];
const MOH_JPMC_PHC_FIELD_ORDER = ['dateOfBirth', 'icNum', 'passport', 'payingPatient', 'appointmentDistrict', 'bruhimsnum', 'appointmentPlace', 'patientNumber'];
const LOCAL_DELIVERY_FIELD_ORDER = ['receiver.fullName', 'receiver.houseunitno', 'receiver.jalan', 'receiver.kampong', 'receiver.postalcode', 'receiver.email', 'receiver.phone', 'ldPickupOrDelivery', 'pickupDate', 'pickupAddress', 'itemContains', 'ldProductType', 'ldProductWeight', 'billTo'];
const CBSL_FIELD_ORDER = ['shipmentMethod', 'parcelTrackingNum', 'supplierName'];
const CHARGES_FIELD_ORDER = ['chargeCode', 'paymentMethod'];

function buildFieldOrder(product, cbslItemCount) {
  const order = ['product', ...PARTY_FIELD_ORDER];
  if (['MOH', 'JPMC', 'PHC'].includes(product)) order.push(...MOH_JPMC_PHC_FIELD_ORDER);
  if (product === 'Local Delivery') order.push(...LOCAL_DELIVERY_FIELD_ORDER);
  if (product === 'Cross Border Service Limbang') {
    order.push(...CBSL_FIELD_ORDER);
    for (let i = 0; i < cbslItemCount; i++) {
      order.push(`cbslItems[${i}].itemContains`, `cbslItems[${i}].quantity`, `cbslItems[${i}].totalItemPrice`, `cbslItems[${i}].screenshotInvoice`);
    }
  }
  order.push(...CHARGES_FIELD_ORDER);
  return order;
}

function hasErrors(e) {
  const flatKeys = Object.keys(e).filter((k) => k !== 'party' && k !== 'receiver' && k !== 'cbslItems');
  if (flatKeys.some((k) => e[k])) return true;
  if (e.party && Object.keys(e.party).some((k) => e.party[k])) return true;
  if (e.receiver && Object.keys(e.receiver).some((k) => e.receiver[k])) return true;
  if (e.cbslItems && e.cbslItems.some((item) => item && Object.keys(item).some((k) => item[k]))) return true;
  return false;
}

export default function Order() {
  const { user, token, isGuest, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();

  const [step, setStep] = useState('form'); // 'form' | 'summary' | 'placed'
  const [product, setProduct] = useState('');
  const [party, setParty] = useState(emptyParty());
  const [receiver, setReceiver] = useState(emptyParty());
  const [identity, setIdentity] = useState(emptyIdentity());
  const [details, setDetails] = useState(emptyDetails());
  const [cbslItems, setCbslItems] = useState([emptyCbslItem()]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const scrollRef = useRef(null);
  const { registerFieldRef, scrollToFirstError } = useFieldFocus();
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [profile, setProfile] = useState(null);

  // AuthContext's `user` (from /api/auth/me) is a flattened summary without the full
  // addresses/phonenumbers/userdetails arrays — fetch the full profile separately.
  useEffect(() => {
    if (isGuest || authLoading || !token) return;
    api.get('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setProfile(res.data))
      .catch(() => setProfile(null));
  }, [isGuest, authLoading, token]);

  const defaultAddress = profile?.addresses?.find((a) => a.isDefault);
  const defaultPhone = profile?.phonenumbers?.find((p) => p.isDefault);
  const defaultAdditionalPhone = profile?.additionalphonenumbers?.[0];
  const defaultDetails = profile?.userdetails?.find((d) => d.isDefault);
  const viewOnlyParty = !isGuest && !authLoading && !!defaultAddress;
  const viewOnlyIdentity = !isGuest && !authLoading && !!defaultDetails;
  // Whether to lock each field on the order form to a read-only display — based on whether
  // it was saved on the profile, not on the live (typed) form value, so a field that starts
  // blank doesn't suddenly lock itself the moment the user types the first character into it.
  const bruhimsSaved = viewOnlyIdentity && !!defaultDetails?.bruhimsnum;
  const patientNumberSaved = viewOnlyIdentity && !!(product === 'JPMC' ? defaultDetails?.patientjpmcnum : product === 'PHC' ? defaultDetails?.patientphcnum : false);
  const payingPatientSaved = viewOnlyIdentity && !!defaultDetails?.payingpatient;
  const appointmentDistrictSaved = viewOnlyIdentity && !!defaultDetails?.appointmentdistrict;

  useEffect(() => {
    if (!product || authLoading || !profile) return;
    setParty({
      fullName: defaultDetails?.receivername || '',
      houseunitno: defaultAddress?.houseunitno || '', jalan: defaultAddress?.jalan || '', kampong: defaultAddress?.kampong || '',
      simpang: defaultAddress?.simpang || '', district: defaultAddress?.district || 'Brunei', postalcode: defaultAddress?.postalcode || '',
      email: profile.email || '', phone: defaultPhone?.phonenum || '', additionalPhone: defaultAdditionalPhone?.addphonenum || '',
    });
    if (['MOH', 'JPMC', 'PHC'].includes(product) && defaultDetails) {
      setIdentity({
        dateOfBirth: defaultDetails.dateofbirth || '',
        idType: defaultDetails.icnum ? 'IC' : (defaultDetails.passportnum ? 'Passport' : 'IC'),
        icNum: defaultDetails.icnum || '', passport: defaultDetails.passportnum || '',
      });
      setDetails((prev) => ({
        ...prev,
        bruhimsnum: product === 'MOH' ? (defaultDetails.bruhimsnum || '') : prev.bruhimsnum,
        appointmentDistrict: product === 'MOH' ? (defaultDetails.appointmentdistrict || prev.appointmentDistrict) : prev.appointmentDistrict,
        patientNumber: product === 'JPMC' ? (defaultDetails.patientjpmcnum || '') : product === 'PHC' ? (defaultDetails.patientphcnum || '') : prev.patientNumber,
        // Saved on the profile if the user has filled it in before; otherwise stays blank
        // (emptyDetails()'s default) so the toggle just shows unselected for manual entry.
        payingPatient: defaultDetails.payingpatient || prev.payingPatient,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, profile, authLoading]);

  const handleProductChange = (value) => {
    setProduct(value);
    setDetails(emptyDetails());
    setIdentity(emptyIdentity());
    setReceiver(emptyParty());
    setCbslItems([emptyCbslItem()]);
    setErrors({});
    setStatusMessage(null);
  };

  const updateParty = (key, value) => {
    setParty((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev.party?.[key] ? { ...prev, party: { ...prev.party, [key]: undefined } } : prev));
  };
  const updateReceiver = (key, value) => {
    setReceiver((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev.receiver?.[key] ? { ...prev, receiver: { ...prev.receiver, [key]: undefined } } : prev));
  };
  const updateAny = (key, value) => {
    if (['dateOfBirth', 'idType', 'icNum', 'passport'].includes(key)) {
      setIdentity((prev) => ({ ...prev, [key]: value }));
    } else {
      setDetails((prev) => ({ ...prev, [key]: value }));
    }
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const updateCbslItem = (index, key, value) => {
    setCbslItems((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    setErrors((prev) => (prev.cbslItems?.[index]?.[key]
      ? { ...prev, cbslItems: prev.cbslItems.map((e, i) => (i === index ? { ...e, [key]: undefined } : e)) }
      : prev));
  };
  const addCbslItem = () => setCbslItems((prev) => [...prev, emptyCbslItem()]);
  const removeCbslItem = (index) => {
    setCbslItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    setErrors((prev) => (prev.cbslItems ? { ...prev, cbslItems: prev.cbslItems.filter((_, i) => i !== index) } : prev));
  };

  const pricingDistrict = product === 'Local Delivery' ? receiver.district : party.district;
  const cbslSelfCollect = product === 'Cross Border Service Limbang' && details.shipmentMethod === 'Self Collect';
  // Local Delivery has no Self Collect charge option at all - only pharmacy (via chargeCode)
  // and CBSL (via its own separate shipmentMethod field) ever reach this.
  const isSelfCollectSelected = details.chargeCode === 'Self Collect' || cbslSelfCollect;

  // Snapshot of party's address fields taken the moment Self Collect gets selected, so a
  // guest's own typed address can be restored if they switch back to another option -
  // logged-in users get their real saved default restored instead (see the effect below).
  const preSelfCollectAddressRef = useRef(null);

  useEffect(() => {
    if (isSelfCollectSelected) {
      preSelfCollectAddressRef.current = {
        houseunitno: party.houseunitno, jalan: party.jalan, kampong: party.kampong,
        simpang: party.simpang, district: party.district, postalcode: party.postalcode,
      };
      setParty((prev) => ({ ...prev, ...SELF_COLLECT_ADDRESS }));
    } else if (preSelfCollectAddressRef.current) {
      const restored = isGuest
        ? preSelfCollectAddressRef.current
        : {
            houseunitno: defaultAddress?.houseunitno || '', jalan: defaultAddress?.jalan || '', kampong: defaultAddress?.kampong || '',
            simpang: defaultAddress?.simpang || '', district: defaultAddress?.district || 'Brunei', postalcode: defaultAddress?.postalcode || '',
          };
      setParty((prev) => ({ ...prev, ...restored }));
      preSelfCollectAddressRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelfCollectSelected]);

  const validateForm = () => {
    const e = { party: {}, receiver: {} };
    if (!product) e.product = t('order.validation.selectProductRequired');

    if (!party.fullName.trim()) e.party.fullName = t('order.validation.fullNameRequired');
    if (!party.houseunitno.trim()) e.party.houseunitno = t('order.validation.required');
    if (isPrefixOnly('Jln ', party.jalan)) e.party.jalan = t('order.validation.required');
    if (isPrefixOnly('Kg ', party.kampong)) e.party.kampong = t('order.validation.required');
    if (party.postalcode && !isValidPostalCode(party.postalcode)) e.party.postalcode = t('order.validation.postalCodeInvalid');
    if (!isGuest && !party.email.trim()) e.party.email = t('order.validation.emailRequired');
    else if (party.email.trim() && !isValidEmail(party.email)) e.party.email = t('order.validation.emailInvalid');
    if (!splitPhoneNumber(party.phone).localNumber) e.party.phone = t('order.validation.phoneRequired');

    if (['MOH', 'JPMC', 'PHC'].includes(product)) {
      if (!identity.dateOfBirth) e.dateOfBirth = t('order.validation.dobRequired');
      if (identity.idType === 'IC') { if (identity.icNum.length !== 8) e.icNum = t('order.validation.icInvalid'); }
      else if (!identity.passport.trim()) e.passport = t('order.validation.passportRequired');
      if (!details.payingPatient) e.payingPatient = t('order.validation.required');
      if (product === 'MOH') {
        if (!details.appointmentDistrict) e.appointmentDistrict = t('order.validation.required');
        if (!details.bruhimsnum.trim()) e.bruhimsnum = t('order.validation.required');
        else if (details.bruhimsnum.length !== 10) e.bruhimsnum = t('identity.bruHimsInvalid');
      }
      if (product === 'JPMC' && !details.appointmentPlace) e.appointmentPlace = t('order.validation.required');
      if ((product === 'JPMC' || product === 'PHC') && !details.patientNumber.trim()) e.patientNumber = t('order.validation.required');
    }

    if (product === 'Local Delivery') {
      if (!receiver.fullName.trim()) e.receiver.fullName = t('order.validation.fullNameRequired');
      if (!receiver.houseunitno.trim()) e.receiver.houseunitno = t('order.validation.required');
      if (isPrefixOnly('Jln ', receiver.jalan)) e.receiver.jalan = t('order.validation.required');
      if (isPrefixOnly('Kg ', receiver.kampong)) e.receiver.kampong = t('order.validation.required');
      if (receiver.postalcode && !isValidPostalCode(receiver.postalcode)) e.receiver.postalcode = t('order.validation.postalCodeInvalid');
      // Receiver's email is the delivery recipient's own, not necessarily the
      // logged-in account owner's - never required, regardless of login status.
      if (receiver.email.trim() && !isValidEmail(receiver.email)) e.receiver.email = t('order.validation.emailInvalid');
      if (!splitPhoneNumber(receiver.phone).localNumber) e.receiver.phone = t('order.validation.phoneRequired');
      if (!details.ldPickupOrDelivery) e.ldPickupOrDelivery = t('order.validation.required');
      if (details.ldPickupOrDelivery === 'Pickup and Delivery') {
        if (!details.pickupDate) e.pickupDate = t('order.validation.required');
        if (!details.pickupAddress || !details.pickupAddress.trim()) e.pickupAddress = t('order.validation.required');
      }
      if (!details.itemContains.trim()) e.itemContains = t('order.validation.required');
      if (!details.ldProductType.trim()) e.ldProductType = t('order.validation.required');
      if (!details.ldProductWeight || Number(details.ldProductWeight) <= 0) e.ldProductWeight = t('order.validation.weightInvalid');
      if (!details.billTo) e.billTo = t('order.validation.required');
    }

    if (product === 'Cross Border Service Limbang') {
      if (!details.shipmentMethod) e.shipmentMethod = t('order.validation.required');
      if (!details.parcelTrackingNum.trim()) e.parcelTrackingNum = t('order.validation.required');
      if (!details.supplierName.trim()) e.supplierName = t('order.validation.required');
      e.cbslItems = cbslItems.map((item) => {
        const itemErrors = {};
        if (!item.itemContains.trim()) itemErrors.itemContains = t('order.validation.required');
        if (!item.quantity || Number(item.quantity) <= 0) itemErrors.quantity = t('order.validation.required');
        if (!item.totalItemPrice || Number(item.totalItemPrice) <= 0) itemErrors.totalItemPrice = t('order.validation.required');
        if (!item.screenshotInvoice) itemErrors.screenshotInvoice = t('order.validation.uploadRequired');
        return itemErrors;
      });
    }

    if (!cbslSelfCollect && !details.chargeCode) e.chargeCode = t('order.validation.selectChargesRequired');
    if (!details.paymentMethod) e.paymentMethod = t('order.validation.selectPaymentRequired');

    return e;
  };

  const handleReviewOrder = () => {
    const newErrors = validateForm();
    setErrors(newErrors);
    if (hasErrors(newErrors)) {
      setStatusMessage({ type: 'error', text: t('order.fixHighlighted') });
      scrollToFirstError(buildFieldOrder(product, cbslItems.length), newErrors, scrollRef);
      return;
    }
    setStatusMessage(null);
    setStep('summary');
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!agreedTerms) { setStatusMessage({ type: 'error', text: t('order.agreeTermsRequired') }); return; }
    if (!captchaAnswer.trim()) { setStatusMessage({ type: 'error', text: t('order.completeCaptcha') }); return; }

    setSubmitting(true);
    setStatusMessage(null);
    try {
      const isLD = product === 'Local Delivery';
      const payload = {
        product: PRODUCT_CODES[product],
        receiverName: isLD ? receiver.fullName : party.fullName,
        address: {
          houseunitno: isLD ? receiver.houseunitno : party.houseunitno,
          jalan: isLD ? receiver.jalan : party.jalan,
          kampong: isLD ? receiver.kampong : party.kampong,
          simpang: isLD ? receiver.simpang : party.simpang,
          district: isLD ? receiver.district : party.district,
          postalcode: isLD ? receiver.postalcode : party.postalcode,
        },
        receiverEmail: isLD ? receiver.email : party.email,
        receiverPhoneNumber: isLD ? receiver.phone : party.phone,
        additionalPhoneNumber: party.additionalPhone,
        senderName: isLD ? party.fullName : undefined,
        senderAddressDetail: isLD ? {
          houseunitno: party.houseunitno, jalan: party.jalan, kampong: party.kampong,
          simpang: party.simpang, district: party.district, postalcode: party.postalcode,
        } : undefined,
        senderEmail: isLD ? party.email : undefined,
        senderPhoneNumber: isLD ? party.phone : undefined,
        deliveryTypeCode: details.chargeCode,
        paymentMethod: details.paymentMethod,
        remarks: details.remarks,
        dateOfBirth: identity.dateOfBirth,
        icNum: identity.idType === 'IC' ? identity.icNum : undefined,
        passport: identity.idType === 'Passport' ? identity.passport : undefined,
        bruhimsnum: details.bruhimsnum,
        patientNumber: details.patientNumber,
        appointmentDistrict: details.appointmentDistrict,
        appointmentPlace: details.appointmentPlace,
        payingPatient: details.payingPatient,
        ldPickupOrDelivery: details.ldPickupOrDelivery,
        pickupDate: details.pickupDate,
        pickupAddress: details.pickupAddress,
        itemContains: details.itemContains,
        ldProductType: details.ldProductType,
        ldProductWeight: details.ldProductWeight,
        billTo: details.billTo,
        shipmentMethod: details.shipmentMethod,
        parcelTrackingNum: details.parcelTrackingNum,
        supplierName: details.supplierName,
        items: product === 'Cross Border Service Limbang'
          ? cbslItems.map((item) => ({
              description: item.itemContains,
              quantity: item.quantity,
              totalItemPrice: item.totalItemPrice,
              screenshotInvoice: item.screenshotInvoice,
            }))
          : undefined,
        agreedTerms,
        captchaToken,
        captchaAnswer,
        orderOrigin: Platform.OS === 'web' ? 'Website' : 'Phone',
      };

      const response = await api.post('/api/orders', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setPlacedOrder({ orderId: response.data.orderId, trackingNumber: null, status: response.data.status, totalPrice: response.data.totalPrice });
      setStep('placed');
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.response?.data?.error || t('order.genericSubmitError') });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step !== 'placed' || !placedOrder?.orderId || placedOrder.trackingNumber) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const res = await api.get(`/api/orders/status/${placedOrder.orderId}`);
        if (res.data.trackingNumber) {
          setPlacedOrder((prev) => ({ ...prev, trackingNumber: res.data.trackingNumber, status: res.data.status }));
          clearInterval(interval);
        }
      } catch (err) {
        // keep polling silently
      }
      if (attempts >= 13) clearInterval(interval);
    }, 1500);
    return () => clearInterval(interval);
  }, [step, placedOrder?.orderId, placedOrder?.trackingNumber]);

  const handleNewOrder = () => {
    setStep('form');
    setProduct('');
    setParty(emptyParty());
    setReceiver(emptyParty());
    setIdentity(emptyIdentity());
    setDetails(emptyDetails());
    setCbslItems([emptyCbslItem()]);
    setAgreedTerms(false);
    setCaptchaToken('');
    setCaptchaAnswer('');
    setErrors({});
    setStatusMessage(null);
    setPlacedOrder(null);
  };

  if (step === 'placed') {
    return (
      <PageScroll title={t('order.orderPlaced')}>
        <Card icon="✅" title={t('order.orderPlaced')}>
          <Text style={{ fontSize: scaleFont(14), color: formStyles.subtitle.color, marginBottom: 10 }}>
            {t('order.saveTrackingNumber')}
          </Text>
          <View style={[formStyles.statusBanner, formStyles.statusSuccess, { alignItems: 'center' }]}>
            {placedOrder.trackingNumber ? (
              <Text style={{ fontSize: scaleFont(22), fontWeight: 'bold', color: formStyles.statusTextSuccess.color, letterSpacing: 1 }}>
                {placedOrder.trackingNumber}
              </Text>
            ) : (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator color={formStyles.statusTextSuccess.color} style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: scaleFont(13), color: formStyles.statusTextSuccess.color }}>{t('order.generatingTracking')}</Text>
              </View>
            )}
          </View>
          <AnimatedPressable scaleTo={1.03} style={formStyles.buttonAccent} onPress={handleNewOrder}>
            <Text style={formStyles.buttonText}>{t('order.placeAnotherOrder')}</Text>
          </AnimatedPressable>
        </Card>
      </PageScroll>
    );
  }

  return (
    <PageScroll ref={scrollRef} title={t('nav.orderNow')} scrollToTopKey={step}>
      <Text style={formStyles.title}>{t('order.title')}</Text>
      <Text style={formStyles.subtitle}>
        {isGuest ? t('order.subtitleGuest') : t('order.subtitleLoggedIn')}
      </Text>

      {statusMessage && (
        <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
          <Text style={formStyles.statusTextError}>⚠️  {statusMessage.text}</Text>
        </View>
      )}

      {step === 'form' && (
        <>
          <WargaEmasBanner />
          <ProductPicker product={product} onChange={handleProductChange} />

          {product && (
            <>
              <PartyDetailsForm
                title={product === 'Local Delivery' ? t('order.senderDetails') : t('order.yourDetails')}
                values={party}
                onChange={updateParty}
                errors={errors.party}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                viewOnly={viewOnlyParty}
                showAdditionalPhone
                isGuest={isGuest}
                addressLocked={isSelfCollectSelected}
                fieldKeyPrefix="party."
                registerFieldRef={registerFieldRef}
              />

              {product === 'MOH' && (
                <MohFields values={{ ...identity, ...details }} onChange={updateAny} errors={errors} focusedField={focusedField} setFocusedField={setFocusedField} viewOnlyIdentity={viewOnlyIdentity} bruhimsSaved={bruhimsSaved} payingPatientSaved={payingPatientSaved} appointmentDistrictSaved={appointmentDistrictSaved} registerFieldRef={registerFieldRef} />
              )}
              {product === 'JPMC' && (
                <JpmcFields values={{ ...identity, ...details }} onChange={updateAny} errors={errors} focusedField={focusedField} setFocusedField={setFocusedField} viewOnlyIdentity={viewOnlyIdentity} patientNumberSaved={patientNumberSaved} payingPatientSaved={payingPatientSaved} registerFieldRef={registerFieldRef} />
              )}
              {product === 'PHC' && (
                <PhcFields values={{ ...identity, ...details }} onChange={updateAny} errors={errors} focusedField={focusedField} setFocusedField={setFocusedField} viewOnlyIdentity={viewOnlyIdentity} patientNumberSaved={patientNumberSaved} payingPatientSaved={payingPatientSaved} registerFieldRef={registerFieldRef} />
              )}
              {product === 'Local Delivery' && (
                <LocalDeliveryFields
                  values={details} onChange={updateAny} errors={errors} focusedField={focusedField} setFocusedField={setFocusedField}
                  receiverValues={receiver} onReceiverChange={updateReceiver} receiverErrors={errors.receiver}
                  isGuest={isGuest}
                  registerFieldRef={registerFieldRef}
                />
              )}
              {product === 'Cross Border Service Limbang' && (
                <CrossBorderFields
                  values={details} onChange={updateAny} errors={errors} focusedField={focusedField} setFocusedField={setFocusedField}
                  items={cbslItems} itemErrors={errors.cbslItems || []}
                  onItemChange={updateCbslItem} onAddItem={addCbslItem} onRemoveItem={removeCbslItem}
                  registerFieldRef={registerFieldRef}
                />
              )}

              <ChargesAndPayment
                product={product}
                district={pricingDistrict}
                weightKg={details.ldProductWeight}
                chargeCode={details.chargeCode}
                onChargeCodeChange={(v) => updateAny('chargeCode', v)}
                paymentMethod={details.paymentMethod}
                onPaymentMethodChange={(v) => updateAny('paymentMethod', v)}
                remarks={details.remarks}
                onRemarksChange={(v) => updateAny('remarks', v)}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
                errors={errors}
                noChargeRequired={cbslSelfCollect}
                registerFieldRef={registerFieldRef}
              />

              <AnimatedPressable scaleTo={1.03} style={formStyles.buttonAccent} onPress={handleReviewOrder}>
                <Text style={formStyles.buttonText}>{t('order.reviewOrder')}</Text>
              </AnimatedPressable>
            </>
          )}
        </>
      )}

      {step === 'summary' && (
        <>
          <OrderSummary form={{ product, party, receiver, identity, cbslItems, ...details, pricingDistrict }} />

          <TermsCheckbox agreed={agreedTerms} onToggle={() => setAgreedTerms((v) => !v)} />
          <Captcha
            answer={captchaAnswer}
            onAnswerChange={setCaptchaAnswer}
            onTokenChange={setCaptchaToken}
            focusedField={focusedField}
            setFocusedField={setFocusedField}
          />

          <AnimatedPressable
            scaleTo={1.03}
            style={[formStyles.buttonAccent, (submitting || !agreedTerms || !captchaAnswer.trim()) && formStyles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !agreedTerms || !captchaAnswer.trim()}
          >
            {submitting ? (
              <View style={formStyles.buttonRow}>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text style={formStyles.buttonText}>{t('order.placingOrder')}</Text>
              </View>
            ) : (
              <Text style={formStyles.buttonText}>{t('order.submitOrder')}</Text>
            )}
          </AnimatedPressable>

          <AnimatedPressable scaleTo={1.03} style={{ marginTop: 14, alignItems: 'center' }} onPress={() => setStep('form')} disabled={submitting}>
            <Text style={{ color: formStyles.subtitle.color, fontSize: scaleFont(13) }}>{t('order.backToEdit')}</Text>
          </AnimatedPressable>
        </>
      )}
    </PageScroll>
  );
}
