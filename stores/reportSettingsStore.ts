/**
 * Maintenance Report Store - Local state for report settings
 * TC-SAFE: Visual references only, no regulatory validation
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// ============================================
// FIXED LIMITS - NON-MODIFIABLE CONSTANTS
// Visual references only, not regulatory
// ============================================
export const FIXED_LIMITS = {
  CELLULE_YEARS: 5,           // Airframe annual - 5 years max
  HELICE_YEARS: 5,            // Propeller - 5 years max
  AVIONIQUE_MONTHS: 24,       // Avionics - 24 months
  MAGNETOS_HOURS: 500,        // Magnetos - 500 hours
  POMPE_VIDE_HOURS: 400,      // Vacuum pump - 400 hours
  ELT_TEST_MONTHS: 12,        // ELT test - 12 months
  ELT_BATTERY_MONTHS: 24,     // ELT battery - 24 months
} as const;

// ============================================
// EDITABLE SETTINGS - User can modify these
// ============================================
export interface ReportSettings {
  // Editable by user
  motorTbo: number;           // TBO hours for engine (user defined)
  
  // Editable dates (limits are FIXED, dates are editable)
  avioniqueDate: string;      // Last avionics certification date
  magnetosHours: number;      // Hours SINCE magnetos inspection
  pompeVideHours: number;     // Hours SINCE vacuum pump replacement
  heliceDate: string;         // Last propeller inspection date
  celluleDate: string;        // Last annual inspection date
  
  // ELT - mock data (will be managed by ELT module later)
  eltTestDate: string;
  eltBatteryExpiry: string;
}

interface ReportSettingsContextType {
  settings: ReportSettings;
  fixedLimits: typeof FIXED_LIMITS;
  updateSettings: (newSettings: Partial<EditableSettings>) => void;
}

// Only these fields can be updated
type EditableSettings = Pick<ReportSettings, 
  'motorTbo' | 'avioniqueDate' | 'magnetosHours' | 'pompeVideHours' | 'heliceDate' | 'celluleDate'
>;

const defaultSettings: ReportSettings = {
  motorTbo: 2000,
  avioniqueDate: '2024-01-15',
  magnetosHours: 281.8,
  pompeVideHours: 281.8,
  heliceDate: '2025-11-09',
  celluleDate: '2025-06-15',
  eltTestDate: '2025-11-10',
  eltBatteryExpiry: '2027-11-10',
};

const ReportSettingsContext = createContext<ReportSettingsContextType | undefined>(undefined);

export function ReportSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReportSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<EditableSettings>) => {
    // Only allow updating editable fields, never fixed limits
    const safeUpdate: Partial<ReportSettings> = {};
    
    if (newSettings.motorTbo !== undefined) safeUpdate.motorTbo = newSettings.motorTbo;
    if (newSettings.avioniqueDate !== undefined) safeUpdate.avioniqueDate = newSettings.avioniqueDate;
    if (newSettings.magnetosHours !== undefined) safeUpdate.magnetosHours = newSettings.magnetosHours;
    if (newSettings.pompeVideHours !== undefined) safeUpdate.pompeVideHours = newSettings.pompeVideHours;
    if (newSettings.heliceDate !== undefined) safeUpdate.heliceDate = newSettings.heliceDate;
    if (newSettings.celluleDate !== undefined) safeUpdate.celluleDate = newSettings.celluleDate;
    
    setSettings((prev) => ({ ...prev, ...safeUpdate }));
  };

  return React.createElement(
    ReportSettingsContext.Provider,
    { value: { settings, fixedLimits: FIXED_LIMITS, updateSettings } },
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
