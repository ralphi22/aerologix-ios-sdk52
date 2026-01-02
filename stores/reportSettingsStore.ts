/**
 * Maintenance Report Store - Local state for report settings
 * TC-SAFE: Visual references only, no regulatory validation
 * All limits are now EDITABLE - rules can change
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

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

  const updateSettings = (newSettings: Partial<ReportSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateLimits = (newLimits: Partial<EditableLimits>) => {
    setLimits((prev) => ({ ...prev, ...newLimits }));
  };

  const resetLimitsToDefault = () => {
    setLimits(defaultLimits);
  };

  return React.createElement(
    ReportSettingsContext.Provider,
    { value: { settings, limits, updateSettings, updateLimits, resetLimitsToDefault } },
    children
  );
}

export function useReportSettings(): ReportSettingsContextType {
  const context = useContext(ReportSettingsContext);
  if (!context) {
    throw new Error('useReportSettings must be used within ReportSettingsProvider');
  }
  return context;
}

// Legacy export for compatibility
export const FIXED_LIMITS = DEFAULT_LIMITS;
