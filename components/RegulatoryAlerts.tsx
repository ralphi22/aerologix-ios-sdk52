/**
 * Canadian Regulatory Alert Layer
 * TC-SAFE: Displays regulatory consequences only when ≥100%
 * Based on CARs (Canadian Aviation Regulations)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getLanguage } from '@/i18n';

const COLORS = {
  red: '#E53935',
  redBg: '#FFEBEE',
  orange: '#FF9800',
  orangeBg: '#FFF3E0',
  yellow: '#FFF8E1',
  yellowBorder: '#FFE082',
  textDark: '#212121',
  textMuted: '#616161',
};

// Regulatory consequences by system (Canada)
export const REGULATORY_INFO = {
  avionics: {
    consequence: {
      en: 'Controlled airspace not permitted',
      fr: 'Espace aérien contrôlé non autorisé',
    },
    reference: 'CARs 571.10 / 605.35',
    showGlobalBanner: true,
    bannerTitle: {
      en: 'Avionics 24-month inspection exceeded',
      fr: 'Inspection avionique 24 mois dépassée',
    },
  },
  elt: {
    consequence: {
      en: 'Operation limited to 25 NM',
      fr: 'Exploitation limitée à 25 NM',
    },
    reference: 'CARs 605.38',
    showGlobalBanner: true,
    bannerTitle: {
      en: 'ELT inspection exceeded',
      fr: 'Inspection ELT dépassée',
    },
  },
  propeller: {
    consequence: {
      en: 'On-condition',
      fr: 'Selon condition',
    },
    reference: 'CARs 605 / Std 571',
    showGlobalBanner: false,
  },
  engine: {
    consequence: {
      en: 'On-condition',
      fr: 'Selon condition',
    },
    reference: 'CARs 605 / Std 571',
    showGlobalBanner: false,
  },
  magnetos: {
    consequence: {
      en: 'On-condition',
      fr: 'Selon condition',
    },
    reference: 'CARs 605 / Std 571',
    showGlobalBanner: false,
  },
  vacuumPump: {
    consequence: {
      en: 'On-condition',
      fr: 'Selon condition',
    },
    reference: 'CARs 605 / Std 571',
    showGlobalBanner: false,
  },
};

export type RegulatorySystem = keyof typeof REGULATORY_INFO;

interface RegulatoryStatusProps {
  system: RegulatorySystem;
  percent: number;
  limitationText?: string; // From TEA/OCR
}

/**
 * Displays regulatory status only when ≥100%
 * Before 100%: returns null (no text shown)
 */
export function RegulatoryStatus({ system, percent, limitationText }: RegulatoryStatusProps) {
  const lang = getLanguage();
  
  // CRITICAL: Do NOT show anything before 100%
  if (percent < 100) {
    return null;
  }
  
  const info = REGULATORY_INFO[system];
  if (!info) return null;
  
  const consequence = lang === 'fr' ? info.consequence.fr : info.consequence.en;
  
  return (
    <View style={styles.statusContainer}>
      {/* TEA limitation text (if provided by backend/OCR) */}
      {limitationText && (
        <View style={styles.teaLimitation}>
          <Text style={styles.teaLimitationText}>{limitationText}</Text>
        </View>
      )}
      
      {/* Regulatory status */}
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={styles.statusValue}>{consequence}</Text>
      </View>
      
      {/* Regulatory reference */}
      <View style={styles.referenceRow}>
        <Text style={styles.referenceLabel}>Regulatory reference:</Text>
        <Text style={styles.referenceValue}>{info.reference}</Text>
      </View>
      
      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        {lang === 'fr'
          ? 'Informatif seulement — basé sur les données du carnet enregistrées. Vérifiez avec le certificat de libération et votre TEA.'
          : 'Informational only — based on recorded logbook data. Verify with maintenance release and your AME.'}
      </Text>
    </View>
  );
}

interface GlobalRegulatoryBannerProps {
  avionicsPercent: number;
  eltPercent: number;
}

/**
 * Global banner displayed at top of page
 * Only shows for Avionics and ELT when ≥100%
 */
export function GlobalRegulatoryBanner({ avionicsPercent, eltPercent }: GlobalRegulatoryBannerProps) {
  const lang = getLanguage();
  
  const showAvionics = avionicsPercent >= 100;
  const showElt = eltPercent >= 100;
  
  // Don't show banner if neither system is exceeded
  if (!showAvionics && !showElt) {
    return null;
  }
  
  const avionicsInfo = REGULATORY_INFO.avionics;
  const eltInfo = REGULATORY_INFO.elt;
  
  return (
    <View style={styles.bannerContainer}>
      {showAvionics && (
        <View style={styles.bannerItem}>
          <View style={styles.bannerHeader}>
            <Text style={styles.bannerIcon}>⚠️</Text>
            <Text style={styles.bannerTitle}>
              {lang === 'fr' ? avionicsInfo.bannerTitle.fr : avionicsInfo.bannerTitle.en}
            </Text>
          </View>
          <Text style={styles.bannerConsequence}>
            {lang === 'fr' ? avionicsInfo.consequence.fr : avionicsInfo.consequence.en}
          </Text>
          <Text style={styles.bannerReference}>{avionicsInfo.reference}</Text>
        </View>
      )}
      
      {showElt && (
        <View style={[styles.bannerItem, showAvionics && styles.bannerItemSeparator]}>
          <View style={styles.bannerHeader}>
            <Text style={styles.bannerIcon}>⚠️</Text>
            <Text style={styles.bannerTitle}>
              {lang === 'fr' ? eltInfo.bannerTitle.fr : eltInfo.bannerTitle.en}
            </Text>
          </View>
          <Text style={styles.bannerConsequence}>
            {lang === 'fr' ? eltInfo.consequence.fr : eltInfo.consequence.en}
          </Text>
          <Text style={styles.bannerReference}>{eltInfo.reference}</Text>
        </View>
      )}
      
      {/* Disclaimer */}
      <Text style={styles.bannerDisclaimer}>
        {lang === 'fr'
          ? 'Informatif seulement — basé sur les données du carnet. Vérifiez avec le certificat de libération et votre TEA.'
          : 'Informational only — based on recorded logbook data. Verify with maintenance release and your AME.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // RegulatoryStatus styles
  statusContainer: {
    backgroundColor: COLORS.redBg,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },
  teaLimitation: {
    backgroundColor: COLORS.orangeBg,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  teaLimitationText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orange,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.red,
  },
  referenceRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  referenceLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  referenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  disclaimer: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  // GlobalRegulatoryBanner styles
  bannerContainer: {
    backgroundColor: COLORS.redBg,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  bannerItem: {
    marginBottom: 8,
  },
  bannerItemSeparator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 57, 53, 0.3)',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.red,
  },
  bannerConsequence: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textDark,
    marginLeft: 24,
    marginBottom: 2,
  },
  bannerReference: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 24,
  },
  bannerDisclaimer: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 14,
    textAlign: 'center',
  },
});
