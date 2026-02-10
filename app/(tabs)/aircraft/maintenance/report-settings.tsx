/**
 * Report Settings Screen - Component Settings & Maintenance Limits
 * TC-SAFE: Informational only - rules can change
 * 
 * ENDPOINTS:
 * - GET /api/components/aircraft/{aircraft_id}
 * - POST /api/components/aircraft/{aircraft_id}
 * 
 * DEFAULT VALUES (Industry Standards):
 * - engine_tbo_hours: 2000.0
 * - propeller_type: "fixed"
 * - avionics_certification_interval_months: 24 (Canada)
 * - magnetos_interval_hours: 500.0
 * - vacuum_pump_interval_hours: 400.0
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
  orangeLight: '#FFF3E0',
};

// ============================================
// DEFAULT VALUES - Industry Standards
// ============================================
const DEFAULT_VALUES = {
  engine_tbo_hours: 2000.0,
  propeller_type: 'fixed',
  avionics_certification_interval_months: 24,
  magnetos_interval_hours: 500.0,
  vacuum_pump_interval_hours: 400.0,
};

// Texts bilingues
const TEXTS = {
  en: {
    title: 'Component Settings',
    subtitle: 'Maintenance Limits',
    loading: 'Loading...',
    error: 'Failed to load settings',
    retry: 'Retry',
    save: 'Save',
    edit: 'Edit',
    cancel: 'Cancel',
    saved: 'Saved',
    savedMessage: 'Settings have been updated',
    saveError: 'Failed to save settings',
    resetDefaults: '🔄 Reset to Industry Defaults',
    resetConfirm: 'Reset all values to industry defaults?',
    defaultBadge: 'Default',
    notSet: 'Not set',
    // Sections
    engineSection: 'Engine',
    propellerSection: 'Propeller',
    avionicsSection: 'Avionics',
    limitsSection: 'Maintenance Limits',
    // Fields
    engineModel: 'Engine Model',
    engineTbo: 'Engine TBO',
    engineLastOverhaulHours: 'Hours at Last Overhaul',
    engineLastOverhaulDate: 'Last Overhaul Date',
    propellerType: 'Propeller Type',
    propellerModel: 'Propeller Model',
    propellerInterval: 'Manufacturer Interval',
    propellerLastInspectionHours: 'Last Inspection Hours',
    propellerLastInspectionDate: 'Last Inspection Date',
    avionicsLastCertDate: 'Last Certification Date',
    avionicsInterval: 'Certification Interval',
    magnetosModel: 'Magnetos Model',
    magnetosInterval: 'Magnetos Interval',
    magnetosLastHours: 'Last Inspection Hours',
    magnetosLastDate: 'Last Inspection Date',
    vacuumPumpModel: 'Vacuum Pump Model',
    vacuumPumpInterval: 'Vacuum Pump Interval',
    vacuumPumpLastHours: 'Last Replacement Hours',
    vacuumPumpLastDate: 'Last Replacement Date',
    airframeLastAnnualDate: 'Last Annual Date',
    airframeLastAnnualHours: 'Last Annual Hours',
    // Units
    hours: 'h',
    months: 'months',
    years: 'years',
    // Placeholders
    placeholderDefault: 'Default:',
    disclaimer: 'Informational only. Does not replace an AME nor an official record. Airworthiness decisions remain with the owner and maintenance organization.',
  },
  fr: {
    title: 'Paramètres Composants',
    subtitle: 'Limites de Maintenance',
    loading: 'Chargement...',
    error: 'Échec du chargement',
    retry: 'Réessayer',
    save: 'Enregistrer',
    edit: 'Modifier',
    cancel: 'Annuler',
    saved: 'Enregistré',
    savedMessage: 'Les paramètres ont été mis à jour',
    saveError: 'Échec de la sauvegarde',
    resetDefaults: '🔄 Réinitialiser aux valeurs standards',
    resetConfirm: 'Réinitialiser toutes les valeurs aux standards de l\'industrie?',
    defaultBadge: 'Défaut',
    notSet: 'Non défini',
    // Sections
    engineSection: 'Moteur',
    propellerSection: 'Hélice',
    avionicsSection: 'Avionique',
    limitsSection: 'Limites de Maintenance',
    // Fields
    engineModel: 'Modèle Moteur',
    engineTbo: 'TBO Moteur',
    engineLastOverhaulHours: 'Heures au Dernier Overhaul',
    engineLastOverhaulDate: 'Date Dernier Overhaul',
    propellerType: 'Type Hélice',
    propellerModel: 'Modèle Hélice',
    propellerInterval: 'Intervalle Fabricant',
    propellerLastInspectionHours: 'Heures Dernière Inspection',
    propellerLastInspectionDate: 'Date Dernière Inspection',
    avionicsLastCertDate: 'Date Dernière Certification',
    avionicsInterval: 'Intervalle Certification',
    magnetosModel: 'Modèle Magnétos',
    magnetosInterval: 'Intervalle Magnétos',
    magnetosLastHours: 'Heures Dernière Inspection',
    magnetosLastDate: 'Date Dernière Inspection',
    vacuumPumpModel: 'Modèle Pompe à Vide',
    vacuumPumpInterval: 'Intervalle Pompe à Vide',
    vacuumPumpLastHours: 'Heures Dernier Remplacement',
    vacuumPumpLastDate: 'Date Dernier Remplacement',
    airframeLastAnnualDate: 'Date Dernière Annuelle',
    airframeLastAnnualHours: 'Heures Dernière Annuelle',
    // Units
    hours: 'h',
    months: 'mois',
    years: 'ans',
    // Placeholders
    placeholderDefault: 'Défaut:',
    disclaimer: 'Informatif seulement. Ne remplace pas un TEA ni un document officiel. Les décisions de navigabilité appartiennent au propriétaire et à l\'organisme de maintenance.',
  },
};

// ============================================
// API Response Interface
// ============================================
interface ComponentSettings {
  aircraft_id: string;
  engine_model: string | null;
  engine_tbo_hours: number;
  engine_last_overhaul_hours: number | null;
  engine_last_overhaul_date: string | null;
  propeller_type: string;
  propeller_model: string | null;
  propeller_manufacturer_interval_years: number | null;
  propeller_last_inspection_hours: number | null;
  propeller_last_inspection_date: string | null;
  avionics_last_certification_date: string | null;
  avionics_certification_interval_months: number;
  magnetos_model: string | null;
  magnetos_interval_hours: number;
  magnetos_last_inspection_hours: number | null;
  magnetos_last_inspection_date: string | null;
  vacuum_pump_model: string | null;
  vacuum_pump_interval_hours: number;
  vacuum_pump_last_replacement_hours: number | null;
  vacuum_pump_last_replacement_date: string | null;
  airframe_last_annual_date: string | null;
  airframe_last_annual_hours: number | null;
}

// ============================================
// Helper: Check if value is default
// ============================================
const isDefaultValue = (field: string, value: any): boolean => {
  const defaults: { [key: string]: any } = DEFAULT_VALUES;
  return defaults[field] === value;
};

// ============================================
// Section Header Component
// ============================================
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

// ============================================
// Display Field Component (Read-only)
// ============================================
interface DisplayFieldProps {
  label: string;
  value: any;
  unit?: string;
  fieldKey?: string;
  isNull?: boolean;
  texts: typeof TEXTS.en;
}

function DisplayField({ label, value, unit, fieldKey, isNull, texts }: DisplayFieldProps) {
  const showDefault = fieldKey && isDefaultValue(fieldKey, value);
  const displayValue = isNull || value === null || value === undefined 
    ? texts.notSet 
    : `${value}${unit ? ` ${unit}` : ''}`;
  
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.fieldValue, isNull && styles.fieldValueNull]}>
          {displayValue}
        </Text>
        {showDefault && !isNull && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>{texts.defaultBadge}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================
// Edit Field Component
// ============================================
interface EditFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  unit?: string;
}

function EditField({ label, value, onChangeText, placeholder, keyboardType = 'default', unit }: EditFieldProps) {
  return (
    <View style={styles.editFieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.editInputRow}>
        <TextInput
          style={styles.editInput}
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

// ============================================
// Propeller Type Picker
// ============================================
function PropellerTypePicker({ value, onChange, lang }: { value: string; onChange: (v: string) => void; lang: 'en' | 'fr' }) {
  const options = [
    { value: 'fixed', label: lang === 'fr' ? 'Fixe' : 'Fixed' },
    { value: 'variable', label: 'Variable' },
  ];
  
  return (
    <View style={styles.pickerContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.pickerOption, value === option.value && styles.pickerOptionSelected]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[styles.pickerOptionText, value === option.value && styles.pickerOptionTextSelected]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================
// Main Component
// ============================================
export default function ReportSettingsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<ComponentSettings | null>(null);
  
  // Edit form state
  const [formData, setFormData] = useState({
    engine_model: '',
    engine_tbo_hours: '',
    engine_last_overhaul_hours: '',
    engine_last_overhaul_date: '',
    propeller_type: 'fixed',
    propeller_model: '',
    propeller_manufacturer_interval_years: '',
    propeller_last_inspection_hours: '',
    propeller_last_inspection_date: '',
    avionics_last_certification_date: '',
    avionics_certification_interval_months: '',
    magnetos_model: '',
    magnetos_interval_hours: '',
    magnetos_last_inspection_hours: '',
    magnetos_last_inspection_date: '',
    vacuum_pump_model: '',
    vacuum_pump_interval_hours: '',
    vacuum_pump_last_replacement_hours: '',
    vacuum_pump_last_replacement_date: '',
    airframe_last_annual_date: '',
    airframe_last_annual_hours: '',
  });

  // ============================================
  // Fetch settings from backend
  // ============================================
  const fetchSettings = useCallback(async () => {
    if (!aircraftId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/components/aircraft/${aircraftId}`);
      const apiData = response.data as ComponentSettings;
      console.log('[Report Settings] Fetched:', apiData);
      
      setData(apiData);
      
      // Populate form with API values
      setFormData({
        engine_model: apiData.engine_model || '',
        engine_tbo_hours: apiData.engine_tbo_hours?.toString() || '',
        engine_last_overhaul_hours: apiData.engine_last_overhaul_hours?.toString() || '',
        engine_last_overhaul_date: apiData.engine_last_overhaul_date || '',
        propeller_type: apiData.propeller_type || 'fixed',
        propeller_model: apiData.propeller_model || '',
        propeller_manufacturer_interval_years: apiData.propeller_manufacturer_interval_years?.toString() || '',
        propeller_last_inspection_hours: apiData.propeller_last_inspection_hours?.toString() || '',
        propeller_last_inspection_date: apiData.propeller_last_inspection_date || '',
        avionics_last_certification_date: apiData.avionics_last_certification_date || '',
        avionics_certification_interval_months: apiData.avionics_certification_interval_months?.toString() || '',
        magnetos_model: apiData.magnetos_model || '',
        magnetos_interval_hours: apiData.magnetos_interval_hours?.toString() || '',
        magnetos_last_inspection_hours: apiData.magnetos_last_inspection_hours?.toString() || '',
        magnetos_last_inspection_date: apiData.magnetos_last_inspection_date || '',
        vacuum_pump_model: apiData.vacuum_pump_model || '',
        vacuum_pump_interval_hours: apiData.vacuum_pump_interval_hours?.toString() || '',
        vacuum_pump_last_replacement_hours: apiData.vacuum_pump_last_replacement_hours?.toString() || '',
        vacuum_pump_last_replacement_date: apiData.vacuum_pump_last_replacement_date || '',
        airframe_last_annual_date: apiData.airframe_last_annual_date || '',
        airframe_last_annual_hours: apiData.airframe_last_annual_hours?.toString() || '',
      });
      
    } catch (err: any) {
      console.error('[Report Settings] Fetch error:', err);
      setError(err?.message || texts.error);
    } finally {
      setIsLoading(false);
    }
  }, [aircraftId, texts.error]);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ============================================
  // Reset to Industry Defaults
  // ============================================
  const handleResetDefaults = () => {
    Alert.alert(
      texts.resetDefaults,
      texts.resetConfirm,
      [
        { text: texts.cancel, style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              engine_tbo_hours: DEFAULT_VALUES.engine_tbo_hours.toString(),
              propeller_type: DEFAULT_VALUES.propeller_type,
              avionics_certification_interval_months: DEFAULT_VALUES.avionics_certification_interval_months.toString(),
              magnetos_interval_hours: DEFAULT_VALUES.magnetos_interval_hours.toString(),
              vacuum_pump_interval_hours: DEFAULT_VALUES.vacuum_pump_interval_hours.toString(),
            }));
          },
        },
      ]
    );
  };

  // ============================================
  // Save settings to backend
  // ============================================
  const handleSave = async () => {
    if (!aircraftId) return;
    
    setIsSaving(true);
    
    try {
      const payload = {
        engine_model: formData.engine_model || null,
        engine_tbo_hours: formData.engine_tbo_hours ? parseFloat(formData.engine_tbo_hours) : DEFAULT_VALUES.engine_tbo_hours,
        engine_last_overhaul_hours: formData.engine_last_overhaul_hours ? parseFloat(formData.engine_last_overhaul_hours) : null,
        engine_last_overhaul_date: formData.engine_last_overhaul_date || null,
        propeller_type: formData.propeller_type || DEFAULT_VALUES.propeller_type,
        propeller_model: formData.propeller_model || null,
        propeller_manufacturer_interval_years: formData.propeller_manufacturer_interval_years ? parseInt(formData.propeller_manufacturer_interval_years) : null,
        propeller_last_inspection_hours: formData.propeller_last_inspection_hours ? parseFloat(formData.propeller_last_inspection_hours) : null,
        propeller_last_inspection_date: formData.propeller_last_inspection_date || null,
        avionics_last_certification_date: formData.avionics_last_certification_date || null,
        avionics_certification_interval_months: formData.avionics_certification_interval_months ? parseInt(formData.avionics_certification_interval_months) : DEFAULT_VALUES.avionics_certification_interval_months,
        magnetos_model: formData.magnetos_model || null,
        magnetos_interval_hours: formData.magnetos_interval_hours ? parseFloat(formData.magnetos_interval_hours) : DEFAULT_VALUES.magnetos_interval_hours,
        magnetos_last_inspection_hours: formData.magnetos_last_inspection_hours ? parseFloat(formData.magnetos_last_inspection_hours) : null,
        magnetos_last_inspection_date: formData.magnetos_last_inspection_date || null,
        vacuum_pump_model: formData.vacuum_pump_model || null,
        vacuum_pump_interval_hours: formData.vacuum_pump_interval_hours ? parseFloat(formData.vacuum_pump_interval_hours) : DEFAULT_VALUES.vacuum_pump_interval_hours,
        vacuum_pump_last_replacement_hours: formData.vacuum_pump_last_replacement_hours ? parseFloat(formData.vacuum_pump_last_replacement_hours) : null,
        vacuum_pump_last_replacement_date: formData.vacuum_pump_last_replacement_date || null,
        airframe_last_annual_date: formData.airframe_last_annual_date || null,
        airframe_last_annual_hours: formData.airframe_last_annual_hours ? parseFloat(formData.airframe_last_annual_hours) : null,
      };
      
      console.log('[Report Settings] Saving:', payload);
      await api.post(`/api/components/aircraft/${aircraftId}`, payload);
      
      setIsEditing(false);
      Alert.alert(texts.saved, texts.savedMessage);
      fetchSettings(); // Refresh data
      
    } catch (err: any) {
      console.error('[Report Settings] Save error:', err);
      Alert.alert(texts.error, texts.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // Loading State
  // ============================================
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

  // ============================================
  // Error State
  // ============================================
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Text style={styles.headerBackText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{texts.title}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSettings}>
            <Text style={styles.retryButtonText}>{texts.retry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================
  // Main Render - Display Mode
  // ============================================
  if (!isEditing && data) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Text style={styles.headerBackText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{texts.title}</Text>
            <Text style={styles.headerSubtitle}>{registration || texts.subtitle}</Text>
          </View>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerEditButton}>
            <Text style={styles.headerEditText}>{texts.edit}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Engine Section */}
          <SectionHeader title={texts.engineSection} icon="🔧" />
          <View style={styles.section}>
            <DisplayField label={texts.engineModel} value={data.engine_model} isNull={!data.engine_model} texts={texts} />
            <DisplayField label={texts.engineTbo} value={data.engine_tbo_hours} unit={texts.hours} fieldKey="engine_tbo_hours" texts={texts} />
            <DisplayField label={texts.engineLastOverhaulHours} value={data.engine_last_overhaul_hours} unit={texts.hours} isNull={data.engine_last_overhaul_hours === null} texts={texts} />
            <DisplayField label={texts.engineLastOverhaulDate} value={data.engine_last_overhaul_date} isNull={!data.engine_last_overhaul_date} texts={texts} />
          </View>

          {/* Propeller Section */}
          <SectionHeader title={texts.propellerSection} icon="🌀" />
          <View style={styles.section}>
            <DisplayField label={texts.propellerType} value={data.propeller_type === 'fixed' ? (lang === 'fr' ? 'Fixe' : 'Fixed') : 'Variable'} fieldKey="propeller_type" texts={texts} />
            <DisplayField label={texts.propellerModel} value={data.propeller_model} isNull={!data.propeller_model} texts={texts} />
            <DisplayField label={texts.propellerInterval} value={data.propeller_manufacturer_interval_years} unit={texts.years} isNull={data.propeller_manufacturer_interval_years === null} texts={texts} />
            <DisplayField label={texts.propellerLastInspectionHours} value={data.propeller_last_inspection_hours} unit={texts.hours} isNull={data.propeller_last_inspection_hours === null} texts={texts} />
            <DisplayField label={texts.propellerLastInspectionDate} value={data.propeller_last_inspection_date} isNull={!data.propeller_last_inspection_date} texts={texts} />
          </View>

          {/* Avionics Section */}
          <SectionHeader title={texts.avionicsSection} icon="📡" />
          <View style={styles.section}>
            <DisplayField label={texts.avionicsLastCertDate} value={data.avionics_last_certification_date} isNull={!data.avionics_last_certification_date} texts={texts} />
            <DisplayField label={texts.avionicsInterval} value={data.avionics_certification_interval_months} unit={texts.months} fieldKey="avionics_certification_interval_months" texts={texts} />
          </View>

          {/* Maintenance Limits Section */}
          <SectionHeader title={texts.limitsSection} icon="⏱️" />
          <View style={styles.section}>
            <DisplayField label={texts.magnetosModel} value={data.magnetos_model} isNull={!data.magnetos_model} texts={texts} />
            <DisplayField label={texts.magnetosInterval} value={data.magnetos_interval_hours} unit={texts.hours} fieldKey="magnetos_interval_hours" texts={texts} />
            <DisplayField label={texts.magnetosLastHours} value={data.magnetos_last_inspection_hours} unit={texts.hours} isNull={data.magnetos_last_inspection_hours === null} texts={texts} />
            <DisplayField label={texts.magnetosLastDate} value={data.magnetos_last_inspection_date} isNull={!data.magnetos_last_inspection_date} texts={texts} />
            <View style={styles.separator} />
            <DisplayField label={texts.vacuumPumpModel} value={data.vacuum_pump_model} isNull={!data.vacuum_pump_model} texts={texts} />
            <DisplayField label={texts.vacuumPumpInterval} value={data.vacuum_pump_interval_hours} unit={texts.hours} fieldKey="vacuum_pump_interval_hours" texts={texts} />
            <DisplayField label={texts.vacuumPumpLastHours} value={data.vacuum_pump_last_replacement_hours} unit={texts.hours} isNull={data.vacuum_pump_last_replacement_hours === null} texts={texts} />
            <DisplayField label={texts.vacuumPumpLastDate} value={data.vacuum_pump_last_replacement_date} isNull={!data.vacuum_pump_last_replacement_date} texts={texts} />
            <View style={styles.separator} />
            <DisplayField label={texts.airframeLastAnnualDate} value={data.airframe_last_annual_date} isNull={!data.airframe_last_annual_date} texts={texts} />
            <DisplayField label={texts.airframeLastAnnualHours} value={data.airframe_last_annual_hours} unit={texts.hours} isNull={data.airframe_last_annual_hours === null} texts={texts} />
          </View>

          {/* TC-Safe Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerText}>{texts.disclaimer}</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ============================================
  // Edit Mode
  // ============================================
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.headerBack}>
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
        {/* Reset Defaults Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleResetDefaults}>
          <Text style={styles.resetButtonText}>{texts.resetDefaults}</Text>
        </TouchableOpacity>

        {/* Engine Section */}
        <SectionHeader title={texts.engineSection} icon="🔧" />
        <View style={styles.section}>
          <EditField label={texts.engineModel} value={formData.engine_model} onChangeText={(v) => setFormData(p => ({...p, engine_model: v}))} placeholder="Ex: O-320-E2D" />
          <EditField label={texts.engineTbo} value={formData.engine_tbo_hours} onChangeText={(v) => setFormData(p => ({...p, engine_tbo_hours: v}))} placeholder={`${texts.placeholderDefault} 2000`} keyboardType="numeric" unit={texts.hours} />
          <EditField label={texts.engineLastOverhaulHours} value={formData.engine_last_overhaul_hours} onChangeText={(v) => setFormData(p => ({...p, engine_last_overhaul_hours: v}))} placeholder="0" keyboardType="numeric" unit={texts.hours} />
          <EditField label={texts.engineLastOverhaulDate} value={formData.engine_last_overhaul_date} onChangeText={(v) => setFormData(p => ({...p, engine_last_overhaul_date: v}))} placeholder="YYYY-MM-DD" />
        </View>

        {/* Propeller Section */}
        <SectionHeader title={texts.propellerSection} icon="🌀" />
        <View style={styles.section}>
          <View style={styles.editFieldContainer}>
            <Text style={styles.fieldLabel}>{texts.propellerType}</Text>
            <PropellerTypePicker value={formData.propeller_type} onChange={(v) => setFormData(p => ({...p, propeller_type: v}))} lang={lang} />
          </View>
          <EditField label={texts.propellerModel} value={formData.propeller_model} onChangeText={(v) => setFormData(p => ({...p, propeller_model: v}))} placeholder="Ex: McCauley 1A103" />
          <EditField label={texts.propellerInterval} value={formData.propeller_manufacturer_interval_years} onChangeText={(v) => setFormData(p => ({...p, propeller_manufacturer_interval_years: v}))} placeholder="5" keyboardType="numeric" unit={texts.years} />
          <EditField label={texts.propellerLastInspectionHours} value={formData.propeller_last_inspection_hours} onChangeText={(v) => setFormData(p => ({...p, propeller_last_inspection_hours: v}))} placeholder="0" keyboardType="numeric" unit={texts.hours} />
          <EditField label={texts.propellerLastInspectionDate} value={formData.propeller_last_inspection_date} onChangeText={(v) => setFormData(p => ({...p, propeller_last_inspection_date: v}))} placeholder="YYYY-MM-DD" />
        </View>

        {/* Avionics Section */}
        <SectionHeader title={texts.avionicsSection} icon="📡" />
        <View style={styles.section}>
          <EditField label={texts.avionicsLastCertDate} value={formData.avionics_last_certification_date} onChangeText={(v) => setFormData(p => ({...p, avionics_last_certification_date: v}))} placeholder="YYYY-MM-DD" />
          <EditField label={texts.avionicsInterval} value={formData.avionics_certification_interval_months} onChangeText={(v) => setFormData(p => ({...p, avionics_certification_interval_months: v}))} placeholder={`${texts.placeholderDefault} 24 (Canada)`} keyboardType="numeric" unit={texts.months} />
        </View>

        {/* Maintenance Limits Section */}
        <SectionHeader title={texts.limitsSection} icon="⏱️" />
        <View style={styles.section}>
          <EditField label={texts.magnetosModel} value={formData.magnetos_model} onChangeText={(v) => setFormData(p => ({...p, magnetos_model: v}))} placeholder="Ex: Bendix S4RN-21" />
          <EditField label={texts.magnetosInterval} value={formData.magnetos_interval_hours} onChangeText={(v) => setFormData(p => ({...p, magnetos_interval_hours: v}))} placeholder={`${texts.placeholderDefault} 500`} keyboardType="numeric" unit={texts.hours} />
          <EditField label={texts.magnetosLastHours} value={formData.magnetos_last_inspection_hours} onChangeText={(v) => setFormData(p => ({...p, magnetos_last_inspection_hours: v}))} placeholder="0" keyboardType="numeric" unit={texts.hours} />
          <EditField label={texts.magnetosLastDate} value={formData.magnetos_last_inspection_date} onChangeText={(v) => setFormData(p => ({...p, magnetos_last_inspection_date: v}))} placeholder="YYYY-MM-DD" />
          <View style={styles.separator} />
          <EditField label={texts.vacuumPumpModel} value={formData.vacuum_pump_model} onChangeText={(v) => setFormData(p => ({...p, vacuum_pump_model: v}))} placeholder="Ex: Rapco RA215CC" />
          <EditField label={texts.vacuumPumpInterval} value={formData.vacuum_pump_interval_hours} onChangeText={(v) => setFormData(p => ({...p, vacuum_pump_interval_hours: v}))} placeholder={`${texts.placeholderDefault} 400`} keyboardType="numeric" unit={texts.hours} />
          <EditField label={texts.vacuumPumpLastHours} value={formData.vacuum_pump_last_replacement_hours} onChangeText={(v) => setFormData(p => ({...p, vacuum_pump_last_replacement_hours: v}))} placeholder="0" keyboardType="numeric" unit={texts.hours} />
          <EditField label={texts.vacuumPumpLastDate} value={formData.vacuum_pump_last_replacement_date} onChangeText={(v) => setFormData(p => ({...p, vacuum_pump_last_replacement_date: v}))} placeholder="YYYY-MM-DD" />
          <View style={styles.separator} />
          <EditField label={texts.airframeLastAnnualDate} value={formData.airframe_last_annual_date} onChangeText={(v) => setFormData(p => ({...p, airframe_last_annual_date: v}))} placeholder="YYYY-MM-DD" />
          <EditField label={texts.airframeLastAnnualHours} value={formData.airframe_last_annual_hours} onChangeText={(v) => setFormData(p => ({...p, airframe_last_annual_hours: v}))} placeholder="0" keyboardType="numeric" unit={texts.hours} />
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

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
          <Text style={styles.cancelButtonText}>{texts.cancel}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================
// Styles
// ============================================
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
  headerEditButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  headerEditText: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  
  scrollView: { flex: 1 },
  
  // Center state
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  centerText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: COLORS.textMuted, marginBottom: 16 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  
  // Section
  sectionHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  section: {
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  
  // Display Field
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  fieldLabel: { fontSize: 14, color: COLORS.textMuted, flex: 1 },
  valueContainer: { flexDirection: 'row', alignItems: 'center' },
  fieldValue: { fontSize: 16, color: COLORS.textDark, fontWeight: '500' },
  fieldValueNull: { color: COLORS.textLight, fontStyle: 'italic' },
  defaultBadge: { backgroundColor: COLORS.blue, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  defaultBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  
  // Edit Field
  editFieldContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  editInput: {
    flex: 1, fontSize: 16, color: COLORS.textDark, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.background, borderRadius: 8,
  },
  fieldUnit: { fontSize: 14, color: COLORS.textMuted, marginLeft: 8, minWidth: 50 },
  
  // Picker
  pickerContainer: { flexDirection: 'row', marginTop: 8, gap: 12 },
  pickerOption: { 
    flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8,
    backgroundColor: COLORS.background, alignItems: 'center',
  },
  pickerOptionSelected: { backgroundColor: COLORS.primary },
  pickerOptionText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  pickerOptionTextSelected: { color: COLORS.white },
  
  // Reset Button
  resetButton: {
    margin: 16, marginBottom: 8, paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: COLORS.orangeLight, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.orange,
  },
  resetButtonText: { fontSize: 14, color: '#E65100', fontWeight: '600' },
  
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
  
  // Cancel button
  cancelButton: {
    marginHorizontal: 16, marginTop: 12, paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.white,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelButtonText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '500' },
});
