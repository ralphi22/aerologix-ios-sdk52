/**
 * Add Aircraft Screen - Complete form
 * TC Lookup fills ONLY: manufacturer, model, first_owner_given, first_owner_family
 */

import React, { useState, useCallback } from 'react';
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
  sectionBg: '#FAFAFA',
  hint: '#9E9E9E',
  success: '#28A745',
  successBg: '#E8F5E9',
  orange: '#FF9800',
  orangeBg: '#FFF3E0',
  red: '#E53935',
  redBg: '#FFEBEE',
  blue: '#E3F2FD',
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

export default function AddAircraftScreen() {
  const router = useRouter();
  const lang = getLanguage();
  const { addAircraft } = useAircraftLocalStore();
  const [isSaving, setIsSaving] = useState(false);
  
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
  
  // TC Lookup additional fields (First Owner) - ONLY these 4 from TC
  const [firstOwnerGiven, setFirstOwnerGiven] = useState('');
  const [firstOwnerFamily, setFirstOwnerFamily] = useState('');

  // TC Lookup - STRICT: ONLY fills manufacturer, model, first_owner_given, first_owner_family
  const fetchFromTC = useCallback(async (reg: string) => {
    if (reg.length < 5 || tcLookupStatus === 'loading') return;

    setTcLookupStatus('loading');
    try {
      const response = await api.get(`/api/tc/lookup?registration=${reg}`);
      const data = response.data;

      if (data) {
        // ONLY fill the 4 authorized fields from TC API
        if (data.manufacturer) setManufacturer(data.manufacturer);
        if (data.model) setModel(data.model);
        if (data.first_owner_given_name) setFirstOwnerGiven(data.first_owner_given_name);
        if (data.first_owner_family_name) setFirstOwnerFamily(data.first_owner_family_name);
        
        setTcLookupStatus('success');
        setTcLookupDone(true);
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setTcLookupStatus('not_found');
      } else if (error?.response?.status === 400) {
        setTcLookupStatus('invalid_format');
      } else {
        setTcLookupStatus('error');
      }
    }
  }, [tcLookupStatus]);

  // Handle registration change with auto-lookup
  const handleRegistrationChange = (text: string) => {
    const upperText = text.toUpperCase();
    setRegistration(upperText);
    
    // Reset lookup state if registration changes significantly
    if (upperText.length < 5) {
      setTcLookupStatus('idle');
      setTcLookupDone(false);
    }
    
    // Trigger TC lookup when we have enough characters
    if (upperText.length >= 5 && !tcLookupDone && tcLookupStatus !== 'loading') {
      fetchFromTC(upperText);
    }
  };

  // Manual TC lookup trigger
  const handleTCLookup = () => {
    if (registration.length >= 5) {
      setTcLookupDone(false);
      setTcLookupStatus('idle');
      fetchFromTC(registration);
    }
  };

  const handleSave = async () => {
    // Basic validation
    if (!registration.trim()) {
      Alert.alert('Error', 'Registration is required / L\'immatriculation est requise');
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
        firstOwnerGiven,
        firstOwnerFamily,
      } as any);

      router.back();
    } catch (error: any) {
      Alert.alert(
        'Erreur', 
        error.response?.data?.detail || error.message || 'Échec de la sauvegarde'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // TC Lookup status message
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
        return (
          <View style={[styles.tcStatusContainer, styles.tcStatusWarning]}>
            <Text style={styles.tcStatusWarningText}>
              {lang === 'fr' ? 'Non trouvé dans le registre TC' : 'Not found in TC registry'}
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
      default:
        return null;
    }
  };

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
                />
                <TouchableOpacity 
                  style={styles.tcLookupButton}
                  onPress={handleTCLookup}
                  disabled={registration.length < 5 || tcLookupStatus === 'loading'}
                >
                  <Text style={styles.tcLookupButtonText}>🔍 TC</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHint}>
                {lang === 'fr' 
                  ? 'Auto-remplissage depuis Transport Canada' 
                  : 'Auto-fill from Transport Canada registry'}
              </Text>
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
              placeholder="Joliette - CSG3, Québec, CANADA"
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

          {/* SECTION: Registration */}
          <SectionHeader title={t('section_registration')} />
          <View style={styles.section}>
            <FormField
              label={t('registration_type')}
              value={registrationType}
              onChangeText={setRegistrationType}
              placeholder="Private / Privé"
            />
            <FormField
              label={t('owner_since')}
              value={ownerSince}
              onChangeText={setOwnerSince}
              placeholder="2020-01-15"
            />
          </View>

          {/* SECTION: Owner Address */}
          <SectionHeader title={t('section_owner')} />
          <View style={styles.section}>
            <FormField
              label={t('address_line1')}
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="123 Aviation Street"
            />
            <FormField
              label={t('address_line2')}
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Suite 100"
            />
            <FormField
              label={t('city')}
              value={city}
              onChangeText={setCity}
              placeholder="Montreal"
            />
            <FormField
              label={t('country')}
              value={country}
              onChangeText={setCountry}
              placeholder="Canada"
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

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  // Header
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
  backButton: {
    fontSize: 16,
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
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
  // Field
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
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tcFilledText: {
    fontSize: 11,
    color: COLORS.success,
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
    backgroundColor: COLORS.successBg,
  },
  tcStatusSuccessText: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '600',
  },
  tcStatusWarning: {
    backgroundColor: COLORS.orangeBg,
  },
  tcStatusWarningText: {
    fontSize: 13,
    color: COLORS.orange,
  },
  tcStatusError: {
    backgroundColor: COLORS.redBg,
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
  // Disclaimer
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
  // Save button
  saveButton: {
    marginHorizontal: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
