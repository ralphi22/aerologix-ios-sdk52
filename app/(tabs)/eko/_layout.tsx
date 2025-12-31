/**
 * EKO stack layout
 */

import { Stack } from 'expo-router';

export default function EkoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
