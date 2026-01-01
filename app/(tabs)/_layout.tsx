/**
 * Tabs Layout - VERSION MINIMALE
 * Aucun provider, aucun hook, aucune logique
 */

import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1E3A8A',
        headerShown: true,
        headerStyle: { backgroundColor: '#1E3A8A' },
        headerTintColor: '#FFFFFF',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerTitle: 'Accueil',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerTitle: 'Profil',
        }}
      />
    </Tabs>
  );
}
