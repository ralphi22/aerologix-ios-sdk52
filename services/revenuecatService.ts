/**
 * RevenueCat Service - iOS In-App Purchases via RevenueCat
 * 
 * IMPORTANT: This service replaces Stripe for iOS subscriptions
 * per Apple App Store Guideline 3.1.1
 * 
 * TODO: Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY in your environment
 * configuration (EAS secrets or .env file)
 * 
 * The key looks like: appl_xxxxxxxxxxxxxxxxxxxxx
 * Get it from RevenueCat Dashboard > Project > API Keys > iOS app specific key
 */

import { Platform } from 'react-native';
import Purchases, {
  PurchasesOfferings,
  CustomerInfo,
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
  PurchasesError,
} from 'react-native-purchases';

// ============================================
// CONFIGURATION
// ============================================

/**
 * TODO: Set this environment variable in EAS / .env
 * EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxxxxxxxxxxxxxxxxxxxx
 */
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';

// Offering identifiers (as configured in RevenueCat)
export const OFFERING_IDS = {
  PILOT: 'pilot',
  PILOT_PRO: 'pilot_pro',
  FLEET: 'fleet',
} as const;

// Entitlement identifiers (as configured in RevenueCat)
export const ENTITLEMENT_IDS = {
  PILOT: 'pilot',
  PILOT_PRO: 'pilot_pro',
  FLEET: 'fleet',
} as const;

// Package identifiers (RevenueCat standard)
export const PACKAGE_IDS = {
  MONTHLY: '$rc_monthly',
  ANNUAL: '$rc_annual',
} as const;

// ============================================
// TYPES
// ============================================

export type OfferingId = typeof OFFERING_IDS[keyof typeof OFFERING_IDS];
export type EntitlementId = typeof ENTITLEMENT_IDS[keyof typeof ENTITLEMENT_IDS];
export type PackageId = typeof PACKAGE_IDS[keyof typeof PACKAGE_IDS];

export interface RevenueCatError {
  code: string;
  message: string;
  userCancelled: boolean;
}

// ============================================
// STATE
// ============================================

let isInitialized = false;

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Initialize RevenueCat SDK
 * Must be called once before any other RevenueCat operations
 * 
 * @param userId Optional user ID for identifying the user in RevenueCat
 * @returns Promise<boolean> - true if initialization succeeded
 */
export const initRevenueCat = async (userId?: string): Promise<boolean> => {
  // Only initialize on iOS
  if (Platform.OS !== 'ios') {
    console.log('[RevenueCat] Skipping initialization - not iOS');
    return false;
  }

  // Check if already initialized (idempotent)
  if (isInitialized) {
    console.log('[RevenueCat] Already initialized');
    return true;
  }

  // Validate API key
  if (!REVENUECAT_IOS_API_KEY) {
    console.error(
      '[RevenueCat] ERROR: EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is not set.\n' +
      'Please configure this environment variable in EAS secrets or your .env file.\n' +
      'Get the key from RevenueCat Dashboard > Project > API Keys'
    );
    return false;
  }

  try {
    // Configure RevenueCat
    Purchases.configure({
      apiKey: REVENUECAT_IOS_API_KEY,
      appUserID: userId || null,
    });

    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }

    isInitialized = true;
    console.log('[RevenueCat] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[RevenueCat] Initialization error:', error);
    return false;
  }
};

/**
 * Get all offerings from RevenueCat
 * 
 * IMPORTANT: Use offerings.all.pilot, offerings.all.pilot_pro, offerings.all.fleet
 * DO NOT use offerings.current or offerings.all.default
 * 
 * @returns Promise<PurchasesOfferings | null>
 */
export const getOfferings = async (): Promise<PurchasesOfferings | null> => {
  if (Platform.OS !== 'ios') {
    console.log('[RevenueCat] getOfferings - not iOS');
    return null;
  }

  if (!isInitialized) {
    console.warn('[RevenueCat] Not initialized. Call initRevenueCat first.');
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    console.log('[RevenueCat] Offerings loaded:', Object.keys(offerings.all));
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] Error fetching offerings:', error);
    return null;
  }
};

/**
 * Get customer info (subscription status, entitlements)
 * 
 * @returns Promise<CustomerInfo | null>
 */
export const getCustomerInfo = async (): Promise<CustomerInfo | null> => {
  if (Platform.OS !== 'ios') {
    console.log('[RevenueCat] getCustomerInfo - not iOS');
    return null;
  }

  if (!isInitialized) {
    console.warn('[RevenueCat] Not initialized. Call initRevenueCat first.');
    return null;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('[RevenueCat] Customer info loaded');
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Error fetching customer info:', error);
    return null;
  }
};

/**
 * Purchase a package
 * 
 * @param pkg The package to purchase
 * @returns Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: RevenueCatError }>
 */
export const purchasePackage = async (
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: RevenueCatError }> => {
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      error: {
        code: 'NOT_IOS',
        message: 'In-app purchases only available on iOS',
        userCancelled: false,
      },
    };
  }

  if (!isInitialized) {
    return {
      success: false,
      error: {
        code: 'NOT_INITIALIZED',
        message: 'RevenueCat not initialized',
        userCancelled: false,
      },
    };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    console.log('[RevenueCat] Purchase successful');
    return { success: true, customerInfo };
  } catch (error) {
    const purchaseError = error as PurchasesError;
    
    // Check if user cancelled
    const userCancelled = purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
    
    if (userCancelled) {
      console.log('[RevenueCat] Purchase cancelled by user');
    } else {
      console.error('[RevenueCat] Purchase error:', purchaseError);
    }

    return {
      success: false,
      error: {
        code: purchaseError.code?.toString() || 'UNKNOWN',
        message: purchaseError.message || 'Purchase failed',
        userCancelled,
      },
    };
  }
};

/**
 * Restore purchases
 * 
 * @returns Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: RevenueCatError }>
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: RevenueCatError;
}> => {
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      error: {
        code: 'NOT_IOS',
        message: 'Restore purchases only available on iOS',
        userCancelled: false,
      },
    };
  }

  if (!isInitialized) {
    return {
      success: false,
      error: {
        code: 'NOT_INITIALIZED',
        message: 'RevenueCat not initialized',
        userCancelled: false,
      },
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('[RevenueCat] Purchases restored successfully');
    return { success: true, customerInfo };
  } catch (error) {
    const purchaseError = error as PurchasesError;
    console.error('[RevenueCat] Restore error:', purchaseError);

    return {
      success: false,
      error: {
        code: purchaseError.code?.toString() || 'UNKNOWN',
        message: purchaseError.message || 'Restore failed',
        userCancelled: false,
      },
    };
  }
};

/**
 * Check if user has an active entitlement
 * 
 * @param customerInfo CustomerInfo object
 * @param entitlementId The entitlement to check
 * @returns boolean
 */
export const hasEntitlement = (
  customerInfo: CustomerInfo | null,
  entitlementId: EntitlementId
): boolean => {
  if (!customerInfo) return false;
  const entitlement = customerInfo.entitlements.active[entitlementId];
  return !!entitlement && entitlement.isActive;
};

/**
 * Get the active plan code based on entitlements
 * Returns the highest tier active entitlement
 * 
 * @param customerInfo CustomerInfo object
 * @returns 'FLEET' | 'PILOT_PRO' | 'PILOT' | 'BASIC'
 */
export const getActivePlanCode = (
  customerInfo: CustomerInfo | null
): 'FLEET' | 'PILOT_PRO' | 'PILOT' | 'BASIC' => {
  if (!customerInfo) return 'BASIC';

  // Check in order of highest tier to lowest
  if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.FLEET)) return 'FLEET';
  if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.PILOT_PRO)) return 'PILOT_PRO';
  if (hasEntitlement(customerInfo, ENTITLEMENT_IDS.PILOT)) return 'PILOT';

  return 'BASIC';
};

/**
 * Get a specific package from an offering
 * 
 * IMPORTANT: 
 * - DO NOT use offerings.current
 * - DO NOT use offerings.all.default (it's empty)
 * - ONLY use offerings.all.pilot, offerings.all.pilot_pro, offerings.all.fleet
 * 
 * @param offerings The offerings object
 * @param offeringId The offering identifier (pilot | pilot_pro | fleet)
 * @param packageId The package identifier ($rc_monthly or $rc_annual)
 * @returns PurchasesPackage | null
 */
export const getPackage = (
  offerings: PurchasesOfferings | null,
  offeringId: OfferingId,
  packageId: PackageId
): PurchasesPackage | null => {
  if (!offerings) return null;

  // NEVER use offerings.current or offerings.all.default
  // ONLY access specific offerings: pilot, pilot_pro, fleet
  const offering = offerings.all[offeringId];
  if (!offering) {
    console.warn(`[RevenueCat] Offering '${offeringId}' not found in offerings.all`);
    return null;
  }

  const pkg = offering.availablePackages.find(
    (p) => p.identifier === packageId
  );

  if (!pkg) {
    console.warn(`[RevenueCat] Package '${packageId}' not found in offering '${offeringId}'`);
    return null;
  }

  return pkg;
};

/**
 * Open Apple Subscription Management page
 */
export const openSubscriptionManagement = (): void => {
  if (Platform.OS !== 'ios') {
    console.log('[RevenueCat] Subscription management only available on iOS');
    return;
  }

  // This URL opens the App Store subscription management page
  const url = 'https://apps.apple.com/account/subscriptions';
  
  // Using Linking from expo-linking (should be imported in the component)
  // The component will handle opening this URL
  console.log('[RevenueCat] Opening subscription management:', url);
};

export const SUBSCRIPTION_MANAGEMENT_URL = 'https://apps.apple.com/account/subscriptions';

// Export types from react-native-purchases for convenience
export type { PurchasesOfferings, CustomerInfo, PurchasesPackage };
