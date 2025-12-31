/**
 * Maintenance Report Store - Local state for report settings
 * Stores TBO, dates, and hours for critical elements
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface ReportSettings {
  // Editable
  motorTbo: number; // TBO hours for engine
  avioniqueDate: string; // Last avionics certification date (24 months fixed)
  magnetosHours: number; // Hours since magnetos inspection (500h fixed limit)
  pompeVideHours: number; // Hours since vacuum pump replacement (400h fixed limit)
  // Non-editable - fixed limits
  heliceDate: string; // Last propeller inspection (5 years fixed)
  celluleDate: string; // Last annual inspection (5 years fixed)
  // ELT - mock data for now
  eltTestDate: string;
  eltBatteryExpiry: string;
}

interface ReportSettingsContextType {
  settings: ReportSettings;
  updateSettings: (newSettings: Partial<ReportSettings>) => void;
}

const defaultSettings: ReportSettings = {
  motorTbo: 2000,
  avioniqueDate: '2024-01-15', // Will show as expired (>24 months)
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

  const updateSettings = (newSettings: Partial<ReportSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return React.createElement(
    ReportSettingsContext.Provider,
    { value: { settings, updateSettings } },
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
