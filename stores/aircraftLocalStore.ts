/**
 * aircraftLocalStore.ts - State management for aircraft with backend sync
 * Uses React Context + API synchronization with Render backend
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import aircraftService, { Aircraft as ApiAircraft, AircraftCreate } from '@/services/aircraftService';
import authService from '@/services/authService';

export interface Aircraft {
  id: string;
  registration: string;
  commonName: string;
  model: string;
  serialNumber: string;
  category: string;
  engineType: string;
  maxWeight: string;
  baseOperations: string;
  manufacturer: string;
  countryManufacture: string;
  yearManufacture: string;
  registrationType: string;
  ownerSince: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  airframeHours: number;
  engineHours: number;
  propellerHours: number;
  createdAt: string;
  photoUri?: string; // Local photo URI for aircraft image
}

interface AircraftContextType {
  aircraft: Aircraft[];
  isLoading: boolean;
  error: string | null;
  addAircraft: (aircraft: Omit<Aircraft, 'id' | 'createdAt'>) => Promise<void>;
  updateAircraft: (id: string, aircraft: Partial<Aircraft>) => Promise<void>;
  deleteAircraft: (id: string) => Promise<void>;
  getAircraftById: (id: string) => Aircraft | undefined;
  refreshAircraft: () => Promise<void>;
}

// Map API aircraft to local format
// Note: Backend uses 'id' (numeric) not '_id' (MongoDB ObjectId)
const mapApiToLocal = (apiAircraft: ApiAircraft): Aircraft => ({
  id: (apiAircraft as any).id?.toString() || apiAircraft._id,
  registration: apiAircraft.registration,
  commonName: apiAircraft.aircraft_type || '',
  model: apiAircraft.model || '',
  serialNumber: apiAircraft.serial_number || '',
  category: '',
  engineType: '',
  maxWeight: '',
  baseOperations: '',
  manufacturer: apiAircraft.manufacturer || '',
  countryManufacture: '',
  yearManufacture: apiAircraft.year?.toString() || '',
  registrationType: '',
  ownerSince: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  country: '',
  airframeHours: apiAircraft.airframe_hours || 0,
  engineHours: apiAircraft.engine_hours || 0,
  propellerHours: apiAircraft.propeller_hours || 0,
  photoUri: apiAircraft.photo_url || undefined,
  createdAt: apiAircraft.created_at,
});

// Map local aircraft to API format
const mapLocalToApi = (localAircraft: Omit<Aircraft, 'id' | 'createdAt'>): AircraftCreate => ({
  registration: localAircraft.registration,
  aircraft_type: localAircraft.commonName || undefined,
  model: localAircraft.model || undefined,
  serial_number: localAircraft.serialNumber || undefined,
  manufacturer: localAircraft.manufacturer || undefined,
  year: localAircraft.yearManufacture ? parseInt(localAircraft.yearManufacture) : undefined,
  airframe_hours: localAircraft.airframeHours || 0,
  engine_hours: localAircraft.engineHours || 0,
  propeller_hours: localAircraft.propellerHours || 0,
  photo_url: localAircraft.photoUri || undefined,
});

const AircraftContext = createContext<AircraftContextType | undefined>(undefined);

export function AircraftProvider({ children }: { children: ReactNode }) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch aircraft from backend
  const refreshAircraft = useCallback(async () => {
    try {
      // Check if user is authenticated
      const token = await authService.getToken();
      if (!token) {
        console.log('No token, skipping aircraft fetch');
        return;
      }

      setIsLoading(true);
      setError(null);
      
      const apiAircraft = await aircraftService.getAll();
      const localAircraft = apiAircraft.map(mapApiToLocal);
      setAircraft(localAircraft);
      
    } catch (err: any) {
      console.log('Error fetching aircraft:', err.message);
      // Don't set error for 404 - endpoint might not exist
      if (err.response?.status !== 404) {
        setError(err.message || 'Failed to load aircraft');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load aircraft on mount (only once when authenticated)
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      refreshAircraft();
    }
  }, [isInitialized, refreshAircraft]);

  const addAircraft = async (aircraftData: Omit<Aircraft, 'id' | 'createdAt'>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const apiData = mapLocalToApi(aircraftData);
      const created = await aircraftService.create(apiData);
      const newAircraft = mapApiToLocal(created);
      
      setAircraft((prev) => [newAircraft, ...prev]);
      
    } catch (err: any) {
      console.log('Error creating aircraft:', err.message);
      setError(err.message || 'Failed to create aircraft');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateAircraft = async (id: string, aircraftData: Partial<Aircraft>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Map only the fields that are being updated
      const apiData: Partial<AircraftCreate> = {};
      if (aircraftData.registration !== undefined) apiData.registration = aircraftData.registration;
      if (aircraftData.commonName !== undefined) apiData.aircraft_type = aircraftData.commonName;
      if (aircraftData.model !== undefined) apiData.model = aircraftData.model;
      if (aircraftData.serialNumber !== undefined) apiData.serial_number = aircraftData.serialNumber;
      if (aircraftData.manufacturer !== undefined) apiData.manufacturer = aircraftData.manufacturer;
      if (aircraftData.yearManufacture !== undefined) apiData.year = parseInt(aircraftData.yearManufacture);
      if (aircraftData.airframeHours !== undefined) apiData.airframe_hours = aircraftData.airframeHours;
      if (aircraftData.engineHours !== undefined) apiData.engine_hours = aircraftData.engineHours;
      if (aircraftData.propellerHours !== undefined) apiData.propeller_hours = aircraftData.propellerHours;
      if (aircraftData.photoUri !== undefined) apiData.photo_url = aircraftData.photoUri;
      
      const updated = await aircraftService.update(id, apiData);
      const updatedAircraft = mapApiToLocal(updated);
      
      setAircraft((prev) =>
        prev.map((a) => a.id === id ? updatedAircraft : a)
      );
      
    } catch (err: any) {
      console.log('Error updating aircraft:', err.message);
      setError(err.message || 'Failed to update aircraft');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAircraft = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await aircraftService.delete(id);
      setAircraft((prev) => prev.filter((a) => a.id !== id));
      
    } catch (err: any) {
      console.log('Error deleting aircraft:', err.message);
      setError(err.message || 'Failed to delete aircraft');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getAircraftById = (id: string) => {
    return aircraft.find((a) => a.id === id);
  };

  return React.createElement(
    AircraftContext.Provider,
    { 
      value: { 
        aircraft, 
        isLoading, 
        error,
        addAircraft, 
        updateAircraft, 
        deleteAircraft, 
        getAircraftById,
        refreshAircraft,
      } 
    },
    children
  );
}

// Default fallback context value
const defaultAircraftContextValue: AircraftContextType = {
  aircraft: [],
  isLoading: false,
  error: null,
  addAircraft: async () => { console.warn('AircraftProvider not found'); },
  updateAircraft: async () => { console.warn('AircraftProvider not found'); },
  deleteAircraft: async () => { console.warn('AircraftProvider not found'); },
  getAircraftById: () => undefined,
  refreshAircraft: async () => { console.warn('AircraftProvider not found'); },
};

export function useAircraftLocalStore(): AircraftContextType {
  const context = useContext(AircraftContext);
  // Return default values instead of throwing error to prevent crashes
  if (!context) {
    console.warn('useAircraftLocalStore called outside of AircraftProvider, using defaults');
    return defaultAircraftContextValue;
  }
  return context;
}
