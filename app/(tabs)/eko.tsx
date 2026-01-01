/**
 * EKO AI Assistant Screen - SIMPLE VERSION
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EkoScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={60} color="#1E3A8A" />
        <Text style={styles.title}>EKO</Text>
        <Text style={styles.subtitle}>Assistant IA pour la maintenance</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Ionicons name="information-circle" size={24} color="#1E3A8A" />
          <Text style={styles.cardTitle}>Assistant Intelligent</Text>
          <Text style={styles.cardText}>
            EKO vous aide à comprendre vos dossiers de maintenance.
            Informatif seulement - aucune décision n'est prise automatiquement.
          </Text>
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="warning" size={20} color="#B45309" />
          <Text style={styles.disclaimerText}>
            TC-Safe: Cette application ne remplace pas un TEA (AME).
          </Text>
        </View>
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
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
  },
  cardText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
});
