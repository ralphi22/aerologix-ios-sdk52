/**
 * TC AD/SB Comparison Screen
 * 
 * Displays structured comparison between:
 * - Applicable TC AD/SB
 * - Documentary evidence found in OCR-analyzed maintenance reports
 * 
 * TC-SAFE: Informational display ONLY
 * - No aviation logic in frontend
 * - No compliance wording
 * - No calculations
 * - Backend is the source of truth
 * 
 * API CONTRACT:
 * GET /api/adsb/compare/{aircraft_id}
 * Response: {
 *   airworthiness_directives: ADSBItem[],
 *   service_bulletins: ADSBItem[],
 *   disclaimer: string
 * }
 * 
 * ADSBItem: {
 *   identifier: string,
 *   title?: string,
 *   recurrence?: string,
 *   detected_count: number
 * }
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  // AD (Airworthiness Directives)
  adRed: '#E53935',
  adRedBg: '#FFEBEE',
  // SB (Service Bulletins)
  sbBlue: '#1976D2',
  sbBlueBg: '#E3F2FD',
  // Alert / Warning
  warningOrange: '#FF9800',
  warningOrangeBg: '#FFF3E0',
  // Success / Found
  successGreen: '#43A047',
  successGreenBg: '#E8F5E9',
  // Disclaimer
  disclaimerYellow: '#FFF8E1',
  disclaimerYellowBorder: '#FFE082',
};

// ============================================================
// TYPES - API Contract
// ============================================================
interface ADSBItem {
  identifier: string;
  title?: string;
  recurrence?: string;
  detected_count: number;
}

interface APIResponse {
  airworthiness_directives: ADSBItem[];
  service_bulletins: ADSBItem[];
  disclaimer: string;
}

// ============================================================
// SAFE HELPERS
// ============================================================
const safeArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  return [];
};

const safeString = (value: unknown, fallback: string = ''): string => {
  if (typeof value === 'string') return value;
  return fallback;
};

const safeNumber = (value: unknown, fallback: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  return fallback;
};

// ============================================================
// NORMALIZE API RESPONSE
// ============================================================
const normalizeResponse = (data: unknown): APIResponse => {
  const defaultResponse: APIResponse = {
    airworthiness_directives: [],
    service_bulletins: [],
    disclaimer: 'Informational only. This tool does not determine airworthiness or compliance. Verification with official Transport Canada records and a licensed AME is required.',
  };

  if (!data || typeof data !== 'object') {
    return defaultResponse;
  }

  const raw = data as Record<string, unknown>;

  // Normalize ADs
  const rawADs = safeArray<unknown>(raw.airworthiness_directives || raw.ads || raw.ad_items);
  const airworthiness_directives: ADSBItem[] = rawADs
    .map((item: unknown) => {
      if (!item || typeof item !== 'object') return null;
      const i = item as Record<string, unknown>;
      const identifier = safeString(i.identifier || i.ref || i.number);
      if (!identifier) return null;
      return {
        identifier,
        title: safeString(i.title || i.description),
        recurrence: safeString(i.recurrence || i.recurrence_info),
        detected_count: safeNumber(i.detected_count || i.count, 0),
      };
    })
    .filter((item): item is ADSBItem => item !== null);

  // Normalize SBs
  const rawSBs = safeArray<unknown>(raw.service_bulletins || raw.sbs || raw.sb_items);
  const service_bulletins: ADSBItem[] = rawSBs
    .map((item: unknown) => {
      if (!item || typeof item !== 'object') return null;
      const i = item as Record<string, unknown>;
      const identifier = safeString(i.identifier || i.ref || i.number);
      if (!identifier) return null;
      return {
        identifier,
        title: safeString(i.title || i.description),
        recurrence: safeString(i.recurrence || i.recurrence_info),
        detected_count: safeNumber(i.detected_count || i.count, 0),
      };
    })
    .filter((item): item is ADSBItem => item !== null);

  // Disclaimer
  const disclaimer = safeString(
    raw.disclaimer,
    defaultResponse.disclaimer
  );

  return {
    airworthiness_directives,
    service_bulletins,
    disclaimer,
  };
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TcAdSbScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ 
    aircraftId: string; 
    registration: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<APIResponse | null>(null);

  // Fetch data from backend
  const fetchData = useCallback(async (showRefreshing = false) => {
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
      const response = await api.get(`/api/adsb/compare/${aircraftId}`);
      const normalized = normalizeResponse(response.data);
      setData(normalized);
    } catch (err: unknown) {
      console.warn('[AD/SB] Fetch error:', err);
      
      let errorMessage = 'Unable to load AD/SB data. Please try again.';
      
      if (err && typeof err === 'object') {
        const errObj = err as { response?: { status?: number; data?: { detail?: string } } };
        if (errObj?.response?.status === 404) {
          errorMessage = 'No AD/SB data available for this aircraft.';
        } else if (errObj?.response?.data?.detail) {
          errorMessage = errObj.response.data.detail;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [aircraftId]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Count items with no detections
  const adMissingCount = useMemo(() => {
    if (!data) return 0;
    return data.airworthiness_directives.filter(item => item.detected_count === 0).length;
  }, [data]);

  const sbMissingCount = useMemo(() => {
    if (!data) return 0;
    return data.service_bulletins.filter(item => item.detected_count === 0).length;
  }, [data]);

  // ============================================================
  // RENDER ITEM ROW
  // ============================================================
  const renderItem = useCallback((item: ADSBItem, type: 'AD' | 'SB', index: number) => {
    const isAD = type === 'AD';
    const hasNoDetections = item.detected_count === 0;
    
    return (
      <View 
        key={`${type}-${item.identifier}-${index}`}
        style={[
          styles.itemRow,
          hasNoDetections && styles.itemRowWarning,
        ]}
      >
        {/* Left: Type badge + Identifier */}
        <View style={styles.itemLeft}>
          <View style={[
            styles.typeBadge,
            { backgroundColor: isAD ? COLORS.adRedBg : COLORS.sbBlueBg }
          ]}>
            <Text style={[
              styles.typeBadgeText,
              { color: isAD ? COLORS.adRed : COLORS.sbBlue }
            ]}>
              {type}
            </Text>
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemIdentifier}>{item.identifier}</Text>
            {item.title ? (
              <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
            ) : null}
            {item.recurrence ? (
              <Text style={styles.itemRecurrence}>
                <Ionicons name="repeat" size={12} color={COLORS.textMuted} />
                {' '}{item.recurrence}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right: Detection counter */}
        <View style={styles.itemRight}>
          {hasNoDetections ? (
            <View style={styles.warningBadge}>
              <Ionicons name="alert-circle" size={16} color={COLORS.warningOrange} />
              <Text style={styles.warningText}>0</Text>
            </View>
          ) : (
            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>{item.detected_count}</Text>
            </View>
          )}
          <Text style={styles.countLabel}>
            Detected in reports
          </Text>
        </View>
      </View>
    );
  }, []);

  // ============================================================
  // RENDER SECTION
  // ============================================================
  const renderSection = useCallback((
    title: string,
    items: ADSBItem[],
    type: 'AD' | 'SB',
    missingCount: number
  ) => {
    const isAD = type === 'AD';
    
    return (
      <View style={styles.section}>
        {/* Section Header */}
        <View style={[
          styles.sectionHeader,
          { backgroundColor: isAD ? COLORS.adRedBg : COLORS.sbBlueBg }
        ]}>
          <Text style={[
            styles.sectionTitle,
            { color: isAD ? COLORS.adRed : COLORS.sbBlue }
          ]}>
            {title}
          </Text>
          <View style={styles.sectionBadges}>
            <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.white }]}>
              <Text style={[
                styles.sectionCountText,
                { color: isAD ? COLORS.adRed : COLORS.sbBlue }
              ]}>
                {items.length}
              </Text>
            </View>
            {missingCount > 0 && (
              <View style={[styles.sectionCountBadge, { backgroundColor: COLORS.warningOrangeBg }]}>
                <Ionicons name="alert-circle" size={12} color={COLORS.warningOrange} />
                <Text style={[styles.sectionCountText, { color: COLORS.warningOrange, marginLeft: 4 }]}>
                  {missingCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Items */}
        {items.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>
              No {type === 'AD' ? 'Airworthiness Directives' : 'Service Bulletins'} found
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item, index) => renderItem(item, type, index))}
          </View>
        )}
      </View>
    );
  }, [renderItem]);

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
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          
          {/* Disclaimer even on error */}
          <View style={styles.disclaimerInline}>
            <Text style={styles.disclaimerInlineText}>
              Informational only. Verification with official records and a licensed AME is required.
            </Text>
          </View>
        </View>
      );
    }

    // Empty state
    if (!data || (data.airworthiness_directives.length === 0 && data.service_bulletins.length === 0)) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No AD/SB Data</Text>
          <Text style={styles.emptySubtitle}>
            No Airworthiness Directives or Service Bulletins found for this aircraft.
          </Text>
          
          {/* Disclaimer */}
          <View style={styles.disclaimerInline}>
            <Text style={styles.disclaimerInlineText}>
              Informational only. Verification with official records and a licensed AME is required.
            </Text>
          </View>
        </View>
      );
    }

    // Data loaded
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
        {/* MANDATORY DISCLAIMER - Top */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={20} color="#5D4037" />
          <Text style={styles.disclaimerText}>
            {data.disclaimer}
          </Text>
        </View>

        {/* AD Section */}
        {renderSection(
          'Airworthiness Directives (AD)',
          data.airworthiness_directives,
          'AD',
          adMissingCount
        )}

        {/* SB Section */}
        {renderSection(
          'Service Bulletins (SB)',
          data.service_bulletins,
          'SB',
          sbMissingCount
        )}

        {/* Legend for "No reference found" */}
        {(adMissingCount > 0 || sbMissingCount > 0) && (
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={styles.warningBadgeSmall}>
                <Ionicons name="alert-circle" size={14} color={COLORS.warningOrange} />
              </View>
              <Text style={styles.legendText}>
                No reference found in analyzed maintenance documents
              </Text>
            </View>
          </View>
        )}

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
  },
  disclaimerInline: {
    marginTop: 24,
    backgroundColor: COLORS.disclaimerYellow,
    borderRadius: 8,
    padding: 12,
    maxWidth: 300,
  },
  disclaimerInlineText: {
    fontSize: 12,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sectionBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptySection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  itemsList: {
    gap: 10,
  },
  // Item row
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemRowWarning: {
    borderColor: COLORS.warningOrange,
    borderWidth: 2,
    backgroundColor: COLORS.warningOrangeBg,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemIdentifier: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  itemRecurrence: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  itemRight: {
    alignItems: 'center',
    marginLeft: 12,
  },
  countBadge: {
    backgroundColor: COLORS.successGreenBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 36,
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.successGreen,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningOrangeBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  warningText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.warningOrange,
  },
  countLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  // Legend
  legendContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningBadgeSmall: {
    backgroundColor: COLORS.warningOrangeBg,
    padding: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  bottomSpacer: {
    height: 40,
  },
});
