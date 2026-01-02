/**
 * OCR Service - API calls for OCR document analysis
 * Uses OpenAI Vision API via Render backend
 */

import api from './api';
import { OcrDocumentType, OcrMaintenanceReportData, OcrInvoiceData } from '@/stores/ocrStore';

export interface OcrAnalysisRequest {
  image_base64: string;
  document_type: OcrDocumentType;
  registration?: string;
}

export interface OcrAnalysisResponse {
  success: boolean;
  document_type: OcrDocumentType;
  maintenance_data?: OcrMaintenanceReportData;
  invoice_data?: OcrInvoiceData;
  raw_text?: string;
  error?: string;
}

class OcrService {
  /**
   * Analyze a document image using OCR
   * POST /api/ocr/analyze
   */
  async analyzeDocument(
    imageBase64: string,
    documentType: OcrDocumentType,
    registration?: string
  ): Promise<OcrAnalysisResponse> {
    try {
      const response = await api.post('/api/ocr/analyze', {
        image_base64: imageBase64,
        document_type: documentType,
        registration: registration,
      });
      return response.data;
    } catch (error: any) {
      console.log('OCR analysis error:', error.message);
      
      // If endpoint doesn't exist, return error
      if (error.response?.status === 404) {
        return {
          success: false,
          document_type: documentType,
          error: 'OCR endpoint not available on backend',
        };
      }
      
      throw error;
    }
  }

  /**
   * Get OCR usage stats for current user
   * GET /api/ocr/usage
   */
  async getUsage(): Promise<{ used: number; limit: number }> {
    try {
      const response = await api.get('/api/ocr/usage');
      return response.data;
    } catch (error: any) {
      console.log('Error fetching OCR usage:', error.message);
      return { used: 0, limit: 10 };
    }
  }
}

export default new OcrService();
