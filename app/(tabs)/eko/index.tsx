/**
 * EKO - AI Assistant Screen
 * Informational only - TC-Safe
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { t, getLanguage } from '@/i18n';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  cardBg: '#E8EEF7',
};

export default function EkoScreen() {
  const lang = getLanguage();

  const description = lang === 'fr'
    ? 'EKO est votre assistant IA pour comprendre les dossiers de maintenance.\n\nInformatif seulement. Aucune décision n\'est prise.'
    : 'EKO is your AI assistant for understanding maintenance records.\n\nInformational only. No decisions are made.';

  const disclaimer = lang === 'fr'
    ? 'Informatif seulement. Cette application ne remplace pas un TEA (AME).'
    : 'Informational only. This app does not replace an AME/TEA.';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✨</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>EKO</Text>

        {/* Description card */}
        <View style={styles.card}>
          <Text style={styles.description}>{description}</Text>
        </View>

        {/* Coming soon badge */}
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>{t('coming_soon')}</Text>
        </View>
      </View>

      {/* TC-Safe Disclaimer */}
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerIcon}>⚠️</Text>
        <Text style={styles.disclaimerText}>{disclaimer}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  description: {
    fontSize: 16,
    color: COLORS.textDark,
    textAlign: 'center',
    lineHeight: 24,
  },
  comingSoonBadge: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  comingSoonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderTopWidth: 1,
    borderTopColor: '#FFE082',
  },
  disclaimerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 16,
  },
});
