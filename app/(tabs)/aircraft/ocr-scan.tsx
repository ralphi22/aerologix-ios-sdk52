/**
 * OCR Scanner Screen - Real document scanning with OpenAI Vision
 * TC-SAFE: OCR data must be validated by user before application
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getLanguage } from '@/i18n';
import { useOcr, OcrDocumentType, OcrMaintenanceReportData, OcrInvoiceData } from '@/stores/ocrStore';
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';
import { useMaintenanceData } from '@/stores/maintenanceDataStore';
import ocrService from '@/services/ocrService';

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
  teal: '#00897B',
  tealLight: '#E0F2F1',
};

type ScanStep = 'source' | 'type' | 'scanning' | 'review' | 'apply';

const DOC_TYPES: { value: OcrDocumentType; labelFr: string; labelEn: string; icon: string; descFr: string; descEn: string }[] = [
  { 
    value: 'maintenance_report', 
    labelFr: 'Rapport de maintenance', 
    labelEn: 'Maintenance Report', 
    icon: '📋',
    descFr: 'Met à jour heures, pièces, AD/SB',
    descEn: 'Updates hours, parts, AD/SB',
  },
  { 
    value: 'invoice', 
    labelFr: 'Facture', 
    labelEn: 'Invoice', 
    icon: '🧾',
    descFr: 'Stockage financier uniquement',
    descEn: 'Financial storage only',
  },
  { 
    value: 'other', 
    labelFr: 'Autre document', 
    labelEn: 'Other Document', 
    icon: '📄',
    descFr: 'Archivage simple',
    descEn: 'Simple archiving',
  },
];

interface ValidationFieldProps {
  label: string;
  value: string | number | undefined;
  confidence?: number;
  isValidated: boolean;
  onValidate: () => void;
  onEdit?: (value: string) => void;
  editable?: boolean;
}

function ValidationField({ label, value, confidence, isValidated, onValidate, onEdit, editable }: ValidationFieldProps) {
  const displayValue = value?.toString() || '—';
  
  return (
    <View style={styles.validationField}>
      <View style={styles.validationHeader}>
        <Text style={styles.validationLabel}>{label}</Text>
        {confidence !== undefined && (
          <View style={[styles.confidenceBadge, { backgroundColor: confidence >= 80 ? COLORS.greenLight : confidence >= 60 ? COLORS.orangeLight : COLORS.redLight }]}>
            <Text style={[styles.confidenceText, { color: confidence >= 80 ? COLORS.green : confidence >= 60 ? COLORS.orange : COLORS.red }]}>
              {confidence}%
            </Text>
          </View>
        )}
      </View>
      <View style={styles.validationInputRow}>
        {editable && onEdit ? (
          <TextInput
            style={[styles.validationInput, isValidated && styles.validationInputValidated]}
            value={displayValue}
            onChangeText={onEdit}
          />
        ) : (
          <Text style={[styles.validationValue, isValidated && styles.validationValueValidated]}>
            {displayValue}
          </Text>
        )}
        {!isValidated ? (
          <TouchableOpacity style={styles.validateButton} onPress={onValidate}>
            <Text style={styles.validateButtonText}>✓</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.validatedBadge}>
            <Text style={styles.validatedText}>✓</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function OcrScannerScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const { addDocument, checkDuplicate } = useOcr();
  const { updateAircraft, getAircraftById } = useAircraftLocalStore();
  const { addPart, addAdSb } = useMaintenanceData();

  const [step, setStep] = useState<ScanStep>('source');
  const [sourceType, setSourceType] = useState<'photo' | 'import' | null>(null);
  const [docType, setDocType] = useState<OcrDocumentType | null>(null);
  const [detectedData, setDetectedData] = useState<OcrMaintenanceReportData | OcrInvoiceData | null>(null);
  const [validatedFields, setValidatedFields] = useState<Set<string>>(new Set());
  const [otherTags, setOtherTags] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Request camera permissions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'fr' ? 'Permission requise' : 'Permission Required',
        lang === 'fr' 
          ? 'L\'accès à la caméra est nécessaire pour scanner les documents.'
          : 'Camera access is required to scan documents.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Request media library permissions
  const requestMediaPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'fr' ? 'Permission requise' : 'Permission Required',
        lang === 'fr' 
          ? 'L\'accès aux photos est nécessaire pour importer des documents.'
          : 'Photo library access is required to import documents.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setSourceType('photo');
        setStep('type');
      }
    } catch (error: any) {
      console.log('Camera error:', error);
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        lang === 'fr' ? 'Impossible d\'accéder à la caméra.' : 'Unable to access camera.'
      );
    }
  };

  // Pick image from library
  const pickImage = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setSourceType('import');
        setStep('type');
      }
    } catch (error: any) {
      console.log('Image picker error:', error);
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        lang === 'fr' ? 'Impossible d\'accéder aux photos.' : 'Unable to access photos.'
      );
    }
  };

  // Convert image to base64 and analyze
  const analyzeImage = async () => {
    if (!imageUri || !docType) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setStep('scanning');

    try {
      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call OCR API
      const response = await ocrService.analyzeDocument(
        base64,
        docType,
        registration || undefined
      );

      if (response.success) {
        if (docType === 'maintenance_report' && response.maintenance_data) {
          setDetectedData(response.maintenance_data);
          
          // Check for duplicate
          const data = response.maintenance_data;
          if (data.registration && data.reportDate && data.amo) {
            const isDuplicate = checkDuplicate(data.registration, data.reportDate, data.amo);
            if (isDuplicate) {
              setDuplicateError(true);
            }
          }
        } else if (docType === 'invoice' && response.invoice_data) {
          setDetectedData(response.invoice_data);
        } else {
          // For 'other' type, just proceed to review
          setDetectedData(null);
        }
        
        setStep('review');
      } else {
        setAnalysisError(response.error || 'OCR analysis failed');
        setStep('type');
        Alert.alert(
          lang === 'fr' ? 'Erreur d\'analyse' : 'Analysis Error',
          response.error || (lang === 'fr' ? 'L\'analyse OCR a échoué.' : 'OCR analysis failed.')
        );
      }
    } catch (error: any) {
      console.log('OCR error:', error);
      setAnalysisError(error.message);
      setStep('type');
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        lang === 'fr' 
          ? 'Une erreur est survenue lors de l\'analyse. Veuillez réessayer.'
          : 'An error occurred during analysis. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTypeSelect = (type: OcrDocumentType) => {
    setDocType(type);
  };

  const handleStartScan = () => {
    if (!docType) return;
    analyzeImage();
  };

  const handleValidateField = (field: string) => {
    setValidatedFields((prev) => new Set(prev).add(field));
  };

  const handleValidateAll = () => {
    if (docType === 'maintenance_report' && detectedData) {
      const fields = ['registration', 'reportDate', 'amo', 'description', 'airframeHours', 'engineHours', 'parts', 'adSbs'];
      setValidatedFields(new Set(fields));
    } else if (docType === 'invoice' && detectedData) {
      const fields = ['supplier', 'date', 'partsAmount', 'laborAmount', 'totalAmount'];
      setValidatedFields(new Set(fields));
    }
  };

  const handleApplyData = async () => {
    if (!docType || duplicateError) return;

    const appliedModules: string[] = [];

    try {
      if (docType === 'maintenance_report' && detectedData) {
        const data = detectedData as OcrMaintenanceReportData;
        
        // Update aircraft hours if validated
        if (validatedFields.has('airframeHours') || validatedFields.has('engineHours')) {
          const aircraft = getAircraftById(aircraftId || '');
          if (aircraft && data.hours) {
            await updateAircraft(aircraft.id, {
              airframeHours: data.hours.airframeHours || aircraft.airframeHours,
              engineHours: data.hours.engineHours || aircraft.engineHours,
              propellerHours: data.hours.propellerHours || aircraft.propellerHours,
            });
            appliedModules.push('aircraft');
          }
        }

        // Add parts if validated
        if (validatedFields.has('parts') && data.parts) {
          data.parts.forEach((part) => {
            addPart({
              name: part.name,
              partNumber: part.partNumber,
              quantity: part.quantity,
              installedDate: data.reportDate || new Date().toISOString().split('T')[0],
              aircraftId: aircraftId || '',
            });
          });
          appliedModules.push('parts');
        }

        // Add AD/SBs if validated
        if (validatedFields.has('adSbs') && data.adSbs) {
          data.adSbs.forEach((adSb) => {
            addAdSb({
              type: adSb.type,
              number: adSb.number,
              description: adSb.description,
              dateAdded: data.reportDate || new Date().toISOString().split('T')[0],
              aircraftId: aircraftId || '',
            });
          });
          appliedModules.push('ad-sb');
        }
      }

      if (docType === 'invoice') {
        appliedModules.push('invoices');
      }

      // Save document to OCR history
      addDocument({
        type: docType,
        aircraftId: aircraftId || '',
        registration: registration || '',
        scanDate: new Date().toISOString().split('T')[0],
        documentDate: docType === 'maintenance_report' 
          ? (detectedData as OcrMaintenanceReportData)?.reportDate 
          : (detectedData as OcrInvoiceData)?.invoice?.date,
        sourceType: sourceType || 'photo',
        imageUri: imageUri || undefined,
        maintenanceData: docType === 'maintenance_report' ? detectedData as OcrMaintenanceReportData : undefined,
        invoiceData: docType === 'invoice' ? detectedData as OcrInvoiceData : undefined,
        validated: true,
        appliedToModules: appliedModules,
        tags: docType === 'other' ? otherTags.split(',').map(t => t.trim()).filter(t => t) : undefined,
      });

      Alert.alert(
        lang === 'fr' ? 'Données appliquées' : 'Data Applied',
        lang === 'fr'
          ? `${validatedFields.size} champ(s) validé(s) et appliqué(s) aux modules: ${appliedModules.join(', ') || 'historique'}`
          : `${validatedFields.size} field(s) validated and applied to modules: ${appliedModules.join(', ') || 'history'}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        error.message || (lang === 'fr' ? 'Échec de l\'application des données.' : 'Failed to apply data.')
      );
    }
  };

  // Render source selection
  const renderSourceStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepIcon}>📷</Text>
        <Text style={styles.stepTitle}>
          {lang === 'fr' ? 'Source du document' : 'Document Source'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {lang === 'fr' ? 'Comment souhaitez-vous numériser?' : 'How would you like to scan?'}
        </Text>
      </View>

      <View style={styles.sourceOptions}>
        <TouchableOpacity
          style={styles.sourceCard}
          onPress={takePhoto}
        >
          <Text style={styles.sourceIcon}>📸</Text>
          <Text style={styles.sourceTitle}>
            {lang === 'fr' ? 'Prendre une photo' : 'Take a Photo'}
          </Text>
          <Text style={styles.sourceDesc}>
            {lang === 'fr' ? 'Utiliser la caméra' : 'Use camera'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sourceCard}
          onPress={pickImage}
        >
          <Text style={styles.sourceIcon}>📁</Text>
          <Text style={styles.sourceTitle}>
            {lang === 'fr' ? 'Importer un fichier' : 'Import a File'}
          </Text>
          <Text style={styles.sourceDesc}>
            {lang === 'fr' ? 'Image ou PDF' : 'Image or PDF'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render type selection with image preview
  const renderTypeStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepIcon}>📑</Text>
        <Text style={styles.stepTitle}>
          {lang === 'fr' ? 'Type de document' : 'Document Type'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {lang === 'fr' ? 'Sélectionnez le type pour une meilleure extraction' : 'Select type for better extraction'}
        </Text>
      </View>

      {/* Image Preview */}
      {imageUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="contain" />
          <TouchableOpacity 
            style={styles.changeImageButton}
            onPress={() => {
              setImageUri(null);
              setStep('source');
            }}
          >
            <Text style={styles.changeImageText}>
              {lang === 'fr' ? '🔄 Changer l\'image' : '🔄 Change image'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.typeList}>
        {DOC_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[styles.typeCard, docType === type.value && styles.typeCardSelected]}
            onPress={() => handleTypeSelect(type.value)}
          >
            <Text style={styles.typeIcon}>{type.icon}</Text>
            <View style={styles.typeContent}>
              <Text style={[styles.typeTitle, docType === type.value && styles.typeTitleSelected]}>
                {lang === 'fr' ? type.labelFr : type.labelEn}
              </Text>
              <Text style={styles.typeDesc}>
                {lang === 'fr' ? type.descFr : type.descEn}
              </Text>
            </View>
            {docType === type.value && (
              <View style={styles.typeCheck}>
                <Text style={styles.typeCheckText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.scanButton, !docType && styles.scanButtonDisabled]}
        onPress={handleStartScan}
        disabled={!docType}
      >
        <Text style={styles.scanButtonText}>
          🔍 {lang === 'fr' ? 'Analyser le document' : 'Analyze Document'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render scanning animation
  const renderScanningStep = () => (
    <View style={styles.scanningContainer}>
      <View style={styles.scanningAnimation}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
      <Text style={styles.scanningTitle}>
        {lang === 'fr' ? 'Analyse OCR en cours...' : 'OCR Analysis in progress...'}
      </Text>
      <Text style={styles.scanningSubtitle}>
        {lang === 'fr' ? 'Extraction des données avec OpenAI Vision' : 'Extracting data with OpenAI Vision'}
      </Text>
      
      {/* Show image being analyzed */}
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.scanningImage} resizeMode="contain" />
      )}
    </View>
  );

  // Render review step for maintenance report
  const renderMaintenanceReview = () => {
    const data = detectedData as OcrMaintenanceReportData;
    if (!data) return null;

    return (
      <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
        {/* Duplicate Error */}
        {duplicateError && (
          <View style={styles.duplicateError}>
            <Text style={styles.duplicateIcon}>⚠️</Text>
            <Text style={styles.duplicateText}>
              {lang === 'fr' ? 'Rapport déjà importé' : 'Report already imported'}
            </Text>
            <Text style={styles.duplicateSubtext}>
              {lang === 'fr' 
                ? 'Un rapport avec cette date, cet AMO et cette immatriculation existe déjà.'
                : 'A report with this date, AMO and registration already exists.'}
            </Text>
          </View>
        )}

        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successText}>
            {lang === 'fr' ? 'Document analysé avec succès' : 'Document analyzed successfully'}
          </Text>
        </View>

        {/* Validate All Button */}
        <TouchableOpacity style={styles.validateAllButton} onPress={handleValidateAll}>
          <Text style={styles.validateAllText}>
            {lang === 'fr' ? 'Valider tous les champs' : 'Validate all fields'}
          </Text>
        </TouchableOpacity>

        {/* Identification Section */}
        <Text style={styles.sectionLabel}>
          {lang === 'fr' ? 'Identification' : 'Identification'}
        </Text>
        <View style={styles.reviewCard}>
          <ValidationField
            label={lang === 'fr' ? 'Immatriculation' : 'Registration'}
            value={data.registration}
            confidence={data.confidence?.registration}
            isValidated={validatedFields.has('registration')}
            onValidate={() => handleValidateField('registration')}
          />
          <ValidationField
            label={lang === 'fr' ? 'Date du rapport' : 'Report Date'}
            value={data.reportDate}
            confidence={data.confidence?.reportDate}
            isValidated={validatedFields.has('reportDate')}
            onValidate={() => handleValidateField('reportDate')}
          />
          <ValidationField
            label="AMO"
            value={data.amo}
            confidence={data.confidence?.amo}
            isValidated={validatedFields.has('amo')}
            onValidate={() => handleValidateField('amo')}
          />
        </View>

        {/* Hours Section (Critical) */}
        <Text style={styles.sectionLabel}>
          ⚠️ {lang === 'fr' ? 'Heures détectées (CRITIQUE)' : 'Detected Hours (CRITICAL)'}
        </Text>
        <View style={[styles.reviewCard, styles.criticalCard]}>
          <ValidationField
            label={lang === 'fr' ? 'Heures cellule' : 'Airframe Hours'}
            value={data.hours?.airframeHours}
            confidence={data.confidence?.airframeHours}
            isValidated={validatedFields.has('airframeHours')}
            onValidate={() => handleValidateField('airframeHours')}
          />
          <ValidationField
            label={lang === 'fr' ? 'Heures moteur' : 'Engine Hours'}
            value={data.hours?.engineHours}
            confidence={data.confidence?.engineHours}
            isValidated={validatedFields.has('engineHours')}
            onValidate={() => handleValidateField('engineHours')}
          />
          {data.hours?.propellerHours && (
            <ValidationField
              label={lang === 'fr' ? 'Heures hélice' : 'Propeller Hours'}
              value={data.hours.propellerHours}
              isValidated={validatedFields.has('propellerHours')}
              onValidate={() => handleValidateField('propellerHours')}
            />
          )}
        </View>

        {/* Parts Section */}
        {data.parts && data.parts.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              {lang === 'fr' ? `Pièces détectées (${data.parts.length})` : `Detected Parts (${data.parts.length})`}
            </Text>
            <View style={styles.reviewCard}>
              {data.parts.map((part, index) => (
                <View key={index} style={styles.partRow}>
                  <View style={styles.partInfo}>
                    <Text style={styles.partName}>{part.name}</Text>
                    <Text style={styles.partDetails}>P/N: {part.partNumber} | Qty: {part.quantity}</Text>
                  </View>
                  <View style={styles.partAction}>
                    <Text style={styles.partActionText}>{part.action}</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.validateSectionButton, validatedFields.has('parts') && styles.validateSectionButtonDone]}
                onPress={() => handleValidateField('parts')}
              >
                <Text style={[styles.validateSectionText, validatedFields.has('parts') && styles.validateSectionTextDone]}>
                  {validatedFields.has('parts')
                    ? (lang === 'fr' ? '✓ Pièces validées' : '✓ Parts validated')
                    : (lang === 'fr' ? 'Valider les pièces' : 'Validate parts')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* AD/SB Section */}
        {data.adSbs && data.adSbs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              {lang === 'fr' ? `AD/SB détectés (${data.adSbs.length})` : `Detected AD/SB (${data.adSbs.length})`}
            </Text>
            <View style={styles.reviewCard}>
              {data.adSbs.map((adSb, index) => (
                <View key={index} style={styles.adsbRow}>
                  <View style={[styles.adsbBadge, adSb.type === 'AD' ? styles.adBadge : styles.sbBadge]}>
                    <Text style={styles.adsbBadgeText}>{adSb.type}</Text>
                  </View>
                  <View style={styles.adsbInfo}>
                    <Text style={styles.adsbNumber}>{adSb.number}</Text>
                    <Text style={styles.adsbDesc}>{adSb.description}</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.validateSectionButton, validatedFields.has('adSbs') && styles.validateSectionButtonDone]}
                onPress={() => handleValidateField('adSbs')}
              >
                <Text style={[styles.validateSectionText, validatedFields.has('adSbs') && styles.validateSectionTextDone]}>
                  {validatedFields.has('adSbs')
                    ? (lang === 'fr' ? '✓ AD/SB validés' : '✓ AD/SB validated')
                    : (lang === 'fr' ? 'Valider les AD/SB' : 'Validate AD/SB')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ELT Section */}
        {data.elt && (data.elt.testMentioned || data.elt.removalMentioned || data.elt.installationMentioned) && (
          <>
            <Text style={styles.sectionLabel}>
              {lang === 'fr' ? 'ELT détecté' : 'ELT Detected'}
            </Text>
            <View style={styles.reviewCard}>
              {data.elt.testMentioned && (
                <Text style={styles.eltInfo}>🔔 {lang === 'fr' ? 'Test ELT mentionné' : 'ELT test mentioned'}</Text>
              )}
              {data.elt.removalMentioned && (
                <Text style={styles.eltInfo}>📤 {lang === 'fr' ? 'Retrait ELT mentionné' : 'ELT removal mentioned'}</Text>
              )}
              {data.elt.installationMentioned && (
                <Text style={styles.eltInfo}>📥 {lang === 'fr' ? 'Installation ELT mentionnée' : 'ELT installation mentioned'}</Text>
              )}
            </View>
          </>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {lang === 'fr'
              ? 'Données extraites par OCR à titre informatif. Toute information doit être validée par l\'utilisateur. Ne remplace pas un AME, un AMO ni un registre officiel.'
              : 'OCR-extracted data provided for information purposes only. User validation is required. Does not replace an AME, AMO, or official record.'}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  // Render review step for invoice
  const renderInvoiceReview = () => {
    const data = detectedData as OcrInvoiceData;
    if (!data) return null;

    return (
      <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successText}>
            {lang === 'fr' ? 'Facture analysée avec succès' : 'Invoice analyzed successfully'}
          </Text>
        </View>

        <TouchableOpacity style={styles.validateAllButton} onPress={handleValidateAll}>
          <Text style={styles.validateAllText}>
            {lang === 'fr' ? 'Valider tous les champs' : 'Validate all fields'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>
          {lang === 'fr' ? 'Informations facture' : 'Invoice Information'}
        </Text>
        <View style={styles.reviewCard}>
          <ValidationField
            label={lang === 'fr' ? 'Fournisseur' : 'Supplier'}
            value={data.invoice?.supplier}
            confidence={data.confidence?.supplier}
            isValidated={validatedFields.has('supplier')}
            onValidate={() => handleValidateField('supplier')}
          />
          <ValidationField
            label="Date"
            value={data.invoice?.date}
            confidence={data.confidence?.date}
            isValidated={validatedFields.has('date')}
            onValidate={() => handleValidateField('date')}
          />
          <ValidationField
            label={lang === 'fr' ? 'Pièces ($)' : 'Parts ($)'}
            value={data.invoice?.partsAmount ? `$${data.invoice.partsAmount.toFixed(2)}` : undefined}
            confidence={data.confidence?.partsAmount}
            isValidated={validatedFields.has('partsAmount')}
            onValidate={() => handleValidateField('partsAmount')}
          />
          <ValidationField
            label={lang === 'fr' ? 'Main-d\'œuvre ($)' : 'Labor ($)'}
            value={data.invoice?.laborAmount ? `$${data.invoice.laborAmount.toFixed(2)}` : undefined}
            confidence={data.confidence?.laborAmount}
            isValidated={validatedFields.has('laborAmount')}
            onValidate={() => handleValidateField('laborAmount')}
          />
          <ValidationField
            label={lang === 'fr' ? 'Total ($)' : 'Total ($)'}
            value={data.invoice?.totalAmount ? `$${data.invoice.totalAmount.toFixed(2)}` : undefined}
            confidence={data.confidence?.totalAmount}
            isValidated={validatedFields.has('totalAmount')}
            onValidate={() => handleValidateField('totalAmount')}
          />
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {lang === 'fr'
              ? 'Données extraites par OCR à titre informatif. Toute information doit être validée par l\'utilisateur. Ne remplace pas un AME, un AMO ni un registre officiel.'
              : 'OCR-extracted data provided for information purposes only. User validation is required. Does not replace an AME, AMO, or official record.'}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  // Render other document type
  const renderOtherReview = () => (
    <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.successBanner}>
        <Text style={styles.successIcon}>📄</Text>
        <Text style={styles.successText}>
          {lang === 'fr' ? 'Document prêt à archiver' : 'Document ready to archive'}
        </Text>
      </View>

      {/* Image Preview */}
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.reviewImage} resizeMode="contain" />
      )}

      <Text style={styles.sectionLabel}>
        {lang === 'fr' ? 'Tags (optionnel)' : 'Tags (optional)'}
      </Text>
      <View style={styles.reviewCard}>
        <TextInput
          style={styles.tagsInput}
          placeholder={lang === 'fr' ? 'manuel, STC, photo... (séparés par virgules)' : 'manual, STC, photo... (comma separated)'}
          placeholderTextColor={COLORS.textMuted}
          value={otherTags}
          onChangeText={setOtherTags}
        />
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerIcon}>ℹ️</Text>
        <Text style={styles.disclaimerText}>
          {lang === 'fr'
            ? 'Ce document sera stocké dans l\'historique OCR pour référence.'
            : 'This document will be stored in OCR history for reference.'}
        </Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Render review step
  const renderReviewStep = () => (
    <View style={styles.reviewContainer}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>
          {lang === 'fr' ? 'Résultats OCR' : 'OCR Results'}
        </Text>
        <Text style={styles.reviewSubtitle}>{registration}</Text>
      </View>

      {docType === 'maintenance_report' && renderMaintenanceReview()}
      {docType === 'invoice' && renderInvoiceReview()}
      {docType === 'other' && renderOtherReview()}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.applyButton,
            ((docType !== 'other' && validatedFields.size === 0) || duplicateError) && styles.applyButtonDisabled,
          ]}
          onPress={handleApplyData}
          disabled={(docType !== 'other' && validatedFields.size === 0) || duplicateError}
        >
          <Text style={styles.applyButtonText}>
            {docType === 'other' 
              ? (lang === 'fr' ? 'Archiver' : 'Archive')
              : `${lang === 'fr' ? 'Appliquer' : 'Apply'} (${validatedFields.size})`
            }
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
          <Text style={styles.headerTitle}>Scanner OCR</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {step === 'source' && renderSourceStep()}
      {step === 'type' && renderTypeStep()}
      {step === 'scanning' && renderScanningStep()}
      {step === 'review' && renderReviewStep()}
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
  // Source Options
  sourceOptions: { flexDirection: 'row', gap: 16 },
  sourceCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.border,
  },
  sourceIcon: { fontSize: 40, marginBottom: 12 },
  sourceTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, marginBottom: 4 },
  sourceDesc: { fontSize: 12, color: COLORS.textMuted },
  // Image Preview
  imagePreviewContainer: { alignItems: 'center', marginBottom: 20 },
  imagePreview: { width: '100%', height: 150, borderRadius: 12, backgroundColor: COLORS.border },
  changeImageButton: { marginTop: 8 },
  changeImageText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  // Type List
  typeList: { gap: 12, marginBottom: 24 },
  typeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 16, borderWidth: 2, borderColor: 'transparent',
  },
  typeCardSelected: { borderColor: COLORS.primary, backgroundColor: '#E8EEF7' },
  typeIcon: { fontSize: 32, marginRight: 12 },
  typeContent: { flex: 1 },
  typeTitle: { fontSize: 16, fontWeight: '500', color: COLORS.textDark },
  typeTitleSelected: { fontWeight: '700', color: COLORS.primary },
  typeDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  typeCheck: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  typeCheckText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  // Scan Button
  scanButton: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  scanButtonDisabled: { backgroundColor: COLORS.border },
  scanButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  // Scanning Animation
  scanningContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scanningAnimation: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.blue,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  scanningTitle: { fontSize: 20, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  scanningSubtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 20 },
  scanningImage: { width: 200, height: 150, borderRadius: 12, marginTop: 20 },
  // Review
  reviewContainer: { flex: 1 },
  reviewHeader: { padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  reviewSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  reviewScroll: { flex: 1, padding: 16 },
  reviewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  // Duplicate Error
  duplicateError: { backgroundColor: COLORS.redLight, borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  duplicateIcon: { fontSize: 32, marginBottom: 8 },
  duplicateText: { fontSize: 16, fontWeight: '700', color: COLORS.red, marginBottom: 4 },
  duplicateSubtext: { fontSize: 12, color: COLORS.red, textAlign: 'center' },
  // Success Banner
  successBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.greenLight, borderRadius: 12, padding: 14, marginBottom: 16 },
  successIcon: { fontSize: 24, marginRight: 12 },
  successText: { fontSize: 14, fontWeight: '600', color: COLORS.green },
  // Validate All
  validateAllButton: { backgroundColor: COLORS.blue, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
  validateAllText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  // Section
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8, marginTop: 8 },
  reviewCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  criticalCard: { borderWidth: 2, borderColor: COLORS.orange },
  // Validation Field
  validationField: { marginBottom: 12 },
  validationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  validationLabel: { flex: 1, fontSize: 12, color: COLORS.textMuted },
  confidenceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  confidenceText: { fontSize: 10, fontWeight: '600' },
  validationInputRow: { flexDirection: 'row', alignItems: 'center' },
  validationValue: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textDark, paddingVertical: 8 },
  validationValueValidated: { color: COLORS.green },
  validationInput: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    fontSize: 16, fontWeight: '600', color: COLORS.textDark,
  },
  validationInputValidated: { borderWidth: 1, borderColor: COLORS.green },
  validateButton: {
    marginLeft: 8, width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.green,
    justifyContent: 'center', alignItems: 'center',
  },
  validateButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  validatedBadge: {
    marginLeft: 8, width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.greenLight,
    justifyContent: 'center', alignItems: 'center',
  },
  validatedText: { color: COLORS.green, fontSize: 18, fontWeight: '600' },
  // Parts
  partRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  partInfo: { flex: 1 },
  partName: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  partDetails: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  partAction: { backgroundColor: COLORS.blue, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  partActionText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  // AD/SB
  adsbRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  adsbBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  adBadge: { backgroundColor: COLORS.redLight },
  sbBadge: { backgroundColor: COLORS.orangeLight },
  adsbBadgeText: { fontSize: 10, fontWeight: '700' },
  adsbInfo: { flex: 1 },
  adsbNumber: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  adsbDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  // Validate Section
  validateSectionButton: { marginTop: 12, backgroundColor: COLORS.blue, borderRadius: 8, padding: 10, alignItems: 'center' },
  validateSectionButtonDone: { backgroundColor: COLORS.greenLight },
  validateSectionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  validateSectionTextDone: { color: COLORS.green },
  // ELT
  eltInfo: { fontSize: 14, color: COLORS.textDark, paddingVertical: 6 },
  // Tags
  tagsInput: { backgroundColor: COLORS.background, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.textDark },
  // Disclaimer
  disclaimer: { flexDirection: 'row', marginTop: 16, padding: 16, backgroundColor: COLORS.yellow, borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder },
  disclaimerIcon: { fontSize: 14, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 11, color: '#5D4037', lineHeight: 16 },
  // Action Buttons
  actionButtons: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  applyButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center' },
  applyButtonDisabled: { backgroundColor: COLORS.border },
  applyButtonText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
