/**
 * OCR History Screen - View all scanned documents
 * TC-SAFE: Read-only access to scanned documents
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useOcr, OcrDocument } from '@/stores/ocrStore';

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
  green: '#4CAF50',
  greenLight: '#E8F5E9',
  orange: '#FF9800',
  orangeLight: '#FFF3E0',
  red: '#E53935',
  purple: '#7C4DFF',
  purpleLight: '#EDE7F6',
  teal: '#00897B',
  tealLight: '#E0F2F1',
};

const getDocTypeConfig = (type: string, lang: string) => {
  switch (type) {
    case 'maintenance_report':
      return {
        icon: '📋',
        label: lang === 'fr' ? 'Rapport maintenance' : 'Maintenance Report',
        color: COLORS.teal,
        bgColor: COLORS.tealLight,
      };
    case 'invoice':
      return {
        icon: '🧾',
        label: lang === 'fr' ? 'Facture' : 'Invoice',
        color: COLORS.purple,
        bgColor: COLORS.purpleLight,
      };
    default:
      return {
        icon: '📄',
        label: lang === 'fr' ? 'Autre' : 'Other',
        color: COLORS.textMuted,
        bgColor: COLORS.background,
      };
  }
};

interface DocumentCardProps {
  document: OcrDocument;
  lang: string;
  onPress: () => void;
}

function DocumentCard({ document, lang, onPress }: DocumentCardProps) {
  const config = getDocTypeConfig(document.type, lang);
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconContainer, { backgroundColor: config.bgColor }]}>
          <Text style={styles.cardIcon}>{config.icon}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{config.label}</Text>
          <Text style={styles.cardRegistration}>{document.registration}</Text>
        </View>
        <View style={styles.cardDateContainer}>
          <Text style={styles.cardDate}>{document.documentDate || document.scanDate}</Text>
          {document.validated && (
            <View style={styles.validatedBadge}>
              <Text style={styles.validatedText}>✓</Text>
            </View>
          )}
        </View>
      </View>

      {/* Document details based on type */}
      {document.type === 'maintenance_report' && document.maintenanceData && (
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>AMO:</Text>
            <Text style={styles.detailValue}>{document.maintenanceData.amo || '—'}</Text>
          </View>
          {document.maintenanceData.hours && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{lang === 'fr' ? 'Heures:' : 'Hours:'}</Text>
              <Text style={styles.detailValue}>
                {document.maintenanceData.hours.airframeHours?.toFixed(1) || '—'} / {document.maintenanceData.hours.engineHours?.toFixed(1) || '—'}
              </Text>
            </View>
          )}
          {document.maintenanceData.parts && document.maintenanceData.parts.length > 0 && (
            <View style={styles.badgesRow}>
              <View style={[styles.miniPadge, { backgroundColor: COLORS.blue }]}>
                <Text style={[styles.miniBadgeText, { color: COLORS.primary }]}>
                  {document.maintenanceData.parts.length} {lang === 'fr' ? 'pièces' : 'parts'}
                </Text>
              </View>
              {document.maintenanceData.adSbs && document.maintenanceData.adSbs.length > 0 && (
                <View style={[styles.miniPadge, { backgroundColor: COLORS.orangeLight }]}>
                  <Text style={[styles.miniBadgeText, { color: COLORS.orange }]}>
                    {document.maintenanceData.adSbs.length} AD/SB
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {document.type === 'invoice' && document.invoiceData && (
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{lang === 'fr' ? 'Fournisseur:' : 'Supplier:'}</Text>
            <Text style={styles.detailValue}>{document.invoiceData.invoice.supplier}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={[styles.detailValue, styles.totalValue]}>
              ${document.invoiceData.invoice.totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {/* Applied modules */}
      {document.appliedToModules.length > 0 && (
        <View style={styles.appliedRow}>
          <Text style={styles.appliedLabel}>
            {lang === 'fr' ? 'Appliqué à:' : 'Applied to:'}
          </Text>
          <View style={styles.appliedModules}>
            {document.appliedToModules.map((mod, index) => (
              <Text key={index} style={styles.appliedModule}>{mod}</Text>
            ))}
          </View>
        </View>
      )}

      {/* Scan info */}
      <View style={styles.cardFooter}>
        <Text style={styles.scanInfo}>
          {document.sourceType === 'photo' ? '📸' : '📁'} {lang === 'fr' ? 'Scanné le' : 'Scanned on'} {document.scanDate}
        </Text>
        <Text style={styles.cardArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OcrHistoryScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const { documents, getDocumentsByAircraft } = useOcr();

  const aircraftDocuments = getDocumentsByAircraft(aircraftId || '');

  // Group by type
  const reportDocs = aircraftDocuments.filter((d) => d.type === 'maintenance_report');
  const invoiceDocs = aircraftDocuments.filter((d) => d.type === 'invoice');
  const otherDocs = aircraftDocuments.filter((d) => d.type === 'other');

  const handleDocumentPress = (doc: OcrDocument) => {
    // In real app, navigate to document detail
    // For now, show alert with info
    const info = doc.type === 'maintenance_report' && doc.maintenanceData
      ? `AMO: ${doc.maintenanceData.amo}\n${lang === 'fr' ? 'Description' : 'Description'}: ${doc.maintenanceData.description?.substring(0, 100)}...`
      : doc.type === 'invoice' && doc.invoiceData
      ? `${lang === 'fr' ? 'Fournisseur' : 'Supplier'}: ${doc.invoiceData.invoice.supplier}\nTotal: $${doc.invoiceData.invoice.totalAmount.toFixed(2)}`
      : lang === 'fr' ? 'Document archivé' : 'Archived document';
    
    // Just visual feedback for now
  };

  const navigateToScanner = () => {
    router.push({
      pathname: '/(tabs)/aircraft/ocr-scan',
      params: { aircraftId, registration },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{lang === 'fr' ? 'Historique OCR' : 'OCR History'}</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <TouchableOpacity onPress={navigateToScanner} style={styles.headerAdd}>
          <Text style={styles.headerAddText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.tealLight }]}>
            <Text style={styles.summaryIcon}>📋</Text>
            <Text style={[styles.summaryValue, { color: COLORS.teal }]}>{reportDocs.length}</Text>
            <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Rapports' : 'Reports'}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.purpleLight }]}>
            <Text style={styles.summaryIcon}>🧾</Text>
            <Text style={[styles.summaryValue, { color: COLORS.purple }]}>{invoiceDocs.length}</Text>
            <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Factures' : 'Invoices'}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: COLORS.background }]}>
            <Text style={styles.summaryIcon}>📄</Text>
            <Text style={[styles.summaryValue, { color: COLORS.textMuted }]}>{otherDocs.length}</Text>
            <Text style={styles.summaryLabel}>{lang === 'fr' ? 'Autres' : 'Others'}</Text>
          </View>
        </View>

        {/* Documents List */}
        {aircraftDocuments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>
              {lang === 'fr' ? 'Aucun document scanné' : 'No scanned documents'}
            </Text>
            <Text style={styles.emptyText}>
              {lang === 'fr'
                ? 'Scannez vos rapports de maintenance pour faire vivre votre avion'
                : 'Scan your maintenance reports to bring your aircraft to life'}
            </Text>
            <TouchableOpacity style={styles.scanButton} onPress={navigateToScanner}>
              <Text style={styles.scanButtonText}>
                📷 {lang === 'fr' ? 'Scanner un document' : 'Scan a document'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.documentsList}>
            <Text style={styles.listTitle}>
              {lang === 'fr' ? `Tous les documents (${aircraftDocuments.length})` : `All documents (${aircraftDocuments.length})`}
            </Text>
            {aircraftDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                lang={lang}
                onPress={() => handleDocumentPress(doc)}
              />
            ))}
          </View>
        )}

        {/* Info Notice */}
        <View style={styles.infoNotice}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            {lang === 'fr'
              ? 'Les rapports de maintenance sont la source principale pour mettre à jour les compteurs de votre avion. Importez-les du plus ancien au plus récent pour un suivi optimal.'
              : 'Maintenance reports are the primary source for updating your aircraft counters. Import them from oldest to newest for optimal tracking.'}
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {lang === 'fr'
              ? 'Données extraites par OCR à titre informatif. Toute information doit être validée par l\'utilisateur. Ne remplace pas un AME, un AMO ni un registre officiel.'
              : 'OCR-extracted data provided for information purposes only. User validation is required. Does not replace an AME, AMO, or official record.'}
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
  headerAdd: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18 },
  headerAddText: { color: COLORS.white, fontSize: 22, fontWeight: '600' },
  scrollView: { flex: 1 },
  // Summary
  summaryRow: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryIcon: { fontSize: 24, marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 24 },
  scanButton: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  scanButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  // Documents List
  documentsList: { paddingHorizontal: 16 },
  listTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, marginBottom: 12 },
  // Card
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardIcon: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  cardRegistration: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cardDateContainer: { alignItems: 'flex-end' },
  cardDate: { fontSize: 12, color: COLORS.textMuted },
  validatedBadge: { marginTop: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.greenLight, justifyContent: 'center', alignItems: 'center' },
  validatedText: { fontSize: 12, color: COLORS.green, fontWeight: '600' },
  // Card Details
  cardDetails: { paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.background },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { fontSize: 12, color: COLORS.textMuted, width: 80 },
  detailValue: { flex: 1, fontSize: 12, fontWeight: '500', color: COLORS.textDark },
  totalValue: { color: COLORS.green, fontWeight: '700' },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  miniPadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniBadgeText: { fontSize: 10, fontWeight: '600' },
  // Applied
  appliedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.background },
  appliedLabel: { fontSize: 11, color: COLORS.textMuted, marginRight: 8 },
  appliedModules: { flexDirection: 'row', gap: 6 },
  appliedModule: { fontSize: 10, color: COLORS.primary, backgroundColor: COLORS.blue, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  // Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.background },
  scanInfo: { flex: 1, fontSize: 11, color: COLORS.textMuted },
  cardArrow: { fontSize: 18, color: COLORS.textMuted },
  // Info Notice
  infoNotice: { flexDirection: 'row', margin: 16, padding: 14, backgroundColor: COLORS.blue, borderRadius: 12 },
  infoIcon: { fontSize: 14, marginRight: 10 },
  infoText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  // Disclaimer
  disclaimer: { flexDirection: 'row', marginHorizontal: 16, padding: 14, backgroundColor: COLORS.yellow, borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder },
  disclaimerIcon: { fontSize: 14, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 11, color: '#5D4037', lineHeight: 16 },
});
