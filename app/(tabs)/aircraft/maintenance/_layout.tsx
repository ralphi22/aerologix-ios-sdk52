/**
 * Maintenance stack layout
 * Providers déjà montés dans aircraft/_layout.tsx
 */

import { Stack } from 'expo-router';

export default function MaintenanceLayout() {
  return (
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
  );
}
