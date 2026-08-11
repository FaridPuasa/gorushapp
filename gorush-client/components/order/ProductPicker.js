import React from 'react';
import { View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFormStyles, Card, Field } from '../../lib/formPrimitives';
import { useLanguage } from '../../context/LanguageContext';
import { PRODUCTS } from '../../lib/pricing';

const PRODUCT_LABEL_KEYS = {
  MOH: 'order.productMoh',
  JPMC: 'order.productJpmc',
  PHC: 'order.productPhc',
  'Local Delivery': 'order.productLocalDelivery',
  'Cross Border Service Limbang': 'order.productCrossBorder',
};

export default function ProductPicker({ product, onChange }) {
  const formStyles = useFormStyles();
  const { t } = useLanguage();

  return (
    <Card icon="🚚" title={t('order.selectProduct')}>
      <Field label={t('order.product')} required>
        <View style={formStyles.pickerContainer}>
          <Picker style={formStyles.pickerControl} selectedValue={product} onValueChange={onChange}>
            <Picker.Item label={t('order.selectProductPlaceholder')} value="" />
            {PRODUCTS.map((p) => <Picker.Item key={p} label={t(PRODUCT_LABEL_KEYS[p])} value={p} />)}
          </Picker>
        </View>
      </Field>
    </Card>
  );
}
