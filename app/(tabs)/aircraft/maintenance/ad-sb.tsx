/**
 * AD/SB Screen - Visual storage for Airworthiness Directives & Service Bulletins
 * TC-SAFE: Information only, no compliance decisions
 * 
 * SOURCE: User's scanned documents (OCR) - NOT official TC data
 * ENDPOINT: GET /api/adsb/ocr-scan/{aircraft_id} (aggregated data with counters)
 * 
 * FEATURES:
 * - Counter management: Shows occurrence_count for each unique AD/SB reference
 * - No visual duplicates: Each reference appears once with count badge
 * - Delete: Removes all occurrences of a reference via dedicated endpoint
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import api from '@/services/api';
import maintenanceService from '@/services/maintenanceService';

// ============================================
// BILINGUAL TEXTS
// ============================================
const TEXTS = {
  en: {
    screenTitle: 'AD / SB',
    screenSubtitle: 'Scanned Documents',
    headerExplainer: 'From your uploaded maintenance records',
    noRecords: 'No AD/SB detected',
    noRecordsSubtext: 'Scan maintenance reports to detect AD/SB references',
    addTitle: 'Add AD / SB',
    delete: 'Delete',
    cancel: 'Cancel',
    add: 'Add',
    numberPlaceholder: 'Number (e.g. AD 96-09-06)',
    fillAllFields: 'Please fill all fields',
    deleteConfirm: 'Delete',
    infoNotice: 'Detected in scanned maintenance reports. Informational only.',
    disclaimer: 'Information only. Does not replace an AME nor an official record. All regulatory decisions remain with the owner and maintenance organization.',
    seenTimes: 'Seen {count} times',
    lastSeen: 'Last seen: {date}',
    loading: 'Loading AD/SB...',
    errorLoading: 'Failed to load',
    retry: 'Retry',
    tcAdSb: 'TC AD/SB',
    tcAdSbHint: 'View official AD/SB from Transport Canada',
    // New recurrence texts
    recurring: 'Recurring',
    dueSoon: 'Due soon',
    overdue: 'Overdue',
    nextDue: 'Next: {date}',
    tcMatched: 'TC',
    // Global counters
    totalReferences: 'References',
    totalRecurring: 'Recurring',
  },
  fr: {
    screenTitle: 'AD / SB',
    screenSubtitle: 'Documents scannés',
    headerExplainer: 'Issus de vos documents de maintenance',
    noRecords: 'Aucun AD/SB détecté',
    noRecordsSubtext: 'Scannez des rapports de maintenance pour détecter les références AD/SB',
    addTitle: 'Ajouter AD / SB',
    delete: 'Supprimer',
    cancel: 'Annuler',
    add: 'Ajouter',
    numberPlaceholder: 'Numéro (ex: AD 96-09-06)',
    fillAllFields: 'Veuillez remplir tous les champs',
    deleteConfirm: 'Supprimer',
    infoNotice: 'Détecté dans les rapports de maintenance scannés. Informatif uniquement.',
    disclaimer: "Information seulement. Ne remplace pas un TEA/AME ni un registre officiel. Toute décision réglementaire appartient au propriétaire et à l'atelier.",
    seenTimes: 'Vu {count} fois',
    lastSeen: 'Dernière détection: {date}',
    loading: 'Chargement AD/SB...',
    errorLoading: 'Échec du chargement',
    retry: 'Réessayer',
    tcAdSb: 'TC AD/SB',
    tcAdSbHint: 'Voir les AD/SB officiels de Transport Canada',
    // New recurrence texts
    recurring: 'Récurrent',
    dueSoon: 'Échéance proche',
    overdue: 'Échu',
    nextDue: 'Prochaine: {date}',
    tcMatched: 'TC',
    // Global counters
    totalReferences: 'Références',
    totalRecurring: 'Récurrents',
  },
};

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  border: '#E0E0E0',
  yellow: '#FFF8E1',
  yellowBorder: '#FFE082',
  blue: '#E3F2FD',
  blueBorder: '#90CAF9',
  orange: '#FFF3E0',
  orangeBorder: '#FFB74D',
  red: '#E53935',
  green: '#4CAF50',
  grey: '#9E9E9E',
};

// ============================================
// TYPES - Backend OCR Aggregated Response
// ============================================
interface OcrAdSbItem {
  id?: string;
  _id?: string;
  adsb_id?: string;            // Individual record ID for deletion
  reference: string;           // AD/SB reference number (unique key)
  type: 'AD' | 'SB';
  description?: string;
  occurrence_count: number;    // From backend aggregation - number of times captured
  last_seen?: string;          // From backend aggregation
  first_seen?: string;
  aircraft_id: string;
  // Array of individual record IDs if backend returns them
  record_ids?: string[];
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_display?: string; // "Annuel", "100h", etc.
  days_until_due?: number | null;
  next_due_date?: string | null;
  // TC matching
  tc_matched?: boolean;
}

interface OcrAdSbResponse {
  items: OcrAdSbItem[];
  count: {
    ad: number;
    sb: number;
    total: number;
  };
  // Global counters
  total_unique_references?: number;
  total_ad?: number;
  total_sb?: number;
  total_recurring?: number;
}

// Response state for global counters
interface GlobalCounts {
  totalReferences: number;
  totalAd: number;
  totalSb: number;
  totalRecurring: number;
}

export default function AdSbScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];

  // State
  const [items, setItems] = useState<OcrAdSbItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Global counters state
  const [globalCounts, setGlobalCounts] = useState<GlobalCounts>({
    totalReferences: 0,
    totalAd: 0,
    totalSb: 0,
    totalRecurring: 0,
  });
  
  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<'AD' | 'SB'>('AD');
  const [newNumber, setNewNumber] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // ============================================
  // FETCH DATA - Using OCR aggregated endpoint
  // ============================================
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!aircraftId) return;

    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // ✅ CORRECT ENDPOINT: OCR aggregated data
      const response = await api.get(`/api/adsb/ocr-scan/${aircraftId}`);
      const data = response.data as OcrAdSbResponse;
      
      console.log('[AD/SB OCR] Data received:', data);
      
      // Handle both response formats (items array or direct array)
      const itemsList = data.items || (Array.isArray(data) ? data : []);
      
      // Update global counters from response
      setGlobalCounts({
        totalReferences: data.total_unique_references || itemsList.length,
        totalAd: data.total_ad || data.count?.ad || itemsList.filter(i => i.type === 'AD').length,
        totalSb: data.total_sb || data.count?.sb || itemsList.filter(i => i.type === 'SB').length,
        totalRecurring: data.total_recurring || itemsList.filter(i => i.is_recurring).length,
      });
      
      // Sort: AD first, then by reference
      const sortedItems = itemsList.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'AD' ? -1 : 1;
        }
        return a.reference.localeCompare(b.reference);
      });
      
      setItems(sortedItems);
    } catch (err: any) {
      console.warn('[AD/SB OCR] Error:', err?.message);
      setError(err?.response?.data?.detail || err?.message || texts.errorLoading);
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [aircraftId, texts.errorLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // ============================================
  // ACTIONS
  // ============================================
  const handleNavigateToTC = () => {
    router.push({
      pathname: '/(tabs)/aircraft/maintenance/adsb-tc',
      params: { aircraftId, registration },
    });
  };

  /**
   * Delete AD/SB - Handles both aggregated and individual records
   * 
   * The OCR aggregated endpoint may return items with different ID structures:
   * 1. adsb_id - Direct reference to individual ADSB record
   * 2. id or _id - Could be aggregation ID or individual record ID
   * 3. reference - Used for deletion by reference when no ID available
   * 
   * Deletion strategy:
   * - Try DELETE /api/adsb/ocr/{aircraft_id}/reference/{reference} first (deletes all occurrences)
   * - Fallback to DELETE /api/adsb/{id} using maintenanceService
   */
  const handleDelete = (item: OcrAdSbItem) => {
    const reference = item.reference;
    const itemId = item.adsb_id || item.id || item._id;
    
    if (!reference && !itemId) {
      Alert.alert('Error', 'Cannot delete - no reference or ID');
      return;
    }

    const deleteMessage = item.occurrence_count > 1 
      ? `${texts.deleteConfirm} "${reference}" ? (${item.occurrence_count} ${lang === 'fr' ? 'occurrences' : 'occurrences'})`
      : `${texts.deleteConfirm} "${reference}" ?`;

    Alert.alert(
      texts.delete,
      deleteMessage,
      [
        { text: texts.cancel, style: 'cancel' },
        { 
          text: texts.delete, 
          style: 'destructive', 
          onPress: async () => {
            setDeletingId(reference || itemId || '');
            try {
              let deleteSuccess = false;
              
              // Strategy 1: Try to delete by reference (removes all occurrences)
              if (aircraftId && reference) {
                try {
                  const encodedRef = encodeURIComponent(reference);
                  await api.delete(`/api/adsb/ocr/${aircraftId}/reference/${encodedRef}`);
                  deleteSuccess = true;
                  console.log('[AD/SB] Deleted by reference:', reference);
                } catch (refErr: any) {
                  console.log('[AD/SB] Delete by reference failed:', refErr?.response?.status, refErr?.message);
                  // Continue to fallback strategies
                }
              }
              
              // Strategy 2: Delete by individual ID using maintenanceService
              if (!deleteSuccess && itemId) {
                try {
                  const success = await maintenanceService.deleteADSB(itemId);
                  if (success) {
                    deleteSuccess = true;
                    console.log('[AD/SB] Deleted by ID via maintenanceService:', itemId);
                  }
                } catch (idErr: any) {
                  console.log('[AD/SB] Delete by ID failed:', idErr?.message);
                }
              }
              
              // Strategy 3: Direct API call as last resort
              if (!deleteSuccess && itemId) {
                try {
                  await api.delete(`/api/adsb/${itemId}`);
                  deleteSuccess = true;
                  console.log('[AD/SB] Deleted by direct API call:', itemId);
                } catch (directErr: any) {
                  console.log('[AD/SB] Direct delete failed:', directErr?.response?.status, directErr?.message);
                }
              }
              
              if (deleteSuccess) {
                // Refresh data after successful deletion
                fetchData(true);
              } else {
                Alert.alert(
                  lang === 'fr' ? 'Erreur' : 'Error', 
                  lang === 'fr' ? 'Impossible de supprimer cet élément. Veuillez réessayer.' : 'Unable to delete this item. Please try again.'
                );
              }
            } catch (err: any) {
              console.error('[AD/SB] Delete error:', err);
              Alert.alert(
                'Error', 
                err?.response?.data?.detail || err?.message || 'Failed to delete'
              );
            } finally {
              setDeletingId(null);
            }
          }
        },
      ]
    );
  };

  const handleAdd = async () => {
    if (!newNumber.trim() || !newDescription.trim()) {
      Alert.alert('Error', texts.fillAllFields);
      return;
    }
    
    try {
      await api.post('/api/adsb', {
        aircraft_id: aircraftId,
        adsb_type: newType,
        reference_number: newNumber.toUpperCase(),
        description: newDescription,
      });
      
      setShowAddModal(false);
      setNewNumber('');
      setNewDescription('');
      fetchData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add');
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================
  
  // Count badge (only if > 1)
  const renderCountBadge = (count: number) => {
    if (count <= 1) return null;
    return (
      <View style={styles.detectionBadge}>
        <Text style={styles.detectionBadgeText}>{count}×</Text>
      </View>
    );
  };

  // Render single card
  const renderCard = (item: OcrAdSbItem) => {
    // Use reference as the unique key since items are aggregated by reference
    const uniqueKey = item.reference || item.id || item._id || `adsb-${Math.random()}`;
    // Check if this item is being deleted (by reference or ID)
    const isDeleting = deletingId === item.reference || 
                       deletingId === item.id || 
                       deletingId === item._id ||
                       deletingId === item.adsb_id;
    const showOccurrenceInfo = item.occurrence_count > 1;
    
    return (
      <View key={uniqueKey} style={[styles.card, isDeleting && styles.cardDeleting]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, item.type === 'AD' ? styles.adBadge : styles.sbBadge]}>
            <Text style={[styles.typeBadgeText, item.type === 'AD' ? styles.adText : styles.sbText]}>
              {item.type}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardNumberRow}>
              <Text style={styles.cardNumber}>{item.reference}</Text>
              {renderCountBadge(item.occurrence_count)}
            </View>
            {/* Show first_seen date only if single occurrence */}
            {!showOccurrenceInfo && item.first_seen && (
              <Text style={styles.cardDate}>{item.first_seen}</Text>
            )}
          </View>
          {isDeleting && (
            <ActivityIndicator size="small" color={COLORS.red} />
          )}
        </View>
        
        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
        ) : null}
        
        {/* Occurrence info - Only shown if count > 1 */}
        {showOccurrenceInfo && (
          <View style={styles.occurrenceContainer}>
            <Text style={styles.occurrenceText}>
              {texts.seenTimes.replace('{count}', String(item.occurrence_count))}
            </Text>
            {item.last_seen && (
              <Text style={styles.occurrenceText}>
                {texts.lastSeen.replace('{date}', item.last_seen)}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
          >
            <Text style={styles.deleteButtonText}>{texts.delete}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Separate AD and SB
  const adItems = items.filter(item => item.type === 'AD');
  const sbItems = items.filter(item => item.type === 'SB');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{texts.screenTitle}</Text>
          <Text style={styles.headerSubtitle}>{texts.screenSubtitle}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleNavigateToTC} style={styles.headerTcButton}>
            <Text style={styles.headerTcText}>TC</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerAdd}>
            <Text style={styles.headerAddText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Explainer Banner */}
      <View style={styles.explainerBanner}>
        <Text style={styles.explainerText}>📄 {texts.headerExplainer}</Text>
      </View>

      {/* Count Badges */}
      <View style={styles.countContainer}>
        <View style={[styles.countBadge, { backgroundColor: '#FFEBEE' }]}>
          <Text style={[styles.countText, { color: COLORS.red }]}>AD: {adItems.length}</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: COLORS.orange }]}>
          <Text style={[styles.countText, { color: '#E65100' }]}>SB: {sbItems.length}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.countBadge, styles.tcBadge]} 
          onPress={handleNavigateToTC}
        >
          <Text style={styles.tcBadgeText}>TC AD/SB</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh} 
            colors={[COLORS.primary]} 
          />
        }
      >
        {/* Loading State */}
        {isLoading && !isRefreshing && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{texts.loading}</Text>
          </View>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <View style={styles.errorState}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
              <Text style={styles.retryButtonText}>{texts.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !error && items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{texts.noRecords}</Text>
            <Text style={styles.emptySubtext}>{texts.noRecordsSubtext}</Text>
          </View>
        )}

        {/* Data Display */}
        {!isLoading && !error && items.length > 0 && (
          <View style={styles.cardsContainer}>
            {/* AD Section */}
            {adItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Airworthiness Directives</Text>
                  <Text style={styles.sectionCount}>{adItems.length}</Text>
                </View>
                {adItems.map(renderCard)}
              </View>
            )}

            {/* SB Section */}
            {sbItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Service Bulletins</Text>
                  <Text style={styles.sectionCount}>{sbItems.length}</Text>
                </View>
                {sbItems.map(renderCard)}
              </View>
            )}
          </View>
        )}

        {/* Info Notice - TC Safe */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>{texts.infoNotice}</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>{texts.disclaimer}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{texts.addTitle}</Text>
            
            {/* Type Selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeOption, newType === 'AD' && styles.typeOptionSelected]}
                onPress={() => setNewType('AD')}
              >
                <Text style={[styles.typeOptionText, newType === 'AD' && styles.typeOptionTextSelected]}>AD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, newType === 'SB' && styles.typeOptionSelected]}
                onPress={() => setNewType('SB')}
              >
                <Text style={[styles.typeOptionText, newType === 'SB' && styles.typeOptionTextSelected]}>SB</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder={texts.numberPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={newNumber}
              onChangeText={setNewNumber}
              autoCapitalize="characters"
            />
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Description"
              placeholderTextColor={COLORS.textMuted}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>{texts.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAdd}>
                <Text style={styles.modalSaveText}>{texts.add}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary, 
    paddingTop: Platform.OS === 'ios' ? 50 : 40, 
    paddingBottom: 16, 
    paddingHorizontal: 16,
  },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerBackText: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTcButton: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 8 
  },
  headerTcText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  explainerBanner: {
    backgroundColor: COLORS.blue,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blueBorder,
  },
  explainerText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  headerAdd: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 20 
  },
  headerAddText: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  countContainer: { 
    flexDirection: 'row', 
    padding: 16, 
    gap: 12, 
    flexWrap: 'wrap' 
  },
  countBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  countText: { fontSize: 14, fontWeight: '600' },
  tcBadge: { backgroundColor: COLORS.blue, borderWidth: 1, borderColor: COLORS.blueBorder },
  tcBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  scrollView: { flex: 1 },
  cardsContainer: { paddingHorizontal: 16 },
  
  // Section styles
  section: { marginBottom: 20 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: COLORS.primary,
    backgroundColor: COLORS.blue,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  
  // Loading state
  loadingState: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
  
  // Error state
  errorState: { alignItems: 'center', paddingVertical: 60 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: COLORS.red, marginBottom: 16, textAlign: 'center' },
  retryButton: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 8 
  },
  retryButtonText: { color: COLORS.white, fontWeight: '600' },
  
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: COLORS.textDark, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  
  // Card styles
  card: { 
    backgroundColor: COLORS.white, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDeleting: { opacity: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  typeBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginRight: 12 },
  adBadge: { backgroundColor: '#FFEBEE' },
  sbBadge: { backgroundColor: COLORS.orange },
  typeBadgeText: { fontSize: 14, fontWeight: 'bold' },
  adText: { color: COLORS.red },
  sbText: { color: '#E65100' },
  cardInfo: { flex: 1 },
  cardNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardNumber: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  cardDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardDescription: { fontSize: 14, color: COLORS.textMuted, marginBottom: 12, lineHeight: 20 },
  
  // Detection badge
  detectionBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  detectionBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Occurrence info (for count > 1)
  occurrenceContainer: {
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  occurrenceText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  
  // Actions
  cardActions: { flexDirection: 'row', gap: 12 },
  deleteButton: { 
    flex: 1, 
    backgroundColor: '#FFEBEE', 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  deleteButtonText: { color: COLORS.red, fontWeight: '600', fontSize: 14 },
  
  // Notice and Disclaimer
  noticeBox: { 
    flexDirection: 'row', 
    marginHorizontal: 16, 
    marginTop: 8, 
    padding: 16, 
    backgroundColor: COLORS.blue, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: COLORS.blueBorder 
  },
  noticeIcon: { fontSize: 16, marginRight: 8 },
  noticeText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  disclaimer: { 
    flexDirection: 'row', 
    margin: 16, 
    padding: 16, 
    backgroundColor: COLORS.yellow, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: COLORS.yellowBorder 
  },
  disclaimerIcon: { fontSize: 16, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { 
    backgroundColor: COLORS.white, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24 
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 20, textAlign: 'center' },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeOption: { 
    flex: 1, 
    paddingVertical: 14, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: COLORS.border, 
    alignItems: 'center' 
  },
  typeOptionSelected: { borderColor: COLORS.primary, backgroundColor: '#E8EEF7' },
  typeOptionText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
  typeOptionTextSelected: { color: COLORS.primary },
  modalInput: { 
    backgroundColor: COLORS.background, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    color: COLORS.textDark, 
    marginBottom: 12 
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    alignItems: 'center' 
  },
  modalCancelText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  modalSave: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 12, 
    backgroundColor: COLORS.primary, 
    alignItems: 'center' 
  },
  modalSaveText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
