/**
 * Report Settings Screen
 * Component settings and maintenance limits
 * TC-SAFE: Informational only - rules can change
 * 
 * ENDPOINT: GET/POST /api/components/aircraft/{aircraft_id}
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useReportSettings, DEFAULT_LIMITS } from '@/stores/reportSettingsStore';
import api from '@/services/api';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  textLight: '#9E9E9E',
  border: '#E0E0E0',
  yellow: '#FFF8E1',
  yellowBorder: '#FFE082',
  blue: '#E3F2FD',
  blueBorder: '#90CAF9',
  green: '#4CAF50',
  greenLight: '#E8F5E9',
  orange: '#FF9800',
};

// Placeholders informatifs
const PLACEHOLDERS = {
  engine_tbo_hours: { en: "Ex: 2000 (Typical for O-320)", fr: "Ex: 2000 (Typique pour O-320)" },
  propeller_type: { en: "Fixed / Variable", fr: "Fixe / Variable" },
  propeller_model: { en: "Ex: McCauley 1A103", fr: "Ex: McCauley 1A103" },
  avionics_certification_interval_months: { en: "Ex: 24 (Canada requirement)", fr: "Ex: 24 (Exigence Canada)" },
  magnetos_interval_hours: { en: "Ex: 500", fr: "Ex: 500" },
  vacuum_pump_interval_hours: { en: "Ex: 400", fr: "Ex: 400" },
  engine_model: { en: "Ex: O-320-E2D", fr: "Ex: O-320-E2D" },
};

// Texts bilingues
const TEXTS = {
  en: {
    title: 'Component Settings',
    subtitle: 'Aircraft Components',
    loading: 'Loading...',
    error: 'Failed to load settings',
    retry: 'Retry',
    save: 'Save',
    saved: 'Saved',
    savedMessage: 'Settings have been updated',
    saveError: 'Failed to save settings',
    notSet: 'Not set',
    reset: 'Reset to defaults',
    resetConfirm: 'Reset all values to defaults?',
    cancel: 'Cancel',
    // Sections
    engineSection: 'Engine',
    propellerSection: 'Propeller',
    avionicsSection: 'Avionics',
    limitsSection: 'Maintenance Limits',
    eltSection: 'ELT',
    // Fields
    engineModel: 'Engine Model',
    engineTbo: 'Engine TBO',
    engineLastOverhaulHours: 'Hours at Last Overhaul',
    engineLastOverhaulDate: 'Last Overhaul Date',
    propellerType: 'Propeller Type',
    propellerModel: 'Propeller Model',
    propellerInterval: 'Manufacturer Interval',
    avionicsInterval: 'Avionics Certification',
    magnetosInterval: 'Magnetos Limit',
    vacuumPumpInterval: 'Vacuum Pump Limit',
    eltTestInterval: 'ELT Test Interval',
    eltBatteryInterval: 'ELT Battery Interval',
    // Units
    hours: 'h',
    months: 'months',
    years: 'years',
    // Empty state
    emptyTitle: 'Settings Not Configured',
    emptyText: 'Configure your aircraft components for maintenance tracking. These values help track TBO, inspections and certifications.',
    configureNow: 'Configure Now',
    disclaimer: 'Informational only. Does not replace an AME nor an official record. Airworthiness decisions remain with the owner and maintenance organization.',
  },
  fr: {
    title: 'Paramètres Composants',
    subtitle: 'Composants Aéronef',
    loading: 'Chargement...',
    error: 'Échec du chargement',
    retry: 'Réessayer',
    save: 'Enregistrer',
    saved: 'Enregistré',
    savedMessage: 'Les paramètres ont été mis à jour',
    saveError: 'Échec de la sauvegarde',
    notSet: 'Non défini',
    reset: 'Réinitialiser',
    resetConfirm: 'Réinitialiser toutes les valeurs par défaut ?',
    cancel: 'Annuler',
    // Sections
    engineSection: 'Moteur',
    propellerSection: 'Hélice',
    avionicsSection: 'Avionique',
    limitsSection: 'Limites de Maintenance',
    eltSection: 'ELT',
    // Fields
    engineModel: 'Modèle Moteur',
    engineTbo: 'TBO Moteur',
    engineLastOverhaulHours: 'Heures au Dernier Overhaul',
    engineLastOverhaulDate: 'Date Dernier Overhaul',
    propellerType: 'Type Hélice',
    propellerModel: 'Modèle Hélice',
    propellerInterval: 'Intervalle Fabricant',
    avionicsInterval: 'Certification Avionique',
    magnetosInterval: 'Limite Magnétos',
    vacuumPumpInterval: 'Limite Pompe à Vide',
    eltTestInterval: 'Intervalle Test ELT',
    eltBatteryInterval: 'Intervalle Batterie ELT',
    // Units
    hours: 'h',
    months: 'mois',
    years: 'ans',
    // Empty state
    emptyTitle: 'Paramètres Non Configurés',
    emptyText: 'Configurez les composants de votre aéronef pour le suivi de maintenance. Ces valeurs permettent de suivre le TBO, les inspections et certifications.',
    configureNow: 'Configurer',
    disclaimer: 'Informatif seulement. Ne remplace pas un TEA ni un document officiel. Les décisions de navigabilité appartiennent au propriétaire et à l\'organisme de maintenance.',
  },
};

// Helper: Display value or placeholder
const displayValue = (value: any, placeholder: string = '--') => {
  if (value === null || value === undefined || value === '') {
    return placeholder;
  }
  return String(value);
};

// Setting Field Component
interface SettingFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  unit?: string;
}

function SettingField({ label, value, onChangeText, placeholder, keyboardType = 'default', unit }: SettingFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          keyboardType={keyboardType}
        />
        {unit && <Text style={styles.fieldUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

// Section Header Component
function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        {icon && <Text style={styles.sectionIcon}>{icon}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );
}

export default function ReportSettingsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];
  const placeholders = PLACEHOLDERS;
  
  // Local store for fallback
  const { settings: localSettings, limits, updateSettings: updateLocalSettings, updateLimits, resetLimitsToDefault } = useReportSettings();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state - Component settings from backend
  const [engineModel, setEngineModel] = useState('');
  const [engineTboHours, setEngineTboHours] = useState('');
  const [engineLastOverhaulHours, setEngineLastOverhaulHours] = useState('');
  const [engineLastOverhaulDate, setEngineLastOverhaulDate] = useState('');
  const [propellerType, setPropellerType] = useState('');
  const [propellerModel, setPropellerModel] = useState('');
  const [propellerManufacturerIntervalYears, setPropellerManufacturerIntervalYears] = useState('');
  const [avionicsCertificationIntervalMonths, setAvionicsCertificationIntervalMonths] = useState('');
  const [magnetosIntervalHours, setMagnetosIntervalHours] = useState('');
  const [vacuumPumpIntervalHours, setVacuumPumpIntervalHours] = useState('');
  const [eltTestIntervalMonths, setEltTestIntervalMonths] = useState('');
  const [eltBatteryIntervalMonths, setEltBatteryIntervalMonths] = useState('');

  // Fetch settings from backend
  const fetchSettings = useCallback(async () => {
    if (!aircraftId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/components/aircraft/${aircraftId}`);
      const data = response.data;
      console.log('[Report Settings] Fetched:', data);
      
      // Populate form with backend values (handling nulls)
      setEngineModel(data.engine_model || '');
      setEngineTboHours(data.engine_tbo_hours != null ? String(data.engine_tbo_hours) : '');
      setEngineLastOverhaulHours(data.engine_last_overhaul_hours != null ? String(data.engine_last_overhaul_hours) : '');
      setEngineLastOverhaulDate(data.engine_last_overhaul_date || '');
      setPropellerType(data.propeller_type || '');
      setPropellerModel(data.propeller_model || '');
      setPropellerManufacturerIntervalYears(data.propeller_manufacturer_interval_years != null ? String(data.propeller_manufacturer_interval_years) : '');
      setAvionicsCertificationIntervalMonths(data.avionics_certification_interval_months != null ? String(data.avionics_certification_interval_months) : '');
      setMagnetosIntervalHours(data.magnetos_interval_hours != null ? String(data.magnetos_interval_hours) : '');
      setVacuumPumpIntervalHours(data.vacuum_pump_interval_hours != null ? String(data.vacuum_pump_interval_hours) : '');
      setEltTestIntervalMonths(data.elt_test_interval_months != null ? String(data.elt_test_interval_months) : '');
      setEltBatteryIntervalMonths(data.elt_battery_interval_months != null ? String(data.elt_battery_interval_months) : '');
      
    } catch (err: any) {
      console.error('[Report Settings] Fetch error:', err);
      if (err?.response?.status === 404) {
        // New account - no settings yet
        setError(null);
      } else {
        setError(err?.message || texts.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [aircraftId, texts.error]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Check if all settings are empty
  const isSettingsEmpty = !engineModel && !engineTboHours && !propellerType && !propellerModel && 
    !avionicsCertificationIntervalMonths && !magnetosIntervalHours && !vacuumPumpIntervalHours;

  // Save settings to backend
  const handleSave = async () => {
    if (!aircraftId) return;
    
    setIsSaving(true);
    
    try {
      const payload = {
        engine_model: engineModel || null,
        engine_tbo_hours: engineTboHours ? parseFloat(engineTboHours) : null,
        engine_last_overhaul_hours: engineLastOverhaulHours ? parseFloat(engineLastOverhaulHours) : null,
        engine_last_overhaul_date: engineLastOverhaulDate || null,
        propeller_type: propellerType || null,
        propeller_model: propellerModel || null,
        propeller_manufacturer_interval_years: propellerManufacturerIntervalYears ? parseInt(propellerManufacturerIntervalYears) : null,
        avionics_certification_interval_months: avionicsCertificationIntervalMonths ? parseInt(avionicsCertificationIntervalMonths) : null,
        magnetos_interval_hours: magnetosIntervalHours ? parseInt(magnetosIntervalHours) : null,
        vacuum_pump_interval_hours: vacuumPumpIntervalHours ? parseInt(vacuumPumpIntervalHours) : null,
        elt_test_interval_months: eltTestIntervalMonths ? parseInt(eltTestIntervalMonths) : null,
        elt_battery_interval_months: eltBatteryIntervalMonths ? parseInt(eltBatteryIntervalMonths) : null,
      };
      
      console.log('[Report Settings] Saving:', payload);
      await api.post(`/api/components/aircraft/${aircraftId}`, payload);
      
      setIsEditing(false);
      Alert.alert(texts.saved, texts.savedMessage);
      
    } catch (err: any) {
      console.error('[Report Settings] Save error:', err);
      Alert.alert(texts.error, texts.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Text style={styles.headerBackText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{texts.title}</Text>
            <Text style={styles.headerSubtitle}>{registration || texts.subtitle}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.centerText}>{texts.loading}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{texts.title}</Text>
          <Text style={styles.headerSubtitle}>{registration || texts.subtitle}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Empty State Card */}
        {isSettingsEmpty && !isEditing && (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyIcon}>⚙️</Text>
            <Text style={styles.emptyTitle}>{texts.emptyTitle}</Text>
            <Text style={styles.emptyText}>{texts.emptyText}</Text>
            <TouchableOpacity style={styles.configureButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.configureButtonText}>{texts.configureNow}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === ENGINE SECTION === */}
        <SectionHeader title={texts.engineSection} icon="🔧" />
        <View style={styles.section}>
          <SettingField
            label={texts.engineModel}
            value={engineModel}
            onChangeText={setEngineModel}
            placeholder={placeholders.engine_model[lang]}
          />
          <SettingField
            label={texts.engineTbo}
            value={engineTboHours}
            onChangeText={setEngineTboHours}
            placeholder={placeholders.engine_tbo_hours[lang]}
            keyboardType="numeric"
            unit={texts.hours}
          />
          <SettingField
            label={texts.engineLastOverhaulHours}
            value={engineLastOverhaulHours}
            onChangeText={setEngineLastOverhaulHours}
            placeholder="0"
            keyboardType="numeric"
            unit={texts.hours}
          />
          <SettingField
            label={texts.engineLastOverhaulDate}
            value={engineLastOverhaulDate}
            onChangeText={setEngineLastOverhaulDate}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* === PROPELLER SECTION === */}
        <SectionHeader title={texts.propellerSection} icon="🌀" />
        <View style={styles.section}>
          <SettingField
            label={texts.propellerType}
            value={propellerType}
            onChangeText={setPropellerType}
            placeholder={placeholders.propeller_type[lang]}
          />
          <SettingField
            label={texts.propellerModel}
            value={propellerModel}
            onChangeText={setPropellerModel}
            placeholder={placeholders.propeller_model[lang]}
          />
          <SettingField
            label={texts.propellerInterval}
            value={propellerManufacturerIntervalYears}
            onChangeText={setPropellerManufacturerIntervalYears}
            placeholder="5"
            keyboardType="numeric"
            unit={texts.years}
          />
        </View>

        {/* === LIMITS SECTION === */}
        <SectionHeader title={texts.limitsSection} icon="⏱️" />
        <View style={styles.section}>
          <SettingField
            label={texts.avionicsInterval}
            value={avionicsCertificationIntervalMonths}
            onChangeText={setAvionicsCertificationIntervalMonths}
            placeholder={placeholders.avionics_certification_interval_months[lang]}
            keyboardType="numeric"
            unit={texts.months}
          />
          <SettingField
            label={texts.magnetosInterval}
            value={magnetosIntervalHours}
            onChangeText={setMagnetosIntervalHours}
            placeholder={placeholders.magnetos_interval_hours[lang]}
            keyboardType="numeric"
            unit={texts.hours}
          />
          <SettingField
            label={texts.vacuumPumpInterval}
            value={vacuumPumpIntervalHours}
            onChangeText={setVacuumPumpIntervalHours}
            placeholder={placeholders.vacuum_pump_interval_hours[lang]}
            keyboardType="numeric"
            unit={texts.hours}
          />
        </View>

        {/* === ELT SECTION === */}
        <SectionHeader title={texts.eltSection} icon="📡" />
        <View style={styles.section}>
          <SettingField
            label={texts.eltTestInterval}
            value={eltTestIntervalMonths}
            onChangeText={setEltTestIntervalMonths}
            placeholder="12"
            keyboardType="numeric"
            unit={texts.months}
          />
          <SettingField
            label={texts.eltBatteryInterval}
            value={eltBatteryIntervalMonths}
            onChangeText={setEltBatteryIntervalMonths}
            placeholder="24"
            keyboardType="numeric"
            unit={texts.months}
          />
        </View>

        {/* TC-Safe Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>{texts.disclaimer}</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>{texts.save}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
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
  
  scrollView: { flex: 1 },
  
  // Center state
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  centerText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted },
  
  // Empty state card
  emptyStateCard: {
    margin: 16,
    padding: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textDark, textAlign: 'center', marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  configureButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  configureButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  
  // Section
  sectionHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  section: {
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  
  // Setting Field
  fieldContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fieldLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: 6 },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldInput: {
    flex: 1, fontSize: 16, color: COLORS.textDark, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.background, borderRadius: 8,
  },
  fieldUnit: { fontSize: 14, color: COLORS.textMuted, marginLeft: 8, minWidth: 50 },
  
  // Disclaimer
  disclaimer: {
    flexDirection: 'row', margin: 16, padding: 16, backgroundColor: COLORS.yellow,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder,
  },
  disclaimerIcon: { fontSize: 16, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18 },
  
  // Save button
  saveButton: {
    marginHorizontal: 16, backgroundColor: COLORS.green, paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
});
