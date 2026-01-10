/**
 * Profile Screen - Subscription Dashboard
 * Shows real subscription data from Stripe via backend
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  cardBg: '#B8C5D6',
  border: '#E0E0E0',
  danger: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
};

// Plan display names mapping
const PLAN_DISPLAY_NAMES: Record<string, { en: string; fr: string }> = {
  BASIC: { en: 'Basic (Free)', fr: 'Basic (Gratuit)' },
  PILOT: { en: 'Pilot', fr: 'Pilot' },
  PILOT_PRO: { en: 'Pilot Pro', fr: 'Pilot Pro' },
  MAINTENANCE_PRO: { en: 'Pilot Pro', fr: 'Pilot Pro' },
  FLEET: { en: 'Fleet', fr: 'Fleet' },
  FLEET_AI: { en: 'Fleet', fr: 'Fleet' },
};

// Status display
const STATUS_DISPLAY: Record<string, { en: string; fr: string; color: string }> = {
  active: { en: 'Active', fr: 'Actif', color: COLORS.success },
  trialing: { en: 'Trial', fr: 'Essai', color: COLORS.warning },
  canceled: { en: 'Canceled', fr: 'Annulé', color: COLORS.danger },
  past_due: { en: 'Past Due', fr: 'Impayé', color: COLORS.danger },
  inactive: { en: 'Inactive', fr: 'Inactif', color: COLORS.textMuted },
};

export default function ProfileScreen() {
  const router = useRouter();
  const lang = getLanguage();
  const { user, logout } = useAuthStore();

  // User info
  const userName = (user as any)?.displayName || (user as any)?.fullName || user?.name || user?.email || '—';
  const userEmail = user?.email || '';

  // Subscription info from backend
  const planCode = user?.plan_code || user?.subscription?.plan || 'BASIC';
  const subscriptionStatus = user?.subscription?.status || 'inactive';
  const limits = user?.limits || {
    max_aircrafts: 1,
    ocr_per_month: 5,
    gps_logbook: false,
    tea_amo_sharing: false,
    invoices: false,
    cost_per_hour: false,
    prebuy: false,
  };

  // Display values
  const planDisplay = PLAN_DISPLAY_NAMES[planCode]?.[lang] || PLAN_DISPLAY_NAMES[planCode]?.en || planCode;
  const statusInfo = STATUS_DISPLAY[subscriptionStatus] || STATUS_DISPLAY.inactive;
  const statusDisplay = statusInfo[lang] || statusInfo.en;

  // Limits display
  const maxAircrafts = limits.max_aircrafts === -1 ? '∞' : String(limits.max_aircrafts || 1);
  const ocrPerMonth = limits.ocr_per_month === -1 ? '∞' : String(limits.ocr_per_month || 5);
  const hasLogbookGPS = limits.gps_logbook || limits.tea_amo_sharing;

  const handleManageSubscription = () => {
    router.push('/profile/subscription');
  };

  const handleMyProfile = () => {
    router.push('/profile/my-profile');
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const disclaimer = lang === 'fr'
    ? 'Informatif seulement. Cette application ne remplace pas un TEA (AME).'
    : 'Informational only. This app does not replace an AME/TEA.';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Avatar & Info */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          
          {/* My Profile Link */}
          <TouchableOpacity style={styles.profileLink} onPress={handleMyProfile}>
            <Ionicons name="settings-outline" size={16} color={COLORS.primary} />
            <Text style={styles.profileLinkText}>
              {lang === 'fr' ? 'Paramètres du compte' : 'Account Settings'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'fr' ? 'Abonnement' : 'Subscription'}
          </Text>
          <View style={styles.subscriptionCard}>
            <Text style={styles.subscriptionPlan}>{planDisplay}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.statusText}>{statusDisplay}</Text>
            </View>
          </View>
        </View>

        {/* Limits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'fr' ? 'Limites' : 'Limits'}
          </Text>
          <View style={styles.limitsCard}>
            {/* Aircraft limit */}
            <View style={styles.limitRow}>
              <View style={styles.limitLeft}>
                <Text style={styles.limitIcon}>✈️</Text>
                <Text style={styles.limitLabel}>
                  {lang === 'fr' ? 'Aéronefs' : 'Aircraft'}
                </Text>
              </View>
              <Text style={styles.limitValue}>{maxAircrafts}</Text>
            </View>
            
            <View style={styles.limitDivider} />
            
            {/* OCR limit */}
            <View style={styles.limitRow}>
              <View style={styles.limitLeft}>
                <Text style={styles.limitIcon}>📷</Text>
                <Text style={styles.limitLabel}>OCR / {lang === 'fr' ? 'mois' : 'month'}</Text>
              </View>
              <Text style={styles.limitValue}>{ocrPerMonth}</Text>
            </View>
            
            <View style={styles.limitDivider} />
            
            {/* Log Book GPS */}
            <View style={styles.limitRow}>
              <View style={styles.limitLeft}>
                <Text style={styles.limitIcon}>📘</Text>
                <Text style={styles.limitLabel}>Log Book GPS</Text>
              </View>
              {hasLogbookGPS ? (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              ) : (
                <Text style={styles.limitValueDisabled}>
                  {lang === 'fr' ? 'Non inclus' : 'Not included'}
                </Text>
              )}
            </View>
            
            <View style={styles.limitDivider} />
            
            {/* Invoices */}
            <View style={styles.limitRow}>
              <View style={styles.limitLeft}>
                <Text style={styles.limitIcon}>🧾</Text>
                <Text style={styles.limitLabel}>
                  {lang === 'fr' ? 'Factures' : 'Invoices'}
                </Text>
              </View>
              {limits.invoices ? (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              ) : (
                <Text style={styles.limitValueDisabled}>
                  {lang === 'fr' ? 'Non inclus' : 'Not included'}
                </Text>
              )}
            </View>
            
            <View style={styles.limitDivider} />
            
            {/* Cost per hour */}
            <View style={styles.limitRow}>
              <View style={styles.limitLeft}>
                <Text style={styles.limitIcon}>💰</Text>
                <Text style={styles.limitLabel}>
                  {lang === 'fr' ? 'Coût/heure' : 'Cost/hour'}
                </Text>
              </View>
              {limits.cost_per_hour ? (
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              ) : (
                <Text style={styles.limitValueDisabled}>
                  {lang === 'fr' ? 'Non inclus' : 'Not included'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Manage Subscription Button */}
        <TouchableOpacity
          style={styles.manageButton}
          onPress={handleManageSubscription}
        >
          <View style={styles.manageButtonLeft}>
            <Text style={styles.manageIcon}>💳</Text>
            <Text style={styles.manageText}>
              {lang === 'fr' ? 'Gérer l\'abonnement' : 'Manage Subscription'}
            </Text>
          </View>
          <Text style={styles.manageArrow}>›</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>
            {lang === 'fr' ? 'Déconnexion' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* TC-Safe Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerIcon}>⚠️</Text>
        <Text style={styles.disclaimerText}>{disclaimer}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  // User section
  userSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.white,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarIcon: {
    fontSize: 40,
    color: COLORS.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  profileLinkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Section
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Subscription card
  subscriptionCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  subscriptionPlan: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Limits card
  limitsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  limitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  limitLabel: {
    fontSize: 15,
    color: COLORS.textDark,
  },
  limitValue: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  limitValueDisabled: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  limitDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 14,
  },
  // Manage button
  manageButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
  },
  manageButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  manageText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  manageArrow: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  // Logout button
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Disclaimer
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderTopWidth: 1,
    borderTopColor: '#FFE082',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 16,
  },
});
