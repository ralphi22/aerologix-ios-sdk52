/**
 * AI Assistant Tab - Placeholder
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { t } from '@/i18n';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  textMuted: '#9E9E9E',
};

export default function AssistantScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>✨</Text>
        <Text style={styles.title}>{t('tab_assistant')}</Text>
        <Text style={styles.subtitle}>{t('coming_soon')}</Text>
      </View>
    </SafeAreaView>
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
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
});
