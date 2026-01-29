/**
 * ELT Store - State management for ELT (Emergency Locator Transmitter) data
 * TC-SAFE: Visual storage only, no regulatory validation
 * OCR data must be validated by user before storage
 * 
 * UPDATED: Now persists data to backend via eltService
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import eltService, { EltDataBackend } from '../services/eltService';

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

export type EltStatus = 'operational' | 'attention' | 'expired' | 'unknown';

interface EltContextType {
  eltData: EltData;
  fixedLimits: typeof ELT_FIXED_LIMITS;
  ocrHistory: OcrScanRecord[];
  isLoading: boolean;
  error: string | null;
  updateEltData: (data: Partial<EltData>) => Promise<void>;
  applyOcrData: (data: Partial<EltData>) => void;
  addOcrScan: (scan: Omit<OcrScanRecord, 'id'>) => void;
  getEltStatus: () => EltStatus;
  getTestProgress: () => { percent: number; daysRemaining: number; status: EltStatus };
  getBatteryProgress: () => { percent: number; daysRemaining: number; status: EltStatus };
  loadEltData: (aircraftId: string) => Promise<void>;
  saveEltData: () => Promise<void>;
}

// Default empty data (not mock data)
const emptyEltData: EltData = {
  manufacturer: '',
  model: '',
  serialNumber: '',
  eltType: '',
  hexCode: '',
  activationDate: '',
  serviceDate: '',
  lastTestDate: '',
  lastBatteryDate: '',
  batteryExpiryDate: '',
  aircraftId: '',
  lastOcrScanDate: '',
  ocrValidated: false,
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const EltContext = createContext<EltContextType | undefined>(undefined);

// Helper: Clean date string - remove time component if present
function cleanDateString(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  // If date has time component (T or space), extract only date part
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  if (dateStr.includes(' ')) {
    return dateStr.split(' ')[0];
  }
  return dateStr;
}

/**
 * Convert frontend EltData to backend format
 * 
 * Backend field mapping (from OpenAPI):
 * - brand (frontend: manufacturer)
 * - model
 * - serial_number (frontend: serialNumber)
 * - beacon_hex_id (frontend: hexCode)
 * - installation_date (frontend: activationDate)
 * - certification_date (frontend: serviceDate)
 * - last_test_date (frontend: lastTestDate)
 * - battery_install_date (frontend: lastBatteryDate)
 * - battery_expiry_date (frontend: batteryExpiryDate)
 */
function toBackendFormat(data: EltData): Partial<EltDataBackend> {
  const result: Partial<EltDataBackend> = {
    brand: data.manufacturer || '',
    model: data.model || '',
    serial_number: data.serialNumber || '',
    beacon_hex_id: data.hexCode || '',
    installation_date: cleanDateString(data.activationDate),
    certification_date: cleanDateString(data.serviceDate),
    last_test_date: cleanDateString(data.lastTestDate),
    battery_install_date: cleanDateString(data.lastBatteryDate),
    battery_expiry_date: cleanDateString(data.batteryExpiryDate),
    // Note: eltType is stored locally only (not in backend schema)
    remarks: data.eltType || '', // Store eltType in remarks field as workaround
  };
  console.log('toBackendFormat - sending to backend:', JSON.stringify(result));
  return result;
}

/**
 * Convert backend format to frontend EltData
 */
function toFrontendFormat(data: EltDataBackend, aircraftId: string): EltData {
  console.log('toFrontendFormat - received from backend:', JSON.stringify(data));
  const result: EltData = {
    manufacturer: data.brand || '',
    model: data.model || '',
    serialNumber: data.serial_number || '',
    eltType: (data.remarks as EltType) || '', // Retrieve eltType from remarks
    hexCode: data.beacon_hex_id || '',
    activationDate: cleanDateString(data.installation_date),
    serviceDate: cleanDateString(data.certification_date),
    lastTestDate: cleanDateString(data.last_test_date),
    lastBatteryDate: cleanDateString(data.battery_install_date),
    batteryExpiryDate: cleanDateString(data.battery_expiry_date),
    aircraftId: aircraftId || data.aircraft_id || '',
    lastOcrScanDate: '',
    ocrValidated: false,
  };
  console.log('toFrontendFormat - converted result:', JSON.stringify(result));
  return result;
}

// Calculate progress for date-based items
function calculateDateProgress(lastDate: string, limitMonths: number): { percent: number; daysRemaining: number; status: EltStatus } {
  if (!lastDate) {
    return { percent: 0, daysRemaining: 0, status: 'operational' };
  }
  
  const last = new Date(lastDate);
  
  // Handle invalid date
  if (isNaN(last.getTime())) {
    return { percent: 0, daysRemaining: 0, status: 'operational' };
  }
  
  const expiry = new Date(last);
  expiry.setMonth(expiry.getMonth() + limitMonths);
  const now = new Date();
  
  const totalDays = (expiry.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  
  // Prevent division by zero
  if (totalDays <= 0) {
    return { percent: 100, daysRemaining: 0, status: 'expired' };
  }
  
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
  const [eltData, setEltData] = useState<EltData>(emptyEltData);
  const [ocrHistory, setOcrHistory] = useState<OcrScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load ELT data from backend for a specific aircraft
  const loadEltData = useCallback(async (aircraftId: string) => {
    if (!aircraftId) {
      console.log('No aircraftId provided, using empty data');
      setEltData({ ...emptyEltData });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const backendData = await eltService.getByAircraftId(aircraftId);
      
      if (backendData) {
        const frontendData = toFrontendFormat(backendData, aircraftId);
        setEltData(frontendData);
        console.log('ELT data loaded from backend for aircraft:', aircraftId);
      } else {
        // No existing data, set empty with aircraftId
        setEltData({ ...emptyEltData, aircraftId });
        console.log('No ELT data found for aircraft, using empty data:', aircraftId);
      }
    } catch (err: any) {
      console.error('Error loading ELT data:', err);
      setError(err.message || 'Failed to load ELT data');
      setEltData({ ...emptyEltData, aircraftId });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save ELT data to backend
  const saveEltData = useCallback(async () => {
    if (!eltData.aircraftId) {
      console.warn('Cannot save ELT data: no aircraftId');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const backendFormat = toBackendFormat(eltData);
      await eltService.upsert(eltData.aircraftId, backendFormat);
      console.log('ELT data saved to backend for aircraft:', eltData.aircraftId);
    } catch (err: any) {
      console.error('Error saving ELT data:', err);
      setError(err.message || 'Failed to save ELT data');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [eltData]);

  // Update ELT data locally AND save to backend
  const updateEltData = useCallback(async (data: Partial<EltData>) => {
    const newData = { ...eltData, ...data };
    setEltData(newData);
    
    // Save to backend if we have an aircraftId
    if (newData.aircraftId) {
      try {
        const backendFormat = toBackendFormat(newData);
        await eltService.upsert(newData.aircraftId, backendFormat);
        console.log('ELT data updated and saved to backend');
      } catch (err: any) {
        console.error('Error saving ELT data to backend:', err);
        setError(err.message || 'Failed to save ELT data');
        // Data is still updated locally even if save fails
      }
    }
  }, [eltData]);

  const applyOcrData = useCallback((data: Partial<EltData>) => {
    // Apply OCR data after user validation
    const newData = {
      ...eltData,
      ...data,
      lastOcrScanDate: new Date().toISOString().split('T')[0],
      ocrValidated: true,
    };
    setEltData(newData);
    
    // Auto-save after OCR
    if (newData.aircraftId) {
      const backendFormat = toBackendFormat(newData);
      eltService.upsert(newData.aircraftId, backendFormat).catch(err => {
        console.error('Error saving OCR data to backend:', err);
      });
    }
  }, [eltData]);

  const addOcrScan = useCallback((scan: Omit<OcrScanRecord, 'id'>) => {
    const newScan: OcrScanRecord = { ...scan, id: generateId() };
    setOcrHistory((prev) => [newScan, ...prev]);
  }, []);

  const getTestProgress = useCallback(() => {
    return calculateDateProgress(eltData.lastTestDate, ELT_FIXED_LIMITS.TEST_MONTHS);
  }, [eltData.lastTestDate]);

  const getBatteryProgress = useCallback(() => {
    if (!eltData.batteryExpiryDate || !eltData.lastBatteryDate) {
      return { percent: 0, daysRemaining: 0, status: 'operational' as EltStatus };
    }
    
    const expiry = new Date(eltData.batteryExpiryDate);
    const now = new Date();
    const last = new Date(eltData.lastBatteryDate);
    
    // Handle invalid dates
    if (isNaN(expiry.getTime()) || isNaN(last.getTime())) {
      return { percent: 0, daysRemaining: 0, status: 'operational' as EltStatus };
    }
    
    const totalDays = (expiry.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    
    // Prevent division by zero
    if (totalDays <= 0) {
      return { percent: 100, daysRemaining: 0, status: 'expired' as EltStatus };
    }
    
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
  }, [eltData.batteryExpiryDate, eltData.lastBatteryDate]);

  const getEltStatus = useCallback((): EltStatus => {
    // TC-SAFE: Check if ANY ELT date is present
    const hasAnyEltDate = !!(
      eltData.lastTestDate ||
      eltData.lastBatteryDate ||
      eltData.batteryExpiryDate ||
      eltData.activationDate ||
      eltData.serviceDate
    );
    
    // If no ELT date is present, return 'unknown' status
    if (!hasAnyEltDate) {
      return 'unknown';
    }
    
    const testProgress = getTestProgress();
    const batteryProgress = getBatteryProgress();
    
    if (testProgress.status === 'expired' || batteryProgress.status === 'expired') {
      return 'expired';
    }
    if (testProgress.status === 'attention' || batteryProgress.status === 'attention') {
      return 'attention';
    }
    return 'operational';
  }, [eltData, getTestProgress, getBatteryProgress]);

  return React.createElement(
    EltContext.Provider,
    {
      value: {
        eltData,
        fixedLimits: ELT_FIXED_LIMITS,
        ocrHistory,
        isLoading,
        error,
        updateEltData,
        applyOcrData,
        addOcrScan,
        getEltStatus,
        getTestProgress,
        getBatteryProgress,
        loadEltData,
        saveEltData,
      },
    },
    children
  );
}

// Default fallback context value
const defaultContextValue: EltContextType = {
  eltData: emptyEltData,
  fixedLimits: ELT_FIXED_LIMITS,
  ocrHistory: [],
  isLoading: false,
  error: null,
  updateEltData: async () => console.warn('EltProvider not found'),
  applyOcrData: () => console.warn('EltProvider not found'),
  addOcrScan: () => console.warn('EltProvider not found'),
  getEltStatus: () => 'operational' as EltStatus,
  getTestProgress: () => ({ percent: 0, daysRemaining: 0, status: 'operational' as EltStatus }),
  getBatteryProgress: () => ({ percent: 0, daysRemaining: 0, status: 'operational' as EltStatus }),
  loadEltData: async () => console.warn('EltProvider not found'),
  saveEltData: async () => console.warn('EltProvider not found'),
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
