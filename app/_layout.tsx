/**
 * Root Layout - AeroLogix AI
 * Wraps the entire app with necessary providers
 */

import { Slot } from 'expo-router';
import { AircraftProvider } from '@/stores/aircraftLocalStore';
import { MaintenanceDataProvider } from '@/stores/maintenanceDataStore';
import { EltProvider } from '@/stores/eltStore';

export default function RootLayout() {
  return (
    <AircraftProvider>
      <MaintenanceDataProvider>
        <EltProvider>
          <Slot />
        </EltProvider>
      </MaintenanceDataProvider>
    </AircraftProvider>
  );
}
