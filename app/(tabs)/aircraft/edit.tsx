/**
 * Edit Aircraft Screen
 * Enhanced TC Lookup with:
 * - Autocomplete suggestions from /api/tc/search
 * - Badge "From Transport Canada Registry (2026Q3)"
 * - Protection against overwriting user-edited fields
 * - TC-Safe disclaimers
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
  FlatList,
  Keyboard,
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
  blueBorder: '#90CAF9',
  green: '#4CAF50',
  greenLight: '#E8F5E9',
  red: '#E53935',
  redLight: '#FFEBEE',
  orange: '#FF9800',
  orangeLight: '#FFF3E0',
  teal: '#00897B',
  tealLight: '#E0F2F1',
};

// TC Lookup status types
type TCLookupStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'invalid_format' | 'error';

// TC Search suggestion type
interface TCSuggestion {
  registration: string;
  manufacturer: string;
  model: string;
  designator?: string;
}

// TC Lookup response type - OFFICIAL BACKEND CONTRACT
interface TCLookupData {
  registration: string;
  manufacturer: string;
  model: string;
  designator?: string;
  serial_number?: string;
  owner_name?: string;
  owner_city?: string;
  owner_province?: string;
}

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'numeric' | 'email-address';
  tcFilled?: boolean;
  userEdited?: boolean;
  onFocus?: () => void;
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
  userEdited = false,
  onFocus,
}: FormFieldProps) {
  const lang = getLanguage();
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {tcFilled && !userEdited && (
          <View style={styles.tcFilledBadge}>
            <Text style={styles.tcFilledText}>✓ TC</Text>
          </View>
        )}
        {userEdited && (
          <View style={styles.userEditedBadge}>
            <Text style={styles.userEditedText}>
              {lang === 'fr' ? 'Modifié' : 'Edited'}
            </Text>
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
        onFocus={onFocus}
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
  const [tcData, setTcData] = useState<TCLookupData | null>(null);
  const [tcErrorMessage, setTcErrorMessage] = useState<string>('');
  
  // TC Search suggestions state
  const [suggestions, setSuggestions] = useState<TCSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // User-edited fields tracking (protection against TC overwrite)
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());

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
  const [designator, setDesignator] = useState('');
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
  
  // TC Owner fields (from TC Registry lookup)
  const [ownerName, setOwnerName] = useState('');
  const [ownerCity, setOwnerCity] = useState('');
  const [ownerProvince, setOwnerProvince] = useState('');

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
      setDesignator((aircraft as any).designator || '');
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
      // TC Owner fields
      setOwnerName((aircraft as any).ownerName || '');
      setOwnerCity((aircraft as any).ownerCity || '');
      setOwnerProvince((aircraft as any).ownerProvince || '');
    }
  }, [aircraft]);

  // Normalize registration: trim, uppercase, add dash if missing
  const normalizeRegistration = useCallback((text: string): string => {
    let normalized = text.toUpperCase().trim();
    
    // Auto-insert dash after 'C' if missing and length >= 2
    if (normalized.length >= 2 && normalized.startsWith('C') && normalized[1] !== '-') {
      normalized = 'C-' + normalized.substring(1);
    }
    
    return normalized;
  }, []);

  // Validate Canadian registration format: C-XXXX (exactly 6 characters)
  const isValidCanadianRegistration = useCallback((reg: string): boolean => {
    const normalized = reg.toUpperCase().trim();
    return /^C-[A-Z0-9]{4}$/.test(normalized);
  }, []);

  // Debounce refs
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TC Search API - Get suggestions
  // ONLY called when prefix length is BETWEEN 2 AND 4 characters
  // NEVER call with complete registration (5+ chars)
  const searchTC = useCallback(async (prefix: string) => {
    // STRICT: Only search with 2-4 character prefix
    // C- counts as 2 chars, so C-FD is 4 chars total
    const cleanPrefix = prefix.replace('-', ''); // For length check: C-FD -> CFD (3 chars)
    
    if (prefix.length < 2 || cleanPrefix.length > 4) {
      // Too short or too long - don't search
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await api.get(`/api/tc/search?prefix=${encodeURIComponent(prefix)}&limit=8`);
      const results = response.data?.results || response.data || [];
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error: any) {
      console.warn('[TC Search] Error:', error?.message);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // TC Lookup API - Get exact registration data
  const fetchFromTC = useCallback(async (reg: string, skipUserEditedCheck: boolean = false) => {
    const normalized = normalizeRegistration(reg);
    
    if (!isValidCanadianRegistration(normalized)) {
      return;
    }
    
    if (tcLookupStatus === 'loading') return;

    setTcLookupStatus('loading');
    setTcErrorMessage('');
    
    try {
      const response = await api.get(`/api/tc/lookup?registration=${normalized}`);
      const data = response.data as TCLookupData;

      if (data) {
        setTcData(data);
        
        // Fill fields - but respect user-edited fields unless skipUserEditedCheck
        const fillField = (
          fieldName: string, 
          value: string | undefined, 
          setter: (val: string) => void
        ) => {
          if (!value || typeof value !== 'string') return;
          
          if (skipUserEditedCheck || !userEditedFields.has(fieldName)) {
            setter(value);
          } else {
            // Field was user-edited - ask for confirmation
            Alert.alert(
              lang === 'fr' ? 'Écraser la valeur ?' : 'Overwrite value?',
              lang === 'fr' 
                ? `Voulez-vous remplacer "${fieldName}" par la valeur TC ?`
                : `Do you want to replace "${fieldName}" with TC value?`,
              [
                { text: lang === 'fr' ? 'Non' : 'No', style: 'cancel' },
                { 
                  text: lang === 'fr' ? 'Oui' : 'Yes', 
                  onPress: () => {
                    setter(value);
                    // Remove from user-edited since they accepted TC value
                    setUserEditedFields(prev => {
                      const next = new Set(prev);
                      next.delete(fieldName);
                      return next;
                    });
                  }
                },
              ]
            );
          }
        };
        
        fillField('manufacturer', data.manufacturer, setManufacturer);
        fillField('model', data.model, setModel);
        fillField('designator', data.designator, setDesignator);
        fillField('serialNumber', data.serial_number, setSerialNumber);
        fillField('ownerName', data.owner_name, setOwnerName);
        fillField('ownerCity', data.owner_city, setOwnerCity);
        fillField('ownerProvince', data.owner_province, setOwnerProvince);
        
        setTcLookupStatus('success');
        setTcLookupDone(true);
      } else {
        setTcLookupStatus('not_found');
        setTcData(null);
      }
    } catch (error: any) {
      setTcData(null);
      
      if (error?.response?.status === 404) {
        setTcLookupStatus('not_found');
        setTcErrorMessage('');
      } else if (error?.response?.status === 400) {
        setTcLookupStatus('invalid_format');
        // Display backend error message
        setTcErrorMessage(error?.response?.data?.detail || error?.response?.data?.message || '');
      } else {
        setTcLookupStatus('error');
        setTcErrorMessage(error?.message || '');
      }
    }
  }, [
    tcLookupStatus, 
    normalizeRegistration, 
    isValidCanadianRegistration, 
    userEditedFields, 
    lang
  ]);

  // Handle registration input change
  // RULES:
  // 1. /api/tc/search ONLY when input is 2-4 chars (prefix search)
  // 2. NEVER auto-trigger /api/tc/lookup during typing
  // 3. Lookup only on: suggestion click OR onBlur with complete registration
  const handleRegistrationChange = (text: string) => {
    const normalized = normalizeRegistration(text);
    setRegistration(normalized);
    
    // Cancel pending searches
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    // Cancel pending lookups - NO AUTO LOOKUP
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
      lookupTimeoutRef.current = null;
    }
    
    // Reset TC status when typing (don't show "not found" during typing)
    if (tcLookupStatus !== 'idle' && tcLookupStatus !== 'loading') {
      setTcLookupStatus('idle');
      setTcData(null);
    }
    
    // Calculate effective length without dash for search logic
    const effectiveLength = normalized.replace('-', '').length;
    
    // Reset if too short
    if (normalized.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setTcLookupDone(false);
      return;
    }
    
    // SEARCH: Only trigger when prefix is 2-4 chars (not complete registration)
    // C-F = 3 chars total, effectiveLength = 2 (CF)
    // C-FD = 4 chars total, effectiveLength = 3 (CFD)
    // C-FDY = 5 chars total, effectiveLength = 4 (CFDY) - still searchable
    // C-FDYK = 6 chars total, effectiveLength = 5 (CFDYK) - TOO LONG, don't search
    if (effectiveLength >= 2 && effectiveLength <= 4) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTC(normalized);
      }, 300);
    } else {
      // Hide suggestions when typing complete registration
      setSuggestions([]);
      setShowSuggestions(false);
    }
    
    // LOOKUP: NEVER auto-trigger during typing
    // Lookup will only happen on:
    // - handleSelectSuggestion (user clicks suggestion)
    // - handleRegistrationBlur (user leaves field with complete registration)
    // - handleTCLookup (user clicks TC lookup button)
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: TCSuggestion) => {
    setRegistration(suggestion.registration);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    // Automatically lookup the selected registration
    setTcLookupDone(false);
    setTcLookupStatus('idle');
    fetchFromTC(suggestion.registration, true); // Skip user-edited check on selection
  };

  // Handle registration field blur (user leaves field)
  // ONLY trigger lookup if:
  // - Registration is complete (6 chars, C-XXXX format)
  // - No lookup has been done yet
  // - Status is idle (not already loading/success/error)
  const handleRegistrationBlur = useCallback(() => {
    const normalized = normalizeRegistration(registration);
    
    // Only lookup if complete registration and not already done
    if (isValidCanadianRegistration(normalized) && !tcLookupDone && tcLookupStatus === 'idle') {
      fetchFromTC(normalized);
    }
  }, [registration, tcLookupDone, tcLookupStatus, normalizeRegistration, isValidCanadianRegistration, fetchFromTC]);

  // Mark field as user-edited
  const markUserEdited = (fieldName: string) => {
    setUserEditedFields(prev => new Set(prev).add(fieldName));
  };

  // Handle field changes with user-edit tracking
  const handleManufacturerChange = (text: string) => {
    setManufacturer(text);
    if (tcLookupDone) markUserEdited('manufacturer');
  };
  
  const handleModelChange = (text: string) => {
    setModel(text);
    if (tcLookupDone) markUserEdited('model');
  };
  
  const handleDesignatorChange = (text: string) => {
    setDesignator(text);
    if (tcLookupDone) markUserEdited('designator');
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    };
  }, []);

  // Manual TC lookup trigger
  const handleTCLookup = () => {
    const normalized = normalizeRegistration(registration);
    if (isValidCanadianRegistration(normalized)) {
      setTcLookupDone(false);
      setTcLookupStatus('idle');
      setShowSuggestions(false);
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
      designator,
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
      // TC Owner fields
      ownerName,
      ownerCity,
      ownerProvince,
    } as any);

    router.back();
  };

  // Render TC Status with badge
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
            <View style={styles.tcBadge}>
              <Text style={styles.tcBadgeIcon}>✓</Text>
              <Text style={styles.tcBadgeText}>
                {lang === 'fr' 
                  ? 'Registre de Transports Canada (2026Q3)' 
                  : 'From Transport Canada Registry (2026Q3)'}
              </Text>
            </View>
          </View>
        );
      case 'not_found':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusNotFound]}>
            <Text style={styles.tcStatusNotFoundText}>
              {lang === 'fr' ? 'Introuvable dans le registre TC' : 'Not found in Transport Canada registry'}
            </Text>
          </View>
        );
      case 'invalid_format':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusError]}>
            <Text style={styles.tcStatusErrorText}>
              {tcErrorMessage || (lang === 'fr' 
                ? 'Les immatriculations canadiennes doivent commencer par C' 
                : 'Canadian registrations must start with C')}
            </Text>
          </View>
        );
      case 'error':
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

  // Render suggestion item
  const renderSuggestion = ({ item }: { item: TCSuggestion }) => (
    <TouchableOpacity 
      style={styles.suggestionItem}
      onPress={() => handleSelectSuggestion(item)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionMain}>
        <Text style={styles.suggestionReg}>{item.registration}</Text>
        <View style={styles.suggestionTcBadge}>
          <Text style={styles.suggestionTcText}>TC</Text>
        </View>
      </View>
      <Text style={styles.suggestionDetail} numberOfLines={1}>
        {item.manufacturer} {item.model}
      </Text>
    </TouchableOpacity>
  );

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
            {/* Registration with TC Search Autocomplete */}
            <View style={styles.fieldContainer}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{t('registration')}</Text>
                {(isSearching || tcLookupStatus === 'loading') && (
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
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={handleRegistrationBlur}
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
              
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList
                    data={suggestions}
                    renderItem={renderSuggestion}
                    keyExtractor={(item) => item.registration}
                    keyboardShouldPersistTaps="handled"
                    style={styles.suggestionsList}
                    scrollEnabled={suggestions.length > 4}
                  />
                </View>
              )}
            </View>
            
            {/* TC Status Message with Badge */}
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
              onChangeText={handleModelChange}
              placeholder="150L"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
              userEdited={userEditedFields.has('model')}
            />
            <FormField
              label={lang === 'fr' ? 'Désignateur' : 'Designator'}
              value={designator}
              onChangeText={handleDesignatorChange}
              placeholder="C150"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
              userEdited={userEditedFields.has('designator')}
            />
            <FormField
              label={t('serial_number')}
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="15070001"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
              userEdited={userEditedFields.has('serialNumber')}
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
              onChangeText={handleManufacturerChange}
              placeholder="Cessna Aircraft Company"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
              userEdited={userEditedFields.has('manufacturer')}
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

          {/* SECTION: TC Owner Info (from TC Registry) */}
          <SectionHeader title={lang === 'fr' ? 'Propriétaire (TC Registry)' : 'Owner (TC Registry)'} />
          <View style={styles.section}>
            <FormField
              label={lang === 'fr' ? 'Nom du propriétaire' : 'Owner Name'}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="John Doe / Acme Aviation Inc."
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
              userEdited={userEditedFields.has('ownerName')}
            />
            <FormField
              label={lang === 'fr' ? 'Ville' : 'City'}
              value={ownerCity}
              onChangeText={setOwnerCity}
              placeholder="Montréal"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
              userEdited={userEditedFields.has('ownerCity')}
            />
            <FormField
              label={lang === 'fr' ? 'Province' : 'Province'}
              value={ownerProvince}
              onChangeText={setOwnerProvince}
              placeholder="QC"
              tcFilled={tcLookupDone && tcLookupStatus === 'success'}
              userEdited={userEditedFields.has('ownerProvince')}
            />
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
          <View style={styles.tcDisclaimer}>
            <Text style={styles.tcDisclaimerIcon}>ℹ️</Text>
            <Text style={styles.tcDisclaimerText}>
              {lang === 'fr'
                ? 'Données du registre à titre informatif. Vérifiez avec Transports Canada.'
                : 'Registry data is informational only. Verify with official Transport Canada records.'}
            </Text>
          </View>

          {/* General TC-Safe Disclaimer */}
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
  // User edited badge
  userEditedBadge: {
    backgroundColor: COLORS.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  userEditedText: {
    fontSize: 11,
    color: COLORS.orange,
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
  // Suggestions
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.blueBorder,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  suggestionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  suggestionReg: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginRight: 8,
  },
  suggestionTcBadge: {
    backgroundColor: COLORS.tealLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suggestionTcText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.teal,
  },
  suggestionDetail: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  // TC Status messages
  tcStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
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
  // TC Badge
  tcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tcBadgeIcon: {
    fontSize: 16,
    color: COLORS.green,
    marginRight: 8,
    fontWeight: '700',
  },
  tcBadgeText: {
    fontSize: 13,
    color: COLORS.green,
    fontWeight: '600',
  },
  tcStatusNotFound: {
    backgroundColor: '#F5F5F5',
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
  // TC Disclaimer
  tcDisclaimer: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: COLORS.blue,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.blueBorder,
  },
  tcDisclaimerIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  tcDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    lineHeight: 18,
  },
  // General disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
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
