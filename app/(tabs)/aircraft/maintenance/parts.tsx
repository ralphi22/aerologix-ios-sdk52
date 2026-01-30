/**
 * Parts Screen - Critical Mentions & Service Parts
 * TC-SAFE: Information only, no regulatory decisions
 * Features:
 * - Two tabs: Critical Mentions (from OCR reports) and Service Parts
 * - Reference dates for critical items
 * - Backend integration for critical mentions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useMaintenanceData } from '@/stores/maintenanceDataStore';
import api from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  green: '#4CAF50',
  greenBg: '#E8F5E9',
  orange: '#FF9800',
  orangeBg: '#FFF3E0',
  red: '#E53935',
  redBg: '#FFEBEE',
};

// Critical mention type from backend
interface CriticalMention {
  id: string;
  name: string;
  component_type: string; // engine, propeller, magneto, vacuum_pump, etc.
  part_number?: string;
  serial_number?: string;
  reference_date?: string;
  source_document?: string;
  installed_at_hours?: number;
  current_airframe_hours?: number;
  time_since_install?: number;
  tbo?: number;
  remaining?: number;
}

// Tab type
type TabType = 'critical' | 'service';

// Component icon mapping
const COMPONENT_ICONS: Record<string, string> = {
  engine: '🔧',
  propeller: '🌀',
  magneto: '⚡',
  vacuum_pump: '💨',
  alternator: '🔋',
  starter: '⚙️',
  default: '🔩',
};

export default function PartsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const { parts, addPart, deletePart, getPartsByAircraft, syncWithBackend, isLoading: partsLoading } = useMaintenanceData();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('critical');
  
  // Critical mentions state
  const [criticalMentions, setCriticalMentions] = useState<CriticalMention[]>([]);
  const [criticalLoading, setCriticalLoading] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);

  // Service parts modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartQty, setNewPartQty] = useState('1');
  const [newPartDate, setNewPartDate] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Fetch critical mentions from backend
  useEffect(() => {
    const fetchCriticalMentions = async () => {
      if (!aircraftId) return;
      
      setCriticalLoading(true);
      setCriticalError(null);
      
      try {
        const response = await api.get(`/api/components/critical/${aircraftId}`);
        setCriticalMentions(response.data.components || response.data || []);
      } catch (err: any) {
        console.error('Critical mentions fetch error:', err);
        setCriticalError(err?.response?.data?.detail || err?.message || 'Failed to load');
      } finally {
        setCriticalLoading(false);
      }
    };

    fetchCriticalMentions();
  }, [aircraftId]);

  // Sync service parts with backend on mount
  useEffect(() => {
    if (aircraftId) {
      syncWithBackend(aircraftId);
    }
  }, [aircraftId]);

  const aircraftParts = getPartsByAircraft(aircraftId || '');

  // Handlers
  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      lang === 'fr' ? 'Supprimer' : 'Delete',
      lang === 'fr' ? `Supprimer "${name}" ?` : `Delete "${name}"?`,
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        { 
          text: lang === 'fr' ? 'Supprimer' : 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setDeletingId(id);
            const success = await deletePart(id);
            setDeletingId(null);
            if (!success) {
              Alert.alert(
                lang === 'fr' ? 'Erreur' : 'Error',
                lang === 'fr' ? 'Échec de la suppression' : 'Failed to delete'
              );
            }
          }
        },
      ]
    );
  };

  const handleAddPart = () => {
    if (!newPartName.trim() || !newPartNumber.trim()) {
      Alert.alert('Error', lang === 'fr' ? 'Veuillez remplir tous les champs' : 'Please fill all fields');
      return;
    }
    addPart({
      name: newPartName,
      partNumber: newPartNumber.toUpperCase(),
      quantity: parseInt(newPartQty) || 1,
      installedDate: newPartDate || new Date().toISOString().split('T')[0],
      aircraftId: aircraftId || '',
    });
    setShowAddModal(false);
    setNewPartName('');
    setNewPartNumber('');
    setNewPartQty('1');
    setNewPartDate('');
  };

  // Get component icon
  const getComponentIcon = (type: string) => {
    return COMPONENT_ICONS[type.toLowerCase()] || COMPONENT_ICONS.default;
  };

  // Get status badge style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'critical':
        return { bg: COLORS.redBg, color: COLORS.red, text: lang === 'fr' ? 'Critique' : 'Critical' };
      case 'warning':
        return { bg: COLORS.orangeBg, color: COLORS.orange, text: lang === 'fr' ? 'Attention' : 'Warning' };
      default:
        return { bg: COLORS.greenBg, color: COLORS.green, text: 'OK' };
    }
  };

  // Render critical mention card (no compliance status)
  const renderCriticalMention = (mention: CriticalMention) => {
    return (
      <View key={mention.id} style={styles.criticalCard}>
        {/* Header */}
        <View style={styles.criticalHeader}>
          <View style={styles.criticalIconContainer}>
            <Text style={styles.criticalIcon}>
              {getComponentIcon(mention.component_type)}
            </Text>
          </View>
          <View style={styles.criticalInfo}>
            <Text style={styles.criticalName}>{mention.name}</Text>
            {mention.part_number && (
              <Text style={styles.criticalPn}>P/N: {mention.part_number}</Text>
            )}
          </View>
        </View>

        {/* Reference info - dates only, no status */}
        <View style={styles.statsGrid}>
          {mention.reference_date && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>
                {lang === 'fr' ? 'Date de référence' : 'Reference Date'}
              </Text>
              <Text style={styles.statValue}>{mention.reference_date}</Text>
            </View>
          )}
          {mention.installed_at_hours !== undefined && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>
                {lang === 'fr' ? 'Installé à' : 'Installed at'}
              </Text>
              <Text style={styles.statValue}>{mention.installed_at_hours.toFixed(1)}h</Text>
            </View>
          )}
          {mention.tbo !== undefined && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TBO</Text>
              <Text style={styles.statValue}>{mention.tbo}h</Text>
            </View>
          )}
          {mention.source_document && (
            <View style={[styles.statItem, styles.statItemFull]}>
              <Text style={styles.statLabel}>
                {lang === 'fr' ? 'Source' : 'Source'}
              </Text>
              <Text style={styles.statValue}>{mention.source_document}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render service part card
  const renderServicePart = (part: any) => (
    <View key={part.id} style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceIcon}>
          <Text style={styles.serviceIconText}>⚙️</Text>
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{part.name}</Text>
          <Text style={styles.serviceSubtitle}>P/N: {part.partNumber}</Text>
        </View>
      </View>
      <View style={styles.serviceDetails}>
        <View style={styles.serviceDetail}>
          <Text style={styles.detailLabel}>{lang === 'fr' ? 'Quantité' : 'Quantity'}</Text>
          <Text style={styles.detailValue}>{part.quantity}</Text>
        </View>
        <View style={styles.serviceDetail}>
          <Text style={styles.detailLabel}>{lang === 'fr' ? 'Installée le' : 'Installed'}</Text>
          <Text style={styles.detailValue}>{part.installedDate}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.deleteServiceButton} 
        onPress={() => handleDelete(part.id, part.name)}
      >
        <Text style={styles.deleteServiceText}>{lang === 'fr' ? 'Supprimer' : 'Delete'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{lang === 'fr' ? 'Pièces' : 'Parts'}</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        {activeTab === 'service' && (
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerAdd}>
            <Text style={styles.headerAddText}>+</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'critical' && <View style={styles.headerPlaceholder} />}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'critical' && styles.tabActive]}
          onPress={() => setActiveTab('critical')}
        >
          <Text style={[styles.tabText, activeTab === 'critical' && styles.tabTextActive]}>
            {lang === 'fr' ? 'Mentions critiques' : 'Critical Mentions'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'service' && styles.tabActive]}
          onPress={() => setActiveTab('service')}
        >
          <Text style={[styles.tabText, activeTab === 'service' && styles.tabTextActive]}>
            {lang === 'fr' ? 'Pièces de service' : 'Service Parts'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'critical' ? (
          <>
            {/* Critical Components Tab */}
            {criticalLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.centerText}>
                  {lang === 'fr' ? 'Chargement...' : 'Loading...'}
                </Text>
              </View>
            ) : criticalError ? (
              <View style={styles.centerState}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{criticalError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => {
                    setCriticalLoading(true);
                    setCriticalError(null);
                    api.get(`/api/components/critical/${aircraftId}`)
                      .then(res => setCriticalMentions(res.data.components || res.data || []))
                      .catch(err => setCriticalError(err?.message || 'Error'))
                      .finally(() => setCriticalLoading(false));
                  }}
                >
                  <Text style={styles.retryText}>
                    {lang === 'fr' ? 'Réessayer' : 'Retry'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : criticalMentions.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateIcon}>📋</Text>
                  <Text style={styles.emptyStateTitle}>
                    {lang === 'fr' 
                      ? 'Aucune mention critique détectée' 
                      : 'No critical mentions detected'}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {lang === 'fr' 
                      ? 'Les mentions critiques sont extraites des rapports de maintenance appliqués.'
                      : 'Critical mentions are detected from applied maintenance reports.'}
                  </Text>
                  
                  {/* Flow explanation */}
                  <View style={styles.flowBox}>
                    <Text style={styles.flowBoxTitle}>
                      {lang === 'fr' ? 'Comment ça marche:' : 'How it works:'}
                    </Text>
                    <Text style={styles.flowBoxStep}>
                      1. {lang === 'fr' ? 'Scannez un rapport de maintenance' : 'Scan a maintenance report'}
                    </Text>
                    <Text style={styles.flowBoxStep}>
                      2. {lang === 'fr' ? 'Appliquez les données à l\'aéronef' : 'Apply data to aircraft'}
                    </Text>
                    <Text style={styles.flowBoxStep}>
                      3. {lang === 'fr' ? 'Les mentions critiques apparaissent ici' : 'Critical mentions appear here'}
                    </Text>
                  </View>
                  
                  {/* Go to OCR History button */}
                  <TouchableOpacity 
                    style={styles.goToOcrButton}
                    onPress={() => router.push({
                      pathname: '/(tabs)/aircraft/ocr-history',
                      params: { aircraftId, registration },
                    })}
                  >
                    <Text style={styles.goToOcrButtonText}>
                      📷 {lang === 'fr' ? 'Voir les scans' : 'Go to OCR History'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {/* TC-Safe disclaimer for empty state */}
                <View style={styles.emptyDisclaimer}>
                  <Text style={styles.emptyDisclaimerIcon}>ℹ️</Text>
                  <Text style={styles.emptyDisclaimerText}>
                    {lang === 'fr'
                      ? 'Les mentions critiques (moteur, hélice, magnétos, etc.) sont extraites automatiquement lors de l\'application d\'un rapport de maintenance. Ce module affiche les dates de référence sans statut de conformité.'
                      : 'Critical mentions (engine, propeller, magnetos, etc.) are automatically extracted when applying a maintenance report. This module displays reference dates without compliance status.'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.cardsContainer}>
                {/* Info banner */}
                <View style={styles.infoBanner}>
                  <Text style={styles.infoIcon}>ℹ️</Text>
                  <Text style={styles.infoText}>
                    {lang === 'fr'
                      ? 'Ces mentions sont extraites des rapports de maintenance. Dates de référence uniquement, sans décision de conformité.'
                      : 'These mentions are extracted from maintenance reports. Reference dates only, no compliance decision.'}
                  </Text>
                </View>
                
                {criticalMentions.map(renderCriticalMention)}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Service Parts Tab */}
            {partsLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.centerText}>
                  {lang === 'fr' ? 'Chargement...' : 'Loading...'}
                </Text>
              </View>
            ) : aircraftParts.length === 0 ? (
              <View style={styles.centerState}>
                <Text style={styles.emptyIcon}>⚙️</Text>
                <Text style={styles.emptyText}>
                  {lang === 'fr' ? 'Aucune pièce enregistrée' : 'No parts recorded'}
                </Text>
              </View>
            ) : (
              <View style={styles.cardsContainer}>
                {aircraftParts.map(renderServicePart)}
              </View>
            )}
          </>
        )}

        {/* TC-Safe Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {lang === 'fr'
              ? "Informatif seulement — vérifiez avec les carnets et votre TEA. Ne détermine pas la conformité."
              : 'Informational only — verify with logbooks and your AME. Does not determine compliance.'}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Service Part Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowAddModal(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {lang === 'fr' ? 'Ajouter une pièce' : 'Add Part'}
            </Text>
            <ScrollView 
              style={styles.modalScroll} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={styles.modalInput}
                placeholder={lang === 'fr' ? 'Nom de la pièce' : 'Part name'}
                placeholderTextColor={COLORS.textMuted}
                value={newPartName}
                onChangeText={setNewPartName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="P/N (Part Number)"
                placeholderTextColor={COLORS.textMuted}
                value={newPartNumber}
                onChangeText={setNewPartNumber}
                autoCapitalize="characters"
              />
              <TextInput
                style={styles.modalInput}
                placeholder={lang === 'fr' ? 'Quantité' : 'Quantity'}
                placeholderTextColor={COLORS.textMuted}
                value={newPartQty}
                onChangeText={setNewPartQty}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Date (YYYY-MM-DD)"
                placeholderTextColor={COLORS.textMuted}
                value={newPartDate}
                onChangeText={setNewPartDate}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddPart}>
                <Text style={styles.modalSaveText}>{lang === 'fr' ? 'Ajouter' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
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
    alignItems: 'center' 
  },
  headerBackText: { 
    color: COLORS.white, 
    fontSize: 24, 
    fontWeight: '600' 
  },
  headerCenter: { 
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: { 
    color: COLORS.white, 
    fontSize: 18, 
    fontWeight: '600' 
  },
  headerSubtitle: { 
    color: COLORS.white, 
    fontSize: 14, 
    opacity: 0.8, 
    marginTop: 2 
  },
  headerAdd: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 20 
  },
  headerAddText: { 
    color: COLORS.white, 
    fontSize: 24, 
    fontWeight: '600' 
  },
  headerPlaceholder: {
    width: 40,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  // Scroll
  scrollView: { 
    flex: 1 
  },
  cardsContainer: { 
    padding: 16 
  },
  // Center states
  centerState: { 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  centerText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  emptyIcon: { 
    fontSize: 48, 
    marginBottom: 16 
  },
  emptyText: { 
    fontSize: 16, 
    color: COLORS.textMuted 
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    opacity: 0.7,
  },
  // Empty state - Critical Components enhanced
  emptyStateContainer: {
    padding: 16,
  },
  emptyStateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  flowBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  flowBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  flowBoxStep: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
    paddingLeft: 8,
  },
  goToOcrButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  goToOcrButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyDisclaimer: {
    flexDirection: 'row',
    backgroundColor: COLORS.blue,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  emptyDisclaimerIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  emptyDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 18,
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
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  // Info banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.blue,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },
  // Critical component card
  criticalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  criticalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  criticalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  criticalIcon: {
    fontSize: 24,
  },
  criticalInfo: {
    flex: 1,
  },
  criticalName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  criticalPn: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Progress section
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBackground: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    width: 45,
    textAlign: 'right',
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    width: '50%',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statItemFull: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    paddingTop: 12,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: 4,
  },
  statHighlight: {
    color: COLORS.primary,
  },
  statLarge: {
    fontSize: 22,
    fontWeight: '700',
  },
  // Service part card
  serviceCard: { 
    backgroundColor: COLORS.white, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12 
  },
  serviceHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  serviceIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    backgroundColor: COLORS.background, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  serviceIconText: { 
    fontSize: 22 
  },
  serviceInfo: { 
    flex: 1 
  },
  serviceTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.textDark 
  },
  serviceSubtitle: { 
    fontSize: 14, 
    color: COLORS.textMuted, 
    marginTop: 2 
  },
  serviceDetails: { 
    flexDirection: 'row', 
    marginBottom: 12 
  },
  serviceDetail: { 
    flex: 1 
  },
  detailLabel: { 
    fontSize: 12, 
    color: COLORS.textMuted 
  },
  detailValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.textDark, 
    marginTop: 2 
  },
  deleteServiceButton: { 
    backgroundColor: COLORS.redBg, 
    paddingVertical: 10, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  deleteServiceText: { 
    color: COLORS.red, 
    fontWeight: '600', 
    fontSize: 14 
  },
  // Disclaimer
  disclaimer: { 
    flexDirection: 'row', 
    margin: 16, 
    padding: 16, 
    backgroundColor: COLORS.yellow, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: COLORS.yellowBorder 
  },
  disclaimerIcon: { 
    fontSize: 16, 
    marginRight: 8 
  },
  disclaimerText: { 
    flex: 1, 
    fontSize: 12, 
    color: '#5D4037', 
    lineHeight: 18 
  },
  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalBackdrop: { 
    flex: 1 
  },
  modalContent: { 
    backgroundColor: COLORS.white, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24, 
    paddingBottom: 40, 
    maxHeight: '80%' 
  },
  modalHandle: { 
    width: 40, 
    height: 4, 
    backgroundColor: COLORS.border, 
    borderRadius: 2, 
    alignSelf: 'center', 
    marginBottom: 16 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: COLORS.textDark, 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  modalScroll: { 
    maxHeight: 280 
  },
  modalInput: { 
    backgroundColor: COLORS.background, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    color: COLORS.textDark, 
    marginBottom: 12 
  },
  modalButtons: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 16 
  },
  modalCancel: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    alignItems: 'center' 
  },
  modalCancelText: { 
    fontSize: 16, 
    color: COLORS.textMuted, 
    fontWeight: '600' 
  },
  modalSave: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 12, 
    backgroundColor: COLORS.primary, 
    alignItems: 'center' 
  },
  modalSaveText: { 
    fontSize: 16, 
    color: COLORS.white, 
    fontWeight: '600' 
  },
});
