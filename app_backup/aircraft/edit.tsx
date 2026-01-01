/**
 * Edit Aircraft Screen
 * Reuses add form in edit mode
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { t, getLanguage } from '@/i18n';
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  border: '#E0E0E0',
  hint: '#9E9E9E',
};

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'numeric' | 'email-address';
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
}: FormFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
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
    }
  }, [aircraft]);

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
    });

    router.back();
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
          {/* SECTION: Identity */}
          <SectionHeader title={t('section_identity')} />
          <View style={styles.section}>
            <FormField
              label={t('registration')}
              value={registration}
              onChangeText={(text) => setRegistration(text.toUpperCase())}
              placeholder="C-FABC"
              autoCapitalize="characters"
            />
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
  fieldLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 6,
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
    backgroundColor: COLORS.primary,
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
