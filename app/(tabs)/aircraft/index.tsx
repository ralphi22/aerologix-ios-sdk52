/**
 * Aircraft List Screen - Liste des aéronefs avec cartes
 * Utilise useAircraftLocalStore pour afficher les avions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAircraftLocalStore, Aircraft } from '@/stores/aircraftLocalStore';

// Carte d'un aéronef
function AircraftCard({ aircraft, onPress }: { aircraft: Aircraft; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name="airplane" size={32} color="#1E3A8A" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.registration}>{aircraft.registration}</Text>
          <Text style={styles.commonName}>{aircraft.commonName || aircraft.model}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Cellule</Text>
          <Text style={styles.detailValue}>{aircraft.airframeHours?.toFixed(1) || '0.0'} h</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Moteur</Text>
          <Text style={styles.detailValue}>{aircraft.engineHours?.toFixed(1) || '0.0'} h</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Hélice</Text>
          <Text style={styles.detailValue}>{aircraft.propellerHours?.toFixed(1) || '0.0'} h</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>{aircraft.model}</Text>
        <Text style={styles.footerText}>{aircraft.category}</Text>
      </View>
    </TouchableOpacity>
  );
}

// État vide
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="airplane-outline" size={80} color="#94A3B8" />
      <Text style={styles.emptyText}>Aucun aéronef</Text>
      <Text style={styles.emptySubtext}>
        Ajoutez votre premier aéronef pour commencer à gérer sa maintenance
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Ajouter un aéronef</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AircraftListScreen() {
  const router = useRouter();
  const { aircraft, isLoading, refreshAircraft } = useAircraftLocalStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleAddAircraft = () => {
    router.push('/(tabs)/aircraft/add');
  };

  const handleAircraftPress = (aircraftId: string) => {
    router.push(`/(tabs)/aircraft/${aircraftId}`);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAircraft();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAircraft]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Aéronefs</Text>
        <Text style={styles.headerSubtitle}>
          {aircraft.length === 0 
            ? 'Aucun aéronef enregistré' 
            : `${aircraft.length} aéronef${aircraft.length > 1 ? 's' : ''}`}
        </Text>
      </View>

      {aircraft.length === 0 ? (
        <EmptyState onAdd={handleAddAircraft} />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {aircraft.map((item) => (
            <AircraftCard
              key={item.id}
              aircraft={item}
              onPress={() => handleAircraftPress(item.id)}
            />
          ))}
          
          {/* Spacer pour le FAB */}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* FAB - Bouton flottant pour ajouter */}
      {aircraft.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddAircraft}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  registration: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  commonName: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
