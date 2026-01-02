/**
 * OCR Scanner Screen - Real document scanning with OpenAI Vision
 * TC-SAFE: OCR data must be validated by user before application
 * ANTI-DOUBLON: Vérifie les doublons avant application
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getLanguage } from '@/i18n';
import ocrService, { 
  OCRScanResponse, 
  ExtractedMaintenanceData,
  DocumentType,
  DuplicateCheckResponse,
} from '@/services/ocrService';

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

type ScanStep = 'source' | 'type' | 'scanning' | 'review' | 'duplicate_error';

const DOC_TYPES: { value: DocumentType; labelFr: string; labelEn: string; icon: string; descFr: string; descEn: string }[] = [
  { 
    value: 'maintenance_report', 
    labelFr: 'Rapport de maintenance', 
    labelEn: 'Maintenance Report', 
    icon: '📋',
    descFr: 'Met à jour heures, pièces, AD/SB, ELT',
    descEn: 'Updates hours, parts, AD/SB, ELT',
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

export default function OcrScannerScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();

  const [step, setStep] = useState<ScanStep>('source');
  const [sourceType, setSourceType] = useState<'photo' | 'import' | null>(null);
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null); // Store base64 directly
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<OCRScanResponse | null>(null);
  const [validatedFields, setValidatedFields] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResponse | null>(null);

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

  // Analyze image with OCR API
  const analyzeImage = async () => {
    if (!imageUri || !docType || !aircraftId) {
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        lang === 'fr' ? 'Informations manquantes.' : 'Missing information.'
      );
      return;
    }

    setIsAnalyzing(true);
    setStep('scanning');

    try {
      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call OCR API
      const response = await ocrService.scanDocument({
        aircraft_id: aircraftId,
        document_type: docType,
        image_base64: base64,
      });

      setScanResult(response);

      if (response.status === 'COMPLETED' || response.status === 'PENDING') {
        // Check for duplicates (ANTI-DOUBLON)
        try {
          const duplicates = await ocrService.checkDuplicates(response.id);
          if (duplicates.has_duplicates) {
            setDuplicateInfo(duplicates);
            setStep('duplicate_error');
            return;
          }
        } catch (dupError) {
          // If duplicate check fails, continue to review
          console.log('Duplicate check failed, continuing:', dupError);
        }
        
        setStep('review');
      } else if (response.status === 'FAILED') {
        Alert.alert(
          lang === 'fr' ? 'Erreur d\'analyse' : 'Analysis Error',
          response.error_message || (lang === 'fr' ? 'L\'analyse OCR a échoué.' : 'OCR analysis failed.'),
          [{ text: 'OK', onPress: () => setStep('type') }]
        );
      }
    } catch (error: any) {
      console.log('OCR error:', error);
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || error.message || (lang === 'fr' 
          ? 'Une erreur est survenue lors de l\'analyse.'
          : 'An error occurred during analysis.'),
        [{ text: 'OK', onPress: () => setStep('type') }]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTypeSelect = (type: DocumentType) => {
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
    if (scanResult?.extracted_data) {
      const fields = [
        'date', 'amo_name', 'description', 
        'airframe_hours', 'engine_hours', 'propeller_hours',
        'parts', 'adSbs', 'costs', 'elt'
      ];
      setValidatedFields(new Set(fields));
    }
  };

  const handleApplyData = async () => {
    if (!scanResult?.id) return;

    setIsApplying(true);
    try {
      // Apply the OCR results
      const shouldUpdateHours = validatedFields.has('airframe_hours') || validatedFields.has('engine_hours');
      await ocrService.applyResults(scanResult.id, shouldUpdateHours);

      Alert.alert(
        lang === 'fr' ? 'Succès' : 'Success',
        lang === 'fr'
          ? 'Les données OCR ont été appliquées avec succès.'
          : 'OCR data has been applied successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        error.response?.data?.detail || error.message || (lang === 'fr' 
          ? 'Échec de l\'application des données.'
          : 'Failed to apply data.')
      );
    } finally {
      setIsApplying(false);
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
        <TouchableOpacity style={styles.sourceCard} onPress={takePhoto}>
          <Text style={styles.sourceIcon}>📸</Text>
          <Text style={styles.sourceTitle}>
            {lang === 'fr' ? 'Prendre une photo' : 'Take a Photo'}
          </Text>
          <Text style={styles.sourceDesc}>
            {lang === 'fr' ? 'Utiliser la caméra' : 'Use camera'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sourceCard} onPress={pickImage}>
          <Text style={styles.sourceIcon}>📁</Text>
          <Text style={styles.sourceTitle}>
            {lang === 'fr' ? 'Importer un fichier' : 'Import a File'}
          </Text>
          <Text style={styles.sourceDesc}>
            {lang === 'fr' ? 'Galerie photos' : 'Photo library'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render type selection
  const renderTypeStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
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

      <View style={{ height: 40 }} />
    </ScrollView>
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
      
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.scanningImage} resizeMode="contain" />
      )}
    </View>
  );

  // Render duplicate error screen (ANTI-DOUBLON)
  const renderDuplicateError = () => (
    <View style={styles.duplicateContainer}>
      <View style={styles.duplicateIconContainer}>
        <Text style={styles.duplicateIcon}>⚠️</Text>
      </View>
      <Text style={styles.duplicateTitle}>
        {lang === 'fr' ? 'Rapport déjà importé' : 'Report already imported'}
      </Text>
      <Text style={styles.duplicateText}>
        {lang === 'fr' 
          ? 'Un document avec les mêmes informations (date, AMO, immatriculation) existe déjà dans le système.'
          : 'A document with the same information (date, AMO, registration) already exists in the system.'}
      </Text>
      
      {duplicateInfo && duplicateInfo.duplicates.length > 0 && (
        <View style={styles.duplicateDetails}>
          <Text style={styles.duplicateDetailsTitle}>
            {lang === 'fr' ? 'Détails du doublon:' : 'Duplicate details:'}
          </Text>
          {duplicateInfo.duplicates.map((dup, index) => (
            <Text key={index} style={styles.duplicateDetailItem}>
              • {dup.type}: {dup.match_reason}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.duplicateActions}>
        <TouchableOpacity 
          style={styles.duplicateCancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.duplicateCancelText}>
            {lang === 'fr' ? 'Annuler' : 'Cancel'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.duplicateNewButton}
          onPress={() => {
            setImageUri(null);
            setScanResult(null);
            setDuplicateInfo(null);
            setStep('source');
          }}
        >
          <Text style={styles.duplicateNewText}>
            {lang === 'fr' ? 'Scanner autre document' : 'Scan another document'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render validation field
  const renderValidationField = (
    label: string, 
    value: string | number | undefined | null, 
    fieldKey: string
  ) => {
    const displayValue = value?.toString() || '—';
    const isValidated = validatedFields.has(fieldKey);
    
    return (
      <View style={styles.validationField} key={fieldKey}>
        <View style={styles.validationHeader}>
          <Text style={styles.validationLabel}>{label}</Text>
        </View>
        <View style={styles.validationInputRow}>
          <Text style={[styles.validationValue, isValidated && styles.validationValueValidated]}>
            {displayValue}
          </Text>
          {!isValidated ? (
            <TouchableOpacity style={styles.validateButton} onPress={() => handleValidateField(fieldKey)}>
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
  };

  // Render review step
  const renderReviewStep = () => {
    const data = scanResult?.extracted_data;
    
    return (
      <View style={styles.reviewContainer}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>
            {lang === 'fr' ? 'Résultats OCR' : 'OCR Results'}
          </Text>
          <Text style={styles.reviewSubtitle}>{registration}</Text>
        </View>

        <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
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

          {data && (
            <>
              {/* Identification Section */}
              <Text style={styles.sectionLabel}>
                {lang === 'fr' ? 'Identification' : 'Identification'}
              </Text>
              <View style={styles.reviewCard}>
                {renderValidationField(
                  lang === 'fr' ? 'Date du rapport' : 'Report Date',
                  data.date,
                  'date'
                )}
                {renderValidationField(
                  'AMO',
                  data.amo_name,
                  'amo_name'
                )}
                {data.ame_name && renderValidationField(
                  'AME',
                  data.ame_name,
                  'ame_name'
                )}
                {data.work_order_number && renderValidationField(
                  lang === 'fr' ? 'N° Bon de travail' : 'Work Order #',
                  data.work_order_number,
                  'work_order'
                )}
              </View>

              {/* Hours Section (CRITICAL) */}
              {(data.airframe_hours || data.engine_hours || data.propeller_hours) && (
                <>
                  <Text style={styles.sectionLabel}>
                    ⚠️ {lang === 'fr' ? 'Heures détectées (CRITIQUE)' : 'Detected Hours (CRITICAL)'}
                  </Text>
                  <View style={[styles.reviewCard, styles.criticalCard]}>
                    {data.airframe_hours !== undefined && renderValidationField(
                      lang === 'fr' ? 'Heures cellule' : 'Airframe Hours',
                      data.airframe_hours,
                      'airframe_hours'
                    )}
                    {data.engine_hours !== undefined && renderValidationField(
                      lang === 'fr' ? 'Heures moteur' : 'Engine Hours',
                      data.engine_hours,
                      'engine_hours'
                    )}
                    {data.propeller_hours !== undefined && renderValidationField(
                      lang === 'fr' ? 'Heures hélice' : 'Propeller Hours',
                      data.propeller_hours,
                      'propeller_hours'
                    )}
                  </View>
                </>
              )}

              {/* Description */}
              {data.description && (
                <>
                  <Text style={styles.sectionLabel}>
                    {lang === 'fr' ? 'Description' : 'Description'}
                  </Text>
                  <View style={styles.reviewCard}>
                    <Text style={styles.descriptionText}>{data.description}</Text>
                    <TouchableOpacity
                      style={[styles.validateSectionButton, validatedFields.has('description') && styles.validateSectionButtonDone]}
                      onPress={() => handleValidateField('description')}
                    >
                      <Text style={[styles.validateSectionText, validatedFields.has('description') && styles.validateSectionTextDone]}>
                        {validatedFields.has('description')
                          ? '✓ ' + (lang === 'fr' ? 'Validé' : 'Validated')
                          : (lang === 'fr' ? 'Valider' : 'Validate')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Parts Section */}
              {data.parts_replaced && data.parts_replaced.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>
                    {lang === 'fr' ? `Pièces détectées (${data.parts_replaced.length})` : `Detected Parts (${data.parts_replaced.length})`}
                  </Text>
                  <View style={styles.reviewCard}>
                    {data.parts_replaced.map((part, index) => (
                      <View key={index} style={styles.partRow}>
                        <View style={styles.partInfo}>
                          <Text style={styles.partName}>{part.name || part.part_number}</Text>
                          <Text style={styles.partDetails}>
                            P/N: {part.part_number}
                            {part.quantity ? ` | Qty: ${part.quantity}` : ''}
                            {part.serial_number ? ` | S/N: ${part.serial_number}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[styles.validateSectionButton, validatedFields.has('parts') && styles.validateSectionButtonDone]}
                      onPress={() => handleValidateField('parts')}
                    >
                      <Text style={[styles.validateSectionText, validatedFields.has('parts') && styles.validateSectionTextDone]}>
                        {validatedFields.has('parts')
                          ? '✓ ' + (lang === 'fr' ? 'Pièces validées' : 'Parts validated')
                          : (lang === 'fr' ? 'Valider les pièces' : 'Validate parts')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* AD/SB Section */}
              {data.ad_sb_references && data.ad_sb_references.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>
                    {lang === 'fr' ? `AD/SB détectés (${data.ad_sb_references.length})` : `Detected AD/SB (${data.ad_sb_references.length})`}
                  </Text>
                  <View style={styles.reviewCard}>
                    {data.ad_sb_references.map((adSb, index) => (
                      <View key={index} style={styles.adsbRow}>
                        <View style={[styles.adsbBadge, adSb.adsb_type === 'AD' ? styles.adBadge : styles.sbBadge]}>
                          <Text style={styles.adsbBadgeText}>{adSb.adsb_type}</Text>
                        </View>
                        <View style={styles.adsbInfo}>
                          <Text style={styles.adsbNumber}>{adSb.reference_number}</Text>
                          {adSb.description && (
                            <Text style={styles.adsbDesc}>{adSb.description}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[styles.validateSectionButton, validatedFields.has('adSbs') && styles.validateSectionButtonDone]}
                      onPress={() => handleValidateField('adSbs')}
                    >
                      <Text style={[styles.validateSectionText, validatedFields.has('adSbs') && styles.validateSectionTextDone]}>
                        {validatedFields.has('adSbs')
                          ? '✓ ' + (lang === 'fr' ? 'AD/SB validés' : 'AD/SB validated')
                          : (lang === 'fr' ? 'Valider les AD/SB' : 'Validate AD/SB')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* ELT Section */}
              {data.elt_data && data.elt_data.detected && (
                <>
                  <Text style={styles.sectionLabel}>
                    🔔 {lang === 'fr' ? 'ELT détecté' : 'ELT Detected'}
                  </Text>
                  <View style={[styles.reviewCard, styles.eltCard]}>
                    {data.elt_data.brand && (
                      <View style={styles.eltRow}>
                        <Text style={styles.eltLabel}>{lang === 'fr' ? 'Marque' : 'Brand'}:</Text>
                        <Text style={styles.eltValue}>{data.elt_data.brand}</Text>
                      </View>
                    )}
                    {data.elt_data.model && (
                      <View style={styles.eltRow}>
                        <Text style={styles.eltLabel}>{lang === 'fr' ? 'Modèle' : 'Model'}:</Text>
                        <Text style={styles.eltValue}>{data.elt_data.model}</Text>
                      </View>
                    )}
                    {data.elt_data.serial_number && (
                      <View style={styles.eltRow}>
                        <Text style={styles.eltLabel}>S/N:</Text>
                        <Text style={styles.eltValue}>{data.elt_data.serial_number}</Text>
                      </View>
                    )}
                    {data.elt_data.installation_date && (
                      <View style={styles.eltRow}>
                        <Text style={styles.eltLabel}>{lang === 'fr' ? 'Date installation' : 'Installation Date'}:</Text>
                        <Text style={styles.eltValue}>{data.elt_data.installation_date}</Text>
                      </View>
                    )}
                    {data.elt_data.battery_expiry_date && (
                      <View style={styles.eltRow}>
                        <Text style={styles.eltLabel}>{lang === 'fr' ? 'Expiration batterie' : 'Battery Expiry'}:</Text>
                        <Text style={styles.eltValue}>{data.elt_data.battery_expiry_date}</Text>
                      </View>
                    )}
                    {data.elt_data.beacon_hex_id && (
                      <View style={styles.eltRow}>
                        <Text style={styles.eltLabel}>Hex ID:</Text>
                        <Text style={styles.eltValue}>{data.elt_data.beacon_hex_id}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.validateSectionButton, validatedFields.has('elt') && styles.validateSectionButtonDone]}
                      onPress={() => handleValidateField('elt')}
                    >
                      <Text style={[styles.validateSectionText, validatedFields.has('elt') && styles.validateSectionTextDone]}>
                        {validatedFields.has('elt')
                          ? '✓ ' + (lang === 'fr' ? 'ELT validé' : 'ELT validated')
                          : (lang === 'fr' ? 'Valider ELT' : 'Validate ELT')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Costs Section */}
              {(data.labor_cost || data.parts_cost || data.total_cost) && (
                <>
                  <Text style={styles.sectionLabel}>
                    {lang === 'fr' ? 'Coûts' : 'Costs'}
                  </Text>
                  <View style={styles.reviewCard}>
                    {data.labor_cost !== undefined && renderValidationField(
                      lang === 'fr' ? 'Main-d\'œuvre' : 'Labor',
                      `$${data.labor_cost.toFixed(2)}`,
                      'labor_cost'
                    )}
                    {data.parts_cost !== undefined && renderValidationField(
                      lang === 'fr' ? 'Pièces' : 'Parts',
                      `$${data.parts_cost.toFixed(2)}`,
                      'parts_cost'
                    )}
                    {data.total_cost !== undefined && renderValidationField(
                      'Total',
                      `$${data.total_cost.toFixed(2)}`,
                      'total_cost'
                    )}
                  </View>
                </>
              )}
            </>
          )}

          {/* Raw Text (if no structured data) */}
          {!data && scanResult?.raw_text && (
            <>
              <Text style={styles.sectionLabel}>
                {lang === 'fr' ? 'Texte extrait' : 'Extracted Text'}
              </Text>
              <View style={styles.reviewCard}>
                <Text style={styles.rawText}>{scanResult.raw_text}</Text>
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

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyButton, (validatedFields.size === 0 || isApplying) && styles.applyButtonDisabled]}
            onPress={handleApplyData}
            disabled={validatedFields.size === 0 || isApplying}
          >
            {isApplying ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.applyButtonText}>
                {lang === 'fr' ? 'Appliquer' : 'Apply'} ({validatedFields.size})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
      {step === 'duplicate_error' && renderDuplicateError()}
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
  // Duplicate Error (ANTI-DOUBLON)
  duplicateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  duplicateIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.redLight, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  duplicateIcon: { fontSize: 48 },
  duplicateTitle: { fontSize: 22, fontWeight: '700', color: COLORS.red, marginBottom: 12, textAlign: 'center' },
  duplicateText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  duplicateDetails: { backgroundColor: COLORS.white, padding: 16, borderRadius: 12, width: '100%', marginBottom: 24 },
  duplicateDetailsTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  duplicateDetailItem: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  duplicateActions: { flexDirection: 'row', gap: 12, width: '100%' },
  duplicateCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  duplicateCancelText: { fontSize: 16, color: COLORS.textMuted, fontWeight: '600' },
  duplicateNewButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  duplicateNewText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
  // Review
  reviewContainer: { flex: 1 },
  reviewHeader: { padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  reviewSubtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  reviewScroll: { flex: 1, padding: 16 },
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
  eltCard: { borderWidth: 2, borderColor: COLORS.teal },
  // Validation Field
  validationField: { marginBottom: 12 },
  validationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  validationLabel: { flex: 1, fontSize: 12, color: COLORS.textMuted },
  validationInputRow: { flexDirection: 'row', alignItems: 'center' },
  validationValue: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textDark, paddingVertical: 8 },
  validationValueValidated: { color: COLORS.green },
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
  // Description
  descriptionText: { fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  // Parts
  partRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  partInfo: { flex: 1 },
  partName: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  partDetails: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  // AD/SB
  adsbRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  adsbBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  adBadge: { backgroundColor: COLORS.redLight },
  sbBadge: { backgroundColor: COLORS.orangeLight },
  adsbBadgeText: { fontSize: 10, fontWeight: '700' },
  adsbInfo: { flex: 1 },
  adsbNumber: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  adsbDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  // ELT
  eltRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.background },
  eltLabel: { width: 120, fontSize: 12, color: COLORS.textMuted },
  eltValue: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.textDark },
  // Validate Section
  validateSectionButton: { marginTop: 12, backgroundColor: COLORS.blue, borderRadius: 8, padding: 10, alignItems: 'center' },
  validateSectionButtonDone: { backgroundColor: COLORS.greenLight },
  validateSectionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  validateSectionTextDone: { color: COLORS.green },
  // Raw Text
  rawText: { fontSize: 13, color: COLORS.textDark, lineHeight: 18 },
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
