/**
 * Parts Screen - Visual storage for installed parts
 * TC-SAFE: Information only, no regulatory decisions
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
  green: '#4CAF50',
  red: '#E53935',
};

export default function PartsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const { parts, addPart, deletePart, getPartsByAircraft } = useMaintenanceData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartQty, setNewPartQty] = useState('1');
  const [newPartDate, setNewPartDate] = useState('');

  const aircraftParts = getPartsByAircraft(aircraftId || '');

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      lang === 'fr' ? 'Supprimer' : 'Delete',
      lang === 'fr' ? `Supprimer "${name}" ?` : `Delete "${name}"?`,
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        { text: lang === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => deletePart(id) },
      ]
    );
  };

  const handleOcrMock = () => {
    Alert.alert(
      'OCR',
      lang === 'fr' ? 'Fonction OCR bientôt disponible' : 'OCR function coming soon'
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
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerAdd}>
          <Text style={styles.headerAddText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Count Badge */}
      <View style={styles.countBadge}>
        <Text style={styles.countText}>
          {aircraftParts.length} {lang === 'fr' ? 'pièce(s) enregistrée(s)' : 'part(s) recorded'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {aircraftParts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚙️</Text>
            <Text style={styles.emptyText}>
              {lang === 'fr' ? 'Aucune pièce enregistrée' : 'No parts recorded'}
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {aircraftParts.map((part) => (
              <View key={part.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Text style={styles.cardIconText}>⚙️</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{part.name}</Text>
                    <Text style={styles.cardSubtitle}>P/N: {part.partNumber}</Text>
                  </View>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.cardDetail}>
                    <Text style={styles.detailLabel}>{lang === 'fr' ? 'Quantité' : 'Quantity'}</Text>
                    <Text style={styles.detailValue}>{part.quantity}</Text>
                  </View>
                  <View style={styles.cardDetail}>
                    <Text style={styles.detailLabel}>{lang === 'fr' ? 'Installée le' : 'Installed'}</Text>
                    <Text style={styles.detailValue}>{part.installedDate}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.ocrButton} onPress={handleOcrMock}>
                    <Text style={styles.ocrButtonText}>📷 OCR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(part.id, part.name)}>
                    <Text style={styles.deleteButtonText}>{lang === 'fr' ? 'Supprimer' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

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

      {/* Add Part Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {lang === 'fr' ? 'Ajouter une pièce' : 'Add Part'}
            </Text>
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
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCancelText}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAddPart}>
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
  countBadge: { backgroundColor: COLORS.blue, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.blueBorder },
  countText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  scrollView: { flex: 1 },
  cardsContainer: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardIconText: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  cardSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  cardDetails: { flexDirection: 'row', marginBottom: 12 },
  cardDetail: { flex: 1 },
  detailLabel: { fontSize: 12, color: COLORS.textMuted },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 12 },
  ocrButton: { flex: 1, backgroundColor: COLORS.blue, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  ocrButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  deleteButton: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: COLORS.red, fontWeight: '600', fontSize: 14 },
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
