/**
 * Tab layout for main app navigation
 * Aircraft | EKO | Profile
 * 
 * ARCHITECTURE CRITIQUE iOS:
 * - Tabs TOUJOURS rendu (jamais null)
 * - Providers montés ICI pour tous les tabs
 * - DisclaimerGate RETIRÉ (causait écran blanc)
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet, View } from 'react-native';
import { t } from '@/i18n';

import { AircraftProvider } from '@/stores/aircraftLocalStore';
import { ReportSettingsProvider } from '@/stores/reportSettingsStore';
import { MaintenanceDataProvider } from '@/stores/maintenanceDataStore';
import { EltProvider } from '@/stores/eltStore';
import { OcrProvider } from '@/stores/ocrStore';

const COLORS = {
  primary: '#0033A0',
  inactive: '#9E9E9E',
  background: '#FFFFFF',
};

// Tab icon components
function TabIcon({
  icon,
  color,
}: {
  icon: string;
  color: string;
  focused?: boolean;
}) {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.tabIcon, { color }]}>{icon}</Text>
    </View>
  );
}

function TabsContent() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="aircraft"
        options={{
          title: t('tab_aircraft'),
          headerTitle: t('aircraft_title'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="✈️" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="eko"
        options={{
          title: 'EKO',
          headerTitle: 'EKO',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="✨" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab_profile'),
          headerTitle: t('profile'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon="👤" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  // Providers wrapping Tabs - tous les contextes disponibles
  return (
    <AircraftProvider>
      <ReportSettingsProvider>
        <MaintenanceDataProvider>
          <EltProvider>
            <OcrProvider>
              <TabsContent />
            </OcrProvider>
          </EltProvider>
        </MaintenanceDataProvider>
      </ReportSettingsProvider>
    </AircraftProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    paddingBottom: 8,
    height: 65,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
  },
  header: {
    backgroundColor: COLORS.primary,
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 18,
  },
});
