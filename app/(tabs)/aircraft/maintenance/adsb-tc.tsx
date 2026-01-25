/**
 * TC AD/SB Page 2 - User Imported PDF References ONLY
 * 
 * DISPLAYS ONLY:
 * - Items with origin === 'USER_IMPORTED_REFERENCE'
 * - Items with pdf_available === true
 * 
 * ENDPOINTS:
 * - GET /api/adsb/baseline/{aircraft_id} - Fetch all data
 * - GET /api/adsb/tc/pdf/{aircraft_id}/{identifier} - Open PDF
 * - DELETE /api/adsb/tc/reference/{aircraft_id}/{identifier} - Remove reference
 * - POST /api/adsb/tc/import-pdf/{aircraft_id} - Import new PDF
 * 
 * CRITICAL RULES:
 * - NO compliance determination
 * - NO regulatory wording
 * - TC-SAFE neutral language only
 * - OCR data is completely separate (Page 1)
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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getLanguage } from '@/i18n';
import api from '@/services/api';

// Transport Canada search URL
const TC_SEARCH_URL = 'https://wwwapps.tc.gc.ca/Saf-Sec-Sur/2/cawis-swimc/AD-CN-lst-eng.aspx';

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
  pdfBlue: '#2196F3',
  pdfBlueBg: '#E3F2FD',
};

// ============================================================
// BILINGUAL TEXTS (TC-SAFE - Neutral wording only)
// ============================================================
const TEXTS = {
  en: {
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'Imported References',
    sectionTitle: 'Your Imported PDF References',
    adSection: 'Airworthiness Directives (AD)',
    sbSection: 'Service Bulletins (SB)',
    seenTimes: 'Seen in OCR',
    times: 'time(s)',
    notFoundInRecords: 'Not found in your scanned documents',
    notFoundMicrocopy: 'This does not indicate compliance status.',
    noImportedReferences: 'No imported PDF references yet.',
    noImportedHint: 'Use the button above to import Transport Canada PDF documents.',
    disclaimer: 'Informational only. This tool does not determine airworthiness or compliance. Verification with official Transport Canada records and a licensed AME is required.',
    loading: 'Loading references...',
    error: 'Unable to retrieve data at this time.',
    retry: 'Retry',
    aircraft: 'Aircraft',
    total: 'Total',
    recurrence: 'Recurrence',
    // PDF Import
    importPdfButton: 'Import Transport Canada PDF',
    importPdfUploading: 'Importing...',
    importPdfSuccess: 'PDF imported. References updated.',
    importPdfError: 'Unable to import PDF. Please try again.',
    importPdfDisclaimer: 'Imported files come from official documents selected by the user. No compliance or airworthiness determination is performed.',
    // Card actions
    openPdf: 'View PDF',
    deleteReference: 'Remove',
    searchOnTc: 'Search on Transport Canada',
    deleteConfirmTitle: 'Remove Reference',
    deleteConfirmMessage: 'This removes the reference from your workspace only. The original TC document is not affected.',
    deleteConfirmCancel: 'Cancel',
    deleteConfirmOk: 'Remove',
    deleteSuccess: 'Reference removed.',
    deleteError: 'Unable to remove reference.',
    pdfError: 'Unable to open PDF.',
    // Card disclaimer
    cardDisclaimer: 'Imported reference for document review. This does not indicate compliance or airworthiness status.',
    // Badge
    pdfBadge: 'PDF',
  },
  fr: {
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'Références importées',
    sectionTitle: 'Vos références PDF importées',
    adSection: 'Consignes de navigabilité (AD)',
    sbSection: 'Bulletins de service (SB)',
    seenTimes: 'Vu dans OCR',
    times: 'fois',
    notFoundInRecords: 'Non trouvé dans vos documents scannés',
    notFoundMicrocopy: 'Ceci n\'indique pas un statut de conformité.',
    noImportedReferences: 'Aucune référence PDF importée.',
    noImportedHint: 'Utilisez le bouton ci-dessus pour importer des documents PDF Transport Canada.',
    disclaimer: 'Informatif seulement. Cet outil ne détermine pas la navigabilité ou la conformité. Vérification avec les registres officiels de Transport Canada et un TEA agréé requise.',
    loading: 'Chargement des références...',
    error: 'Impossible de récupérer les données.',
    retry: 'Réessayer',
    aircraft: 'Aéronef',
    total: 'Total',
    recurrence: 'Récurrence',
    // PDF Import
    importPdfButton: 'Importer PDF Transport Canada',
    importPdfUploading: 'Importation...',
    importPdfSuccess: 'PDF importé. Références mises à jour.',
    importPdfError: 'Impossible d\'importer le PDF. Veuillez réessayer.',
    importPdfDisclaimer: 'Les fichiers importés proviennent de documents officiels sélectionnés par l\'utilisateur. Aucune décision de conformité ou de navigabilité n\'est effectuée.',
    // Card actions
    openPdf: 'Voir PDF',
    deleteReference: 'Supprimer',
    searchOnTc: 'Rechercher sur Transport Canada',
    deleteConfirmTitle: 'Supprimer la référence',
    deleteConfirmMessage: 'Ceci supprime la référence de votre espace de travail uniquement. Le document TC original n\'est pas affecté.',
    deleteConfirmCancel: 'Annuler',
    deleteConfirmOk: 'Supprimer',
    deleteSuccess: 'Référence supprimée.',
    deleteError: 'Impossible de supprimer la référence.',
    pdfError: 'Impossible d\'ouvrir le PDF.',
    // Card disclaimer
    cardDisclaimer: 'Référence importée pour révision documentaire. Ceci n\'indique pas un statut de conformité ou de navigabilité.',
    // Badge
    pdfBadge: 'PDF',
  },
};

// ============================================================
// TYPES - BACKEND BASELINE CONTRACT
// ============================================================

/**
 * Single AD or SB item from backend baseline
 * 
 * For USER_IMPORTED_REFERENCE items:
 * - origin = 'USER_IMPORTED_REFERENCE'
 * - pdf_available = true
 * - identifier = unique ID for PDF/delete operations
 */
interface ADSBBaselineItem {
  ref: string;
  identifier?: string; // Used for PDF/delete API calls
  type: 'AD' | 'SB';
  title: string;
  recurrence?: string;
  count_seen: number;
  origin?: string; // 'USER_IMPORTED_REFERENCE' | 'TC_BASELINE' | etc.
  pdf_available?: boolean;
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
  // PDF & DELETE HANDLERS
  // ============================================================

  /**
   * Open PDF for a reference
   * GET /api/adsb/tc/pdf/{aircraft_id}/{identifier}
   */
  const handleOpenPdf = async (identifier: string) => {
    if (!aircraftId || !identifier) return;
    
    try {
      // Get PDF URL from backend
      const response = await api.get(`/api/adsb/tc/pdf/${aircraftId}/${encodeURIComponent(identifier)}`);
      
      if (response.data?.url) {
        await Linking.openURL(response.data.url);
      } else {
        Alert.alert('', texts.pdfError);
      }
    } catch (err) {
      console.error('[PDF Open] Error:', err);
      Alert.alert('', texts.pdfError);
    }
  };

  /**
   * Delete a reference from workspace
   * DELETE /api/adsb/tc/reference/{aircraft_id}/{identifier}
   */
  const handleDeleteReference = (identifier: string, ref: string) => {
    if (!aircraftId || !identifier) return;

    Alert.alert(
      texts.deleteConfirmTitle,
      texts.deleteConfirmMessage,
      [
        { text: texts.deleteConfirmCancel, style: 'cancel' },
        {
          text: texts.deleteConfirmOk,
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/adsb/tc/reference/${aircraftId}/${encodeURIComponent(identifier)}`);
              Alert.alert('', texts.deleteSuccess);
              // Refresh data
              fetchBaseline(true);
            } catch (err) {
              console.error('[Delete Reference] Error:', err);
              Alert.alert('', texts.deleteError);
            }
          },
        },
      ]
    );
  };

  /**
   * Open Transport Canada search page
   */
  const handleSearchOnTc = () => {
    Linking.openURL(TC_SEARCH_URL);
  };

  // ============================================================
  // FILTER: ONLY USER IMPORTED PDF REFERENCES
  // ============================================================
  
  // Combine all items from both formats
  const allItems: ADSBBaselineItem[] = (() => {
    const items: ADSBBaselineItem[] = [];
    
    // From ad_list
    if (data?.ad_list) {
      items.push(...data.ad_list);
    }
    // From sb_list
    if (data?.sb_list) {
      items.push(...data.sb_list);
    }
    // From legacy items (if no ad_list/sb_list)
    if (items.length === 0 && data?.items) {
      items.push(...data.items);
    }
    
    return items;
  })();

  // FILTER: Only show USER_IMPORTED_REFERENCE with pdf_available
  const userImportedItems = allItems.filter(item => 
    item.origin === 'USER_IMPORTED_REFERENCE' && 
    item.pdf_available === true
  );

  // Split by type for display
  const importedAdItems = userImportedItems.filter(item => item.type === 'AD');
  const importedSbItems = userImportedItems.filter(item => item.type === 'SB');

  // Check if we have imported data to display
  const hasImportedData = userImportedItems.length > 0;

  // ============================================================
  // RENDER SINGLE IMPORTED ITEM CARD
  // ============================================================
  const renderImportedCard = (item: ADSBBaselineItem, index: number) => {
    const isAD = item.type === 'AD';
    const notFoundInOcr = item.count_seen === 0;
    const identifier = item.identifier || item.ref;
    
    return (
      <View 
        key={`${item.type}-${item.ref}-${index}`}
        style={styles.importedCard}
      >
        {/* Header Row: Type Badge + Ref + PDF Badge */}
        <View style={styles.cardHeader}>
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
          
          <Text style={styles.cardRef}>{item.ref}</Text>
          
          {/* PDF Badge - Always shown for imported items */}
          <View style={styles.pdfBadge}>
            <Ionicons name="document" size={12} color={COLORS.pdfBlue} />
            <Text style={styles.pdfBadgeText}>{texts.pdfBadge}</Text>
          </View>
        </View>

        {/* Title if available */}
        {item.title && (
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        )}

        {/* Recurrence if available */}
        {item.recurrence && (
          <View style={styles.recurrenceRow}>
            <Ionicons name="repeat" size={12} color={COLORS.textMuted} />
            <Text style={styles.recurrenceText}>{texts.recurrence}: {item.recurrence}</Text>
          </View>
        )}

        {/* OCR Status Badge */}
        <View style={styles.ocrStatusRow}>
          {notFoundInOcr ? (
            <View style={styles.ocrNotFoundBadge}>
              <Ionicons name="alert-circle" size={14} color={COLORS.warningOrange} />
              <Text style={styles.ocrNotFoundText}>{texts.notFoundInRecords}</Text>
            </View>
          ) : (
            <View style={styles.ocrFoundBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.successGreen} />
              <Text style={styles.ocrFoundText}>{texts.seenTimes} {item.count_seen} {texts.times}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          {/* View PDF Button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleOpenPdf(identifier)}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>{texts.openPdf}</Text>
          </TouchableOpacity>

          {/* Search on TC Button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSearchOnTc}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>TC</Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteReference(identifier, item.ref)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.adRed} />
            <Text style={[styles.actionButtonText, { color: COLORS.adRed }]}>{texts.deleteReference}</Text>
          </TouchableOpacity>
        </View>

        {/* TC-Safe Disclaimer under each card */}
        <Text style={styles.cardDisclaimer}>{texts.cardDisclaimer}</Text>
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

    // EMPTY STATE: No imported PDF references
    if (!hasImportedData) {
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

          {/* Import PDF Button */}
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

          {/* Import Disclaimer */}
          <Text style={styles.importDisclaimer}>{texts.importPdfDisclaimer}</Text>

          {/* Search on TC Link */}
          <TouchableOpacity style={styles.tcSearchButton} onPress={handleSearchOnTc} activeOpacity={0.7}>
            <Ionicons name="search" size={18} color={COLORS.primary} />
            <Text style={styles.tcSearchButtonText}>{texts.searchOnTc}</Text>
          </TouchableOpacity>

          {/* Empty state */}
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{texts.noImportedReferences}</Text>
            <Text style={styles.emptySubtitle}>{texts.noImportedHint}</Text>
          </View>
        </ScrollView>
      );
    }

    // SUCCESS STATE: Show imported PDF references
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

        {/* Import PDF Button */}
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

        {/* Import Disclaimer */}
        <Text style={styles.importDisclaimer}>{texts.importPdfDisclaimer}</Text>

        {/* Search on TC Link */}
        <TouchableOpacity style={styles.tcSearchButton} onPress={handleSearchOnTc} activeOpacity={0.7}>
          <Ionicons name="search" size={18} color={COLORS.primary} />
          <Text style={styles.tcSearchButtonText}>{texts.searchOnTc}</Text>
        </TouchableOpacity>

        {/* Counters */}
        <View style={styles.countersContainer}>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.pdfBlueBg }]}>
            <Ionicons name="document" size={14} color={COLORS.pdfBlue} />
            <Text style={[styles.counterText, { color: COLORS.pdfBlue, marginLeft: 4 }]}>
              {userImportedItems.length} PDF
            </Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.adRedBg }]}>
            <Text style={[styles.counterText, { color: COLORS.adRed }]}>AD: {importedAdItems.length}</Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.sbBlueBg }]}>
            <Text style={[styles.counterText, { color: COLORS.sbBlue }]}>SB: {importedSbItems.length}</Text>
          </View>
        </View>

        {/* AD Section */}
        {importedAdItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: COLORS.adRedBg }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.adRed }]}>{texts.adSection}</Text>
              <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.white }]}>
                <Text style={[styles.sectionCountText, { color: COLORS.adRed }]}>{importedAdItems.length}</Text>
              </View>
            </View>
            <View style={styles.cardsList}>
              {importedAdItems.map((item, index) => renderImportedCard(item, index))}
            </View>
          </View>
        )}

        {/* SB Section */}
        {importedSbItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: COLORS.sbBlueBg }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.sbBlue }]}>{texts.sbSection}</Text>
              <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.white }]}>
                <Text style={[styles.sectionCountText, { color: COLORS.sbBlue }]}>{importedSbItems.length}</Text>
              </View>
            </View>
            <View style={styles.cardsList}>
              {importedSbItems.map((item, index) => renderImportedCard(item, index))}
            </View>
          </View>
        )}

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
  itemRefRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  itemRef: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  importedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  importedBadgeText: { fontSize: 9, fontWeight: '600', color: COLORS.primary, marginLeft: 2 },
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
  importDisclaimer: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginBottom: 12, paddingHorizontal: 12, lineHeight: 16, fontStyle: 'italic' },
  // TC Search Button
  tcSearchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 16 },
  tcSearchButtonText: { fontSize: 14, fontWeight: '500', color: COLORS.primary, marginLeft: 6 },
  // Imported Card Styles
  cardsList: { gap: 12 },
  importedCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.pdfBlue, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardRef: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginLeft: 10 },
  cardTitle: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 8 },
  // PDF Badge
  pdfBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.pdfBlueBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pdfBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.pdfBlue, marginLeft: 4 },
  // OCR Status badges
  ocrStatusRow: { marginBottom: 12 },
  ocrNotFoundBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warningOrangeBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  ocrNotFoundText: { fontSize: 11, color: COLORS.warningOrange, marginLeft: 6, fontWeight: '500' },
  ocrFoundBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.successGreenBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  ocrFoundText: { fontSize: 11, color: COLORS.successGreen, marginLeft: 6, fontWeight: '500' },
  // Action buttons
  cardActions: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
  deleteButton: { backgroundColor: COLORS.adRedBg },
  actionButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  // Card disclaimer
  cardDisclaimer: { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic', lineHeight: 14 },
  bottomSpacer: { height: 40 },
});
