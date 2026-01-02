/**
 * ELT Store - Local state for ELT (Emergency Locator Transmitter) data
 * TC-SAFE: Visual storage only, no regulatory validation
 * OCR data must be validated by user before storage
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// ============================================
// FIXED LIMITS - NON-MODIFIABLE CONSTANTS
// Visual references only, not regulatory
// ============================================
export const ELT_FIXED_LIMITS = {
  TEST_MONTHS: 12,           // ELT test cycle - 12 months
  BATTERY_MIN_MONTHS: 24,    // Battery minimum - 24 months
  BATTERY_MAX_MONTHS: 72,    // Battery maximum - 72 months
} as const;

// ============================================
// TYPES
// ============================================
export type EltType = '121.5 MHz' | '406 MHz' | '406 MHz + GPS' | '';

export interface EltData {
  // ELT identification
  manufacturer: string;
  model: string;
  serialNumber: string;
  eltType: EltType;           // Type d'ELT
  hexCode: string;            // 406 MHz hex code (if applicable)
  
  // Dates
  activationDate: string;     // Date d'activation ELT
  serviceDate: string;        // Date de mise en service (opérationnel)
  lastTestDate: string;       // Dernier test ELT (cycle 12 mois)
  lastBatteryDate: string;    // Dernier changement batterie / recertification
  batteryExpiryDate: string;  // Date d'expiration batterie
  
  // Aircraft association
  aircraftId: string;
  
  // OCR metadata
  lastOcrScanDate: string;    // Date du dernier scan OCR
  ocrValidated: boolean;      // User has validated OCR data
}

export interface OcrDetectedData {
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  eltType?: EltType;
  hexCode?: string;
  activationDate?: string;
  serviceDate?: string;
  lastTestDate?: string;
  lastBatteryDate?: string;
  batteryExpiryDate?: string;
  confidence: Record<string, number>;  // Confidence level per field (0-100)
}

export interface OcrScanRecord {
  id: string;
  documentType: 'maintenance_report' | 'elt_certificate' | 'battery_label' | 'registration' | 'other';
  scanDate: string;
  detectedData: OcrDetectedData;
  validated: boolean;
  aircraftId: string;
}

export type EltStatus = 'operational' | 'attention' | 'expired';

interface EltContextType {
  eltData: EltData;
  fixedLimits: typeof ELT_FIXED_LIMITS;
  ocrHistory: OcrScanRecord[];
  updateEltData: (data: Partial<EltData>) => void;
  applyOcrData: (data: Partial<EltData>) => void;
  addOcrScan: (scan: Omit<OcrScanRecord, 'id'>) => void;
  getEltStatus: () => EltStatus;
  getTestProgress: () => { percent: number; daysRemaining: number; status: EltStatus };
  getBatteryProgress: () => { percent: number; daysRemaining: number; status: EltStatus };
}

// Default mock data
const defaultEltData: EltData = {
  manufacturer: 'ACR Electronics',
  model: 'ResQLink 400',
  serialNumber: 'ACR-2024-00123',
  eltType: '406 MHz + GPS',
  hexCode: 'A3B4C5D6E7',
  activationDate: '2020-05-15',
  serviceDate: '2020-06-01',
  lastTestDate: '2025-11-10',
  lastBatteryDate: '2023-11-10',
  batteryExpiryDate: '2027-11-10',
  aircraftId: 'mock',
  lastOcrScanDate: '',
  ocrValidated: false,
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const EltContext = createContext<EltContextType | undefined>(undefined);

// Calculate progress for date-based items
function calculateDateProgress(lastDate: string, limitMonths: number): { percent: number; daysRemaining: number; status: EltStatus } {
  if (!lastDate) {
    return { percent: 0, daysRemaining: 0, status: 'expired' };
  }
  
  const last = new Date(lastDate);
  const expiry = new Date(last);
  expiry.setMonth(expiry.getMonth() + limitMonths);
  const now = new Date();
  
  const totalDays = (expiry.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const percent = Math.min(Math.round((elapsedDays / totalDays) * 100), 100);
  
  let status: EltStatus = 'operational';
  if (daysRemaining <= 0) {
    status = 'expired';
  } else if (percent >= 80) {
    status = 'attention';
  }
  
  return { percent, daysRemaining, status };
}

export function EltProvider({ children }: { children: ReactNode }) {
  const [eltData, setEltData] = useState<EltData>(defaultEltData);
  const [ocrHistory, setOcrHistory] = useState<OcrScanRecord[]>([]);

  const updateEltData = (data: Partial<EltData>) => {
    setEltData((prev) => ({ ...prev, ...data }));
  };

  const applyOcrData = (data: Partial<EltData>) => {
    // Apply OCR data after user validation
    setEltData((prev) => ({
      ...prev,
      ...data,
      lastOcrScanDate: new Date().toISOString().split('T')[0],
      ocrValidated: true,
    }));
  };

  const addOcrScan = (scan: Omit<OcrScanRecord, 'id'>) => {
    const newScan: OcrScanRecord = { ...scan, id: generateId() };
    setOcrHistory((prev) => [newScan, ...prev]);
  };

  const getTestProgress = () => {
    return calculateDateProgress(eltData.lastTestDate, ELT_FIXED_LIMITS.TEST_MONTHS);
  };

  const getBatteryProgress = () => {
    if (!eltData.batteryExpiryDate || !eltData.lastBatteryDate) {
      return { percent: 0, daysRemaining: 0, status: 'expired' as EltStatus };
    }
    
    const expiry = new Date(eltData.batteryExpiryDate);
    const now = new Date();
    const last = new Date(eltData.lastBatteryDate);
    
    const totalDays = (expiry.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    const daysRemaining = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const percent = Math.min(Math.round((elapsedDays / totalDays) * 100), 100);
    
    let status: EltStatus = 'operational';
    if (daysRemaining <= 0) {
      status = 'expired';
    } else if (percent >= 80) {
      status = 'attention';
    }
    
    return { percent, daysRemaining, status };
  };

  const getEltStatus = (): EltStatus => {
    const testProgress = getTestProgress();
    const batteryProgress = getBatteryProgress();
    
    if (testProgress.status === 'expired' || batteryProgress.status === 'expired') {
      return 'expired';
    }
    if (testProgress.status === 'attention' || batteryProgress.status === 'attention') {
      return 'attention';
    }
    return 'operational';
  };

  return React.createElement(
    EltContext.Provider,
    {
      value: {
        eltData,
        fixedLimits: ELT_FIXED_LIMITS,
        ocrHistory,
        updateEltData,
        applyOcrData,
        addOcrScan,
        getEltStatus,
        getTestProgress,
        getBatteryProgress,
      },
    },
    children
  );
}

// Default fallback context value
const defaultContextValue: EltContextType = {
  eltData: defaultEltData,
  fixedLimits: ELT_FIXED_LIMITS,
  ocrHistory: [],
  updateEltData: () => console.warn('EltProvider not found'),
  applyOcrData: () => console.warn('EltProvider not found'),
  addOcrScan: () => console.warn('EltProvider not found'),
  getEltStatus: () => 'operational' as EltStatus,
  getTestProgress: () => ({ percent: 0, daysRemaining: 0, status: 'operational' as EltStatus }),
  getBatteryProgress: () => ({ percent: 0, daysRemaining: 0, status: 'operational' as EltStatus }),
};

export function useElt(): EltContextType {
  const context = useContext(EltContext);
  // Return default values instead of throwing error to prevent crashes
  if (!context) {
    console.warn('useElt called outside of EltProvider, using defaults');
    return defaultContextValue;
  }
  return context;
}
