/**
 * Profile stack layout
 * Routes: index (dashboard), my-profile (account), subscription (manage)
 */

import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="my-profile" />
      <Stack.Screen name="subscription" />
    </Stack>
  );
}
