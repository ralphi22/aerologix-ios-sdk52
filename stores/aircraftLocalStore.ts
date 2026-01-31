/**
 * aircraftLocalStore.ts - State management for aircraft with backend sync
 * Uses React Context + API synchronization with Render backend
 * LOCAL PERSISTENCE: Extra fields (photo, category, etc.) stored in SecureStore
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import aircraftService, { Aircraft as ApiAircraft, AircraftCreate } from '@/services/aircraftService';
import authService from '@/services/authService';

const LOCAL_DATA_KEY = 'aerologix_aircraft_local_data';

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
  // AD/SB alert flag - indicates new TC items available
  adsb_has_new_tc_items?: boolean;
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

// Fields that are stored locally (not supported by backend API)
interface LocalAircraftData {
  category?: string;
  engineType?: string;
  maxWeight?: string;
  baseOperations?: string;
  countryManufacture?: string;
  registrationType?: string;
  ownerSince?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  photoUri?: string;
  // Additional fields for TC data persistence
  designator?: string;
  ownerName?: string;
  ownerCity?: string;
  ownerProvince?: string;
}

// Type for local storage: map of aircraft ID to local data
type LocalDataMap = { [aircraftId: string]: LocalAircraftData };

// Load local data from SecureStore
const loadLocalData = async (): Promise<LocalDataMap> => {
  try {
    const data = await SecureStore.getItemAsync(LOCAL_DATA_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('Error loading local aircraft data:', error);
  }
  return {};
};

// Save local data to SecureStore
const saveLocalData = async (data: LocalDataMap): Promise<void> => {
  try {
    await SecureStore.setItemAsync(LOCAL_DATA_KEY, JSON.stringify(data));
    console.log('Local aircraft data saved');
  } catch (error) {
    console.log('Error saving local aircraft data:', error);
  }
};

// Map API aircraft to local format, merging with local data
const mapApiToLocal = (apiAircraft: ApiAircraft, localData: LocalAircraftData = {}): Aircraft => ({
  id: (apiAircraft as any).id?.toString() || apiAircraft._id,
  registration: apiAircraft.registration,
  // Purpose: Try backend field 'purpose' or 'aircraft_type', fallback to local
  commonName: (apiAircraft as any).purpose || apiAircraft.aircraft_type || '',
  model: apiAircraft.model || '',
  serialNumber: apiAircraft.serial_number || '',
  // Fields from local storage (not in backend) or backend if available
  category: localData.category || '',
  engineType: localData.engineType || '',
  maxWeight: localData.maxWeight || '',
  // City/Airport: Try backend field 'base_of_operations' or 'city', fallback to local
  baseOperations: (apiAircraft as any).base_of_operations || (apiAircraft as any).city || localData.baseOperations || '',
  countryManufacture: localData.countryManufacture || '',
  registrationType: localData.registrationType || '',
  ownerSince: localData.ownerSince || '',
  addressLine1: localData.addressLine1 || '',
  addressLine2: localData.addressLine2 || '',
  city: localData.city || '',
  country: localData.country || '',
  photoUri: localData.photoUri || apiAircraft.photo_url || undefined,
  // Fields from backend
  manufacturer: apiAircraft.manufacturer || '',
  yearManufacture: apiAircraft.year?.toString() || '',
  airframeHours: apiAircraft.airframe_hours || 0,
  engineHours: apiAircraft.engine_hours || 0,
  propellerHours: apiAircraft.propeller_hours || 0,
  createdAt: apiAircraft.created_at,
});

// Extract local-only fields from aircraft data
const extractLocalData = (aircraft: Partial<Aircraft>): LocalAircraftData => ({
  category: aircraft.category,
  engineType: aircraft.engineType,
  maxWeight: aircraft.maxWeight,
  baseOperations: aircraft.baseOperations,
  countryManufacture: aircraft.countryManufacture,
  registrationType: aircraft.registrationType,
  ownerSince: aircraft.ownerSince,
  addressLine1: aircraft.addressLine1,
  addressLine2: aircraft.addressLine2,
  city: aircraft.city,
  country: aircraft.country,
  photoUri: aircraft.photoUri,
  // Additional TC fields stored locally
  designator: (aircraft as any).designator,
  ownerName: (aircraft as any).ownerName,
  ownerCity: (aircraft as any).ownerCity,
  ownerProvince: (aircraft as any).ownerProvince,
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
  photo_url: undefined, // Photo stored locally, not sent to backend
});

const AircraftContext = createContext<AircraftContextType | undefined>(undefined);

export function AircraftProvider({ children }: { children: ReactNode }) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [localDataMap, setLocalDataMap] = useState<LocalDataMap>({});

  // Load local data on mount
  useEffect(() => {
    const initLocalData = async () => {
      const data = await loadLocalData();
      setLocalDataMap(data);
      console.log('Loaded local aircraft data for', Object.keys(data).length, 'aircraft');
    };
    initLocalData();
  }, []);

  // Fetch aircraft from backend and merge with local data
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
      
      // Load latest local data
      const currentLocalData = await loadLocalData();
      setLocalDataMap(currentLocalData);
      
      const apiAircraft = await aircraftService.getAll();
      // Merge API data with local data
      const localAircraft = apiAircraft.map(api => {
        const id = (api as any).id?.toString() || api._id;
        return mapApiToLocal(api, currentLocalData[id]);
      });
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
      const newId = (created as any).id?.toString() || created._id;
      
      // Save local-only fields to SecureStore
      const localFields = extractLocalData(aircraftData);
      const updatedLocalData = { ...localDataMap, [newId]: localFields };
      setLocalDataMap(updatedLocalData);
      await saveLocalData(updatedLocalData);
      
      const newAircraft = mapApiToLocal(created, localFields);
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
      
      // Update local-only fields in SecureStore
      const existingLocalData = localDataMap[id] || {};
      const newLocalFields = extractLocalData(aircraftData);
      const mergedLocalData: LocalAircraftData = {
        ...existingLocalData,
        ...Object.fromEntries(
          Object.entries(newLocalFields).filter(([_, v]) => v !== undefined)
        ),
      };
      const updatedLocalDataMap = { ...localDataMap, [id]: mergedLocalData };
      setLocalDataMap(updatedLocalDataMap);
      await saveLocalData(updatedLocalDataMap);
      
      // Map only the backend-supported fields that are being updated
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
      // Note: photo_url not sent to backend, stored locally only
      
      const updated = await aircraftService.update(id, apiData);
      const updatedAircraft = mapApiToLocal(updated, mergedLocalData);
      
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
      
      // Remove local data for this aircraft
      const updatedLocalDataMap = { ...localDataMap };
      delete updatedLocalDataMap[id];
      setLocalDataMap(updatedLocalDataMap);
      await saveLocalData(updatedLocalDataMap);
      
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
