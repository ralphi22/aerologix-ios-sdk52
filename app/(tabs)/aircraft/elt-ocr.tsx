/**
 * ELT OCR Scan Screen - Document scanning and data extraction
 * TC-SAFE: OCR data must be validated by user before storage
 * No automatic decisions, no regulatory validation
 */

import React, { useState } from 'react';
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
import { useElt, EltType, OcrDetectedData } from '@/stores/eltStore';

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
  redLight: '#FFEBEE',
  purple: '#7C4DFF',
  purpleLight: '#EDE7F6',
};

type DocumentType = 'maintenance_report' | 'elt_certificate' | 'battery_label' | 'registration' | 'other';

const DOCUMENT_TYPES: { value: DocumentType; labelFr: string; labelEn: string; icon: string }[] = [
  { value: 'maintenance_report', labelFr: 'Rapport de maintenance', labelEn: 'Maintenance Report', icon: '📋' },
  { value: 'elt_certificate', labelFr: 'Certificat ELT', labelEn: 'ELT Certificate', icon: '📄' },
  { value: 'battery_label', labelFr: 'Étiquette batterie', labelEn: 'Battery Label', icon: '🔋' },
  { value: 'registration', labelFr: 'Document d\'enregistrement', labelEn: 'Registration Document', icon: '📑' },
  { value: 'other', labelFr: 'Autre document', labelEn: 'Other Document', icon: '📁' },
];

const ELT_TYPES: { value: EltType; label: string }[] = [
  { value: '121.5 MHz', label: '121.5 MHz' },
  { value: '406 MHz', label: '406 MHz' },
  { value: '406 MHz + GPS', label: '406 MHz + GPS' },
];

// Mock OCR detection - simulates what OCR would detect from a document
function mockOcrDetection(documentType: DocumentType): OcrDetectedData {
  // Simulate different detection results based on document type
  const baseConfidence = Math.floor(Math.random() * 30) + 60; // 60-90%
  
  switch (documentType) {
    case 'elt_certificate':
      return {
        manufacturer: 'ACR Electronics',
        model: 'ResQLink 406',
        serialNumber: 'ACR-' + Math.random().toString().slice(2, 8),
        eltType: '406 MHz + GPS',
        hexCode: Math.random().toString(16).slice(2, 12).toUpperCase(),
        activationDate: '2021-03-15',
        confidence: {
          manufacturer: baseConfidence + 5,
          model: baseConfidence + 3,
          serialNumber: baseConfidence,
          eltType: baseConfidence + 8,
          hexCode: baseConfidence - 5,
          activationDate: baseConfidence - 10,
        },
      };
    case 'battery_label':
      return {
        lastBatteryDate: '2024-06-20',
        batteryExpiryDate: '2029-06-20',
        confidence: {
          lastBatteryDate: baseConfidence + 10,
          batteryExpiryDate: baseConfidence + 12,
        },
      };
    case 'maintenance_report':
      return {
        lastTestDate: '2024-11-15',
        manufacturer: 'Artex',
        model: 'ME406',
        serialNumber: 'ART-' + Math.random().toString().slice(2, 8),
        confidence: {
          lastTestDate: baseConfidence + 5,
          manufacturer: baseConfidence - 5,
          model: baseConfidence - 3,
          serialNumber: baseConfidence - 8,
        },
      };
    case 'registration':
      return {
        hexCode: Math.random().toString(16).slice(2, 12).toUpperCase(),
        eltType: '406 MHz',
        activationDate: '2020-08-10',
        serviceDate: '2020-09-01',
        confidence: {
          hexCode: baseConfidence + 10,
          eltType: baseConfidence + 5,
          activationDate: baseConfidence,
          serviceDate: baseConfidence - 5,
        },
      };
    default:
      return {
        confidence: {},
      };
  }
}

interface OcrFieldProps {
  label: string;
  detectedValue: string | undefined;
  confidence: number | undefined;
  currentValue: string;
  onValueChange: (value: string) => void;
  onValidate: () => void;
  isValidated: boolean;
  placeholder?: string;
}

function OcrField({
  label,
  detectedValue,
  confidence,
  currentValue,
  onValueChange,
  onValidate,
  isValidated,
  placeholder,
}: OcrFieldProps) {
  const lang = getLanguage();
  const hasDetection = detectedValue !== undefined && detectedValue !== '';
  
  const getConfidenceColor = () => {
    if (!confidence) return COLORS.textMuted;
    if (confidence >= 80) return COLORS.green;
    if (confidence >= 60) return COLORS.orange;
    return COLORS.red;
  };
  
  return (
    <View style={styles.ocrField}>
      <View style={styles.ocrFieldHeader}>
        <Text style={styles.ocrFieldLabel}>{label}</Text>
        {hasDetection && confidence && (
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor() + '20' }]}>
            <Text style={[styles.confidenceText, { color: getConfidenceColor() }]}>
              {confidence}%
            </Text>
          </View>
        )}
      </View>
      
      {hasDetection && !isValidated && (
        <View style={styles.detectedRow}>
          <Text style={styles.detectedLabel}>
            {lang === 'fr' ? 'Détecté:' : 'Detected:'}
          </Text>
          <Text style={styles.detectedValue}>{detectedValue}</Text>
          <TouchableOpacity
            style={styles.useButton}
            onPress={() => {
              onValueChange(detectedValue!);
              onValidate();
            }}
          >
            <Text style={styles.useButtonText}>
              {lang === 'fr' ? 'Utiliser' : 'Use'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.ocrInput,
            isValidated && styles.ocrInputValidated,
          ]}
          value={currentValue}
          onChangeText={onValueChange}
          placeholder={placeholder || '—'}
          placeholderTextColor={COLORS.textMuted}
        />
        {!isValidated && currentValue !== '' && (
          <TouchableOpacity style={styles.validateButton} onPress={onValidate}>
            <Text style={styles.validateButtonText}>✓</Text>
          </TouchableOpacity>
        )}
        {isValidated && (
          <View style={styles.validatedBadge}>
            <Text style={styles.validatedText}>✓</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function EltOcrScanScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const { eltData, applyOcrData, addOcrScan } = useElt();

  // Scan state
  const [scanStep, setScanStep] = useState<'select' | 'scanning' | 'review'>('select');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [detectedData, setDetectedData] = useState<OcrDetectedData | null>(null);
  
  // Form values (user can edit)
  const [formValues, setFormValues] = useState({
    manufacturer: '',
    model: '',
    serialNumber: '',
    eltType: '' as EltType,
    hexCode: '',
    activationDate: '',
    serviceDate: '',
    lastTestDate: '',
    lastBatteryDate: '',
    batteryExpiryDate: '',
  });
  
  // Track which fields are validated
  const [validatedFields, setValidatedFields] = useState<Set<string>>(new Set());

  const handleSelectDocument = (docType: DocumentType) => {
    setSelectedDocType(docType);
  };

  const handleStartScan = () => {
    if (!selectedDocType) return;
    
    setScanStep('scanning');
    
    // Simulate OCR scanning delay
    setTimeout(() => {
      const detected = mockOcrDetection(selectedDocType);
      setDetectedData(detected);
      
      // Pre-fill form with detected values
      setFormValues((prev) => ({
        ...prev,
        manufacturer: detected.manufacturer || prev.manufacturer,
        model: detected.model || prev.model,
        serialNumber: detected.serialNumber || prev.serialNumber,
        eltType: detected.eltType || prev.eltType,
        hexCode: detected.hexCode || prev.hexCode,
        activationDate: detected.activationDate || prev.activationDate,
        serviceDate: detected.serviceDate || prev.serviceDate,
        lastTestDate: detected.lastTestDate || prev.lastTestDate,
        lastBatteryDate: detected.lastBatteryDate || prev.lastBatteryDate,
        batteryExpiryDate: detected.batteryExpiryDate || prev.batteryExpiryDate,
      }));
      
      setScanStep('review');
    }, 1500);
  };

  const handleValidateField = (fieldName: string) => {
    setValidatedFields((prev) => new Set(prev).add(fieldName));
  };

  const handleUpdateField = (fieldName: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldName]: value }));
    // If user manually edits, unvalidate the field
    setValidatedFields((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
  };

  const handleSaveValidated = () => {
    if (validatedFields.size === 0) {
      Alert.alert(
        lang === 'fr' ? 'Validation requise' : 'Validation Required',
        lang === 'fr'
          ? 'Veuillez valider au moins un champ avant d\'enregistrer.'
          : 'Please validate at least one field before saving.'
      );
      return;
    }

    // Build the data to apply (only validated fields)
    const dataToApply: Partial<typeof formValues> = {};
    validatedFields.forEach((field) => {
      if (formValues[field as keyof typeof formValues]) {
        (dataToApply as any)[field] = formValues[field as keyof typeof formValues];
      }
    });

    // Apply to ELT store
    applyOcrData(dataToApply);

    // Add to OCR history
    if (selectedDocType) {
      addOcrScan({
        documentType: selectedDocType,
        scanDate: new Date().toISOString().split('T')[0],
        detectedData: detectedData || { confidence: {} },
        validated: true,
        aircraftId: aircraftId || '',
      });
    }

    Alert.alert(
      lang === 'fr' ? 'Données enregistrées' : 'Data Saved',
      lang === 'fr'
        ? `${validatedFields.size} champ(s) validé(s) et enregistré(s).`
        : `${validatedFields.size} field(s) validated and saved.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const renderSelectStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepIcon}>📷</Text>
        <Text style={styles.stepTitle}>
          {lang === 'fr' ? 'Type de document' : 'Document Type'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {lang === 'fr'
            ? 'Sélectionnez le type de document à scanner'
            : 'Select the type of document to scan'}
        </Text>
      </View>

      <View style={styles.docTypeList}>
        {DOCUMENT_TYPES.map((docType) => (
          <TouchableOpacity
            key={docType.value}
            style={[
              styles.docTypeCard,
              selectedDocType === docType.value && styles.docTypeCardSelected,
            ]}
            onPress={() => handleSelectDocument(docType.value)}
          >
            <Text style={styles.docTypeIcon}>{docType.icon}</Text>
            <Text style={[
              styles.docTypeLabel,
              selectedDocType === docType.value && styles.docTypeLabelSelected,
            ]}>
              {lang === 'fr' ? docType.labelFr : docType.labelEn}
            </Text>
            {selectedDocType === docType.value && (
              <View style={styles.docTypeCheck}>
                <Text style={styles.docTypeCheckText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.scanButton, !selectedDocType && styles.scanButtonDisabled]}
        onPress={handleStartScan}
        disabled={!selectedDocType}
      >
        <Text style={styles.scanButtonText}>
          📷 {lang === 'fr' ? 'Scanner le document' : 'Scan Document'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderScanningStep = () => (
    <View style={styles.scanningContainer}>
      <View style={styles.scanningAnimation}>
        <Text style={styles.scanningIcon}>📡</Text>
      </View>
      <Text style={styles.scanningTitle}>
        {lang === 'fr' ? 'Analyse en cours...' : 'Scanning...'}
      </Text>
      <Text style={styles.scanningSubtitle}>
        {lang === 'fr'
          ? 'Extraction des données ELT'
          : 'Extracting ELT data'}
      </Text>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.reviewContainer}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewIcon}>📋</Text>
        <Text style={styles.reviewTitle}>
          {lang === 'fr' ? 'Validation des données' : 'Data Validation'}
        </Text>
        <Text style={styles.reviewSubtitle}>
          {lang === 'fr'
            ? 'Vérifiez et validez chaque champ détecté'
            : 'Review and validate each detected field'}
        </Text>
      </View>

      <View style={styles.validationNotice}>
        <Text style={styles.validationNoticeIcon}>⚠️</Text>
        <Text style={styles.validationNoticeText}>
          {lang === 'fr'
            ? 'Chaque champ doit être validé manuellement avant enregistrement.'
            : 'Each field must be manually validated before saving.'}
        </Text>
      </View>

      <ScrollView style={styles.fieldsContainer} showsVerticalScrollIndicator={false}>
        {/* Identification Section */}
        <Text style={styles.sectionLabel}>
          {lang === 'fr' ? 'Identification ELT' : 'ELT Identification'}
        </Text>
        
        <OcrField
          label={lang === 'fr' ? 'Fabricant' : 'Manufacturer'}
          detectedValue={detectedData?.manufacturer}
          confidence={detectedData?.confidence.manufacturer}
          currentValue={formValues.manufacturer}
          onValueChange={(v) => handleUpdateField('manufacturer', v)}
          onValidate={() => handleValidateField('manufacturer')}
          isValidated={validatedFields.has('manufacturer')}
        />
        
        <OcrField
          label={lang === 'fr' ? 'Modèle' : 'Model'}
          detectedValue={detectedData?.model}
          confidence={detectedData?.confidence.model}
          currentValue={formValues.model}
          onValueChange={(v) => handleUpdateField('model', v)}
          onValidate={() => handleValidateField('model')}
          isValidated={validatedFields.has('model')}
        />
        
        <OcrField
          label={lang === 'fr' ? 'Numéro de série' : 'Serial Number'}
          detectedValue={detectedData?.serialNumber}
          confidence={detectedData?.confidence.serialNumber}
          currentValue={formValues.serialNumber}
          onValueChange={(v) => handleUpdateField('serialNumber', v)}
          onValidate={() => handleValidateField('serialNumber')}
          isValidated={validatedFields.has('serialNumber')}
        />

        {/* ELT Type */}
        <View style={styles.ocrField}>
          <Text style={styles.ocrFieldLabel}>
            {lang === 'fr' ? 'Type d\'ELT' : 'ELT Type'}
          </Text>
          {detectedData?.eltType && !validatedFields.has('eltType') && (
            <View style={styles.detectedRow}>
              <Text style={styles.detectedLabel}>
                {lang === 'fr' ? 'Détecté:' : 'Detected:'}
              </Text>
              <Text style={styles.detectedValue}>{detectedData.eltType}</Text>
            </View>
          )}
          <View style={styles.eltTypeRow}>
            {ELT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.eltTypeOption,
                  formValues.eltType === type.value && styles.eltTypeOptionSelected,
                ]}
                onPress={() => {
                  handleUpdateField('eltType', type.value);
                  handleValidateField('eltType');
                }}
              >
                <Text style={[
                  styles.eltTypeText,
                  formValues.eltType === type.value && styles.eltTypeTextSelected,
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <OcrField
          label="Hex Code (406 MHz)"
          detectedValue={detectedData?.hexCode}
          confidence={detectedData?.confidence.hexCode}
          currentValue={formValues.hexCode}
          onValueChange={(v) => handleUpdateField('hexCode', v.toUpperCase())}
          onValidate={() => handleValidateField('hexCode')}
          isValidated={validatedFields.has('hexCode')}
          placeholder="A1B2C3D4E5"
        />

        {/* Dates Section */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
          {lang === 'fr' ? 'Dates' : 'Dates'}
        </Text>

        <OcrField
          label={lang === 'fr' ? 'Date d\'activation' : 'Activation Date'}
          detectedValue={detectedData?.activationDate}
          confidence={detectedData?.confidence.activationDate}
          currentValue={formValues.activationDate}
          onValueChange={(v) => handleUpdateField('activationDate', v)}
          onValidate={() => handleValidateField('activationDate')}
          isValidated={validatedFields.has('activationDate')}
          placeholder="YYYY-MM-DD"
        />

        <OcrField
          label={lang === 'fr' ? 'Mise en service' : 'Service Date'}
          detectedValue={detectedData?.serviceDate}
          confidence={detectedData?.confidence.serviceDate}
          currentValue={formValues.serviceDate}
          onValueChange={(v) => handleUpdateField('serviceDate', v)}
          onValidate={() => handleValidateField('serviceDate')}
          isValidated={validatedFields.has('serviceDate')}
          placeholder="YYYY-MM-DD"
        />

        <OcrField
          label={lang === 'fr' ? 'Dernier test ELT' : 'Last ELT Test'}
          detectedValue={detectedData?.lastTestDate}
          confidence={detectedData?.confidence.lastTestDate}
          currentValue={formValues.lastTestDate}
          onValueChange={(v) => handleUpdateField('lastTestDate', v)}
          onValidate={() => handleValidateField('lastTestDate')}
          isValidated={validatedFields.has('lastTestDate')}
          placeholder="YYYY-MM-DD"
        />

        <OcrField
          label={lang === 'fr' ? 'Changement batterie' : 'Battery Change'}
          detectedValue={detectedData?.lastBatteryDate}
          confidence={detectedData?.confidence.lastBatteryDate}
          currentValue={formValues.lastBatteryDate}
          onValueChange={(v) => handleUpdateField('lastBatteryDate', v)}
          onValidate={() => handleValidateField('lastBatteryDate')}
          isValidated={validatedFields.has('lastBatteryDate')}
          placeholder="YYYY-MM-DD"
        />

        <OcrField
          label={lang === 'fr' ? 'Expiration batterie' : 'Battery Expiry'}
          detectedValue={detectedData?.batteryExpiryDate}
          confidence={detectedData?.confidence.batteryExpiryDate}
          currentValue={formValues.batteryExpiryDate}
          onValueChange={(v) => handleUpdateField('batteryExpiryDate', v)}
          onValidate={() => handleValidateField('batteryExpiryDate')}
          isValidated={validatedFields.has('batteryExpiryDate')}
          placeholder="YYYY-MM-DD"
        />

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            {lang === 'fr' ? 'Résumé' : 'Summary'}
          </Text>
          <Text style={styles.summaryText}>
            {validatedFields.size} {lang === 'fr' ? 'champ(s) validé(s)' : 'field(s) validated'}
          </Text>
        </View>

        {/* OCR Disclaimer */}
        <View style={styles.ocrDisclaimer}>
          <Text style={styles.ocrDisclaimerIcon}>⚠️</Text>
          <Text style={styles.ocrDisclaimerText}>
            {lang === 'fr'
              ? 'Données extraites par OCR à titre informatif. Elles doivent être validées par l\'utilisateur et ne remplacent pas un AME ni un registre officiel.'
              : 'OCR-extracted data provided for information purposes only. User validation is required and this does not replace an AME nor an official registry.'}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>
            {lang === 'fr' ? 'Annuler' : 'Cancel'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.saveButton,
            validatedFields.size === 0 && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveValidated}
        >
          <Text style={styles.saveButtonText}>
            {lang === 'fr' ? 'Enregistrer' : 'Save'} ({validatedFields.size})
          </Text>
        </TouchableOpacity>
      </View>
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
          <Text style={styles.headerTitle}>
            {lang === 'fr' ? 'Scanner ELT' : 'ELT Scanner'}
          </Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {scanStep === 'select' && renderSelectStep()}
      {scanStep === 'scanning' && renderScanningStep()}
      {scanStep === 'review' && renderReviewStep()}
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
  headerRight: { width: 40 },
  // Step Container
  stepContainer: { flex: 1, padding: 16 },
  stepHeader: { alignItems: 'center', marginBottom: 24 },
  stepIcon: { fontSize: 48, marginBottom: 12 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  stepSubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  // Document Type List
  docTypeList: { gap: 12, marginBottom: 24 },
  docTypeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 16, borderWidth: 2, borderColor: 'transparent',
  },
  docTypeCardSelected: { borderColor: COLORS.primary, backgroundColor: '#E8EEF7' },
  docTypeIcon: { fontSize: 28, marginRight: 12 },
  docTypeLabel: { flex: 1, fontSize: 15, color: COLORS.textDark },
  docTypeLabelSelected: { fontWeight: '600', color: COLORS.primary },
  docTypeCheck: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  docTypeCheckText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  // Scan Button
  scanButton: {
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  scanButtonDisabled: { backgroundColor: COLORS.border },
  scanButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  // Scanning Animation
  scanningContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanningAnimation: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.blue,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  scanningIcon: { fontSize: 48 },
  scanningTitle: { fontSize: 20, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  scanningSubtitle: { fontSize: 14, color: COLORS.textMuted },
  // Review Container
  reviewContainer: { flex: 1 },
  reviewHeader: { padding: 16, alignItems: 'center' },
  reviewIcon: { fontSize: 32, marginBottom: 8 },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  reviewSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  // Validation Notice
  validationNotice: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, padding: 12,
    backgroundColor: COLORS.orangeLight, borderRadius: 10,
  },
  validationNoticeIcon: { fontSize: 14, marginRight: 8 },
  validationNoticeText: { flex: 1, fontSize: 12, color: COLORS.orange, lineHeight: 18 },
  // Fields Container
  fieldsContainer: { flex: 1, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 12 },
  // OCR Field
  ocrField: { marginBottom: 16 },
  ocrFieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  ocrFieldLabel: { flex: 1, fontSize: 13, color: COLORS.textMuted },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  confidenceText: { fontSize: 11, fontWeight: '600' },
  detectedRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginBottom: 6,
  },
  detectedLabel: { fontSize: 11, color: COLORS.purple, marginRight: 6 },
  detectedValue: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.purple },
  useButton: { backgroundColor: COLORS.purple, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  useButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  ocrInput: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 15, color: COLORS.textDark, borderWidth: 1, borderColor: COLORS.border,
  },
  ocrInputValidated: { borderColor: COLORS.green, backgroundColor: COLORS.greenLight },
  validateButton: {
    marginLeft: 8, width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.green,
    justifyContent: 'center', alignItems: 'center',
  },
  validateButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  validatedBadge: {
    marginLeft: 8, width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.greenLight,
    justifyContent: 'center', alignItems: 'center',
  },
  validatedText: { color: COLORS.green, fontSize: 18, fontWeight: '600' },
  // ELT Type
  eltTypeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  eltTypeOption: {
    flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  eltTypeOptionSelected: { borderColor: COLORS.green, backgroundColor: COLORS.greenLight },
  eltTypeText: { fontSize: 12, color: COLORS.textMuted },
  eltTypeTextSelected: { color: COLORS.green, fontWeight: '600' },
  // Summary
  summaryCard: {
    backgroundColor: COLORS.blue, borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center',
  },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 4 },
  summaryText: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  // OCR Disclaimer
  ocrDisclaimer: {
    flexDirection: 'row', marginTop: 16, padding: 16, backgroundColor: COLORS.yellow,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder,
  },
  ocrDisclaimerIcon: { fontSize: 14, marginRight: 8 },
  ocrDisclaimerText: { flex: 1, fontSize: 11, color: '#5D4037', lineHeight: 16 },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row', padding: 16, gap: 12, backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: COLORS.border },
  saveButtonText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
