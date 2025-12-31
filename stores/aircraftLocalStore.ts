/**
 * aircraftLocalStore.ts - Local state management for aircraft (OFFLINE MODE)
 * No backend, no persistence - using React Context
 * No external dependencies required
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

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

interface AircraftContextType {
  aircraft: Aircraft[];
  addAircraft: (aircraft: Omit<Aircraft, 'id' | 'createdAt'>) => void;
  updateAircraft: (id: string, aircraft: Omit<Aircraft, 'id' | 'createdAt'>) => void;
  deleteAircraft: (id: string) => void;
  getAircraftById: (id: string) => Aircraft | undefined;
}

// Generate unique ID without external dependencies
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const AircraftContext = createContext<AircraftContextType | undefined>(undefined);

export function AircraftProvider({ children }: { children: ReactNode }) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);

  const addAircraft = (aircraftData: Omit<Aircraft, 'id' | 'createdAt'>) => {
    const newAircraft: Aircraft = {
      ...aircraftData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setAircraft((prev) => [newAircraft, ...prev]);
  };

  const deleteAircraft = (id: string) => {
    setAircraft((prev) => prev.filter((a) => a.id !== id));
  };

  const getAircraftById = (id: string) => {
    return aircraft.find((a) => a.id === id);
  };

  return React.createElement(
    AircraftContext.Provider,
    { value: { aircraft, addAircraft, deleteAircraft, getAircraftById } },
    children
  );
}

export function useAircraftLocalStore(): AircraftContextType {
  const context = useContext(AircraftContext);
  if (!context) {
    throw new Error('useAircraftLocalStore must be used within AircraftProvider');
  }
  return context;
}
