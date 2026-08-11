import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PageScroll, Card, useFormStyles } from '../lib/formPrimitives';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { PRODUCT_CODES, PRODUCTS } from '../lib/pricing';
import { AnimatedPressable } from '../lib/animations';
import { STATUS_ORDER, getStatusStyle, displayStatusLabel } from '../lib/trackingHistory';
import TrackOrderButton from '../components/TrackOrderButton';

const PRODUCT_LABELS = Object.fromEntries(
  Object.entries(PRODUCT_CODES).map(([label, code]) => [code, label])
);
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatOrderDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// A single label/value row inside an order card — Product, Job Method, Payment Method,
// Total — same divided-row convention ContactUs' HoursRow already established.
function DetailRow({ label, value, isLast, colors, formStyles }) {
  return (
    <View
      style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6,
        borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: formStyles.bodyText.fontSize - 1, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: formStyles.bodyText.fontSize, color: colors.textPrimary, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

export default function MyOrders() {
  const { isGuest, loading: authLoading, token } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formStyles = useFormStyles();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // searchInput updates immediately (so the TextInput feels responsive); `search` is the
  // debounced value actually sent to the server, so typing doesn't fire a request per keystroke.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Any filter change should jump back to page 1 — a stale page number from a previous,
  // larger result set could otherwise land past the end of a newly filtered one.
  useEffect(() => {
    setPage(1);
  }, [search, productFilter, statusFilter]);

  useEffect(() => {
    if (!authLoading && isGuest) {
      router.replace('/login');
    }
  }, [authLoading, isGuest]);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (productFilter) params.product = productFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/api/orders/mine', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || t('myOrders.genericError'));
    } finally {
      setLoading(false);
    }
  }, [token, page, search, productFilter, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const hasActiveFilters = !!(search || productFilter || statusFilter);
  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setProductFilter('');
    setStatusFilter('');
  };

  const pickerContainerStyle = useMemo(() => ([formStyles.pickerContainer, { flex: 1 }]), [formStyles]);

  if (authLoading || isGuest) return null;

  return (
    <PageScroll title={t('myOrders.pageTitle')}>
      <Text style={formStyles.title}>{t('myOrders.pageTitle')}</Text>
      <Text style={formStyles.subtitle}>{t('myOrders.subtitle')}</Text>

      <View style={{ marginBottom: 20 }}>
        <TextInput
          style={[formStyles.input, { marginBottom: 10 }]}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={t('myOrders.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
        />

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: hasActiveFilters ? 8 : 0 }}>
          <View style={pickerContainerStyle}>
            <Picker style={formStyles.pickerControl} selectedValue={productFilter} onValueChange={setProductFilter}>
              <Picker.Item label={t('myOrders.allProducts')} value="" />
              {PRODUCTS.map((label) => <Picker.Item key={label} label={label} value={PRODUCT_CODES[label]} />)}
            </Picker>
          </View>
          <View style={pickerContainerStyle}>
            <Picker style={formStyles.pickerControl} selectedValue={statusFilter} onValueChange={setStatusFilter}>
              <Picker.Item label={t('myOrders.allStatuses')} value="" />
              {STATUS_ORDER.map((status) => <Picker.Item key={status} label={displayStatusLabel(status, t)} value={status} />)}
            </Picker>
          </View>
        </View>

        {hasActiveFilters && (
          <AnimatedPressable scaleTo={1.03} onPress={clearFilters} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: formStyles.bodyText.fontSize - 1 }}>
              ✕ {t('myOrders.clearFilters')}
            </Text>
          </AnimatedPressable>
        )}
      </View>

      {loading && (
        <View style={{ paddingVertical: 30, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {!loading && error && (
        <View style={[formStyles.statusBanner, formStyles.statusErrorBanner]}>
          <Text style={formStyles.statusTextError}>⚠️  {error}</Text>
        </View>
      )}

      {!loading && !error && data?.orders.length === 0 && (
        <Card icon="📦" title={hasActiveFilters ? t('myOrders.noResultsTitle') : t('myOrders.emptyTitle')} centered>
          <Text style={[formStyles.bodyText, { textAlign: 'center' }]}>
            {hasActiveFilters ? t('myOrders.noResultsBody') : t('myOrders.emptyBody')}
          </Text>
          {hasActiveFilters ? (
            <AnimatedPressable scaleTo={1.03} style={formStyles.buttonAccent} onPress={clearFilters}>
              <Text style={formStyles.buttonText}>{t('myOrders.clearFilters')}</Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable scaleTo={1.03} style={formStyles.buttonAccent} onPress={() => router.push('/order')}>
              <Text style={formStyles.buttonText}>{t('myOrders.emptyCta')}</Text>
            </AnimatedPressable>
          )}
        </Card>
      )}

      {!loading && !error && data?.orders.map((order) => {
        const statusStyle = getStatusStyle(order.status, colors);
        const statusLabel = displayStatusLabel(order.status, t);
        const isCompleted = (order.status || '').toLowerCase() === 'completed';
        const statusText = isCompleted && order.deliveryDate
          ? t('myOrders.statusOnDate').replace('{status}', statusLabel).replace('{date}', formatOrderDate(order.deliveryDate))
          : statusLabel;

        return (
          <Card
            key={order.orderId}
            icon="📦"
            title={order.trackingNumber || t('myOrders.pendingTracking')}
            eyebrow={`${t('myOrders.dateSubmitted')}: ${formatOrderDate(order.date)}`}
            eyebrowStyle={{ fontSize: formStyles.subtitle.fontSize - 1, fontWeight: '700', color: colors.primary, marginBottom: 8 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: formStyles.bodyText.fontSize + 4, marginRight: 6 }}>{statusStyle.icon}</Text>
              <Text style={{ fontSize: formStyles.bodyText.fontSize + 1, fontWeight: '700', color: statusStyle.color, flexShrink: 1 }}>
                {statusText}
              </Text>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <DetailRow label={t('myOrders.product')} value={PRODUCT_LABELS[order.product] || order.product} colors={colors} formStyles={formStyles} />
              <DetailRow label={t('myOrders.jobMethod')} value={order.jobMethod || t('myOrders.notAvailable')} colors={colors} formStyles={formStyles} />
              <DetailRow label={t('myOrders.paymentMethod')} value={order.paymentMethod || t('myOrders.notAvailable')} isLast={!order.totalPrice} colors={colors} formStyles={formStyles} />
              {order.totalPrice ? (
                <DetailRow label={t('myOrders.total')} value={`$${order.totalPrice}`} isLast colors={colors} formStyles={formStyles} />
              ) : null}
            </View>

            {order.trackingNumber ? <TrackOrderButton trackingNumber={order.trackingNumber} /> : null}
          </Card>
        );
      })}

      {!loading && !error && data && data.totalPages > 1 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 14 }}>
          <AnimatedPressable
            scaleTo={1.03}
            style={[formStyles.button, { flex: 0, paddingHorizontal: 20 }, page <= 1 && formStyles.buttonDisabled]}
            onPress={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
          >
            <Text style={formStyles.buttonText}>{t('myOrders.previous')}</Text>
          </AnimatedPressable>
          <Text style={formStyles.bodyText}>
            {t('myOrders.pageOf').replace('{page}', String(data.page)).replace('{totalPages}', String(data.totalPages))}
          </Text>
          <AnimatedPressable
            scaleTo={1.03}
            style={[formStyles.button, { flex: 0, paddingHorizontal: 20 }, page >= data.totalPages && formStyles.buttonDisabled]}
            onPress={() => setPage((p) => Math.min(p + 1, data.totalPages))}
            disabled={page >= data.totalPages}
          >
            <Text style={formStyles.buttonText}>{t('myOrders.next')}</Text>
          </AnimatedPressable>
        </View>
      )}
    </PageScroll>
  );
}
