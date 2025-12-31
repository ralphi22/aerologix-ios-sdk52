/**
 * Report Settings Screen
 * Allows editing of TBO and maintenance dates/hours
 * TC-SAFE: Informational only
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
import { useReportSettings } from '@/stores/reportSettingsStore';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  border: '#E0E0E0',
  yellow: '#FFF8E1',
  yellowBorder: '#FFE082',
};

interface SettingFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  editable?: boolean;
  hint?: string;
}

function SettingField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable = true,
  hint,
}: SettingFieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, !editable && styles.fieldInputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType={keyboardType}
        editable={editable}
      />
      {hint && <Text style={styles.fieldHint}>{hint}</Text>}
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export default function ReportSettingsScreen() {
  const router = useRouter();
  const { registration } = useLocalSearchParams<{ registration: string }>();
  const lang = getLanguage();
  const { settings, updateSettings } = useReportSettings();

  // Local state for editing
  const [motorTbo, setMotorTbo] = useState(settings.motorTbo.toString());
  const [avioniqueDate, setAvioniqueDate] = useState(settings.avioniqueDate);
  const [magnetosHours, setMagnetosHours] = useState(settings.magnetosHours.toString());
  const [pompeVideHours, setPompeVideHours] = useState(settings.pompeVideHours.toString());

  const handleSave = () => {
    updateSettings({
      motorTbo: parseFloat(motorTbo) || 2000,
      avioniqueDate,
      magnetosHours: parseFloat(magnetosHours) || 0,
      pompeVideHours: parseFloat(pompeVideHours) || 0,
    });

    Alert.alert(
      lang === 'fr' ? 'Enregistré' : 'Saved',
      lang === 'fr' ? 'Les paramètres ont été mis à jour' : 'Settings have been updated'
    );
    router.back();
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
        {/* Editable Section */}
        <SectionHeader
          title={lang === 'fr' ? 'Éléments modifiables' : 'Editable Elements'}
          subtitle={lang === 'fr' ? 'Limites fixes, valeurs actuelles modifiables' : 'Fixed limits, current values editable'}
        />
        <View style={styles.section}>
          <SettingField
            label={lang === 'fr' ? 'Moteur - TBO (heures)' : 'Engine - TBO (hours)'}
            value={motorTbo}
            onChangeText={setMotorTbo}
            placeholder="2000"
            keyboardType="numeric"
          />
          <SettingField
            label={lang === 'fr' ? 'Avionique - Dernière certification (AAAA-MM-JJ)' : 'Avionics - Last certification (YYYY-MM-DD)'}
            value={avioniqueDate}
            onChangeText={setAvioniqueDate}
            placeholder="2024-01-15"
            hint={lang === 'fr' ? 'Limite fixe: 24 mois' : 'Fixed limit: 24 months'}
          />
          <SettingField
            label={lang === 'fr' ? 'Magnétos - Heures depuis inspection' : 'Magnetos - Hours since inspection'}
            value={magnetosHours}
            onChangeText={setMagnetosHours}
            placeholder="281.8"
            keyboardType="numeric"
            hint={lang === 'fr' ? 'Limite fixe: 500 h' : 'Fixed limit: 500 h'}
          />
          <SettingField
            label={lang === 'fr' ? 'Pompe à vide - Heures depuis remplacement' : 'Vacuum Pump - Hours since replacement'}
            value={pompeVideHours}
            onChangeText={setPompeVideHours}
            placeholder="281.8"
            keyboardType="numeric"
            hint={lang === 'fr' ? 'Limite fixe: 400 h' : 'Fixed limit: 400 h'}
          />
        </View>

        {/* Non-editable Section */}
        <SectionHeader
          title={lang === 'fr' ? 'Éléments non modifiables' : 'Non-editable Elements'}
          subtitle={lang === 'fr' ? 'Gérés par leurs modules respectifs' : 'Managed by their respective modules'}
        />
        <View style={styles.section}>
          <SettingField
            label={lang === 'fr' ? 'Cellule - Dernière inspection annuelle' : 'Airframe - Last annual inspection'}
            value={settings.celluleDate}
            onChangeText={() => {}}
            editable={false}
            hint={lang === 'fr' ? 'Limite fixe: 5 ans' : 'Fixed limit: 5 years'}
          />
          <SettingField
            label={lang === 'fr' ? 'Hélice - Dernière inspection' : 'Propeller - Last inspection'}
            value={settings.heliceDate}
            onChangeText={() => {}}
            editable={false}
            hint={lang === 'fr' ? 'Limite fixe: 5 ans' : 'Fixed limit: 5 years'}
          />
          <SettingField
            label={lang === 'fr' ? 'ELT - Date de test' : 'ELT - Test date'}
            value={settings.eltTestDate}
            onChangeText={() => {}}
            editable={false}
            hint={lang === 'fr' ? 'Géré par le module ELT' : 'Managed by ELT module'}
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
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
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
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
  fieldLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  fieldInput: {
    fontSize: 16,
    color: COLORS.textDark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  fieldInputDisabled: {
    backgroundColor: '#E8E8E8',
    color: COLORS.textMuted,
  },
  fieldHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.yellowBorder,
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
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
  saveButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
