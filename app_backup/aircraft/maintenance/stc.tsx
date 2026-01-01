/**
 * STC Screen - Visual storage for Supplemental Type Certificates
 * TC-SAFE: Information only, no compatibility validation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useMaintenanceData } from '@/stores/maintenanceDataStore';

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
  purple: '#EDE7F6',
  purpleBorder: '#B39DDB',
  red: '#E53935',
};

export default function StcScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const { stcs, addStc, deleteStc, getStcsByAircraft } = useMaintenanceData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newReference, setNewReference] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const aircraftStcs = getStcsByAircraft(aircraftId || '');

  const handleDelete = (id: string, number: string) => {
    Alert.alert(
      lang === 'fr' ? 'Supprimer' : 'Delete',
      lang === 'fr' ? `Supprimer "${number}" ?` : `Delete "${number}"?`,
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        { text: lang === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => deleteStc(id) },
      ]
    );
  };

  const handleOcrMock = () => {
    Alert.alert(
      'OCR',
      lang === 'fr' ? 'Détection STC via OCR bientôt disponible' : 'STC detection via OCR coming soon'
    );
  };

  const handleAdd = () => {
    if (!newNumber.trim()) {
      Alert.alert('Error', lang === 'fr' ? 'Veuillez entrer un numéro STC' : 'Please enter STC number');
      return;
    }
    addStc({
      number: newNumber.toUpperCase(),
      reference: newReference.toUpperCase(),
      description: newDescription,
      dateAdded: new Date().toISOString().split('T')[0],
      aircraftId: aircraftId || '',
    });
    setShowAddModal(false);
    setNewNumber('');
    setNewReference('');
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
          <Text style={styles.headerTitle}>STC</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerAdd}>
          <Text style={styles.headerAddText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoIcon}>📄</Text>
        <Text style={styles.infoText}>
          {lang === 'fr'
            ? 'Certificats de type supplémentaires détectés via OCR'
            : 'Supplemental Type Certificates detected via OCR'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {aircraftStcs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>
              {lang === 'fr' ? 'Aucun STC enregistré' : 'No STC recorded'}
            </Text>
            <TouchableOpacity style={styles.ocrScanButton} onPress={handleOcrMock}>
              <Text style={styles.ocrScanButtonText}>📷 {lang === 'fr' ? 'Scanner un document' : 'Scan a document'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {aircraftStcs.map((stc) => (
              <View key={stc.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.stcBadge}>
                    <Text style={styles.stcBadgeText}>STC</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardNumber}>{stc.number}</Text>
                    {stc.reference && <Text style={styles.cardReference}>Ref: {stc.reference}</Text>}
                  </View>
                </View>
                {stc.description && (
                  <Text style={styles.cardDescription}>{stc.description}</Text>
                )}
                <Text style={styles.cardDate}>
                  {lang === 'fr' ? 'Ajouté le' : 'Added'}: {stc.dateAdded}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.ocrButton} onPress={handleOcrMock}>
                    <Text style={styles.ocrButtonText}>📷 OCR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(stc.id, stc.number)}>
                    <Text style={styles.deleteButtonText}>{lang === 'fr' ? 'Supprimer' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>
            {lang === 'fr'
              ? 'Les STC sont détectés via OCR de rapports de maintenance. Aucune validation de compatibilité n\'est effectuée.'
              : 'STCs are detected via OCR from maintenance reports. No compatibility validation is performed.'}
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
              {lang === 'fr' ? 'Ajouter un STC' : 'Add STC'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={lang === 'fr' ? 'Numéro STC (ex: SA02345CH)' : 'STC Number (e.g. SA02345CH)'}
              placeholderTextColor={COLORS.textMuted}
              value={newNumber}
              onChangeText={setNewNumber}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={lang === 'fr' ? 'Référence (optionnel)' : 'Reference (optional)'}
              placeholderTextColor={COLORS.textMuted}
              value={newReference}
              onChangeText={setNewReference}
              autoCapitalize="characters"
            />
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder={lang === 'fr' ? 'Description (optionnel)' : 'Description (optional)'}
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
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 2 },
  headerAdd: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  headerAddText: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.purple, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.purpleBorder },
  infoIcon: { fontSize: 16, marginRight: 8 },
  infoText: { flex: 1, fontSize: 13, color: '#4527A0' },
  scrollView: { flex: 1 },
  cardsContainer: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginBottom: 20 },
  ocrScanButton: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  ocrScanButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stcBadge: { backgroundColor: COLORS.purple, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginRight: 12 },
  stcBadgeText: { fontSize: 14, fontWeight: 'bold', color: '#4527A0' },
  cardInfo: { flex: 1 },
  cardNumber: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  cardReference: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  cardDescription: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8, lineHeight: 20 },
  cardDate: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 12 },
  ocrButton: { flex: 1, backgroundColor: COLORS.blue, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  ocrButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  deleteButton: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: COLORS.red, fontWeight: '600', fontSize: 14 },
  noticeBox: { flexDirection: 'row', marginHorizontal: 16, padding: 16, backgroundColor: COLORS.purple, borderRadius: 12, borderWidth: 1, borderColor: COLORS.purpleBorder },
  noticeIcon: { fontSize: 16, marginRight: 8 },
  noticeText: { flex: 1, fontSize: 12, color: '#4527A0', lineHeight: 18 },
  disclaimer: { flexDirection: 'row', margin: 16, padding: 16, backgroundColor: COLORS.yellow, borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder },
  disclaimerIcon: { fontSize: 16, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.textDark, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  modalSave: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
