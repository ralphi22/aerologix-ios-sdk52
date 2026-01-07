import api from './api';

/**
 * ELT Service - API communication for ELT (Emergency Locator Transmitter) data
 * Backend endpoints: /api/elt
 * 
 * Backend field names (from OpenAPI):
 * - brand (manufacturer)
 * - model
 * - serial_number
 * - installation_date (activation/installation)
 * - certification_date (service date)
 * - last_test_date
 * - battery_expiry_date
 * - battery_install_date (last battery change)
 * - battery_interval_months
 * - beacon_hex_id (hex code)
 * - registration_number
 * - remarks
 */

export interface EltDataBackend {
  _id?: string;
  aircraft_id?: string;
  // ELT identification
  brand?: string | null;              // manufacturer
  model?: string | null;
  serial_number?: string | null;
  beacon_hex_id?: string | null;      // hex code for 406 MHz
  registration_number?: string | null;
  // Dates
  installation_date?: string | null;  // activation date
  certification_date?: string | null; // service/certification date
  last_test_date?: string | null;
  battery_expiry_date?: string | null;
  battery_install_date?: string | null; // last battery change
  battery_interval_months?: number | null;
  // Other
  remarks?: string | null;
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
      console.log('EltService.getByAircraftId - fetching for aircraft:', aircraftId);
      const response = await api.get(`/api/elt/aircraft/${aircraftId}`);
      console.log('EltService.getByAircraftId - response:', JSON.stringify(response.data));
      return response.data;
    } catch (error: any) {
      console.log('EltService.getByAircraftId - error:', error.response?.status, error.message);
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
    console.log('EltService.create - data:', JSON.stringify(data));
    const response = await api.post('/api/elt/', data);
    console.log('EltService.create - response:', JSON.stringify(response.data));
    return response.data;
  }

  /**
   * Update existing ELT data (UPSERT - creates if not exists)
   */
  async upsert(aircraftId: string, data: Partial<EltDataBackend>): Promise<EltDataBackend> {
    console.log('EltService.upsert - aircraftId:', aircraftId, 'payload:', JSON.stringify(data));
    const response = await api.put(`/api/elt/aircraft/${aircraftId}`, data);
    console.log('EltService.upsert - response:', JSON.stringify(response.data));
    return response.data;
  }
}

export default new EltService();
