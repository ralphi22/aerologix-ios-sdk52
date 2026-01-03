/**
 * Invoices Screen - Financial tracking for maintenance costs
 * TC-SAFE: Financial information only, no regulatory validation
 * Now syncs with backend
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
import { useMaintenanceData, Invoice } from '@/stores/maintenanceDataStore';

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
  greenLight: '#E8F5E9',
  orange: '#FF9800',
  orangeLight: '#FFF3E0',
  red: '#E53935',
  purple: '#7C4DFF',
  purpleLight: '#EDE7F6',
};

// Mock annual hours flown for cost calculation
const MOCK_ANNUAL_HOURS = 85.5;

export default function InvoicesScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const { invoices, addInvoice, deleteInvoice, getInvoicesByAircraft, syncWithBackend, isLoading } = useMaintenanceData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newParts, setNewParts] = useState('');
  const [newLabor, setNewLabor] = useState('');
  const [newHours, setNewHours] = useState('');
  const [newNotes, setNewNotes] = useState('');
  
  // Sync with backend on mount
  useEffect(() => {
    if (aircraftId) {
      syncWithBackend(aircraftId);
    }
  }, [aircraftId]);

  const aircraftInvoices = getInvoicesByAircraft(aircraftId || '');

  // Calculate totals for analysis
  const totalExpenses = aircraftInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalParts = aircraftInvoices.reduce((sum, inv) => sum + inv.partsAmount, 0);
  const totalLabor = aircraftInvoices.reduce((sum, inv) => sum + inv.laborAmount, 0);
  const totalWorkedHours = aircraftInvoices.reduce((sum, inv) => sum + inv.hoursWorked, 0);
  const hourlyCost = MOCK_ANNUAL_HOURS > 0 ? totalExpenses / MOCK_ANNUAL_HOURS : 0;

  const handleDelete = (id: string, supplier: string) => {
    Alert.alert(
      lang === 'fr' ? 'Supprimer' : 'Delete',
      lang === 'fr' ? `Supprimer la facture de "${supplier}" ?` : `Delete invoice from "${supplier}"?`,
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        { text: lang === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => deleteInvoice(id) },
      ]
    );
  };

  const handleOcrMock = () => {
    Alert.alert(
      'OCR',
      lang === 'fr' ? 'Scan OCR bientôt disponible' : 'OCR scan coming soon'
    );
  };

  const handleRefresh = () => {
    Alert.alert(
      lang === 'fr' ? 'Actualiser' : 'Refresh',
      lang === 'fr' ? 'Données actualisées' : 'Data refreshed'
    );
  };

  const handleAdd = () => {
    if (!newSupplier.trim()) {
      Alert.alert('Error', lang === 'fr' ? 'Veuillez entrer un fournisseur' : 'Please enter a supplier');
      return;
    }
    const partsAmt = parseFloat(newParts) || 0;
    const laborAmt = parseFloat(newLabor) || 0;
    const hoursAmt = parseFloat(newHours) || 0;
    
    addInvoice({
      supplier: newSupplier,
      date: newDate || new Date().toISOString().split('T')[0],
      partsAmount: partsAmt,
      laborAmount: laborAmt,
      hoursWorked: hoursAmt,
      totalAmount: partsAmt + laborAmt,
      aircraftId: aircraftId || '',
      notes: newNotes,
    });
    setShowAddModal(false);
    resetForm();
  };

  const resetForm = () => {
    setNewSupplier('');
    setNewDate('');
    setNewParts('');
    setNewLabor('');
    setNewHours('');
    setNewNotes('');
  };

  const navigateToDetail = (invoiceId: string) => {
    router.push({
      pathname: '/(tabs)/aircraft/maintenance/invoice-detail' as any,
      params: { aircraftId, registration, invoiceId },
    });
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{lang === 'fr' ? 'Factures' : 'Invoices'}</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleRefresh} style={styles.headerIcon}>
            <Text style={styles.headerIconText}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerAdd}>
            <Text style={styles.headerAddText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Analysis Section */}
        <View style={styles.analysisSection}>
          <View style={styles.analysisTitleRow}>
            <Text style={styles.analysisTitle}>
              {lang === 'fr' ? '📊 Analyse financière' : '📊 Financial Analysis'}
            </Text>
          </View>
          
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: COLORS.greenLight }]}>
              <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Total annuel' : 'Annual Total'}</Text>
              <Text style={[styles.summaryValue, { color: COLORS.green }]}>{formatCurrency(totalExpenses)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: COLORS.blueBorder + '40' }]}>
              <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Heures volées' : 'Hours Flown'}</Text>
              <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{MOCK_ANNUAL_HOURS.toFixed(1)} h</Text>
            </View>
          </View>

          {/* Hourly Cost - Highlighted */}
          <View style={styles.hourlyCostCard}>
            <View style={styles.hourlyCostHeader}>
              <Text style={styles.hourlyCostIcon}>⏱️</Text>
              <Text style={styles.hourlyCostTitle}>
                {lang === 'fr' ? 'Coût horaire estimé' : 'Estimated Hourly Cost'}
              </Text>
            </View>
            <Text style={styles.hourlyCostValue}>{formatCurrency(hourlyCost)}/h</Text>
            <Text style={styles.hourlyCostFormula}>
              = {formatCurrency(totalExpenses)} ÷ {MOCK_ANNUAL_HOURS.toFixed(1)} h
            </Text>
          </View>

          {/* Breakdown */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownIcon}>⚙️</Text>
              <Text style={styles.breakdownLabel}>{lang === 'fr' ? 'Pièces' : 'Parts'}</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(totalParts)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownIcon}>🔧</Text>
              <Text style={styles.breakdownLabel}>{lang === 'fr' ? 'Main-d\'œuvre' : 'Labor'}</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(totalLabor)}</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownIcon}>⏰</Text>
              <Text style={styles.breakdownLabel}>{lang === 'fr' ? 'Heures' : 'Hours'}</Text>
              <Text style={styles.breakdownValue}>{totalWorkedHours.toFixed(1)} h</Text>
            </View>
          </View>

          {/* Estimative Notice */}
          <View style={styles.estimativeNotice}>
            <Text style={styles.estimativeIcon}>ℹ️</Text>
            <Text style={styles.estimativeText}>
              {lang === 'fr'
                ? 'Coût estimatif basé sur les factures enregistrées. Aucune précision fiscale garantie.'
                : 'Estimated cost based on recorded invoices. No fiscal accuracy guaranteed.'}
            </Text>
          </View>
        </View>

        {/* Invoices List */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>
            {lang === 'fr' ? `🧾 Factures (${aircraftInvoices.length})` : `🧾 Invoices (${aircraftInvoices.length})`}
          </Text>

          {aircraftInvoices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyText}>
                {lang === 'fr' ? 'Aucune facture enregistrée' : 'No invoices recorded'}
              </Text>
              <TouchableOpacity style={styles.ocrScanButton} onPress={handleOcrMock}>
                <Text style={styles.ocrScanButtonText}>📷 {lang === 'fr' ? 'Scanner une facture' : 'Scan an invoice'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardsContainer}>
              {aircraftInvoices.map((invoice) => (
                <TouchableOpacity
                  key={invoice.id}
                  style={styles.card}
                  onPress={() => navigateToDetail(invoice.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconContainer}>
                      <Text style={styles.cardIcon}>🧾</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardSupplier}>{invoice.supplier}</Text>
                      <Text style={styles.cardDate}>{invoice.date}</Text>
                    </View>
                    <Text style={styles.cardTotal}>{formatCurrency(invoice.totalAmount)}</Text>
                  </View>

                  {/* Badges */}
                  <View style={styles.badgesRow}>
                    {invoice.partsAmount > 0 && (
                      <View style={[styles.badge, { backgroundColor: COLORS.orangeLight }]}>
                        <Text style={[styles.badgeText, { color: COLORS.orange }]}>
                          ⚙️ {formatCurrency(invoice.partsAmount)}
                        </Text>
                      </View>
                    )}
                    {invoice.laborAmount > 0 && (
                      <View style={[styles.badge, { backgroundColor: COLORS.purpleLight }]}>
                        <Text style={[styles.badgeText, { color: COLORS.purple }]}>
                          🔧 {formatCurrency(invoice.laborAmount)}
                        </Text>
                      </View>
                    )}
                    {invoice.hoursWorked > 0 && (
                      <View style={[styles.badge, { backgroundColor: COLORS.blue }]}>
                        <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                          ⏰ {invoice.hoursWorked}h
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.ocrButton} onPress={handleOcrMock}>
                      <Text style={styles.ocrButtonText}>📷 OCR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(invoice.id, invoice.supplier)}
                    >
                      <Text style={styles.deleteButtonText}>{lang === 'fr' ? 'Supprimer' : 'Delete'}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {lang === 'fr'
              ? 'Information financière seulement. Ne constitue pas une validation de maintenance ni un registre officiel.'
              : 'Financial information only. Does not constitute maintenance validation nor an official record.'}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Invoice Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {lang === 'fr' ? 'Ajouter une facture' : 'Add Invoice'}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder={lang === 'fr' ? 'Fournisseur / Atelier' : 'Supplier / Shop'}
              placeholderTextColor={COLORS.textMuted}
              value={newSupplier}
              onChangeText={setNewSupplier}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={COLORS.textMuted}
              value={newDate}
              onChangeText={setNewDate}
            />
            <View style={styles.modalRow}>
              <TextInput
                style={[styles.modalInput, styles.modalHalfInput]}
                placeholder={lang === 'fr' ? 'Pièces ($)' : 'Parts ($)'}
                placeholderTextColor={COLORS.textMuted}
                value={newParts}
                onChangeText={setNewParts}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.modalInput, styles.modalHalfInput]}
                placeholder={lang === 'fr' ? 'Main-d\'œuvre ($)' : 'Labor ($)'}
                placeholderTextColor={COLORS.textMuted}
                value={newLabor}
                onChangeText={setNewLabor}
                keyboardType="decimal-pad"
              />
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder={lang === 'fr' ? 'Heures travaillées' : 'Hours worked'}
              placeholderTextColor={COLORS.textMuted}
              value={newHours}
              onChangeText={setNewHours}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder={lang === 'fr' ? 'Notes (optionnel)' : 'Notes (optional)'}
              placeholderTextColor={COLORS.textMuted}
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddModal(false); resetForm(); }}>
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
  headerIcon: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerIconText: { fontSize: 18 },
  headerAdd: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18 },
  headerAddText: { color: COLORS.white, fontSize: 22, fontWeight: '600' },
  scrollView: { flex: 1 },
  // Analysis Section
  analysisSection: { margin: 16, backgroundColor: COLORS.white, borderRadius: 16, padding: 16 },
  analysisTitleRow: { marginBottom: 16 },
  analysisTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  hourlyCostCard: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  hourlyCostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  hourlyCostIcon: { fontSize: 18, marginRight: 8 },
  hourlyCostTitle: { fontSize: 14, color: COLORS.white, fontWeight: '500' },
  hourlyCostValue: { fontSize: 32, fontWeight: '700', color: COLORS.white },
  hourlyCostFormula: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  breakdownRow: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 12 },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownIcon: { fontSize: 20, marginBottom: 4 },
  breakdownLabel: { fontSize: 11, color: COLORS.textMuted },
  breakdownValue: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginTop: 2 },
  breakdownDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },
  estimativeNotice: { flexDirection: 'row', marginTop: 12, padding: 12, backgroundColor: COLORS.blue, borderRadius: 10 },
  estimativeIcon: { fontSize: 14, marginRight: 8 },
  estimativeText: { flex: 1, fontSize: 11, color: COLORS.primary, lineHeight: 16 },
  // List Section
  listSection: { paddingHorizontal: 16 },
  listTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, marginBottom: 12 },
  cardsContainer: {},
  emptyState: { alignItems: 'center', paddingVertical: 40, backgroundColor: COLORS.white, borderRadius: 16 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: COLORS.textMuted, marginBottom: 20 },
  ocrScanButton: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  ocrScanButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  // Card
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardIcon: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardSupplier: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  cardDate: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  cardTotal: { fontSize: 18, fontWeight: '700', color: COLORS.green },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 12 },
  ocrButton: { flex: 1, backgroundColor: COLORS.blue, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  ocrButtonText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  deleteButton: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: COLORS.red, fontWeight: '600', fontSize: 14 },
  // Disclaimer
  disclaimer: { flexDirection: 'row', margin: 16, padding: 16, backgroundColor: COLORS.yellow, borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder },
  disclaimerIcon: { fontSize: 16, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.textDark, marginBottom: 12 },
  modalRow: { flexDirection: 'row', gap: 12 },
  modalHalfInput: { flex: 1 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  modalSave: { flex: 1, paddingVertical: 16, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
