/**
 * TC AD/SB Page - Official Transport Canada References
 * 
 * DISPLAYS:
 * - TC_BASELINE items (official TC references)
 * - USER_IMPORTED_REFERENCE items (imported PDFs)
 * 
 * FEATURES:
 * - Badge "Seen" / "Not Seen" based on count_seen from backend
 * - Visual indication if AD/SB was found in scanned documents
 * 
 * ❌ NO compliance wording
 * ❌ NO regulatory interpretation
 * 
 * ENDPOINTS:
 * - GET /api/adsb/baseline/{aircraft_id} - Fetch data
 * - GET /api/adsb/tc/pdf/{pdf_id} - Download PDF (authenticated)
 * - DELETE /api/adsb/tc/reference/{tc_reference_id} - Remove reference
 * - POST /api/adsb/tc/import-pdf/{aircraft_id} - Import new PDF
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
  Linking,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { encode } from 'base64-arraybuffer';
import { getLanguage } from '@/i18n';
import api from '@/services/api';

// Transport Canada AD search URL
const TC_AD_SEARCH_URL = 'https://wwwapps.tc.gc.ca/Saf-Sec-Sur/2/cawis-swimn/AD_as.aspx';

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
  dangerRed: '#DC3545',
  dangerRedBg: '#F8D7DA',
  disclaimerYellow: '#FFF8E1',
  disclaimerYellowBorder: '#FFE082',
  pdfBlue: '#2196F3',
  pdfBlueBg: '#E3F2FD',
  // Seen/Not Seen colors
  seenGreen: '#4CAF50',
  seenGreenBg: '#E8F5E9',
  notSeenOrange: '#FF9800',
  notSeenOrangeBg: '#FFF3E0',
};

// ============================================================
// BILINGUAL TEXTS (TC-SAFE - Neutral wording only)
// ============================================================
const TEXTS = {
  en: {
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'Transport Canada References',
    sectionTitle: 'Official TC References',
    adSection: 'Airworthiness Directives (AD)',
    sbSection: 'Service Bulletins (SB)',
    noReferences: 'No TC references available.',
    noReferencesHint: 'Import Transport Canada PDF documents or check your aircraft model.',
    disclaimer: 'Informational only. This tool does not determine airworthiness or compliance. Verification with official Transport Canada records and a licensed AME is required.',
    loading: 'Loading references...',
    error: 'Unable to retrieve data at this time.',
    retry: 'Retry',
    // Header action
    searchTcAds: 'Search Transport Canada ADs',
    // PDF Import
    importPdfButton: 'Import Transport Canada PDF',
    importPdfUploading: 'Importing...',
    importPdfSuccess: 'PDF imported. References updated.',
    importPdfError: 'Unable to import PDF. Please try again.',
    // Card actions
    viewPdf: 'View PDF',
    remove: 'Remove',
    deleteConfirmTitle: 'Remove Reference',
    deleteConfirmMessage: 'This removes the reference from your workspace only. The original TC document is not affected.',
    deleteConfirmCancel: 'Cancel',
    deleteConfirmOk: 'Remove',
    deleteSuccess: 'Reference removed.',
    deleteError: 'Unable to remove reference.',
    pdfError: 'Unable to open PDF.',
    pdfEmpty: 'PDF file is empty.',
    pdfDownloading: 'Downloading...',
    // Seen/Not Seen badges
    seenBadge: 'Seen',
    notSeenBadge: 'Not Seen',
    seenInDocs: 'in documents',
    // Explanatory text for Seen/Not Seen
    seenExplanation: 'This indicates whether the AD/SB reference was found in scanned documents. Verification must be done manually using aircraft manuals and official records.',
    // Fallback title
    fallbackTitle: 'TC reference',
    // Origins
    originTcBaseline: 'TC Official',
    originImported: 'Imported PDF',
  },
  fr: {
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'Références Transport Canada',
    sectionTitle: 'Références TC officielles',
    adSection: 'Consignes de navigabilité (AD)',
    sbSection: 'Bulletins de service (SB)',
    noReferences: 'Aucune référence TC disponible.',
    noReferencesHint: 'Importez des documents PDF Transport Canada ou vérifiez le modèle de votre aéronef.',
    disclaimer: 'Informatif seulement. Cet outil ne détermine pas la navigabilité ou la conformité. Vérification avec les registres officiels de Transport Canada et un TEA agréé requise.',
    loading: 'Chargement des références...',
    error: 'Impossible de récupérer les données.',
    retry: 'Réessayer',
    // Header action
    searchTcAds: 'Rechercher les AD Transport Canada',
    // PDF Import
    importPdfButton: 'Importer PDF Transport Canada',
    importPdfUploading: 'Importation...',
    importPdfSuccess: 'PDF importé. Références mises à jour.',
    importPdfError: 'Impossible d\'importer le PDF. Veuillez réessayer.',
    // Card actions
    viewPdf: 'Voir PDF',
    remove: 'Supprimer',
    deleteConfirmTitle: 'Supprimer la référence',
    deleteConfirmMessage: 'Ceci supprime la référence de votre espace de travail uniquement. Le document TC original n\'est pas affecté.',
    deleteConfirmCancel: 'Annuler',
    deleteConfirmOk: 'Supprimer',
    deleteSuccess: 'Référence supprimée.',
    deleteError: 'Impossible de supprimer la référence.',
    pdfError: 'Impossible d\'ouvrir le PDF.',
    pdfEmpty: 'Le fichier PDF est vide.',
    pdfDownloading: 'Téléchargement du PDF...',
    // Seen/Not Seen badges
    seenBadge: 'Vu',
    notSeenBadge: 'Non vu',
    seenInDocs: 'dans les documents',
    // Explanatory text for Seen/Not Seen
    seenExplanation: 'Ceci indique si la référence AD/SB a été trouvée dans les documents scannés. La vérification doit être effectuée manuellement avec les manuels de l\'aéronef et les registres officiels.',
    // Fallback title
    fallbackTitle: 'Référence TC',
    // Origins
    originTcBaseline: 'TC Officiel',
    originImported: 'PDF importé',
  },
};

// ============================================================
// TYPES - BACKEND BASELINE CONTRACT
// ============================================================

interface ADSBBaselineItem {
  ref: string;
  type: 'AD' | 'SB';
  title?: string;
  identifier?: string;
  recurrence?: string;
  count_seen?: number; // Number of times seen in scanned documents
  seen_in_documents?: boolean; // Computed from count_seen > 0
  origin?: string; // 'USER_IMPORTED_REFERENCE' | 'TC_BASELINE'
  pdf_available?: boolean;
  tc_reference_id?: string;
  tc_pdf_id?: string;
  // Backend permission flags (use these if available)
  can_delete?: boolean;
  can_open_pdf?: boolean;
}

interface ADSBBaselineResponse {
  aircraft: {
    manufacturer: string;
    model: string;
  };
  items?: ADSBBaselineItem[];
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
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [deletingRefId, setDeletingRefId] = useState<string | null>(null);

  // Debug logs (temporary)
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  const debugLog = (msg: string) => {
    const timestamp = new Date().toISOString().slice(11, 19);
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(logMsg);
    setDebugLogs((prev) => [...prev.slice(-50), logMsg]);
  };

  // ============================================================
  // PDF IMPORT
  // ============================================================
  const handleImportPdf = async () => {
    if (!aircraftId) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsImporting(true);
      let successCount = 0;
      let errorCount = 0;

      for (const asset of result.assets) {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: asset.uri,
            type: 'application/pdf',
            name: asset.name || 'tc_document.pdf',
          } as any);

          await api.post(`/api/adsb/tc/import-pdf/${aircraftId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          successCount++;
        } catch (uploadErr) {
          errorCount++;
        }
      }

      setIsImporting(false);

      if (successCount > 0) {
        Alert.alert('', texts.importPdfSuccess);
        fetchBaseline(true);
      } else if (errorCount > 0) {
        Alert.alert('', texts.importPdfError);
      }
    } catch (err) {
      setIsImporting(false);
      Alert.alert('', texts.importPdfError);
    }
  };

  // ============================================================
  // FETCH BASELINE
  // ============================================================
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
      const response = await api.get(`/api/adsb/baseline/${aircraftId}`);
      console.log('[AD/SB BASELINE]', response.data);
      setData(response.data as ADSBBaselineResponse);
    } catch (err: unknown) {
      console.warn('[AD/SB BASELINE] Error:', err);
      setError(texts.error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [aircraftId, texts.error]);

  useEffect(() => {
    fetchBaseline();
  }, []);

  const handleRefresh = useCallback(() => {
    fetchBaseline(true);
  }, [fetchBaseline]);

  // ============================================================
  // PDF DIRECTORY UTILITY
  // ============================================================
  const getSafePdfDirectory = async (): Promise<string> => {
    let baseDir: string | null = null;
    
    if (FileSystem.documentDirectory && FileSystem.documentDirectory.length > 0) {
      baseDir = FileSystem.documentDirectory;
    } else if (FileSystem.cacheDirectory && FileSystem.cacheDirectory.length > 0) {
      baseDir = FileSystem.cacheDirectory;
    }
    
    if (!baseDir) {
      throw new Error('No valid directory available for PDF storage');
    }
    
    const tcPdfDir = `${baseDir}tc_pdfs/`;
    
    try {
      const dirInfo = await FileSystem.getInfoAsync(tcPdfDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(tcPdfDir, { intermediates: true });
      }
    } catch (mkdirErr: any) {
      return baseDir;
    }
    
    return tcPdfDir;
  };

  // ============================================================
  // PDF HANDLER
  // ============================================================
  const openTcPdf = async (tcPdfId: string | undefined, refName: string) => {
    if (!tcPdfId) {
      Alert.alert('', texts.pdfError);
      return;
    }

    setDownloadingPdfId(tcPdfId);

    try {
      const response = await api.get(`/api/adsb/tc/pdf/${tcPdfId}`, {
        responseType: 'arraybuffer',
        headers: { 'Accept': 'application/pdf' },
      });

      const arrayBuffer = response.data as ArrayBuffer;
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        Alert.alert('', texts.pdfEmpty);
        return;
      }

      const base64Data = encode(arrayBuffer);
      const safeDir = await getSafePdfDirectory();
      const fileName = `tc_${tcPdfId}.pdf`;
      const fileUri = `${safeDir}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size <= 1000)) {
        Alert.alert('', texts.pdfError);
        return;
      }

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        Alert.alert('', texts.pdfError);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      Alert.alert('', texts.pdfError);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // ============================================================
  // DELETE HANDLER
  // ============================================================
  const handleRemove = (tcReferenceId: string | undefined, identifier: string) => {
    if (!tcReferenceId) {
      Alert.alert('', texts.deleteError);
      return;
    }

    Alert.alert(
      texts.deleteConfirmTitle,
      texts.deleteConfirmMessage,
      [
        { text: texts.deleteConfirmCancel, style: 'cancel' },
        {
          text: texts.deleteConfirmOk,
          style: 'destructive',
          onPress: async () => {
            setDeletingRefId(tcReferenceId);
            try {
              await api.delete(`/api/adsb/tc/reference-by-id/${tcReferenceId}`);
              Alert.alert('', texts.deleteSuccess);
              fetchBaseline(true);
            } catch (err: any) {
              Alert.alert('', texts.deleteError);
            } finally {
              setDeletingRefId(null);
            }
          },
        },
      ]
    );
  };

  const handleSearchTcAds = () => {
    Linking.openURL(TC_AD_SEARCH_URL);
  };

  // ============================================================
  // PROCESS DATA - Combine and sort all items
  // ============================================================
  const allAdItems = data?.ad_list ?? [];
  const allSbItems = data?.sb_list ?? [];
  const hasData = allAdItems.length > 0 || allSbItems.length > 0;

  // Calculate seen/not seen counts
  const adSeenCount = allAdItems.filter(item => (item.count_seen || 0) > 0).length;
  const adNotSeenCount = allAdItems.length - adSeenCount;
  const sbSeenCount = allSbItems.filter(item => (item.count_seen || 0) > 0).length;
  const sbNotSeenCount = allSbItems.length - sbSeenCount;

  // ============================================================
  // RENDER SEEN/NOT SEEN BADGE
  // ============================================================
  const renderSeenBadge = (item: ADSBBaselineItem) => {
    const countSeen = item.count_seen || 0;
    const isSeen = countSeen > 0;
    
    return (
      <View style={[
        styles.seenBadge,
        { backgroundColor: isSeen ? COLORS.seenGreenBg : COLORS.notSeenOrangeBg }
      ]}>
        <Ionicons 
          name={isSeen ? "checkmark-circle" : "alert-circle"} 
          size={14} 
          color={isSeen ? COLORS.seenGreen : COLORS.notSeenOrange} 
        />
        <Text style={[
          styles.seenBadgeText,
          { color: isSeen ? COLORS.seenGreen : COLORS.notSeenOrange }
        ]}>
          {isSeen ? texts.seenBadge : texts.notSeenBadge}
        </Text>
        {isSeen && countSeen > 1 && (
          <Text style={[styles.seenCountText, { color: COLORS.seenGreen }]}>
            ({countSeen}×)
          </Text>
        )}
      </View>
    );
  };

  // ============================================================
  // RENDER SINGLE CARD
  // ============================================================
  const renderCard = (item: ADSBBaselineItem, index: number) => {
    const isAD = item.type === 'AD';
    const tcPdfId = item.tc_pdf_id;
    const tcRefId = item.tc_reference_id;
    const isDownloading = downloadingPdfId === tcPdfId;
    const isDeleting = deletingRefId === tcRefId;
    const isImported = item.origin === 'USER_IMPORTED_REFERENCE';
    const isTcBaseline = item.origin === 'TC_BASELINE';
    
    // Permission flags - Use backend flags if available, otherwise infer from IDs
    // This ensures buttons show for ALL items with valid IDs
    const canOpenPdf = item.can_open_pdf === true || (tcPdfId !== undefined && tcPdfId !== null && tcPdfId !== '');
    const canDelete = item.can_delete === true || (tcRefId !== undefined && tcRefId !== null && tcRefId !== '');
    
    const displayTitle = item.title || item.identifier || texts.fallbackTitle;
    const displayIdentifier = item.identifier || item.ref;
    
    return (
      <View 
        key={`${item.type}-${item.ref}-${index}`}
        style={[
          styles.card,
          { borderLeftColor: isAD ? COLORS.adRed : COLORS.sbBlue }
        ]}
      >
        {/* Header Row */}
        <View style={styles.cardHeader}>
          {/* Type Badge */}
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
          
          {/* Identifier Badge */}
          <View style={styles.identifierBadge}>
            <Text style={styles.identifierBadgeText}>{displayIdentifier}</Text>
          </View>
          
          {/* Origin Badge */}
          {isImported && (
            <View style={styles.originBadge}>
              <Ionicons name="document" size={10} color={COLORS.pdfBlue} />
              <Text style={styles.originBadgeText}>{texts.originImported}</Text>
            </View>
          )}
          {isTcBaseline && (
            <View style={[styles.originBadge, { backgroundColor: COLORS.primary + '15' }]}>
              <Text style={[styles.originBadgeText, { color: COLORS.primary }]}>{texts.originTcBaseline}</Text>
            </View>
          )}
          
          {/* Seen/Not Seen Badge */}
          {renderSeenBadge(item)}
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>{displayTitle}</Text>

        {/* Recurrence if available */}
        {item.recurrence && (
          <View style={styles.recurrenceRow}>
            <Ionicons name="repeat" size={12} color={COLORS.textMuted} />
            <Text style={styles.recurrenceText}>{item.recurrence}</Text>
          </View>
        )}

        {/* Action Buttons - Only for imported PDFs */}
        {isImported && tcPdfId && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.viewPdfButton, isDownloading && styles.buttonDisabled]}
              onPress={() => openTcPdf(tcPdfId, displayIdentifier)}
              activeOpacity={0.7}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.viewPdfButtonText}>{texts.pdfDownloading}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={16} color={COLORS.white} />
                  <Text style={styles.viewPdfButtonText}>{texts.viewPdf}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.removeButton, isDeleting && styles.buttonDisabled]}
              onPress={() => handleRemove(tcRefId, displayIdentifier)}
              activeOpacity={0.7}
              disabled={isDeleting || !tcRefId}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={COLORS.dangerRed} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={16} color={COLORS.dangerRed} />
                  <Text style={styles.removeButtonText}>{texts.remove}</Text>
                </>
              )}
            </TouchableOpacity>
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

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={20} color="#5D4037" />
          <Text style={styles.disclaimerText}>{texts.disclaimer}</Text>
        </View>

        {/* Seen/Not Seen Explanation - TC-SAFE */}
        <View style={styles.explanationBox}>
          <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
          <Text style={styles.explanationText}>{texts.seenExplanation}</Text>
        </View>

        {/* TC Search Button */}
        <TouchableOpacity style={styles.tcSearchButton} onPress={handleSearchTcAds} activeOpacity={0.7}>
          <Ionicons name="search" size={18} color={COLORS.white} />
          <Text style={styles.tcSearchButtonText}>{texts.searchTcAds}</Text>
        </TouchableOpacity>

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

        {/* Summary Counters */}
        {hasData && (
          <View style={styles.countersContainer}>
            <View style={[styles.counterBadge, { backgroundColor: COLORS.seenGreenBg }]}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.seenGreen} />
              <Text style={[styles.counterText, { color: COLORS.seenGreen }]}>
                {texts.seenBadge}: {adSeenCount + sbSeenCount}
              </Text>
            </View>
            <View style={[styles.counterBadge, { backgroundColor: COLORS.notSeenOrangeBg }]}>
              <Ionicons name="alert-circle" size={14} color={COLORS.notSeenOrange} />
              <Text style={[styles.counterText, { color: COLORS.notSeenOrange }]}>
                {texts.notSeenBadge}: {adNotSeenCount + sbNotSeenCount}
              </Text>
            </View>
          </View>
        )}

        {/* Empty State */}
        {!hasData && (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>{texts.noReferences}</Text>
            <Text style={styles.emptySubtitle}>{texts.noReferencesHint}</Text>
          </View>
        )}

        {/* AD Section */}
        {allAdItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: COLORS.adRedBg }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.adRed }]}>{texts.adSection}</Text>
              <View style={styles.sectionBadges}>
                <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.seenGreenBg }]}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.seenGreen} />
                  <Text style={[styles.sectionCountText, { color: COLORS.seenGreen }]}>{adSeenCount}</Text>
                </View>
                <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.notSeenOrangeBg }]}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.notSeenOrange} />
                  <Text style={[styles.sectionCountText, { color: COLORS.notSeenOrange }]}>{adNotSeenCount}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardsList}>
              {allAdItems.map((item, index) => renderCard(item, index))}
            </View>
          </View>
        )}

        {/* SB Section */}
        {allSbItems.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: COLORS.sbBlueBg }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.sbBlue }]}>{texts.sbSection}</Text>
              <View style={styles.sectionBadges}>
                <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.seenGreenBg }]}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.seenGreen} />
                  <Text style={[styles.sectionCountText, { color: COLORS.seenGreen }]}>{sbSeenCount}</Text>
                </View>
                <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.notSeenOrangeBg }]}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.notSeenOrange} />
                  <Text style={[styles.sectionCountText, { color: COLORS.notSeenOrange }]}>{sbNotSeenCount}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardsList}>
              {allSbItems.map((item, index) => renderCard(item, index))}
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

      {/* DEBUG BUTTON (temporary) */}
      <TouchableOpacity 
        onPress={() => setShowDebug(true)} 
        style={styles.debugButton}
      >
        <Text style={styles.debugButtonText}>DEBUG ({debugLogs.length})</Text>
      </TouchableOpacity>

      {/* DEBUG MODAL */}
      <Modal
        visible={showDebug}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDebug(false)}
      >
        <View style={styles.debugModal}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Debug Logs</Text>
            <TouchableOpacity onPress={() => setShowDebug(false)} style={styles.debugCloseBtn}>
              <Text style={styles.debugCloseBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setDebugLogs([])} style={styles.debugClearBtn}>
            <Text style={styles.debugClearBtnText}>Clear Logs</Text>
          </TouchableOpacity>
          <ScrollView style={styles.debugScrollView} contentContainerStyle={styles.debugScrollContent}>
            {debugLogs.length === 0 ? (
              <Text style={styles.debugEmpty}>No logs yet.</Text>
            ) : (
              debugLogs.map((log, index) => (
                <Text key={index} style={styles.debugLogLine}>{log}</Text>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: COLORS.primary, 
    paddingTop: Platform.OS === 'ios' ? 50 : 40, 
    paddingBottom: 16, 
    paddingHorizontal: 16 
  },
  headerBack: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 2 },
  headerRight: { width: 44 },
  pageTitleContainer: { 
    backgroundColor: COLORS.white, 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
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
  disclaimer: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.disclaimerYellow, 
    borderWidth: 1, 
    borderColor: COLORS.disclaimerYellowBorder, 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 12, 
    alignItems: 'flex-start' 
  },
  disclaimerText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#5D4037', lineHeight: 18 },
  // Explanation box for Seen/Not Seen
  explanationBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.sbBlueBg,
    borderWidth: 1,
    borderColor: COLORS.sbBlue + '40',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  explanationText: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 12, 
    color: COLORS.primary, 
    lineHeight: 18,
    fontStyle: 'italic',
  },
  countersContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  counterBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20,
    gap: 6,
  },
  counterText: { fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginBottom: 12 
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  sectionBadges: { flexDirection: 'row', gap: 8 },
  sectionCountBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 10,
    gap: 4,
  },
  sectionCountText: { fontSize: 13, fontWeight: '700' },
  cardsList: { gap: 12 },
  card: { 
    backgroundColor: COLORS.white, 
    borderRadius: 12, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  typeBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  identifierBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  identifierBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  originBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.pdfBlueBg, 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6,
    gap: 4,
  },
  originBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.pdfBlue },
  // Seen/Not Seen Badge
  seenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  seenBadgeText: { fontSize: 11, fontWeight: '700' },
  seenCountText: { fontSize: 10, fontWeight: '600' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 8, lineHeight: 20 },
  recurrenceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recurrenceText: { fontSize: 12, color: COLORS.textMuted, marginLeft: 6 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  viewPdfButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary, 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 8, 
    flex: 1, 
    justifyContent: 'center',
    gap: 6,
  },
  viewPdfButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  removeButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.dangerRedBg, 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: COLORS.dangerRed, 
    justifyContent: 'center',
    gap: 6,
  },
  removeButtonText: { fontSize: 13, fontWeight: '600', color: COLORS.dangerRed },
  buttonDisabled: { opacity: 0.6 },
  tcSearchButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.primary, 
    borderRadius: 10, 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    marginBottom: 12,
    gap: 8,
  },
  tcSearchButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white },
  importButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.white, 
    borderWidth: 1, 
    borderColor: COLORS.primary, 
    borderRadius: 10, 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    marginBottom: 16,
    gap: 8,
  },
  importButtonDisabled: { opacity: 0.6 },
  importButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  bottomSpacer: { height: 40 },
  // DEBUG STYLES
  debugButton: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#FF0000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  debugButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  debugModal: { flex: 1, backgroundColor: '#1a1a1a', paddingTop: 50 },
  debugHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  debugTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  debugCloseBtn: { backgroundColor: '#FF0000', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  debugCloseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  debugClearBtn: { alignSelf: 'flex-start', marginLeft: 16, marginTop: 8, marginBottom: 8, backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  debugClearBtnText: { color: '#AAA', fontSize: 12 },
  debugScrollView: { flex: 1 },
  debugScrollContent: { padding: 16 },
  debugEmpty: { color: '#666', fontSize: 14, fontStyle: 'italic' },
  debugLogLine: { color: '#00FF00', fontSize: 11, fontFamily: 'monospace', marginBottom: 4, lineHeight: 16 },
});
