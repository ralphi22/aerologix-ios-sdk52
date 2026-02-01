/**
 * Parts Screen - Critical Mentions & Service Parts
 * TC-SAFE: Information only, no regulatory decisions
 * 
 * ENDPOINTS:
 * - Critical Mentions: GET /api/limitations/{aircraft_id}/critical-mentions
 * - Service Parts: GET /api/parts/{aircraft_id}
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLanguage } from '@/i18n';
import api from '@/services/api';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  border: '#E0E0E0',
  yellow: '#FFF8E1',
  yellowBorder: '#FFE082',
  blue: '#E3F2FD',
  blueBorder: '#90CAF9',
  green: '#4CAF50',
  greenBg: '#E8F5E9',
  orange: '#FF9800',
  orangeBg: '#FFF3E0',
  red: '#E53935',
  redBg: '#FFEBEE',
  purple: '#7B1FA2',
  purpleBg: '#F3E5F5',
};

// ============================================
// TYPES
// ============================================

// Critical Mention from backend
interface CriticalMention {
  id?: string;
  _id?: string;
  text: string;
  keywords?: string[];
  confidence: number;
  report_date?: string;
  category: 'elt' | 'avionics' | 'fire_extinguisher' | 'general_limitations';
}

// Critical Mentions Response
interface CriticalMentionsResponse {
  aircraft_id: string;
  registration: string;
  critical_mentions: {
    elt: CriticalMention[];
    avionics: CriticalMention[];
    fire_extinguisher: CriticalMention[];
    general_limitations: CriticalMention[];
  };
  summary: {
    elt_count: number;
    avionics_count: number;
    fire_extinguisher_count: number;
    general_limitations_count: number;
    total_count: number;
  };
}

// Service Part from backend
interface ServicePart {
  _id: string;
  id?: string;
  part_number: string;
  description?: string;
  serial_number?: string;
  source?: string;
  created_at?: string;
  aircraft_id?: string;
}

type TabType = 'critical' | 'service';

// Category config
const CATEGORY_CONFIG = {
  elt: { icon: '📡', label_en: 'ELT', label_fr: 'ELT', color: COLORS.red, bgColor: COLORS.redBg },
  avionics: { icon: '📻', label_en: 'Avionics', label_fr: 'Avioniques', color: COLORS.primary, bgColor: COLORS.blue },
  fire_extinguisher: { icon: '🧯', label_en: 'Fire Extinguisher', label_fr: 'Extincteur', color: COLORS.orange, bgColor: COLORS.orangeBg },
  general_limitations: { icon: '⚠️', label_en: 'General Limitations', label_fr: 'Limitations générales', color: COLORS.purple, bgColor: COLORS.purpleBg },
};

// ============================================
// TEXTS
// ============================================
const TEXTS = {
  en: {
    screenTitle: 'Parts',
    tabCritical: 'Critical Mentions',
    tabService: 'Service Parts',
    loading: 'Loading...',
    error: 'Failed to load',
    retry: 'Retry',
    confidence: 'Confidence',
    date: 'Date',
    noMentions: 'No critical mentions detected',
    noMentionsHint: 'Critical mentions are extracted from maintenance reports.',
    noParts: 'No service parts recorded',
    noPartsHint: 'Parts are extracted from OCR scans.',
    delete: 'Delete',
    cancel: 'Cancel',
    deleteConfirm: 'Delete this item?',
    addPart: 'Add Part',
    partNumber: 'Part Number',
    description: 'Description',
    serialNumber: 'Serial Number',
    source: 'Source',
    created: 'Created',
    disclaimer: 'Informational only — verify with logbooks and your AME.',
  },
  fr: {
    screenTitle: 'Pièces',
    tabCritical: 'Mentions critiques',
    tabService: 'Pièces de service',
    loading: 'Chargement...',
    error: 'Échec du chargement',
    retry: 'Réessayer',
    confidence: 'Confiance',
    date: 'Date',
    noMentions: 'Aucune mention critique détectée',
    noMentionsHint: 'Les mentions critiques sont extraites des rapports de maintenance.',
    noParts: 'Aucune pièce enregistrée',
    noPartsHint: 'Les pièces sont extraites des scans OCR.',
    delete: 'Supprimer',
    cancel: 'Annuler',
    deleteConfirm: 'Supprimer cet élément ?',
    addPart: 'Ajouter une pièce',
    partNumber: 'Numéro de pièce',
    description: 'Description',
    serialNumber: 'Numéro de série',
    source: 'Source',
    created: 'Créé',
    disclaimer: 'Informatif seulement — vérifiez avec les carnets et votre TEA.',
  },
};

// ============================================
// HELPER: Normalize part number for deduplication
// ============================================
const normalizePartNo = (pn: string): string => {
  return pn.replace(/[\s\-]/g, '').toUpperCase();
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function PartsScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('critical');
  
  // Critical mentions state
  const [criticalData, setCriticalData] = useState<CriticalMentionsResponse | null>(null);
  const [criticalLoading, setCriticalLoading] = useState(true);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [criticalRefreshing, setCriticalRefreshing] = useState(false);

  // Service parts state
  const [serviceParts, setServiceParts] = useState<ServicePart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [partsRefreshing, setPartsRefreshing] = useState(false);
  const [deletingPartId, setDeletingPartId] = useState<string | null>(null);

  // ============================================
  // FETCH CRITICAL MENTIONS - CORRECT ENDPOINT
  // ============================================
  const fetchCriticalMentions = useCallback(async (showRefreshing = false) => {
    if (!aircraftId) return;
    
    if (showRefreshing) {
      setCriticalRefreshing(true);
    } else {
      setCriticalLoading(true);
    }
    setCriticalError(null);
    
    try {
      // ✅ CORRECT ENDPOINT
      const response = await api.get(`/api/limitations/${aircraftId}/critical-mentions`);
      console.log('[Critical Mentions] Data:', response.data);
      setCriticalData(response.data);
    } catch (err: any) {
      console.error('[Critical Mentions] Error:', err);
      setCriticalError(err?.response?.data?.detail || err?.message || texts.error);
    } finally {
      setCriticalLoading(false);
      setCriticalRefreshing(false);
    }
  }, [aircraftId, texts.error]);

  // ============================================
  // FETCH SERVICE PARTS
  // ============================================
  const fetchServiceParts = useCallback(async (showRefreshing = false) => {
    if (!aircraftId) return;
    
    if (showRefreshing) {
      setPartsRefreshing(true);
    } else {
      setPartsLoading(true);
    }
    setPartsError(null);
    
    try {
      const response = await api.get(`/api/parts/${aircraftId}`);
      console.log('[Service Parts] Data:', response.data);
      const parts = response.data?.parts || response.data || [];
      setServiceParts(Array.isArray(parts) ? parts : []);
    } catch (err: any) {
      console.error('[Service Parts] Error:', err);
      if (err?.response?.status === 404) {
        setServiceParts([]);
      } else {
        setPartsError(err?.response?.data?.detail || err?.message || texts.error);
      }
    } finally {
      setPartsLoading(false);
      setPartsRefreshing(false);
    }
  }, [aircraftId, texts.error]);

  // Initial fetch
  useEffect(() => {
    fetchCriticalMentions();
    fetchServiceParts();
  }, [fetchCriticalMentions, fetchServiceParts]);

  // ============================================
  // DEDUPLICATED SERVICE PARTS
  // ============================================
  const uniqueParts = useMemo(() => {
    const partsMap: Record<string, ServicePart> = {};
    serviceParts.forEach(part => {
      if (!part.part_number) return;
      const key = normalizePartNo(part.part_number);
      // Keep the most recent one
      if (!partsMap[key] || new Date(part.created_at || 0) > new Date(partsMap[key].created_at || 0)) {
        partsMap[key] = part;
      }
    });
    return Object.values(partsMap);
  }, [serviceParts]);

  // ============================================
  // DELETE SERVICE PART
  // ============================================
  const handleDeletePart = (part: ServicePart) => {
    const partId = part._id || part.id;
    if (!partId) return;

    Alert.alert(
      texts.delete,
      texts.deleteConfirm,
      [
        { text: texts.cancel, style: 'cancel' },
        {
          text: texts.delete,
          style: 'destructive',
          onPress: async () => {
            setDeletingPartId(partId);
            try {
              await api.delete(`/api/parts/${partId}`);
              fetchServiceParts(true);
            } catch (err: any) {
              Alert.alert(texts.error, err?.message || 'Failed to delete');
            } finally {
              setDeletingPartId(null);
            }
          },
        },
      ]
    );
  };

  // ============================================
  // RENDER CRITICAL MENTION ITEM
  // ============================================
  const renderCriticalItem = (item: CriticalMention, index: number, category: keyof typeof CATEGORY_CONFIG) => {
    const config = CATEGORY_CONFIG[category];
    const confidencePercent = Math.round((item.confidence || 0) * 100);
    
    return (
      <View key={`${category}-${index}`} style={styles.mentionItem}>
        <Text style={styles.mentionText}>• {item.text}</Text>
        <View style={styles.mentionMeta}>
          <Text style={styles.mentionMetaText}>
            {texts.confidence}: {confidencePercent}%
          </Text>
          {item.report_date && (
            <Text style={styles.mentionMetaText}>
              {texts.date}: {item.report_date}
            </Text>
          )}
        </View>
        {item.keywords && item.keywords.length > 0 && (
          <View style={styles.keywordsRow}>
            {item.keywords.slice(0, 3).map((kw, i) => (
              <View key={i} style={[styles.keywordBadge, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.keywordText, { color: config.color }]}>{kw}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // RENDER CATEGORY SECTION
  // ============================================
  const renderCategorySection = (
    category: keyof typeof CATEGORY_CONFIG,
    items: CriticalMention[],
    count: number
  ) => {
    if (count === 0) return null;
    
    const config = CATEGORY_CONFIG[category];
    const label = lang === 'fr' ? config.label_fr : config.label_en;
    
    return (
      <View style={styles.categorySection} key={category}>
        <View style={[styles.categoryHeader, { backgroundColor: config.bgColor }]}>
          <Text style={styles.categoryIcon}>{config.icon}</Text>
          <Text style={[styles.categoryTitle, { color: config.color }]}>
            {label} ({count})
          </Text>
        </View>
        <View style={styles.categoryContent}>
          {items.map((item, index) => renderCriticalItem(item, index, category))}
        </View>
      </View>
    );
  };

  // ============================================
  // RENDER SERVICE PART CARD
  // ============================================
  const renderServicePart = (part: ServicePart) => {
    const partId = part._id || part.id || '';
    const isDeleting = deletingPartId === partId;
    
    return (
      <View key={partId} style={[styles.partCard, isDeleting && styles.partCardDeleting]}>
        <Text style={styles.partNumber}>{part.part_number}</Text>
        
        {part.description && (
          <Text style={styles.partDescription}>{texts.description}: {part.description}</Text>
        )}
        
        {part.serial_number && (
          <Text style={styles.partSerial}>{texts.serialNumber}: {part.serial_number}</Text>
        )}
        
        <View style={styles.partMeta}>
          {part.source && (
            <Text style={styles.partMetaText}>{texts.source}: {part.source}</Text>
          )}
          {part.created_at && (
            <Text style={styles.partMetaText}>
              {texts.created}: {new Date(part.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeletePart(part)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={COLORS.red} />
          ) : (
            <Text style={styles.deleteButtonText}>🗑️ {texts.delete}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{texts.screenTitle}</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'critical' && styles.tabActive]}
          onPress={() => setActiveTab('critical')}
        >
          <Text style={[styles.tabText, activeTab === 'critical' && styles.tabTextActive]}>
            {texts.tabCritical}
          </Text>
          {criticalData?.summary?.total_count ? (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{criticalData.summary.total_count}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'service' && styles.tabActive]}
          onPress={() => setActiveTab('service')}
        >
          <Text style={[styles.tabText, activeTab === 'service' && styles.tabTextActive]}>
            {texts.tabService}
          </Text>
          {uniqueParts.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{uniqueParts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'critical' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={criticalRefreshing}
              onRefresh={() => fetchCriticalMentions(true)}
              colors={[COLORS.primary]}
            />
          }
        >
          {criticalLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.centerText}>{texts.loading}</Text>
            </View>
          ) : criticalError ? (
            <View style={styles.centerState}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{criticalError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchCriticalMentions()}>
                <Text style={styles.retryText}>{texts.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : !criticalData || criticalData.summary.total_count === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>{texts.noMentions}</Text>
              <Text style={styles.emptyHint}>{texts.noMentionsHint}</Text>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              {renderCategorySection('elt', criticalData.critical_mentions.elt, criticalData.summary.elt_count)}
              {renderCategorySection('avionics', criticalData.critical_mentions.avionics, criticalData.summary.avionics_count)}
              {renderCategorySection('fire_extinguisher', criticalData.critical_mentions.fire_extinguisher, criticalData.summary.fire_extinguisher_count)}
              {renderCategorySection('general_limitations', criticalData.critical_mentions.general_limitations, criticalData.summary.general_limitations_count)}
            </View>
          )}
          
          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerText}>{texts.disclaimer}</Text>
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={partsRefreshing}
              onRefresh={() => fetchServiceParts(true)}
              colors={[COLORS.primary]}
            />
          }
        >
          {partsLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.centerText}>{texts.loading}</Text>
            </View>
          ) : partsError ? (
            <View style={styles.centerState}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{partsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchServiceParts()}>
                <Text style={styles.retryText}>{texts.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : uniqueParts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚙️</Text>
              <Text style={styles.emptyTitle}>{texts.noParts}</Text>
              <Text style={styles.emptyHint}>{texts.noPartsHint}</Text>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              {uniqueParts.map(renderServicePart)}
            </View>
          )}
          
          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerText}>{texts.disclaimer}</Text>
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
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
  headerBack: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerBackText: { color: COLORS.white, fontSize: 24, fontWeight: '600' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 2 },
  headerPlaceholder: { width: 40 },
  
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  tabBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  
  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { paddingVertical: 16 },
  contentContainer: { paddingHorizontal: 16 },
  
  // Center states
  centerState: { alignItems: 'center', paddingVertical: 60 },
  centerText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted },
  
  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textDark, textAlign: 'center' },
  emptyHint: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
  
  // Error
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: COLORS.red, textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: COLORS.white, fontWeight: '600' },
  
  // Category section
  categorySection: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  categoryIcon: { fontSize: 20 },
  categoryTitle: { fontSize: 16, fontWeight: '700' },
  categoryContent: { padding: 16, paddingTop: 0 },
  
  // Mention item
  mentionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mentionText: { fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  mentionMeta: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  mentionMetaText: { fontSize: 12, color: COLORS.textMuted },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  keywordBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  keywordText: { fontSize: 11, fontWeight: '600' },
  
  // Service part card
  partCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  partCardDeleting: { opacity: 0.5 },
  partNumber: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  partDescription: { fontSize: 14, color: COLORS.textDark, marginBottom: 4 },
  partSerial: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  partMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  partMetaText: { fontSize: 12, color: COLORS.textMuted },
  deleteButton: {
    backgroundColor: COLORS.redBg,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  deleteButtonText: { color: COLORS.red, fontWeight: '600', fontSize: 14 },
  
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.yellowBorder,
  },
  disclaimerIcon: { fontSize: 16, marginRight: 8 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#5D4037', lineHeight: 18 },
});
