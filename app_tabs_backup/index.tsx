/**
 * Aéronefs Screen (Premier tab) - SIMPLE VERSION
 * Pas de context/provider pour éviter les problèmes
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AircraftScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="airplane" size={60} color="#1E3A8A" />
        <Text style={styles.title}>Mes Aéronefs</Text>
        <Text style={styles.subtitle}>Gérez votre flotte</Text>
      </View>

      <View style={styles.emptyContainer}>
        <Ionicons name="airplane-outline" size={80} color="#94A3B8" />
        <Text style={styles.emptyText}>Aucun aéronef</Text>
        <Text style={styles.emptySubtext}>Ajoutez votre premier aéronef pour commencer</Text>
        
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Ajouter un aéronef</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
