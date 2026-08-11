import React from 'react';
import { Text, View, Image, Platform } from 'react-native';
import { PageScroll, useFormStyles } from '../lib/formPrimitives';
import { CONTENT_MAX_WIDTH } from '../lib/theme';
import { useIsMobile } from '../lib/responsive';
import { useLanguage } from '../context/LanguageContext';
import { AnimatedPressable, FadeIn, FadeInUp } from '../lib/animations';

const TEAM_PHOTO = require('../assets/about-team.jpg');
const INTRO_PHOTO = require('../assets/about-intro.jpg');
const PHARMACY_PHOTO = require('../assets/about-pharmacy.jpg');
const LOCAL_DELIVERY_PHOTO = require('../assets/about-local-delivery.jpg');
const LOGO_MOH = require('../assets/logo-moh.png');
const LOGO_PJSC = require('../assets/logo-pjsc.jpg');
const LOGO_JPMC = require('../assets/logo-jpmc.png');
const LOGO_PHC = require('../assets/logo-phc.jpg');

// Sized to each photo's own real pixel dimensions rather than a fixed/capped height, so the
// full frame always shows at its natural max height instead of being cropped by
// resizeMode="cover" squeezing it into a shorter box than its actual proportions.
const TEAM_PHOTO_RATIO = 3749 / 1487;
const INTRO_PHOTO_RATIO = 1001 / 595;
const PHARMACY_PHOTO_RATIO = 600 / 356;
const LOCAL_DELIVERY_PHOTO_RATIO = 1004 / 608;

// White card behind the partner-clinic logos regardless of theme — several of these logos
// (transparent PNG/JPG on their own brand backgrounds) only read correctly against a plain
// light background, not whatever the page's own light/dark surface color happens to be.
const LOGO_CARD_SHADOW = Platform.select({
  web: { boxShadow: '0 2px 10px rgba(0,0,0,0.07)' },
  android: { elevation: 2 },
  default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
});

function AboutTop({ title, titleStyle, body, bodyStyle }) {
  return (
    <View style={{ width: '100%', marginBottom: 32 }}>
      <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20 }}>
        <Text style={titleStyle}>{title}</Text>
        <Text style={[bodyStyle, { marginTop: 18 }]}>{body}</Text>
      </View>
      <View style={{ width: '100%', aspectRatio: TEAM_PHOTO_RATIO, marginTop: 28 }}>
        <Image source={TEAM_PHOTO} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </View>
    </View>
  );
}

function SectionHeading({ icon, title, style }) {
  return <FadeIn><Text style={[style, { textAlign: 'center' }]}>{icon}  {title}</Text></FadeIn>;
}

// On desktop/web, lays text and image side by side (imageSide picks which column the
// image sits in); on mobile it always stacks, image-then-text, matching a single reading
// column — same visual order regardless of imageSide since there's no "side" to speak of.
function SplitSection({ imageSide = 'right', image, imageRatio, isMobile, children }) {
  const imageEl = (
    <AnimatedPressable
      scaleTo={1.05}
      style={isMobile
        ? { width: '100%', aspectRatio: imageRatio, borderRadius: 12, marginBottom: 16, overflow: 'hidden' }
        : { width: '48%', aspectRatio: imageRatio, borderRadius: 12, overflow: 'hidden' }}
    >
      <Image source={image} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </AnimatedPressable>
  );
  const textEl = <View style={isMobile ? { width: '100%', marginBottom: 16 } : { width: '48%' }}>{children}</View>;

  const content = isMobile
    ? (imageSide === 'left' ? <View>{imageEl}{textEl}</View> : <View>{textEl}{imageEl}</View>)
    : (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {imageSide === 'left' ? <>{imageEl}{textEl}</> : <>{textEl}{imageEl}</>}
      </View>
    );

  return <FadeInUp>{content}</FadeInUp>;
}

function LogoTile({ source, width, height = 88 }) {
  return (
    <AnimatedPressable scaleTo={1.1} style={{ marginHorizontal: 16, marginVertical: 10, borderRadius: 8, overflow: 'hidden' }}>
      <Image source={source} style={{ width, height }} resizeMode="contain" />
    </AnimatedPressable>
  );
}

export default function About() {
  const { t } = useLanguage();
  const formStyles = useFormStyles();
  const isMobile = useIsMobile();

  return (
    <PageScroll
      title={t('nav.aboutUs')}
      beforeContent={
        <AboutTop
          title={t('static.about.pageTitle')}
          titleStyle={formStyles.title}
          body={t('static.about.whoWeAreBody')}
          bodyStyle={formStyles.bodyText}
        />
      }
    >
      <View style={{ marginBottom: 24 }}>
        <SplitSection imageSide="right" image={INTRO_PHOTO} imageRatio={INTRO_PHOTO_RATIO} isMobile={isMobile}>
          <Text style={formStyles.bodyText}>{t('static.about.ourMissionBody')}</Text>
        </SplitSection>
      </View>

      <FadeIn>
        <Text style={[formStyles.title, { fontSize: formStyles.title.fontSize - 4, marginTop: 4, marginBottom: 20 }]}>{t('static.about.whatWeOffer')}</Text>
      </FadeIn>

      <View style={{ marginBottom: 24 }}>
        <SectionHeading icon="💊" title={t('static.about.pharmacyDelivery')} style={formStyles.sectionHeader} />
        <SplitSection imageSide="left" image={PHARMACY_PHOTO} imageRatio={PHARMACY_PHOTO_RATIO} isMobile={isMobile}>
          <Text style={formStyles.bodyText}>{t('static.about.pharmacyDeliveryBody')}</Text>
        </SplitSection>
      </View>

      <FadeInUp
        style={{
          flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 24,
          ...LOGO_CARD_SHADOW,
        }}
      >
        <LogoTile source={LOGO_MOH} width={195} />
        <LogoTile source={LOGO_JPMC} width={130} />
        <LogoTile source={LOGO_PJSC} width={130} />
        <LogoTile source={LOGO_PHC} width={130} />
      </FadeInUp>

      <View>
        <SectionHeading icon="🚚" title={t('static.about.localDelivery')} style={formStyles.sectionHeader} />
        <SplitSection imageSide="right" image={LOCAL_DELIVERY_PHOTO} imageRatio={LOCAL_DELIVERY_PHOTO_RATIO} isMobile={isMobile}>
          <Text style={formStyles.bodyText}>{t('static.about.localDeliveryBody')}</Text>
        </SplitSection>
      </View>
    </PageScroll>
  );
}
