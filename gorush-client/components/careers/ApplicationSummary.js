import React from 'react';
import { Text, View } from 'react-native';
import { useFormStyles, Card } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { getApplicationTypeConfig } from '../../lib/careersOptions';

function Row({ label, value }) {
  const formStyles = useFormStyles();
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
      <Text style={{ fontSize: 13, color: formStyles.subtitle.color, width: 160 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: formStyles.fieldLabel.color, fontWeight: '600', flex: 1 }}>{value}</Text>
    </View>
  );
}

export default function ApplicationSummary({ vacancy, personal, application, files }) {
  const { t } = useLanguage();
  const config = getApplicationTypeConfig(vacancy.applicationType);
  const address = `${personal.houseunitno}, ${personal.jalan}, ${personal.kampong}${personal.simpang ? `, ${personal.simpang}` : ''}, ${personal.district}, ${personal.postalcode}`;

  return (
    <>
      <Card icon="🪪" title={t('careers.personalDetails')}>
        <Row label={t('contact.fullName')} value={personal.name} />
        <Row label={t('identity.dateOfBirth')} value={personal.dateofbirth} />
        <Row label={t('identity.icNumber')} value={personal.icnumber} />
        <Row label={t('order.summary.address')} value={address} />
        <Row label={t('contact.email')} value={personal.email} />
        <Row label={t('contact.phoneNumber')} value={personal.phonenum} />
        <Row label={t('contact.additionalPhoneNumber')} value={personal.addphonenum} />
      </Card>

      <Card icon="📋" title={t('careers.applicationDetails')}>
        <Row label={t('careers.positionApplied')} value={vacancy.title} />
        <Row label={t('careers.highestAchievement')} value={application.highestAchievement} />
        {config.needsPartTime && <Row label={t('careers.partTimeDuration')} value={application.partTimeDuration} />}
        {config.needsCarOwn && <Row label={t('careers.carOwn')} value={application.carOwn} />}
        {config.needsDeliverBefore && <Row label={t('careers.deliverBefore')} value={application.deliverBefore} />}
        {config.needsDeliverBefore && application.deliverBefore === 'Yes' && (
          <>
            <Row label={t('careers.experienceDelivery')} value={application.experienceDelivery} />
            <Row label={t('careers.parcelNum')} value={application.parcelNum} />
          </>
        )}
        {config.needsDriveManual && <Row label={t('careers.driveManual')} value={application.driveManual} />}
      </Card>

      <Card icon="📎" title={t('careers.documents')}>
        <Row label={t('careers.uploadIcFront')} value={files.icFront ? t('common.yes') : t('common.no')} />
        <Row label={t('careers.uploadResume')} value={files.resumeCvName || (files.resumeCv ? t('common.yes') : t('common.no'))} />
        {config.needsLicense && (
          <>
            <Row label={t('careers.uploadLicenseFront')} value={files.drivingLicenseFront ? t('common.yes') : t('common.no')} />
            <Row label={t('careers.uploadLicenseBack')} value={files.drivingLicenseBack ? t('common.yes') : t('common.no')} />
          </>
        )}
      </Card>
    </>
  );
}
