/**
 * Aircraft List Screen - Main tab
 * Shows list of aircraft or empty state
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@/i18n';
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';

const COLORS = {
  primary: '#0033A0',
  cardBg: '#283593',
  white: '#FFFFFF',
  background: '#F5F5F5',
  textMuted: '#9E9E9E',
  badgeBg: '#B8C5D6',
  badgeText: '#424242',
  fab: '#0033A0',
};

interface AircraftCardProps {
  aircraft: {
    id: string;
    registration: string;
    commonName: string;
    model: string;
    airframeHours: number;
    engineHours: number;
    propellerHours: number;
  };
  onDelete: () => void;
}

function AircraftCard({ aircraft, onDelete }: AircraftCardProps) {
  const handleDelete = () => {
    Alert.alert(
      t('delete_aircraft'),
      t('delete_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete_aircraft'), style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Background decoration */}
      <View style={styles.cardDecoration}>
        <Text style={styles.cardDecorationText}>✈</Text>
      </View>

      {/* Header row */}
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.registration}>{aircraft.registration}</Text>
          <Text style={styles.model}>
            {aircraft.commonName} {aircraft.model}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>BASIC</Text>
        </View>
      </View>

      {/* Hours row */}
      <View style={styles.hoursContainer}>
        <View style={styles.hourItem}>
          <Text style={styles.hourIcon}>⏱</Text>
          <Text style={styles.hourLabel}>{t('airframe')}</Text>
          <Text style={styles.hourValue}>{aircraft.airframeHours}{t('hours')}</Text>
        </View>
        <View style={styles.hourItem}>
          <Text style={styles.hourIcon}>⚙️</Text>
          <Text style={styles.hourLabel}>{t('engine')}</Text>
          <Text style={styles.hourValue}>{aircraft.engineHours}{t('hours')}</Text>
        </View>
        <View style={styles.hourItem}>
          <Text style={styles.hourIcon}>🔄</Text>
          <Text style={styles.hourLabel}>{t('propeller')}</Text>
          <Text style={styles.hourValue}>{aircraft.propellerHours}{t('hours')}</Text>
        </View>
      </View>

      {/* Delete button */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>{t('delete_aircraft')}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AircraftListScreen() {
  const router = useRouter();
  const { aircraft, deleteAircraft } = useAircraftLocalStore();

  const handleAddAircraft = () => {
    router.push('/aircraft/add');
  };

  return (
    <View style={styles.container}>
      {aircraft.length === 0 ? (
        // Empty state
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✈️</Text>
          <Text style={styles.emptyText}>{t('no_aircraft')}</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddAircraft}>
            <Text style={styles.addButtonText}>{t('add_aircraft')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Aircraft list
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {aircraft.map((item) => (
            <AircraftCard
              key={item.id}
              aircraft={item}
              onDelete={() => deleteAircraft(item.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddAircraft}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Card
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardDecoration: {
    position: 'absolute',
    right: 10,
    top: 10,
    opacity: 0.15,
  },
  cardDecorationText: {
    fontSize: 120,
    color: COLORS.white,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    zIndex: 1,
  },
  registration: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1,
  },
  model: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  badge: {
    backgroundColor: COLORS.badgeBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    color: COLORS.badgeText,
    fontSize: 12,
    fontWeight: '700',
  },
  // Hours
  hoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    zIndex: 1,
  },
  hourItem: {
    alignItems: 'center',
  },
  hourIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  hourLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: 4,
  },
  hourValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  // Delete button
  deleteButton: {
    marginTop: 20,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 1,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.8,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.fab,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: COLORS.white,
    lineHeight: 34,
  },
});
