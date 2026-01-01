/**
 * Tab Accueil - ÉCRAN MINIMAL
 * Aucun provider, aucun hook métier
 */

import { View, Text, StyleSheet } from 'react-native';

export default function HomeTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accueil</Text>
      <Text style={styles.subtitle}>Les Tabs fonctionnent!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  subtitle: {
    fontSize: 16,
    color: '#22C55E',
    marginTop: 8,
  },
});
