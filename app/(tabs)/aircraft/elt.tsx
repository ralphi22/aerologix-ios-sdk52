/**
 * ELT Screen - Emergency Locator Transmitter tracking
 * TC-SAFE: Visual information only, no regulatory validation
 * OCR data must be validated by user
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useElt, EltStatus, EltType } from '@/stores/eltStore';

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
  orangeLight: '#FFF3E0',
  red: '#E53935',
  redLight: '#FFEBEE',
  purple: '#7C4DFF',
  purpleLight: '#EDE7F6',
};

const BEACON_REGISTRY_URL = 'https://www.canada.ca/en/air-force/services/search-rescue/beacon-registry.html';

const ELT_TYPES: { value: EltType; label: string }[] = [
  { value: '121.5 MHz', label: '121.5 MHz' },
  { value: '406 MHz', label: '406 MHz' },
  { value: '406 MHz + GPS', label: '406 MHz + GPS' },
];

function StatusIndicator({ status }: { status: EltStatus }) {
  const lang = getLanguage();
  
  const getStatusConfig = () => {
    switch (status) {
      case 'operational':
        return {
          color: COLORS.green,
          bgColor: COLORS.greenLight,
          text: lang === 'fr' ? 'Opérationnel' : 'Operational',
          icon: '✓',
        };
      case 'attention':
        return {
          color: COLORS.orange,
          bgColor: COLORS.orangeLight,
          text: lang === 'fr' ? 'Attention' : 'Attention',
          icon: '⚠',
        };
      case 'expired':
      default:
        // Fallback défensif - évite crash si status undefined/inconnu
        return {
          color: COLORS.red,
          bgColor: COLORS.redLight,
          text: lang === 'fr' ? 'À vérifier' : 'Check Required',
          icon: '✕',
        };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <View style={[styles.statusContainer, { backgroundColor: config.bgColor }]}>
      <View style={[styles.statusDot, { backgroundColor: config.color }]}>
        <Text style={styles.statusDotIcon}>{config.icon}</Text>
      </View>
      <View style={styles.statusTextContainer}>
        <Text style={[styles.statusValue, { color: config.color }]}>{config.text}</Text>
        <Text style={styles.statusLabel}>
          {lang === 'fr' ? 'Statut visuel' : 'Visual status'}
        </Text>
      </View>
    </View>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
}

function DateField({ label, value, onChange, isEditing }: DateFieldProps) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.dateLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={styles.dateInput}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
        />
      ) : (
        <Text style={styles.dateValue}>{value || '—'}</Text>
      )}
    </View>
  );
}

export default function EltScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const {
    eltData,
    fixedLimits,
    updateEltData,
    getEltStatus,
    getTestProgress,
    getBatteryProgress,
  } = useElt();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...eltData });

  // Sync editData when eltData changes (e.g., after OCR)
  useEffect(() => {
    if (!isEditing) {
      setEditData({ ...eltData });
    }
  }, [eltData, isEditing]);

  const eltStatus = getEltStatus();
  const testProgress = getTestProgress();
  const batteryProgress = getBatteryProgress();

  const handleSave = () => {
    updateEltData(editData);
    setIsEditing(false);
    Alert.alert(
      lang === 'fr' ? 'Enregistré' : 'Saved',
      lang === 'fr' ? 'Données ELT mises à jour' : 'ELT data updated'
    );
  };

  const handleCancel = () => {
    setEditData({ ...eltData });
    setIsEditing(false);
  };

  const openBeaconRegistry = async () => {
    try {
      const supported = await Linking.canOpenURL(BEACON_REGISTRY_URL);
      if (supported) {
        await Linking.openURL(BEACON_REGISTRY_URL);
      } else {
        Alert.alert('Error', lang === 'fr' ? 'Impossible d\'ouvrir le lien' : 'Cannot open link');
      }
    } catch (error) {
      Alert.alert('Error', lang === 'fr' ? 'Erreur lors de l\'ouverture' : 'Error opening link');
    }
  };

  const formatDaysRemaining = (days: number) => {
    if (days <= 0) {
      return lang === 'fr' ? 'Expiré' : 'Expired';
    }
    if (days > 365) {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      const months = Math.floor(remainingDays / 30);
      return `${years}${lang === 'fr' ? 'a' : 'y'} ${months}${lang === 'fr' ? 'm' : 'm'}`;
    }
    if (days > 30) {
      const months = Math.floor(days / 30);
      return `${months} ${lang === 'fr' ? 'mois' : 'months'}`;
    }
    return `${days} ${lang === 'fr' ? 'jours' : 'days'}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>ELT</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          style={styles.headerEdit}
        >
          <Text style={styles.headerEditText}>{isEditing ? '✓' : '✏️'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <StatusIndicator status={eltStatus} />
        </View>

        {/* Progress Cards */}
        <View style={styles.progressSection}>
          {/* Test Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressIcon}>🔔</Text>
              <Text style={styles.progressTitle}>
                {lang === 'fr' ? 'Test ELT' : 'ELT Test'}
              </Text>
              <View style={[
                styles.progressBadge,
                { backgroundColor: testProgress.status === 'operational' ? COLORS.greenLight : testProgress.status === 'attention' ? COLORS.orangeLight : COLORS.redLight }
              ]}>
                <Text style={[
                  styles.progressBadgeText,
                  { color: testProgress.status === 'operational' ? COLORS.green : testProgress.status === 'attention' ? COLORS.orange : COLORS.red }
                ]}>
                  {testProgress.percent}%
                </Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${testProgress.percent}%`,
                      backgroundColor: testProgress.status === 'operational' ? COLORS.green : testProgress.status === 'attention' ? COLORS.orange : COLORS.red,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressLabel}>
                {lang === 'fr' ? 'Cycle' : 'Cycle'}: {fixedLimits.TEST_MONTHS} {lang === 'fr' ? 'mois' : 'months'}
              </Text>
              <Text style={styles.progressRemaining}>
                {formatDaysRemaining(testProgress.daysRemaining)}
              </Text>
            </View>
          </View>

          {/* Battery Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressIcon}>🔋</Text>
              <Text style={styles.progressTitle}>
                {lang === 'fr' ? 'Batterie / Recertification' : 'Battery / Recertification'}
              </Text>
              <View style={[
                styles.progressBadge,
                { backgroundColor: batteryProgress.status === 'operational' ? COLORS.greenLight : batteryProgress.status === 'attention' ? COLORS.orangeLight : COLORS.redLight }
              ]}>
                <Text style={[
                  styles.progressBadgeText,
                  { color: batteryProgress.status === 'operational' ? COLORS.green : batteryProgress.status === 'attention' ? COLORS.orange : COLORS.red }
                ]}>
                  {batteryProgress.percent}%
                </Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${batteryProgress.percent}%`,
                      backgroundColor: batteryProgress.status === 'operational' ? COLORS.green : batteryProgress.status === 'attention' ? COLORS.orange : COLORS.red,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressLabel}>
                {lang === 'fr' ? 'Référence' : 'Reference'}: {fixedLimits.BATTERY_MIN_MONTHS}-{fixedLimits.BATTERY_MAX_MONTHS} {lang === 'fr' ? 'mois' : 'months'}
              </Text>
              <Text style={styles.progressRemaining}>
                {formatDaysRemaining(batteryProgress.daysRemaining)}
              </Text>
            </View>
          </View>
        </View>

        {/* ELT Identification */}
        <View style={styles.identSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📡</Text>
            <Text style={styles.sectionTitle}>
              {lang === 'fr' ? 'Identification ELT' : 'ELT Identification'}
            </Text>
            {isEditing && (
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>{lang === 'fr' ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.identCard}>
            {/* ELT Type */}
            <View style={styles.identRow}>
              <Text style={styles.identLabel}>{lang === 'fr' ? 'Type' : 'Type'}</Text>
              {isEditing ? (
                <View style={styles.eltTypeSelector}>
                  {ELT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.eltTypeOption,
                        editData.eltType === type.value && styles.eltTypeOptionSelected,
                      ]}
                      onPress={() => setEditData({ ...editData, eltType: type.value })}
                    >
                      <Text style={[
                        styles.eltTypeText,
                        editData.eltType === type.value && styles.eltTypeTextSelected,
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.eltTypeBadge}>
                  <Text style={styles.eltTypeBadgeText}>{eltData.eltType || '—'}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.identRow}>
              <Text style={styles.identLabel}>{lang === 'fr' ? 'Fabricant' : 'Manufacturer'}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.identInput}
                  value={editData.manufacturer}
                  onChangeText={(v) => setEditData({ ...editData, manufacturer: v })}
                  placeholder="—"
                />
              ) : (
                <Text style={styles.identValue}>{eltData.manufacturer || '—'}</Text>
              )}
            </View>
            <View style={styles.identRow}>
              <Text style={styles.identLabel}>{lang === 'fr' ? 'Modèle' : 'Model'}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.identInput}
                  value={editData.model}
                  onChangeText={(v) => setEditData({ ...editData, model: v })}
                  placeholder="—"
                />
              ) : (
                <Text style={styles.identValue}>{eltData.model || '—'}</Text>
              )}
            </View>
            <View style={styles.identRow}>
              <Text style={styles.identLabel}>{lang === 'fr' ? 'Numéro de série' : 'Serial Number'}</Text>
              {isEditing ? (
                <TextInput
                  style={styles.identInput}
                  value={editData.serialNumber}
                  onChangeText={(v) => setEditData({ ...editData, serialNumber: v })}
                  placeholder="—"
                />
              ) : (
                <Text style={styles.identValue}>{eltData.serialNumber || '—'}</Text>
              )}
            </View>
            <View style={styles.identRow}>
              <Text style={styles.identLabel}>Hex Code (406 MHz)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.identInput}
                  value={editData.hexCode}
                  onChangeText={(v) => setEditData({ ...editData, hexCode: v.toUpperCase() })}
                  placeholder="—"
                  autoCapitalize="characters"
                />
              ) : (
                <Text style={[styles.identValue, styles.hexCode]}>{eltData.hexCode || '—'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Dates Section */}
        <View style={styles.datesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📅</Text>
            <Text style={styles.sectionTitle}>
              {lang === 'fr' ? 'Dates clés' : 'Key Dates'}
            </Text>
          </View>
          
          <View style={styles.datesCard}>
            <DateField
              label={lang === 'fr' ? 'Date d\'activation ELT' : 'ELT Activation Date'}
              value={isEditing ? editData.activationDate : eltData.activationDate}
              onChange={(v) => setEditData({ ...editData, activationDate: v })}
              isEditing={isEditing}
            />
            <View style={styles.dateDivider} />
            <DateField
              label={lang === 'fr' ? 'Mise en service' : 'Service Date'}
              value={isEditing ? editData.serviceDate : eltData.serviceDate}
              onChange={(v) => setEditData({ ...editData, serviceDate: v })}
              isEditing={isEditing}
            />
            <View style={styles.dateDivider} />
            <DateField
              label={lang === 'fr' ? 'Dernier test ELT' : 'Last ELT Test'}
              value={isEditing ? editData.lastTestDate : eltData.lastTestDate}
              onChange={(v) => setEditData({ ...editData, lastTestDate: v })}
              isEditing={isEditing}
            />
            <View style={styles.dateDivider} />
            <DateField
              label={lang === 'fr' ? 'Dernier changement batterie' : 'Last Battery Change'}
              value={isEditing ? editData.lastBatteryDate : eltData.lastBatteryDate}
              onChange={(v) => setEditData({ ...editData, lastBatteryDate: v })}
              isEditing={isEditing}
            />
            <View style={styles.dateDivider} />
            <DateField
              label={lang === 'fr' ? 'Expiration batterie' : 'Battery Expiry'}
              value={isEditing ? editData.batteryExpiryDate : eltData.batteryExpiryDate}
              onChange={(v) => setEditData({ ...editData, batteryExpiryDate: v })}
              isEditing={isEditing}
            />
          </View>
        </View>

        {/* Save Button (when editing) */}
        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {lang === 'fr' ? 'Enregistrer les modifications' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Beacon Registry Link */}
        <View style={styles.registrySection}>
          <TouchableOpacity style={styles.registryButton} onPress={openBeaconRegistry}>
            <Text style={styles.registryIcon}>🇨🇦</Text>
            <View style={styles.registryContent}>
              <Text style={styles.registryTitle}>
                {lang === 'fr' ? 'Registre canadien des balises ELT' : 'Canadian ELT Beacon Registry'}
              </Text>
              <Text style={styles.registrySubtitle}>
                canada.ca ↗
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.registryNotice}>
            <Text style={styles.registryNoticeIcon}>ℹ️</Text>
            <Text style={styles.registryNoticeText}>
              {lang === 'fr'
                ? 'L\'enregistrement de la balise ELT est obligatoire au Canada et relève de la responsabilité du propriétaire.'
                : 'ELT beacon registration is mandatory in Canada and remains the owner\'s responsibility.'}
            </Text>
          </View>
        </View>

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
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 2 },
  headerEdit: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerEditText: { fontSize: 20 },
  scrollView: { flex: 1 },
  // Status Section
  statusSection: { margin: 16 },
  statusContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 20,
  },
  statusDot: {
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  statusDotIcon: { fontSize: 24, color: COLORS.white },
  statusTextContainer: {},
  statusValue: { fontSize: 22, fontWeight: '700' },
  statusLabel: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  // OCR Section
  ocrSection: { paddingHorizontal: 16, marginBottom: 8 },
  ocrButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.purpleLight,
    borderRadius: 12, padding: 14, borderWidth: 2, borderColor: COLORS.purple,
  },
  ocrIconContainer: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  ocrIcon: { fontSize: 22 },
  ocrContent: { flex: 1 },
  ocrTitle: { fontSize: 15, fontWeight: '600', color: COLORS.purple },
  ocrSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  ocrArrow: { fontSize: 24, color: COLORS.purple },
  lastScanText: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, textAlign: 'right' },
  // Progress Section
  progressSection: { paddingHorizontal: 16 },
  progressCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12,
  },
  progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressIcon: { fontSize: 20, marginRight: 8 },
  progressTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textDark },
  progressBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  progressBadgeText: { fontSize: 13, fontWeight: '700' },
  progressBarContainer: { marginBottom: 12 },
  progressBarTrack: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: COLORS.textMuted },
  progressRemaining: { fontSize: 12, fontWeight: '600', color: COLORS.textDark },
  // Identification Section
  identSection: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 6 },
  cancelButtonText: { fontSize: 14, color: COLORS.red },
  identCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  identRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.background,
  },
  identLabel: { fontSize: 14, color: COLORS.textMuted },
  identValue: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  identInput: {
    backgroundColor: COLORS.background, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10,
    fontSize: 14, fontWeight: '600', color: COLORS.textDark, minWidth: 120, textAlign: 'right',
  },
  hexCode: { fontFamily: 'monospace', letterSpacing: 1 },
  // ELT Type Selector
  eltTypeSelector: { flexDirection: 'row', gap: 6 },
  eltTypeOption: {
    paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  eltTypeOptionSelected: { backgroundColor: COLORS.greenLight, borderColor: COLORS.green },
  eltTypeText: { fontSize: 10, color: COLORS.textMuted },
  eltTypeTextSelected: { color: COLORS.green, fontWeight: '600' },
  eltTypeBadge: { backgroundColor: COLORS.blue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  eltTypeBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  // Dates Section
  datesSection: { paddingHorizontal: 16 },
  datesCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
  dateField: { paddingVertical: 12 },
  dateLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  dateValue: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  dateInput: {
    backgroundColor: COLORS.background, borderRadius: 8, padding: 10,
    fontSize: 16, fontWeight: '600', color: COLORS.textDark,
  },
  dateDivider: { height: 1, backgroundColor: COLORS.background },
  // Save Button
  saveButton: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: COLORS.green, paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  // Registry Section
  registrySection: { padding: 16 },
  registryButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white,
    borderRadius: 12, padding: 16, marginBottom: 12,
  },
  registryIcon: { fontSize: 32, marginRight: 12 },
  registryContent: { flex: 1 },
  registryTitle: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  registrySubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  registryNotice: {
    flexDirection: 'row', backgroundColor: COLORS.blue, borderRadius: 10, padding: 12,
  },
  registryNoticeIcon: { fontSize: 14, marginRight: 8 },
  registryNoticeText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row', margin: 16, padding: 16, backgroundColor: COLORS.yellow,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.yellowBorder,
  },
  disclaimerIcon: { fontSize: 16, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18 },
});
