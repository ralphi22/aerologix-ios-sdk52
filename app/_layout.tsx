import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Loading screen pendant que la navigation s'initialise
function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>AeroLogix AI</Text>
      <ActivityIndicator size="large" color="#0033A0" style={{ marginTop: 16 }} />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navigationState = useRootNavigationState();

  // WORKAROUND: Attendre que la navigation soit prête (fix bug expo-router web)
  if (!navigationState?.key) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Modal' }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0033A0',
  },
});
