/**
 * Maintenance Data Store - Local state for Parts, AD/SB, STC, Invoices
 * Visual storage only - no regulatory decisions
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export interface Part {
  id: string;
  name: string;
  partNumber: string;
  quantity: number;
  installedDate: string;
  aircraftId: string;
}

export interface AdSb {
  id: string;
  type: 'AD' | 'SB';
  number: string;
  description: string;
  dateAdded: string;
  aircraftId: string;
}

export interface Stc {
  id: string;
  number: string;
  reference: string;
  description: string;
  dateAdded: string;
  aircraftId: string;
}

export interface Invoice {
  id: string;
  supplier: string;
  date: string;
  partsAmount: number;
  laborAmount: number;
  hoursWorked: number;
  totalAmount: number;
  aircraftId: string;
  notes: string;
}

// ============================================
// CONTEXT
// ============================================

interface MaintenanceDataContextType {
  // Parts
  parts: Part[];
  addPart: (part: Omit<Part, 'id'>) => void;
  deletePart: (id: string) => void;
  getPartsByAircraft: (aircraftId: string) => Part[];
  // AD/SB
  adSbs: AdSb[];
  addAdSb: (adSb: Omit<AdSb, 'id'>) => void;
  deleteAdSb: (id: string) => void;
  getAdSbsByAircraft: (aircraftId: string) => AdSb[];
  // STC
  stcs: Stc[];
  addStc: (stc: Omit<Stc, 'id'>) => void;
  deleteStc: (id: string) => void;
  getStcsByAircraft: (aircraftId: string) => Stc[];
  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getInvoicesByAircraft: (aircraftId: string) => Invoice[];
  getInvoiceById: (id: string) => Invoice | undefined;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Mock data for demonstration
const mockParts: Part[] = [
  {
    id: 'p1',
    name: 'Spark Plug',
    partNumber: 'REM40E',
    quantity: 4,
    installedDate: '2024-06-15',
    aircraftId: 'mock',
  },
  {
    id: 'p2',
    name: 'Oil Filter',
    partNumber: 'CH48110-1',
    quantity: 1,
    installedDate: '2024-08-20',
    aircraftId: 'mock',
  },
];

const mockAdSbs: AdSb[] = [
  {
    id: 'ad1',
    type: 'AD',
    number: 'AD 96-09-06',
    description: 'Cessna 100 Series - Fuel Tank Selector Valve',
    dateAdded: '2024-01-15',
    aircraftId: 'mock',
  },
  {
    id: 'sb1',
    type: 'SB',
    number: 'SB 1256',
    description: 'Continental Engine - Crankshaft Inspection',
    dateAdded: '2024-03-20',
    aircraftId: 'mock',
  },
];

const mockStcs: Stc[] = [
  {
    id: 'stc1',
    number: 'SA02345CH',
    reference: 'STC-150L-001',
    description: 'Auto fuel conversion kit',
    dateAdded: '2023-11-10',
    aircraftId: 'mock',
  },
];

const MaintenanceDataContext = createContext<MaintenanceDataContextType | undefined>(undefined);

export function MaintenanceDataProvider({ children }: { children: ReactNode }) {
  const [parts, setParts] = useState<Part[]>(mockParts);
  const [adSbs, setAdSbs] = useState<AdSb[]>(mockAdSbs);
  const [stcs, setStcs] = useState<Stc[]>(mockStcs);

  // Parts
  const addPart = (partData: Omit<Part, 'id'>) => {
    const newPart: Part = { ...partData, id: generateId() };
    setParts((prev) => [newPart, ...prev]);
  };

  const deletePart = (id: string) => {
    setParts((prev) => prev.filter((p) => p.id !== id));
  };

  const getPartsByAircraft = (aircraftId: string) => {
    // Return all parts for demo (in real app, filter by aircraftId)
    return parts;
  };

  // AD/SB
  const addAdSb = (adSbData: Omit<AdSb, 'id'>) => {
    const newAdSb: AdSb = { ...adSbData, id: generateId() };
    setAdSbs((prev) => [newAdSb, ...prev]);
  };

  const deleteAdSb = (id: string) => {
    setAdSbs((prev) => prev.filter((a) => a.id !== id));
  };

  const getAdSbsByAircraft = (aircraftId: string) => {
    return adSbs;
  };

  // STC
  const addStc = (stcData: Omit<Stc, 'id'>) => {
    const newStc: Stc = { ...stcData, id: generateId() };
    setStcs((prev) => [newStc, ...prev]);
  };

  const deleteStc = (id: string) => {
    setStcs((prev) => prev.filter((s) => s.id !== id));
  };

  const getStcsByAircraft = (aircraftId: string) => {
    return stcs;
  };

  return React.createElement(
    MaintenanceDataContext.Provider,
    {
      value: {
        parts, addPart, deletePart, getPartsByAircraft,
        adSbs, addAdSb, deleteAdSb, getAdSbsByAircraft,
        stcs, addStc, deleteStc, getStcsByAircraft,
      },
    },
    children
  );
}

export function useMaintenanceData(): MaintenanceDataContextType {
  const context = useContext(MaintenanceDataContext);
  if (!context) {
    throw new Error('useMaintenanceData must be used within MaintenanceDataProvider');
  }
  return context;
}
