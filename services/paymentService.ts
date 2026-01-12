/**
 * Payment Service - Stripe subscription management
 * Uses Linking to open checkout URL (Managed Workflow compatible)
 */

import api from './api';
import * as Linking from 'expo-linking';

// Types - Backend plan codes
export type PlanCode = 'BASIC' | 'PILOT' | 'PILOT_PRO' | 'FLEET';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export interface PlanLimits {
  max_aircrafts: number;
  ocr_per_month: number;
  gps_logbook: boolean;
  tea_amo_sharing: boolean;
  invoices: boolean;
  cost_per_hour: boolean;
  prebuy: boolean;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
}

// Plan display info (matches backend plan_code)
export interface PlanInfo {
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  monthly: number;
  yearly: number;
  color: string;
  popular?: boolean;
  limits: {
    max_aircrafts: number; // -1 = unlimited
    ocr_per_month: number; // -1 = unlimited
    gps_logbook: boolean;
    tea_amo_sharing: boolean;
    invoices: boolean;
    cost_per_hour: boolean;
    prebuy: boolean;
  };
}

// Plan configuration matching backend plan_codes
export const PLANS: Record<PlanCode, PlanInfo> = {
  BASIC: {
    name: 'Basic',
    nameFr: 'Basic',
    description: 'Free tier - 1 aircraft',
    descriptionFr: 'Gratuit - 1 aéronef',
    monthly: 0,
    yearly: 0,
    color: '#6B7280',
    limits: {
      max_aircrafts: 1,
      ocr_per_month: 5,
      gps_logbook: false,
      tea_amo_sharing: false,
      invoices: false,
      cost_per_hour: false,
      prebuy: false,
    },
  },
  PILOT: {
    name: 'Pilot',
    nameFr: 'Pilot',
    description: '1 aircraft, basic sync',
    descriptionFr: '1 aéronef, synchronisation de base',
    monthly: 9.99,
    yearly: 99.90,
    color: '#3B82F6',
    limits: {
      max_aircrafts: 1,
      ocr_per_month: 10,
      gps_logbook: true,
      tea_amo_sharing: false,
      invoices: true,
      cost_per_hour: false,
      prebuy: false,
    },
  },
  PILOT_PRO: {
    name: 'Pilot Pro',
    nameFr: 'Pilot Pro',
    description: 'Up to 3 aircraft, AME sharing',
    descriptionFr: 'Jusqu\'à 3 aéronefs, partage TEA/AMO',
    monthly: 24.99,
    yearly: 249.90,
    color: '#8B5CF6',
    popular: true,
    limits: {
      max_aircrafts: 3,
      ocr_per_month: 50,
      gps_logbook: true,
      tea_amo_sharing: true,
      invoices: true,
      cost_per_hour: true,
      prebuy: false,
    },
  },
  FLEET: {
    name: 'Fleet',
    nameFr: 'Fleet',
    description: 'Unlimited aircraft, full fleet view',
    descriptionFr: 'Aéronefs illimités, vue Fleet complète',
    monthly: 79.99,
    yearly: 799.90,
    color: '#F59E0B',
    limits: {
      max_aircrafts: -1, // unlimited
      ocr_per_month: -1, // unlimited
      gps_logbook: true,
      tea_amo_sharing: true,
      invoices: true,
      cost_per_hour: true,
      prebuy: true,
    },
  },
};

// Paid plans only (for checkout)
export const PAID_PLANS: PlanCode[] = ['PILOT', 'PILOT_PRO', 'FLEET'];

/**
 * Create a Stripe Checkout session
 * POST /api/payments/create-checkout-session
 * Body: { plan_code, billing_cycle }
 */
export const createCheckoutSession = async (
  planCode: PlanCode,
  billingCycle: BillingCycle
): Promise<CheckoutSessionResponse> => {
  const response = await api.post('/api/payments/create-checkout-session', {
    plan_code: planCode,
    billing_cycle: billingCycle,
  });
  return response.data;
};

/**
 * Open Stripe Checkout via Linking (Managed Workflow compatible)
 * Returns true if checkout URL was opened successfully
 */
export const openCheckout = async (
  planCode: PlanCode,
  billingCycle: BillingCycle
): Promise<{ success: boolean; error?: string }> => {
  try {
    // BASIC is free, no checkout needed
    if (planCode === 'BASIC') {
      return { success: false, error: 'Basic plan is free' };
    }

    // Create checkout session
    const { checkout_url } = await createCheckoutSession(planCode, billingCycle);
    
    // Open URL via Linking (works in Managed Workflow)
    const canOpen = await Linking.canOpenURL(checkout_url);
    if (!canOpen) {
      return { success: false, error: 'Cannot open checkout URL' };
    }
    
    await Linking.openURL(checkout_url);
    return { success: true };
  } catch (error: any) {
    console.error('Checkout error:', error);
    return { 
      success: false, 
      error: error.response?.data?.detail || error.message || 'Checkout error' 
    };
  }
};

/**
 * Cancel current subscription (at period end)
 */
export const cancelSubscription = async (): Promise<{ message: string; current_period_end: string }> => {
  const response = await api.post('/api/payments/cancel');
  return response.data;
};

/**
 * Format limit value for display
 * -1 = Unlimited/Illimité
 */
export const formatLimit = (value: number, lang: 'en' | 'fr' = 'en'): string => {
  if (value === -1) {
    return lang === 'fr' ? 'Illimité' : 'Unlimited';
  }
  return String(value);
};

/**
 * Get savings percentage for yearly billing
 */
export const getYearlySavings = (planCode: PlanCode): number => {
  const plan = PLANS[planCode];
  if (plan.monthly === 0) return 0;
  const monthlyTotal = plan.monthly * 12;
  const savings = ((monthlyTotal - plan.yearly) / monthlyTotal) * 100;
  return Math.round(savings);
};

/**
 * Format price for display
 */
export const formatPrice = (price: number, billingCycle: BillingCycle, lang: 'en' | 'fr' = 'en'): string => {
  if (price === 0) {
    return lang === 'fr' ? 'Gratuit' : 'Free';
  }
  const period = billingCycle === 'monthly' 
    ? (lang === 'fr' ? '/mois' : '/mo') 
    : (lang === 'fr' ? '/an' : '/yr');
  return `${price.toFixed(2)}$ CAD${period}`;
};
