/**
 * AD/SB Screen - Visual storage for Airworthiness Directives & Service Bulletins
 * TC-SAFE: Information only, no compliance decisions
 * Now syncs with backend and shows aggregated counts
 * 
 * SOURCE: User's scanned documents (OCR) - NOT official TC data
 */

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useMaintenanceData } from '@/stores/maintenanceDataStore';

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
    ocrComingSoon: 'OCR function coming soon',
    deleteConfirm: 'Delete',
    infoNotice: 'Detected in scanned maintenance reports. Informational only.',
    disclaimer: 'Information only. Does not replace an AME nor an official record. All regulatory decisions remain with the owner and maintenance organization.',
    seenInReports: 'Seen in',
    reports: 'reports',
    report: 'report',
    firstDetected: 'First detected',
    lastDetected: 'Last detected',
    loading: 'Loading AD/SB...',
    errorLoading: 'Failed to load AD/SB',
    retry: 'Retry',
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
    ocrComingSoon: 'Fonction OCR bientôt disponible',
    deleteConfirm: 'Supprimer',
    infoNotice: 'Détecté dans les rapports de maintenance scannés. Informatif uniquement.',
    disclaimer: "Information seulement. Ne remplace pas un TEA/AME ni un registre officiel. Toute décision réglementaire appartient au propriétaire et à l'atelier.",
    seenInReports: 'Vu dans',
    reports: 'rapports',
    report: 'rapport',
    firstDetected: 'Première détection',
    lastDetected: 'Dernière détection',
    loading: 'Chargement AD/SB...',
    errorLoading: 'Échec du chargement',
    retry: 'Réessayer',
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

// Aggregated AD/SB type with count
interface AggregatedAdSb {
  number: string;
  type: 'AD' | 'SB';
  description: string;
  count: number;
  firstDate: string;
  lastDate: string;
  ids: string[]; // All IDs for this reference (for deletion)
}

export default function AdSbScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];
  const { adSbs, addAdSb, deleteAdSb, getAdSbsByAircraft, syncWithBackend, isLoading } = useMaintenanceData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState<'AD' | 'SB'>('AD');
  const [newNumber, setNewNumber] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with backend on mount
  useEffect(() => {
    const loadData = async () => {
      if (aircraftId) {
        setLocalLoading(true);
        setError(null);
        try {
          await syncWithBackend(aircraftId);
        } catch (err: any) {
          setError(err?.message || texts.errorLoading);
        } finally {
          setLocalLoading(false);
        }
      }
    };
    loadData();
  }, [aircraftId]);

  const aircraftAdSbs = getAdSbsByAircraft(aircraftId || '');

  // Aggregate AD/SB by reference number (deduplicate with count)
  const aggregatedData = useMemo(() => {
    const map = new Map<string, AggregatedAdSb>();
    
    aircraftAdSbs.forEach(item => {
      const key = `${item.type}-${item.number.toUpperCase().trim()}`;
      
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.count += 1;
        existing.ids.push(item.id);
        // Update description if current one is longer/better
        if (item.description && item.description.length > existing.description.length) {
          existing.description = item.description;
        }
        // Track first and last dates
        if (item.dateAdded < existing.firstDate) {
          existing.firstDate = item.dateAdded;
        }
        if (item.dateAdded > existing.lastDate) {
          existing.lastDate = item.dateAdded;
        }
      } else {
        map.set(key, {
          number: item.number.toUpperCase().trim(),
          type: item.type,
          description: item.description || '',
          count: 1,
          firstDate: item.dateAdded || '',
          lastDate: item.dateAdded || '',
          ids: [item.id],
        });
      }
    });
    
    // Convert to array and sort: AD first, then by number
    return Array.from(map.values()).sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'AD' ? -1 : 1;
      }
      return a.number.localeCompare(b.number);
    });
  }, [aircraftAdSbs]);

  // Separate AD and SB counts
  const adItems = aggregatedData.filter(item => item.type === 'AD');
  const sbItems = aggregatedData.filter(item => item.type === 'SB');
  const uniqueAdCount = adItems.length;
  const uniqueSbCount = sbItems.length;
  const totalAdDetections = adItems.reduce((sum, item) => sum + item.count, 0);
  const totalSbDetections = sbItems.reduce((sum, item) => sum + item.count, 0);

  // Navigate to TC AD/SB screen
  const handleNavigateToTC = () => {
    router.push({
      pathname: '/(tabs)/aircraft/maintenance/adsb-tc',
      params: { aircraftId, registration },
    });
  };

  const handleDelete = (aggregated: AggregatedAdSb) => {
    const message = aggregated.count > 1 
      ? lang === 'fr' 
        ? `Supprimer toutes les ${aggregated.count} occurrences de "${aggregated.number}" ?`
        : `Delete all ${aggregated.count} occurrences of "${aggregated.number}"?`
      : `${texts.deleteConfirm} "${aggregated.number}" ?`;
    
    Alert.alert(
      texts.delete,
      message,
      [
        { text: texts.cancel, style: 'cancel' },
        { 
          text: texts.delete, 
          style: 'destructive', 
          onPress: async () => {
            setDeletingId(aggregated.ids[0]);
            // Delete all occurrences
            for (const id of aggregated.ids) {
              await deleteAdSb(id);
            }
            setDeletingId(null);
          }
        },
      ]
    );
  };

  const handleRetry = async () => {
    setLocalLoading(true);
    setError(null);
    try {
      await syncWithBackend(aircraftId || '');
    } catch (err: any) {
      setError(err?.message || texts.errorLoading);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleAdd = () => {
    if (!newNumber.trim() || !newDescription.trim()) {
      Alert.alert('Error', texts.fillAllFields);
      return;
    }
    addAdSb({
      type: newType,
      number: newNumber.toUpperCase(),
      description: newDescription,
      dateAdded: new Date().toISOString().split('T')[0],
      aircraftId: aircraftId || '',
    });
    setShowAddModal(false);
    setNewNumber('');
    setNewDescription('');
  };

  // Render count badge
  const renderCountBadge = (count: number) => {
    if (count <= 1) return null;
    return (
      <View style={styles.detectionBadge}>
        <Text style={styles.detectionBadgeText}>
          {count}×
        </Text>
      </View>
    );
  };

  // Render a single aggregated card
  const renderAggregatedCard = (item: AggregatedAdSb) => {
    const isDeleting = deletingId && item.ids.includes(deletingId);
    const showOccurrenceInfo = item.count > 1;
    
    return (
      <View key={`${item.type}-${item.number}`} style={[styles.card, isDeleting && styles.cardDeleting]}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, item.type === 'AD' ? styles.adBadge : styles.sbBadge]}>
            <Text style={[styles.typeBadgeText, item.type === 'AD' ? styles.adText : styles.sbText]}>
              {item.type}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.cardNumberRow}>
              <Text style={styles.cardNumber}>{item.number}</Text>
              {renderCountBadge(item.count)}
            </View>
            {/* Show date only if single occurrence */}
            {!showOccurrenceInfo && (
              <Text style={styles.cardDate}>{item.firstDate}</Text>
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
              {lang === 'fr' ? `Vu ${item.count} fois` : `Seen ${item.count} times`}
            </Text>
            <Text style={styles.occurrenceText}>
              {lang === 'fr' ? `Dernière détection: ${item.lastDate}` : `Last seen: ${item.lastDate}`}
            </Text>
          </View>
        )}
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => handleDelete(item)}
            disabled={!!isDeleting}
          >
            <Text style={styles.deleteButtonText}>{texts.delete}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          <Text style={[styles.countText, { color: COLORS.red }]}>
            AD: {uniqueAdCount} {totalAdDetections > uniqueAdCount ? `(${totalAdDetections}×)` : ''}
          </Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: COLORS.orange }]}>
          <Text style={[styles.countText, { color: '#E65100' }]}>
            SB: {uniqueSbCount} {totalSbDetections > uniqueSbCount ? `(${totalSbDetections}×)` : ''}
          </Text>
        </View>
        {/* TC AD/SB Button */}
        <TouchableOpacity 
          style={[styles.countBadge, styles.tcBadge]} 
          onPress={handleNavigateToTC}
        >
          <Text style={styles.tcBadgeText}>TC AD/SB</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {(localLoading || isLoading) && !error && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{texts.loading}</Text>
          </View>
        )}

        {/* Error State */}
        {error && !localLoading && (
          <View style={styles.errorState}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>{texts.retry}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!localLoading && !isLoading && !error && aggregatedData.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>{texts.noRecords}</Text>
            <Text style={styles.emptySubtext}>{texts.noRecordsSubtext}</Text>
          </View>
        )}

        {/* Data Display */}
        {!localLoading && !isLoading && !error && aggregatedData.length > 0 && (
          <View style={styles.cardsContainer}>
            {/* AD Section */}
            {adItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Airworthiness Directives</Text>
                  <Text style={styles.sectionCount}>{uniqueAdCount}</Text>
                </View>
                {adItems.map(renderAggregatedCard)}
              </View>
            )}

            {/* SB Section */}
            {sbItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Service Bulletins</Text>
                  <Text style={styles.sectionCount}>{uniqueSbCount}</Text>
                </View>
                {sbItems.map(renderAggregatedCard)}
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
  
  // Date range
  dateRangeContainer: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateRangeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
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
