/**
 * Aircraft Detail Screen
 * Shows full aircraft information, modules, tools, and sharing options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { t, getLanguage } from '@/i18n';
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';
import { useElt } from '@/stores/eltStore';

const COLORS = {
  primary: '#0033A0',
  primaryDark: '#1a237e',
  cardBg: '#283593',
  white: '#FFFFFF',
  background: '#F5F5F5',
  textDark: '#11181C',
  textMuted: '#6C757D',
  border: '#E0E0E0',
  success: '#4CAF50',
  orange: '#FF9800',
  red: '#E53935',
  warning: '#FFF8E1',
  warningBorder: '#FFE082',
  warningText: '#5D4037',
};

export default function AircraftDetailScreen() {
  const router = useRouter();
  const { aircraftId } = useLocalSearchParams<{ aircraftId: string }>();
  const { getAircraftById } = useAircraftLocalStore();
  const { getEltStatus } = useElt();
  const lang = getLanguage();

  const aircraft = getAircraftById(aircraftId || '');
  const eltStatus = getEltStatus();

  // Local state for description
  const [description, setDescription] = useState('');
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'TEA' | 'AMO'>('TEA');

  if (!aircraft) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {lang === 'fr' ? 'Avion non trouvé' : 'Aircraft not found'}
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>
              {lang === 'fr' ? 'Retour' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = () => {
    if (!shareEmail.trim()) {
      Alert.alert('Error', lang === 'fr' ? 'Veuillez entrer un email' : 'Please enter an email');
      return;
    }
    // Mock share - just show confirmation
    Alert.alert(
      lang === 'fr' ? 'Invitation envoyée' : 'Invitation sent',
      lang === 'fr' 
        ? `Une invitation a été envoyée à ${shareEmail} (${shareRole})`
        : `An invitation has been sent to ${shareEmail} (${shareRole})`
    );
    setShowShareModal(false);
    setShareEmail('');
  };

  const navigateToModule = (moduleName: string) => {
    // Special handling for maintenance module
    if (moduleName === 'maintenance') {
      router.push({
        pathname: '/(tabs)/aircraft/maintenance',
        params: { aircraftId, registration: aircraft?.registration },
      });
      return;
    }
    
    // Special handling for ELT module
    if (moduleName === 'elt') {
      router.push({
        pathname: '/(tabs)/aircraft/elt',
        params: { aircraftId, registration: aircraft?.registration },
      });
      return;
    }
    
    // Special handling for OCR Scanner
    if (moduleName === 'ocr-scan') {
      router.push({
        pathname: '/(tabs)/aircraft/ocr-scan',
        params: { aircraftId, registration: aircraft?.registration },
      });
      return;
    }
    
    // Special handling for OCR History
    if (moduleName === 'ocr-history') {
      router.push({
        pathname: '/(tabs)/aircraft/ocr-history',
        params: { aircraftId, registration: aircraft?.registration },
      });
      return;
    }
    
    router.push({
      pathname: '/(tabs)/aircraft/module',
      params: { moduleName, aircraftId },
    });
  };

  const navigateToEdit = () => {
    router.push({
      pathname: '/(tabs)/aircraft/edit',
      params: { aircraftId },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{aircraft.registration}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroDecoration}>
            <Text style={styles.heroDecorationText}>✈</Text>
          </View>
          <Text style={styles.heroRegistration}>{aircraft.registration}</Text>
          <Text style={styles.heroModel}>
            {aircraft.commonName} {aircraft.model}
          </Text>
          {aircraft.yearManufacture && (
            <Text style={styles.heroYear}>{aircraft.yearManufacture}</Text>
          )}
        </View>

        {/* Flight Hours Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'fr' ? 'Heures de vol' : 'Flight Hours'}
          </Text>
          <View style={styles.hoursGrid}>
            <View style={styles.hourCard}>
              <Text style={styles.hourIcon}>⏱</Text>
              <Text style={styles.hourLabel}>{t('airframe')}</Text>
              <Text style={styles.hourValue}>{aircraft.airframeHours}h</Text>
            </View>
            <View style={styles.hourCard}>
              <Text style={styles.hourIcon}>⚙️</Text>
              <Text style={styles.hourLabel}>{t('engine')}</Text>
              <Text style={styles.hourValue}>{aircraft.engineHours}h</Text>
            </View>
            <View style={styles.hourCard}>
              <Text style={styles.hourIcon}>🔄</Text>
              <Text style={styles.hourLabel}>{t('propeller')}</Text>
              <Text style={styles.hourValue}>{aircraft.propellerHours}h</Text>
            </View>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder={lang === 'fr' ? 'Ajouter une description...' : 'Add a description...'}
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Modules Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modules</Text>
          <View style={styles.modulesList}>
            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => navigateToModule('logbook')}
            >
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>📖</Text>
              </View>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>Log Book</Text>
                <Text style={styles.moduleSubtitle}>
                  {lang === 'fr' ? 'Historique des vols et entrées' : 'Flight history and entries'}
                </Text>
              </View>
              <Text style={styles.moduleArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => navigateToModule('maintenance')}
            >
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>🛠️</Text>
              </View>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>Maintenance</Text>
                <Text style={styles.moduleSubtitle}>
                  {lang === 'fr' ? 'Rapports, Pièces, AD/SB, STC' : 'Reports, Parts, AD/SB, STC'}
                </Text>
              </View>
              <Text style={styles.moduleArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => navigateToModule('elt')}
            >
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>📡</Text>
              </View>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>ELT</Text>
                <Text style={styles.moduleSubtitle}>Emergency Locator Transmitter</Text>
                <View style={[
                  styles.statusBadge,
                  eltStatus === 'attention' && styles.statusBadgeWarning,
                  eltStatus === 'expired' && styles.statusBadgeError,
                ]}>
                  <Text style={[
                    styles.statusText,
                    eltStatus === 'attention' && styles.statusTextWarning,
                    eltStatus === 'expired' && styles.statusTextError,
                  ]}>
                    {eltStatus === 'operational'
                      ? (lang === 'fr' ? 'Opérationnel' : 'Operational')
                      : eltStatus === 'attention'
                      ? (lang === 'fr' ? 'Attention' : 'Attention')
                      : (lang === 'fr' ? 'À vérifier' : 'Check Required')}
                  </Text>
                </View>
              </View>
              <Text style={styles.moduleArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => navigateToModule('wb')}
            >
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>⚖️</Text>
              </View>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>W/B</Text>
                <Text style={styles.moduleSubtitle}>Weight & Balance</Text>
              </View>
              <Text style={styles.moduleArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'fr' ? 'Outils' : 'Tools'}
          </Text>
          <View style={styles.modulesList}>
            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => navigateToModule('ocr-scan')}
            >
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>📷</Text>
              </View>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>Scanner OCR</Text>
                <Text style={styles.moduleSubtitle}>
                  {lang === 'fr' ? 'Analyser un document' : 'Scan a document'}
                </Text>
              </View>
              <Text style={styles.moduleArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moduleItem}
              onPress={() => navigateToModule('ocr-history')}
            >
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>📄</Text>
              </View>
              <View style={styles.moduleContent}>
                <Text style={styles.moduleTitle}>
                  {lang === 'fr' ? 'Historique OCR' : 'OCR History'}
                </Text>
                <Text style={styles.moduleSubtitle}>
                  {lang === 'fr' ? 'Documents scannés' : 'Scanned documents'}
                </Text>
              </View>
              <Text style={styles.moduleArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => setShowShareModal(true)}
          >
            <Text style={styles.shareIcon}>👥</Text>
            <View style={styles.shareContent}>
              <Text style={styles.shareTitle}>
                {lang === 'fr' ? 'Partager avec un TEA / AMO' : 'Share with AME / AMO'}
              </Text>
              <Text style={styles.shareSubtitle}>
                {lang === 'fr' ? 'Permettre la consultation' : 'Allow viewing access'}
              </Text>
            </View>
            <Text style={styles.moduleArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* TC-Safe Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={styles.disclaimerText}>
            {lang === 'fr'
              ? "Informatif seulement. Le propriétaire demeure responsable des registres et de la navigabilité de l'aéronef."
              : 'Information only. The aircraft owner remains responsible for records and airworthiness.'}
          </Text>
        </View>

        {/* Bottom spacing for fixed button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Edit Button */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={styles.editButton} onPress={navigateToEdit}>
          <Text style={styles.editButtonText}>
            {lang === 'fr' ? "Modifier l'avion" : 'Edit aircraft'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {lang === 'fr' ? 'Partager avec un TEA / AMO' : 'Share with AME / AMO'}
            </Text>

            <Text style={styles.modalDescription}>
              {lang === 'fr'
                ? "Le partage permet à un TEA ou AMO de consulter les informations de l'avion. Aucune modification ne peut être faite sans autorisation."
                : 'Sharing allows an AME or AMO to view aircraft information. No changes can be made without authorization.'}
            </Text>

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="email@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={shareEmail}
              onChangeText={setShareEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>
              {lang === 'fr' ? 'Rôle' : 'Role'}
            </Text>
            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleOption, shareRole === 'TEA' && styles.roleOptionSelected]}
                onPress={() => setShareRole('TEA')}
              >
                <Text style={[styles.roleText, shareRole === 'TEA' && styles.roleTextSelected]}>
                  TEA / AME
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, shareRole === 'AMO' && styles.roleOptionSelected]}
                onPress={() => setShareRole('AMO')}
              >
                <Text style={[styles.roleText, shareRole === 'AMO' && styles.roleTextSelected]}>
                  AMO
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={styles.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalInviteButton} onPress={handleShare}>
                <Text style={styles.modalInviteText}>
                  {lang === 'fr' ? 'Inviter' : 'Invite'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header
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
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  // Hero Section
  heroSection: {
    backgroundColor: COLORS.cardBg,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecoration: {
    position: 'absolute',
    right: 20,
    top: 10,
    opacity: 0.1,
  },
  heroDecorationText: {
    fontSize: 150,
    color: COLORS.white,
  },
  heroRegistration: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 2,
    zIndex: 1,
  },
  heroModel: {
    fontSize: 18,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 8,
    zIndex: 1,
  },
  heroYear: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.7,
    marginTop: 4,
    zIndex: 1,
  },
  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  // Hours Grid
  hoursGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  hourCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hourIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  hourLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  hourValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  // Description
  descriptionInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textDark,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Modules List
  modulesList: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleIconText: {
    fontSize: 22,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  moduleSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  moduleArrow: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  statusBadge: {
    marginTop: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeError: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  statusTextWarning: {
    color: COLORS.orange,
  },
  statusTextError: {
    color: COLORS.red,
  },
  // Share button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  shareIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  shareContent: {
    flex: 1,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  shareSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.warning,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.warningText,
    lineHeight: 18,
  },
  // Fixed button
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#E8EEF7',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  roleTextSelected: {
    color: COLORS.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  modalInviteButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalInviteText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
});
