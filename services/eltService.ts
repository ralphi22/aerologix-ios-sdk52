import api from './api';

/**
 * ELT Service - API communication for ELT (Emergency Locator Transmitter) data
 * Backend endpoints: /api/elt
 */

export interface EltDataBackend {
  _id?: string;
  aircraft_id: string;
  // ELT identification
  manufacturer: string;
  model: string;
  serial_number: string;
  elt_type: string;
  hex_code: string;
  // Dates
  activation_date: string;
  service_date: string;
  last_test_date: string;
  last_battery_date: string;
  battery_expiry_date: string;
  // OCR metadata
  last_ocr_scan_date?: string;
  ocr_validated?: boolean;
  // Timestamps
  created_at?: string;
  updated_at?: string;
}

class EltService {
  /**
   * Get ELT data for a specific aircraft
   */
  async getByAircraftId(aircraftId: string): Promise<EltDataBackend | null> {
    try {
      const response = await api.get(`/api/elt/aircraft/${aircraftId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create new ELT data for an aircraft
   */
  async create(data: EltDataBackend): Promise<EltDataBackend> {
    const response = await api.post('/api/elt', data);
    return response.data;
  }

  /**
   * Update existing ELT data
   */
  async update(aircraftId: string, data: Partial<EltDataBackend>): Promise<EltDataBackend> {
    const response = await api.put(`/api/elt/aircraft/${aircraftId}`, data);
    return response.data;
  }

  /**
   * Create or update ELT data (upsert)
   */
  async upsert(aircraftId: string, data: Omit<EltDataBackend, 'aircraft_id'>): Promise<EltDataBackend> {
    const payload = { ...data, aircraft_id: aircraftId };
    const response = await api.put(`/api/elt/aircraft/${aircraftId}`, payload);
    return response.data;
  }
}

export default new EltService();
