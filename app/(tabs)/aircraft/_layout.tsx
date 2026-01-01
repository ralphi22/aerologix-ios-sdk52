/**
 * Aircraft stack layout - SANS PROVIDERS pour debug
 */

import { Stack } from 'expo-router';

export default function AircraftLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="[aircraftId]" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="module" />
      <Stack.Screen name="maintenance" />
      <Stack.Screen name="elt" />
      <Stack.Screen name="elt-ocr" />
      <Stack.Screen name="ocr-scan" />
      <Stack.Screen name="ocr-history" />
    </Stack>
  );
}
