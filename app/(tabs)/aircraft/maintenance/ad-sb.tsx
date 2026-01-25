/**
 * AD/SB Screen - Visual storage for Airworthiness Directives & Service Bulletins
 * TC-SAFE: Information only, no compliance decisions
 * Now syncs with backend
 * 
 * SOURCE: User's scanned documents (OCR) - NOT official TC data
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
  ActivityIndicator,
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
    noRecords: 'No AD/SB recorded',
    addTitle: 'Add AD / SB',
    delete: 'Delete',
    cancel: 'Cancel',
    add: 'Add',
    numberPlaceholder: 'Number (e.g. AD 96-09-06)',
    fillAllFields: 'Please fill all fields',
    ocrComingSoon: 'OCR function coming soon',
    deleteConfirm: 'Delete',
    infoNotice: 'AD/SB are displayed for informational purposes only. No compliance is automatically deduced.',
    disclaimer: 'Information only. Does not replace an AME nor an official record. All regulatory decisions remain with the owner and maintenance organization.',
  },
  fr: {
    screenTitle: 'AD / SB',
    screenSubtitle: 'Documents scannés',
    headerExplainer: 'Issus de vos documents de maintenance',
    noRecords: 'Aucun AD/SB enregistré',
    addTitle: 'Ajouter AD / SB',
    delete: 'Supprimer',
    cancel: 'Annuler',
    add: 'Ajouter',
    numberPlaceholder: 'Numéro (ex: AD 96-09-06)',
    fillAllFields: 'Veuillez remplir tous les champs',
    ocrComingSoon: 'Fonction OCR bientôt disponible',
    deleteConfirm: 'Supprimer',
    infoNotice: 'Les AD/SB sont affichés à titre informatif uniquement. Aucune conformité n\'est déduite automatiquement.',
    disclaimer: "Information seulement. Ne remplace pas un TEA/AME ni un registre officiel. Toute décision réglementaire appartient au propriétaire et à l'atelier.",
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
};

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

  // Sync with backend on mount
  useEffect(() => {
    if (aircraftId) {
      syncWithBackend(aircraftId);
    }
  }, [aircraftId]);

  const aircraftAdSbs = getAdSbsByAircraft(aircraftId || '');
  const adCount = aircraftAdSbs.filter((a) => a.type === 'AD').length;
  const sbCount = aircraftAdSbs.filter((a) => a.type === 'SB').length;

  // Navigate to TC AD/SB screen
  const handleNavigateToTC = () => {
    router.push({
      pathname: '/(tabs)/aircraft/maintenance/adsb-tc',
      params: { aircraftId, registration },
    });
  };

  const handleDelete = (id: string, number: string) => {
    Alert.alert(
      lang === 'fr' ? 'Supprimer' : 'Delete',
      lang === 'fr' ? `Supprimer "${number}" ?` : `Delete "${number}"?`,
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        { 
          text: lang === 'fr' ? 'Supprimer' : 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setDeletingId(id);
            const success = await deleteAdSb(id);
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

  const handleOcrMock = () => {
    Alert.alert(
      'OCR',
      lang === 'fr' ? 'Fonction OCR bientôt disponible' : 'OCR function coming soon'
    );
  };

  const handleAdd = () => {
    if (!newNumber.trim() || !newDescription.trim()) {
      Alert.alert('Error', lang === 'fr' ? 'Veuillez remplir tous les champs' : 'Please fill all fields');
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AD / SB</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleNavigateToTC} style={styles.headerTcButton}>
            <Text style={styles.headerTcText}>🇨🇦 TC</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerAdd}>
            <Text style={styles.headerAddText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Count Badges */}
      <View style={styles.countContainer}>
        <View style={[styles.countBadge, { backgroundColor: '#FFEBEE' }]}>
          <Text style={[styles.countText, { color: COLORS.red }]}>AD: {adCount}</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: COLORS.orange }]}>
          <Text style={[styles.countText, { color: '#E65100' }]}>SB: {sbCount}</Text>
        </View>
        {/* TC AD/SB Button */}
        <TouchableOpacity 
          style={[styles.countBadge, styles.tcBadge]} 
          onPress={handleNavigateToTC}
        >
          <Text style={styles.tcBadgeText}>
            {lang === 'fr' ? '🇨🇦 TC AD/SB' : '🇨🇦 TC AD/SB'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {aircraftAdSbs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyText}>
              {lang === 'fr' ? 'Aucun AD/SB enregistré' : 'No AD/SB recorded'}
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {aircraftAdSbs.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeBadge, item.type === 'AD' ? styles.adBadge : styles.sbBadge]}>
                    <Text style={[styles.typeBadgeText, item.type === 'AD' ? styles.adText : styles.sbText]}>
                      {item.type}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardNumber}>{item.number}</Text>
                    <Text style={styles.cardDate}>{item.dateAdded}</Text>
                  </View>
                </View>
                <Text style={styles.cardDescription}>{item.description}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.ocrButton} onPress={handleOcrMock}>
                    <Text style={styles.ocrButtonText}>📷 OCR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id, item.number)}>
                    <Text style={styles.deleteButtonText}>{lang === 'fr' ? 'Supprimer' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Visual Status Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>
            {lang === 'fr'
              ? 'Les AD/SB sont affichés à titre informatif uniquement. Aucune conformité n\'est déduite automatiquement.'
              : 'AD/SB are displayed for informational purposes only. No compliance is automatically deduced.'}
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {lang === 'fr'
              ? "Information seulement. Ne remplace pas un TEA/AME ni un registre officiel. Toute décision réglementaire appartient au propriétaire et à l'atelier."
              : 'Information only. Does not replace an AME nor an official record. All regulatory decisions remain with the owner and maintenance organization.'}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {lang === 'fr' ? 'Ajouter AD / SB' : 'Add AD / SB'}
            </Text>
            
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
              placeholder={lang === 'fr' ? 'Numéro (ex: AD 96-09-06)' : 'Number (e.g. AD 96-09-06)'}
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
                <Text style={styles.modalCancelText}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAdd}>
                <Text style={styles.modalSaveText}>{lang === 'fr' ? 'Ajouter' : 'Add'}</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
  },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerBackText: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTcButton: { 
    paddingHorizontal: 10, paddingVertical: 6, 
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 
  },
  headerTcText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  headerAdd: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  headerAddText: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  countContainer: { flexDirection: 'row', padding: 16, gap: 12, flexWrap: 'wrap' },
  countBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  countText: { fontSize: 14, fontWeight: '600' },
  tcBadge: { backgroundColor: COLORS.blue, borderWidth: 1, borderColor: COLORS.blueBorder },
  tcBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  scrollView: { flex: 1 },
  cardsContainer: { paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  typeBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginRight: 12 },
  adBadge: { backgroundColor: '#FFEBEE' },
  sbBadge: { backgroundColor: COLORS.orange },
  typeBadgeText: { fontSize: 14, fontWeight: 'bold' },
  adText: { color: COLORS.red },
  sbText: { color: '#E65100' },
  cardInfo: { flex: 1 },
  cardNumber: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  cardDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardDescription: { fontSize: 14, color: COLORS.textMuted, marginBottom: 12, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: 12 },
  ocrButton: { flex: 1, backgroundColor: COLORS.blue, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  ocrButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  deleteButton: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: COLORS.red, fontWeight: '600', fontSize: 14 },
  noticeBox: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, padding: 16, backgroundColor: COLORS.blue, borderRadius: 12, borderWidth: 1, borderColor: COLORS.blueBorder },
  noticeIcon: { fontSize: 16, marginRight: 8 },
  noticeText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  disclaimer: { flexDirection: 'row', margin: 16, padding: 16, backgroundColor: COLORS.yellow, borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder },
  disclaimerIcon: { fontSize: 16, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 20, textAlign: 'center' },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeOption: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center' },
  typeOptionSelected: { borderColor: COLORS.primary, backgroundColor: '#E8EEF7' },
  typeOptionText: { fontSize: 16, fontWeight: '600', color: COLORS.textMuted },
  typeOptionTextSelected: { color: COLORS.primary },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.textDark, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  modalSave: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
