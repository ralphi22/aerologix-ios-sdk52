/**
 * TC AD/SB Screen - Transport Canada Airworthiness Directives & Service Bulletins
 * Compares OCR-captured data with TC database
 * TC-SAFE: Information only, no compliance decisions
 * 
 * Fixed for iOS Fabric (RN 0.73+) layout stability
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { t, getLanguage } from '@/i18n';
import api from '@/services/api';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  border: '#E0E0E0',
  // Status colors
  red: '#E53935',
  redBg: '#FFEBEE',
  orange: '#FF9800',
  orangeBg: '#FFF3E0',
  green: '#43A047',
  greenBg: '#E8F5E9',
  blue: '#1976D2',
  blueBg: '#E3F2FD',
  // Alert
  alertYellow: '#FFF8E1',
  alertYellowBorder: '#FFE082',
};

interface ADSBItem {
  id: string;
  ref: string;
  title: string;
  type: 'AD' | 'SB';
  status: 'missing' | 'due_soon' | 'ok' | 'info';
  found: boolean;
  last_recorded_date?: string;
  next_due?: string;
  recurrence_years?: number;
  recurrence_hours?: number;
  tc_url?: string;
  is_new?: boolean;
}

interface CompareResponse {
  aircraft_id: string;
  designator: string;
  items: ADSBItem[];
  new_tc_items: ADSBItem[];
  disclaimer: string;
}

export default function TcAdSbScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompareResponse | null>(null);

  // Fetch TC AD/SB comparison data
  useEffect(() => {
    const fetchData = async () => {
      if (!aircraftId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await api.get(`/api/adsb/compare/${aircraftId}`);
        setData(response.data);
      } catch (err: any) {
        console.error('TC AD/SB fetch error:', err);
        setError(err?.response?.data?.detail || err?.message || t('tc_adsb_error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [aircraftId]);

  // Filter items by type
  const adItems = data?.items.filter(item => item.type === 'AD') || [];
  const sbItems = data?.items.filter(item => item.type === 'SB') || [];
  const hasNewItems = (data?.new_tc_items?.length || 0) > 0;

  // Open TC URL
  const handleOpenSource = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  // Get status style
  const getStatusStyle = (status: string, type: 'AD' | 'SB') => {
    // SB never shows red (info only)
    if (type === 'SB') {
      return { bg: COLORS.blueBg, text: COLORS.blue };
    }
    
    switch (status) {
      case 'missing':
        return { bg: COLORS.redBg, text: COLORS.red };
      case 'due_soon':
        return { bg: COLORS.orangeBg, text: COLORS.orange };
      case 'ok':
        return { bg: COLORS.greenBg, text: COLORS.green };
      default:
        return { bg: COLORS.blueBg, text: COLORS.blue };
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'missing':
        return t('tc_adsb_missing');
      case 'due_soon':
        return t('tc_adsb_due_soon');
      case 'ok':
        return t('tc_adsb_ok');
      default:
        return t('tc_adsb_info_only');
    }
  };

  // Memoized render function for single item card - prevents unnecessary re-renders on iOS Fabric
  const renderItem = useCallback((item: ADSBItem) => {
    const statusStyle = getStatusStyle(item.status, item.type);
    const isAD = item.type === 'AD';
    
    // Generate stable unique key
    const itemKey = item.id ? `item-${item.id}` : `ref-${item.ref}`;
    
    return (
      <View key={itemKey} style={styles.card}>
        {/* Header row - replaced gap with marginRight for iOS Fabric stability */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: isAD ? COLORS.redBg : COLORS.blueBg }]}>
            <Text style={[styles.typeBadgeText, { color: isAD ? COLORS.red : COLORS.blue }]}>
              {item.type}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
          {item.is_new ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          ) : null}
        </View>

        {/* Ref & Title */}
        <Text style={styles.cardRef}>{item.ref}</Text>
        <Text style={styles.cardTitle} numberOfLines={3}>{item.title}</Text>

        {/* Dates - only render if there are dates */}
        {(item.last_recorded_date || item.next_due || item.recurrence_years || item.recurrence_hours) ? (
          <View style={styles.datesContainer}>
            {item.last_recorded_date ? (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{t('tc_adsb_last_recorded')}:</Text>
                <Text style={styles.dateValue}>{item.last_recorded_date}</Text>
              </View>
            ) : null}
            {item.next_due ? (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{t('tc_adsb_next_due')}:</Text>
                <Text style={[styles.dateValue, item.status === 'due_soon' ? { color: COLORS.orange } : undefined]}>
                  {item.next_due}
                </Text>
              </View>
            ) : null}
            {(item.recurrence_years || item.recurrence_hours) ? (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>
                  {lang === 'fr' ? 'Récurrence:' : 'Recurrence:'}
                </Text>
                <Text style={styles.dateValue}>
                  {item.recurrence_years ? `${item.recurrence_years} ${lang === 'fr' ? 'ans' : 'years'}` : ''}
                  {item.recurrence_years && item.recurrence_hours ? ' / ' : ''}
                  {item.recurrence_hours ? `${item.recurrence_hours}h` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Open source button - separated emoji into own Text for iOS stability */}
        {item.tc_url ? (
          <TouchableOpacity 
            style={styles.sourceButton}
            onPress={() => handleOpenSource(item.tc_url)}
            activeOpacity={0.7}
          >
            <View style={styles.sourceButtonContent}>
              <Text style={styles.sourceButtonIcon}>🔗</Text>
              <Text style={styles.sourceButtonText}>{t('tc_adsb_open_source')}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [lang]);

  // Memoize whether we have any items to display
  const hasAnyItems = useMemo(() => {
    return adItems.length > 0 || sbItems.length > 0;
  }, [adItems.length, sbItems.length]);

  // Render content based on state - mutually exclusive conditions for iOS Fabric
  const renderContent = useCallback(() => {
    // Loading state
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('tc_adsb_loading')}</Text>
        </View>
      );
    }

    // Error state
    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              api.get(`/api/adsb/compare/${aircraftId}`)
                .then(res => setData(res.data))
                .catch(err => setError(err?.message || t('tc_adsb_error')))
                .finally(() => setIsLoading(false));
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>
              {lang === 'fr' ? 'Réessayer' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // No data yet
    if (!data) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    // Data loaded - render ScrollView with content
    return (
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        bounces={true}
        overScrollMode="always"
        removeClippedSubviews={Platform.OS === 'ios'}
      >
        {/* New items alert */}
        {hasNewItems ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>{t('tc_adsb_new_alert')}</Text>
          </View>
        ) : null}

        {/* AD Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.adSectionHeader]}>
            <Text style={[styles.sectionTitle, styles.adSectionTitle]}>
              {t('tc_adsb_ad_section')}
            </Text>
            <View style={styles.sectionCount}>
              <Text style={[styles.sectionCountText, styles.adSectionCountText]}>{adItems.length}</Text>
            </View>
          </View>
          
          {adItems.length > 0 ? (
            <View style={styles.itemsContainer}>
              {adItems.map(renderItem)}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>{t('tc_adsb_no_items')}</Text>
            </View>
          )}
        </View>

        {/* SB Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.sbSectionHeader]}>
            <Text style={[styles.sectionTitle, styles.sbSectionTitle]}>
              {t('tc_adsb_sb_section')}
            </Text>
            <View style={styles.sectionCount}>
              <Text style={[styles.sectionCountText, styles.sbSectionCountText]}>{sbItems.length}</Text>
            </View>
          </View>
          
          {sbItems.length > 0 ? (
            <View style={styles.itemsContainer}>
              {sbItems.map(renderItem)}
            </View>
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>{t('tc_adsb_no_items')}</Text>
            </View>
          )}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {data.disclaimer || t('tc_adsb_disclaimer')}
          </Text>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  }, [isLoading, error, data, hasNewItems, adItems, sbItems, renderItem, lang, aircraftId]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} activeOpacity={0.7}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('tc_adsb_title')}</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleText}>{t('tc_adsb_subtitle')}</Text>
      </View>

      {/* Main content - single render path */}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  // Subtitle
  subtitleContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subtitleText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Center container (loading, error, empty)
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.red,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  // Scroll content
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  // Items container - wraps mapped items for stable layout
  itemsContainer: {
    flexDirection: 'column',
  },
  // Bottom spacer - fixed height for iOS scroll end
  bottomSpacer: {
    height: 40,
  },
  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.alertYellow,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.alertYellowBorder,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '600',
  },
  // Section
  section: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCount: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Section color variations - static styles for iOS Fabric stability
  adSectionHeader: {
    backgroundColor: COLORS.redBg,
  },
  adSectionTitle: {
    color: COLORS.red,
  },
  adSectionCountText: {
    color: COLORS.red,
  },
  sbSectionHeader: {
    backgroundColor: COLORS.blueBg,
  },
  sbSectionTitle: {
    color: COLORS.blue,
  },
  sbSectionCountText: {
    color: COLORS.blue,
  },
  emptySection: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: COLORS.orange,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  cardRef: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  // Dates
  datesContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dateLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  // Source button
  sourceButton: {
    backgroundColor: COLORS.blueBg,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  sourceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  sourceButtonText: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: '600',
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.alertYellow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.alertYellowBorder,
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
});
