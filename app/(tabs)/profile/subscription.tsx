/**
 * Subscription Management Screen
 * Displays plan_code + limits from user store
 * Launches Stripe Checkout via backend
 * After success: GET /api/auth/me -> update store
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
  PAID_PLANS,
  PlanCode, 
  BillingCycle, 
  openCheckout,
  formatLimit,
  formatPrice,
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

// Status display
const STATUS_DISPLAY: Record<string, { en: string; fr: string; color: string }> = {
  active: { en: 'Active', fr: 'Actif', color: COLORS.success },
  trialing: { en: 'Trial', fr: 'Essai', color: COLORS.warning },
  canceled: { en: 'Canceled', fr: 'Annulé', color: COLORS.danger },
  past_due: { en: 'Past Due', fr: 'Impayé', color: COLORS.danger },
  inactive: { en: 'Inactive', fr: 'Inactif', color: COLORS.textMuted },
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const lang = getLanguage() as 'en' | 'fr';
  const { user, loadUser } = useAuthStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('monthly');

  // User data from store
  const planCode = (user?.plan_code || 'BASIC') as PlanCode;
  const limits = user?.limits;
  const subscription = user?.subscription;
  const subscriptionStatus = subscription?.status || 'inactive';
  const billingCycle = subscription?.billing_cycle || '';
  const stripeSubscriptionId = subscription?.stripe_subscription_id;
  const currentPeriodEnd = subscription?.current_period_end;

  // Current plan info
  const currentPlan = PLANS[planCode] || PLANS.BASIC;
  const statusInfo = STATUS_DISPLAY[subscriptionStatus] || STATUS_DISPLAY.inactive;
  const statusDisplay = statusInfo[lang] || statusInfo.en;

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const canCancel = isActive && stripeSubscriptionId;
  const canSubscribe = !isActive || planCode === 'BASIC';

  // Refresh user data on mount and return from checkout
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

  // Initial load
  useEffect(() => {
    refreshUser();
  }, []);

  // Refresh on screen focus (when user returns from checkout browser)
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  // Refresh when app returns to foreground (after Stripe checkout in browser)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came back to foreground - refresh user data
        refreshUser();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [refreshUser]);

  const handleBack = () => {
    router.back();
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      await cancelSubscription();
      await loadUser(); // Refresh user data
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

  const handleSubscribe = () => {
    setShowPlansModal(true);
  };

  const handleSelectPlan = async (selectedPlanCode: PlanCode) => {
    if (selectedPlanCode === 'BASIC') return;
    
    setIsCheckingOut(true);
    try {
      const result = await openCheckout(selectedPlanCode, selectedBillingCycle);
      
      if (result.success) {
        // Close modal
        setShowPlansModal(false);
        
        // Alert user to return after checkout
        Alert.alert(
          lang === 'fr' ? 'Checkout ouvert' : 'Checkout Opened',
          lang === 'fr'
            ? 'Complétez le paiement dans votre navigateur. Tirez vers le bas pour rafraîchir après le paiement.'
            : 'Complete payment in your browser. Pull down to refresh after payment.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh user data after a delay
                setTimeout(() => refreshUser(), 2000);
              }
            }
          ]
        );
      } else if (result.error) {
        Alert.alert(lang === 'fr' ? 'Erreur' : 'Error', result.error);
      }
    } catch (error: any) {
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        error?.message || 'An error occurred'
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Format date
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

  // Plan card for modal
  const PlanCard = ({ code }: { code: PlanCode }) => {
    const plan = PLANS[code];
    const price = selectedBillingCycle === 'monthly' ? plan.monthly : plan.yearly;
    const savings = getYearlySavings(code);
    const isCurrentPlan = code === planCode;
    
    return (
      <TouchableOpacity
        style={[
          styles.planCardModal,
          { borderColor: plan.color, borderWidth: plan.popular ? 2 : 1 },
          isCurrentPlan && styles.currentPlanCard,
        ]}
        onPress={() => !isCurrentPlan && handleSelectPlan(code)}
        disabled={isCheckingOut || isCurrentPlan}
        activeOpacity={0.7}
      >
        {plan.popular && (
          <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
            <Text style={styles.popularBadgeText}>
              {lang === 'fr' ? 'POPULAIRE' : 'POPULAR'}
            </Text>
          </View>
        )}
        
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>
              {lang === 'fr' ? 'ACTUEL' : 'CURRENT'}
            </Text>
          </View>
        )}
        
        <Text style={[styles.planCardTitle, { color: plan.color }]}>
          {lang === 'fr' ? plan.nameFr : plan.name}
        </Text>
        <Text style={styles.planCardDescription}>
          {lang === 'fr' ? plan.descriptionFr : plan.description}
        </Text>
        
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
              OCR/mois: 
              <Text style={styles.limitValue}>
                {formatLimit(plan.limits.ocr_per_month, lang)}
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
        
        {!isCurrentPlan && code !== 'BASIC' && (
          <View style={[styles.selectButton, { backgroundColor: plan.color }]}>
            <Text style={styles.selectButtonText}>
              {lang === 'fr' ? 'Sélectionner' : 'Select'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
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
          {lang === 'fr' ? 'Gérer l\'abonnement' : 'Manage Subscription'}
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
        {/* Current Plan Card */}
        <View style={[styles.planCard, { borderLeftColor: currentPlan.color }]}>
          <Text style={styles.planLabel}>
            {lang === 'fr' ? 'Forfait actuel' : 'Current Plan'}
          </Text>
          <Text style={[styles.planName, { color: currentPlan.color }]}>
            {lang === 'fr' ? currentPlan.nameFr : currentPlan.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusDisplay}</Text>
          </View>
        </View>

        {/* Current Limits from user.limits */}
        {limits && (
          <View style={styles.limitsCard}>
            <Text style={styles.limitsTitle}>
              {lang === 'fr' ? 'Vos limites' : 'Your Limits'}
            </Text>
            
            <View style={styles.limitItem}>
              <View style={styles.limitIconContainer}>
                <Ionicons name="airplane" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.limitInfo}>
                <Text style={styles.limitLabel}>
                  {lang === 'fr' ? 'Aéronefs max' : 'Max Aircraft'}
                </Text>
                <Text style={styles.limitValueLarge}>
                  {formatLimit(limits.max_aircrafts, lang)}
                </Text>
              </View>
            </View>

            <View style={styles.limitDivider} />

            <View style={styles.limitItem}>
              <View style={styles.limitIconContainer}>
                <Ionicons name="scan" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.limitInfo}>
                <Text style={styles.limitLabel}>
                  {lang === 'fr' ? 'OCR par mois' : 'OCR per Month'}
                </Text>
                <Text style={styles.limitValueLarge}>
                  {formatLimit(limits.ocr_per_month, lang)}
                </Text>
              </View>
            </View>

            <View style={styles.limitDivider} />

            {/* Feature toggles */}
            <View style={styles.featuresGrid}>
              <FeatureItem 
                icon="location" 
                label={lang === 'fr' ? 'GPS Logbook' : 'GPS Logbook'} 
                enabled={limits.gps_logbook} 
              />
              <FeatureItem 
                icon="share-social" 
                label={lang === 'fr' ? 'Partage TEA' : 'AME Sharing'} 
                enabled={limits.tea_amo_sharing} 
              />
              <FeatureItem 
                icon="receipt" 
                label={lang === 'fr' ? 'Factures' : 'Invoices'} 
                enabled={limits.invoices} 
              />
              <FeatureItem 
                icon="calculator" 
                label={lang === 'fr' ? 'Coût/heure' : 'Cost/Hour'} 
                enabled={limits.cost_per_hour} 
              />
            </View>
          </View>
        )}

        {/* Subscription Details */}
        {(billingCycle || currentPeriodEnd || stripeSubscriptionId) && (
          <View style={styles.detailsCard}>
            {billingCycle && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {lang === 'fr' ? 'Cycle de facturation' : 'Billing Cycle'}
                </Text>
                <Text style={styles.detailValue}>
                  {billingCycle === 'yearly'
                    ? (lang === 'fr' ? 'Annuel' : 'Yearly')
                    : (lang === 'fr' ? 'Mensuel' : 'Monthly')}
                </Text>
              </View>
            )}

            {currentPeriodEnd && isActive && (
              <>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {lang === 'fr' ? 'Prochaine facturation' : 'Next Billing'}
                  </Text>
                  <Text style={styles.detailValue}>
                    {formatDate(currentPeriodEnd)}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {canSubscribe && (
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={handleSubscribe}
            >
              <Ionicons name="rocket-outline" size={20} color={COLORS.white} />
              <Text style={styles.subscribeButtonText}>
                {planCode === 'BASIC' 
                  ? (lang === 'fr' ? 'Passer à un forfait payant' : 'Upgrade to Paid Plan')
                  : (lang === 'fr' ? 'Changer de forfait' : 'Change Plan')}
              </Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCancelModal(true)}
            >
              <Text style={styles.cancelButtonText}>
                {lang === 'fr' ? 'Annuler l\'abonnement' : 'Cancel Subscription'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textMuted} />
          <Text style={styles.infoNoteText}>
            {lang === 'fr'
              ? 'Les paiements sont gérés de manière sécurisée par Stripe. Tirez vers le bas pour rafraîchir après le paiement.'
              : 'Payments are securely managed by Stripe. Pull down to refresh after payment.'}
          </Text>
        </View>
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
            <Text style={styles.modalTitle}>
              {lang === 'fr' ? 'Annuler l\'abonnement' : 'Cancel Subscription'}
            </Text>
            <Text style={styles.modalMessage}>
              {lang === 'fr'
                ? 'Êtes-vous sûr de vouloir annuler votre abonnement ? Vous conserverez l\'accès jusqu\'à la fin de la période de facturation en cours.'
                : 'Are you sure you want to cancel your subscription? You will retain access until the end of the current billing period.'}
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

      {/* Plans Selection Modal */}
      <Modal
        visible={showPlansModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isCheckingOut && setShowPlansModal(false)}
      >
        <View style={styles.plansModalOverlay}>
          <View style={styles.plansModalContent}>
            {/* Modal Header */}
            <View style={styles.plansModalHeader}>
              <Text style={styles.plansModalTitle}>
                {lang === 'fr' ? 'Choisir un forfait' : 'Choose a Plan'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPlansModal(false)}
                disabled={isCheckingOut}
              >
                <Ionicons name="close" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
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

            {/* Loading overlay */}
            {isCheckingOut && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  {lang === 'fr' ? 'Ouverture du checkout...' : 'Opening checkout...'}
                </Text>
              </View>
            )}

            {/* Plans List */}
            <ScrollView 
              style={styles.plansScrollView}
              contentContainerStyle={styles.plansScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Free Plan */}
              <PlanCard code="BASIC" />
              
              {/* Paid Plans */}
              {PAID_PLANS.map((code) => (
                <PlanCard key={code} code={code} />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Feature item component
function FeatureItem({ icon, label, enabled }: { icon: string; label: string; enabled: boolean }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons 
        name={enabled ? 'checkmark-circle' : 'close-circle'} 
        size={18} 
        color={enabled ? COLORS.success : COLORS.textMuted} 
      />
      <Text style={[styles.featureLabel, !enabled && styles.featureDisabled]}>
        {label}
      </Text>
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
    paddingBottom: 40,
  },
  // Current Plan card
  planCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  planLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: 8,
  },
  planName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Limits card
  limitsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  limitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  limitInfo: {
    flex: 1,
  },
  limitLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  limitValueLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  limitDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 6,
  },
  featureLabel: {
    fontSize: 13,
    color: COLORS.textDark,
    marginLeft: 6,
  },
  featureDisabled: {
    color: COLORS.textMuted,
  },
  // Details card
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  // Actions
  actionsSection: {
    marginBottom: 24,
  },
  subscribeButton: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginLeft: 8,
  },
  // Cancel Modal
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: COLORS.textMuted,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
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
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: COLORS.danger,
  },
  modalConfirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Plans Modal
  plansModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  plansModalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  plansModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  plansModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  billingToggle: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  plansScrollView: {
    flex: 1,
  },
  plansScrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  // Plan Card in Modal
  planCardModal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  currentPlanCard: {
    opacity: 0.6,
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
    backgroundColor: COLORS.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  planCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
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
  savingsBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
  },
  limitsContainer: {
    marginBottom: 16,
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
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
