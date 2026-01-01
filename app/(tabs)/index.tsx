/**
 * Tabs index - Redirect vers aircraft (premier tab)
 */

import { Redirect } from 'expo-router';

export default function TabsIndex() {
  return <Redirect href="/(tabs)/aircraft" />;
}
