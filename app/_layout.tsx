/**
 * Root Layout - AeroLogix AI
 * Wraps the entire app with necessary providers
 */

import { Slot } from 'expo-router';
import { AircraftProvider } from '@/stores/aircraftLocalStore';
import { MaintenanceDataProvider } from '@/stores/maintenanceDataStore';
import { EltProvider } from '@/stores/eltStore';
import { OcrProvider } from '@/stores/ocrStore';

export default function RootLayout() {
  return (
    <AircraftProvider>
      <MaintenanceDataProvider>
        <EltProvider>
          <OcrProvider>
            <Slot />
          </OcrProvider>
        </EltProvider>
      </MaintenanceDataProvider>
    </AircraftProvider>
  );
}
