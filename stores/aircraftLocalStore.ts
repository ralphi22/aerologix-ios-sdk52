/**
 * aircraftLocalStore.ts - Local state management for aircraft (OFFLINE MODE)
 * No backend, no persistence - just React state sharing
 */

import { create } from 'zustand';

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
}

interface AircraftLocalState {
  aircraft: Aircraft[];
  addAircraft: (aircraft: Omit<Aircraft, 'id' | 'createdAt'>) => void;
  deleteAircraft: (id: string) => void;
  getAircraftById: (id: string) => Aircraft | undefined;
}

// Generate unique ID without external dependencies
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const useAircraftLocalStore = create<AircraftLocalState>((set, get) => ({
  aircraft: [],

  addAircraft: (aircraftData) => {
    const newAircraft: Aircraft = {
      ...aircraftData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      aircraft: [newAircraft, ...state.aircraft],
    }));
  },

  deleteAircraft: (id) => {
    set((state) => ({
      aircraft: state.aircraft.filter((a) => a.id !== id),
    }));
  },

  getAircraftById: (id) => {
    return get().aircraft.find((a) => a.id === id);
  },
}));
