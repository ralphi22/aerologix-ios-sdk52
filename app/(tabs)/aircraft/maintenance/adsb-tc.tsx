/**
 * AD/SB TC Baseline Screen - TC-SAFE Documentary Display
 * 
 * ENDPOINT: /api/adsb/baseline/{aircraft_id}
 * 
 * CRITICAL RULES:
 * - NO live lookup logic
 * - Backend returns pre-computed MongoDB data
 * - Frontend displays ONLY what backend returns
 * - NO compliance determination
 * - NO business logic
 * 
 * DISPLAY:
 * - One row per AD/SB
 * - Show count_seen from backend
 * - Highlight items where count_seen = 0
 * - Neutral wording only
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getLanguage } from '@/i18n';
import api from '@/services/api';

// ============================================================
// COLORS
// ============================================================
const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  border: '#E0E0E0',
  adRed: '#E53935',
  adRedBg: '#FFEBEE',
  sbBlue: '#1976D2',
  sbBlueBg: '#E3F2FD',
  warningOrange: '#FF9800',
  warningOrangeBg: '#FFF3E0',
  successGreen: '#43A047',
  successGreenBg: '#E8F5E9',
  disclaimerYellow: '#FFF8E1',
  disclaimerYellowBorder: '#FFE082',
};

// ============================================================
// BILINGUAL TEXTS (TC-SAFE - Neutral wording only)
// ============================================================
const TEXTS = {
  en: {
    title: 'AD / SB',
    sectionTitle: 'Airworthiness Directives & Service Bulletins',
    adSection: 'Airworthiness Directives (AD)',
    sbSection: 'Service Bulletins (SB)',
    seenTimes: 'Seen',
    times: 'time(s)',
    notFoundInRecords: 'Not found in scanned records',
    noItemsReturned: 'No AD or SB data available for this aircraft type.',
    disclaimer: 'Informational only. This tool does not determine airworthiness or compliance. Verification with official Transport Canada records and a licensed AME is required.',
    loading: 'Loading AD/SB data...',
    error: 'Unable to retrieve AD/SB data at this time.',
    retry: 'Retry',
    aircraft: 'Aircraft',
    total: 'Total',
    recurrence: 'Recurrence',
  },
  fr: {
    title: 'AD / SB',
    sectionTitle: 'Consignes de navigabilité & Bulletins de service',
    adSection: 'Consignes de navigabilité (AD)',
    sbSection: 'Bulletins de service (SB)',
    seenTimes: 'Vu',
    times: 'fois',
    notFoundInRecords: 'Non trouvé dans les documents numérisés',
    noItemsReturned: "Aucune donnée AD ou SB disponible pour ce type d'aéronef.",
    disclaimer: 'Informatif seulement. Cet outil ne détermine pas la navigabilité ou la conformité. Vérification avec les registres officiels de Transport Canada et un TEA agréé requise.',
    loading: 'Chargement des données AD/SB...',
    error: 'Impossible de récupérer les données AD/SB.',
    retry: 'Réessayer',
    aircraft: 'Aéronef',
    total: 'Total',
    recurrence: 'Récurrence',
  },
};

// ============================================================
// TYPES - BACKEND BASELINE CONTRACT
// ============================================================

/**
 * Single AD or SB item from backend baseline
 * count_seen = how many times found in scanned OCR records
 */
interface ADSBBaselineItem {
  ref: string;
  type: 'AD' | 'SB';
  title: string;
  recurrence?: string;
  count_seen: number;
}

/**
 * Response from GET /api/adsb/baseline/{aircraft_id}
 * Pre-computed MongoDB data - NO live lookup
 */
interface ADSBBaselineResponse {
  aircraft: {
    manufacturer: string;
    model: string;
  };
  items: ADSBBaselineItem[];
  count: {
    ad: number;
    sb: number;
    total: number;
  };
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdSbTcScreen() {
  const router = useRouter();
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];
  
  const { aircraftId, registration } = useLocalSearchParams<{ 
    aircraftId: string; 
    registration: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ADSBBaselineResponse | null>(null);

  /**
   * Fetch AD/SB baseline from MongoDB
   * ENDPOINT: /api/adsb/baseline/{aircraft_id}
   * 
   * Called:
   * - 1x on mount
   * - 1x on manual refresh
   * 
   * NO live lookup, NO loop
   */
  const fetchBaseline = useCallback(async (showRefreshing = false) => {
    if (!aircraftId) {
      setError(texts.error);
      setIsLoading(false);
      return;
    }

    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // BASELINE ENDPOINT - MongoDB pre-computed data
      const response = await api.get(`/api/adsb/baseline/${aircraftId}`);
      
      // DEV LOG
      console.log('[AD/SB BASELINE]', response.data);
      
      // Store response as-is - NO transformation, NO logic
      setData(response.data as ADSBBaselineResponse);
      
    } catch (err: unknown) {
      console.warn('[AD/SB BASELINE] Error:', err);
      setError(texts.error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [aircraftId, texts.error]);

  // Single call on mount
  useEffect(() => {
    fetchBaseline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    fetchBaseline(true);
  }, [fetchBaseline]);

  // Split items by type
  const adItems = data?.items?.filter(item => item.type === 'AD') || [];
  const sbItems = data?.items?.filter(item => item.type === 'SB') || [];

  // ============================================================
  // RENDER SINGLE ITEM
  // ============================================================
  const renderItem = (item: ADSBBaselineItem, index: number) => {
    const isAD = item.type === 'AD';
    const notFound = item.count_seen === 0;
    
    return (
      <View 
        key={`${item.type}-${item.ref}-${index}`}
        style={[
          styles.itemRow,
          notFound && styles.itemRowWarning,
        ]}
      >
        {/* Left: Type Badge + Content */}
        <View style={styles.itemLeft}>
          <View style={[
            styles.typeBadge,
            { backgroundColor: isAD ? COLORS.adRedBg : COLORS.sbBlueBg }
          ]}>
            <Text style={[
              styles.typeBadgeText,
              { color: isAD ? COLORS.adRed : COLORS.sbBlue }
            ]}>
              {item.type}
            </Text>
          </View>
          
          <View style={styles.itemContent}>
            <Text style={styles.itemRef}>{item.ref}</Text>
            
            {item.title && (
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
            )}
            
            {item.recurrence && (
              <View style={styles.recurrenceRow}>
                <Ionicons name="repeat" size={12} color={COLORS.textMuted} />
                <Text style={styles.recurrenceText}>{texts.recurrence}: {item.recurrence}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right: Count Display */}
        <View style={styles.itemRight}>
          {notFound ? (
            <>
              <View style={styles.warningBadge}>
                <Ionicons name="alert-circle" size={16} color={COLORS.warningOrange} />
                <Text style={styles.warningCountText}>0</Text>
              </View>
              <Text style={styles.notFoundText}>
                {texts.notFoundInRecords}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.countBadge}>
                <Text style={styles.countNumber}>{item.count_seen}</Text>
              </View>
              <Text style={styles.countLabel}>
                {texts.seenTimes} {item.count_seen} {texts.times}
              </Text>
            </>
          )}
        </View>
      </View>
    );
  };

  // ============================================================
  // RENDER SECTION
  // ============================================================
  const renderSection = (title: string, items: ADSBBaselineItem[], type: 'AD' | 'SB') => {
    const isAD = type === 'AD';
    const missingCount = items.filter(i => i.count_seen === 0).length;
    
    return (
      <View style={styles.section}>
        <View style={[
          styles.sectionHeader,
          { backgroundColor: isAD ? COLORS.adRedBg : COLORS.sbBlueBg }
        ]}>
          <Text style={[
            styles.sectionTitle,
            { color: isAD ? COLORS.adRed : COLORS.sbBlue }
          ]}>
            {title}
          </Text>
          <View style={styles.sectionBadges}>
            <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.white }]}>
              <Text style={[
                styles.sectionCountText,
                { color: isAD ? COLORS.adRed : COLORS.sbBlue }
              ]}>
                {items.length}
              </Text>
            </View>
            {missingCount > 0 && (
              <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.warningOrangeBg }]}>
                <Ionicons name="alert-circle" size={12} color={COLORS.warningOrange} />
                <Text style={[styles.sectionCountText, { color: COLORS.warningOrange, marginLeft: 4 }]}>
                  {missingCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>
              {lang === 'fr' ? 'Aucun élément' : 'No items'}
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item, index) => renderItem(item, index))}
          </View>
        )}
      </View>
    );
  };

  // ============================================================
  // RENDER CONTENT
  // ============================================================
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{texts.loading}</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={COLORS.adRed} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchBaseline()}>
            <Text style={styles.retryButtonText}>{texts.retry}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!data || !data.items || data.items.length === 0) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        >
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={20} color="#5D4037" />
            <Text style={styles.disclaimerText}>{texts.disclaimer}</Text>
          </View>

          {data?.aircraft && (
            <View style={styles.aircraftInfo}>
              <Text style={styles.aircraftLabel}>{texts.aircraft}:</Text>
              <Text style={styles.aircraftText}>
                {data.aircraft.manufacturer} {data.aircraft.model}
              </Text>
            </View>
          )}

          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{lang === 'fr' ? 'Aucune donnée' : 'No Data'}</Text>
            <Text style={styles.emptySubtitle}>{texts.noItemsReturned}</Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={20} color="#5D4037" />
          <Text style={styles.disclaimerText}>{texts.disclaimer}</Text>
        </View>

        {data.aircraft && (
          <View style={styles.aircraftInfo}>
            <Text style={styles.aircraftLabel}>{texts.aircraft}:</Text>
            <Text style={styles.aircraftText}>
              {data.aircraft.manufacturer} {data.aircraft.model}
            </Text>
          </View>
        )}

        <View style={styles.countersContainer}>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.adRedBg }]}>
            <Text style={[styles.counterText, { color: COLORS.adRed }]}>AD: {data.count?.ad || adItems.length}</Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.sbBlueBg }]}>
            <Text style={[styles.counterText, { color: COLORS.sbBlue }]}>SB: {data.count?.sb || sbItems.length}</Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.background }]}>
            <Text style={[styles.counterText, { color: COLORS.textDark }]}>{texts.total}: {data.count?.total || data.items.length}</Text>
          </View>
        </View>

        {renderSection(texts.adSection, adItems, 'AD')}
        {renderSection(texts.sbSection, sbItems, 'SB')}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{texts.title}</Text>
          <Text style={styles.headerSubtitle}>{registration || ''}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.pageTitleContainer}>
        <Text style={styles.pageTitle}>{texts.sectionTitle}</Text>
      </View>

      {renderContent()}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  headerBack: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 2 },
  headerRight: { width: 44 },
  pageTitleContainer: { backgroundColor: COLORS.white, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pageTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, textAlign: 'center' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted },
  errorText: { marginTop: 16, fontSize: 16, color: COLORS.adRed, textAlign: 'center', maxWidth: 280 },
  retryButton: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '600', color: COLORS.textDark },
  emptySubtitle: { marginTop: 8, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', maxWidth: 300, lineHeight: 20 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  disclaimer: { flexDirection: 'row', backgroundColor: COLORS.disclaimerYellow, borderWidth: 1, borderColor: COLORS.disclaimerYellowBorder, borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#5D4037', lineHeight: 18 },
  aircraftInfo: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  aircraftLabel: { fontSize: 14, color: COLORS.textMuted, marginRight: 8 },
  aircraftText: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  countersContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  counterBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  counterText: { fontSize: 14, fontWeight: '700' },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  sectionBadges: { flexDirection: 'row', gap: 8 },
  sectionCountBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  sectionCountText: { fontSize: 13, fontWeight: '700' },
  emptySection: { backgroundColor: COLORS.white, borderRadius: 12, padding: 20, alignItems: 'center' },
  emptySectionText: { fontSize: 14, color: COLORS.textMuted },
  itemsList: { gap: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  itemRowWarning: { borderColor: COLORS.warningOrange, borderWidth: 2, backgroundColor: COLORS.warningOrangeBg },
  itemLeft: { flexDirection: 'row', flex: 1 },
  typeBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, marginRight: 12, alignSelf: 'flex-start' },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemRef: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  itemTitle: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 4 },
  recurrenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  recurrenceText: { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },
  itemRight: { alignItems: 'center', justifyContent: 'center', marginLeft: 12, minWidth: 80 },
  countBadge: { backgroundColor: COLORS.successGreenBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, minWidth: 40, alignItems: 'center' },
  countNumber: { fontSize: 18, fontWeight: '700', color: COLORS.successGreen },
  countLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  warningBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warningOrangeBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
  warningCountText: { fontSize: 16, fontWeight: '700', color: COLORS.warningOrange },
  notFoundText: { fontSize: 9, color: COLORS.warningOrange, marginTop: 4, textAlign: 'center', maxWidth: 90, lineHeight: 12 },
  bottomSpacer: { height: 40 },
});
