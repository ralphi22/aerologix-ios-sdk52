/**
 * Edit Aircraft Screen
 * Includes photo selection and TC Lookup auto-fill
 * TC Lookup fills ONLY: manufacturer, model, first_owner_given, first_owner_family
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { t, getLanguage } from '@/i18n';
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';
import api from '@/services/api';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  border: '#E0E0E0',
  hint: '#9E9E9E',
  blue: '#E3F2FD',
  green: '#4CAF50',
  greenLight: '#E8F5E9',
  red: '#E53935',
  redLight: '#FFEBEE',
  orange: '#FF9800',
  orangeLight: '#FFF3E0',
};

// TC Lookup status types
type TCLookupStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'invalid_format' | 'error';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'numeric' | 'email-address';
  tcFilled?: boolean;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  tcFilled = false,
}: FormFieldProps) {
  const lang = getLanguage();
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {tcFilled && (
          <View style={styles.tcFilledBadge}>
            <Text style={styles.tcFilledText}>✓ TC</Text>
          </View>
        )}
      </View>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function EditAircraftScreen() {
  const router = useRouter();
  const { aircraftId } = useLocalSearchParams<{ aircraftId: string }>();
  const { getAircraftById, updateAircraft } = useAircraftLocalStore();
  const lang = getLanguage();

  const aircraft = getAircraftById(aircraftId || '');

  // TC Lookup state
  const [tcLookupStatus, setTcLookupStatus] = useState<TCLookupStatus>('idle');
  const [tcLookupDone, setTcLookupDone] = useState(false);

  // Form state
  const [registration, setRegistration] = useState('');
  const [commonName, setCommonName] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category, setCategory] = useState('');
  const [engineType, setEngineType] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [baseOperations, setBaseOperations] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [countryManufacture, setCountryManufacture] = useState('');
  const [yearManufacture, setYearManufacture] = useState('');
  const [registrationType, setRegistrationType] = useState('');
  const [ownerSince, setOwnerSince] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [airframeHours, setAirframeHours] = useState('');
  const [engineHours, setEngineHours] = useState('');
  const [propellerHours, setPropellerHours] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  
  // TC Lookup additional fields (First Owner)
  const [firstOwnerGiven, setFirstOwnerGiven] = useState('');
  const [firstOwnerFamily, setFirstOwnerFamily] = useState('');

  // Load aircraft data
  useEffect(() => {
    if (aircraft) {
      setRegistration(aircraft.registration);
      setCommonName(aircraft.commonName);
      setModel(aircraft.model);
      setSerialNumber(aircraft.serialNumber);
      setCategory(aircraft.category);
      setEngineType(aircraft.engineType);
      setMaxWeight(aircraft.maxWeight);
      setBaseOperations(aircraft.baseOperations);
      setManufacturer(aircraft.manufacturer);
      setCountryManufacture(aircraft.countryManufacture);
      setYearManufacture(aircraft.yearManufacture);
      setRegistrationType(aircraft.registrationType);
      setOwnerSince(aircraft.ownerSince);
      setAddressLine1(aircraft.addressLine1);
      setAddressLine2(aircraft.addressLine2);
      setCity(aircraft.city);
      setCountry(aircraft.country);
      setAirframeHours(aircraft.airframeHours.toString());
      setEngineHours(aircraft.engineHours.toString());
      setPropellerHours(aircraft.propellerHours.toString());
      setPhotoUri(aircraft.photoUri);
      // Load First Owner if saved
      setFirstOwnerGiven((aircraft as any).firstOwnerGiven || '');
      setFirstOwnerFamily((aircraft as any).firstOwnerFamily || '');
    }
  }, [aircraft]);

  // Validate Canadian registration format: C-XXXX (exactly 6 characters)
  const isValidCanadianRegistration = useCallback((reg: string): boolean => {
    const normalized = reg.toUpperCase().trim();
    return /^C-[A-Z0-9]{4}$/.test(normalized);
  }, []);

  // TC Lookup - ONLY fills manufacturer, model, first_owner_given, first_owner_family
  // Only called when registration is valid (C-XXXX format)
  // ANTI-404 FRUSTRANT: 404 is handled gracefully, no blocking error
  const fetchFromTC = useCallback(async (reg: string) => {
    const normalized = reg.toUpperCase().trim();
    
    // STRICT validation: only call TC API with valid Canadian registration
    if (!isValidCanadianRegistration(normalized)) {
      return;
    }
    
    if (tcLookupStatus === 'loading') return;

    setTcLookupStatus('loading');
    try {
      const response = await api.get(`/api/tc/lookup?registration=${normalized}`);
      const data = response.data;

      if (data) {
        // ONLY fill the 4 authorized fields from TC - SAFE: don't overwrite if empty response
        if (data.manufacturer && typeof data.manufacturer === 'string') {
          setManufacturer(data.manufacturer);
        }
        if (data.model && typeof data.model === 'string') {
          setModel(data.model);
        }
        if (data.first_owner_given_name && typeof data.first_owner_given_name === 'string') {
          setFirstOwnerGiven(data.first_owner_given_name);
        }
        if (data.first_owner_family_name && typeof data.first_owner_family_name === 'string') {
          setFirstOwnerFamily(data.first_owner_family_name);
        }
        
        setTcLookupStatus('success');
        setTcLookupDone(true);
      } else {
        // Empty response but no error - treat as not found
        setTcLookupStatus('not_found');
      }
    } catch (error: any) {
      // ANTI-404: Handle 404 gracefully - just show "not found" without blocking
      // User can still fill the form manually
      if (error?.response?.status === 404) {
        setTcLookupStatus('not_found');
        // Don't erase existing fields - user may have typed data
        console.warn('[TC Lookup] Registration not found in TC registry:', normalized);
      } else if (error?.response?.status === 400) {
        setTcLookupStatus('invalid_format');
        console.warn('[TC Lookup] Invalid format:', normalized);
      } else {
        // Network or other error - show generic but non-blocking
        setTcLookupStatus('error');
        console.warn('[TC Lookup] Error:', error?.message || 'Unknown error');
      }
      // IMPORTANT: Never throw - form remains usable
    }
  }, [tcLookupStatus, isValidCanadianRegistration]);

  // Debounced TC lookup ref - stores timeout ID for cleanup
  const tcLookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle registration change with debounced TC lookup trigger
  const handleRegistrationChange = (text: string) => {
    const upperText = text.toUpperCase().trim();
    setRegistration(upperText);
    
    // Cancel any pending TC lookup
    if (tcLookupTimeoutRef.current) {
      clearTimeout(tcLookupTimeoutRef.current);
      tcLookupTimeoutRef.current = null;
    }
    
    // Reset lookup state if registration is not valid format
    if (!isValidCanadianRegistration(upperText)) {
      // Only reset to idle, don't show errors for incomplete input
      if (tcLookupStatus !== 'idle') {
        setTcLookupStatus('idle');
      }
      setTcLookupDone(false);
      return;
    }
    
    // Valid registration format - trigger debounced TC lookup
    if (!tcLookupDone && tcLookupStatus !== 'loading') {
      tcLookupTimeoutRef.current = setTimeout(() => {
        fetchFromTC(upperText);
      }, 500); // 500ms debounce
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tcLookupTimeoutRef.current) {
        clearTimeout(tcLookupTimeoutRef.current);
      }
    };
  }, []);

  // Manually trigger TC lookup
  const handleTCLookup = () => {
    const normalized = registration.toUpperCase().trim();
    if (isValidCanadianRegistration(normalized)) {
      setTcLookupDone(false);
      setTcLookupStatus('idle');
      fetchFromTC(normalized);
    }
  };

  // Request media library permissions
  const requestMediaPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'fr' ? 'Permission requise' : 'Permission Required',
        lang === 'fr' 
          ? 'L\'accès aux photos est nécessaire pour sélectionner une image.'
          : 'Photo library access is required to select an image.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Request camera permissions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'fr' ? 'Permission requise' : 'Permission Required',
        lang === 'fr' 
          ? 'L\'accès à la caméra est nécessaire pour prendre une photo.'
          : 'Camera access is required to take a photo.',
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
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Camera error:', error);
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
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  };

  // Show photo options
  const handlePhotoPress = () => {
    Alert.alert(
      lang === 'fr' ? 'Photo de l\'avion' : 'Aircraft Photo',
      lang === 'fr' ? 'Choisir une source' : 'Choose a source',
      [
        {
          text: lang === 'fr' ? 'Prendre une photo' : 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: lang === 'fr' ? 'Choisir une image' : 'Choose Image',
          onPress: pickImage,
        },
        ...(photoUri ? [{
          text: lang === 'fr' ? 'Supprimer' : 'Remove',
          style: 'destructive' as const,
          onPress: () => setPhotoUri(undefined),
        }] : []),
        {
          text: lang === 'fr' ? 'Annuler' : 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
  };

  if (!aircraft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {lang === 'fr' ? 'Avion non trouvé' : 'Aircraft not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = () => {
    if (!registration.trim()) {
      Alert.alert('Error', lang === 'fr' ? "L'immatriculation est requise" : 'Registration is required');
      return;
    }

    updateAircraft(aircraftId || '', {
      registration: registration.toUpperCase(),
      commonName,
      model,
      serialNumber,
      category,
      engineType,
      maxWeight,
      baseOperations,
      manufacturer,
      countryManufacture,
      yearManufacture,
      registrationType,
      ownerSince,
      addressLine1,
      addressLine2,
      city,
      country,
      airframeHours: parseFloat(airframeHours) || 0,
      engineHours: parseFloat(engineHours) || 0,
      propellerHours: parseFloat(propellerHours) || 0,
      photoUri,
      firstOwnerGiven,
      firstOwnerFamily,
    } as any);

    router.back();
  };

  // TC Lookup status message - DISCRET pour 404
  const renderTCStatus = () => {
    switch (tcLookupStatus) {
      case 'loading':
        return (
          <View style={styles.tcStatusContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.tcStatusText}>
              {lang === 'fr' ? 'Recherche Transport Canada...' : 'Looking up Transport Canada...'}
            </Text>
          </View>
        );
      case 'success':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusSuccess]}>
            <Text style={styles.tcStatusSuccessText}>✓ Source: Transport Canada</Text>
          </View>
        );
      case 'not_found':
        // ANTI-404 FRUSTRANT: Discret, pas bloquant
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusNotFound]}>
            <Text style={styles.tcStatusNotFoundText}>
              {lang === 'fr' ? 'Introuvable dans le registre TC' : 'Not found in TC registry'}
            </Text>
          </View>
        );
      case 'invalid_format':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusError]}>
            <Text style={styles.tcStatusErrorText}>
              {lang === 'fr' ? 'Format d\'immatriculation canadienne invalide' : 'Invalid Canadian registration format'}
            </Text>
          </View>
        );
      case 'error':
        // Network error - still non-blocking
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusNotFound]}>
            <Text style={styles.tcStatusNotFoundText}>
              {lang === 'fr' ? 'Recherche TC indisponible' : 'TC lookup unavailable'}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'fr' ? "Modifier l'avion" : 'Edit Aircraft'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION: Photo */}
          <SectionHeader title={lang === 'fr' ? 'Photo' : 'Photo'} />
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoContainer} onPress={handlePhotoPress}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoText}>
                    {lang === 'fr' ? 'Ajouter une photo' : 'Add a photo'}
                  </Text>
                  <Text style={styles.photoHint}>
                    {lang === 'fr' ? 'Visible en filigrane sur la carte' : 'Visible as watermark on card'}
                  </Text>
                </View>
              )}
              <View style={styles.photoEditBadge}>
                <Text style={styles.photoEditText}>✏️</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* SECTION: Identity with TC Lookup */}
          <SectionHeader title={t('section_identity')} />
          <View style={styles.section}>
            {/* Registration with TC Lookup */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{t('registration')}</Text>
                {tcLookupStatus === 'loading' && (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                )}
              </View>
              <View style={styles.registrationRow}>
                <TextInput
                  style={[styles.fieldInput, styles.registrationInput]}
                  value={registration}
                  onChangeText={handleRegistrationChange}
                  placeholder="C-FABC"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <TouchableOpacity 
                  style={[
                    styles.tcLookupButton,
                    (!isValidCanadianRegistration(registration) || tcLookupStatus === 'loading') && styles.tcLookupButtonDisabled
                  ]}
                  onPress={handleTCLookup}
                  disabled={!isValidCanadianRegistration(registration) || tcLookupStatus === 'loading'}
                >
                  <Text style={styles.tcLookupButtonText}>🔍 TC</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* TC Status Message */}
            {renderTCStatus()}
            
            <FormField
              label={t('common_name')}
              value={commonName}
              onChangeText={setCommonName}
              placeholder="Cessna"
            />
            <FormField
              label={t('model_name')}
              value={model}
              onChangeText={setModel}
              placeholder="150L"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
            />
            <FormField
              label={t('serial_number')}
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="15070001"
            />
          </View>

          {/* SECTION: Category */}
          <SectionHeader title={t('section_category')} />
          <View style={styles.section}>
            <FormField
              label={t('category')}
              value={category}
              onChangeText={setCategory}
              placeholder="Normal"
            />
            <FormField
              label={t('engine_type')}
              value={engineType}
              onChangeText={setEngineType}
              placeholder="1, Piston"
            />
          </View>

          {/* SECTION: Weight & Base */}
          <SectionHeader title={t('section_weight')} />
          <View style={styles.section}>
            <FormField
              label={t('max_weight')}
              value={maxWeight}
              onChangeText={setMaxWeight}
              placeholder="1600 lbs"
            />
            <FormField
              label={t('base_operations')}
              value={baseOperations}
              onChangeText={setBaseOperations}
              placeholder="Joliette - CSG3"
            />
          </View>

          {/* SECTION: Construction */}
          <SectionHeader title={t('section_construction')} />
          <View style={styles.section}>
            <FormField
              label={t('manufacturer')}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="Cessna Aircraft Company"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
            />
            <FormField
              label={t('country_manufacture')}
              value={countryManufacture}
              onChangeText={setCountryManufacture}
              placeholder="United States"
            />
            <FormField
              label={t('year_manufacture')}
              value={yearManufacture}
              onChangeText={setYearManufacture}
              placeholder="1973"
              keyboardType="numeric"
            />
          </View>

          {/* SECTION: First Owner (from TC) */}
          <SectionHeader title={lang === 'fr' ? 'Premier propriétaire' : 'First Owner'} />
          <View style={styles.section}>
            <FormField
              label={lang === 'fr' ? 'Prénom' : 'Given Name'}
              value={firstOwnerGiven}
              onChangeText={setFirstOwnerGiven}
              placeholder="John"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
            />
            <FormField
              label={lang === 'fr' ? 'Nom de famille' : 'Family Name'}
              value={firstOwnerFamily}
              onChangeText={setFirstOwnerFamily}
              placeholder="Doe"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
            />
            {/* TC Source disclaimer */}
            <View style={styles.tcSourceNote}>
              <Text style={styles.tcSourceText}>
                {lang === 'fr' 
                  ? 'Source: Registre des aéronefs civils de Transport Canada. Informatif seulement.'
                  : 'Source: Transport Canada Civil Aircraft Register. Informational only.'}
              </Text>
            </View>
          </View>

          {/* SECTION: Hours */}
          <SectionHeader title={t('section_hours')} />
          <View style={styles.section}>
            <FormField
              label={t('airframe_hours')}
              value={airframeHours}
              onChangeText={setAirframeHours}
              placeholder="6344.6"
              keyboardType="numeric"
            />
            <FormField
              label={t('engine_hours')}
              value={engineHours}
              onChangeText={setEngineHours}
              placeholder="1281.8"
              keyboardType="numeric"
            />
            <FormField
              label={t('propeller_hours')}
              value={propellerHours}
              onChangeText={setPropellerHours}
              placeholder="400"
              keyboardType="numeric"
            />
          </View>

          {/* TC-Safe Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerText}>{t('tc_safe_disclaimer')}</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {lang === 'fr' ? 'Enregistrer' : 'Save'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Photo Section
  photoSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  photoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.blue,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  photoHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  photoEditText: {
    fontSize: 16,
  },
  // Section
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  fieldContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  fieldInput: {
    fontSize: 16,
    color: COLORS.textDark,
    paddingVertical: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: COLORS.hint,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // TC Filled badge
  tcFilledBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tcFilledText: {
    fontSize: 11,
    color: COLORS.green,
    fontWeight: '600',
  },
  // Registration row with TC button
  registrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registrationInput: {
    flex: 1,
  },
  tcLookupButton: {
    backgroundColor: COLORS.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  tcLookupButtonDisabled: {
    opacity: 0.5,
  },
  tcLookupButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // TC Status messages
  tcStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  tcStatusText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  tcStatusSuccess: {
    backgroundColor: COLORS.greenLight,
  },
  tcStatusSuccessText: {
    fontSize: 13,
    color: COLORS.green,
    fontWeight: '600',
  },
  tcStatusWarning: {
    backgroundColor: COLORS.orangeLight,
  },
  tcStatusWarningText: {
    fontSize: 13,
    color: COLORS.orange,
  },
  tcStatusNotFound: {
    backgroundColor: '#F5F5F5', // Gris discret
  },
  tcStatusNotFoundText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  tcStatusError: {
    backgroundColor: COLORS.redLight,
  },
  tcStatusErrorText: {
    fontSize: 13,
    color: COLORS.red,
  },
  // TC Source note
  tcSourceNote: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  tcSourceText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  disclaimerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },
  saveButton: {
    marginHorizontal: 16,
    backgroundColor: COLORS.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
