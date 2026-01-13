/**
 * TC AD/SB Screen - Transport Canada Airworthiness Directives & Service Bulletins
 * Compares OCR-captured data with TC database
 * TC-SAFE: Information only, no compliance decisions
 * 
 * ROBUST VERSION - Never crashes, handles all edge cases
 * - ErrorBoundary for crash protection
 * - Normalizes multiple API response schemas
 * - Protects all renders against undefined/null
 */

import React, { useState, useEffect, useCallback, useMemo, Component, ReactNode } from 'react';
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

// ============================================================
// ERROR BOUNDARY - Catches render crashes
// ============================================================
interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry: () => void;
  onBack: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class TCErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Soft log only - never crash
    console.warn('[TC AD/SB] Render error caught:', error?.message || 'Unknown error');
    console.warn('[TC AD/SB] Component stack:', errorInfo?.componentStack || 'N/A');
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry();
  };

  render() {
    const lang = getLanguage();
    
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.content}>
            <Text style={errorStyles.icon}>⚠️</Text>
            <Text style={errorStyles.title}>
              {lang === 'fr' ? "Erreur d'affichage" : 'Display Error'}
            </Text>
            <Text style={errorStyles.subtitle}>
              {lang === 'fr' 
                ? 'Données incomplètes — vérifiez avec les registres officiels et votre TEA.'
                : 'Incomplete data — verify with official records and your AME.'}
            </Text>
            
            <View style={errorStyles.buttons}>
              <TouchableOpacity 
                style={errorStyles.backButton}
                onPress={this.props.onBack}
                activeOpacity={0.7}
              >
                <Text style={errorStyles.backButtonText}>
                  {lang === 'fr' ? '← Retour' : '← Back'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={errorStyles.retryButton}
                onPress={this.handleRetry}
                activeOpacity={0.7}
              >
                <Text style={errorStyles.retryButtonText}>
                  {lang === 'fr' ? 'Réessayer' : 'Retry'}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* TC-Safe disclaimer */}
            <View style={errorStyles.disclaimer}>
              <Text style={errorStyles.disclaimerText}>
                {lang === 'fr'
                  ? 'Informatif seulement — vérifiez avec les registres officiels et votre TEA.'
                  : 'Informational only — verify with official records and your AME/TEA.'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
  },
  backButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 14,
    borderRadius: 10,
    marginRight: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  retryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  disclaimer: {
    backgroundColor: COLORS.alertYellow,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.alertYellowBorder,
    width: '100%',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

// ============================================================
// TYPES
// ============================================================
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

// ============================================================
// SAFE DATA NORMALIZER
// ============================================================

/**
 * Safely get string value with fallback
 */
const safeString = (value: unknown, fallback: string = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

/**
 * Safely get number value with fallback
 */
const safeNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
};

/**
 * Safely get boolean value with fallback
 */
const safeBool = (value: unknown, fallback: boolean = false): boolean => {
  if (typeof value === 'boolean') return value;
  return fallback;
};

/**
 * Safely ensure array type
 */
const safeArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  return [];
};

/**
 * Normalize a single AD/SB item - protects all fields
 */
const normalizeItem = (raw: unknown): ADSBItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  
  const item = raw as Record<string, unknown>;
  
  // Extract reference - try multiple key patterns
  const ref = safeString(item.ref || item.reference || item.ad_ref || item.sb_ref || item.number, '');
  
  // Must have at least a reference
  if (!ref) {
    console.warn('[TC AD/SB] Item missing reference, skipping:', item);
    return null;
  }
  
  // Generate stable ID
  const id = safeString(
    item.id || item._id || item.item_id,
    `${ref}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  
  // Extract title
  const title = safeString(
    item.title || item.description || item.subject || item.name,
    ref
  );
  
  // Extract type (AD or SB)
  const rawType = safeString(item.type || item.item_type, 'AD').toUpperCase();
  const type: 'AD' | 'SB' = rawType === 'SB' ? 'SB' : 'AD';
  
  // Extract status
  const rawStatus = safeString(item.status || item.compliance_status, 'info').toLowerCase();
  let status: 'missing' | 'due_soon' | 'ok' | 'info' = 'info';
  if (rawStatus === 'missing' || rawStatus === 'not_found') status = 'missing';
  else if (rawStatus === 'due_soon' || rawStatus === 'due' || rawStatus === 'pending') status = 'due_soon';
  else if (rawStatus === 'ok' || rawStatus === 'complied' || rawStatus === 'done') status = 'ok';
  
  return {
    id,
    ref,
    title,
    type,
    status,
    found: safeBool(item.found || item.is_found || item.matched, false),
    last_recorded_date: safeString(item.last_recorded_date || item.last_recorded || item.recorded_date || item.compliance_date, undefined),
    next_due: safeString(item.next_due || item.due_date || item.next_compliance, undefined),
    recurrence_years: safeNumber(item.recurrence_years || item.years_interval, undefined),
    recurrence_hours: safeNumber(item.recurrence_hours || item.hours_interval, undefined),
    tc_url: safeString(item.tc_url || item.url || item.source_url || item.link, undefined),
    is_new: safeBool(item.is_new || item.new || item.isNew, false),
  };
};

/**
 * Normalize API response - handles multiple response schemas
 * Accepts:
 * - tc_items / tcItems / items_tc / items
 * - found / found_items / foundItems
 * - missing / missing_items / missingItems
 * - new_tc_items / newTcItems / new_items
 */
const normalizeApiResponse = (data: unknown): CompareResponse => {
  const defaultResponse: CompareResponse = {
    aircraft_id: '',
    designator: '',
    items: [],
    new_tc_items: [],
    disclaimer: '',
  };
  
  if (!data || typeof data !== 'object') {
    console.warn('[TC AD/SB] Invalid API response - not an object');
    return defaultResponse;
  }
  
  const raw = data as Record<string, unknown>;
  
  // Extract basic fields
  const aircraftId = safeString(raw.aircraft_id || raw.aircraftId || raw.aircraft);
  const designator = safeString(raw.designator || raw.type_designator || raw.model);
  const disclaimer = safeString(
    raw.disclaimer || raw.note || raw.warning,
    t('tc_adsb_disclaimer')
  );
  
  // Extract items from multiple possible keys
  let rawItems: unknown[] = [];
  
  // Try primary keys
  const possibleItemsKeys = ['items', 'tc_items', 'tcItems', 'items_tc', 'adsb_items', 'data'];
  for (const key of possibleItemsKeys) {
    if (Array.isArray(raw[key])) {
      rawItems = raw[key] as unknown[];
      break;
    }
  }
  
  // Also merge found and missing items if present
  const foundKeys = ['found', 'found_items', 'foundItems', 'found_in_logbook'];
  const missingKeys = ['missing', 'missing_items', 'missingItems', 'not_found'];
  
  for (const key of foundKeys) {
    if (Array.isArray(raw[key])) {
      rawItems = [...rawItems, ...(raw[key] as unknown[])];
    }
  }
  
  for (const key of missingKeys) {
    if (Array.isArray(raw[key])) {
      rawItems = [...rawItems, ...(raw[key] as unknown[])];
    }
  }
  
  // Normalize items
  const items: ADSBItem[] = [];
  for (const rawItem of rawItems) {
    const normalized = normalizeItem(rawItem);
    if (normalized) {
      items.push(normalized);
    }
  }
  
  // Extract new TC items
  let rawNewItems: unknown[] = [];
  const newItemsKeys = ['new_tc_items', 'newTcItems', 'new_items', 'newly_published'];
  for (const key of newItemsKeys) {
    if (Array.isArray(raw[key])) {
      rawNewItems = raw[key] as unknown[];
      break;
    }
  }
  
  const newTcItems: ADSBItem[] = [];
  for (const rawItem of rawNewItems) {
    const normalized = normalizeItem(rawItem);
    if (normalized) {
      newTcItems.push(normalized);
    }
  }
  
  return {
    aircraft_id: aircraftId,
    designator,
    items,
    new_tc_items: newTcItems,
    disclaimer,
  };
};

// ============================================================
// MAIN COMPONENT
// ============================================================
function TcAdSbScreenContent() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompareResponse | null>(null);

  // Fetch handler - can be called for retry
  const fetchData = useCallback(async () => {
    if (!aircraftId) {
      setError(lang === 'fr' ? 'ID avion manquant' : 'Missing aircraft ID');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/adsb/compare/${aircraftId}`);
      
      // Normalize response - handles all schemas
      const normalized = normalizeApiResponse(response.data);
      setData(normalized);
      
      console.warn('[TC AD/SB] Data loaded:', {
        itemsCount: normalized.items.length,
        newItemsCount: normalized.new_tc_items.length,
      });
    } catch (err: unknown) {
      console.warn('[TC AD/SB] Fetch error:', err);
      
      // Extract error message safely
      let errorMessage = t('tc_adsb_error');
      if (err && typeof err === 'object') {
        const errObj = err as { response?: { data?: { detail?: string } }; message?: string };
        errorMessage = errObj?.response?.data?.detail || errObj?.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [aircraftId, lang]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Safely filter items by type
  const adItems = useMemo(() => {
    const items = safeArray<ADSBItem>(data?.items);
    return items.filter(item => item?.type === 'AD');
  }, [data?.items]);

  const sbItems = useMemo(() => {
    const items = safeArray<ADSBItem>(data?.items);
    return items.filter(item => item?.type === 'SB');
  }, [data?.items]);

  const hasNewItems = useMemo(() => {
    const newItems = safeArray<ADSBItem>(data?.new_tc_items);
    return newItems.length > 0;
  }, [data?.new_tc_items]);

  // Open TC URL
  const handleOpenSource = useCallback((url?: string) => {
    if (url && typeof url === 'string') {
      Linking.openURL(url).catch(err => {
        console.warn('[TC AD/SB] Failed to open URL:', err);
      });
    }
  }, []);

  // Get status style - SAFE
  const getStatusStyle = useCallback((status: string | undefined, type: string | undefined) => {
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
  }, []);

  // Get status text - SAFE
  const getStatusText = useCallback((status: string | undefined) => {
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
  }, []);

  // Render single item card - FULLY PROTECTED
  const renderItem = useCallback((item: ADSBItem | null | undefined, index: number) => {
    // Skip null/undefined items
    if (!item) return null;
    
    // Safe extract all fields with defaults
    const itemId = safeString(item.id, `item-${index}`);
    const itemRef = safeString(item.ref, 'N/A');
    const itemTitle = safeString(item.title, '');
    const itemType = item.type === 'SB' ? 'SB' : 'AD';
    const itemStatus = safeString(item.status, 'info');
    const isNew = safeBool(item.is_new);
    const lastRecorded = item.last_recorded_date;
    const nextDue = item.next_due;
    const recurrenceYears = item.recurrence_years;
    const recurrenceHours = item.recurrence_hours;
    const tcUrl = item.tc_url;
    
    const statusStyle = getStatusStyle(itemStatus, itemType);
    const isAD = itemType === 'AD';
    const itemKey = `${itemId}-${itemRef}-${index}`;
    
    return (
      <View key={itemKey} style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: isAD ? COLORS.redBg : COLORS.blueBg }]}>
            <Text style={[styles.typeBadgeText, { color: isAD ? COLORS.red : COLORS.blue }]}>
              {itemType}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {getStatusText(itemStatus)}
            </Text>
          </View>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Ref & Title */}
        <Text style={styles.cardRef}>{itemRef}</Text>
        {itemTitle ? (
          <Text style={styles.cardTitle} numberOfLines={3}>{itemTitle}</Text>
        ) : null}

        {/* Dates - only render if there are dates */}
        {(lastRecorded || nextDue || recurrenceYears || recurrenceHours) && (
          <View style={styles.datesContainer}>
            {lastRecorded && (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{t('tc_adsb_last_recorded')}:</Text>
                <Text style={styles.dateValue}>{lastRecorded}</Text>
              </View>
            )}
            {nextDue && (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>{t('tc_adsb_next_due')}:</Text>
                <Text style={[styles.dateValue, itemStatus === 'due_soon' ? { color: COLORS.orange } : undefined]}>
                  {nextDue}
                </Text>
              </View>
            )}
            {(recurrenceYears || recurrenceHours) && (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>
                  {lang === 'fr' ? 'Récurrence:' : 'Recurrence:'}
                </Text>
                <Text style={styles.dateValue}>
                  {recurrenceYears ? `${recurrenceYears} ${lang === 'fr' ? 'ans' : 'years'}` : ''}
                  {recurrenceYears && recurrenceHours ? ' / ' : ''}
                  {recurrenceHours ? `${recurrenceHours}h` : ''}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Open source button */}
        {tcUrl && (
          <TouchableOpacity 
            style={styles.sourceButton}
            onPress={() => handleOpenSource(tcUrl)}
            activeOpacity={0.7}
          >
            <View style={styles.sourceButtonContent}>
              <Text style={styles.sourceButtonIcon}>🔗</Text>
              <Text style={styles.sourceButtonText}>{t('tc_adsb_open_source')}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [lang, getStatusStyle, getStatusText, handleOpenSource]);

  // Render content based on state
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
          
          {/* TC-Safe info banner */}
          <View style={styles.infoOnlyBanner}>
            <Text style={styles.infoOnlyText}>
              {lang === 'fr'
                ? 'Informatif seulement — vérifiez avec les registres officiels et votre TEA.'
                : 'Informational only — verify with official records and your AME/TEA.'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchData}
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
        {hasNewItems && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={styles.alertText}>{t('tc_adsb_new_alert')}</Text>
          </View>
        )}

        {/* AD Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.adSectionHeader]}>
            <Text style={[styles.sectionTitle, styles.adSectionTitle]}>
              {t('tc_adsb_ad_section')}
            </Text>
            <View style={styles.sectionCount}>
              <Text style={[styles.sectionCountText, styles.adSectionCountText]}>
                {adItems.length}
              </Text>
            </View>
          </View>
          
          {adItems.length > 0 ? (
            <View style={styles.itemsContainer}>
              {adItems.map((item, index) => renderItem(item, index))}
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
              <Text style={[styles.sectionCountText, styles.sbSectionCountText]}>
                {sbItems.length}
              </Text>
            </View>
          </View>
          
          {sbItems.length > 0 ? (
            <View style={styles.itemsContainer}>
              {sbItems.map((item, index) => renderItem(item, adItems.length + index))}
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
            {safeString(data.disclaimer, t('tc_adsb_disclaimer'))}
          </Text>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  }, [isLoading, error, data, hasNewItems, adItems, sbItems, renderItem, fetchData, lang]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} activeOpacity={0.7}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('tc_adsb_title')}</Text>
          <Text style={styles.headerSubtitle}>{safeString(registration, 'Aircraft')}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleText}>{t('tc_adsb_subtitle')}</Text>
      </View>

      {/* Main content */}
      {renderContent()}
    </View>
  );
}

// ============================================================
// EXPORT WITH ERROR BOUNDARY WRAPPER
// ============================================================
export default function TcAdSbScreen() {
  const router = useRouter();
  const [retryKey, setRetryKey] = useState(0);
  
  const handleRetry = useCallback(() => {
    setRetryKey(prev => prev + 1);
  }, []);
  
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);
  
  return (
    <TCErrorBoundary 
      key={retryKey}
      onRetry={handleRetry} 
      onBack={handleBack}
    >
      <TcAdSbScreenContent />
    </TCErrorBoundary>
  );
}

// ============================================================
// STYLES
// ============================================================
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
  infoOnlyBanner: {
    backgroundColor: COLORS.alertYellow,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.alertYellowBorder,
    maxWidth: 320,
  },
  infoOnlyText: {
    fontSize: 13,
    color: '#5D4037',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
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
  // Items container
  itemsContainer: {
    flexDirection: 'column',
  },
  // Bottom spacer
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
  // Section color variations
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
