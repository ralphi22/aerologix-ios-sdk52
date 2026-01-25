/**
 * AD/SB TC Baseline Screen - TC-SAFE Documentary Display
 * 
 * ENDPOINT: /api/adsb/baseline/{aircraft_id}
 * IMPORT: POST /api/adsb/tc/import-pdf/{aircraft_id}
 * 
 * CRITICAL RULES:
 * - NO live lookup logic
 * - Backend returns pre-computed MongoDB data
 * - Frontend displays ONLY what backend returns
 * - NO compliance determination
 * - NO business logic
 * - PDF import = send to backend, no parsing
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
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'Imported Reference',
    sectionTitle: 'Airworthiness Directives & Service Bulletins',
    adSection: 'Airworthiness Directives (AD)',
    sbSection: 'Service Bulletins (SB)',
    seenTimes: 'Seen',
    times: 'time(s)',
    notFoundInRecords: 'Not found in your scanned documents',
    notFoundMicrocopy: 'This does not indicate compliance status.',
    noItemsReturned: 'No AD or SB data available for this aircraft type.',
    disclaimer: 'Informational only. This tool does not determine airworthiness or compliance. Verification with official Transport Canada records and a licensed AME is required.',
    loading: 'Loading AD/SB data...',
    error: 'Unable to retrieve AD/SB data at this time.',
    retry: 'Retry',
    aircraft: 'Aircraft',
    total: 'Total',
    recurrence: 'Recurrence',
    // PDF Import - Phase 1
    importPdfButton: 'Import Transport Canada PDF',
    importPdfUploading: 'Importing...',
    importPdfSuccess: 'PDF imported. References updated.',
    importPdfError: 'Unable to import PDF. Please try again.',
    importPdfDisclaimer: 'Imported files come from official documents selected by the user. No compliance or airworthiness determination is performed.',
  },
  fr: {
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'Référence importée',
    sectionTitle: 'Consignes de navigabilité & Bulletins de service',
    adSection: 'Consignes de navigabilité (AD)',
    sbSection: 'Bulletins de service (SB)',
    seenTimes: 'Vu',
    times: 'fois',
    notFoundInRecords: 'Non trouvé dans vos documents scannés',
    notFoundMicrocopy: 'Ceci n\'indique pas un statut de conformité.',
    noItemsReturned: "Aucune donnée AD ou SB disponible pour ce type d'aéronef.",
    disclaimer: 'Informatif seulement. Cet outil ne détermine pas la navigabilité ou la conformité. Vérification avec les registres officiels de Transport Canada et un TEA agréé requise.',
    loading: 'Chargement des données AD/SB...',
    error: 'Impossible de récupérer les données AD/SB.',
    retry: 'Réessayer',
    aircraft: 'Aéronef',
    total: 'Total',
    recurrence: 'Récurrence',
    // PDF Import - Phase 1
    importPdfButton: 'Importer PDF Transport Canada',
    importPdfUploading: 'Importation...',
    importPdfSuccess: 'PDF importé. Références mises à jour.',
    importPdfError: 'Impossible d\'importer le PDF. Veuillez réessayer.',
    importPdfDisclaimer: 'Les fichiers importés proviennent de documents officiels sélectionnés par l\'utilisateur. Aucune décision de conformité ou de navigabilité n\'est effectuée.',
  },
};

// ============================================================
// TYPES - BACKEND BASELINE CONTRACT
// ============================================================

/**
 * Single AD or SB item from backend baseline
 * count_seen = how many times found in scanned OCR records
 * origin = source of the reference (TC_BASELINE, USER_IMPORTED_REFERENCE, etc.)
 */
interface ADSBBaselineItem {
  ref: string;
  type: 'AD' | 'SB';
  title: string;
  recurrence?: string;
  count_seen: number;
  origin?: string; // TC_BASELINE, USER_IMPORTED_REFERENCE, etc.
}

/**
 * Response from GET /api/adsb/baseline/{aircraft_id}
 * Pre-computed MongoDB data - NO live lookup
 * 
 * Backend may return:
 * - items[] (legacy format)
 * - ad_list[] + sb_list[] (new format)
 */
interface ADSBBaselineResponse {
  aircraft: {
    manufacturer: string;
    model: string;
  };
  // Legacy format
  items?: ADSBBaselineItem[];
  // New format with separate lists
  ad_list?: ADSBBaselineItem[];
  sb_list?: ADSBBaselineItem[];
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
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ADSBBaselineResponse | null>(null);

  /**
   * Phase 1: Import TC PDF
   * - Opens iOS document picker (PDF only, multi-select)
   * - Sends each file to backend via POST /api/adsb/tc/import-pdf/{aircraftId}
   * - NO parsing, NO logic, just network orchestration
   * - Refreshes baseline data after success
   */
  const handleImportPdf = async () => {
    if (!aircraftId) return;

    try {
      // Open document picker - PDF only, allow multiple
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      // User cancelled - exit silently
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsImporting(true);

      // Upload each selected PDF
      let successCount = 0;
      let errorCount = 0;

      for (const asset of result.assets) {
        try {
          // Build FormData for multipart upload
          const formData = new FormData();
          formData.append('file', {
            uri: asset.uri,
            type: 'application/pdf',
            name: asset.name || 'tc_document.pdf',
          } as any);

          // POST to backend - no parsing on frontend
          await api.post(`/api/adsb/tc/import-pdf/${aircraftId}`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          successCount++;
          console.log(`[TC Import] Uploaded: ${asset.name}`);
        } catch (uploadErr) {
          errorCount++;
          console.warn(`[TC Import] Failed to upload: ${asset.name}`, uploadErr);
        }
      }

      setIsImporting(false);

      // Show result
      if (successCount > 0) {
        Alert.alert('', texts.importPdfSuccess);
        // Refresh baseline data from backend
        fetchBaseline(true);
      } else if (errorCount > 0) {
        Alert.alert('', texts.importPdfError);
      }
    } catch (err) {
      console.error('[TC Import] Error:', err);
      setIsImporting(false);
      Alert.alert('', texts.importPdfError);
    }
  };

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

  // ============================================================
  // EXTRACT AD & SB LISTS - Support both legacy and new format
  // NO FILTERING ON ORIGIN - Display ALL items regardless of origin
  // ============================================================
  
  // New format: ad_list / sb_list (preferred)
  // Legacy format: items[] filtered by type
  const adItems: ADSBBaselineItem[] = (() => {
    if (data?.ad_list && data.ad_list.length > 0) {
      return data.ad_list;
    }
    if (data?.items) {
      return data.items.filter(item => item.type === 'AD');
    }
    return [];
  })();

  const sbItems: ADSBBaselineItem[] = (() => {
    if (data?.sb_list && data.sb_list.length > 0) {
      return data.sb_list;
    }
    if (data?.items) {
      return data.items.filter(item => item.type === 'SB');
    }
    return [];
  })();

  // Check if we have ANY data to display (corrected condition)
  const hasData = adItems.length > 0 || sbItems.length > 0;

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
              <Text style={styles.notFoundMicrocopy}>
                {texts.notFoundMicrocopy}
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

    if (!data || !hasData) {
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

          {/* Phase 1: Import PDF Button */}
          <TouchableOpacity 
            style={[styles.importButton, isImporting && styles.importButtonDisabled]} 
            onPress={handleImportPdf} 
            activeOpacity={0.7}
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.importButtonText}>{texts.importPdfUploading}</Text>
              </>
            ) : (
              <>
                <Ionicons name="document-attach-outline" size={20} color={COLORS.primary} />
                <Text style={styles.importButtonText}>{texts.importPdfButton}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Import Disclaimer - TC-SAFE */}
          <Text style={styles.importDisclaimer}>{texts.importPdfDisclaimer}</Text>

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

        {/* Phase 1: Import PDF Button */}
        <TouchableOpacity 
          style={[styles.importButton, isImporting && styles.importButtonDisabled]} 
          onPress={handleImportPdf} 
          activeOpacity={0.7}
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.importButtonText}>{texts.importPdfUploading}</Text>
            </>
          ) : (
            <>
              <Ionicons name="document-attach-outline" size={20} color={COLORS.primary} />
              <Text style={styles.importButtonText}>{texts.importPdfButton}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Import Disclaimer - TC-SAFE */}
        <Text style={styles.importDisclaimer}>{texts.importPdfDisclaimer}</Text>

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
          <Text style={styles.headerTitle}>{texts.screenTitle}</Text>
          <Text style={styles.headerSubtitle}>{texts.screenSubtitle}</Text>
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
  notFoundMicrocopy: { fontSize: 8, color: COLORS.textMuted, marginTop: 2, textAlign: 'center', maxWidth: 90, lineHeight: 10, fontStyle: 'italic' },
  importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 8 },
  importButtonDisabled: { opacity: 0.6 },
  importButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.primary, marginLeft: 8 },
  importDisclaimer: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginBottom: 16, paddingHorizontal: 12, lineHeight: 16, fontStyle: 'italic' },
  bottomSpacer: { height: 40 },
});
