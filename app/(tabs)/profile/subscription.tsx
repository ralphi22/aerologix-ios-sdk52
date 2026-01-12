/**
 * Subscription Management Screen
 * Allows users to manage their Stripe subscription
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { 
  PLAN_PRICING, 
  PlanId, 
  BillingCycle, 
  openCheckout,
  formatPrice,
  getYearlySavings 
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

// Plan display names
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

export default function SubscriptionScreen() {
  const router = useRouter();
  const lang = getLanguage();
  const { user, loadUser } = useAuthStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('monthly');

  // Subscription info
  const planCode = user?.plan_code || user?.subscription?.plan || 'BASIC';
  const subscriptionStatus = user?.subscription?.status || 'inactive';
  const billingCycle = user?.subscription?.billing_cycle || '';
  const stripeSubscriptionId = user?.subscription?.stripe_subscription_id;
  const currentPeriodEnd = user?.subscription?.current_period_end;

  // Display values
  const planDisplay = PLAN_DISPLAY_NAMES[planCode]?.[lang] || PLAN_DISPLAY_NAMES[planCode]?.en || planCode;
  const statusInfo = STATUS_DISPLAY[subscriptionStatus] || STATUS_DISPLAY.inactive;
  const statusDisplay = statusInfo[lang] || statusInfo.en;

  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const canCancel = isActive && stripeSubscriptionId;
  const canSubscribe = !isActive || planCode === 'BASIC';

  const handleBack = () => {
    router.back();
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      await api.post('/api/payments/cancel');
      await loadUser(); // Refresh user data
      setShowCancelModal(false);
      Alert.alert(
        lang === 'fr' ? 'Abonnement annulé' : 'Subscription Canceled',
        lang === 'fr'
          ? 'Votre abonnement a été annulé. Vous conservez l\'accès jusqu\'à la fin de la période en cours.'
          : 'Your subscription has been canceled. You will retain access until the end of the current period.'
      );
    } catch (error: any) {
      setIsCanceling(false);
      const errorMessage = error?.response?.data?.detail || error?.message || 'An error occurred.';
      Alert.alert(
        lang === 'fr' ? 'Erreur' : 'Error',
        errorMessage
      );
    }
  };

  const handleSubscribe = () => {
    setShowPlansModal(true);
  };

  const handleSelectPlan = async (planId: PlanId) => {
    setIsCheckingOut(true);
    try {
      const result = await openCheckout(planId, selectedBillingCycle);
      if (result.success) {
        await loadUser(); // Refresh user data after checkout
        setShowPlansModal(false);
        Alert.alert(
          lang === 'fr' ? 'Succès' : 'Success',
          lang === 'fr'
            ? 'Votre abonnement a été activé !'
            : 'Your subscription has been activated!'
        );
      } else if (result.error) {
        Alert.alert(
          lang === 'fr' ? 'Erreur' : 'Error',
          result.error
        );
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

  // Plan card component
  const PlanCard = ({ planId }: { planId: PlanId }) => {
    const plan = PLAN_PRICING[planId];
    const price = selectedBillingCycle === 'monthly' ? plan.monthly : plan.yearly;
    const savings = getYearlySavings(planId);
    
    return (
      <TouchableOpacity
        style={[
          styles.planCardModal,
          { borderColor: plan.color, borderWidth: plan.popular ? 2 : 1 }
        ]}
        onPress={() => handleSelectPlan(planId)}
        disabled={isCheckingOut}
      >
        {plan.popular && (
          <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
            <Text style={styles.popularBadgeText}>
              {lang === 'fr' ? 'POPULAIRE' : 'POPULAR'}
            </Text>
          </View>
        )}
        
        <Text style={[styles.planCardTitle, { color: plan.color }]}>{plan.name}</Text>
        <Text style={styles.planCardDescription}>{plan.description}</Text>
        
        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>{price.toFixed(2)}$</Text>
          <Text style={styles.pricePeriod}>
            CAD / {selectedBillingCycle === 'monthly' 
              ? (lang === 'fr' ? 'mois' : 'month') 
              : (lang === 'fr' ? 'an' : 'year')}
          </Text>
        </View>
        
        {selectedBillingCycle === 'yearly' && savings > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              {lang === 'fr' ? `Économisez ${savings}%` : `Save ${savings}%`}
            </Text>
          </View>
        )}
        
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={plan.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
        
        <View style={[styles.selectButton, { backgroundColor: plan.color }]}>
          <Text style={styles.selectButtonText}>
            {lang === 'fr' ? 'Sélectionner' : 'Select'}
          </Text>
        </View>
      </TouchableOpacity>
    );
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'fr' ? 'Gérer l\'abonnement' : 'Manage Subscription'}
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Plan Card */}
        <View style={styles.planCard}>
          <Text style={styles.planLabel}>
            {lang === 'fr' ? 'Forfait actuel' : 'Current Plan'}
          </Text>
          <Text style={styles.planName}>{planDisplay}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusDisplay}</Text>
          </View>
        </View>

        {/* Subscription Details */}
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
                  {lang === 'fr' ? 'Prochaine facturation' : 'Next Billing Date'}
                </Text>
                <Text style={styles.detailValue}>
                  {formatDate(currentPeriodEnd)}
                </Text>
              </View>
            </>
          )}

          {stripeSubscriptionId && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {lang === 'fr' ? 'ID Abonnement' : 'Subscription ID'}
                </Text>
                <Text style={styles.detailValueSmall}>
                  {stripeSubscriptionId.slice(0, 20)}...
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {canSubscribe && (
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={handleSubscribe}
            >
              <Ionicons name="rocket-outline" size={20} color={COLORS.white} />
              <Text style={styles.subscribeButtonText}>
                {lang === 'fr' ? 'Choisir un forfait' : 'Choose a Plan'}
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
              ? 'Les paiements sont gérés de manière sécurisée par Stripe.'
              : 'Payments are securely managed by Stripe.'}
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
  backText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
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
  // Plan card
  planCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
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
  detailValueSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  // Actions
  actionsSection: {
    gap: 12,
    marginBottom: 24,
  },
  subscribeButton: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  subscribeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
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
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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
});
