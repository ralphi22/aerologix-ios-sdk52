/**
 * Edit Aircraft Screen - TC Registry Integration FIXED
 * 
 * CRITICAL FIXES:
 * 1. Load saved aircraft data FIRST on open (RESET form)
 * 2. NO automatic TC lookup on blur/open
 * 3. Explicit "Search TC Registry" button only
 * 4. TC lookup fills ALL available fields
 * 5. NO hardcoded example values
 * 
 * Backend = source of truth
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

type TCLookupStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'error';

interface TCSuggestion {
  registration: string;
  manufacturer: string;
  model: string;
}

interface TCLookupData {
  registration: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  year?: string;
  category?: string;
  engine_type?: string;
  max_weight_kg?: string;
  base_of_operations?: string;
  owner_name?: string;
  owner_city?: string;
  owner_province?: string;
  designator?: string;
}

type TCFilledFields = Set<string>;

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
  label, value, onChangeText, placeholder, hint,
  autoCapitalize = 'sentences', keyboardType = 'default', tcFilled = false,
}: FormFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {tcFilled && value && (
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
        placeholderTextColor={COLORS.hint}
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
  const [tcFilledFields, setTcFilledFields] = useState<TCFilledFields>(new Set());
  
  // TC Search
  const [suggestions, setSuggestions] = useState<TCSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Form state - initialized empty, will be filled from saved aircraft
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
  const [ownerName, setOwnerName] = useState('');
  const [ownerCity, setOwnerCity] = useState('');
  const [ownerProvince, setOwnerProvince] = useState('');
  // NEW: Purpose and Base City fields
  const [purpose, setPurpose] = useState('');
  const [baseCity, setBaseCity] = useState('');

  /**
   * CRITICAL: Load saved aircraft data on mount
   * This is the COMPLETE RESET - no TC lookup triggered
   */
  useEffect(() => {
    if (aircraft) {
      // Debug log to verify data loading
      console.log('[Edit Aircraft] Loading data:', {
        id: aircraft.id,
        registration: aircraft.registration,
        commonName: aircraft.commonName,
        baseOperations: aircraft.baseOperations,
      });
      
      // Reset form with SAVED values only
      setRegistration(aircraft.registration || '');
      setCommonName(aircraft.commonName || '');
      setModel(aircraft.model || '');
      setSerialNumber(aircraft.serialNumber || '');
      setCategory(aircraft.category || '');
      setEngineType(aircraft.engineType || '');
      setMaxWeight(aircraft.maxWeight || '');
      setBaseOperations(aircraft.baseOperations || '');
      setManufacturer(aircraft.manufacturer || '');
      setDesignator((aircraft as any).designator || '');
      setCountryManufacture(aircraft.countryManufacture || '');
      setYearManufacture(aircraft.yearManufacture || '');
      setRegistrationType(aircraft.registrationType || '');
      setOwnerSince(aircraft.ownerSince || '');
      setAddressLine1(aircraft.addressLine1 || '');
      setAddressLine2(aircraft.addressLine2 || '');
      setCity(aircraft.city || '');
      setCountry(aircraft.country || '');
      setAirframeHours(aircraft.airframeHours?.toString() || '');
      setEngineHours(aircraft.engineHours?.toString() || '');
      setPropellerHours(aircraft.propellerHours?.toString() || '');
      setPhotoUri(aircraft.photoUri);
      setOwnerName((aircraft as any).ownerName || '');
      setOwnerCity((aircraft as any).ownerCity || '');
      setOwnerProvince((aircraft as any).ownerProvince || '');
      // NEW: Load purpose and baseCity from aircraft data
      setPurpose((aircraft as any).purpose || '');
      setBaseCity((aircraft as any).baseCity || '');
      
      // IMPORTANT: Do NOT trigger TC lookup automatically
      setTcLookupStatus('idle');
      setTcFilledFields(new Set());
    }
  }, [aircraft]);

  const normalizeRegistration = useCallback((text: string): string => {
    let normalized = text.toUpperCase().trim();
    if (normalized.length >= 2 && normalized.startsWith('C') && normalized[1] !== '-') {
      normalized = 'C-' + normalized.substring(1);
    }
    return normalized;
  }, []);

  const isValidCanadianRegistration = useCallback((reg: string): boolean => {
    return /^C-[A-Z0-9]{4}$/.test(reg.toUpperCase().trim());
  }, []);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TC Search (prefix only)
  const searchTC = useCallback(async (prefix: string) => {
    const cleanPrefix = prefix.replace('-', '');
    if (prefix.length < 2 || cleanPrefix.length > 4) {
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
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * TC LOOKUP - COMPLETE HYDRATION
   * Called ONLY by explicit user action (button or suggestion click)
   */
  const fetchFromTC = useCallback(async (reg: string) => {
    const normalized = normalizeRegistration(reg);
    if (!isValidCanadianRegistration(normalized)) return;
    if (tcLookupStatus === 'loading') return;

    setTcLookupStatus('loading');
    
    try {
      const response = await api.get(`/api/tc/lookup?registration=${normalized}`);
      const data = response.data as TCLookupData;

      if (data) {
        const filled = new Set<string>();
        
        // HYDRATE ALL TC FIELDS
        if (data.registration) { setRegistration(data.registration); filled.add('registration'); }
        if (data.manufacturer) { setManufacturer(data.manufacturer); filled.add('manufacturer'); }
        if (data.model) { setModel(data.model); filled.add('model'); }
        if (data.serial_number) { setSerialNumber(data.serial_number); filled.add('serialNumber'); }
        if (data.year) { setYearManufacture(data.year); filled.add('yearManufacture'); }
        if (data.category) { setCategory(data.category); filled.add('category'); }
        if (data.engine_type) { setEngineType(data.engine_type); filled.add('engineType'); }
        if (data.max_weight_kg) { setMaxWeight(data.max_weight_kg); filled.add('maxWeight'); }
        if (data.base_of_operations) { setBaseOperations(data.base_of_operations); filled.add('baseOperations'); }
        if (data.designator) { setDesignator(data.designator); filled.add('designator'); }
        if (data.owner_name) { setOwnerName(data.owner_name); filled.add('ownerName'); }
        if (data.owner_city) { setOwnerCity(data.owner_city); filled.add('ownerCity'); }
        if (data.owner_province) { setOwnerProvince(data.owner_province); filled.add('ownerProvince'); }
        
        setTcFilledFields(filled);
        setTcLookupStatus('success');
      } else {
        setTcLookupStatus('not_found');
      }
    } catch (error: any) {
      setTcLookupStatus(error?.response?.status === 404 ? 'not_found' : 'error');
    }
  }, [tcLookupStatus, normalizeRegistration, isValidCanadianRegistration]);

  // Handle registration change - NO auto TC lookup
  const handleRegistrationChange = (text: string) => {
    const normalized = normalizeRegistration(text);
    setRegistration(normalized);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    // Reset TC status but do NOT trigger lookup
    if (tcLookupStatus !== 'idle' && tcLookupStatus !== 'loading') {
      setTcLookupStatus('idle');
      setTcFilledFields(new Set());
    }
    
    const effectiveLength = normalized.replace('-', '').length;
    
    if (normalized.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Search with prefix 2-4 chars only
    if (effectiveLength >= 2 && effectiveLength <= 4) {
      searchTimeoutRef.current = setTimeout(() => searchTC(normalized), 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Select suggestion - triggers TC lookup
  const handleSelectSuggestion = (suggestion: TCSuggestion) => {
    setRegistration(suggestion.registration);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    fetchFromTC(suggestion.registration);
  };

  // EXPLICIT TC lookup button - the ONLY way to trigger lookup in Edit mode
  const handleTCLookup = () => {
    const normalized = normalizeRegistration(registration);
    if (isValidCanadianRegistration(normalized)) {
      setShowSuggestions(false);
      
      // Confirm before overwriting
      Alert.alert(
        lang === 'fr' ? 'Rechercher TC?' : 'Search TC?',
        lang === 'fr' 
          ? 'Cela remplacera les valeurs actuelles par les données du registre Transport Canada.'
          : 'This will replace current values with Transport Canada registry data.',
        [
          { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
          { text: lang === 'fr' ? 'Rechercher' : 'Search', onPress: () => fetchFromTC(normalized) },
        ]
      );
    }
  };

  useEffect(() => {
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, []);

  // Photo handling
  const requestMediaPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'fr' ? 'Permission requise' : 'Permission Required',
        lang === 'fr' ? 'L\'accès aux photos est nécessaire.' : 'Photo library access is required.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'fr' ? 'Permission requise' : 'Permission Required',
        lang === 'fr' ? 'L\'accès à la caméra est nécessaire.' : 'Camera access is required.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [16, 9], quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch (error) { console.log('Camera error:', error); }
  };

  const pickImage = async () => {
    const hasPermission = await requestMediaPermission();
    if (!hasPermission) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [16, 9], quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch (error) { console.log('Image picker error:', error); }
  };

  const handlePhotoPress = () => {
    Alert.alert(
      lang === 'fr' ? 'Photo de l\'avion' : 'Aircraft Photo',
      lang === 'fr' ? 'Choisir une source' : 'Choose a source',
      [
        { text: lang === 'fr' ? 'Prendre une photo' : 'Take Photo', onPress: takePhoto },
        { text: lang === 'fr' ? 'Choisir une image' : 'Choose Image', onPress: pickImage },
        ...(photoUri ? [{ text: lang === 'fr' ? 'Supprimer' : 'Remove', style: 'destructive' as const, onPress: () => setPhotoUri(undefined) }] : []),
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  if (!aircraft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{lang === 'fr' ? 'Avion non trouvé' : 'Aircraft not found'}</Text>
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
      commonName, model, serialNumber, category, engineType,
      maxWeight, baseOperations, manufacturer, designator,
      countryManufacture, yearManufacture, registrationType,
      ownerSince, addressLine1, addressLine2, city, country,
      airframeHours: parseFloat(airframeHours) || 0,
      engineHours: parseFloat(engineHours) || 0,
      propellerHours: parseFloat(propellerHours) || 0,
      photoUri, ownerName, ownerCity, ownerProvince,
      // NEW: Include purpose and baseCity
      purpose: purpose || null,
      baseCity: baseCity || null,
    } as any);

    router.back();
  };

  const renderTCStatus = () => {
    switch (tcLookupStatus) {
      case 'loading':
        return (
          <View style={styles.tcStatusContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.tcStatusText}>{lang === 'fr' ? 'Recherche TC...' : 'Searching TC...'}</Text>
          </View>
        );
      case 'success':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusSuccess]}>
            <Text style={styles.tcStatusSuccessText}>
              ✓ {lang === 'fr' ? 'Données TC chargées' : 'TC data loaded'} ({tcFilledFields.size} {lang === 'fr' ? 'champs' : 'fields'})
            </Text>
          </View>
        );
      case 'not_found':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusWarning]}>
            <Text style={styles.tcStatusWarningText}>{lang === 'fr' ? 'Non trouvé dans TC' : 'Not found in TC'}</Text>
          </View>
        );
      case 'error':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusError]}>
            <Text style={styles.tcStatusErrorText}>{lang === 'fr' ? 'Erreur TC' : 'TC error'}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const renderSuggestion = ({ item }: { item: TCSuggestion }) => (
    <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item)} activeOpacity={0.7}>
      <View style={styles.suggestionMain}>
        <Text style={styles.suggestionReg}>{item.registration}</Text>
        <View style={styles.suggestionTcBadge}><Text style={styles.suggestionTcText}>TC</Text></View>
      </View>
      <Text style={styles.suggestionDetail} numberOfLines={1}>{item.manufacturer} {item.model}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lang === 'fr' ? "Modifier l'avion" : 'Edit Aircraft'}</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Photo */}
          <SectionHeader title={lang === 'fr' ? 'Photo' : 'Photo'} />
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoContainer} onPress={handlePhotoPress}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoIcon}>📷</Text>
                  <Text style={styles.photoText}>{lang === 'fr' ? 'Ajouter une photo' : 'Add a photo'}</Text>
                </View>
              )}
              <View style={styles.photoEditBadge}><Text style={styles.photoEditText}>✏️</Text></View>
            </TouchableOpacity>
          </View>

          {/* Identity */}
          <SectionHeader title={t('section_identity')} />
          <View style={styles.section}>
            <View style={styles.fieldContainer}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>{t('registration')}</Text>
                {(isSearching || tcLookupStatus === 'loading') && <ActivityIndicator size="small" color={COLORS.primary} />}
              </View>
              <View style={styles.registrationRow}>
                <TextInput
                  style={[styles.fieldInput, styles.registrationInput]}
                  value={registration}
                  onChangeText={handleRegistrationChange}
                  placeholder="—"
                  placeholderTextColor={COLORS.hint}
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <TouchableOpacity 
                  style={[styles.tcLookupButton, (!isValidCanadianRegistration(registration) || tcLookupStatus === 'loading') && styles.tcLookupButtonDisabled]}
                  onPress={handleTCLookup}
                  disabled={!isValidCanadianRegistration(registration) || tcLookupStatus === 'loading'}
                >
                  <Text style={styles.tcLookupButtonText}>🔍 {lang === 'fr' ? 'Registre TC' : 'TC Registry'}</Text>
                </TouchableOpacity>
              </View>
              
              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <FlatList data={suggestions} renderItem={renderSuggestion} keyExtractor={(item) => item.registration} keyboardShouldPersistTaps="handled" style={styles.suggestionsList} scrollEnabled={suggestions.length > 4} />
                </View>
              )}
              
              <Text style={styles.fieldHint}>{lang === 'fr' ? 'Cliquez "Registre TC" pour mettre à jour depuis TC' : 'Click "TC Registry" to update from TC'}</Text>
            </View>
            
            {renderTCStatus()}
            
            <FormField label={t('common_name')} value={commonName} onChangeText={setCommonName} placeholder={lang === 'fr' ? 'Non spécifié' : 'Not specified'} />
            <FormField label={t('model_name')} value={model} onChangeText={setModel} placeholder="—" tcFilled={tcFilledFields.has('model')} />
            <FormField label={lang === 'fr' ? 'Désignateur' : 'Designator'} value={designator} onChangeText={setDesignator} placeholder="—" tcFilled={tcFilledFields.has('designator')} />
            <FormField label={t('serial_number')} value={serialNumber} onChangeText={setSerialNumber} placeholder="—" tcFilled={tcFilledFields.has('serialNumber')} />
            {/* NEW: Purpose field */}
            <FormField 
              label={lang === 'fr' ? 'But / Purpose' : 'Purpose'} 
              value={purpose} 
              onChangeText={setPurpose} 
              placeholder={lang === 'fr' ? 'Ex: Privé, Commercial, Formation' : 'Ex: Private, Commercial, Training'}
              hint={lang === 'fr' ? 'But d\'enregistrement (Transport Canada)' : 'Registration purpose (from Transport Canada)'}
            />
            {/* NEW: Base City field */}
            <FormField 
              label={lang === 'fr' ? 'Ville / Aéroport de base' : 'Base City / Airport'} 
              value={baseCity} 
              onChangeText={setBaseCity} 
              placeholder={lang === 'fr' ? 'Ex: Montréal, CYUL' : 'Ex: Montreal, CYUL'}
              hint={lang === 'fr' ? 'Lieu d\'attache de l\'aéronef' : 'Home base location'}
            />
          </View>

          {/* Category */}
          <SectionHeader title={t('section_category')} />
          <View style={styles.section}>
            <FormField label={t('category')} value={category} onChangeText={setCategory} placeholder="—" tcFilled={tcFilledFields.has('category')} />
            <FormField label={t('engine_type')} value={engineType} onChangeText={setEngineType} placeholder="—" tcFilled={tcFilledFields.has('engineType')} />
          </View>

          {/* Weight & Base */}
          <SectionHeader title={t('section_weight')} />
          <View style={styles.section}>
            <FormField label={t('max_weight')} value={maxWeight} onChangeText={setMaxWeight} placeholder="—" tcFilled={tcFilledFields.has('maxWeight')} />
            <FormField label={t('base_operations')} value={baseOperations} onChangeText={setBaseOperations} placeholder={lang === 'fr' ? 'Non spécifié' : 'Not specified'} tcFilled={tcFilledFields.has('baseOperations')} />
          </View>

          {/* Construction */}
          <SectionHeader title={t('section_construction')} />
          <View style={styles.section}>
            <FormField label={t('manufacturer')} value={manufacturer} onChangeText={setManufacturer} placeholder="—" tcFilled={tcFilledFields.has('manufacturer')} />
            <FormField label={t('country_manufacture')} value={countryManufacture} onChangeText={setCountryManufacture} placeholder="—" />
            <FormField label={t('year_manufacture')} value={yearManufacture} onChangeText={setYearManufacture} placeholder="—" keyboardType="numeric" tcFilled={tcFilledFields.has('yearManufacture')} />
          </View>

          {/* TC Owner */}
          <SectionHeader title={lang === 'fr' ? 'Propriétaire (Registre TC)' : 'Owner (TC Registry)'} />
          <View style={styles.section}>
            <FormField label={lang === 'fr' ? 'Nom' : 'Name'} value={ownerName} onChangeText={setOwnerName} placeholder="—" tcFilled={tcFilledFields.has('ownerName')} />
            <FormField label={lang === 'fr' ? 'Ville' : 'City'} value={ownerCity} onChangeText={setOwnerCity} placeholder="—" tcFilled={tcFilledFields.has('ownerCity')} />
            <FormField label={lang === 'fr' ? 'Province' : 'Province'} value={ownerProvince} onChangeText={setOwnerProvince} placeholder="—" tcFilled={tcFilledFields.has('ownerProvince')} />
          </View>

          {/* Hours */}
          <SectionHeader title={t('section_hours')} />
          <View style={styles.section}>
            <FormField label={t('airframe_hours')} value={airframeHours} onChangeText={setAirframeHours} placeholder="—" keyboardType="numeric" />
            <FormField label={t('engine_hours')} value={engineHours} onChangeText={setEngineHours} placeholder="—" keyboardType="numeric" />
            <FormField label={t('propeller_hours')} value={propellerHours} onChangeText={setPropellerHours} placeholder="—" keyboardType="numeric" />
          </View>

          {/* Disclaimers */}
          <View style={styles.tcDisclaimer}>
            <Text style={styles.tcDisclaimerIcon}>ℹ️</Text>
            <Text style={styles.tcDisclaimerText}>
              {lang === 'fr' ? 'Données TC à titre informatif. Vérifiez avec les registres officiels.' : 'TC data is informational only. Verify with official records.'}
            </Text>
          </View>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerText}>{t('tc_safe_disclaimer')}</Text>
          </View>

          {/* Save */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>{lang === 'fr' ? 'Enregistrer' : 'Save'}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerBackText: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerRight: { width: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: COLORS.textMuted },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  photoSection: { backgroundColor: COLORS.white, padding: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  photoContainer: { width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.blue, position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoIcon: { fontSize: 40, marginBottom: 8 },
  photoText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  photoEditBadge: { position: 'absolute', bottom: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  photoEditText: { fontSize: 16 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  section: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  fieldContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { fontSize: 14, color: COLORS.textMuted },
  fieldInput: { fontSize: 16, color: COLORS.textDark, paddingVertical: 4 },
  fieldHint: { fontSize: 12, color: COLORS.hint, marginTop: 4, fontStyle: 'italic' },
  tcFilledBadge: { backgroundColor: COLORS.greenLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tcFilledText: { fontSize: 11, color: COLORS.green, fontWeight: '600' },
  registrationRow: { flexDirection: 'row', alignItems: 'center' },
  registrationInput: { flex: 1 },
  tcLookupButton: { backgroundColor: COLORS.blue, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  tcLookupButtonDisabled: { opacity: 0.5 },
  tcLookupButtonText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  suggestionsContainer: { marginTop: 8, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.blueBorder, maxHeight: 200, overflow: 'hidden' },
  suggestionsList: { maxHeight: 200 },
  suggestionItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestionMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  suggestionReg: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginRight: 8 },
  suggestionTcBadge: { backgroundColor: COLORS.tealLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  suggestionTcText: { fontSize: 10, fontWeight: '700', color: COLORS.teal },
  suggestionDetail: { fontSize: 13, color: COLORS.textMuted },
  tcStatusContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, gap: 8 },
  tcStatusText: { fontSize: 13, color: COLORS.primary },
  tcStatusSuccess: { backgroundColor: COLORS.greenLight },
  tcStatusSuccessText: { fontSize: 13, color: COLORS.green, fontWeight: '600' },
  tcStatusWarning: { backgroundColor: COLORS.orangeLight },
  tcStatusWarningText: { fontSize: 13, color: COLORS.orange },
  tcStatusError: { backgroundColor: COLORS.redLight },
  tcStatusErrorText: { fontSize: 13, color: COLORS.red },
  tcDisclaimer: { flexDirection: 'row', margin: 16, marginBottom: 8, padding: 14, backgroundColor: COLORS.blue, borderRadius: 12, borderWidth: 1, borderColor: COLORS.blueBorder },
  tcDisclaimerIcon: { fontSize: 16, marginRight: 10 },
  tcDisclaimerText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  disclaimer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, padding: 16, backgroundColor: '#FFF8E1', borderRadius: 12, borderWidth: 1, borderColor: '#FFE082' },
  disclaimerIcon: { fontSize: 20, marginRight: 12 },
  disclaimerText: { flex: 1, fontSize: 13, color: '#5D4037', lineHeight: 18 },
  saveButton: { marginHorizontal: 16, backgroundColor: COLORS.green, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
});
