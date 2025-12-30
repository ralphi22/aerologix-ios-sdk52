/**
 * Tab layout for main app navigation
 * Aircraft | AI Assistant | Profile
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '@/i18n';

const COLORS = {
  primary: '#0033A0',
  inactive: '#9E9E9E',
  background: '#FFFFFF',
};

// Simple icon components using emoji/text
function AircraftIcon({ color }: { color: string }) {
  return <Text style={[styles.tabIcon, { color }]}>✈️</Text>;
}

function AssistantIcon({ color }: { color: string }) {
  return <Text style={[styles.tabIcon, { color }]}>✨</Text>;
}

function ProfileIcon({ color }: { color: string }) {
  return <Text style={[styles.tabIcon, { color }]}>👤</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: COLORS.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_aircraft'),
          headerTitle: t('aircraft_title'),
          tabBarIcon: ({ color }) => <AircraftIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: t('tab_assistant'),
          tabBarIcon: ({ color }) => <AssistantIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
      {/* Hide explore tab */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    paddingBottom: 8,
    height: 60,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 24,
  },
  header: {
    backgroundColor: COLORS.background,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 18,
  },
});
