/**
 * Home Screen - TEST SIMPLE (pas de tabs)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
        <Text style={styles.title}>Connexion réussie!</Text>
        <Text style={styles.subtitle}>L'app fonctionne sans Tabs</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.info}>
          Si tu vois cet écran, le problème vient des Tabs.
        </Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/')}
        >
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E3A8A', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#22C55E', marginTop: 8 },
  content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  info: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
