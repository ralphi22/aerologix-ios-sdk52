/**
 * Report Settings Screen
 * Allows editing of ALL settings and limits
 * TC-SAFE: Informational only - rules can change
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useReportSettings, DEFAULT_LIMITS } from '@/stores/reportSettingsStore';

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
};

interface SettingFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  unit?: string;
}

function SettingField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  unit,
}: SettingFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
        />
        {unit && <Text style={styles.fieldUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

interface LimitFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  defaultValue: number;
  unit: string;
  lang: string;
}

function LimitField({ label, value, onChangeText, defaultValue, unit, lang }: LimitFieldProps) {
  return (
    <View style={styles.limitContainer}>
      <View style={styles.limitHeader}>
        <Text style={styles.limitLabel}>{label}</Text>
        <Text style={styles.limitDefault}>
          {lang === 'fr' ? 'Défaut:' : 'Default:'} {defaultValue} {unit}
        </Text>
      </View>
      <View style={styles.limitInputRow}>
        <TextInput
          style={styles.limitInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={defaultValue.toString()}
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.limitUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        {icon && <Text style={styles.sectionIcon}>{icon}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export default function ReportSettingsScreen() {
  const router = useRouter();
  const { registration } = useLocalSearchParams<{ registration: string }>();
  const lang = getLanguage();
  const { settings, limits, updateSettings, updateLimits, resetLimitsToDefault } = useReportSettings();

  // Local state for settings - initialized with store values (which have defaults)
  const [motorTbo, setMotorTbo] = useState(settings.motorTbo?.toString() || '2000');
  const [avioniqueDate, setAvioniqueDate] = useState(settings.avioniqueDate || '');
  const [magnetosHoursUsed, setMagnetosHoursUsed] = useState(settings.magnetosHoursUsed?.toString() || '0');
  const [pompeVideHoursUsed, setPompeVideHoursUsed] = useState(settings.pompeVideHoursUsed?.toString() || '0');
  const [heliceDate, setHeliceDate] = useState(settings.heliceDate || '');
  const [celluleDate, setCelluleDate] = useState(settings.celluleDate || '');
  const [eltTestDate, setEltTestDate] = useState(settings.eltTestDate || '');
  const [eltBatteryExpiry, setEltBatteryExpiry] = useState(settings.eltBatteryExpiry || '');

  // Local state for limits - initialized with store values (which have defaults)
  const [celluleYears, setCelluleYears] = useState(limits.celluleYears?.toString() || '5');
  const [heliceYears, setHeliceYears] = useState(limits.heliceYears?.toString() || '5');
  const [avioniqueMonths, setAvioniqueMonths] = useState(limits.avioniqueMonths?.toString() || '24');
  const [magnetosHours, setMagnetosHours] = useState(limits.magnetosHours?.toString() || '500');
  const [pompeVideHours, setPompeVideHours] = useState(limits.pompeVideHours?.toString() || '400');
  const [eltTestMonths, setEltTestMonths] = useState(limits.eltTestMonths?.toString() || '12');
  const [eltBatteryMonths, setEltBatteryMonths] = useState(limits.eltBatteryMonths?.toString() || '24');

  // Update form when store data changes (after async load from SecureStore)
  useEffect(() => {
    if (settings) {
      setMotorTbo(settings.motorTbo?.toString() || '2000');
      setAvioniqueDate(settings.avioniqueDate || '');
      setMagnetosHoursUsed(settings.magnetosHoursUsed?.toString() || '0');
      setPompeVideHoursUsed(settings.pompeVideHoursUsed?.toString() || '0');
      setHeliceDate(settings.heliceDate || '');
      setCelluleDate(settings.celluleDate || '');
      setEltTestDate(settings.eltTestDate || '');
      setEltBatteryExpiry(settings.eltBatteryExpiry || '');
    }
  }, [settings]);

  // Update form when limits change (after async load from SecureStore)
  useEffect(() => {
    if (limits) {
      setCelluleYears(limits.celluleYears?.toString() || '5');
      setHeliceYears(limits.heliceYears?.toString() || '5');
      setAvioniqueMonths(limits.avioniqueMonths?.toString() || '24');
      setMagnetosHours(limits.magnetosHours?.toString() || '500');
      setPompeVideHours(limits.pompeVideHours?.toString() || '400');
      setEltTestMonths(limits.eltTestMonths?.toString() || '12');
      setEltBatteryMonths(limits.eltBatteryMonths?.toString() || '24');
    }
  }, [limits]);

  const handleSave = () => {
    // Update settings
    updateSettings({
      motorTbo: parseFloat(motorTbo) || 2000,
      avioniqueDate,
      magnetosHoursUsed: parseFloat(magnetosHoursUsed) || 0,
      pompeVideHoursUsed: parseFloat(pompeVideHoursUsed) || 0,
      heliceDate,
      celluleDate,
      eltTestDate,
      eltBatteryExpiry,
    });

    // Update limits
    updateLimits({
      celluleYears: parseInt(celluleYears) || DEFAULT_LIMITS.CELLULE_YEARS,
      heliceYears: parseInt(heliceYears) || DEFAULT_LIMITS.HELICE_YEARS,
      avioniqueMonths: parseInt(avioniqueMonths) || DEFAULT_LIMITS.AVIONIQUE_MONTHS,
      magnetosHours: parseInt(magnetosHours) || DEFAULT_LIMITS.MAGNETOS_HOURS,
      pompeVideHours: parseInt(pompeVideHours) || DEFAULT_LIMITS.POMPE_VIDE_HOURS,
      eltTestMonths: parseInt(eltTestMonths) || DEFAULT_LIMITS.ELT_TEST_MONTHS,
      eltBatteryMonths: parseInt(eltBatteryMonths) || DEFAULT_LIMITS.ELT_BATTERY_MONTHS,
    });

    Alert.alert(
      lang === 'fr' ? 'Enregistré' : 'Saved',
      lang === 'fr' ? 'Les paramètres ont été mis à jour' : 'Settings have been updated'
    );
    router.back();
  };

  const handleResetLimits = () => {
    Alert.alert(
      lang === 'fr' ? 'Réinitialiser les limites' : 'Reset Limits',
      lang === 'fr' 
        ? 'Voulez-vous restaurer les valeurs par défaut?'
        : 'Do you want to restore default values?',
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'fr' ? 'Réinitialiser' : 'Reset',
          style: 'destructive',
          onPress: () => {
            setCelluleYears(DEFAULT_LIMITS.CELLULE_YEARS.toString());
            setHeliceYears(DEFAULT_LIMITS.HELICE_YEARS.toString());
            setAvioniqueMonths(DEFAULT_LIMITS.AVIONIQUE_MONTHS.toString());
            setMagnetosHours(DEFAULT_LIMITS.MAGNETOS_HOURS.toString());
            setPompeVideHours(DEFAULT_LIMITS.POMPE_VIDE_HOURS.toString());
            setEltTestMonths(DEFAULT_LIMITS.ELT_TEST_MONTHS.toString());
            setEltBatteryMonths(DEFAULT_LIMITS.ELT_BATTERY_MONTHS.toString());
            resetLimitsToDefault();
          },
        },
      ]
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
          <Text style={styles.headerTitle}>
            {lang === 'fr' ? 'Paramètres Rapport' : 'Report Settings'}
          </Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* === LIMITS SECTION === */}
        <SectionHeader
          title={lang === 'fr' ? 'Limites de maintenance' : 'Maintenance Limits'}
          subtitle={lang === 'fr' ? 'Les règles peuvent changer - modifiables' : 'Rules can change - editable'}
          icon="⚙️"
        />
        <View style={styles.section}>
          <LimitField
            label={lang === 'fr' ? 'Cellule - Inspection annuelle' : 'Airframe - Annual inspection'}
            value={celluleYears}
            onChangeText={setCelluleYears}
            defaultValue={DEFAULT_LIMITS.CELLULE_YEARS}
            unit={lang === 'fr' ? 'ans' : 'years'}
            lang={lang}
          />
          <LimitField
            label={lang === 'fr' ? 'Hélice - Inspection' : 'Propeller - Inspection'}
            value={heliceYears}
            onChangeText={setHeliceYears}
            defaultValue={DEFAULT_LIMITS.HELICE_YEARS}
            unit={lang === 'fr' ? 'ans' : 'years'}
            lang={lang}
          />
          <LimitField
            label={lang === 'fr' ? 'Avionique - Certification' : 'Avionics - Certification'}
            value={avioniqueMonths}
            onChangeText={setAvioniqueMonths}
            defaultValue={DEFAULT_LIMITS.AVIONIQUE_MONTHS}
            unit={lang === 'fr' ? 'mois' : 'months'}
            lang={lang}
          />
          <LimitField
            label={lang === 'fr' ? 'Magnétos - Limite' : 'Magnetos - Limit'}
            value={magnetosHours}
            onChangeText={setMagnetosHours}
            defaultValue={DEFAULT_LIMITS.MAGNETOS_HOURS}
            unit="h"
            lang={lang}
          />
          <LimitField
            label={lang === 'fr' ? 'Pompe à vide - Limite' : 'Vacuum Pump - Limit'}
            value={pompeVideHours}
            onChangeText={setPompeVideHours}
            defaultValue={DEFAULT_LIMITS.POMPE_VIDE_HOURS}
            unit="h"
            lang={lang}
          />
          <LimitField
            label={lang === 'fr' ? 'ELT - Test' : 'ELT - Test'}
            value={eltTestMonths}
            onChangeText={setEltTestMonths}
            defaultValue={DEFAULT_LIMITS.ELT_TEST_MONTHS}
            unit={lang === 'fr' ? 'mois' : 'months'}
            lang={lang}
          />
          <LimitField
            label={lang === 'fr' ? 'ELT - Batterie' : 'ELT - Battery'}
            value={eltBatteryMonths}
            onChangeText={setEltBatteryMonths}
            defaultValue={DEFAULT_LIMITS.ELT_BATTERY_MONTHS}
            unit={lang === 'fr' ? 'mois' : 'months'}
            lang={lang}
          />
          
          {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={handleResetLimits}>
            <Text style={styles.resetButtonText}>
              🔄 {lang === 'fr' ? 'Réinitialiser aux valeurs par défaut' : 'Reset to default values'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* === VALUES SECTION === */}
        <SectionHeader
          title={lang === 'fr' ? 'Valeurs actuelles' : 'Current Values'}
          subtitle={lang === 'fr' ? 'Dates et heures de votre aéronef' : 'Dates and hours for your aircraft'}
          icon="📅"
        />
        <View style={styles.section}>
          <SettingField
            label={lang === 'fr' ? 'Moteur - TBO' : 'Engine - TBO'}
            value={motorTbo}
            onChangeText={setMotorTbo}
            placeholder="2000"
            keyboardType="numeric"
            unit="h"
          />
          <SettingField
            label={lang === 'fr' ? 'Cellule - Dernière inspection annuelle' : 'Airframe - Last annual inspection'}
            value={celluleDate}
            onChangeText={setCelluleDate}
            placeholder="YYYY-MM-DD"
          />
          <SettingField
            label={lang === 'fr' ? 'Hélice - Dernière inspection' : 'Propeller - Last inspection'}
            value={heliceDate}
            onChangeText={setHeliceDate}
            placeholder="YYYY-MM-DD"
          />
          <SettingField
            label={lang === 'fr' ? 'Avionique - Dernière certification' : 'Avionics - Last certification'}
            value={avioniqueDate}
            onChangeText={setAvioniqueDate}
            placeholder="YYYY-MM-DD"
          />
          <SettingField
            label={lang === 'fr' ? 'Magnétos - Heures depuis inspection' : 'Magnetos - Hours since inspection'}
            value={magnetosHoursUsed}
            onChangeText={setMagnetosHoursUsed}
            placeholder="0"
            keyboardType="numeric"
            unit="h"
          />
          <SettingField
            label={lang === 'fr' ? 'Pompe à vide - Heures depuis remplacement' : 'Vacuum Pump - Hours since replacement'}
            value={pompeVideHoursUsed}
            onChangeText={setPompeVideHoursUsed}
            placeholder="0"
            keyboardType="numeric"
            unit="h"
          />
          <SettingField
            label={lang === 'fr' ? 'ELT - Date de test' : 'ELT - Test date'}
            value={eltTestDate}
            onChangeText={setEltTestDate}
            placeholder="YYYY-MM-DD"
          />
          <SettingField
            label={lang === 'fr' ? 'ELT - Expiration batterie' : 'ELT - Battery expiry'}
            value={eltBatteryExpiry}
            onChangeText={setEltBatteryExpiry}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* TC-Safe Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {lang === 'fr'
              ? "Information seulement. Ne remplace pas un TEA/AME ni un registre officiel. Les décisions de navigabilité appartiennent au propriétaire et à l'atelier."
              : 'Information only. Does not replace an AME nor an official record. Airworthiness decisions remain with the owner and the maintenance organization.'}
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>
            {lang === 'fr' ? 'Enregistrer' : 'Save'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 2 },
  headerRight: { width: 40 },
  scrollView: { flex: 1 },
  // Section
  sectionHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1 },
  sectionSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  section: {
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  // Setting Field
  fieldContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fieldLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: 6 },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldInput: {
    flex: 1, fontSize: 16, color: COLORS.textDark, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: COLORS.background, borderRadius: 8,
  },
  fieldUnit: { fontSize: 14, color: COLORS.textMuted, marginLeft: 8, minWidth: 40 },
  // Limit Field
  limitContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  limitLabel: { fontSize: 14, color: COLORS.textDark, fontWeight: '500' },
  limitDefault: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  limitInputRow: { flexDirection: 'row', alignItems: 'center' },
  limitInput: {
    flex: 1, fontSize: 16, color: COLORS.textDark, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: COLORS.blue, borderRadius: 8, borderWidth: 1, borderColor: COLORS.blueBorder,
  },
  limitUnit: { fontSize: 14, color: COLORS.primary, fontWeight: '500', marginLeft: 8, minWidth: 50 },
  // Reset Button
  resetButton: {
    marginTop: 16, paddingVertical: 12, alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 8,
  },
  resetButtonText: { fontSize: 14, color: COLORS.orange, fontWeight: '500' },
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
  saveButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
});
