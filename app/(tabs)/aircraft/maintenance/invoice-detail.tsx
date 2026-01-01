/**
 * Invoice Detail Screen - View and edit OCR extracted data
 * TC-SAFE: Financial information only, no regulatory validation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  greenLight: '#E8F5E9',
  orange: '#FF9800',
  orangeLight: '#FFF3E0',
  red: '#E53935',
  purple: '#7C4DFF',
  purpleLight: '#EDE7F6',
};

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { aircraftId, registration, invoiceId } = useLocalSearchParams<{
    aircraftId: string;
    registration: string;
    invoiceId: string;
  }>();
  const lang = getLanguage();
  const { getInvoiceById, updateInvoice } = useMaintenanceData();

  const invoice = getInvoiceById(invoiceId || '');

  const [isEditing, setIsEditing] = useState(false);
  const [editParts, setEditParts] = useState('');
  const [editLabor, setEditLabor] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (invoice) {
      setEditParts(invoice.partsAmount.toString());
      setEditLabor(invoice.laborAmount.toString());
      setEditHours(invoice.hoursWorked.toString());
      setEditNotes(invoice.notes);
    }
  }, [invoice]);

  if (!invoice) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Text style={styles.headerBackText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{lang === 'fr' ? 'Facture' : 'Invoice'}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>
            {lang === 'fr' ? 'Facture non trouvée' : 'Invoice not found'}
          </Text>
        </View>
      </View>
    );
  }

  const handleSave = () => {
    const partsAmt = parseFloat(editParts) || 0;
    const laborAmt = parseFloat(editLabor) || 0;
    const hoursAmt = parseFloat(editHours) || 0;

    updateInvoice(invoice.id, {
      partsAmount: partsAmt,
      laborAmount: laborAmt,
      hoursWorked: hoursAmt,
      totalAmount: partsAmt + laborAmt,
      notes: editNotes,
    });

    setIsEditing(false);
    Alert.alert(
      lang === 'fr' ? 'Enregistré' : 'Saved',
      lang === 'fr' ? 'Modifications enregistrées' : 'Changes saved'
    );
  };

  const handleOcrMock = () => {
    Alert.alert(
      'OCR',
      lang === 'fr' ? 'Re-scan OCR bientôt disponible' : 'OCR re-scan coming soon'
    );
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
          <Text style={styles.headerTitle}>{lang === 'fr' ? 'Détail facture' : 'Invoice Detail'}</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.headerEdit}>
          <Text style={styles.headerEditText}>{isEditing ? '✓' : '✏️'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Invoice Image Placeholder */}
        <View style={styles.imagePlaceholder}>
          <View style={styles.imageBox}>
            <Text style={styles.imageIcon}>🧾</Text>
            <Text style={styles.imageText}>
              {lang === 'fr' ? 'Image de la facture' : 'Invoice Image'}
            </Text>
            <TouchableOpacity style={styles.scanButton} onPress={handleOcrMock}>
              <Text style={styles.scanButtonText}>📷 {lang === 'fr' ? 'Scanner' : 'Scan'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Supplier Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{lang === 'fr' ? 'Fournisseur' : 'Supplier'}</Text>
            <Text style={styles.infoValue}>{invoice.supplier}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{invoice.date}</Text>
          </View>
        </View>

        {/* OCR Extracted Data */}
        <View style={styles.ocrSection}>
          <View style={styles.ocrHeader}>
            <Text style={styles.ocrIcon}>📋</Text>
            <Text style={styles.ocrTitle}>
              {lang === 'fr' ? 'Données OCR extraites' : 'OCR Extracted Data'}
            </Text>
          </View>

          {/* Parts Amount */}
          <View style={styles.ocrRow}>
            <View style={styles.ocrLabelRow}>
              <Text style={styles.ocrFieldIcon}>⚙️</Text>
              <Text style={styles.ocrFieldLabel}>{lang === 'fr' ? 'Pièces' : 'Parts'}</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.ocrInput}
                value={editParts}
                onChangeText={setEditParts}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            ) : (
              <Text style={styles.ocrValue}>{formatCurrency(invoice.partsAmount)}</Text>
            )}
          </View>

          {/* Labor Amount */}
          <View style={styles.ocrRow}>
            <View style={styles.ocrLabelRow}>
              <Text style={styles.ocrFieldIcon}>🔧</Text>
              <Text style={styles.ocrFieldLabel}>{lang === 'fr' ? 'Main-d\'œuvre' : 'Labor'}</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.ocrInput}
                value={editLabor}
                onChangeText={setEditLabor}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            ) : (
              <Text style={styles.ocrValue}>{formatCurrency(invoice.laborAmount)}</Text>
            )}
          </View>

          {/* Hours Worked */}
          <View style={styles.ocrRow}>
            <View style={styles.ocrLabelRow}>
              <Text style={styles.ocrFieldIcon}>⏰</Text>
              <Text style={styles.ocrFieldLabel}>{lang === 'fr' ? 'Heures facturées' : 'Hours Billed'}</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.ocrInput}
                value={editHours}
                onChangeText={setEditHours}
                keyboardType="decimal-pad"
                placeholder="0.0"
              />
            ) : (
              <Text style={styles.ocrValue}>{invoice.hoursWorked.toFixed(1)} h</Text>
            )}
          </View>

          {/* Divider */}
          <View style={styles.ocrDivider} />

          {/* Total */}
          <View style={styles.ocrTotalRow}>
            <View style={styles.ocrLabelRow}>
              <Text style={styles.ocrFieldIcon}>💰</Text>
              <Text style={styles.ocrTotalLabel}>TOTAL</Text>
            </View>
            <Text style={styles.ocrTotalValue}>{formatCurrency(invoice.totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>📝 Notes</Text>
          {isEditing ? (
            <TextInput
              style={styles.notesInput}
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              placeholder={lang === 'fr' ? 'Ajouter des notes...' : 'Add notes...'}
              placeholderTextColor={COLORS.textMuted}
            />
          ) : (
            <Text style={styles.notesText}>
              {invoice.notes || (lang === 'fr' ? 'Aucune note' : 'No notes')}
            </Text>
          )}
        </View>

        {/* Save Button (when editing) */}
        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {lang === 'fr' ? 'Enregistrer les modifications' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Manual Correction Notice */}
        <View style={styles.correctionNotice}>
          <Text style={styles.correctionIcon}>✏️</Text>
          <Text style={styles.correctionText}>
            {lang === 'fr'
              ? 'Vous pouvez corriger manuellement les valeurs extraites par OCR en appuyant sur l\'icône de modification.'
              : 'You can manually correct OCR-extracted values by tapping the edit icon.'}
          </Text>
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
  headerEdit: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerEditText: { fontSize: 20 },
  headerRight: { width: 40 },
  scrollView: { flex: 1 },
  // Error State
  errorState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: COLORS.textMuted },
  // Image Placeholder
  imagePlaceholder: { margin: 16 },
  imageBox: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 40,
    alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.border,
  },
  imageIcon: { fontSize: 64, marginBottom: 12 },
  imageText: { fontSize: 16, color: COLORS.textMuted, marginBottom: 16 },
  scanButton: { backgroundColor: COLORS.blue, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  scanButtonText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  // Info Card
  infoCard: { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { fontSize: 14, color: COLORS.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  // OCR Section
  ocrSection: { margin: 16, backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  ocrHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ocrIcon: { fontSize: 18, marginRight: 8 },
  ocrTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  ocrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  ocrLabelRow: { flexDirection: 'row', alignItems: 'center' },
  ocrFieldIcon: { fontSize: 16, marginRight: 8 },
  ocrFieldLabel: { fontSize: 14, color: COLORS.textMuted },
  ocrValue: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  ocrInput: { backgroundColor: COLORS.background, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, fontSize: 16, fontWeight: '600', color: COLORS.textDark, minWidth: 100, textAlign: 'right' },
  ocrDivider: { height: 2, backgroundColor: COLORS.border, marginVertical: 8 },
  ocrTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  ocrTotalLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  ocrTotalValue: { fontSize: 24, fontWeight: '700', color: COLORS.green },
  // Notes Section
  notesSection: { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  notesTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 12 },
  notesText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  notesInput: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.textDark, minHeight: 80, textAlignVertical: 'top' },
  // Save Button
  saveButton: { marginHorizontal: 16, marginTop: 16, backgroundColor: COLORS.green, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  // Correction Notice
  correctionNotice: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, padding: 12, backgroundColor: COLORS.blue, borderRadius: 10 },
  correctionIcon: { fontSize: 14, marginRight: 8 },
  correctionText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 16 },
  // Disclaimer
  disclaimer: { flexDirection: 'row', margin: 16, padding: 16, backgroundColor: COLORS.yellow, borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder },
  disclaimerIcon: { fontSize: 16, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18 },
});
