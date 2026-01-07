/**
 * Profile Screen - User info, subscription, limits
 * Updated for App Store v1 - Non-monetized, clean experience
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

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  cardBg: '#B8C5D6',
  border: '#E0E0E0',
  danger: '#DC3545',
};

export default function ProfileScreen() {
  const router = useRouter();
  const lang = getLanguage();
  const { user, logout } = useAuthStore();

  // Use real user data from auth store
  const userName = user?.name || 'Utilisateur';
  const userEmail = user?.email || '';

  const handleManageSubscription = () => {
    // Navigate to simple "Mon profil" screen
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
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'fr' ? 'Abonnement' : 'Subscription'}
          </Text>
          <View style={styles.subscriptionCard}>
            <Text style={styles.subscriptionPlan}>
              {lang === 'fr' ? 'Lancement gratuit' : 'Free Launch'}
            </Text>
            <Text style={styles.subscriptionStatus}>
              {lang === 'fr' ? '7 jours' : '7 days'}
            </Text>
          </View>
        </View>

        {/* Benefits Section (Static informational only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {lang === 'fr' ? 'Limites' : 'Limits'}
          </Text>
          <View style={styles.limitsCard}>
            <View style={styles.limitRow}>
              <View style={styles.limitLeft}>
                <Text style={styles.limitIcon}>✈️</Text>
                <Text style={styles.limitLabel}>
                  {lang === 'fr' ? 'Avion' : 'Aircraft'}
                </Text>
              </View>
              <Text style={styles.limitValue}>1</Text>
            </View>
            <View style={styles.limitDivider} />
            <View style={styles.limitRow}>
              <View style={styles.limitLeft}>
                <Text style={styles.limitIcon}>📷</Text>
                <Text style={styles.limitLabel}>OCR</Text>
              </View>
              <Text style={styles.limitValue}>10</Text>
            </View>
            <View style={styles.limitDivider} />
            <View style={styles.limitRow}>
              <View style={styles.limitLeft}>
                <Text style={styles.limitIcon}>📘</Text>
                <Text style={styles.limitLabel}>Log Book GPS</Text>
              </View>
              <Text style={styles.limitValueSoon}>
                {lang === 'fr' ? 'Bientôt' : 'Soon'}
              </Text>
            </View>
          </View>
        </View>

        {/* Manage Subscription Button - navigates to simple profile screen */}
        <TouchableOpacity
          style={styles.manageButton}
          onPress={handleManageSubscription}
        >
          <View style={styles.manageButtonLeft}>
            <Text style={styles.manageIcon}>💳</Text>
            <Text style={styles.manageText}>
              {lang === 'fr' ? 'Gérer l\'abonnement' : 'Manage subscription'}
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
    paddingBottom: 20,
  },
  // User section
  userSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.white,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarIcon: {
    fontSize: 48,
    color: COLORS.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.textMuted,
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
  // Subscription card
  subscriptionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  subscriptionPlan: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  subscriptionStatus: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
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
    padding: 16,
  },
  limitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  limitIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  limitLabel: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  limitValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  limitValueSoon: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  limitDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  // Manage button
  manageButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 24,
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
    marginTop: 24,
    backgroundColor: COLORS.danger,
    paddingVertical: 16,
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
