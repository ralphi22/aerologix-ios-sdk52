/**
 * Aircraft stack layout
 */

import { Stack } from 'expo-router';

export default function AircraftLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
