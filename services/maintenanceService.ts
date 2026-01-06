/**
 * Maintenance Service - API calls for Parts, AD/SB, STC, Invoices
 * Syncs frontend stores with backend data
 */

import api from './api';

// ============================================
// TYPES - Parts
// ============================================
export interface PartRecord {
  id?: string;
  _id?: string;  // MongoDB format
  aircraft_id: string;
  part_number: string;
  name?: string;
  serial_number?: string;
  quantity: number;
  action: string;
  installed_date?: string;
  supplier?: string;
  price?: number;
  source_scan_id?: string;
  created_at: string;
}

// ============================================
// TYPES - AD/SB
// ============================================
export interface ADSBRecord {
  id?: string;
  _id?: string;  // MongoDB format
  aircraft_id: string;
  adsb_type: 'AD' | 'SB';
  reference_number: string;
  description?: string;
  status?: string;
  compliance_date?: string;
  airframe_hours?: number;
  engine_hours?: number;
  source_scan_id?: string;
  created_at: string;
}

// ============================================
// TYPES - STC
// ============================================
export interface STCRecord {
  id?: string;
  _id?: string;  // MongoDB format
  aircraft_id: string;
  stc_number: string;
  description?: string;
  approval_date?: string;
  source_scan_id?: string;
  created_at: string;
}

// ============================================
// TYPES - Invoices
// ============================================
export interface InvoiceRecord {
  id?: string;
  _id?: string;  // MongoDB format
  aircraft_id: string;
  vendor_name?: string;
  invoice_date?: string;
  invoice_number?: string;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  labor_hours?: number;
  description?: string;
  source_scan_id?: string;
  created_at: string;
}

// ============================================
// SERVICE
// ============================================
class MaintenanceService {
  
  // ========== PARTS ==========
  
  async getParts(aircraftId: string): Promise<PartRecord[]> {
    try {
      const response = await api.get(`/api/parts/${aircraftId}`);
      return response.data || [];
    } catch (error: any) {
      console.log('Error fetching parts:', error.message);
      return [];
    }
  }
  
  async addPart(data: Omit<PartRecord, 'id' | 'created_at'>): Promise<PartRecord | null> {
    try {
      const response = await api.post('/api/parts', data);
      return response.data;
    } catch (error: any) {
      console.log('Error adding part:', error.message);
      return null;
    }
  }
  
  async deletePart(partId: string): Promise<boolean> {
    console.log('DELETE part request:', partId);
    try {
      const response = await api.delete(`/api/parts/${partId}`);
      console.log('DELETE part response:', response.status);
      return true;
    } catch (error: any) {
      console.log('DELETE part error:', error.response?.status, error.message);
      return false;
    }
  }
  
  // ========== AD/SB ==========
  
  async getADSBs(aircraftId: string): Promise<ADSBRecord[]> {
    try {
      const response = await api.get(`/api/adsb/${aircraftId}`);
      return response.data || [];
    } catch (error: any) {
      console.log('Error fetching AD/SBs:', error.message);
      return [];
    }
  }
  
  async addADSB(data: Omit<ADSBRecord, 'id' | 'created_at'>): Promise<ADSBRecord | null> {
    try {
      const response = await api.post('/api/adsb', data);
      return response.data;
    } catch (error: any) {
      console.log('Error adding AD/SB:', error.message);
      return null;
    }
  }
  
  async deleteADSB(adsbId: string): Promise<boolean> {
    console.log('DELETE adsb request:', adsbId);
    try {
      const response = await api.delete(`/api/adsb/${adsbId}`);
      console.log('DELETE adsb response:', response.status);
      return true;
    } catch (error: any) {
      console.log('DELETE adsb error:', error.response?.status, error.message);
      return false;
    }
  }
  
  // ========== STC ==========
  
  async getSTCs(aircraftId: string): Promise<STCRecord[]> {
    try {
      const response = await api.get(`/api/stc/${aircraftId}`);
      return response.data || [];
    } catch (error: any) {
      console.log('Error fetching STCs:', error.message);
      return [];
    }
  }
  
  async addSTC(data: Omit<STCRecord, 'id' | 'created_at'>): Promise<STCRecord | null> {
    try {
      const response = await api.post('/api/stc', data);
      return response.data;
    } catch (error: any) {
      console.log('Error adding STC:', error.message);
      return null;
    }
  }
  
  async deleteSTC(stcId: string): Promise<boolean> {
    console.log('DELETE stc request:', stcId);
    try {
      const response = await api.delete(`/api/stc/${stcId}`);
      console.log('DELETE stc response:', response.status);
      return true;
    } catch (error: any) {
      console.log('DELETE stc error:', error.response?.status, error.message);
      return false;
    }
  }
  
  // ========== INVOICES ==========
  
  async getInvoices(aircraftId: string): Promise<InvoiceRecord[]> {
    try {
      const response = await api.get(`/api/invoices/${aircraftId}`);
      return response.data || [];
    } catch (error: any) {
      console.log('Error fetching invoices:', error.message);
      return [];
    }
  }
  
  async addInvoice(data: Omit<InvoiceRecord, 'id' | 'created_at'>): Promise<InvoiceRecord | null> {
    try {
      const response = await api.post('/api/invoices', data);
      return response.data;
    } catch (error: any) {
      console.log('Error adding invoice:', error.message);
      return null;
    }
  }
  
  async deleteInvoice(invoiceId: string): Promise<boolean> {
    console.log('DELETE invoice request:', invoiceId);
    try {
      const response = await api.delete(`/api/invoices/${invoiceId}`);
      console.log('DELETE invoice response:', response.status);
      return true;
    } catch (error: any) {
      console.log('DELETE invoice error:', error.response?.status, error.message);
      return false;
    }
  }
  
  // ========== SYNC ALL ==========
  
  /**
   * Fetch all maintenance data for an aircraft from backend
   * Call this after OCR apply to sync frontend with backend
   */
  async syncAllData(aircraftId: string): Promise<{
    parts: PartRecord[];
    adsbs: ADSBRecord[];
    stcs: STCRecord[];
    invoices: InvoiceRecord[];
  }> {
    const [parts, adsbs, stcs, invoices] = await Promise.all([
      this.getParts(aircraftId),
      this.getADSBs(aircraftId),
      this.getSTCs(aircraftId),
      this.getInvoices(aircraftId),
    ]);
    
    return { parts, adsbs, stcs, invoices };
  }
}

export default new MaintenanceService();
