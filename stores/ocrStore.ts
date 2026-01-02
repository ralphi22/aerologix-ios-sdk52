/**
 * OCR Central Store - Manages all OCR scanned documents and data distribution
 * TC-SAFE: OCR data must be validated by user before storage
 * No automatic decisions, no regulatory validation
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================
export type OcrDocumentType = 'maintenance_report' | 'invoice' | 'other';

export interface OcrDetectedHours {
  airframeHours?: number;
  engineHours?: number;
  propellerHours?: number;
}

export interface OcrDetectedPart {
  name: string;
  partNumber: string;
  quantity: number;
  action: 'installed' | 'replaced' | 'removed' | 'inspected';
}

export interface OcrDetectedAdSb {
  type: 'AD' | 'SB';
  number: string;
  description: string;
}

export interface OcrDetectedElt {
  testMentioned: boolean;
  testDate?: string;
  installationMentioned: boolean;
  removalMentioned: boolean;
}

export interface OcrDetectedInvoice {
  supplier: string;
  date: string;
  partsAmount: number;
  laborAmount: number;
  hoursWorked: number;
  totalAmount: number;
}

export interface OcrMaintenanceReportData {
  // Identification
  registration?: string;
  reportDate?: string;
  amo?: string;
  description?: string;
  
  // Hours (critical)
  hours?: OcrDetectedHours;
  
  // Parts
  parts?: OcrDetectedPart[];
  
  // AD/SB
  adSbs?: OcrDetectedAdSb[];
  
  // ELT
  elt?: OcrDetectedElt;
  
  // Confidence levels
  confidence: Record<string, number>;
}

export interface OcrInvoiceData {
  invoice: OcrDetectedInvoice;
  confidence: Record<string, number>;
}

export interface OcrDocument {
  id: string;
  type: OcrDocumentType;
  aircraftId: string;
  registration: string;
  scanDate: string;
  documentDate?: string;
  
  // Source info
  sourceType: 'photo' | 'import';
  imageUri?: string;
  
  // Detected data (depends on type)
  maintenanceData?: OcrMaintenanceReportData;
  invoiceData?: OcrInvoiceData;
  
  // Validation status
  validated: boolean;
  appliedToModules: string[];
  
  // User tags (for 'other' type)
  tags?: string[];
  notes?: string;
  
  // Anti-duplicate key for maintenance reports
  duplicateKey?: string;
}

interface OcrContextType {
  documents: OcrDocument[];
  addDocument: (doc: Omit<OcrDocument, 'id'>) => string;
  updateDocument: (id: string, data: Partial<OcrDocument>) => void;
  deleteDocument: (id: string) => void;
  getDocumentsByAircraft: (aircraftId: string) => OcrDocument[];
  getDocumentById: (id: string) => OcrDocument | undefined;
  checkDuplicate: (registration: string, reportDate: string, amo: string) => boolean;
  markAsApplied: (id: string, modules: string[]) => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Generate duplicate key for maintenance reports
const generateDuplicateKey = (registration: string, reportDate: string, amo: string): string => {
  return `${registration.toLowerCase()}-${reportDate}-${amo.toLowerCase()}`.replace(/\s+/g, '');
};

// Mock documents for demo
const mockDocuments: OcrDocument[] = [
  {
    id: 'ocr1',
    type: 'maintenance_report',
    aircraftId: 'mock',
    registration: 'C-FKZY',
    scanDate: '2024-11-15',
    documentDate: '2024-10-28',
    sourceType: 'photo',
    maintenanceData: {
      registration: 'C-FKZY',
      reportDate: '2024-10-28',
      amo: 'Air Mechanic',
      description: 'Annual Inspection per CAR 625 Appendix B and C',
      hours: {
        airframeHours: 6344.6,
        engineHours: 1281.8,
      },
      parts: [
        { name: 'Oil Filter', partNumber: 'CH48108-1', quantity: 1, action: 'replaced' },
        { name: 'Spark Plugs', partNumber: 'REM40E', quantity: 4, action: 'replaced' },
      ],
      adSbs: [
        { type: 'AD', number: 'CF-90-03R2', description: 'Cabin heater inspection' },
        { type: 'AD', number: '2011-10-09', description: 'Seat locking mechanism' },
      ],
      elt: {
        testMentioned: false,
        installationMentioned: false,
        removalMentioned: true,
      },
      confidence: {
        registration: 95,
        reportDate: 90,
        amo: 85,
        airframeHours: 92,
        engineHours: 91,
      },
    },
    validated: true,
    appliedToModules: ['aircraft', 'parts', 'ad-sb'],
    duplicateKey: 'c-fkzy-2024-10-28-airmechanic',
  },
  {
    id: 'ocr2',
    type: 'invoice',
    aircraftId: 'mock',
    registration: 'C-FKZY',
    scanDate: '2024-11-11',
    documentDate: '2024-11-11',
    sourceType: 'import',
    invoiceData: {
      invoice: {
        supplier: 'AirMecanic Inc.',
        date: '2024-11-11',
        partsAmount: 2083.17,
        laborAmount: 4150.00,
        hoursWorked: 41.5,
        totalAmount: 6994.15,
      },
      confidence: {
        supplier: 88,
        date: 95,
        partsAmount: 82,
        laborAmount: 85,
        totalAmount: 90,
      },
    },
    validated: true,
    appliedToModules: ['invoices'],
  },
];

const OcrContext = createContext<OcrContextType | undefined>(undefined);

export function OcrProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<OcrDocument[]>(mockDocuments);

  const addDocument = (docData: Omit<OcrDocument, 'id'>): string => {
    const id = generateId();
    const newDoc: OcrDocument = { ...docData, id };
    
    // Generate duplicate key for maintenance reports
    if (docData.type === 'maintenance_report' && docData.maintenanceData) {
      const { registration, reportDate, amo } = docData.maintenanceData;
      if (registration && reportDate && amo) {
        newDoc.duplicateKey = generateDuplicateKey(registration, reportDate, amo);
      }
    }
    
    setDocuments((prev) => [newDoc, ...prev]);
    return id;
  };

  const updateDocument = (id: string, data: Partial<OcrDocument>) => {
    setDocuments((prev) => prev.map((doc) => 
      doc.id === id ? { ...doc, ...data } : doc
    ));
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const getDocumentsByAircraft = (aircraftId: string): OcrDocument[] => {
    // Return all for demo
    return documents;
  };

  const getDocumentById = (id: string): OcrDocument | undefined => {
    return documents.find((doc) => doc.id === id);
  };

  const checkDuplicate = (registration: string, reportDate: string, amo: string): boolean => {
    const key = generateDuplicateKey(registration, reportDate, amo);
    return documents.some((doc) => doc.duplicateKey === key);
  };

  const markAsApplied = (id: string, modules: string[]) => {
    setDocuments((prev) => prev.map((doc) => 
      doc.id === id 
        ? { ...doc, validated: true, appliedToModules: [...new Set([...doc.appliedToModules, ...modules])] }
        : doc
    ));
  };

  return React.createElement(
    OcrContext.Provider,
    {
      value: {
        documents,
        addDocument,
        updateDocument,
        deleteDocument,
        getDocumentsByAircraft,
        getDocumentById,
        checkDuplicate,
        markAsApplied,
      },
    },
    children
  );
}

// Default fallback context value
const defaultOcrContextValue: OcrContextType = {
  documents: [],
  addDocument: () => { console.warn('OcrProvider not found'); return ''; },
  updateDocument: () => console.warn('OcrProvider not found'),
  deleteDocument: () => console.warn('OcrProvider not found'),
  getDocumentsByAircraft: () => [],
  getDocumentById: () => undefined,
  checkDuplicate: () => false,
  markAsApplied: () => console.warn('OcrProvider not found'),
};

export function useOcr(): OcrContextType {
  const context = useContext(OcrContext);
  // Return default values instead of throwing error to prevent crashes
  if (!context) {
    console.warn('useOcr called outside of OcrProvider, using defaults');
    return defaultOcrContextValue;
  }
  return context;
}
