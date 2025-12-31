/**
 * Invoices Placeholder Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
};

export default function InvoicesScreen() {
  const router = useRouter();
  const { registration } = useLocalSearchParams<{ registration: string }>();
  const lang = getLanguage();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{lang === 'fr' ? 'Factures' : 'Invoices'}</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🧾</Text>
        </View>
        <Text style={styles.title}>{lang === 'fr' ? 'Factures' : 'Invoices'}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {lang === 'fr' ? 'Bientôt disponible' : 'Coming soon'}
          </Text>
        </View>
        <Text style={styles.description}>
          {lang === 'fr'
            ? 'Factures et coûts de maintenance'
            : 'Maintenance invoices and costs'}
        </Text>
      </View>

      {/* TC-Safe Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerIcon}>⚠️</Text>
        <Text style={styles.disclaimerText}>
          {lang === 'fr'
            ? "Information seulement. Ne remplace pas un TEA/AME ni un registre officiel. Les décisions de navigabilité appartiennent au propriétaire et à l'atelier."
            : 'Information only. Does not replace an AME nor an official record. Airworthiness decisions remain with the owner and the maintenance organization.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
});
