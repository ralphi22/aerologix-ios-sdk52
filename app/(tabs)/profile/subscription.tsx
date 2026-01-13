/**
 * Subscription Management Screen
 * FIXED: Always displays ALL 4 plans on the main page
 * - BASIC (Free)
 * - PILOT (7-day trial)
 * - PILOT_PRO (7-day trial)
 * - FLEET (No trial)
 * 
 * Plan list is LOCAL - not dependent on /api/auth/me
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { 
  PLANS, 
  PlanCode, 
  BillingCycle, 
  openCheckout,
  formatLimit,
  getYearlySavings,
  cancelSubscription,
} from '@/services/paymentService';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  border: '#E0E0E0',
  danger: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  orange: '#F59E0B',
};

// LOCAL PLAN LIST - Independent of /api/auth/me
// Always display these 4 plans
const ALL_PLAN_CODES: PlanCode[] = ['BASIC', 'PILOT', 'PILOT_PRO', 'FLEET'];

// Status display - Based ONLY on subscription.status
const STATUS_DISPLAY: Record<string, { en: string; fr: string; color: string }> = {
  active: { en: 'Active subscription', fr: 'Abonnement actif', color: COLORS.success },
  trialing: { en: 'Free trial active', fr: 'Essai gratuit en cours', color: COLORS.warning },
  canceled: { en: 'Canceled', fr: 'Annulé', color: COLORS.danger },
  past_due: { en: 'Past Due', fr: 'Impayé', color: COLORS.danger },
  inactive: { en: 'Inactive', fr: 'Inactif', color: COLORS.textMuted },
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const lang = getLanguage() as 'en' | 'fr';
  const { user, loadUser } = useAuthStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState<PlanCode | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('monthly');

  // User data from store
  const userPlanCode = (user?.plan_code || user?.subscription?.plan_code || 'BASIC') as PlanCode;
  const limits = user?.limits;
  const subscription = user?.subscription;
  const subscriptionStatus = subscription?.status || 'inactive';
  const billingCycle = subscription?.billing_cycle || '';
  const stripeSubscriptionId = subscription?.stripe_subscription_id;
  const currentPeriodEnd = subscription?.current_period_end;

  // Status info
  const statusInfo = STATUS_DISPLAY[subscriptionStatus] || STATUS_DISPLAY.inactive;
  const statusDisplay = statusInfo[lang] || statusInfo.en;

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const canCancel = isActive && stripeSubscriptionId && userPlanCode !== 'BASIC';

  // Refresh user data
  const refreshUser = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadUser();
    } catch (error) {
      console.error('Failed to refresh user:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadUser]);

  useEffect(() => {
    refreshUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        refreshUser();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [refreshUser]);

  const handleBack = () => {
    router.back();
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      await cancelSubscription();
      await loadUser();
      setShowCancelModal(false);
      Alert.alert(
        lang === 'fr' ? 'Abonnement annulé' : 'Subscription Canceled',
        lang === 'fr'
          ? 'Votre abonnement a été annulé. Vous conservez l\'accès jusqu\'à la fin de la période en cours.'
          : 'Your subscription has been canceled. You will retain access until the end of the current period.'
      );
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'An error occurred.';
      Alert.alert(lang === 'fr' ? 'Erreur' : 'Error', errorMessage);
    } finally {
      setIsCanceling(false);
    }
  };

  const handleSelectPlan = async (planCode: PlanCode) => {
    if (planCode === 'BASIC' || planCode === userPlanCode) return;
    
    setIsCheckingOut(planCode);
    try {
      const result = await openCheckout(planCode, selectedBillingCycle);
      
      if (result.success) {
        Alert.alert(
          lang === 'fr' ? 'Checkout ouvert' : 'Checkout Opened',
          lang === 'fr'
            ? 'Complétez le paiement dans votre navigateur. Tirez vers le bas pour rafraîchir après le paiement.'
            : 'Complete payment in your browser. Pull down to refresh after payment.',
          [{ text: 'OK', onPress: () => setTimeout(() => refreshUser(), 2000) }]
        );
      } else if (result.error) {
        Alert.alert(lang === 'fr' ? 'Erreur' : 'Error', result.error);
      }
    } catch (error: any) {
      Alert.alert(lang === 'fr' ? 'Erreur' : 'Error', error?.message || 'An error occurred');
    } finally {
      setIsCheckingOut(null);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  // Single Plan Card Component
  const PlanCard = ({ code }: { code: PlanCode }) => {
    const plan = PLANS[code];
    if (!plan) return null;
    
    const price = selectedBillingCycle === 'monthly' ? plan.monthly : plan.yearly;
    const savings = getYearlySavings(code);
    const isCurrentPlan = code === userPlanCode;
    const hasFreeTrial = code === 'PILOT' || code === 'PILOT_PRO';
    const isLoading = isCheckingOut === code;
    
    return (
      <View
        style={[
          styles.planCardMain,
          { borderColor: plan.color },
          isCurrentPlan && styles.currentPlanCardMain,
        ]}
      >
        {/* Popular badge */}
        {plan.popular && (
          <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
            <Text style={styles.popularBadgeText}>
              {lang === 'fr' ? 'POPULAIRE' : 'POPULAR'}
            </Text>
          </View>
        )}
        
        {/* Current badge */}
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>
              {lang === 'fr' ? '✓ ACTUEL' : '✓ CURRENT'}
            </Text>
          </View>
        )}
        
        {/* Plan name and description */}
        <Text style={[styles.planCardTitle, { color: plan.color }]}>
          {lang === 'fr' ? plan.nameFr : plan.name}
        </Text>
        <Text style={styles.planCardDescription}>
          {lang === 'fr' ? plan.descriptionFr : plan.description}
        </Text>
        
        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>
            {price === 0 ? (lang === 'fr' ? 'Gratuit' : 'Free') : `${price.toFixed(2)}$`}
          </Text>
          {price > 0 && (
            <Text style={styles.pricePeriod}>
              CAD / {selectedBillingCycle === 'monthly' 
                ? (lang === 'fr' ? 'mois' : 'month') 
                : (lang === 'fr' ? 'an' : 'year')}
            </Text>
          )}
        </View>
        
        {/* Trial badge - PILOT & PILOT_PRO only */}
        {hasFreeTrial && (
          <View style={styles.trialBadge}>
            <Ionicons name="gift-outline" size={14} color={COLORS.warning} />
            <Text style={styles.trialBadgeText}>
              {lang === 'fr' ? 'Essai gratuit 7 jours' : '7-day free trial'}
            </Text>
          </View>
        )}
        
        {/* Yearly savings */}
        {selectedBillingCycle === 'yearly' && savings > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              {lang === 'fr' ? `Économisez ${savings}%` : `Save ${savings}%`}
            </Text>
          </View>
        )}
        
        {/* Limits */}
        <View style={styles.limitsContainer}>
          <View style={styles.limitRow}>
            <Ionicons name="airplane" size={16} color={plan.color} />
            <Text style={styles.limitText}>
              {lang === 'fr' ? 'Aéronefs: ' : 'Aircraft: '}
              <Text style={styles.limitValue}>
                {formatLimit(plan.limits.max_aircrafts, lang)}
              </Text>
            </Text>
          </View>
          <View style={styles.limitRow}>
            <Ionicons name="scan" size={16} color={plan.color} />
            <Text style={styles.limitText}>
              OCR/{lang === 'fr' ? 'mois' : 'month'}: 
              <Text style={styles.limitValue}>
                {' '}{formatLimit(plan.limits.ocr_per_month, lang)}
              </Text>
            </Text>
          </View>
          {plan.limits.tea_amo_sharing && (
            <View style={styles.limitRow}>
              <Ionicons name="share-social" size={16} color={plan.color} />
              <Text style={styles.limitText}>
                {lang === 'fr' ? 'Partage TEA/AMO' : 'AME Sharing'}
              </Text>
            </View>
          )}
          {plan.limits.gps_logbook && (
            <View style={styles.limitRow}>
              <Ionicons name="location" size={16} color={plan.color} />
              <Text style={styles.limitText}>
                {lang === 'fr' ? 'Carnet GPS' : 'GPS Logbook'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Action button */}
        {!isCurrentPlan && code !== 'BASIC' && (
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: plan.color }]}
            onPress={() => handleSelectPlan(code)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.selectButtonText}>
                {lang === 'fr' ? 'Choisir ce plan' : 'Choose plan'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        
        {isCurrentPlan && code !== 'BASIC' && (
          <View style={styles.currentPlanIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.currentPlanIndicatorText}>
              {lang === 'fr' ? 'Votre plan actuel' : 'Your current plan'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'fr' ? 'Plans & Abonnement' : 'Plans & Subscription'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshUser}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Current Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '20', borderColor: statusInfo.color }]}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusBannerText, { color: statusInfo.color }]}>
            {statusDisplay}
            {userPlanCode !== 'BASIC' && billingCycle && (
              <Text style={styles.statusBillingText}>
                {' '}({billingCycle === 'yearly' 
                  ? (lang === 'fr' ? 'Annuel' : 'Yearly') 
                  : (lang === 'fr' ? 'Mensuel' : 'Monthly')})
              </Text>
            )}
          </Text>
          {currentPeriodEnd && isActive && userPlanCode !== 'BASIC' && (
            <Text style={styles.statusDateText}>
              {lang === 'fr' ? 'Renouvelle le ' : 'Renews '}{formatDate(currentPeriodEnd)}
            </Text>
          )}
        </View>

        {/* Billing Cycle Toggle */}
        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[
              styles.billingOption,
              selectedBillingCycle === 'monthly' && styles.billingOptionActive
            ]}
            onPress={() => setSelectedBillingCycle('monthly')}
          >
            <Text style={[
              styles.billingOptionText,
              selectedBillingCycle === 'monthly' && styles.billingOptionTextActive
            ]}>
              {lang === 'fr' ? 'Mensuel' : 'Monthly'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingOption,
              selectedBillingCycle === 'yearly' && styles.billingOptionActive
            ]}
            onPress={() => setSelectedBillingCycle('yearly')}
          >
            <Text style={[
              styles.billingOptionText,
              selectedBillingCycle === 'yearly' && styles.billingOptionTextActive
            ]}>
              {lang === 'fr' ? 'Annuel' : 'Yearly'}
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>-17%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ALL 4 PLANS - Always visible */}
        <View style={styles.plansSection}>
          <Text style={styles.plansSectionTitle}>
            {lang === 'fr' ? 'Tous les plans disponibles' : 'All available plans'}
          </Text>
          
          {ALL_PLAN_CODES.map((code) => (
            <PlanCard key={code} code={code} />
          ))}
        </View>

        {/* Cancel Subscription Button */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelModal(true)}
          >
            <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
            <Text style={styles.cancelButtonText}>
              {lang === 'fr' ? 'Annuler l\'abonnement' : 'Cancel Subscription'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textMuted} />
          <Text style={styles.infoNoteText}>
            {lang === 'fr'
              ? 'Paiements sécurisés par Stripe. Tirez vers le bas pour rafraîchir après le paiement.'
              : 'Payments secured by Stripe. Pull down to refresh after payment.'}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isCanceling && setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning-outline" size={48} color={COLORS.danger} />
            <Text style={styles.modalTitle}>
              {lang === 'fr' ? 'Annuler l\'abonnement ?' : 'Cancel Subscription?'}
            </Text>
            <Text style={styles.modalMessage}>
              {lang === 'fr'
                ? 'Vous conserverez l\'accès jusqu\'à la fin de la période de facturation en cours.'
                : 'You will retain access until the end of the current billing period.'}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowCancelModal(false)}
                disabled={isCanceling}
              >
                <Text style={styles.modalCancelButtonText}>
                  {lang === 'fr' ? 'Retour' : 'Go Back'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleCancelSubscription}
                disabled={isCanceling}
              >
                {isCanceling ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    {lang === 'fr' ? 'Confirmer' : 'Confirm'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusBannerText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  statusBillingText: {
    fontWeight: '400',
    opacity: 0.8,
  },
  statusDateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    width: '100%',
    marginTop: 4,
    marginLeft: 20,
  },
  // Billing Toggle
  billingToggle: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  billingOptionActive: {
    backgroundColor: COLORS.primary,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  billingOptionTextActive: {
    color: COLORS.white,
  },
  saveBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Plans Section
  plansSection: {
    marginBottom: 20,
  },
  plansSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  // Plan Card on Main Page
  planCardMain: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  currentPlanCardMain: {
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: -30,
    paddingHorizontal: 40,
    paddingVertical: 4,
    transform: [{ rotate: '45deg' }],
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  currentBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  planCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  planCardDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  pricePeriod: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  trialBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    marginLeft: 4,
  },
  savingsBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  limitsContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  limitValue: {
    fontWeight: '600',
    color: COLORS.textDark,
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  currentPlanIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  currentPlanIndicatorText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Cancel Button
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  cancelButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginLeft: 10,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginHorizontal: 6,
  },
  modalCancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelButtonText: {
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: COLORS.danger,
  },
  modalConfirmButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
