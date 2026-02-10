/**
 * Add Aircraft Screen - Complete form with TC Registry Integration
 * 
 * TC LOOKUP HYDRATION (CRITICAL):
 * All available TC fields are filled after successful lookup:
 * - registration, manufacturer, model, serial_number
 * - year, category, engine_type, max_weight_kg, base_of_operations
 * 
 * NO hardcoded values, NO example values as defaults
 * Backend = source of truth
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  success: '#28A745',
  successBg: '#E8F5E9',
  orange: '#FF9800',
  orangeBg: '#FFF3E0',
  red: '#E53935',
  redBg: '#FFEBEE',
  blue: '#E3F2FD',
  blueBorder: '#90CAF9',
  teal: '#00897B',
  tealBg: '#E0F2F1',
};

// TC Lookup status types
type TCLookupStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'error';

// TC Search suggestion
interface TCSuggestion {
  registration: string;
  manufacturer: string;
  model: string;
}

// TC Lookup response - COMPLETE BACKEND CONTRACT
interface TCLookupData {
  registration: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  year?: string;
  category?: string;
  engine_type?: string;
  max_weight_kg?: string;
  city_airport?: string;      // ← RENAMED from base_of_operations
  purpose?: string;           // ← Purpose field (maps to commonName)
  owner_name?: string;
  owner_city?: string;
  owner_province?: string;
  designator?: string;
}

// Track which fields were filled by TC
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
  editable?: boolean;
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
  editable = true,
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
        style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.hint}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={editable}
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

export default function AddAircraftScreen() {
  const router = useRouter();
  const lang = getLanguage();
  const { addAircraft } = useAircraftLocalStore();
  const [isSaving, setIsSaving] = useState(false);
  
  // TC Lookup state
  const [tcLookupStatus, setTcLookupStatus] = useState<TCLookupStatus>('idle');
  const [tcFilledFields, setTcFilledFields] = useState<TCFilledFields>(new Set());
  
  // TC Search suggestions
  const [suggestions, setSuggestions] = useState<TCSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Form state - ALL fields start EMPTY (no examples, no defaults)
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
  
  // TC Owner fields
  const [ownerName, setOwnerName] = useState('');
  const [ownerCity, setOwnerCity] = useState('');
  const [ownerProvince, setOwnerProvince] = useState('');

  // Normalize registration
  const normalizeRegistration = useCallback((text: string): string => {
    let normalized = text.toUpperCase().trim();
    if (normalized.length >= 2 && normalized.startsWith('C') && normalized[1] !== '-') {
      normalized = 'C-' + normalized.substring(1);
    }
    return normalized;
  }, []);

  // Validate Canadian registration format
  const isValidCanadianRegistration = useCallback((reg: string): boolean => {
    return /^C-[A-Z0-9]{4}$/.test(reg.toUpperCase().trim());
  }, []);

  // Debounce refs
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TC Search - get suggestions (prefix 2-4 chars only)
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
   * TC LOOKUP - CRITICAL HYDRATION
   * Fills ALL available TC fields from backend response
   * NO hardcoded values, NO fallbacks
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
        
        // HYDRATE ALL TC FIELDS - Backend is source of truth
        if (data.registration) {
          setRegistration(data.registration);
          filled.add('registration');
        }
        if (data.manufacturer) {
          setManufacturer(data.manufacturer);
          filled.add('manufacturer');
        }
        if (data.model) {
          setModel(data.model);
          filled.add('model');
        }
        if (data.serial_number) {
          setSerialNumber(data.serial_number);
          filled.add('serialNumber');
        }
        if (data.year) {
          setYearManufacture(data.year);
          filled.add('yearManufacture');
        }
        if (data.category) {
          setCategory(data.category);
          filled.add('category');
        }
        if (data.engine_type) {
          setEngineType(data.engine_type);
          filled.add('engineType');
        }
        if (data.max_weight_kg) {
          setMaxWeight(data.max_weight_kg);
          filled.add('maxWeight');
        }
        // city_airport → baseOperations (renamed field)
        if (data.city_airport) {
          setBaseOperations(data.city_airport);
          filled.add('baseOperations');
        }
        // purpose → commonName
        if (data.purpose) {
          setCommonName(data.purpose);
          filled.add('commonName');
        }
        if (data.designator) {
          setDesignator(data.designator);
          filled.add('designator');
        }
        if (data.owner_name) {
          setOwnerName(data.owner_name);
          filled.add('ownerName');
        }
        if (data.owner_city) {
          setOwnerCity(data.owner_city);
          filled.add('ownerCity');
        }
        if (data.owner_province) {
          setOwnerProvince(data.owner_province);
          filled.add('ownerProvince');
        }
        
        setTcFilledFields(filled);
        setTcLookupStatus('success');
      } else {
        setTcLookupStatus('not_found');
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setTcLookupStatus('not_found');
      } else {
        setTcLookupStatus('error');
      }
    }
  }, [tcLookupStatus, normalizeRegistration, isValidCanadianRegistration]);

  // Handle registration change
  const handleRegistrationChange = (text: string) => {
    const normalized = normalizeRegistration(text);
    setRegistration(normalized);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Reset TC status
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
    
    // Search with prefix 2-4 chars
    if (effectiveLength >= 2 && effectiveLength <= 4) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTC(normalized);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Select suggestion - triggers full TC lookup
  const handleSelectSuggestion = (suggestion: TCSuggestion) => {
    setRegistration(suggestion.registration);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    fetchFromTC(suggestion.registration);
  };

  // Manual TC lookup button
  const handleTCLookup = () => {
    const normalized = normalizeRegistration(registration);
    if (isValidCanadianRegistration(normalized)) {
      setShowSuggestions(false);
      fetchFromTC(normalized);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleSave = async () => {
    if (!registration.trim()) {
      Alert.alert('Error', lang === 'fr' ? "L'immatriculation est requise" : 'Registration is required');
      return;
    }

    setIsSaving(true);
    try {
      await addAircraft({
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
      } as any);

      router.back();
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || error.message || 'Échec de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // TC Status display
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
            <Text style={styles.tcStatusSuccessText}>
              ✓ {lang === 'fr' ? 'Données TC chargées' : 'TC data loaded'} ({tcFilledFields.size} {lang === 'fr' ? 'champs' : 'fields'})
            </Text>
          </View>
        );
      case 'not_found':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusWarning]}>
            <Text style={styles.tcStatusWarningText}>
              {lang === 'fr' ? 'Non trouvé dans le registre TC' : 'Not found in TC registry'}
            </Text>
          </View>
        );
      case 'error':
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusError]}>
            <Text style={styles.tcStatusErrorText}>
              {lang === 'fr' ? 'Erreur de recherche TC' : 'TC lookup error'}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  // Suggestion item
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
    <SafeAreaView style={styles.container}>
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backButton}>← {t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('add_aircraft')}</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* SECTION: Identity with TC Lookup */}
          <SectionHeader title={t('section_identity')} />
          <View style={styles.section}>
            {/* Registration with TC Search */}
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
                  placeholder={lang === 'fr' ? 'Ex: C-FABC' : 'e.g. C-FABC'}
                  placeholderTextColor={COLORS.hint}
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
                  <Text style={styles.tcLookupButtonText}>
                    {lang === 'fr' ? '🔍 Rechercher TC' : '🔍 Search TC'}
                  </Text>
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
              
              <Text style={styles.fieldHint}>
                {lang === 'fr' 
                  ? 'Tapez pour rechercher ou cliquez sur "Rechercher TC"' 
                  : 'Type to search or click "Search TC"'}
              </Text>
            </View>
            
            {renderTCStatus()}
            
            <FormField
              label={t('common_name')}
              value={commonName}
              onChangeText={setCommonName}
              placeholder="—"
            />
            <FormField
              label={t('model_name')}
              value={model}
              onChangeText={setModel}
              placeholder="—"
              tcFilled={tcFilledFields.has('model')}
            />
            <FormField
              label={lang === 'fr' ? 'Désignateur' : 'Designator'}
              value={designator}
              onChangeText={setDesignator}
              placeholder="—"
              tcFilled={tcFilledFields.has('designator')}
            />
            <FormField
              label={t('serial_number')}
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="—"
              tcFilled={tcFilledFields.has('serialNumber')}
            />
          </View>

          {/* SECTION: Category */}
          <SectionHeader title={t('section_category')} />
          <View style={styles.section}>
            <FormField
              label={t('category')}
              value={category}
              onChangeText={setCategory}
              placeholder="—"
              tcFilled={tcFilledFields.has('category')}
            />
            <FormField
              label={t('engine_type')}
              value={engineType}
              onChangeText={setEngineType}
              placeholder="—"
              tcFilled={tcFilledFields.has('engineType')}
            />
          </View>

          {/* SECTION: Weight & Base */}
          <SectionHeader title={t('section_weight')} />
          <View style={styles.section}>
            <FormField
              label={t('max_weight')}
              value={maxWeight}
              onChangeText={setMaxWeight}
              placeholder="—"
              tcFilled={tcFilledFields.has('maxWeight')}
            />
            <FormField
              label={t('base_operations')}
              value={baseOperations}
              onChangeText={setBaseOperations}
              placeholder="—"
              tcFilled={tcFilledFields.has('baseOperations')}
            />
          </View>

          {/* SECTION: Construction */}
          <SectionHeader title={t('section_construction')} />
          <View style={styles.section}>
            <FormField
              label={t('manufacturer')}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="—"
              tcFilled={tcFilledFields.has('manufacturer')}
            />
            <FormField
              label={t('country_manufacture')}
              value={countryManufacture}
              onChangeText={setCountryManufacture}
              placeholder="—"
            />
            <FormField
              label={t('year_manufacture')}
              value={yearManufacture}
              onChangeText={setYearManufacture}
              placeholder="—"
              keyboardType="numeric"
              tcFilled={tcFilledFields.has('yearManufacture')}
            />
          </View>

          {/* SECTION: TC Owner */}
          <SectionHeader title={lang === 'fr' ? 'Propriétaire (Registre TC)' : 'Owner (TC Registry)'} />
          <View style={styles.section}>
            <FormField
              label={lang === 'fr' ? 'Nom' : 'Name'}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="—"
              tcFilled={tcFilledFields.has('ownerName')}
            />
            <FormField
              label={lang === 'fr' ? 'Ville' : 'City'}
              value={ownerCity}
              onChangeText={setOwnerCity}
              placeholder="—"
              tcFilled={tcFilledFields.has('ownerCity')}
            />
            <FormField
              label={lang === 'fr' ? 'Province' : 'Province'}
              value={ownerProvince}
              onChangeText={setOwnerProvince}
              placeholder="—"
              tcFilled={tcFilledFields.has('ownerProvince')}
            />
          </View>

          {/* SECTION: Registration */}
          <SectionHeader title={t('section_registration')} />
          <View style={styles.section}>
            <FormField
              label={t('registration_type')}
              value={registrationType}
              onChangeText={setRegistrationType}
              placeholder="—"
            />
            <FormField
              label={t('owner_since')}
              value={ownerSince}
              onChangeText={setOwnerSince}
              placeholder="—"
            />
          </View>

          {/* SECTION: Owner Address */}
          <SectionHeader title={t('section_owner')} />
          <View style={styles.section}>
            <FormField
              label={t('address_line1')}
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="—"
            />
            <FormField
              label={t('address_line2')}
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="—"
            />
            <FormField
              label={t('city')}
              value={city}
              onChangeText={setCity}
              placeholder="—"
            />
            <FormField
              label={t('country')}
              value={country}
              onChangeText={setCountry}
              placeholder="—"
            />
          </View>

          {/* SECTION: Hours */}
          <SectionHeader title={t('section_hours')} />
          <View style={styles.section}>
            <FormField
              label={t('airframe_hours')}
              value={airframeHours}
              onChangeText={setAirframeHours}
              placeholder="—"
              keyboardType="numeric"
            />
            <FormField
              label={t('engine_hours')}
              value={engineHours}
              onChangeText={setEngineHours}
              placeholder="—"
              keyboardType="numeric"
            />
            <FormField
              label={t('propeller_hours')}
              value={propellerHours}
              onChangeText={setPropellerHours}
              placeholder="—"
              keyboardType="numeric"
            />
          </View>

          {/* TC-Safe Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerText}>{t('tc_safe_disclaimer')}</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveButtonText}>{t('save_aircraft')}</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { fontSize: 16, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textDark },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  section: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  fieldContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { fontSize: 14, color: COLORS.textMuted },
  fieldInput: { fontSize: 16, color: COLORS.textDark, paddingVertical: 4 },
  fieldInputDisabled: { color: COLORS.textMuted },
  fieldHint: { fontSize: 12, color: COLORS.hint, marginTop: 4, fontStyle: 'italic' },
  tcFilledBadge: { backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tcFilledText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  registrationRow: { flexDirection: 'row', alignItems: 'center' },
  registrationInput: { flex: 1 },
  tcLookupButton: { backgroundColor: COLORS.blue, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  tcLookupButtonDisabled: { opacity: 0.5 },
  tcLookupButtonText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.blueBorder,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionsList: { maxHeight: 200 },
  suggestionItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  suggestionMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  suggestionReg: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginRight: 8 },
  suggestionTcBadge: { backgroundColor: COLORS.tealBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  suggestionTcText: { fontSize: 10, fontWeight: '700', color: COLORS.teal },
  suggestionDetail: { fontSize: 13, color: COLORS.textMuted },
  tcStatusContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8, gap: 8 },
  tcStatusText: { fontSize: 13, color: COLORS.primary },
  tcStatusSuccess: { backgroundColor: COLORS.successBg },
  tcStatusSuccessText: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  tcStatusWarning: { backgroundColor: COLORS.orangeBg },
  tcStatusWarningText: { fontSize: 13, color: COLORS.orange },
  tcStatusError: { backgroundColor: COLORS.redBg },
  tcStatusErrorText: { fontSize: 13, color: COLORS.red },
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
  disclaimerIcon: { fontSize: 20, marginRight: 12 },
  disclaimerText: { flex: 1, fontSize: 13, color: '#5D4037', lineHeight: 18 },
  saveButton: { marginHorizontal: 16, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
});
