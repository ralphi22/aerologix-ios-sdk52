/**
 * TC AD/SB Page 2 - User Imported PDF References ONLY
 * 
 * DISPLAYS ONLY:
 * - Items with origin === 'USER_IMPORTED_REFERENCE'
 * 
 * ❌ NEVER display TC_BASELINE here
 * ❌ NO OCR logic (count_seen)
 * ❌ NO compliance wording
 * 
 * ENDPOINTS:
 * - GET /api/adsb/baseline/{aircraft_id} - Fetch data
 * - GET /api/adsb/tc/pdf/{pdf_id} - Download PDF (authenticated)
 * - DELETE /api/adsb/tc/reference/{tc_reference_id} - Remove reference
 * - POST /api/adsb/tc/import-pdf/{aircraft_id} - Import new PDF
 * 
 * PDF APPROACH (iOS TestFlight compatible):
 * 1. Download PDF bytes with Bearer token
 * 2. Write to FileSystem.cacheDirectory
 * 3. Open with expo-sharing (shareAsync)
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
    noImportedReferences: 'No imported PDF references yet.',
    noImportedHint: 'Use the button below to import Transport Canada PDF documents.',
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
    // Card fixed message
    cardMessage: 'Imported reference for document review. This does not indicate compliance or airworthiness status.',
    // Fallback title
    fallbackTitle: 'Imported TC reference',
  },
  fr: {
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'Références importées',
    sectionTitle: 'Vos références PDF importées',
    adSection: 'Consignes de navigabilité (AD)',
    sbSection: 'Bulletins de service (SB)',
    noImportedReferences: 'Aucune référence PDF importée.',
    noImportedHint: 'Utilisez le bouton ci-dessous pour importer des documents PDF Transport Canada.',
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
    // Card fixed message
    cardMessage: 'Référence importée pour révision documentaire. Ceci n\'indique pas un statut de conformité ou de navigabilité.',
    // Fallback title
    fallbackTitle: 'Référence TC importée',
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
 * - tc_reference_id = ID for DELETE operation
 * - tc_pdf_id = ID for PDF download
 */
interface ADSBBaselineItem {
  ref: string;
  type: 'AD' | 'SB';
  title?: string;
  identifier?: string; // AD number (e.g., "CF-2024-01")
  recurrence?: string;
  count_seen?: number; // Optional - not used in TC page
  origin?: string; // 'USER_IMPORTED_REFERENCE' | 'TC_BASELINE' | etc.
  pdf_available?: boolean;
  // IDs for API operations - EXACT backend field names
  tc_reference_id?: string; // Used for DELETE /api/adsb/tc/reference-by-id/{tc_reference_id}
  tc_pdf_id?: string; // Used for GET /api/adsb/tc/pdf/{tc_pdf_id}
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

  // Get auth token for authenticated requests
  const { token } = useAuthStore();

  // State for PDF download and delete operations
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [deletingRefId, setDeletingRefId] = useState<string | null>(null);

  // ============================================================
  // PDF HANDLER - openTcPdf(tc_pdf_id)
  // ============================================================

  /**
   * Open PDF using authenticated fetch + base64 + expo-sharing
   * iOS TestFlight compatible approach with STRICT validation:
   * 1. Fetch PDF with Authorization header
   * 2. Validate response.ok
   * 3. Convert to blob and validate blob.size > 0
   * 4. Convert to base64
   * 5. Write to FileSystem.cacheDirectory
   * 6. Open via expo-sharing (shareAsync)
   * 
   * FORBIDDEN: Linking.openURL, WebView
   * 
   * @param tcPdfId - The tc_pdf_id from baseline item (REQUIRED)
   * @param refName - Reference name for filename
   */
  const openTcPdf = async (tcPdfId: string | undefined, refName: string) => {
    // Guard: tc_pdf_id required
    if (!tcPdfId) {
      console.error('[PDF] No tc_pdf_id provided');
      Alert.alert('', texts.pdfError);
      return;
    }

    setDownloadingPdfId(tcPdfId);

    try {
      // Step 1: Check if sharing is available on this device
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        console.error('[PDF] Sharing not available on this device');
        Alert.alert('', texts.pdfError);
        return; // finally will reset state
      }

      // Step 2: Build API URL - GET /api/adsb/tc/pdf/{tc_pdf_id}
      const pdfUrl = `${api.defaults.baseURL}/api/adsb/tc/pdf/${tcPdfId}`;
      console.log(`[PDF] Fetching: ${pdfUrl}`);

      // Step 3: Fetch PDF with Authorization header
      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': 'application/pdf',
        },
      });

      console.log(`[PDF] Response status: ${response.status}`);

      // Guard: response.ok must be true
      if (!response.ok) {
        console.error(`[PDF] Fetch failed: ${response.status} ${response.statusText}`);
        Alert.alert('', texts.pdfError);
        return; // finally will reset state
      }

      // Step 4: Convert to blob
      const blob = await response.blob();
      console.log(`[PDF] Blob size: ${blob.size} bytes`);

      // Guard: blob.size must be > 0
      if (!blob || blob.size === 0) {
        console.error('[PDF] PDF file is empty (blob.size === 0)');
        Alert.alert('', texts.pdfEmpty || 'PDF file is empty');
        return; // finally will reset state
      }

      // Step 5: Convert blob to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          if (!dataUrl || !dataUrl.includes(',')) {
            reject(new Error('Invalid base64 conversion'));
            return;
          }
          // Extract base64 part (remove "data:application/pdf;base64," prefix)
          const base64 = dataUrl.split(',')[1];
          if (!base64 || base64.length === 0) {
            reject(new Error('Empty base64 data'));
            return;
          }
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(blob);
      });

      console.log(`[PDF] Base64 length: ${base64Data.length}`);

      // Step 6: Write to cache directory
      const sanitizedName = refName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const filename = `${sanitizedName}_${Date.now()}.pdf`;
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      
      console.log(`[PDF] Writing to: ${localUri}`);
      await FileSystem.writeAsStringAsync(localUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 7: Verify file exists before opening
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (!fileInfo.exists) {
        console.error('[PDF] File write failed - file does not exist');
        Alert.alert('', texts.pdfError);
        return; // finally will reset state
      }
      console.log(`[PDF] File written successfully, size: ${fileInfo.size} bytes`);

      // Step 8: Open PDF using expo-sharing (iOS TestFlight compatible)
      console.log('[PDF] Opening with Sharing...');
      await Sharing.shareAsync(localUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });

      console.log('[PDF] Opened successfully');
    } catch (err: any) {
      console.error('[PDF] Error:', err?.message || err);
      Alert.alert('', texts.pdfError);
    } finally {
      // ALWAYS reset downloading state
      setDownloadingPdfId(null);
    }
  };

  // ============================================================
  // DELETE HANDLER - handleRemove(tc_reference_id, identifier)
  // ============================================================

  /**
   * Delete a reference from workspace
   * Uses tc_reference_id (ObjectId string) via the correct endpoint
   * DELETE /api/adsb/tc/reference-by-id/{tc_reference_id}
   * After success → refetch baseline
   * 
   * @param tcReferenceId - The tc_reference_id ObjectId from baseline item (REQUIRED)
   * @param identifier - The identifier (CF-xxxx-xx) for logging
   */
  const handleRemove = (tcReferenceId: string | undefined, identifier: string) => {
    // Validation
    if (!tcReferenceId) {
      console.error('[Delete] No tc_reference_id provided');
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
              // Log before DELETE
              console.log(`[Delete] tc_reference_id=${tcReferenceId}, identifier=${identifier}`);
              console.log(`[Delete] DELETE /api/adsb/tc/reference-by-id/${tcReferenceId}`);
              
              await api.delete(`/api/adsb/tc/reference-by-id/${tcReferenceId}`);
              
              console.log('[Delete] Success');
              Alert.alert('', texts.deleteSuccess);
              
              // Mandatory: refetch baseline (source of truth)
              fetchBaseline(true);
            } catch (err: any) {
              console.error('[Delete] Error:', err?.response?.status, err?.message);
              Alert.alert('', texts.deleteError);
            } finally {
              setDeletingRefId(null);
            }
          },
        },
      ]
    );
  };

  /**
   * Open Transport Canada AD search page
   */
  const handleSearchTcAds = () => {
    Linking.openURL(TC_AD_SEARCH_URL);
  };

  // ============================================================
  // FILTER: ONLY USER_IMPORTED_REFERENCE
  // ❌ Never display TC_BASELINE here
  // ❌ No OCR logic (count_seen)
  // ============================================================
  
  // Filter ad_list for USER_IMPORTED_REFERENCE only
  const importedAdItems = (data?.ad_list ?? []).filter(
    item => item.origin === 'USER_IMPORTED_REFERENCE'
  );

  // Filter sb_list for USER_IMPORTED_REFERENCE only
  const importedSbItems = (data?.sb_list ?? []).filter(
    item => item.origin === 'USER_IMPORTED_REFERENCE'
  );

  // Check if we have imported data to display
  const hasImportedData = importedAdItems.length > 0 || importedSbItems.length > 0;

  // ============================================================
  // RENDER SINGLE IMPORTED CARD
  // Uses tc_pdf_id for PDF, tc_reference_id for DELETE
  // ❌ No OCR logic (count_seen)
  // ❌ No TC button per card (moved to header)
  // ============================================================
  const renderImportedCard = (item: ADSBBaselineItem, index: number) => {
    const isAD = item.type === 'AD';
    // Use EXACT backend field names
    const tcPdfId = item.tc_pdf_id;
    const tcRefId = item.tc_reference_id;
    const isDownloading = downloadingPdfId === tcPdfId;
    const isDeleting = deletingRefId === tcRefId;
    
    // Display logic:
    // - Main title: item.title if present, otherwise item.identifier, fallback to generic
    // - Subtitle badge: item.identifier (AD number like "CF-2024-01")
    const displayTitle = item.title || item.identifier || texts.fallbackTitle;
    const displayIdentifier = item.identifier || item.ref;
    
    return (
      <View 
        key={`${item.type}-${item.ref}-${index}`}
        style={styles.importedCard}
      >
        {/* Header Row: Type Badge + Identifier Badge + PDF Badge */}
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
          
          {/* Identifier Badge (AD number) */}
          <View style={styles.identifierBadge}>
            <Text style={styles.identifierBadgeText}>{displayIdentifier}</Text>
          </View>
          
          {/* PDF Badge */}
          <View style={styles.pdfBadge}>
            <Ionicons name="document" size={12} color={COLORS.pdfBlue} />
            <Text style={styles.pdfBadgeText}>PDF</Text>
          </View>
        </View>

        {/* Title / Description */}
        <Text style={styles.cardTitle}>{displayTitle}</Text>

        {/* Fixed message - TC-SAFE (gray italic) */}
        <Text style={styles.cardMessage}>{texts.cardMessage}</Text>

        {/* Action Buttons - ONLY View PDF and Remove */}
        <View style={styles.cardActions}>
          {/* View PDF Button - uses tc_pdf_id */}
          <TouchableOpacity 
            style={[styles.viewPdfButton, isDownloading && styles.buttonDisabled]}
            onPress={() => openTcPdf(tcPdfId, displayIdentifier)}
            activeOpacity={0.7}
            disabled={isDownloading || !tcPdfId}
          >
            {isDownloading ? (
              <>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.viewPdfButtonText}>{texts.pdfDownloading}</Text>
              </>
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
                <Text style={styles.viewPdfButtonText}>{texts.viewPdf}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Remove Button - uses tc_reference_id - DO NOT MODIFY */}
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
                <Ionicons name="trash-outline" size={18} color={COLORS.dangerRed} />
                <Text style={styles.removeButtonText}>{texts.remove}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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

          {/* 🔝 TC Search Button - AT THE TOP */}
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

        {/* 🔝 TC Search Button - AT THE TOP */}
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

        {/* Counters */}
        <View style={styles.countersContainer}>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.pdfBlueBg }]}>
            <Ionicons name="document" size={14} color={COLORS.pdfBlue} />
            <Text style={[styles.counterText, { color: COLORS.pdfBlue, marginLeft: 4 }]}>
              {importedAdItems.length + importedSbItems.length} PDF
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
  importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginBottom: 16 },
  importButtonDisabled: { opacity: 0.6 },
  importButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.primary, marginLeft: 8 },
  // TC Search Button - Primary action at top
  tcSearchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, marginBottom: 12 },
  tcSearchButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.white, marginLeft: 8 },
  // Imported Card Styles
  cardsList: { gap: 12 },
  importedCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.pdfBlue, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 },
  cardRef: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginLeft: 10 },
  // Identifier Badge (AD number)
  identifierBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  identifierBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  // Card title (description)
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, marginBottom: 8, lineHeight: 20 },
  // PDF Badge
  pdfBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.pdfBlueBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pdfBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.pdfBlue, marginLeft: 4 },
  // Card message (TC-SAFE)
  cardMessage: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, marginBottom: 14, fontStyle: 'italic' },
  // Card action buttons
  cardActions: { flexDirection: 'row', gap: 10 },
  viewPdfButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flex: 1, justifyContent: 'center' },
  viewPdfButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white, marginLeft: 6 },
  removeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.dangerRedBg, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.dangerRed, justifyContent: 'center' },
  removeButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.dangerRed, marginLeft: 6 },
  buttonDisabled: { opacity: 0.6 },
  bottomSpacer: { height: 40 },
});
