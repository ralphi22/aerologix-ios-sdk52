/**
 * Aircraft stack layout avec providers
 * Providers montés ICI pour le module aircraft
 */

import React from 'react';
import { Stack } from 'expo-router';
import { AircraftProvider } from '@/stores/aircraftLocalStore';
import { EltProvider } from '@/stores/eltStore';
import { OcrProvider } from '@/stores/ocrStore';
import { MaintenanceDataProvider } from '@/stores/maintenanceDataStore';
import { ReportSettingsProvider } from '@/stores/reportSettingsStore';

export default function AircraftLayout() {
  return (
    <AircraftProvider>
      <EltProvider>
        <OcrProvider>
          <MaintenanceDataProvider>
            <ReportSettingsProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="add" options={{ presentation: 'modal' }} />
                <Stack.Screen name="[aircraftId]" />
                <Stack.Screen name="edit" />
                <Stack.Screen name="module" />
                <Stack.Screen name="maintenance" />
                <Stack.Screen name="elt" />
                <Stack.Screen name="ocr-scan" />
                <Stack.Screen name="ocr-history" />
              </Stack>
            </ReportSettingsProvider>
          </MaintenanceDataProvider>
        </OcrProvider>
      </EltProvider>
    </AircraftProvider>
  );
}
