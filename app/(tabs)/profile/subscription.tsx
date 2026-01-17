/**
 * Subscription Management Screen
 * 
 * iOS: Uses RevenueCat for In-App Purchases (Apple IAP)
 * - Loads offerings: pilot, pilot_pro, fleet
 * - Each offering has $rc_monthly and $rc_annual packages
 * - Checks entitlements: pilot, pilot_pro, fleet
 * 
 * FLOW:
 * 1. initRevenueCat()
 * 2. Load offerings + customerInfo in parallel
 * 3. User selects plan
 * 4. purchasePackage() / restorePurchases()
 * 5. Refresh customerInfo
 * 6. GET /api/auth/me to sync backend
 * 7. UI updated
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getLanguage } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import {
  initRevenueCat,
  getOfferings,
  getCustomerInfo,
  purchasePackage,
  restorePurchases,
  hasEntitlement,
  getPackage,
  OFFERING_IDS,
  ENTITLEMENT_IDS,
  PACKAGE_IDS,
  SUBSCRIPTION_MANAGEMENT_URL,
  type PurchasesOfferings,
  type CustomerInfo,
  type PurchasesPackage,
} from '@/services/revenuecatService';
import {
  PLANS,
  PlanCode,
  formatLimit,
} from '@/services/paymentService';

// ============================================
// CONSTANTS
// ============================================

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

// Plan codes to display (always show all 4)
const ALL_PLAN_CODES: PlanCode[] = ['BASIC', 'PILOT', 'PILOT_PRO', 'FLEET'];

// Billing cycle type
type BillingCycle = 'monthly' | 'yearly';

/**
 * Get the RevenueCat offering ID for a plan code
 * CRITICAL: Each plan MUST map to its own offering
 * - PILOT → offerings.all.pilot
 * - PILOT_PRO → offerings.all.pilot_pro  
 * - FLEET → offerings.all.fleet
 */
const getOfferingIdForPlan = (planCode: PlanCode): typeof OFFERING_IDS[keyof typeof OFFERING_IDS] | null => {
  switch (planCode) {
    case 'PILOT':
      return OFFERING_IDS.PILOT; // 'pilot'
    case 'PILOT_PRO':
      return OFFERING_IDS.PILOT_PRO; // 'pilot_pro'
    case 'FLEET':
      return OFFERING_IDS.FLEET; // 'fleet'
    default:
      return null;
  }
};

/**
 * Get the RevenueCat entitlement ID for a plan code
 */
const getEntitlementIdForPlan = (planCode: PlanCode): typeof ENTITLEMENT_IDS[keyof typeof ENTITLEMENT_IDS] | null => {
  switch (planCode) {
    case 'PILOT':
      return ENTITLEMENT_IDS.PILOT;
    case 'PILOT_PRO':
      return ENTITLEMENT_IDS.PILOT_PRO;
    case 'FLEET':
      return ENTITLEMENT_IDS.FLEET;
    default:
      return null;
  }
};

// ============================================
// TRANSLATIONS
// ============================================

const TEXTS = {
  en: {
    title: 'Plans & Subscription',
    allPlans: 'All available plans',
    monthly: 'Monthly',
    yearly: 'Yearly',
    subscribe: 'Subscribe',
    restorePurchases: 'Restore Purchases',
    manageSubscription: 'Manage Subscription',
    active: 'Active',
    current: 'CURRENT',
    popular: 'POPULAR',
    free: 'Free',
    choosePlan: 'Choose plan',
    yourCurrentPlan: 'Your current plan',
    loading: 'Loading...',
    loadingPlans: 'Loading plans...',
    errorLoading: 'Error loading plans',
    tryAgain: 'Try Again',
    purchaseCancelled: 'Purchase cancelled',
    purchaseError: 'Purchase error',
    purchaseSuccess: 'Purchase successful!',
    purchaseSuccessMessage: 'Your subscription is now active.',
    restoreSuccess: 'Purchases restored!',
    restoreSuccessMessage: 'Your subscription has been restored.',
    restoreNoSubscription: 'No subscription found',
    restoreNoSubscriptionMessage: 'No previous purchases found to restore.',
    networkError: 'Network error. Please check your connection.',
    unknownError: 'An unexpected error occurred.',
    securityNote: 'Payments secured by Apple. Subscriptions renew automatically.',
    freeTrial: '7-day free trial',
    save: 'Save',
    perMonth: 'month',
    perYear: 'year',
    aircraft: 'Aircraft',
    ocrMonth: 'OCR/month',
    ameSharing: 'AME Sharing',
    gpsLogbook: 'GPS Logbook',
    unlimited: 'Unlimited',
    notAvailable: 'Not available on this platform',
  },
  fr: {
    title: 'Plans & Abonnement',
    allPlans: 'Tous les plans disponibles',
    monthly: 'Mensuel',
    yearly: 'Annuel',
    subscribe: 'S\'abonner',
    restorePurchases: 'Restaurer les achats',
    manageSubscription: 'Gérer l\'abonnement',
    active: 'Actif',
    current: 'ACTUEL',
    popular: 'POPULAIRE',
    free: 'Gratuit',
    choosePlan: 'Choisir ce plan',
    yourCurrentPlan: 'Votre plan actuel',
    loading: 'Chargement...',
    loadingPlans: 'Chargement des plans...',
    errorLoading: 'Erreur de chargement',
    tryAgain: 'Réessayer',
    purchaseCancelled: 'Achat annulé',
    purchaseError: 'Erreur d\'achat',
    purchaseSuccess: 'Achat réussi !',
    purchaseSuccessMessage: 'Votre abonnement est maintenant actif.',
    restoreSuccess: 'Achats restaurés !',
    restoreSuccessMessage: 'Votre abonnement a été restauré.',
    restoreNoSubscription: 'Aucun abonnement trouvé',
    restoreNoSubscriptionMessage: 'Aucun achat précédent trouvé à restaurer.',
    networkError: 'Erreur réseau. Vérifiez votre connexion.',
    unknownError: 'Une erreur inattendue s\'est produite.',
    securityNote: 'Paiements sécurisés par Apple. Les abonnements se renouvellent automatiquement.',
    freeTrial: 'Essai gratuit 7 jours',
    save: 'Économisez',
    perMonth: 'mois',
    perYear: 'an',
    aircraft: 'Aéronefs',
    ocrMonth: 'OCR/mois',
    ameSharing: 'Partage TEA/AMO',
    gpsLogbook: 'Carnet GPS',
    unlimited: 'Illimité',
    notAvailable: 'Non disponible sur cette plateforme',
  },
};

// ============================================
// COMPONENT
// ============================================

export default function SubscriptionScreen() {
  const router = useRouter();
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];
  const { user, loadUser } = useAuthStore();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState<PlanCode | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycle>('monthly');

  // Determine current plan from RevenueCat entitlements
  const getCurrentPlanCode = useCallback((): PlanCode => {
    if (!customerInfo) return 'BASIC';
    if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.FLEET)) return 'FLEET';
    if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.PILOT_PRO)) return 'PILOT_PRO';
    if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.PILOT)) return 'PILOT';
    return 'BASIC';
  }, [customerInfo]);

  const currentPlanCode = getCurrentPlanCode();

  // ============================================
  // INITIALIZATION & DATA LOADING
  // ============================================

  const loadRevenueCatData = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return;
    }

    try {
      // Initialize RevenueCat
      const initialized = await initRevenueCat(user?.id);
      if (!initialized) {
        setError(texts.errorLoading);
        setIsLoading(false);
        return;
      }

      // Load offerings and customer info in parallel
      const [offeringsData, customerInfoData] = await Promise.all([
        getOfferings(),
        getCustomerInfo(),
      ]);

      setOfferings(offeringsData);
      setCustomerInfo(customerInfoData);
      setError(null);
    } catch (err) {
      console.error('Error loading RevenueCat data:', err);
      setError(texts.errorLoading);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, texts.errorLoading]);

  // Initial load
  useEffect(() => {
    loadRevenueCatData();
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        loadRevenueCatData();
      }
    }, [loadRevenueCatData, isLoading])
  );

  // Pull to refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRevenueCatData();
    await loadUser();
    setIsRefreshing(false);
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleBack = () => {
    router.back();
  };

  const handleSubscribe = async (planCode: PlanCode) => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Info', texts.notAvailable);
      return;
    }

    if (planCode === 'BASIC' || planCode === currentPlanCode) return;

    // Get the CORRECT offering for this specific plan
    const offeringId = getOfferingIdForPlan(planCode);
    if (!offeringId) {
      console.error(`[Subscription] No offering ID for plan: ${planCode}`);
      return;
    }

    const packageId = selectedBillingCycle === 'monthly' 
      ? PACKAGE_IDS.MONTHLY 
      : PACKAGE_IDS.ANNUAL;

    // Get the package from the CORRECT offering (not a different one!)
    const pkg = getPackage(offerings, offeringId, packageId);
    if (!pkg) {
      console.error(`[Subscription] Package not found: ${offeringId} / ${packageId}`);
      Alert.alert(texts.purchaseError, texts.errorLoading);
      return;
    }

    // Log which product is being purchased for debugging
    console.log(`[Subscription] Purchasing: plan=${planCode}, offering=${offeringId}, package=${packageId}, productId=${pkg.product.identifier}`);

    setIsPurchasing(planCode);

    try {
      const result = await purchasePackage(pkg);

      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        
        // Sync with backend
        await loadUser();

        Alert.alert(texts.purchaseSuccess, texts.purchaseSuccessMessage);
      } else if (result.error) {
        if (result.error.userCancelled) {
          // User cancelled - no alert needed
          console.log('Purchase cancelled by user');
        } else {
          Alert.alert(texts.purchaseError, result.error.message);
        }
      }
    } catch (err) {
      console.error('Purchase error:', err);
      Alert.alert(texts.purchaseError, texts.unknownError);
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleRestorePurchases = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Info', texts.notAvailable);
      return;
    }

    setIsRestoring(true);

    try {
      const result = await restorePurchases();

      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        
        // Check if any subscription was restored
        const restoredPlan = (() => {
          if (hasEntitlement(result.customerInfo, ENTITLEMENT_IDS.FLEET)) return 'FLEET';
          if (hasEntitlement(result.customerInfo, ENTITLEMENT_IDS.PILOT_PRO)) return 'PILOT_PRO';
          if (hasEntitlement(result.customerInfo, ENTITLEMENT_IDS.PILOT)) return 'PILOT';
          return null;
        })();

        if (restoredPlan) {
          // Sync with backend
          await loadUser();
          Alert.alert(texts.restoreSuccess, texts.restoreSuccessMessage);
        } else {
          Alert.alert(texts.restoreNoSubscription, texts.restoreNoSubscriptionMessage);
        }
      } else if (result.error) {
        Alert.alert(texts.purchaseError, result.error.message);
      }
    } catch (err) {
      console.error('Restore error:', err);
      Alert.alert(texts.purchaseError, texts.unknownError);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    Linking.openURL(SUBSCRIPTION_MANAGEMENT_URL);
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Check if a package is available for a plan
   * Used to disable Subscribe button when package not loaded
   */
  const isPackageAvailable = (planCode: PlanCode, billingCycle: BillingCycle): boolean => {
    if (planCode === 'BASIC') return true;
    if (Platform.OS !== 'ios' || !offerings) return false;

    const offeringId = getOfferingIdForPlan(planCode);
    if (!offeringId) return false;

    const packageId = billingCycle === 'monthly' ? PACKAGE_IDS.MONTHLY : PACKAGE_IDS.ANNUAL;
    const pkg = getPackage(offerings, offeringId, packageId);
    
    return pkg !== null;
  };

  /**
   * Get the price string for a plan from RevenueCat
   * IMPORTANT: Prices come ONLY from RevenueCat (package.product.priceString)
   * NO static prices, NO fallbacks to PLANS
   */
  const getPriceString = (planCode: PlanCode, billingCycle: BillingCycle): string => {
    // BASIC is always free
    if (planCode === 'BASIC') return texts.free;
    
    // Not iOS - show dash (not available)
    if (Platform.OS !== 'ios') {
      return '—';
    }
    
    // Still loading offerings - show loading text
    if (isLoading || !offerings) {
      return texts.loading;
    }

    // Get the CORRECT offering for this plan
    const offeringId = getOfferingIdForPlan(planCode);
    if (!offeringId) {
      console.warn(`[Subscription] No offering ID for plan: ${planCode}`);
      return '—';
    }

    // Get the package from the CORRECT offering using availablePackages.find()
    const offering = offerings.all[offeringId];
    if (!offering) {
      console.warn(`[Subscription] Offering not found: ${offeringId}`);
      return '—';
    }

    const packageId = billingCycle === 'monthly' ? PACKAGE_IDS.MONTHLY : PACKAGE_IDS.ANNUAL;
    const pkg = offering.availablePackages.find(p => p.identifier === packageId);

    if (!pkg) {
      console.warn(`[Subscription] Package not found: ${offeringId} / ${packageId}`);
      return '—';
    }

    // Return ONLY the RevenueCat price string - no fallbacks
    return pkg.product.priceString;
  };

  /**
   * Calculate yearly savings percentage from RevenueCat prices
   * Uses actual Apple prices, not static values
   */
  const getYearlySavings = (planCode: PlanCode): number => {
    if (planCode === 'BASIC' || Platform.OS !== 'ios' || !offerings) return 0;

    const offeringId = getOfferingIdForPlan(planCode);
    if (!offeringId) return 0;

    const offering = offerings.all[offeringId];
    if (!offering) return 0;

    // Use availablePackages.find() - NOT offering.monthly or offering.annual
    const monthlyPkg = offering.availablePackages.find(p => p.identifier === PACKAGE_IDS.MONTHLY);
    const annualPkg = offering.availablePackages.find(p => p.identifier === PACKAGE_IDS.ANNUAL);

    if (!monthlyPkg || !annualPkg) return 0;

    const monthlyPrice = monthlyPkg.product.price;
    const annualPrice = annualPkg.product.price;

    if (monthlyPrice <= 0) return 0;

    const monthlyTotal = monthlyPrice * 12;
    const savings = ((monthlyTotal - annualPrice) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  // ============================================
  // PLAN CARD COMPONENT
  // ============================================

  const PlanCard = ({ code }: { code: PlanCode }) => {
    const plan = PLANS[code];
    if (!plan) return null;

    const isCurrentPlan = code === currentPlanCode;
    const hasFreeTrial = code === 'PILOT' || code === 'PILOT_PRO';
    const isLoadingThisPlan = isPurchasing === code;
    const priceString = getPriceString(code, selectedBillingCycle);
    const savings = getYearlySavings(code);

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
            <Text style={styles.popularBadgeText}>{texts.popular}</Text>
          </View>
        )}

        {/* Current badge */}
        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>✓ {texts.current}</Text>
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
          <Text style={styles.priceAmount}>{priceString}</Text>
          {code !== 'BASIC' && (
            <Text style={styles.pricePeriod}>
              / {selectedBillingCycle === 'monthly' ? texts.perMonth : texts.perYear}
            </Text>
          )}
        </View>

        {/* Trial badge - PILOT & PILOT_PRO only */}
        {hasFreeTrial && (
          <View style={styles.trialBadge}>
            <Ionicons name="gift-outline" size={14} color={COLORS.warning} />
            <Text style={styles.trialBadgeText}>{texts.freeTrial}</Text>
          </View>
        )}

        {/* Yearly savings */}
        {selectedBillingCycle === 'yearly' && savings > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>
              {texts.save} {savings}%
            </Text>
          </View>
        )}

        {/* Limits */}
        <View style={styles.limitsContainer}>
          <View style={styles.limitRow}>
            <Ionicons name="airplane" size={16} color={plan.color} />
            <Text style={styles.limitText}>
              {texts.aircraft}:{' '}
              <Text style={styles.limitValue}>
                {formatLimit(plan.limits.max_aircrafts, lang)}
              </Text>
            </Text>
          </View>
          <View style={styles.limitRow}>
            <Ionicons name="scan" size={16} color={plan.color} />
            <Text style={styles.limitText}>
              {texts.ocrMonth}:{' '}
              <Text style={styles.limitValue}>
                {formatLimit(plan.limits.ocr_per_month, lang)}
              </Text>
            </Text>
          </View>
          {plan.limits.tea_amo_sharing && (
            <View style={styles.limitRow}>
              <Ionicons name="share-social" size={16} color={plan.color} />
              <Text style={styles.limitText}>{texts.ameSharing}</Text>
            </View>
          )}
          {plan.limits.gps_logbook && (
            <View style={styles.limitRow}>
              <Ionicons name="location" size={16} color={plan.color} />
              <Text style={styles.limitText}>{texts.gpsLogbook}</Text>
            </View>
          )}
        </View>

        {/* Action button */}
        {!isCurrentPlan && code !== 'BASIC' && Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.selectButton, { backgroundColor: plan.color }]}
            onPress={() => handleSubscribe(code)}
            disabled={isLoadingThisPlan || isPurchasing !== null}
            activeOpacity={0.7}
          >
            {isLoadingThisPlan ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.selectButtonText}>{texts.choosePlan}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Current plan indicator */}
        {isCurrentPlan && code !== 'BASIC' && (
          <View style={styles.currentPlanIndicator}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.currentPlanIndicatorText}>{texts.yourCurrentPlan}</Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{texts.title}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{texts.loadingPlans}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && Platform.OS === 'ios') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{texts.title}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRevenueCatData}>
            <Text style={styles.retryButtonText}>{texts.tryAgain}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{texts.title}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Current Status Banner */}
        {currentPlanCode !== 'BASIC' && (
          <View style={[styles.statusBanner, { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }]}>
            <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
            <Text style={[styles.statusBannerText, { color: COLORS.success }]}>
              {texts.active}: {PLANS[currentPlanCode]?.name || currentPlanCode}
            </Text>
          </View>
        )}

        {/* Billing Cycle Toggle - Only show on iOS */}
        {Platform.OS === 'ios' && (
          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.billingOption,
                selectedBillingCycle === 'monthly' && styles.billingOptionActive,
              ]}
              onPress={() => setSelectedBillingCycle('monthly')}
            >
              <Text
                style={[
                  styles.billingOptionText,
                  selectedBillingCycle === 'monthly' && styles.billingOptionTextActive,
                ]}
              >
                {texts.monthly}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.billingOption,
                selectedBillingCycle === 'yearly' && styles.billingOptionActive,
              ]}
              onPress={() => setSelectedBillingCycle('yearly')}
            >
              <Text
                style={[
                  styles.billingOptionText,
                  selectedBillingCycle === 'yearly' && styles.billingOptionTextActive,
                ]}
              >
                {texts.yearly}
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>-17%</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ALL 4 PLANS - Always visible */}
        <View style={styles.plansSection}>
          <Text style={styles.plansSectionTitle}>{texts.allPlans}</Text>
          {ALL_PLAN_CODES.map((code) => (
            <PlanCard key={code} code={code} />
          ))}
        </View>

        {/* Restore Purchases Button - iOS only */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
                <Text style={styles.restoreButtonText}>{texts.restorePurchases}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Manage Subscription Button - iOS only, when subscribed */}
        {Platform.OS === 'ios' && currentPlanCode !== 'BASIC' && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleManageSubscription}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.manageButtonText}>{texts.manageSubscription}</Text>
          </TouchableOpacity>
        )}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textMuted} />
          <Text style={styles.infoNoteText}>{texts.securityNote}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

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
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
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
  // Plan Card
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
  // Restore Button
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  restoreButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Manage Button
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  manageButtonText: {
    color: COLORS.textMuted,
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
});
