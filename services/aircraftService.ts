import api from './api';

export interface Aircraft {
  _id: string;
  id?: number; // Backend also returns numeric id
  registration: string;
  aircraft_type?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  serial_number?: string;
  airframe_hours: number;
  engine_hours: number;
  propeller_hours: number;
  photo_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  // Additional fields from backend API response
  purpose?: string;           // "Privé" - Usage/Purpose of aircraft
  city_airport?: string;      // "Joliette, CSG3" - City/Airport
  base_of_operations?: string;
  city?: string;
  designator?: string;
  owner_name?: string;
  owner_city?: string;
  owner_province?: string;
}

export interface AircraftCreate {
  registration: string;
  aircraft_type?: string;
  manufacturer?: string;
  model?: string;
  year?: number;
  serial_number?: string;
  airframe_hours: number;
  engine_hours: number;
  propeller_hours: number;
  photo_url?: string;
  description?: string;
  // Additional fields that may be supported by backend
  purpose?: string;
  base_of_operations?: string;
}

class AircraftService {
  async getAll(): Promise<Aircraft[]> {
    const response = await api.get('/api/aircraft');
    return response.data;
  }

  async getById(id: string): Promise<Aircraft> {
    const response = await api.get(`/api/aircraft/${id}`);
    return response.data;
  }

  async create(aircraft: AircraftCreate): Promise<Aircraft> {
    const response = await api.post('/api/aircraft', aircraft);
    return response.data;
  }

  async update(id: string, aircraft: Partial<AircraftCreate>): Promise<Aircraft> {
    const response = await api.put(`/api/aircraft/${id}`, aircraft);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/api/aircraft/${id}`);
  }
}

export default new AircraftService();
