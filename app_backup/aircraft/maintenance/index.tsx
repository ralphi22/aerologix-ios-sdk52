/**
 * Maintenance Main Screen
 * Shows 5 maintenance modules: Report, Parts, Invoices, AD/SB, STC
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  border: '#E0E0E0',
};

interface MaintenanceCardProps {
  icon: string;
  title: string;
  titleFr: string;
  subtitle: string;
  subtitleFr: string;
  onPress: () => void;
}

function MaintenanceCard({ icon, title, titleFr, subtitle, subtitleFr, onPress }: MaintenanceCardProps) {
  const lang = getLanguage();
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{icon}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{lang === 'fr' ? titleFr : title}</Text>
        <Text style={styles.cardSubtitle}>{lang === 'fr' ? subtitleFr : subtitle}</Text>
      </View>
      <Text style={styles.cardArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function MaintenanceScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();

  const navigateTo = (route: string) => {
    router.push({
      pathname: `/(tabs)/aircraft/maintenance/${route}` as any,
      params: { aircraftId, registration },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Maintenance</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {/* Report */}
          <MaintenanceCard
            icon="📝"
            title="Report"
            titleFr="Rapport"
            subtitle="Maintenance reports and inspections"
            subtitleFr="Rapports de maintenance et inspections"
            onPress={() => navigateTo('report')}
          />

          {/* Parts */}
          <MaintenanceCard
            icon="⚙️"
            title="Parts"
            titleFr="Pièces"
            subtitle="Installed parts and components"
            subtitleFr="Pièces et composants installés"
            onPress={() => navigateTo('parts')}
          />

          {/* Invoices */}
          <MaintenanceCard
            icon="🧾"
            title="Invoices"
            titleFr="Factures"
            subtitle="Maintenance invoices and costs"
            subtitleFr="Factures et coûts de maintenance"
            onPress={() => navigateTo('invoices')}
          />

          {/* AD/SB */}
          <MaintenanceCard
            icon="⚠️"
            title="AD/SB"
            titleFr="AD/SB"
            subtitle="Airworthiness Directives & Service Bulletins"
            subtitleFr="Consignes de navigabilité et bulletins de service"
            onPress={() => navigateTo('ad-sb')}
          />

          {/* STC */}
          <MaintenanceCard
            icon="📄"
            title="STC"
            titleFr="STC"
            subtitle="Supplemental Type Certificates"
            subtitleFr="Certificats de type supplémentaires"
            onPress={() => navigateTo('stc')}
          />
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

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  cardArrow: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  disclaimer: {
    flexDirection: 'row',
    marginHorizontal: 16,
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
