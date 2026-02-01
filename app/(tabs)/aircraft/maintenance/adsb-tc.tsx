/**
 * TC AD/SB Page - User Imported Transport Canada References ONLY
 * 
 * ⚠️ CRITICAL: This page shows ONLY user-imported AD/SB
 * - Empty by default
 * - No automatic baseline
 * - No calculated data
 * 
 * ENDPOINT: GET /api/adsb/tc/references/{aircraft_id}
 * 
 * Features:
 * - Import TC PDF documents
 * - View imported PDFs
 * - Remove imported references
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
};

// ============================================================
// BILINGUAL TEXTS
// ============================================================
const TEXTS = {
  en: {
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'User Imported',
    sectionTitle: 'Your Imported TC Documents',
    noReferences: 'No Transport Canada AD/SB imported yet',
    noReferencesHint: 'Use the button below to search and import official TC documents from the Transport Canada website.',
    disclaimer: 'Informational only. This tool does not determine airworthiness or compliance. Verification with official Transport Canada records and a licensed AME is required.',
    loading: 'Loading...',
    error: 'Unable to retrieve data at this time.',
    retry: 'Retry',
    searchTcAds: 'Search Transport Canada ADs',
    importPdfButton: 'Import Transport Canada PDF',
    importPdfUploading: 'Importing...',
    importPdfSuccess: 'PDF imported successfully.',
    importPdfError: 'Unable to import PDF. Please try again.',
    viewPdf: 'Open PDF',
    openPdf: 'Open',
    remove: 'Delete',
    deleteConfirmTitle: 'Remove Reference',
    deleteConfirmMessage: 'This removes the reference from your workspace. The original TC document is not affected.',
    deleteConfirmCancel: 'Cancel',
    deleteConfirmOk: 'Remove',
    deleteSuccess: 'Reference removed.',
    deleteError: 'Unable to remove reference.',
    pdfError: 'Unable to open PDF.',
    pdfEmpty: 'PDF file is empty.',
    pdfDownloading: 'Downloading...',
    fallbackTitle: 'TC Reference',
    // New texts
    importedOn: 'Imported on',
    file: 'File',
    adPrefix: 'AD',
    // Seen/Not Seen badges
    total: 'Total',
    seen: 'Seen',
    notSeen: 'Not seen',
    seenBadge: 'SEEN',
    notSeenBadge: 'NOT SEEN',
    seenTimes: 'Seen {count} times',
    seenOnce: 'Seen 1 time',
    lastSeen: 'Last',
    verifyManually: 'Verify manually in documents',
  },
  fr: {
    screenTitle: 'TC AD/SB',
    screenSubtitle: 'Importés par vous',
    sectionTitle: 'Vos documents TC importés',
    noReferences: 'Aucun AD/SB Transport Canada importé',
    noReferencesHint: 'Utilisez le bouton ci-dessous pour rechercher et importer des documents officiels depuis le site de Transport Canada.',
    disclaimer: 'Informatif seulement. Cet outil ne détermine pas la navigabilité ou la conformité. Vérification avec les registres officiels de Transport Canada et un TEA agréé requise.',
    loading: 'Chargement...',
    error: 'Impossible de récupérer les données.',
    retry: 'Réessayer',
    searchTcAds: 'Rechercher les AD Transport Canada',
    importPdfButton: 'Importer PDF Transport Canada',
    importPdfUploading: 'Importation...',
    importPdfSuccess: 'PDF importé avec succès.',
    importPdfError: 'Impossible d\'importer le PDF. Veuillez réessayer.',
    viewPdf: 'Ouvrir PDF',
    openPdf: 'Ouvrir',
    remove: 'Supprimer',
    deleteConfirmTitle: 'Supprimer la référence',
    deleteConfirmMessage: 'Ceci supprime la référence de votre espace de travail. Le document TC original n\'est pas affecté.',
    deleteConfirmCancel: 'Annuler',
    deleteConfirmOk: 'Supprimer',
    deleteSuccess: 'Référence supprimée.',
    deleteError: 'Impossible de supprimer la référence.',
    pdfError: 'Impossible d\'ouvrir le PDF.',
    pdfEmpty: 'Le fichier PDF est vide.',
    pdfDownloading: 'Téléchargement...',
    fallbackTitle: 'Référence TC',
    // New texts
    importedOn: 'Importé le',
    file: 'Fichier',
    adPrefix: 'AD',
    // Seen/Not Seen badges
    total: 'Total',
    seen: 'Vus',
    notSeen: 'Non vus',
    seenBadge: 'VU',
    notSeenBadge: 'NON VU',
    seenTimes: 'Vu {count} fois',
    seenOnce: 'Vu 1 fois',
    lastSeen: 'Dernier',
    verifyManually: 'Vérifier manuellement dans les documents',
  },
};

// ============================================================
// TYPES - User Imported TC Reference
// ============================================================
interface TcReference {
  id?: string;
  _id?: string;
  tc_reference_id: string;
  tc_pdf_id?: string;
  ref: string;
  type: 'AD' | 'SB';
  title?: string;             // Subject extracted from PDF (e.g., "Cessna 150/152 — Rudder Stop")
  identifier?: string;        // AD/SB number (e.g., "CF-2000-20R2")
  description?: string;
  filename?: string;          // Original PDF filename
  imported_at?: string;       // Legacy field
  created_at?: string;        // New field from backend
  aircraft_id: string;
  can_open_pdf?: boolean;     // True if PDF can be opened
  can_delete?: boolean;       // True if reference can be deleted
  // Seen in scans fields
  seen_in_scans?: boolean;    // True if this TC ref was seen in OCR scans
  scan_count?: number;        // Number of times seen in scans
  last_scan_date?: string;    // Date of last scan where this was seen
}

// Response structure from backend
interface TcReferencesResponse {
  aircraft_id: string;
  references: TcReference[];
  total_count: number;
  total_seen?: number;
  total_not_seen?: number;
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
  const [references, setReferences] = useState<TcReference[]>([]);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [deletingRefId, setDeletingRefId] = useState<string | null>(null);
  
  // Summary counts state
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    seen: 0,
    notSeen: 0,
  });

  // ============================================================
  // FETCH USER IMPORTED REFERENCES ONLY
  // ============================================================
  const fetchReferences = useCallback(async (showRefreshing = false) => {
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
      // ✅ CORRECT ENDPOINT: User imported references ONLY
      const response = await api.get(`/api/adsb/tc/references/${aircraftId}`);
      console.log('[TC AD/SB] Raw API response:', JSON.stringify(response.data));
      
      // Handle response format - backend returns { references: [...] }
      const items = response.data?.references || response.data?.items || response.data || [];
      console.log('[TC AD/SB] Extracted items count:', Array.isArray(items) ? items.length : 'not array');
      
      setReferences(Array.isArray(items) ? items : []);
    } catch (err: any) {
      console.warn('[TC AD/SB] Error:', err?.message);
      // If 404 or empty, just set empty array (not an error for user)
      if (err?.response?.status === 404) {
        setReferences([]);
      } else {
        setError(texts.error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [aircraftId, texts.error]);

  useEffect(() => {
    fetchReferences();
  }, []);

  const handleRefresh = useCallback(() => {
    fetchReferences(true);
  }, [fetchReferences]);

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
          console.warn('[TC AD/SB] Import error:', uploadErr);
        }
      }

      setIsImporting(false);

      if (successCount > 0) {
        Alert.alert('', texts.importPdfSuccess);
        fetchReferences(true);
      } else {
        Alert.alert('', texts.importPdfError);
      }
    } catch (err) {
      setIsImporting(false);
      Alert.alert('', texts.importPdfError);
    }
  };

  // ============================================================
  // PDF HANDLER
  // ============================================================
  const getSafePdfDirectory = async (): Promise<string> => {
    let baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!baseDir) throw new Error('No directory available');
    
    const tcPdfDir = `${baseDir}tc_pdfs/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(tcPdfDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(tcPdfDir, { intermediates: true });
      }
    } catch {
      return baseDir;
    }
    return tcPdfDir;
  };

  const openTcPdf = async (tcPdfId: string | undefined) => {
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
      const fileUri = `${safeDir}tc_${tcPdfId}.pdf`;
      
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
    } catch {
      Alert.alert('', texts.pdfError);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // ============================================================
  // DELETE HANDLER
  // ============================================================
  const handleRemove = (tcReferenceId: string, identifier: string) => {
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
              fetchReferences(true);
            } catch {
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

  // Separate AD and SB
  const adItems = references.filter(r => r.type === 'AD');
  const sbItems = references.filter(r => r.type === 'SB');
  const hasData = references.length > 0;

  // ============================================================
  // RENDER CARD - Updated to match new backend structure
  // ============================================================
  const renderCard = (item: TcReference, index: number) => {
    const isAD = item.type === 'AD';
    const tcPdfId = item.tc_pdf_id;
    const tcRefId = item.tc_reference_id;
    const isDownloading = downloadingPdfId === tcPdfId;
    const isDeleting = deletingRefId === tcRefId;
    
    // Display logic per prompt:
    // - identifier: item.identifier (ex: "CF-2000-20R2")
    // - title: item.title or fallback to "AD " + identifier
    const displayIdentifier = item.identifier || item.ref;
    const displayTitle = item.title || `${texts.adPrefix} ${displayIdentifier}`;
    
    // Date formatting
    const importDate = item.created_at || item.imported_at;
    const formattedDate = importDate ? formatDate(importDate) : null;
    
    // Check permissions from backend
    const canOpenPdf = item.can_open_pdf !== false && tcPdfId;
    const canDelete = item.can_delete !== false;
    
    return (
      <View 
        key={`${item.type}-${tcRefId}-${index}`}
        style={[styles.card, { borderLeftColor: isAD ? COLORS.adRed : COLORS.sbBlue }]}
      >
        {/* Header with Type Badge and Identifier */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: isAD ? COLORS.adRedBg : COLORS.sbBlueBg }]}>
            <Text style={[styles.typeBadgeText, { color: isAD ? COLORS.adRed : COLORS.sbBlue }]}>
              {item.type}
            </Text>
          </View>
          <View style={styles.identifierBadge}>
            <Text style={styles.identifierBadgeText}>{displayIdentifier}</Text>
          </View>
        </View>

        {/* Title/Description */}
        <Text style={styles.cardTitle} numberOfLines={3}>{displayTitle}</Text>

        {/* Filename */}
        {item.filename && (
          <View style={styles.filenameRow}>
            <Ionicons name="document-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.filenameText}>{item.filename}</Text>
          </View>
        )}

        {/* Import date */}
        {formattedDate && (
          <Text style={styles.importDate}>
            {texts.importedOn}: {formattedDate}
          </Text>
        )}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          {/* Open PDF Button - Only if can_open_pdf is true */}
          {canOpenPdf && (
            <TouchableOpacity 
              style={[styles.viewPdfButton, isDownloading && styles.buttonDisabled]}
              onPress={() => openTcPdf(tcPdfId)}
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
                  <Text style={styles.viewPdfButtonText}>{texts.openPdf}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Delete Button - Only if can_delete is true */}
          {canDelete && (
            <TouchableOpacity 
              style={[styles.removeButton, isDeleting && styles.buttonDisabled]}
              onPress={() => handleRemove(tcRefId, displayIdentifier)}
              disabled={isDeleting}
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
          )}
        </View>
      </View>
    );
  };
  
  // Helper function to format date
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
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

      {/* Loading */}
      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{texts.loading}</Text>
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={COLORS.adRed} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchReferences()}>
            <Text style={styles.retryButtonText}>{texts.retry}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {!isLoading && !error && (
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

          {/* TC Search Button */}
          <TouchableOpacity style={styles.tcSearchButton} onPress={handleSearchTcAds}>
            <Ionicons name="search" size={18} color={COLORS.white} />
            <Text style={styles.tcSearchButtonText}>{texts.searchTcAds}</Text>
          </TouchableOpacity>

          {/* Import PDF Button */}
          <TouchableOpacity 
            style={[styles.importButton, isImporting && styles.importButtonDisabled]} 
            onPress={handleImportPdf}
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

          {/* Empty State - CRITICAL: This is the default state */}
          {!hasData && (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{texts.noReferences}</Text>
              <Text style={styles.emptySubtitle}>{texts.noReferencesHint}</Text>
            </View>
          )}

          {/* AD Section */}
          {adItems.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { backgroundColor: COLORS.adRedBg }]}>
                <Text style={[styles.sectionTitle, { color: COLORS.adRed }]}>
                  Airworthiness Directives (AD)
                </Text>
                <Text style={[styles.sectionCount, { color: COLORS.adRed }]}>{adItems.length}</Text>
              </View>
              <View style={styles.cardsList}>
                {adItems.map((item, index) => renderCard(item, index))}
              </View>
            </View>
          )}

          {/* SB Section */}
          {sbItems.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { backgroundColor: COLORS.sbBlueBg }]}>
                <Text style={[styles.sectionTitle, { color: COLORS.sbBlue }]}>
                  Service Bulletins (SB)
                </Text>
                <Text style={[styles.sectionCount, { color: COLORS.sbBlue }]}>{sbItems.length}</Text>
              </View>
              <View style={styles.cardsList}>
                {sbItems.map((item, index) => renderCard(item, index))}
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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
  errorText: { marginTop: 16, fontSize: 16, color: COLORS.adRed, textAlign: 'center' },
  retryButton: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  disclaimer: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.disclaimerYellow, 
    borderWidth: 1, 
    borderColor: COLORS.disclaimerYellowBorder, 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 16, 
    alignItems: 'flex-start' 
  },
  disclaimerText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#5D4037', lineHeight: 18 },
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
    borderWidth: 2, 
    borderColor: COLORS.primary, 
    borderRadius: 10, 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    marginBottom: 24,
    gap: 8,
  },
  importButtonDisabled: { opacity: 0.6 },
  importButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 20, fontSize: 18, fontWeight: '600', color: COLORS.textDark, textAlign: 'center' },
  emptySubtitle: { marginTop: 12, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  section: { marginBottom: 24 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginBottom: 12 
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionCount: { fontSize: 16, fontWeight: 'bold' },
  cardsList: { gap: 12 },
  card: { 
    backgroundColor: COLORS.white, 
    borderRadius: 12, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  typeBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  identifierBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  identifierBadgeText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 8, lineHeight: 20 },
  filenameRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 6, 
    gap: 6,
    backgroundColor: COLORS.background,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  filenameText: { 
    fontSize: 12, 
    color: COLORS.textMuted,
    flex: 1,
  },
  importDate: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
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
  bottomSpacer: { height: 40 },
});
