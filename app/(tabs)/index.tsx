/**
 * Tabs index - Redirige vers le premier tab (aircraft)
 */

import { Redirect } from 'expo-router';

export default function TabsIndex() {
  return <Redirect href="/(tabs)/aircraft" />;
}
