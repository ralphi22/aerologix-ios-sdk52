/**
 * Maintenance Report Store - Local state for report settings
 * TC-SAFE: Visual references only, no regulatory validation
 * All limits are now EDITABLE - rules can change
 * PERSISTENCE: Uses SecureStore for local persistence
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY_SETTINGS = 'aerologix_report_settings';
const STORAGE_KEY_LIMITS = 'aerologix_report_limits';

// ============================================
// DEFAULT LIMITS - Can be modified by user
// Visual references only, not regulatory
// ============================================
export const DEFAULT_LIMITS = {
  CELLULE_YEARS: 5,           // Airframe annual - 5 years max
  HELICE_YEARS: 5,            // Propeller - 5 years max
  AVIONIQUE_MONTHS: 24,       // Avionics - 24 months
  MAGNETOS_HOURS: 500,        // Magnetos - 500 hours
  POMPE_VIDE_HOURS: 400,      // Vacuum pump - 400 hours
  ELT_TEST_MONTHS: 12,        // ELT test - 12 months
  ELT_BATTERY_MONTHS: 24,     // ELT battery - 24 months
};

// ============================================
// EDITABLE LIMITS - User can modify these
// ============================================
export interface EditableLimits {
  celluleYears: number;
  heliceYears: number;
  avioniqueMonths: number;
  magnetosHours: number;
  pompeVideHours: number;
  eltTestMonths: number;
  eltBatteryMonths: number;
}

// ============================================
// SETTINGS - User can modify these
// ============================================
export interface ReportSettings {
  // Engine
  motorTbo: number;           // TBO hours for engine (user defined)
  
  // Dates
  avioniqueDate: string;      // Last avionics certification date
  magnetosHoursUsed: number;  // Hours SINCE magnetos inspection
  pompeVideHoursUsed: number; // Hours SINCE vacuum pump replacement
  heliceDate: string;         // Last propeller inspection date
  celluleDate: string;        // Last annual inspection date
  
  // ELT
  eltTestDate: string;
  eltBatteryExpiry: string;
}

interface ReportSettingsContextType {
  settings: ReportSettings;
  limits: EditableLimits;
  updateSettings: (newSettings: Partial<ReportSettings>) => void;
  updateLimits: (newLimits: Partial<EditableLimits>) => void;
  resetLimitsToDefault: () => void;
}

const defaultSettings: ReportSettings = {
  motorTbo: 2000,
  avioniqueDate: '2024-01-15',
  magnetosHoursUsed: 281.8,
  pompeVideHoursUsed: 281.8,
  heliceDate: '2025-11-09',
  celluleDate: '2025-06-15',
  eltTestDate: '2025-11-10',
  eltBatteryExpiry: '2027-11-10',
};

const defaultLimits: EditableLimits = {
  celluleYears: DEFAULT_LIMITS.CELLULE_YEARS,
  heliceYears: DEFAULT_LIMITS.HELICE_YEARS,
  avioniqueMonths: DEFAULT_LIMITS.AVIONIQUE_MONTHS,
  magnetosHours: DEFAULT_LIMITS.MAGNETOS_HOURS,
  pompeVideHours: DEFAULT_LIMITS.POMPE_VIDE_HOURS,
  eltTestMonths: DEFAULT_LIMITS.ELT_TEST_MONTHS,
  eltBatteryMonths: DEFAULT_LIMITS.ELT_BATTERY_MONTHS,
};

const ReportSettingsContext = createContext<ReportSettingsContextType | undefined>(undefined);

export function ReportSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReportSettings>(defaultSettings);
  const [limits, setLimits] = useState<EditableLimits>(defaultLimits);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const savedSettings = await SecureStore.getItemAsync(STORAGE_KEY_SETTINGS);
        const savedLimits = await SecureStore.getItemAsync(STORAGE_KEY_LIMITS);
        
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          console.log('Loaded report settings from storage:', parsed);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
        
        if (savedLimits) {
          const parsed = JSON.parse(savedLimits);
          console.log('Loaded report limits from storage:', parsed);
          setLimits(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.log('Error loading report settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadPersistedData();
  }, []);

  // Persist settings when changed
  const updateSettings = async (newSettings: Partial<ReportSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
      console.log('Report settings saved to storage');
    } catch (error) {
      console.log('Error saving report settings:', error);
    }
  };

  // Persist limits when changed
  const updateLimits = async (newLimits: Partial<EditableLimits>) => {
    const updated = { ...limits, ...newLimits };
    setLimits(updated);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_LIMITS, JSON.stringify(updated));
      console.log('Report limits saved to storage');
    } catch (error) {
      console.log('Error saving report limits:', error);
    }
  };

  const resetLimitsToDefault = async () => {
    setLimits(defaultLimits);
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY_LIMITS);
      console.log('Report limits reset to defaults');
    } catch (error) {
      console.log('Error resetting report limits:', error);
    }
  };

  return React.createElement(
    ReportSettingsContext.Provider,
    { value: { settings, limits, updateSettings, updateLimits, resetLimitsToDefault } },
    children
  );
}

// Default context value for when provider is not available
const defaultContextValue: ReportSettingsContextType = {
  settings: defaultSettings,
  limits: defaultLimits,
  updateSettings: () => console.warn('ReportSettingsProvider not found'),
  updateLimits: () => console.warn('ReportSettingsProvider not found'),
  resetLimitsToDefault: () => console.warn('ReportSettingsProvider not found'),
};

export function useReportSettings(): ReportSettingsContextType {
  const context = useContext(ReportSettingsContext);
  // Return default values instead of throwing error to prevent crashes
  if (!context) {
    console.warn('useReportSettings called outside of ReportSettingsProvider, using defaults');
    return defaultContextValue;
  }
  return context;
}

// Legacy export for compatibility
export const FIXED_LIMITS = DEFAULT_LIMITS;
