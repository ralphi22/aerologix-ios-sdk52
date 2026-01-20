/**
 * AD/SB Lookup Screen - CANONICAL ENDPOINT ONLY
 * 
 * CRITICAL: Uses ONLY /api/adsb/lookup/{aircraft_id}
 * 
 * FORBIDDEN:
 * - /api/adsb/compare (OBSOLETE)
 * - /api/adsb/mark-reviewed (OBSOLETE)
 * - Any frontend matching logic
 * - Any compliance determination
 * - Any designator-based logic
 * 
 * TC-SAFE: Display ONLY what backend returns
 * Backend handles all matching and is the source of truth
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';

// ============================================================
// COLORS
// ============================================================
const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  border: '#E0E0E0',
  adRed: '#E53935',
  adRedBg: '#FFEBEE',
  sbBlue: '#1976D2',
  sbBlueBg: '#E3F2FD',
  disclaimerYellow: '#FFF8E1',
  disclaimerYellowBorder: '#FFE082',
};

// ============================================================
// TYPES - CANONICAL API CONTRACT
// ============================================================

/**
 * Single AD or SB item from backend
 */
interface ADSBItem {
  ref: string;
  type: 'AD' | 'SB';
  title: string;
  effective_date?: string;
  source_url?: string;
}

/**
 * Response from GET /api/adsb/lookup/{aircraft_id}
 * This is the ONLY allowed response structure
 */
interface ADSBLookupResponse {
  aircraft: {
    manufacturer: string;
    model: string;
  };
  adsb: ADSBItem[];
  count: {
    ad: number;
    sb: number;
    total: number;
  };
  informational_only: boolean;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdSbLookupScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ 
    aircraftId: string; 
    registration: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ADSBLookupResponse | null>(null);

  /**
   * CANONICAL LOOKUP - SINGLE ENDPOINT
   * GET /api/adsb/lookup/{aircraft_id}
   * 
   * Called:
   * - 1x on mount
   * - 1x on manual refresh (pull-to-refresh)
   * 
   * NEVER in a loop
   */
  const fetchADSB = useCallback(async (showRefreshing = false) => {
    if (!aircraftId) {
      setError('Missing aircraft ID');
      setIsLoading(false);
      return;
    }

    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // CANONICAL ENDPOINT - THE ONLY ALLOWED CALL
      const response = await api.get(`/api/adsb/lookup/${aircraftId}`);
      
      // DEV LOG - temporary for debugging
      console.log('[AD/SB LOOKUP]', response.data);
      
      // Store response as-is - NO transformation
      setData(response.data as ADSBLookupResponse);
      
    } catch (err: unknown) {
      console.warn('[AD/SB LOOKUP] Error:', err);
      setError('Unable to retrieve AD/SB data at this time.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [aircraftId]);

  // Single call on mount - NO other automatic calls
  useEffect(() => {
    fetchADSB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    fetchADSB(true);
  }, [fetchADSB]);

  // ============================================================
  // RENDER SINGLE AD/SB ITEM
  // ============================================================
  const renderItem = (item: ADSBItem, index: number) => {
    const isAD = item.type === 'AD';
    
    return (
      <View 
        key={`${item.type}-${item.ref}-${index}`}
        style={styles.itemRow}
      >
        {/* Type Badge */}
        <View style={[
          styles.typeBadge,
          { backgroundColor: isAD ? COLORS.adRedBg : COLORS.sbBlueBg }
        ]}>
          <Text style={[
            styles.typeBadgeText,
            { color: isAD ? COLORS.adRed : COLORS.sbBlue }
          ]}>
            {item.type}
          </Text>
        </View>
        
        {/* Reference and Title */}
        <View style={styles.itemContent}>
          <Text style={styles.itemRef}>{item.ref}</Text>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.effective_date && (
            <Text style={styles.itemDate}>
              Effective: {item.effective_date}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ============================================================
  // RENDER CONTENT
  // ============================================================
  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading AD/SB data...</Text>
        </View>
      );
    }

    // Error state
    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={COLORS.adRed} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchADSB()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Empty state - NO AD/SB returned
    if (!data || !data.adsb || data.adsb.length === 0) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Disclaimer - Always show */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={20} color="#5D4037" />
            <Text style={styles.disclaimerText}>
              Informational only — verify with official Transport Canada records.
            </Text>
          </View>

          {/* Aircraft info if available */}
          {data?.aircraft && (
            <View style={styles.aircraftInfo}>
              <Text style={styles.aircraftText}>
                {data.aircraft.manufacturer} {data.aircraft.model}
              </Text>
            </View>
          )}

          {/* Empty message */}
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No AD/SB Data</Text>
            <Text style={styles.emptySubtitle}>
              No Transport Canada AD or SB returned for this aircraft.
            </Text>
          </View>
        </ScrollView>
      );
    }

    // Data loaded - display AD/SB list
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* MANDATORY DISCLAIMER */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={20} color="#5D4037" />
          <Text style={styles.disclaimerText}>
            Informational only — verify with official Transport Canada records.
          </Text>
        </View>

        {/* Aircraft Info */}
        {data.aircraft && (
          <View style={styles.aircraftInfo}>
            <Text style={styles.aircraftLabel}>Aircraft:</Text>
            <Text style={styles.aircraftText}>
              {data.aircraft.manufacturer} {data.aircraft.model}
            </Text>
          </View>
        )}

        {/* Counters */}
        <View style={styles.countersContainer}>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.adRedBg }]}>
            <Text style={[styles.counterText, { color: COLORS.adRed }]}>
              AD: {data.count?.ad || 0}
            </Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.sbBlueBg }]}>
            <Text style={[styles.counterText, { color: COLORS.sbBlue }]}>
              SB: {data.count?.sb || 0}
            </Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: COLORS.background }]}>
            <Text style={[styles.counterText, { color: COLORS.textDark }]}>
              Total: {data.count?.total || 0}
            </Text>
          </View>
        </View>

        {/* AD/SB List - Direct display, NO transformation */}
        <View style={styles.listContainer}>
          {data.adsb.map((item, index) => renderItem(item, index))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.headerBack}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AD / SB</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Section Title */}
      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>
          Airworthiness Directives & Service Bulletins
        </Text>
      </View>

      {/* Content */}
      {renderContent()}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header
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
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
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
    width: 44,
  },
  // Section Title
  sectionTitleContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  // Center container
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.adRed,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: COLORS.disclaimerYellow,
    borderWidth: 1,
    borderColor: COLORS.disclaimerYellowBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  disclaimerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Aircraft Info
  aircraftInfo: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aircraftLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  aircraftText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  // Counters
  countersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  counterBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // List
  listContainer: {
    gap: 10,
  },
  // Item row
  itemRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemContent: {
    flex: 1,
  },
  itemRef: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  itemDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 40,
  },
});
