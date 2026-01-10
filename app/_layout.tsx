/**
 * Root Layout - AeroLogix AI
 * Wraps the entire app with necessary providers
 */

import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { AircraftProvider } from '@/stores/aircraftLocalStore';
import { MaintenanceDataProvider } from '@/stores/maintenanceDataStore';
import { EltProvider } from '@/stores/eltStore';
import { OcrProvider } from '@/stores/ocrStore';
import { ReportSettingsProvider } from '@/stores/reportSettingsStore';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout() {
  const { loadUser } = useAuthStore();

  // Hydrate auth store on app start (restore user session from token)
  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AircraftProvider>
      <MaintenanceDataProvider>
        <EltProvider>
          <OcrProvider>
            <ReportSettingsProvider>
              <Slot />
            </ReportSettingsProvider>
          </OcrProvider>
        </EltProvider>
      </MaintenanceDataProvider>
    </AircraftProvider>
  );
}
