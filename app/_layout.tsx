/**
 * Root Layout - ARCHITECTURE SIMPLE (comme ancien projet)
 * Utilise Slot au lieu de Stack pour éviter les blocages
 */

import React from 'react';
import { View } from 'react-native';
import { Slot } from 'expo-router';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
    </View>
  );
}
