/**
 * TC AD/SB Comparison Screen - Transport Canada Airworthiness Directives & Service Bulletins
 * 
 * OFFICIAL API CONTRACT:
 * GET /api/adsb/compare/{aircraft_id}
 * Response: {
 *   total_tc_items: number,
 *   found_count: number,
 *   missing_count: number,
 *   new_tc_items: ComparisonItem[],
 *   comparison: ComparisonItem[],
 *   disclaimer: string
 * }
 * 
 * ComparisonItem: {
 *   ref: string,
 *   title: string,
 *   type: "AD" | "SB",
 *   status: "OK" | "MISSING" | "DUE_SOON" | "NEW",
 *   last_recorded_date?: string,
 *   next_due?: string,
 *   recurrence_years?: number,
 *   recurrence_hours?: number,
 *   tc_url?: string
 * }
 * 
 * CRASH-PROOF VERSION:
 * - ErrorBoundary for render crash protection
 * - Strict normalization of API response
 * - All fields protected with safe defaults
 * - Never uses .map/.length on non-array values
 * - TC-Safe: Informational only
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
  // Status colors - OFFICIAL
  red: '#E53935',      // MISSING
  redBg: '#FFEBEE',
  orange: '#FF9800',   // DUE_SOON
  orangeBg: '#FFF3E0',
  green: '#43A047',    // OK / Found
  greenBg: '#E8F5E9',
  blue: '#1976D2',     // NEW / Info
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
    console.warn('[TC AD/SB] Render error caught:', error?.message || 'Unknown');
    console.warn('[TC AD/SB] Stack:', errorInfo?.componentStack || 'N/A');
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
  icon: { fontSize: 56, marginBottom: 16 },
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
// TYPES - OFFICIAL API CONTRACT
// ============================================================

// Status enum from backend
type ItemStatus = 'OK' | 'MISSING' | 'DUE_SOON' | 'NEW';

// Comparison item from API
interface ComparisonItem {
  ref: string;
  title: string;
  type: 'AD' | 'SB';
  status: ItemStatus;
  last_recorded_date?: string;
  next_due?: string;
  recurrence_years?: number;
  recurrence_hours?: number;
  tc_url?: string;
}

// Normalized API response
interface NormalizedResponse {
  total_tc_items: number;
  found_count: number;
  missing_count: number;
  comparison: ComparisonItem[];
  new_tc_items: ComparisonItem[];
  disclaimer: string;
}

// ============================================================
// SAFE HELPERS - Never crash
// ============================================================

const safeString = (value: unknown, fallback: string = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const safeNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
};

const safeArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  return [];
};

// ============================================================
// NORMALIZER - OFFICIAL API CONTRACT
// ============================================================

/**
 * Normalize a single comparison item
 * Protects all fields with safe defaults
 */
const normalizeItem = (raw: unknown): ComparisonItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  
  const item = raw as Record<string, unknown>;
  
  // ref is REQUIRED
  const ref = safeString(item.ref || item.reference);
  if (!ref) {
    console.warn('[TC AD/SB] Item missing ref, skipping');
    return null;
  }
  
  // title with safe default
  const title = safeString(item.title || item.description, '');
  
  // type: AD or SB
  const rawType = safeString(item.type, 'AD').toUpperCase();
  const type: 'AD' | 'SB' = rawType === 'SB' ? 'SB' : 'AD';
  
  // status: OK, MISSING, DUE_SOON, NEW
  const rawStatus = safeString(item.status, 'OK').toUpperCase();
  let status: ItemStatus = 'OK';
  if (rawStatus === 'MISSING') status = 'MISSING';
  else if (rawStatus === 'DUE_SOON') status = 'DUE_SOON';
  else if (rawStatus === 'NEW') status = 'NEW';
  else if (rawStatus === 'OK' || rawStatus === 'FOUND') status = 'OK';
  
  return {
    ref,
    title,
    type,
    status,
    last_recorded_date: safeString(item.last_recorded_date, undefined),
    next_due: safeString(item.next_due, undefined),
    recurrence_years: item.recurrence_years != null ? safeNumber(item.recurrence_years, undefined) : undefined,
    recurrence_hours: item.recurrence_hours != null ? safeNumber(item.recurrence_hours, undefined) : undefined,
    tc_url: safeString(item.tc_url || item.url, undefined),
  };
};

/**
 * Normalize API response to official contract
 * NEVER uses: data.found, data.missing, data.tc_items, data.items
 * ONLY uses: data.comparison[], data.new_tc_items[]
 */
const normalizeApiResponse = (data: unknown): NormalizedResponse => {
  const defaultResponse: NormalizedResponse = {
    total_tc_items: 0,
    found_count: 0,
    missing_count: 0,
    comparison: [],
    new_tc_items: [],
    disclaimer: '',
  };
  
  if (!data || typeof data !== 'object') {
    console.warn('[TC AD/SB] Invalid API response - not an object');
    return defaultResponse;
  }
  
  const raw = data as Record<string, unknown>;
  
  // Extract counts (safe)
  const total_tc_items = safeNumber(raw.total_tc_items, 0);
  const found_count = safeNumber(raw.found_count, 0);
  const missing_count = safeNumber(raw.missing_count, 0);
  
  // OFFICIAL: Extract comparison[] - this is the main array
  const rawComparison = safeArray<unknown>(raw.comparison);
  const comparison: ComparisonItem[] = [];
  for (const rawItem of rawComparison) {
    const normalized = normalizeItem(rawItem);
    if (normalized) {
      comparison.push(normalized);
    }
  }
  
  // OFFICIAL: Extract new_tc_items[]
  const rawNewItems = safeArray<unknown>(raw.new_tc_items);
  const new_tc_items: ComparisonItem[] = [];
  for (const rawItem of rawNewItems) {
    const normalized = normalizeItem(rawItem);
    if (normalized) {
      // Mark as NEW status
      normalized.status = 'NEW';
      new_tc_items.push(normalized);
    }
  }
  
  // Extract disclaimer
  const disclaimer = safeString(
    raw.disclaimer,
    'Informational only — verify with official Transport Canada records and your AME/TEA.'
  );
  
  return {
    total_tc_items,
    found_count,
    missing_count,
    comparison,
    new_tc_items,
    disclaimer,
  };
};

// ============================================================
// STATUS HELPERS
// ============================================================

/**
 * Get visual style for status
 * OK → green, DUE_SOON → orange, MISSING → red, NEW → blue
 */
const getStatusStyle = (status: ItemStatus, type: 'AD' | 'SB') => {
  // SB items are always info/blue (no compliance requirement)
  if (type === 'SB') {
    return { bg: COLORS.blueBg, text: COLORS.blue };
  }
  
  switch (status) {
    case 'MISSING':
      return { bg: COLORS.redBg, text: COLORS.red };
    case 'DUE_SOON':
      return { bg: COLORS.orangeBg, text: COLORS.orange };
    case 'OK':
      return { bg: COLORS.greenBg, text: COLORS.green };
    case 'NEW':
      return { bg: COLORS.blueBg, text: COLORS.blue };
    default:
      return { bg: COLORS.blueBg, text: COLORS.blue };
  }
};

/**
 * Get display text for status
 * NEVER "Compliant" / "Non-compliant"
 * Only: "Found", "Missing", "Due soon", "New"
 */
const getStatusText = (status: ItemStatus, lang: string): string => {
  switch (status) {
    case 'OK':
      return lang === 'fr' ? 'Trouvé' : 'Found';
    case 'MISSING':
      return lang === 'fr' ? 'Manquant' : 'Missing';
    case 'DUE_SOON':
      return lang === 'fr' ? 'Bientôt dû' : 'Due soon';
    case 'NEW':
      return lang === 'fr' ? 'Nouveau' : 'New';
    default:
      return lang === 'fr' ? 'Info' : 'Info';
  }
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
  const [data, setData] = useState<NormalizedResponse | null>(null);

  // Fetch handler
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
      
      // Normalize with official contract
      const normalized = normalizeApiResponse(response.data);
      setData(normalized);
      
      console.warn('[TC AD/SB] Loaded:', {
        comparison: normalized.comparison.length,
        newItems: normalized.new_tc_items.length,
        total: normalized.total_tc_items,
      });
    } catch (err: unknown) {
      console.warn('[TC AD/SB] Fetch error:', err);
      
      // Handle specific error codes
      let errorMessage = lang === 'fr' 
        ? 'Impossible de récupérer la comparaison TC. Vérifiez la connexion et réessayez.'
        : 'Unable to retrieve TC comparison. Verify connection and try again.';
      
      if (err && typeof err === 'object') {
        const errObj = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
        
        if (errObj?.response?.status === 401) {
          errorMessage = lang === 'fr' ? 'Non autorisé' : 'Unauthorized';
        } else if (errObj?.response?.status === 404) {
          errorMessage = lang === 'fr' 
            ? 'Aucune donnée TC disponible pour cet aéronef.'
            : 'No TC data available for this aircraft.';
        } else if (errObj?.response?.data?.detail) {
          errorMessage = errObj.response.data.detail;
        }
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

  // Filter items by status - SAFE (always arrays)
  const foundItems = useMemo(() => {
    const comparison = safeArray<ComparisonItem>(data?.comparison);
    return comparison.filter(i => i?.status === 'OK');
  }, [data?.comparison]);

  const missingItems = useMemo(() => {
    const comparison = safeArray<ComparisonItem>(data?.comparison);
    return comparison.filter(i => i?.status === 'MISSING');
  }, [data?.comparison]);

  const dueSoonItems = useMemo(() => {
    const comparison = safeArray<ComparisonItem>(data?.comparison);
    return comparison.filter(i => i?.status === 'DUE_SOON');
  }, [data?.comparison]);

  const newTcItems = useMemo(() => {
    const newItems = safeArray<ComparisonItem>(data?.new_tc_items);
    return newItems.filter(i => i?.ref);
  }, [data?.new_tc_items]);

  // Separate by type
  const adItems = useMemo(() => {
    const comparison = safeArray<ComparisonItem>(data?.comparison);
    return comparison.filter(i => i?.type === 'AD');
  }, [data?.comparison]);

  const sbItems = useMemo(() => {
    const comparison = safeArray<ComparisonItem>(data?.comparison);
    return comparison.filter(i => i?.type === 'SB');
  }, [data?.comparison]);

  // Open TC URL
  const handleOpenSource = useCallback((url?: string) => {
    if (url && typeof url === 'string') {
      Linking.openURL(url).catch(err => {
        console.warn('[TC AD/SB] Failed to open URL:', err);
      });
    }
  }, []);

  // Render single item card - FULLY PROTECTED
  const renderItem = useCallback((item: ComparisonItem | null | undefined, index: number) => {
    if (!item) return null;
    
    // Safe extract all fields
    const itemRef = safeString(item.ref, 'N/A');
    const itemTitle = safeString(item.title, '');
    const itemType = item.type === 'SB' ? 'SB' : 'AD';
    const itemStatus = item.status || 'OK';
    const lastRecorded = item.last_recorded_date || '—';
    const nextDue = item.next_due || '—';
    const recurrenceYears = item.recurrence_years;
    const recurrenceHours = item.recurrence_hours;
    const tcUrl = item.tc_url;
    
    const statusStyle = getStatusStyle(itemStatus, itemType);
    const isAD = itemType === 'AD';
    const itemKey = `${itemRef}-${index}`;
    
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
              {getStatusText(itemStatus, lang)}
            </Text>
          </View>
          {itemStatus === 'NEW' && (
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

        {/* Dates - protected rendering */}
        {(lastRecorded !== '—' || nextDue !== '—' || recurrenceYears || recurrenceHours) && (
          <View style={styles.datesContainer}>
            {lastRecorded !== '—' && (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>
                  {lang === 'fr' ? 'Dernier enregistré:' : 'Last recorded:'}
                </Text>
                <Text style={styles.dateValue}>{lastRecorded}</Text>
              </View>
            )}
            {nextDue !== '—' && (
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>
                  {lang === 'fr' ? 'Prochaine échéance:' : 'Next due:'}
                </Text>
                <Text style={[
                  styles.dateValue, 
                  itemStatus === 'DUE_SOON' ? { color: COLORS.orange } : undefined
                ]}>
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
              <Text style={styles.sourceButtonText}>
                {lang === 'fr' ? 'Voir source TC' : 'View TC source'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [lang, handleOpenSource]);

  // Render summary stats
  const renderSummary = useCallback(() => {
    if (!data) return null;
    
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.greenBg }]}>
            <Text style={[styles.summaryValue, { color: COLORS.green }]}>{foundItems.length}</Text>
            <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Trouvés' : 'Found'}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.orangeBg }]}>
            <Text style={[styles.summaryValue, { color: COLORS.orange }]}>{dueSoonItems.length}</Text>
            <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Bientôt dûs' : 'Due soon'}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.redBg }]}>
            <Text style={[styles.summaryValue, { color: COLORS.red }]}>{missingItems.length}</Text>
            <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Manquants' : 'Missing'}</Text>
          </View>
          {newTcItems.length > 0 && (
            <View style={[styles.summaryCard, { backgroundColor: COLORS.blueBg }]}>
              <Text style={[styles.summaryValue, { color: COLORS.blue }]}>{newTcItems.length}</Text>
              <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Nouveaux' : 'New'}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [data, foundItems.length, dueSoonItems.length, missingItems.length, newTcItems.length, lang]);

  // Render content based on state
  const renderContent = useCallback(() => {
    // Loading state
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {lang === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      );
    }

    // Error state
    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          
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

    // Empty comparison - no TC data
    const comparison = safeArray<ComparisonItem>(data?.comparison);
    if (comparison.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>
            {lang === 'fr' 
              ? 'Aucun AD/SB TC disponible pour cet aéronef.'
              : 'No TC AD/SB available for this aircraft.'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {lang === 'fr'
              ? 'Scannez des rapports de maintenance pour alimenter les données.'
              : 'Scan maintenance reports to populate data.'}
          </Text>
          
          <View style={styles.infoOnlyBanner}>
            <Text style={styles.infoOnlyText}>
              {lang === 'fr'
                ? 'Informatif seulement — vérifiez avec les registres officiels et votre TEA.'
                : 'Informational only — verify with official records and your AME/TEA.'}
            </Text>
          </View>
        </View>
      );
    }

    // Data loaded - render content
    return (
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        bounces={true}
        overScrollMode="always"
        removeClippedSubviews={Platform.OS === 'ios'}
      >
        {/* Summary stats */}
        {renderSummary()}

        {/* New TC items alert */}
        {newTcItems.length > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertIcon}>🆕</Text>
            <Text style={styles.alertText}>
              {lang === 'fr' 
                ? `${newTcItems.length} nouveau(x) AD/SB publiés par TC`
                : `${newTcItems.length} new AD/SB published by TC`}
            </Text>
          </View>
        )}

        {/* AD Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.adSectionHeader]}>
            <Text style={[styles.sectionTitle, styles.adSectionTitle]}>
              {lang === 'fr' ? 'Consignes de navigabilité (AD)' : 'Airworthiness Directives (AD)'}
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
              <Text style={styles.emptySectionText}>
                {lang === 'fr' ? 'Aucun AD' : 'No AD'}
              </Text>
            </View>
          )}
        </View>

        {/* SB Section */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.sbSectionHeader]}>
            <Text style={[styles.sectionTitle, styles.sbSectionTitle]}>
              {lang === 'fr' ? 'Bulletins de service (SB)' : 'Service Bulletins (SB)'}
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
              <Text style={styles.emptySectionText}>
                {lang === 'fr' ? 'Aucun SB' : 'No SB'}
              </Text>
            </View>
          )}
        </View>

        {/* Disclaimer - ALWAYS displayed */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {safeString(data?.disclaimer, lang === 'fr'
              ? 'Informatif seulement — vérifiez avec les registres officiels de Transports Canada et votre TEA.'
              : 'Informational only — verify with official Transport Canada records and your AME/TEA.')}
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  }, [isLoading, error, data, newTcItems, adItems, sbItems, renderItem, renderSummary, fetchData, lang]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} activeOpacity={0.7}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {lang === 'fr' ? 'Comparaison TC AD/SB' : 'TC AD/SB Comparison'}
          </Text>
          <Text style={styles.headerSubtitle}>{safeString(registration, 'Aircraft')}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitleText}>
          {lang === 'fr' 
            ? 'Comparaison avec le registre Transport Canada'
            : 'Comparison with Transport Canada registry'}
        </Text>
      </View>

      {/* Main content */}
      {renderContent()}
    </View>
  );
}

// ============================================================
// EXPORT WITH ERROR BOUNDARY
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
    flex: 1,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 17,
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
  // Summary
  summaryContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // Center container
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
    maxWidth: 300,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
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
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blueBg,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  alertIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.blue,
    fontWeight: '600',
  },
  // Section
  section: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionCount: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  adSectionHeader: { backgroundColor: COLORS.redBg },
  adSectionTitle: { color: COLORS.red },
  adSectionCountText: { color: COLORS.red },
  sbSectionHeader: { backgroundColor: COLORS.blueBg },
  sbSectionTitle: { color: COLORS.blue },
  sbSectionCountText: { color: COLORS.blue },
  emptySection: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptySectionText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  itemsContainer: {
    flexDirection: 'column',
  },
  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: COLORS.blue,
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
    marginBottom: 10,
  },
  // Dates
  datesContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dateValue: {
    fontSize: 12,
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
  },
  sourceButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  sourceButtonText: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: '600',
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    margin: 16,
    padding: 14,
    backgroundColor: COLORS.alertYellow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.alertYellowBorder,
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 40,
  },
});
