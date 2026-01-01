/**
 * Maintenance stack layout
 * 
 * PROVIDERS MONTÉS ICI:
 * - MaintenanceDataProvider (parts, ad-sb, stc, invoices)
 * - ReportSettingsProvider (report settings)
 */

import React from 'react';
import { Stack } from 'expo-router';
import { MaintenanceDataProvider } from '@/stores/maintenanceDataStore';
import { ReportSettingsProvider } from '@/stores/reportSettingsStore';

export default function MaintenanceLayout() {
  return (
    <MaintenanceDataProvider>
      <ReportSettingsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="report" />
          <Stack.Screen name="report-settings" />
          <Stack.Screen name="parts" />
          <Stack.Screen name="invoices" />
          <Stack.Screen name="invoice-detail" />
          <Stack.Screen name="ad-sb" />
          <Stack.Screen name="stc" />
        </Stack>
      </ReportSettingsProvider>
    </MaintenanceDataProvider>
  );
}
