/**
 * Maintenance Data Store - Local state for Parts, AD/SB, STC, Invoices
 * Now syncs with backend via maintenanceService
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import maintenanceService, { 
  PartRecord, 
  ADSBRecord, 
  STCRecord, 
  InvoiceRecord 
} from '@/services/maintenanceService';

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
  serialNumber?: string;
  supplier?: string;
  price?: number;
}

export interface AdSb {
  id: string;
  type: 'AD' | 'SB';
  number: string;
  description: string;
  dateAdded: string;
  aircraftId: string;
  status?: string;
  complianceDate?: string;
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
  invoiceNumber?: string;
}

// ============================================
// MAPPING FUNCTIONS - Backend <-> Local
// ============================================

// Helper to get ID from backend record (supports both id and _id)
const getRecordId = (record: any): string => {
  const id = record.id || record._id;
  if (!id) {
    console.warn('Record missing id:', record);
    return '';
  }
  return String(id);
};

const mapPartFromBackend = (p: PartRecord): Part => ({
  id: getRecordId(p),
  name: p.name || p.part_number || '',
  partNumber: p.part_number || '',
  quantity: p.quantity || 1,
  installedDate: p.installed_date || p.created_at?.split('T')[0] || '',
  aircraftId: p.aircraft_id || '',
  serialNumber: p.serial_number,
  supplier: p.supplier,
  price: p.price,
});

const mapAdSbFromBackend = (a: ADSBRecord): AdSb => ({
  id: getRecordId(a),
  type: a.adsb_type || 'AD',
  number: a.reference_number || '',
  description: a.description || '',
  dateAdded: a.compliance_date || a.created_at?.split('T')[0] || '',
  aircraftId: a.aircraft_id || '',
  status: a.status,
  complianceDate: a.compliance_date,
});

const mapStcFromBackend = (s: STCRecord): Stc => ({
  id: getRecordId(s),
  number: s.stc_number || '',
  reference: s.stc_number || '',
  description: s.description || '',
  dateAdded: s.approval_date || s.created_at?.split('T')[0] || '',
  aircraftId: s.aircraft_id || '',
});

const mapInvoiceFromBackend = (i: InvoiceRecord): Invoice => ({
  id: getRecordId(i),
  supplier: i.vendor_name || '',
  date: i.invoice_date || i.created_at?.split('T')[0] || '',
  partsAmount: i.parts_cost || 0,
  laborAmount: i.labor_cost || 0,
  hoursWorked: i.labor_hours || 0,
  totalAmount: i.total_cost || 0,
  aircraftId: i.aircraft_id || '',
  notes: i.description || '',
  invoiceNumber: i.invoice_number,
});

// ============================================
// CONTEXT
// ============================================

interface MaintenanceDataContextType {
  // Parts
  parts: Part[];
  addPart: (part: Omit<Part, 'id'>) => void;
  deletePart: (id: string) => Promise<boolean>;
  getPartsByAircraft: (aircraftId: string) => Part[];
  // AD/SB
  adSbs: AdSb[];
  addAdSb: (adSb: Omit<AdSb, 'id'>) => void;
  deleteAdSb: (id: string) => Promise<boolean>;
  getAdSbsByAircraft: (aircraftId: string) => AdSb[];
  // STC
  stcs: Stc[];
  addStc: (stc: Omit<Stc, 'id'>) => void;
  deleteStc: (id: string) => Promise<boolean>;
  getStcsByAircraft: (aircraftId: string) => Stc[];
  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => Promise<boolean>;
  getInvoicesByAircraft: (aircraftId: string) => Invoice[];
  getInvoiceById: (id: string) => Invoice | undefined;
  // NEW: Sync with backend
  syncWithBackend: (aircraftId: string) => Promise<void>;
  isLoading: boolean;
  isDeleting: boolean;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const MaintenanceDataContext = createContext<MaintenanceDataContextType | undefined>(undefined);

export function MaintenanceDataProvider({ children }: { children: ReactNode }) {
  const [parts, setParts] = useState<Part[]>([]);
  const [adSbs, setAdSbs] = useState<AdSb[]>([]);
  const [stcs, setStcs] = useState<Stc[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // NEW: Sync all data from backend
  const syncWithBackend = async (aircraftId: string) => {
    if (!aircraftId) return;
    
    setIsLoading(true);
    try {
      const data = await maintenanceService.syncAllData(aircraftId);
      
      // Log raw backend data for debugging
      console.log('Backend data received:', {
        parts: data.parts.map((p: any) => ({ id: p.id, _id: p._id, part_number: p.part_number })),
        adsbs: data.adsbs.map((a: any) => ({ id: a.id, _id: a._id, reference_number: a.reference_number })),
      });
      
      // Map backend data to local format
      const mappedParts = data.parts.map(mapPartFromBackend);
      const mappedAdsbs = data.adsbs.map(mapAdSbFromBackend);
      const mappedStcs = data.stcs.map(mapStcFromBackend);
      const mappedInvoices = data.invoices.map(mapInvoiceFromBackend);
      
      console.log('Mapped data IDs:', {
        parts: mappedParts.map(p => p.id),
        adsbs: mappedAdsbs.map(a => a.id),
      });
      
      setParts(mappedParts);
      setAdSbs(mappedAdsbs);
      setStcs(mappedStcs);
      setInvoices(mappedInvoices);
      
      console.log('Maintenance data synced:', {
        parts: data.parts.length,
        adsbs: data.adsbs.length,
        stcs: data.stcs.length,
        invoices: data.invoices.length,
      });
    } catch (error) {
      console.log('Error syncing maintenance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Parts
  const addPart = (partData: Omit<Part, 'id'>) => {
    const newPart: Part = { ...partData, id: generateId() };
    setParts((prev) => [newPart, ...prev]);
  };

  const deletePart = async (id: string): Promise<boolean> => {
    console.log('DELETE part', id);
    setIsDeleting(true);
    try {
      const success = await maintenanceService.deletePart(id);
      console.log('DELETE part response', success ? 'SUCCESS' : 'FAILED');
      if (success) {
        setParts((prev) => prev.filter((p) => p.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.log('DELETE part error', error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const getPartsByAircraft = (aircraftId: string) => {
    return parts.filter((p) => p.aircraftId === aircraftId || p.aircraftId === 'mock');
  };

  // AD/SB
  const addAdSb = (adSbData: Omit<AdSb, 'id'>) => {
    const newAdSb: AdSb = { ...adSbData, id: generateId() };
    setAdSbs((prev) => [newAdSb, ...prev]);
  };

  const deleteAdSb = async (id: string): Promise<boolean> => {
    console.log('DELETE adsb', id);
    setIsDeleting(true);
    try {
      const success = await maintenanceService.deleteADSB(id);
      console.log('DELETE adsb response', success ? 'SUCCESS' : 'FAILED');
      if (success) {
        setAdSbs((prev) => prev.filter((a) => a.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.log('DELETE adsb error', error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const getAdSbsByAircraft = (aircraftId: string) => {
    return adSbs.filter((a) => a.aircraftId === aircraftId || a.aircraftId === 'mock');
  };

  // STC
  const addStc = (stcData: Omit<Stc, 'id'>) => {
    const newStc: Stc = { ...stcData, id: generateId() };
    setStcs((prev) => [newStc, ...prev]);
  };

  const deleteStc = async (id: string): Promise<boolean> => {
    console.log('DELETE stc', id);
    setIsDeleting(true);
    try {
      const success = await maintenanceService.deleteSTC(id);
      console.log('DELETE stc response', success ? 'SUCCESS' : 'FAILED');
      if (success) {
        setStcs((prev) => prev.filter((s) => s.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.log('DELETE stc error', error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const getStcsByAircraft = (aircraftId: string) => {
    return stcs.filter((s) => s.aircraftId === aircraftId || s.aircraftId === 'mock');
  };

  // Invoices
  const addInvoice = (invoiceData: Omit<Invoice, 'id'>) => {
    const newInvoice: Invoice = { ...invoiceData, id: generateId() };
    setInvoices((prev) => [newInvoice, ...prev]);
  };

  const updateInvoice = (id: string, data: Partial<Invoice>) => {
    setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, ...data } : inv));
  };

  const deleteInvoice = async (id: string): Promise<boolean> => {
    console.log('DELETE invoice', id);
    setIsDeleting(true);
    try {
      const success = await maintenanceService.deleteInvoice(id);
      console.log('DELETE invoice response', success ? 'SUCCESS' : 'FAILED');
      if (success) {
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.log('DELETE invoice error', error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const getInvoicesByAircraft = (aircraftId: string) => {
    return invoices.filter((i) => i.aircraftId === aircraftId || i.aircraftId === 'mock');
  };

  const getInvoiceById = (id: string) => {
    return invoices.find((inv) => inv.id === id);
  };

  return React.createElement(
    MaintenanceDataContext.Provider,
    {
      value: {
        parts, addPart, deletePart, getPartsByAircraft,
        adSbs, addAdSb, deleteAdSb, getAdSbsByAircraft,
        stcs, addStc, deleteStc, getStcsByAircraft,
        invoices, addInvoice, updateInvoice, deleteInvoice, getInvoicesByAircraft, getInvoiceById,
        syncWithBackend, isLoading, isDeleting,
      },
    },
    children
  );
}

// Default fallback context value
const defaultMaintenanceContextValue: MaintenanceDataContextType = {
  parts: [],
  addPart: () => console.warn('MaintenanceDataProvider not found'),
  deletePart: async () => { console.warn('MaintenanceDataProvider not found'); return false; },
  getPartsByAircraft: () => [],
  adSbs: [],
  addAdSb: () => console.warn('MaintenanceDataProvider not found'),
  deleteAdSb: async () => { console.warn('MaintenanceDataProvider not found'); return false; },
  getAdSbsByAircraft: () => [],
  stcs: [],
  addStc: () => console.warn('MaintenanceDataProvider not found'),
  deleteStc: async () => { console.warn('MaintenanceDataProvider not found'); return false; },
  getStcsByAircraft: () => [],
  invoices: [],
  addInvoice: () => console.warn('MaintenanceDataProvider not found'),
  updateInvoice: () => console.warn('MaintenanceDataProvider not found'),
  deleteInvoice: async () => { console.warn('MaintenanceDataProvider not found'); return false; },
  getInvoicesByAircraft: () => [],
  getInvoiceById: () => undefined,
  syncWithBackend: async () => console.warn('MaintenanceDataProvider not found'),
  isLoading: false,
  isDeleting: false,
};

export function useMaintenanceData(): MaintenanceDataContextType {
  const context = useContext(MaintenanceDataContext);
  // Return default values instead of throwing error to prevent crashes
  if (!context) {
    console.warn('useMaintenanceData called outside of MaintenanceDataProvider, using defaults');
    return defaultMaintenanceContextValue;
  }
  return context;
}
