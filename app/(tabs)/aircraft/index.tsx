/**
 * Aircraft List Screen - Liste des aéronefs avec cartes
 * Affiche photo en filigrane si disponible
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAircraftLocalStore, Aircraft } from '@/stores/aircraftLocalStore';
import { getLanguage } from '@/i18n';

// Carte d'un aéronef avec photo en filigrane
function AircraftCard({ aircraft, onPress }: { aircraft: Aircraft; onPress: () => void }) {
  const lang = getLanguage();
  
  const CardContent = () => (
    <>
      {/* Photo Overlay (filigrane) */}
      {aircraft.photoUri && (
        <Image 
          source={{ uri: aircraft.photoUri }} 
          style={styles.cardBackgroundImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, aircraft.photoUri && styles.cardIconWithPhoto]}>
            <Ionicons name="airplane" size={32} color="#1E3A8A" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.registration, aircraft.photoUri && styles.textWithPhoto]}>
              {aircraft.registration}
            </Text>
            <Text style={[styles.commonName, aircraft.photoUri && styles.textMutedWithPhoto]}>
              {aircraft.commonName || aircraft.model}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={aircraft.photoUri ? '#FFFFFF' : '#94A3B8'} />
        </View>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, aircraft.photoUri && styles.textMutedWithPhoto]}>
              {lang === 'fr' ? 'Cellule' : 'Airframe'}
            </Text>
            <Text style={[styles.detailValue, aircraft.photoUri && styles.textWithPhoto]}>
              {aircraft.airframeHours?.toFixed(1) || '0.0'} h
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, aircraft.photoUri && styles.textMutedWithPhoto]}>
              {lang === 'fr' ? 'Moteur' : 'Engine'}
            </Text>
            <Text style={[styles.detailValue, aircraft.photoUri && styles.textWithPhoto]}>
              {aircraft.engineHours?.toFixed(1) || '0.0'} h
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, aircraft.photoUri && styles.textMutedWithPhoto]}>
              {lang === 'fr' ? 'Hélice' : 'Propeller'}
            </Text>
            <Text style={[styles.detailValue, aircraft.photoUri && styles.textWithPhoto]}>
              {aircraft.propellerHours?.toFixed(1) || '0.0'} h
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.footerText, aircraft.photoUri && styles.textMutedWithPhoto]}>
            {aircraft.model}
          </Text>
          <Text style={[styles.footerText, aircraft.photoUri && styles.textMutedWithPhoto]}>
            {aircraft.baseOperations || aircraft.category}
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <TouchableOpacity 
      style={[styles.card, aircraft.photoUri && styles.cardWithPhoto]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <CardContent />
    </TouchableOpacity>
  );
}

// État vide
function EmptyState({ onAdd }: { onAdd: () => void }) {
  const lang = getLanguage();
  
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="airplane-outline" size={80} color="#94A3B8" />
      <Text style={styles.emptyText}>
        {lang === 'fr' ? 'Aucun aéronef' : 'No aircraft'}
      </Text>
      <Text style={styles.emptySubtext}>
        {lang === 'fr' 
          ? 'Ajoutez votre premier aéronef pour commencer à gérer sa maintenance'
          : 'Add your first aircraft to start managing its maintenance'}
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>
          {lang === 'fr' ? 'Ajouter un aéronef' : 'Add an aircraft'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AircraftListScreen() {
  const router = useRouter();
  const lang = getLanguage();
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
        <Text style={styles.headerTitle}>
          {lang === 'fr' ? 'Mes Aéronefs' : 'My Aircraft'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {aircraft.length === 0 
            ? (lang === 'fr' ? 'Aucun aéronef enregistré' : 'No aircraft registered')
            : `${aircraft.length} ${lang === 'fr' ? 'aéronef' : 'aircraft'}${aircraft.length > 1 ? 's' : ''}`}
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
  // Card styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  cardWithPhoto: {
    backgroundColor: 'transparent',
  },
  cardBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.25, // Filigrane effect
  },
  cardContent: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)', // Semi-transparent overlay
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
  cardIconWithPhoto: {
    backgroundColor: 'rgba(239, 246, 255, 0.9)',
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
  textWithPhoto: {
    color: '#1E293B',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  commonName: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  textMutedWithPhoto: {
    color: '#475569',
  },
  cardDetails: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
