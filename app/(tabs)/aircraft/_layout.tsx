/**
 * Aircraft stack layout
 * 
 * PROVIDERS MONTÉS ICI:
 * - EltProvider (ELT data for elt.tsx, elt-ocr.tsx, [aircraftId].tsx)
 * - OcrProvider (OCR data for ocr-scan.tsx, ocr-history.tsx)
 */

import React from 'react';
import { Stack } from 'expo-router';
import { EltProvider } from '@/stores/eltStore';
import { OcrProvider } from '@/stores/ocrStore';

export default function AircraftLayout() {
  return (
    <EltProvider>
      <OcrProvider>
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
      </OcrProvider>
    </EltProvider>
  );
}
