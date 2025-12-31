/**
 * ELT Store - Local state for ELT (Emergency Locator Transmitter) data
 * TC-SAFE: Visual storage only, no regulatory validation
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
export interface EltData {
  // Editable dates
  activationDate: string;      // Date d'activation ELT
  serviceDate: string;         // Date de mise en service (opérationnel)
  lastTestDate: string;        // Dernier test ELT (cycle 12 mois)
  lastBatteryDate: string;     // Dernier changement batterie / recertification
  batteryExpiryDate: string;   // Date d'expiration batterie
  
  // ELT identification (optional)
  manufacturer: string;
  model: string;
  serialNumber: string;
  hexCode: string;             // 406 MHz hex code
  
  // Aircraft association
  aircraftId: string;
}

export type EltStatus = 'operational' | 'attention' | 'expired';

interface EltContextType {
  eltData: EltData;
  fixedLimits: typeof ELT_FIXED_LIMITS;
  updateEltData: (data: Partial<EltData>) => void;
  getEltStatus: () => EltStatus;
  getTestProgress: () => { percent: number; daysRemaining: number; status: EltStatus };
  getBatteryProgress: () => { percent: number; daysRemaining: number; status: EltStatus };
}

// Default mock data
const defaultEltData: EltData = {
  activationDate: '2020-05-15',
  serviceDate: '2020-06-01',
  lastTestDate: '2025-11-10',
  lastBatteryDate: '2023-11-10',
  batteryExpiryDate: '2027-11-10',
  manufacturer: 'ACR Electronics',
  model: 'ResQLink 400',
  serialNumber: 'ACR-2024-00123',
  hexCode: 'A3B4C5D6E7',
  aircraftId: 'mock',
};

const EltContext = createContext<EltContextType | undefined>(undefined);

// Calculate progress for date-based items
function calculateDateProgress(lastDate: string, limitMonths: number): { percent: number; daysRemaining: number; status: EltStatus } {
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

  const updateEltData = (data: Partial<EltData>) => {
    setEltData((prev) => ({ ...prev, ...data }));
  };

  const getTestProgress = () => {
    return calculateDateProgress(eltData.lastTestDate, ELT_FIXED_LIMITS.TEST_MONTHS);
  };

  const getBatteryProgress = () => {
    // Calculate from battery expiry date
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
    
    // Return worst status
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
        updateEltData,
        getEltStatus,
        getTestProgress,
        getBatteryProgress,
      },
    },
    children
  );
}

export function useElt(): EltContextType {
  const context = useContext(EltContext);
  if (!context) {
    throw new Error('useElt must be used within EltProvider');
  }
  return context;
}
