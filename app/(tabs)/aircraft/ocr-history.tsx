/**
 * OCR History Screen - View all scanned documents from backend
 * TC-SAFE: Read-only access to scanned documents
 * 
 * ENHANCED UX:
 * - "Apply to aircraft" mandatory banner for maintenance_report + COMPLETED
 * - Detected components preview before Apply
 * - Explanatory UI for the OCR → Apply → Critical Components flow
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
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getLanguage } from '@/i18n';
import ocrService, { OCRScanResponse, DocumentType, ExtractedMaintenanceData } from '@/services/ocrService';
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';
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
  green: '#4CAF50',
  greenLight: '#E8F5E9',
  orange: '#FF9800',
  orangeLight: '#FFF3E0',
  red: '#E53935',
  redLight: '#FFEBEE',
  purple: '#7C4DFF',
  purpleLight: '#EDE7F6',
  teal: '#00897B',
  tealLight: '#E0F2F1',
};

// Critical component types that will be detected
const CRITICAL_COMPONENT_TYPES = [
  'ENGINE', 'MAGNETO', 'PROPELLER', 'VACUUM_PUMP', 'ALTERNATOR', 'STARTER',
  'CYLINDER', 'TURBOCHARGER', 'FUEL_PUMP', 'OIL_PUMP'
];

const getDocTypeConfig = (type: DocumentType, lang: string) => {
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
    case 'stc':
      return {
        icon: '📜',
        label: 'STC',
        color: COLORS.orange,
        bgColor: COLORS.orangeLight,
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

const getStatusBadge = (status: string, lang: string) => {
  switch (status) {
    case 'APPLIED':
      return { label: lang === 'fr' ? 'Appliqué' : 'Applied', color: COLORS.green, bgColor: COLORS.greenLight };
    case 'COMPLETED':
      return { label: lang === 'fr' ? 'En attente' : 'Pending', color: COLORS.orange, bgColor: COLORS.orangeLight };
    case 'FAILED':
      return { label: lang === 'fr' ? 'Échec' : 'Failed', color: COLORS.red, bgColor: COLORS.redLight };
    default:
      return { label: status, color: COLORS.textMuted, bgColor: COLORS.background };
  }
};

/**
 * Detect potential critical components from extracted data or raw text
 * This is purely for PREVIEW - actual detection is done by backend on Apply
 */
const detectComponentsPreview = (doc: OCRScanResponse): { type: string; phrase: string }[] => {
  const detected: { type: string; phrase: string }[] = [];
  
  const data = doc.extracted_data;
  const rawText = doc.raw_text || '';
  
  // Check parts_replaced for critical components
  if (data?.parts_replaced && Array.isArray(data.parts_replaced)) {
    for (const part of data.parts_replaced) {
      const name = (part.name || '').toUpperCase();
      const pn = (part.part_number || '').toUpperCase();
      
      // Engine
      if (name.includes('ENGINE') || name.includes('MOTEUR')) {
        detected.push({ type: 'ENGINE', phrase: part.name || part.part_number || 'Engine' });
      }
      // Magneto
      if (name.includes('MAGNETO') || name.includes('MAG')) {
        detected.push({ type: 'MAGNETO', phrase: part.name || part.part_number || 'Magneto' });
      }
      // Propeller
      if (name.includes('PROPELLER') || name.includes('PROP') || name.includes('HÉLICE')) {
        detected.push({ type: 'PROPELLER', phrase: part.name || part.part_number || 'Propeller' });
      }
      // Vacuum Pump
      if (name.includes('VACUUM') || name.includes('GYRO PUMP')) {
        detected.push({ type: 'VACUUM_PUMP', phrase: part.name || part.part_number || 'Vacuum Pump' });
      }
      // Alternator
      if (name.includes('ALTERNATOR') || name.includes('ALTERNATEUR')) {
        detected.push({ type: 'ALTERNATOR', phrase: part.name || part.part_number || 'Alternator' });
      }
      // Starter
      if (name.includes('STARTER') || name.includes('DÉMARREUR')) {
        detected.push({ type: 'STARTER', phrase: part.name || part.part_number || 'Starter' });
      }
    }
  }
  
  // Also check raw text for mentions
  const textUpper = rawText.toUpperCase();
  
  const keywords: { type: string; patterns: string[] }[] = [
    { type: 'ENGINE', patterns: ['ENGINE OVERHAUL', 'ENGINE REPLACED', 'ENGINE INSTALLED', 'MOTEUR REMPLACÉ'] },
    { type: 'MAGNETO', patterns: ['MAGNETO REPLACED', 'LEFT MAG', 'RIGHT MAG', 'BENDIX MAG', 'SLICK MAG'] },
    { type: 'PROPELLER', patterns: ['PROP OVERHAUL', 'PROPELLER REPLACED', 'HÉLICE REMPLACÉE'] },
    { type: 'VACUUM_PUMP', patterns: ['VACUUM PUMP', 'GYRO PUMP'] },
  ];
  
  for (const kw of keywords) {
    for (const pattern of kw.patterns) {
      if (textUpper.includes(pattern) && !detected.find(d => d.type === kw.type)) {
        // Extract surrounding context
        const idx = textUpper.indexOf(pattern);
        const start = Math.max(0, idx - 20);
        const end = Math.min(rawText.length, idx + pattern.length + 20);
        const phrase = rawText.substring(start, end).trim();
        detected.push({ type: kw.type, phrase: phrase || pattern });
      }
    }
  }
  
  return detected;
};

interface DocumentCardProps {
  document: OCRScanResponse;
  lang: string;
  onPress: () => void;
}

function DocumentCard({ document, lang, onPress }: DocumentCardProps) {
  const config = getDocTypeConfig(document.document_type, lang);
  const statusBadge = getStatusBadge(document.status, lang);
  const data = document.extracted_data;
  
  // Check if this is a maintenance report that needs to be applied
  const needsApply = document.document_type === 'maintenance_report' && 
                     document.status === 'COMPLETED';
  
  return (
    <TouchableOpacity 
      style={[styles.card, needsApply && styles.cardNeedsApply]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      {/* Needs Apply indicator */}
      {needsApply && (
        <View style={styles.needsApplyBanner}>
          <Text style={styles.needsApplyText}>
            {lang === 'fr' ? '⚠️ En attente d\'application' : '⚠️ Awaiting application'}
          </Text>
        </View>
      )}
      
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconContainer, { backgroundColor: config.bgColor }]}>
          <Text style={styles.cardIcon}>{config.icon}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{config.label}</Text>
          <Text style={styles.cardDate}>{data?.date || document.created_at.split('T')[0]}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bgColor }]}>
          <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
        </View>
      </View>

      {/* Document details based on type */}
      {document.document_type === 'maintenance_report' && data && (
        <View style={styles.cardDetails}>
          {data.amo_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>AMO:</Text>
              <Text style={styles.detailValue}>{data.amo_name}</Text>
            </View>
          )}
          {(data.airframe_hours != null || data.engine_hours != null) && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{lang === 'fr' ? 'Heures:' : 'Hours:'}</Text>
              <Text style={styles.detailValue}>
                {data.airframe_hours != null ? data.airframe_hours.toFixed(1) : '—'} / {data.engine_hours != null ? data.engine_hours.toFixed(1) : '—'}
              </Text>
            </View>
          )}
          <View style={styles.badgesRow}>
            {data.parts_replaced && data.parts_replaced.length > 0 && (
              <View style={[styles.miniBadge, { backgroundColor: COLORS.blue }]}>
                <Text style={[styles.miniBadgeText, { color: COLORS.primary }]}>
                  {data.parts_replaced.length} {lang === 'fr' ? 'pièces' : 'parts'}
                </Text>
              </View>
            )}
            {data.ad_sb_references && data.ad_sb_references.length > 0 && (
              <View style={[styles.miniBadge, { backgroundColor: COLORS.orangeLight }]}>
                <Text style={[styles.miniBadgeText, { color: COLORS.orange }]}>
                  {data.ad_sb_references.length} AD/SB
                </Text>
              </View>
            )}
            {data.elt_data?.detected && (
              <View style={[styles.miniBadge, { backgroundColor: COLORS.tealLight }]}>
                <Text style={[styles.miniBadgeText, { color: COLORS.teal }]}>ELT</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {document.document_type === 'invoice' && data && (
        <View style={styles.cardDetails}>
          {data.total_cost != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total:</Text>
              <Text style={[styles.detailValue, styles.totalValue]}>
                ${data.total_cost.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Scan info */}
      <View style={styles.cardFooter}>
        <Text style={styles.scanInfo}>
          {lang === 'fr' ? 'Scanné le' : 'Scanned on'} {document.created_at.split('T')[0]}
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
  
  // Stores for applying data
  const { refreshAircraft } = useAircraftLocalStore();
  const { syncWithBackend } = useMaintenanceData();

  const [documents, setDocuments] = useState<OCRScanResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detail modal state
  const [selectedDoc, setSelectedDoc] = useState<OCRScanResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Detected components preview
  const [detectedComponents, setDetectedComponents] = useState<{ type: string; phrase: string }[]>([]);

  const loadHistory = useCallback(async () => {
    if (!aircraftId) return;
    
    try {
      setError(null);
      const history = await ocrService.getHistory(aircraftId, 50);
      setDocuments(history);
    } catch (err: any) {
      console.log('Error loading OCR history:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [aircraftId]);

  // Load on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadHistory();
  };

  // Count by type
  const reportDocs = documents.filter((d) => d.document_type === 'maintenance_report');
  const invoiceDocs = documents.filter((d) => d.document_type === 'invoice');
  const otherDocs = documents.filter((d) => d.document_type === 'other' || d.document_type === 'stc');
  
  // Count pending applications
  const pendingApply = documents.filter(
    (d) => d.document_type === 'maintenance_report' && d.status === 'COMPLETED'
  ).length;

  const handleDocumentPress = (doc: OCRScanResponse) => {
    setSelectedDoc(doc);
    
    // Detect components preview if maintenance report
    if (doc.document_type === 'maintenance_report') {
      const components = detectComponentsPreview(doc);
      setDetectedComponents(components);
    } else {
      setDetectedComponents([]);
    }
    
    setShowDetailModal(true);
  };
  
  const handleApplyData = async () => {
    if (!selectedDoc || !aircraftId) return;
    
    setIsApplying(true);
    try {
      // 1. Call backend to apply OCR data
      await ocrService.applyResults(selectedDoc.id, true);
      
      // 2. Sync aircraft data from backend (heures mises à jour)
      await refreshAircraft();
      
      // 3. Sync maintenance data from backend (pièces, AD/SB, factures, composants critiques)
      await syncWithBackend(aircraftId);
      
      Alert.alert(
        lang === 'fr' ? 'Succès' : 'Success',
        lang === 'fr' 
          ? 'Rapport appliqué avec succès. Les composants critiques ont été mis à jour.'
          : 'Report applied successfully. Critical components have been updated.',
        [{ text: 'OK' }]
      );
      
      setShowDetailModal(false);
      loadHistory();
      
    } catch (err: any) {
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        err.response?.data?.detail || err.message || (lang === 'fr' ? 'Échec de l\'application' : 'Failed to apply')
      );
    } finally {
      setIsApplying(false);
    }
  };
  
  const handleDeleteScan = async () => {
    if (!selectedDoc) return;
    
    Alert.alert(
      lang === 'fr' ? 'Confirmer suppression' : 'Confirm Delete',
      lang === 'fr' ? 'Voulez-vous vraiment supprimer ce scan?' : 'Are you sure you want to delete this scan?',
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await ocrService.deleteScan(selectedDoc.id);
              setShowDetailModal(false);
              loadHistory();
              Alert.alert(
                lang === 'fr' ? 'Supprimé' : 'Deleted',
                lang === 'fr' ? 'Scan supprimé avec succès' : 'Scan deleted successfully'
              );
            } catch (err: any) {
              Alert.alert(
                lang === 'fr' ? 'Erreur' : 'Error',
                err.message || (lang === 'fr' ? 'Échec de la suppression' : 'Failed to delete')
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };
  
  // Render detail modal content
  const renderDetailModalContent = () => {
    if (!selectedDoc) return null;
    
    const data: any = selectedDoc.extracted_data || {};
    const config = getDocTypeConfig(selectedDoc.document_type, lang);
    
    // Check if this needs to be applied
    const needsApply = selectedDoc.document_type === 'maintenance_report' && 
                       selectedDoc.status === 'COMPLETED';
    const isApplied = selectedDoc.status === 'APPLIED';
    
    return (
      <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
        {/* ========== APPLY REQUIRED BANNER ========== */}
        {needsApply && (
          <View style={styles.applyRequiredBanner}>
            <Text style={styles.applyRequiredIcon}>⚠️</Text>
            <View style={styles.applyRequiredContent}>
              <Text style={styles.applyRequiredTitle}>
                {lang === 'fr' 
                  ? 'Rapport de maintenance non appliqué' 
                  : 'Maintenance report not applied'}
              </Text>
              <Text style={styles.applyRequiredSubtitle}>
                {lang === 'fr'
                  ? 'Les données ne sont pas encore enregistrées sur l\'aéronef'
                  : 'Data has not been saved to aircraft yet'}
              </Text>
            </View>
          </View>
        )}
        
        {/* Applied success banner */}
        {isApplied && (
          <View style={styles.appliedBanner}>
            <Text style={styles.appliedIcon}>✅</Text>
            <Text style={styles.appliedText}>
              {lang === 'fr' ? 'Rapport appliqué avec succès' : 'Report applied successfully'}
            </Text>
          </View>
        )}
        
        {/* Header Info */}
        <View style={[styles.modalTypeTag, { backgroundColor: config.bgColor }]}>
          <Text style={styles.modalTypeIcon}>{config.icon}</Text>
          <Text style={[styles.modalTypeLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        
        <Text style={styles.modalDate}>
          {lang === 'fr' ? 'Scanné le' : 'Scanned on'} {selectedDoc.created_at?.split('T')[0]}
        </Text>
        
        {/* ========== DETECTED COMPONENTS PREVIEW (before Apply) ========== */}
        {needsApply && selectedDoc.document_type === 'maintenance_report' && (
          <View style={styles.componentsPreviewSection}>
            <Text style={styles.componentsPreviewTitle}>
              🔧 {lang === 'fr' ? 'Composants détectés (aperçu)' : 'Detected components (preview)'}
            </Text>
            
            {detectedComponents.length > 0 ? (
              <View style={styles.componentsList}>
                {detectedComponents.map((comp, idx) => (
                  <View key={idx} style={styles.componentItem}>
                    <View style={styles.componentBadge}>
                      <Text style={styles.componentBadgeText}>{comp.type}</Text>
                    </View>
                    <Text style={styles.componentPhrase} numberOfLines={2}>
                      "{comp.phrase}"
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noComponentsBox}>
                <Text style={styles.noComponentsText}>
                  {lang === 'fr' 
                    ? 'Aucun composant critique détecté dans ce rapport.'
                    : 'No critical components detected in this report.'}
                </Text>
              </View>
            )}
            
            <Text style={styles.componentsNote}>
              {lang === 'fr'
                ? 'Les composants seront créés/mis à jour lors de l\'application.'
                : 'Components will be created/updated when applied.'}
            </Text>
          </View>
        )}
        
        {/* Maintenance Report Data */}
        {selectedDoc.document_type === 'maintenance_report' && (
          <View style={styles.dataSection}>
            <Text style={styles.dataSectionTitle}>
              {lang === 'fr' ? 'Données extraites' : 'Extracted Data'}
            </Text>
            
            {/* AMO */}
            {(data.amo_name || data.amo) && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>AMO:</Text>
                <Text style={styles.dataValue}>{data.amo_name || data.amo}</Text>
              </View>
            )}
            
            {/* AME */}
            {(data.ame_name || data.ame_license) && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>AME:</Text>
                <Text style={styles.dataValue}>{data.ame_name}{data.ame_license ? ` (${data.ame_license})` : ''}</Text>
              </View>
            )}
            
            {/* Date */}
            {(data.date || data.report_date) && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Date:' : 'Date:'}</Text>
                <Text style={styles.dataValue}>{data.date || data.report_date}</Text>
              </View>
            )}
            
            {data.airframe_hours != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Heures cellule:' : 'Airframe hours:'}</Text>
                <Text style={[styles.dataValue, styles.dataHighlight]}>{Number(data.airframe_hours).toFixed(1)}</Text>
              </View>
            )}
            
            {data.engine_hours != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Heures moteur:' : 'Engine hours:'}</Text>
                <Text style={[styles.dataValue, styles.dataHighlight]}>{Number(data.engine_hours).toFixed(1)}</Text>
              </View>
            )}
            
            {data.propeller_hours != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Heures hélice:' : 'Propeller hours:'}</Text>
                <Text style={[styles.dataValue, styles.dataHighlight]}>{Number(data.propeller_hours).toFixed(1)}</Text>
              </View>
            )}
            
            {/* Description */}
            {(data.description || data.work_performed) && (
              <View style={styles.dataRowFull}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Description:' : 'Description:'}</Text>
                <Text style={styles.dataValueMulti}>{data.description || data.work_performed}</Text>
              </View>
            )}
            
            {data.parts_replaced && data.parts_replaced.length > 0 && (
              <View style={styles.dataRowFull}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Pièces remplacées:' : 'Parts replaced:'}</Text>
                {data.parts_replaced.map((part: any, idx: number) => (
                  <Text key={idx} style={styles.listItem}>
                    • {part.part_number || part.name || 'N/A'} {part.quantity ? `(x${Math.round(part.quantity)})` : ''} {part.price ? `- $${part.price}` : ''}
                  </Text>
                ))}
              </View>
            )}
            
            {/* AD/SB references */}
            {((data.ad_sb_references && data.ad_sb_references.length > 0) || (data.ad_notes && data.ad_notes.length > 0)) && (
              <View style={styles.dataRowFull}>
                <Text style={styles.dataLabel}>AD/SB:</Text>
                {(data.ad_sb_references || data.ad_notes || []).map((ad: any, idx: number) => (
                  <Text key={idx} style={styles.listItem}>
                    • {ad.reference_number || ad.ad_number}: {ad.description || ad.compliance_status || ad.status || ''}
                  </Text>
                ))}
              </View>
            )}
            
            {data.stc_references && data.stc_references.length > 0 && (
              <View style={styles.dataRowFull}>
                <Text style={styles.dataLabel}>STC:</Text>
                {data.stc_references.map((stc: any, idx: number) => (
                  <Text key={idx} style={styles.listItem}>
                    • {stc.number}: {stc.description || ''}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
        
        {/* Invoice Data */}
        {selectedDoc.document_type === 'invoice' && (
          <View style={styles.dataSection}>
            <Text style={styles.dataSectionTitle}>
              {lang === 'fr' ? 'Détails facture' : 'Invoice Details'}
            </Text>
            
            {(data.vendor_name || data.amo) && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Fournisseur:' : 'Vendor:'}</Text>
                <Text style={styles.dataValue}>{data.vendor_name || data.amo}</Text>
              </View>
            )}
            
            {(data.invoice_date || data.report_date) && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Date:</Text>
                <Text style={styles.dataValue}>{data.invoice_date || data.report_date}</Text>
              </View>
            )}
            
            {data.invoice_number && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'N° Facture:' : 'Invoice #:'}</Text>
                <Text style={styles.dataValue}>{data.invoice_number}</Text>
              </View>
            )}
            
            {data.labor_hours != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Heures travail:' : 'Labor hours:'}</Text>
                <Text style={styles.dataValue}>{Number(data.labor_hours).toFixed(1)}h</Text>
              </View>
            )}
            
            {data.labor_cost != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Main-d\'œuvre:' : 'Labor:'}</Text>
                <Text style={styles.dataValue}>${Number(data.labor_cost).toFixed(2)}</Text>
              </View>
            )}
            
            {data.parts_cost != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Pièces:' : 'Parts:'}</Text>
                <Text style={styles.dataValue}>${Number(data.parts_cost).toFixed(2)}</Text>
              </View>
            )}
            
            {data.total_cost != null && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Total:</Text>
                <Text style={[styles.dataValue, styles.dataHighlight, styles.totalCost]}>
                  ${Number(data.total_cost).toFixed(2)}
                </Text>
              </View>
            )}
            
            {/* Parts from Invoice */}
            {data.parts_replaced && data.parts_replaced.length > 0 && (
              <View style={styles.dataRowFull}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Pièces détaillées:' : 'Parts detailed:'}</Text>
                {data.parts_replaced.map((part: any, idx: number) => (
                  <Text key={idx} style={styles.listItem}>
                    • {part.part_number || 'N/A'}: {part.description || ''} {part.quantity ? `(x${Math.round(part.quantity)})` : ''} {part.price ? `- $${part.price}` : ''}
                  </Text>
                ))}
              </View>
            )}
            
            {data.work_performed && (
              <View style={styles.dataRowFull}>
                <Text style={styles.dataLabel}>{lang === 'fr' ? 'Description:' : 'Description:'}</Text>
                <Text style={styles.dataValueMulti}>{data.work_performed}</Text>
              </View>
            )}
          </View>
        )}
        
        {/* ========== TC-SAFE DISCLAIMER ========== */}
        {needsApply && (
          <View style={styles.tcSafeNotice}>
            <Text style={styles.tcSafeIcon}>ℹ️</Text>
            <Text style={styles.tcSafeText}>
              {lang === 'fr'
                ? 'L\'application de ce rapport mettra à jour les composants installés et l\'historique de maintenance. Informatif seulement — vérifiez avec votre TEA/AME.'
                : 'Applying this report will update installed components and maintenance history. Informational only — verify with your AME/TEA.'}
            </Text>
          </View>
        )}
      </ScrollView>
    );
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {lang === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadHistory}>
            <Text style={styles.retryText}>{lang === 'fr' ? 'Réessayer' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Pending Apply Alert */}
          {pendingApply > 0 && (
            <View style={styles.pendingApplyAlert}>
              <Text style={styles.pendingApplyIcon}>⚠️</Text>
              <View style={styles.pendingApplyContent}>
                <Text style={styles.pendingApplyTitle}>
                  {lang === 'fr' 
                    ? `${pendingApply} rapport(s) en attente d'application`
                    : `${pendingApply} report(s) awaiting application`}
                </Text>
                <Text style={styles.pendingApplySubtitle}>
                  {lang === 'fr'
                    ? 'Appliquez-les pour mettre à jour les composants critiques'
                    : 'Apply them to update critical components'}
                </Text>
              </View>
            </View>
          )}
          
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
          {documents.length === 0 ? (
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
                {lang === 'fr' ? `Tous les documents (${documents.length})` : `All documents (${documents.length})`}
              </Text>
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  lang={lang}
                  onPress={() => handleDocumentPress(doc)}
                />
              ))}
            </View>
          )}

          {/* Info Notice - Flow explanation */}
          <View style={styles.flowExplanation}>
            <Text style={styles.flowTitle}>
              {lang === 'fr' ? '📚 Comment ça marche' : '📚 How it works'}
            </Text>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepNumber}>1</Text>
              <Text style={styles.flowStepText}>
                {lang === 'fr' ? 'Scannez un rapport de maintenance' : 'Scan a maintenance report'}
              </Text>
            </View>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepNumber}>2</Text>
              <Text style={styles.flowStepText}>
                {lang === 'fr' ? 'Vérifiez les données extraites' : 'Review extracted data'}
              </Text>
            </View>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepNumber}>3</Text>
              <Text style={styles.flowStepText}>
                {lang === 'fr' ? 'Appliquez à l\'aéronef' : 'Apply to aircraft'}
              </Text>
            </View>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepNumber}>4</Text>
              <Text style={styles.flowStepText}>
                {lang === 'fr' ? 'Les composants critiques sont mis à jour' : 'Critical components are updated'}
              </Text>
            </View>
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
      )}
      
      {/* Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {lang === 'fr' ? 'Détails du scan' : 'Scan Details'}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {renderDetailModalContent()}
            
            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleDeleteScan}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={COLORS.red} />
                ) : (
                  <Text style={styles.deleteButtonText}>
                    🗑️ {lang === 'fr' ? 'Supprimer' : 'Delete'}
                  </Text>
                )}
              </TouchableOpacity>
              
              {/* Show Apply button only for maintenance_report + COMPLETED */}
              {selectedDoc?.document_type === 'maintenance_report' && 
               selectedDoc?.status === 'COMPLETED' && (
                <TouchableOpacity 
                  style={styles.applyButton} 
                  onPress={handleApplyData}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.applyButtonText}>
                      ✓ {lang === 'fr' ? 'Appliquer à l\'aéronef' : 'Apply to aircraft'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
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
  headerAdd: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18 },
  headerAddText: { color: COLORS.white, fontSize: 22, fontWeight: '600' },
  scrollView: { flex: 1 },
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  // Error
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 14, color: COLORS.red, textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  // Pending Apply Alert
  pendingApplyAlert: {
    flexDirection: 'row',
    backgroundColor: COLORS.redLight,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red,
    alignItems: 'center',
  },
  pendingApplyIcon: { fontSize: 24, marginRight: 12 },
  pendingApplyContent: { flex: 1 },
  pendingApplyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.red },
  pendingApplySubtitle: { fontSize: 12, color: COLORS.red, opacity: 0.8, marginTop: 2 },
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
  cardNeedsApply: { borderWidth: 2, borderColor: COLORS.orange },
  needsApplyBanner: { backgroundColor: COLORS.orangeLight, marginHorizontal: -16, marginTop: -16, marginBottom: 12, padding: 8, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  needsApplyText: { fontSize: 12, fontWeight: '600', color: COLORS.orange, textAlign: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardIcon: { fontSize: 22 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  cardDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  // Card Details
  cardDetails: { paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.background },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { fontSize: 12, color: COLORS.textMuted, width: 80 },
  detailValue: { flex: 1, fontSize: 12, fontWeight: '500', color: COLORS.textDark },
  totalValue: { color: COLORS.green, fontWeight: '700' },
  badgesRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniBadgeText: { fontSize: 10, fontWeight: '600' },
  // Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.background },
  scanInfo: { flex: 1, fontSize: 11, color: COLORS.textMuted },
  cardArrow: { fontSize: 18, color: COLORS.textMuted },
  // Flow Explanation
  flowExplanation: { margin: 16, padding: 16, backgroundColor: COLORS.blue, borderRadius: 12 },
  flowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  flowStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  flowStepNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, color: COLORS.white, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 24, marginRight: 10 },
  flowStepText: { flex: 1, fontSize: 13, color: COLORS.primary },
  // Disclaimer
  disclaimer: { flexDirection: 'row', marginHorizontal: 16, padding: 14, backgroundColor: COLORS.yellow, borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder },
  disclaimerIcon: { fontSize: 14, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 11, color: '#5D4037', lineHeight: 16 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 18, color: COLORS.textMuted },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16 },
  // Apply Required Banner
  applyRequiredBanner: { flexDirection: 'row', backgroundColor: COLORS.redLight, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.red },
  applyRequiredIcon: { fontSize: 28, marginRight: 12 },
  applyRequiredContent: { flex: 1 },
  applyRequiredTitle: { fontSize: 16, fontWeight: '700', color: COLORS.red },
  applyRequiredSubtitle: { fontSize: 13, color: COLORS.red, opacity: 0.8, marginTop: 4 },
  // Applied Banner
  appliedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.greenLight, borderRadius: 12, padding: 14, marginBottom: 16 },
  appliedIcon: { fontSize: 24, marginRight: 12 },
  appliedText: { fontSize: 14, fontWeight: '600', color: COLORS.green },
  // Components Preview
  componentsPreviewSection: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, marginBottom: 16 },
  componentsPreviewTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
  componentsList: { gap: 10 },
  componentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 8, padding: 10 },
  componentBadge: { backgroundColor: COLORS.tealLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  componentBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.teal },
  componentPhrase: { flex: 1, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  noComponentsBox: { backgroundColor: COLORS.white, borderRadius: 8, padding: 16, alignItems: 'center' },
  noComponentsText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  componentsNote: { fontSize: 11, color: COLORS.textMuted, marginTop: 10, fontStyle: 'italic' },
  // TC-Safe Notice
  tcSafeNotice: { flexDirection: 'row', backgroundColor: COLORS.blue, borderRadius: 10, padding: 14, marginTop: 8, marginBottom: 16 },
  tcSafeIcon: { fontSize: 16, marginRight: 10 },
  tcSafeText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  // Modal Type Tag
  modalTypeTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 8 },
  modalTypeIcon: { fontSize: 16, marginRight: 6 },
  modalTypeLabel: { fontSize: 14, fontWeight: '600' },
  modalDate: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  dataSection: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, marginBottom: 16 },
  dataSectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
  dataRow: { flexDirection: 'row', marginBottom: 10 },
  dataRowFull: { marginBottom: 10 },
  dataLabel: { fontSize: 13, color: COLORS.textMuted, width: 110 },
  dataValue: { flex: 1, fontSize: 13, fontWeight: '500', color: COLORS.textDark },
  dataValueMulti: { fontSize: 13, color: COLORS.textDark, marginTop: 4, lineHeight: 18 },
  dataHighlight: { fontWeight: '700', color: COLORS.primary },
  totalCost: { fontSize: 16, color: COLORS.green },
  listItem: { fontSize: 13, color: COLORS.textDark, marginTop: 4, marginLeft: 8 },
  modalActions: { flexDirection: 'row', padding: 20, paddingTop: 12, gap: 12 },
  deleteButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.red, alignItems: 'center' },
  deleteButtonText: { fontSize: 15, color: COLORS.red, fontWeight: '600' },
  applyButton: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center' },
  applyButtonText: { fontSize: 15, color: COLORS.white, fontWeight: '600' },
});
