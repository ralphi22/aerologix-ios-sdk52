/**
 * Alerts Store - State management for TC AD/SB alerts
 * TC-SAFE: Informational alerts only, no regulatory decisions
 * 
 * Features:
 * - Fetches alerts from backend /api/alerts
 * - Filters for NEW_AD_SB type
 * - Tracks read/unread state locally
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '@/services/api';

const READ_ALERTS_KEY = 'aerologix_read_alerts';

// ============================================
// TYPES
// ============================================

export type AlertType = 'NEW_AD_SB' | 'NEW_TC_REFERENCE' | 'INFO' | 'WARNING';

export interface TcAlert {
  id: string;
  type: AlertType;
  aircraft_id?: string;
  aircraft_model?: string;
  aircraft_registration?: string;
  reference?: string;      // AD/SB reference number
  title?: string;
  message?: string;
  created_at: string;
  is_read?: boolean;       // Computed locally
}

interface AlertsContextType {
  alerts: TcAlert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  getAlertsByAircraft: (aircraftId: string) => TcAlert[];
  hasUnreadAlerts: (aircraftId?: string) => boolean;
}

// ============================================
// CONTEXT
// ============================================

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<TcAlert[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load read alerts from storage
  const loadReadAlerts = async (): Promise<Set<string>> => {
    try {
      const stored = await SecureStore.getItemAsync(READ_ALERTS_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (err) {
      console.log('[Alerts] Error loading read alerts:', err);
    }
    return new Set();
  };

  // Save read alerts to storage
  const saveReadAlerts = async (ids: Set<string>) => {
    try {
      await SecureStore.setItemAsync(READ_ALERTS_KEY, JSON.stringify(Array.from(ids)));
    } catch (err) {
      console.log('[Alerts] Error saving read alerts:', err);
    }
  };

  // Fetch alerts from backend
  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load read state first
      const readIds = await loadReadAlerts();
      setReadAlertIds(readIds);

      // Fetch from backend - correct endpoint is /api/alerts
      const response = await api.get('/api/alerts');
      const data = response.data;
      
      // Handle response format - backend may return { alerts: [...] } or direct array
      const allAlerts: TcAlert[] = data?.alerts || data || [];
      console.log('[Alerts] Raw response:', data);

      // Filter for NEW_AD_SB type and mark read state
      const filteredAlerts = allAlerts
        .filter(alert => alert.type === 'NEW_AD_SB' || alert.type === 'NEW_TC_REFERENCE')
        .map(alert => ({
          ...alert,
          // Use backend status if available, otherwise check local storage
          is_read: alert.status === 'READ' || readIds.has(alert.id),
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAlerts(filteredAlerts);
      console.log('[Alerts] Fetched', filteredAlerts.length, 'alerts, unread:', filteredAlerts.filter(a => !a.is_read).length);
    } catch (err: any) {
      console.warn('[Alerts] Fetch error:', err?.message);
      // Don't show error to user - alerts are optional
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark single alert as read - sync with backend
  const markAsRead = useCallback(async (alertId: string) => {
    try {
      // Try to sync with backend first
      await api.put(`/api/alerts/${alertId}/read`);
      console.log('[Alerts] Marked as read on backend:', alertId);
    } catch (err: any) {
      console.log('[Alerts] Backend mark read failed, using local storage:', err?.message);
    }
    
    // Always update local state
    const newReadIds = new Set(readAlertIds);
    newReadIds.add(alertId);
    setReadAlertIds(newReadIds);
    await saveReadAlerts(newReadIds);

    // Update alerts state
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, is_read: true } : alert
      )
    );
  }, [readAlertIds]);

  // Mark all alerts as read - sync with backend
  const markAllAsRead = useCallback(async () => {
    try {
      // Try to sync with backend first
      await api.put('/api/alerts/read-all');
      console.log('[Alerts] Marked all as read on backend');
    } catch (err: any) {
      console.log('[Alerts] Backend mark all read failed, using local storage:', err?.message);
    }
    
    // Always update local state
    const newReadIds = new Set(readAlertIds);
    alerts.forEach(alert => newReadIds.add(alert.id));
    setReadAlertIds(newReadIds);
    await saveReadAlerts(newReadIds);

    setAlerts(prev => prev.map(alert => ({ ...alert, is_read: true })));
  }, [alerts, readAlertIds]);

  // Get alerts for specific aircraft
  const getAlertsByAircraft = useCallback((aircraftId: string): TcAlert[] => {
    return alerts.filter(alert => alert.aircraft_id === aircraftId);
  }, [alerts]);

  // Check if there are unread alerts
  const hasUnreadAlerts = useCallback((aircraftId?: string): boolean => {
    if (aircraftId) {
      return alerts.some(alert => alert.aircraft_id === aircraftId && !alert.is_read);
    }
    return alerts.some(alert => !alert.is_read);
  }, [alerts]);

  // Calculate unread count
  const unreadCount = alerts.filter(alert => !alert.is_read).length;

  return React.createElement(
    AlertsContext.Provider,
    {
      value: {
        alerts,
        unreadCount,
        isLoading,
        error,
        fetchAlerts,
        markAsRead,
        markAllAsRead,
        getAlertsByAircraft,
        hasUnreadAlerts,
      },
    },
    children
  );
}

// ============================================
// HOOK
// ============================================

export function useAlerts(): AlertsContextType {
  const context = useContext(AlertsContext);
  if (!context) {
    // Return default values if provider not found
    return {
      alerts: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      fetchAlerts: async () => {},
      markAsRead: async () => {},
      markAllAsRead: async () => {},
      getAlertsByAircraft: () => [],
      hasUnreadAlerts: () => false,
    };
  }
  return context;
}
