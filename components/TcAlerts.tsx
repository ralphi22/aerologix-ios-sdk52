/**
 * TC Alerts Component - Display new AD/SB alerts
 * TC-SAFE: Informational only, no regulatory decisions
 * 
 * Features:
 * - Shows NEW_AD_SB alerts
 * - "New" badge until read
 * - Links to TC AD/SB page
 * - Calm, informative UX
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getLanguage } from '@/i18n';
import { TcAlert, useAlerts } from '@/stores/alertsStore';

// ============================================
// COLORS
// ============================================
const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  border: '#E0E0E0',
  alertBg: '#E3F2FD',
  alertBorder: '#90CAF9',
  newBadge: '#FF9800',
  newBadgeBg: '#FFF3E0',
};

// ============================================
// BILINGUAL TEXTS
// ============================================
const TEXTS = {
  en: {
    alertsTitle: 'TC AD/SB Alerts',
    newBadge: 'New',
    noAlerts: 'No new alerts',
    viewAll: 'View TC AD/SB',
    markRead: 'Mark as read',
    alertMessage: 'A new AD/SB reference has been detected for your aircraft model. Please verify manually using official Transport Canada records.',
    informationalNote: 'Informational only. This does not indicate any compliance status.',
  },
  fr: {
    alertsTitle: 'Alertes TC AD/SB',
    newBadge: 'Nouveau',
    noAlerts: 'Aucune nouvelle alerte',
    viewAll: 'Voir TC AD/SB',
    markRead: 'Marquer comme lu',
    alertMessage: 'Une nouvelle référence AD/SB a été détectée pour votre modèle d\'aéronef. Veuillez vérifier manuellement avec les registres officiels de Transport Canada.',
    informationalNote: 'Informatif uniquement. Ceci n\'indique aucun statut de conformité.',
  },
};

// ============================================
// SINGLE ALERT CARD
// ============================================
interface AlertCardProps {
  alert: TcAlert;
  onPress: () => void;
  onMarkRead: () => void;
}

function AlertCard({ alert, onPress, onMarkRead }: AlertCardProps) {
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];
  const isUnread = !alert.is_read;

  return (
    <TouchableOpacity 
      style={[styles.alertCard, isUnread && styles.alertCardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.alertHeader}>
        <View style={styles.alertIconContainer}>
          <Ionicons 
            name="document-text" 
            size={20} 
            color={COLORS.primary} 
          />
        </View>
        
        <View style={styles.alertInfo}>
          <View style={styles.alertTitleRow}>
            <Text style={styles.alertTitle}>
              {alert.reference || 'TC AD/SB'}
            </Text>
            {isUnread && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{texts.newBadge}</Text>
              </View>
            )}
          </View>
          {alert.aircraft_model && (
            <Text style={styles.alertSubtitle}>
              {alert.aircraft_model}
            </Text>
          )}
        </View>

        {/* Mark as read button */}
        {isUnread && (
          <TouchableOpacity 
            style={styles.markReadButton}
            onPress={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Message */}
      <Text style={styles.alertMessage}>{texts.alertMessage}</Text>

      {/* Footer */}
      <View style={styles.alertFooter}>
        <Text style={styles.alertDate}>
          {new Date(alert.created_at).toLocaleDateString()}
        </Text>
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>{texts.viewAll}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// ALERTS SECTION (FOR AIRCRAFT LIST)
// ============================================
interface AlertsSectionProps {
  aircraftId?: string;
  aircraftRegistration?: string;
  maxAlerts?: number;
}

export function AlertsSection({ aircraftId, aircraftRegistration, maxAlerts = 3 }: AlertsSectionProps) {
  const router = useRouter();
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];
  const { alerts, getAlertsByAircraft, markAsRead } = useAlerts();

  // Filter alerts for this aircraft if ID provided
  const displayAlerts = aircraftId 
    ? getAlertsByAircraft(aircraftId).slice(0, maxAlerts)
    : alerts.filter(a => !a.is_read).slice(0, maxAlerts);

  if (displayAlerts.length === 0) {
    return null;
  }

  const handleAlertPress = (alert: TcAlert) => {
    // Mark as read first
    markAsRead(alert.id);
    
    // Navigate to TC AD/SB page
    router.push({
      pathname: '/(tabs)/aircraft/maintenance/adsb-tc',
      params: { 
        aircraftId: alert.aircraft_id || aircraftId,
        registration: alert.aircraft_registration || aircraftRegistration,
      },
    });
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Ionicons name="notifications" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>{texts.alertsTitle}</Text>
        <View style={styles.alertCountBadge}>
          <Text style={styles.alertCountText}>{displayAlerts.filter(a => !a.is_read).length}</Text>
        </View>
      </View>

      {displayAlerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onPress={() => handleAlertPress(alert)}
          onMarkRead={() => markAsRead(alert.id)}
        />
      ))}

      {/* Informational note */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.infoNoteText}>{texts.informationalNote}</Text>
      </View>
    </View>
  );
}

// ============================================
// ALERT BADGE (FOR NAVIGATION BUTTONS)
// ============================================
interface AlertBadgeProps {
  aircraftId?: string;
}

export function AlertBadge({ aircraftId }: AlertBadgeProps) {
  const { hasUnreadAlerts, getAlertsByAircraft } = useAlerts();
  
  const hasAlerts = aircraftId 
    ? getAlertsByAircraft(aircraftId).some(a => !a.is_read)
    : hasUnreadAlerts();

  if (!hasAlerts) {
    return null;
  }

  return (
    <View style={styles.smallBadge}>
      <Text style={styles.smallBadgeText}>!</Text>
    </View>
  );
}

// ============================================
// COMPACT ALERT BANNER (FOR AIRCRAFT DETAIL)
// ============================================
interface AlertBannerProps {
  aircraftId: string;
  aircraftRegistration?: string;
}

export function AlertBanner({ aircraftId, aircraftRegistration }: AlertBannerProps) {
  const router = useRouter();
  const lang = getLanguage() as 'en' | 'fr';
  const { getAlertsByAircraft, markAsRead } = useAlerts();
  
  const unreadAlerts = getAlertsByAircraft(aircraftId).filter(a => !a.is_read);
  
  if (unreadAlerts.length === 0) {
    return null;
  }

  const handlePress = () => {
    // Mark all as read for this aircraft
    unreadAlerts.forEach(alert => markAsRead(alert.id));
    
    router.push({
      pathname: '/(tabs)/aircraft/maintenance/adsb-tc',
      params: { aircraftId, registration: aircraftRegistration },
    });
  };

  return (
    <TouchableOpacity style={styles.banner} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.bannerLeft}>
        <View style={styles.bannerIcon}>
          <Ionicons name="notifications" size={18} color={COLORS.white} />
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>
            {unreadAlerts.length} {lang === 'fr' ? 'nouvelle(s) alerte(s) TC AD/SB' : 'new TC AD/SB alert(s)'}
          </Text>
          <Text style={styles.bannerSubtitle}>
            {lang === 'fr' 
              ? 'Appuyez pour voir les détails' 
              : 'Tap to view details'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
    </TouchableOpacity>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  // Section
  sectionContainer: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    flex: 1,
  },
  alertCountBadge: {
    backgroundColor: COLORS.newBadge,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  alertCountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Alert Card
  alertCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  alertCardUnread: {
    backgroundColor: COLORS.alertBg,
    borderColor: COLORS.alertBorder,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  alertSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: COLORS.newBadgeBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.newBadge,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.newBadge,
    textTransform: 'uppercase',
  },
  markReadButton: {
    padding: 4,
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  
  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  infoNoteText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  
  // Small badge (for nav buttons)
  smallBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.newBadge,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  smallBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
});
