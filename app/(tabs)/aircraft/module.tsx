/**
 * Module Placeholder Screen
 * Shows "Coming soon" for all modules
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { t, getLanguage } from '@/i18n';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
};

const MODULE_INFO: Record<string, { icon: string; title: string; titleFr: string }> = {
  logbook: { icon: '📖', title: 'Log Book', titleFr: 'Carnet de vol' },
  maintenance: { icon: '🛠️', title: 'Maintenance', titleFr: 'Maintenance' },
  elt: { icon: '📡', title: 'ELT', titleFr: 'ELT' },
  wb: { icon: '⚖️', title: 'Weight & Balance', titleFr: 'Masse et centrage' },
  'ocr-scan': { icon: '📷', title: 'OCR Scanner', titleFr: 'Scanner OCR' },
  'ocr-history': { icon: '📄', title: 'OCR History', titleFr: 'Historique OCR' },
};

export default function ModuleScreen() {
  const router = useRouter();
  const { moduleName } = useLocalSearchParams<{ moduleName: string }>();
  const lang = getLanguage();

  const moduleInfo = MODULE_INFO[moduleName || ''] || {
    icon: '📦',
    title: 'Module',
    titleFr: 'Module',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {lang === 'fr' ? moduleInfo.titleFr : moduleInfo.title}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{moduleInfo.icon}</Text>
        </View>
        <Text style={styles.title}>
          {lang === 'fr' ? moduleInfo.titleFr : moduleInfo.title}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('coming_soon')}</Text>
        </View>
        <Text style={styles.description}>
          {lang === 'fr'
            ? 'Cette fonctionnalité sera bientôt disponible.'
            : 'This feature will be available soon.'}
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
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
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
});
