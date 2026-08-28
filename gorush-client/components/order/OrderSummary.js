import React from 'react';
import { Text, View } from 'react-native';
import { useFormStyles, Card } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { useFontScale } from '../../context/FontScaleContext';
import { getChargeOptions, formatChargeLabel, computeTotalPrice, formatPrice, usePricingRules } from '../../lib/pricing';

const PRODUCT_LABEL_KEYS = {
  MOH: 'order.productMoh',
  JPMC: 'order.productJpmc',
  PHC: 'order.productPhc',
  'Local Delivery': 'order.productLocalDelivery',
  'Cross Border Service Limbang': 'order.productCrossBorder',
};

function Row({ label, value }) {
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
      <Text style={{ fontSize: scaleFont(13), color: formStyles.subtitle.color, width: 160 }}>{label}</Text>
      <Text style={{ fontSize: scaleFont(13), color: formStyles.fieldLabel.color, fontWeight: '600', flex: 1 }}>{value}</Text>
    </View>
  );
}

function formatAddress(a) {
  if (!a?.district) return '';
  return `${a.houseunitno}, ${a.jalan}, ${a.kampong}${a.simpang ? `, ${a.simpang}` : ''}, ${a.district}, ${a.postalcode}`;
}

export default function OrderSummary({ form }) {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const { scaleFont } = useFontScale();
  const { product, party, receiver, identity } = form;
  const pricingRules = usePricingRules();
  const options = getChargeOptions(pricingRules, product, form.pricingDistrict);
  const selected = options.find((o) => o.code === form.chargeCode);
  const total = selected ? computeTotalPrice(product, selected.price, form.ldProductWeight) : null;

  return (
    <>
      <Card icon="🚚" title={t('order.summary.product')}>
        <Row label={t('order.summary.product')} value={product ? t(PRODUCT_LABEL_KEYS[product]) : ''} />
      </Card>

      <Card icon="📇" title={product === 'Local Delivery' ? t('order.senderDetails') : t('order.yourDetails')}>
        <Row label={t('order.summary.fullName')} value={party.fullName} />
        <Row label={t('order.summary.address')} value={formatAddress(party)} />
        <Row label={t('order.summary.email')} value={party.email} />
        <Row label={t('order.summary.phoneNumber')} value={party.phone} />
        <Row label={t('order.summary.additionalPhone')} value={party.additionalPhone} />
      </Card>

      {['MOH', 'JPMC', 'PHC'].includes(product) && (
        <Card icon="🪪" title={t('order.patientDetails')}>
          {product === 'MOH' && <Row label={t('order.summary.bruHimsNo')} value={form.bruhimsnum} />}
          {(product === 'JPMC' || product === 'PHC') && <Row label={t('order.summary.patientNo')} value={form.patientNumber} />}
          <Row label={t('order.summary.dateOfBirth')} value={identity.dateOfBirth} />
          <Row label={identity.idType === 'IC' ? t('order.summary.icNo') : t('order.summary.passport')} value={identity.idType === 'IC' ? identity.icNum : identity.passport} />
          {product === 'MOH' && <Row label={t('order.summary.appointmentDistrict')} value={form.appointmentDistrict} />}
          {product === 'JPMC' && <Row label={t('order.summary.jpmcOrPjsc')} value={form.appointmentPlace} />}
          <Row label={t('order.summary.payingPatient')} value={form.payingPatient} />
        </Card>
      )}

      {product === 'Local Delivery' && (
        <>
          <Card icon="📦" title={t('order.localDeliveryDetails')}>
            <Row label={t('order.summary.pickupOrDelivery')} value={form.ldPickupOrDelivery} />
            {form.ldPickupOrDelivery === 'Pickup and Delivery' && (
              <>
                <Row label={t('order.summary.pickupDate')} value={form.pickupDate} />
                <Row label={t('order.summary.pickupAddress')} value={form.pickupAddress} />
              </>
            )}
            <Row label={t('order.summary.productDescription')} value={form.itemContains} />
            <Row label={t('order.summary.productType')} value={form.ldProductType} />
            <Row label={t('order.summary.productWeight')} value={form.ldProductWeight} />
          </Card>
          <Card icon="📍" title={t('order.receiverDetails')}>
            <Row label={t('order.summary.fullName')} value={receiver.fullName} />
            <Row label={t('order.summary.address')} value={formatAddress(receiver)} />
            <Row label={t('order.summary.email')} value={receiver.email} />
            <Row label={t('order.summary.phoneNumber')} value={receiver.phone} />
          </Card>
          <Card icon="💳" title={t('order.billTo')}>
            <Row label={t('order.summary.billTo')} value={form.billTo} />
          </Card>
        </>
      )}

      {product === 'Cross Border Service Limbang' && (
        <>
          <Card icon="🌏" title={t('order.crossBorderDetails')}>
            <Row label={t('order.summary.deliveryOrSelfCollect')} value={form.shipmentMethod} />
            <Row label={t('order.summary.originalTrackingNo')} value={form.parcelTrackingNum} />
            <Row label={t('order.summary.courier')} value={form.supplierName} />
          </Card>
          {(form.cbslItems || []).map((item, index) => (
            <Card key={index} icon="📦" title={t('order.itemNumber').replace('${number}', index + 1)}>
              <Row label={t('order.summary.itemDescription')} value={item.itemContains} />
              <Row label={t('order.summary.quantity')} value={item.quantity} />
              <Row label={t('order.summary.totalItemPrice')} value={item.totalItemPrice} />
              <Row label={t('order.summary.invoiceUploaded')} value={item.screenshotInvoice ? t('common.yes') : t('common.no')} />
            </Card>
          ))}
          <Card icon="🧮" title={t('order.itemsPriceTotal')}>
            <Text style={{ fontSize: scaleFont(20), fontWeight: 'bold', color: formStyles.statusTextSuccess.color }}>
              RM {(form.cbslItems || []).reduce((sum, item) => sum + (Number(item.totalItemPrice) || 0), 0).toFixed(2)}
            </Text>
          </Card>
        </>
      )}

      <Card icon="💰" title={t('order.chargesAndPayment')}>
        <Row label={t('order.summary.charges')} value={selected ? formatChargeLabel(selected) : ''} />
        <Row label={t('order.summary.paymentMethod')} value={form.paymentMethod} />
        <Row label={t('order.summary.remarks')} value={form.remarks} />
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: scaleFont(13), color: formStyles.subtitle.color, marginBottom: 4 }}>{t('order.summary.totalPrice')}</Text>
          <Text style={{ fontSize: scaleFont(20), fontWeight: 'bold', color: formStyles.statusTextSuccess.color }}>{total != null ? formatPrice(total) : '—'}</Text>
        </View>
      </Card>
    </>
  );
}
