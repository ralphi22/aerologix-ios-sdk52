/**
 * Subscription Management Screen - DYNAMIC VERSION
 * 
 * Apple Review Guideline 2.1 Compliant:
 * - Uses offerings.current dynamically instead of hardcoded offering IDs
 * - Renders whatever packages RevenueCat returns
 * - Handles all states: loading, error, empty, available
 * 
 * FLOW:
 * 1. initRevenueCat()
 * 2. Load offerings.current + customerInfo in parallel
 * 3. Dynamically display available packages
 * 4. User selects package
 * 5. purchasePackage() / restorePurchases()
 * 6. Refresh customerInfo
 * 7. GET /api/auth/me to sync backend
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ENTITLEMENT_IDS,
  SUBSCRIPTION_MANAGEMENT_URL,
  type PurchasesOfferings,
  type CustomerInfo,
  type PurchasesPackage,
} from '@/services/revenuecatService';

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

// Package type colors for visual distinction
const PACKAGE_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#10B981', // Green
  '#EF4444', // Red
];

// ============================================
// TRANSLATIONS
// ============================================

const TEXTS = {
  en: {
    title: 'Plans & Subscription',
    availablePlans: 'Available Plans',
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
    errorLoading: 'Subscriptions unavailable. Please try again later.',
    noPlansAvailable: 'No subscription plans are currently available.',
    tryAgain: 'Try Again',
    purchaseCancelled: 'Purchase cancelled',
    purchaseError: 'Purchase error',
    purchaseSuccess: 'Purchase successful!',
    purchaseSuccessMessage: 'Your subscription is now active.',
    restoreSuccess: 'Purchases restored!',
    restoreSuccessMessage: 'Your subscription has been restored.',
    restoreNoSubscription: 'No active subscription to restore.',
    networkError: 'Network error. Please check your connection.',
    unknownError: 'An unexpected error occurred.',
    securityNote: 'Payments secured by Apple. Subscriptions renew automatically.',
    freeTrial: '7-day free trial',
    save: 'Save',
    perMonth: 'month',
    perYear: 'year',
    basicPlan: 'Basic Plan',
    basicDescription: 'Free tier with limited features',
    notAvailable: 'Not available on this platform',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use (EULA)',
  },
  fr: {
    title: 'Plans & Abonnement',
    availablePlans: 'Plans disponibles',
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
    errorLoading: 'Abonnements indisponibles. Veuillez réessayer plus tard.',
    noPlansAvailable: 'Aucun plan d\'abonnement n\'est actuellement disponible.',
    tryAgain: 'Réessayer',
    purchaseCancelled: 'Achat annulé',
    purchaseError: 'Erreur d\'achat',
    purchaseSuccess: 'Achat réussi !',
    purchaseSuccessMessage: 'Votre abonnement est maintenant actif.',
    restoreSuccess: 'Achats restaurés !',
    restoreSuccessMessage: 'Votre abonnement a été restauré.',
    restoreNoSubscription: 'Aucun abonnement actif à restaurer.',
    networkError: 'Erreur réseau. Vérifiez votre connexion.',
    unknownError: 'Une erreur inattendue s\'est produite.',
    securityNote: 'Paiements sécurisés par Apple. Les abonnements se renouvellent automatiquement.',
    freeTrial: 'Essai gratuit 7 jours',
    save: 'Économisez',
    perMonth: 'mois',
    perYear: 'an',
    basicPlan: 'Plan Basic',
    basicDescription: 'Gratuit avec fonctionnalités limitées',
    notAvailable: 'Non disponible sur cette plateforme',
    privacyPolicy: 'Politique de confidentialité',
    termsOfUse: 'Conditions d\'utilisation (EULA)',
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
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Get available packages from offerings.current dynamically
  const availablePackages = useMemo((): PurchasesPackage[] => {
    if (!offerings?.current?.availablePackages) {
      return [];
    }
    return offerings.current.availablePackages;
  }, [offerings]);

  // Check if user has any active subscription
  const hasActiveSubscription = useMemo((): boolean => {
    if (!customerInfo) return false;
    return (
      hasEntitlement(customerInfo, ENTITLEMENT_IDS.FLEET) ||
      hasEntitlement(customerInfo, ENTITLEMENT_IDS.PILOT_PRO) ||
      hasEntitlement(customerInfo, ENTITLEMENT_IDS.PILOT)
    );
  }, [customerInfo]);

  // Get active plan name for display
  const activePlanName = useMemo((): string | null => {
    if (!customerInfo) return null;
    if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.FLEET)) return 'Fleet';
    if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.PILOT_PRO)) return 'Pilot Pro';
    if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.PILOT)) return 'Pilot';
    return null;
  }, [customerInfo]);

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

      console.log('[Subscription] Offerings loaded:', offeringsData?.current?.identifier || 'none');
      console.log('[Subscription] Available packages:', offeringsData?.current?.availablePackages?.length || 0);

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

  /**
   * Handle subscription purchase - DYNAMIC
   * Accepts any PurchasesPackage from offerings.current
   */
  const handleSubscribe = async (pkg: PurchasesPackage) => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Info', texts.notAvailable);
      return;
    }

    // Log which product is being purchased for debugging
    console.log(`[Subscription] Purchasing: package=${pkg.identifier}, productId=${pkg.product.identifier}, price=${pkg.product.priceString}`);

    setPurchasingPackageId(pkg.identifier);

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
      setPurchasingPackageId(null);
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
          // Apple-compliant neutral message when no subscription found
          Alert.alert('', texts.restoreNoSubscription);
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
   * Get a color for a package based on its index
   */
  const getPackageColor = (index: number): string => {
    return PACKAGE_COLORS[index % PACKAGE_COLORS.length];
  };

  /**
   * Format package type for display (e.g., "$rc_monthly" -> "Monthly")
   */
  const formatPackageType = (identifier: string): string => {
    const id = identifier.toLowerCase();
    if (id.includes('annual') || id.includes('yearly') || id.includes('year')) {
      return lang === 'fr' ? 'Annuel' : 'Annual';
    }
    if (id.includes('monthly') || id.includes('month')) {
      return lang === 'fr' ? 'Mensuel' : 'Monthly';
    }
    if (id.includes('weekly') || id.includes('week')) {
      return lang === 'fr' ? 'Hebdomadaire' : 'Weekly';
    }
    if (id.includes('lifetime')) {
      return lang === 'fr' ? 'À vie' : 'Lifetime';
    }
    // Fallback: clean up the identifier
    return identifier.replace(/^\$rc_/, '').replace(/_/g, ' ');
  };

  /**
   * Check if package appears to be a "best value" (annual/yearly)
   */
  const isBestValue = (identifier: string): boolean => {
    const id = identifier.toLowerCase();
    return id.includes('annual') || id.includes('yearly') || id.includes('year');
  };

  // ============================================
  // PACKAGE CARD COMPONENT - DYNAMIC
  // ============================================

  const PackageCard = ({ pkg, index }: { pkg: PurchasesPackage; index: number }) => {
    const color = getPackageColor(index);
    const isLoadingThisPackage = purchasingPackageId === pkg.identifier;
    const isAnyPurchasing = purchasingPackageId !== null;
    const isButtonDisabled = isLoadingThisPackage || isAnyPurchasing;
    const showBestValue = isBestValue(pkg.identifier);
    const packageTypeName = formatPackageType(pkg.identifier);

    return (
      <View
        style={[
          styles.planCardMain,
          { borderColor: color },
        ]}
      >
        {/* Best Value badge for annual plans */}
        {showBestValue && (
          <View style={[styles.popularBadge, { backgroundColor: color }]}>
            <Text style={styles.popularBadgeText}>{texts.popular}</Text>
          </View>
        )}

        {/* Product title from RevenueCat */}
        <Text style={[styles.planCardTitle, { color }]}>
          {pkg.product.title || packageTypeName}
        </Text>

        {/* Product description if available */}
        {pkg.product.description ? (
          <Text style={styles.planCardDescription}>
            {pkg.product.description}
          </Text>
        ) : (
          <Text style={styles.planCardDescription}>
            {packageTypeName}
          </Text>
        )}

        {/* Price from RevenueCat */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>{pkg.product.priceString}</Text>
        </View>

        {/* Subscription period info if available */}
        {pkg.product.subscriptionPeriod && (
          <View style={styles.periodBadge}>
            <Text style={styles.periodText}>
              {packageTypeName}
            </Text>
          </View>
        )}

        {/* Trial info if product has introductory offer */}
        {pkg.product.introPrice && (
          <View style={styles.trialBadge}>
            <Ionicons name="gift-outline" size={14} color={COLORS.warning} />
            <Text style={styles.trialBadgeText}>
              {pkg.product.introPrice.priceString === '$0.00' 
                ? texts.freeTrial 
                : `${pkg.product.introPrice.priceString} intro`}
            </Text>
          </View>
        )}

        {/* Subscribe button */}
        <TouchableOpacity
          style={[
            styles.selectButton, 
            { backgroundColor: color },
            isButtonDisabled && styles.selectButtonDisabled
          ]}
          onPress={() => handleSubscribe(pkg)}
          disabled={isButtonDisabled}
          activeOpacity={0.7}
        >
          {isLoadingThisPackage ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.selectButtonText}>{texts.choosePlan}</Text>
          )}
        </TouchableOpacity>
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

  // Empty state - No packages available
  if (Platform.OS === 'ios' && availablePackages.length === 0 && !error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{texts.title}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>{texts.noPlansAvailable}</Text>
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
        {hasActiveSubscription && activePlanName && (
          <View style={[styles.statusBanner, { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }]}>
            <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
            <Text style={[styles.statusBannerText, { color: COLORS.success }]}>
              {texts.active}: {activePlanName}
            </Text>
          </View>
        )}

        {/* Available Packages - Dynamically rendered */}
        {Platform.OS === 'ios' && availablePackages.length > 0 && (
          <View style={styles.plansSection}>
            <Text style={styles.plansSectionTitle}>{texts.availablePlans}</Text>
            {availablePackages.map((pkg, index) => (
              <PackageCard key={pkg.identifier} pkg={pkg} index={index} />
            ))}
          </View>
        )}

        {/* Non-iOS message */}
        {Platform.OS !== 'ios' && (
          <View style={styles.emptyContainer}>
            <Ionicons name="phone-portrait-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>{texts.notAvailable}</Text>
          </View>
        )}

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
        {Platform.OS === 'ios' && hasActiveSubscription && (
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

        {/* Legal Links - Required for Apple Guideline 3.1.2 */}
        <View style={styles.legalLinks}>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://aerologix-backend.onrender.com/privacy')}
            activeOpacity={0.7}
          >
            <Text style={styles.legalLinkText}>{texts.privacyPolicy}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
            activeOpacity={0.7}
          >
            <Text style={styles.legalLinkText}>{texts.termsOfUse}</Text>
          </TouchableOpacity>
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
  selectButtonDisabled: {
    opacity: 0.6,
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
  // Legal Links - Apple Guideline 3.1.2
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  legalLinkText: {
    fontSize: 13,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    marginHorizontal: 12,
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
