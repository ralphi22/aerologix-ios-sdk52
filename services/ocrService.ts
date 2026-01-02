/**
 * OCR Service - API calls for OCR document analysis
 * Uses OpenAI Vision API via Render backend
 */

import api from './api';

// Document types supported by backend
export type DocumentType = 'maintenance_report' | 'stc' | 'invoice' | 'logbook' | 'other';

// OCR Status
export type OCRStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'APPLIED';

// Extracted AD/SB from OCR
export interface ExtractedADSB {
  type: 'AD' | 'SB';
  number: string;
  description?: string;
  compliance_date?: string;
}

// Extracted Part from OCR
export interface ExtractedPart {
  name: string;
  part_number?: string;
  serial_number?: string;
  quantity?: number;
  action?: string;
}

// Extracted STC from OCR
export interface ExtractedSTC {
  number: string;
  description?: string;
  approval_date?: string;
}

// Extracted ELT Data from OCR
export interface ExtractedELTData {
  test_mentioned?: boolean;
  test_date?: string;
  removal_mentioned?: boolean;
  installation_mentioned?: boolean;
  model?: string;
  serial_number?: string;
}

// Main extracted data structure
export interface ExtractedMaintenanceData {
  date?: string;
  ame_name?: string;
  amo_name?: string;
  ame_license?: string;
  work_order_number?: string;
  description?: string;
  airframe_hours?: number;
  engine_hours?: number;
  propeller_hours?: number;
  remarks?: string;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  ad_sb_references?: ExtractedADSB[];
  parts_replaced?: ExtractedPart[];
  stc_references?: ExtractedSTC[];
  elt_data?: ExtractedELTData;
}

// OCR Scan Request
export interface OCRScanCreate {
  aircraft_id: string;
  document_type: DocumentType;
  image_base64: string;
}

// OCR Scan Response
export interface OCRScanResponse {
  id: string;
  status: OCRStatus;
  document_type: DocumentType;
  raw_text?: string;
  extracted_data?: ExtractedMaintenanceData;
  error_message?: string;
  created_at: string;
}

// Quota Status
export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number;
}

class OcrService {
  /**
   * Scan a document image using OCR
   * POST /api/ocr/scan
   */
  async scanDocument(data: OCRScanCreate): Promise<OCRScanResponse> {
    const response = await api.post('/api/ocr/scan', data);
    return response.data;
  }

  /**
   * Get OCR scan history for an aircraft
   * GET /api/ocr/history/:aircraft_id
   */
  async getHistory(aircraftId: string, limit: number = 20): Promise<OCRScanResponse[]> {
    const response = await api.get(`/api/ocr/history/${aircraftId}`, {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Get a specific OCR scan
   * GET /api/ocr/:scan_id
   */
  async getScan(scanId: string): Promise<OCRScanResponse> {
    const response = await api.get(`/api/ocr/${scanId}`);
    return response.data;
  }

  /**
   * Apply OCR results to the system
   * POST /api/ocr/apply/:scan_id
   */
  async applyResults(scanId: string, updateAircraftHours: boolean = true): Promise<any> {
    const response = await api.post(`/api/ocr/apply/${scanId}`, null, {
      params: { update_aircraft_hours: updateAircraftHours },
    });
    return response.data;
  }

  /**
   * Check for duplicates before applying
   * GET /api/ocr/check-duplicates/:scan_id
   */
  async checkDuplicates(scanId: string): Promise<any> {
    const response = await api.get(`/api/ocr/check-duplicates/${scanId}`);
    return response.data;
  }

  /**
   * Delete an OCR scan
   * DELETE /api/ocr/:scan_id
   */
  async deleteScan(scanId: string): Promise<void> {
    await api.delete(`/api/ocr/${scanId}`);
  }

  /**
   * Get OCR quota status
   * GET /api/ocr/quota/status
   */
  async getQuotaStatus(): Promise<QuotaStatus> {
    try {
      const response = await api.get('/api/ocr/quota/status');
      return response.data;
    } catch (error: any) {
      console.log('Error fetching OCR quota:', error.message);
      return { limit: 10, used: 0, remaining: 10 };
    }
  }
}

export default new OcrService();
