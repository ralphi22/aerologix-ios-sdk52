/**
 * Report Dashboard Screen
 * Displays maintenance status with progress bars for critical elements
 * TC-SAFE: Informational only, no airworthiness decisions
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
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';
import { useReportSettings } from '@/stores/reportSettingsStore';
import { useElt } from '@/stores/eltStore';

const COLORS = {
  primary: '#0033A0',
  background: '#F5F5F5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  green: '#4CAF50',
  greenLight: '#A5D6A7',
  orange: '#FF9800',
  red: '#E53935',
  redLight: '#FFCDD2',
  yellow: '#FFF8E1',
  yellowBorder: '#FFB300',
  grey: '#BDBDBD',
  greyLight: '#E0E0E0',
};

// Calculate progress percentage and status
function calculateHoursProgress(current: number, limit: number): { percent: number; status: 'ok' | 'warning' | 'exceeded' } {
  const percent = Math.round((current / limit) * 100);
  if (percent >= 100) return { percent: Math.min(percent, 100), status: 'exceeded' };
  if (percent >= 80) return { percent, status: 'warning' };
  return { percent, status: 'ok' };
}

// Calculate date progress (months remaining)
function calculateDateProgress(lastDate: string, limitMonths: number): { percent: number; status: 'ok' | 'warning' | 'exceeded'; daysRemaining: number } {
  const last = new Date(lastDate);
  const expiry = new Date(last);
  expiry.setMonth(expiry.getMonth() + limitMonths);
  const now = new Date();
  const totalDays = (expiry.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const percent = Math.round((elapsedDays / totalDays) * 100);
  
  if (daysRemaining <= 0) return { percent: 100, status: 'exceeded', daysRemaining };
  if (percent >= 80) return { percent, status: 'warning', daysRemaining };
  return { percent, status: 'ok', daysRemaining };
}

interface ProgressBarProps {
  percent: number;
  status: 'ok' | 'warning' | 'exceeded';
}

function ProgressBar({ percent, status }: ProgressBarProps) {
  const color = status === 'exceeded' ? COLORS.red : status === 'warning' ? COLORS.orange : COLORS.green;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.progressPercent}>{percent}%</Text>
    </View>
  );
}

interface StatusBadgeProps {
  status: 'ok' | 'warning' | 'exceeded';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const lang = getLanguage();
  const color = status === 'exceeded' ? COLORS.red : status === 'warning' ? COLORS.orange : COLORS.green;
  const text = status === 'exceeded' 
    ? (lang === 'fr' ? 'Dépassé' : 'Exceeded')
    : status === 'warning' 
    ? (lang === 'fr' ? 'Attention' : 'Warning')
    : (lang === 'fr' ? 'Statut visuel' : 'Visual status');
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: status === 'ok' ? '#E8F5E9' : status === 'warning' ? '#FFF3E0' : '#FFEBEE' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{text}</Text>
    </View>
  );
}

interface CriticalElementCardProps {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  currentValue: string;
  currentLabel: string;
  limitValue: string;
  limitLabel: string;
  percent: number;
  status: 'ok' | 'warning' | 'exceeded';
}

function CriticalElementCard({
  icon,
  iconBg,
  title,
  subtitle,
  currentValue,
  currentLabel,
  limitValue,
  limitLabel,
  percent,
  status,
}: CriticalElementCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconContainer, { backgroundColor: iconBg }]}>
          <Text style={styles.cardIcon}>{icon}</Text>
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <StatusBadge status={status} />
      </View>
      <ProgressBar percent={percent} status={status} />
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardLabel}>{currentLabel}</Text>
          <Text style={styles.cardValue}>{currentValue}</Text>
        </View>
        <View style={styles.cardLimitContainer}>
          <Text style={styles.cardLabel}>{limitLabel}</Text>
          <Text style={styles.cardValue}>{limitValue}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ReportScreen() {
  const router = useRouter();
  const { aircraftId, registration } = useLocalSearchParams<{ aircraftId: string; registration: string }>();
  const lang = getLanguage();
  const { getAircraftById } = useAircraftLocalStore();
  const { settings, fixedLimits } = useReportSettings();
  const { getTestProgress: getEltTestProgress, fixedLimits: eltLimits, eltData } = useElt();

  const aircraft = getAircraftById(aircraftId || '');
  const engineHours = aircraft?.engineHours || 0;
  const propellerHours = aircraft?.propellerHours || 0;
  const airframeHours = aircraft?.airframeHours || 0;

  // Calculate all statuses using FIXED_LIMITS constants
  const motorProgress = calculateHoursProgress(engineHours, settings.motorTbo);
  const heliceProgress = calculateDateProgress(settings.heliceDate, fixedLimits.HELICE_YEARS * 12);
  const celluleProgress = calculateDateProgress(settings.celluleDate, fixedLimits.CELLULE_YEARS * 12);
  const avioniqueProgress = calculateDateProgress(settings.avioniqueDate, fixedLimits.AVIONIQUE_MONTHS);
  const magnetosProgress = calculateHoursProgress(settings.magnetosHours, fixedLimits.MAGNETOS_HOURS);
  const pompeProgress = calculateHoursProgress(settings.pompeVideHours, fixedLimits.POMPE_VIDE_HOURS);
  
  // ELT progress from ELT store (read-only)
  const eltTestProgressData = getEltTestProgress();
  const eltProgress = {
    percent: eltTestProgressData.percent,
    status: eltTestProgressData.status === 'operational' ? 'ok' as const : 
            eltTestProgressData.status === 'attention' ? 'warning' as const : 'exceeded' as const,
  };

  // Check for alerts
  const alerts: { title: string; titleFr: string; message: string; messageFr: string }[] = [];
  if (avioniqueProgress.status === 'exceeded') {
    alerts.push({
      title: 'Avionics',
      titleFr: 'Avionique',
      message: 'Certification expired',
      messageFr: 'Certification expirée',
    });
  }

  const navigateToSettings = () => {
    router.push({
      pathname: '/(tabs)/aircraft/maintenance/report-settings',
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
          <Text style={styles.headerTitle}>{lang === 'fr' ? 'Rapport' : 'Report'}</Text>
          <Text style={styles.headerSubtitle}>{registration || 'Aircraft'}</Text>
        </View>
        <TouchableOpacity onPress={navigateToSettings} style={styles.headerSettings}>
          <Text style={styles.headerSettingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* TC-Safe Banner */}
      <View style={styles.tcBanner}>
        <Text style={styles.tcBannerIcon}>ℹ️</Text>
        <Text style={styles.tcBannerText}>
          {lang === 'fr'
            ? 'Informatif uniquement — Consultez un AME certifié'
            : 'Information only — Consult a certified AME'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <View style={styles.alertsSection}>
            <View style={styles.alertsHeader}>
              <Text style={styles.alertsBell}>🔔</Text>
              <Text style={styles.alertsTitle}>
                {lang === 'fr' ? `Alertes (${alerts.length})` : `Alerts (${alerts.length})`}
              </Text>
            </View>
            {alerts.map((alert, index) => (
              <View key={index} style={styles.alertCard}>
                <View style={styles.alertIconContainer}>
                  <Text style={styles.alertIcon}>📡</Text>
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{lang === 'fr' ? alert.titleFr : alert.title}</Text>
                  <Text style={styles.alertMessage}>{lang === 'fr' ? alert.messageFr : alert.message}</Text>
                </View>
                <View style={styles.alertIndicator} />
              </View>
            ))}
          </View>
        )}

        {/* Main Hours Summary */}
        <View style={styles.hoursSummary}>
          <View style={styles.hoursItem}>
            <Text style={styles.hoursValue}>{engineHours.toFixed(1)}</Text>
            <Text style={styles.hoursLabel}>{lang === 'fr' ? 'Heures moteur' : 'Engine hours'}</Text>
          </View>
          <View style={styles.hoursDivider} />
          <View style={styles.hoursItem}>
            <Text style={styles.hoursValue}>{propellerHours.toFixed(1)}</Text>
            <Text style={styles.hoursLabel}>{lang === 'fr' ? 'Heures hélice' : 'Propeller hours'}</Text>
          </View>
          <View style={styles.hoursDivider} />
          <View style={styles.hoursItem}>
            <Text style={styles.hoursValue}>{airframeHours.toFixed(1)}</Text>
            <Text style={styles.hoursLabel}>{lang === 'fr' ? 'Heures cellule' : 'Airframe hours'}</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
            <Text style={styles.legendText}>{'< 80%'}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.orange }]} />
            <Text style={styles.legendText}>{'≥ 80%'}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.red }]} />
            <Text style={styles.legendText}>{lang === 'fr' ? 'Dépassé' : 'Exceeded'}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.grey }]} />
            <Text style={styles.legendText}>N/D</Text>
          </View>
        </View>

        {/* Critical Elements */}
        <View style={styles.cardsContainer}>
          {/* Moteur */}
          <CriticalElementCard
            icon="⚙️"
            iconBg={COLORS.greenLight}
            title={lang === 'fr' ? 'Moteur' : 'Engine'}
            subtitle={lang === 'fr' ? 'Heures' : 'Hours'}
            currentValue={`${engineHours.toFixed(1)} h`}
            currentLabel={lang === 'fr' ? 'État' : 'Status'}
            limitValue={`TBO: ${settings.motorTbo} h`}
            limitLabel={lang === 'fr' ? 'Limite' : 'Limit'}
            percent={motorProgress.percent}
            status={motorProgress.status}
          />

          {/* Hélice */}
          <CriticalElementCard
            icon="🔄"
            iconBg={COLORS.greenLight}
            title={lang === 'fr' ? 'Hélice' : 'Propeller'}
            subtitle="Date"
            currentValue={`${lang === 'fr' ? 'Dernière' : 'Last'}: ${settings.heliceDate}`}
            currentLabel={lang === 'fr' ? 'État' : 'Status'}
            limitValue={`${fixedLimits.HELICE_YEARS} ${lang === 'fr' ? 'ans max' : 'years max'}`}
            limitLabel={lang === 'fr' ? 'Limite' : 'Limit'}
            percent={heliceProgress.percent}
            status={heliceProgress.status}
          />

          {/* Cellule (Annuelle) */}
          <CriticalElementCard
            icon="✈️"
            iconBg={COLORS.greenLight}
            title={lang === 'fr' ? 'Cellule (Annuelle)' : 'Airframe (Annual)'}
            subtitle="Date"
            currentValue={`${lang === 'fr' ? 'Dernière' : 'Last'}: ${settings.celluleDate}`}
            currentLabel={lang === 'fr' ? 'État' : 'Status'}
            limitValue={`${fixedLimits.CELLULE_YEARS} ${lang === 'fr' ? 'ans max' : 'years max'}`}
            limitLabel={lang === 'fr' ? 'Limite' : 'Limit'}
            percent={celluleProgress.percent}
            status={celluleProgress.status}
          />

          {/* Avionique */}
          <CriticalElementCard
            icon="📡"
            iconBg={avioniqueProgress.status === 'exceeded' ? COLORS.redLight : COLORS.greenLight}
            title={lang === 'fr' ? 'Avionique' : 'Avionics'}
            subtitle="Date"
            currentValue={`${lang === 'fr' ? 'Dernière' : 'Last'}: ${settings.avioniqueDate}`}
            currentLabel={lang === 'fr' ? 'État' : 'Status'}
            limitValue={`${fixedLimits.AVIONIQUE_MONTHS} ${lang === 'fr' ? 'mois' : 'months'}`}
            limitLabel={lang === 'fr' ? 'Limite' : 'Limit'}
            percent={avioniqueProgress.percent}
            status={avioniqueProgress.status}
          />

          {/* Magnétos */}
          <CriticalElementCard
            icon="⚡"
            iconBg={COLORS.greenLight}
            title={lang === 'fr' ? 'Magnétos' : 'Magnetos'}
            subtitle={lang === 'fr' ? 'Heures' : 'Hours'}
            currentValue={`${settings.magnetosHours.toFixed(1)} h ${lang === 'fr' ? 'depuis inspe...' : 'since insp...'}`}
            currentLabel={lang === 'fr' ? 'État' : 'Status'}
            limitValue={`${fixedLimits.MAGNETOS_HOURS} h`}
            limitLabel={lang === 'fr' ? 'Limite' : 'Limit'}
            percent={magnetosProgress.percent}
            status={magnetosProgress.status}
          />

          {/* Pompe à vide */}
          <CriticalElementCard
            icon="💨"
            iconBg={COLORS.greenLight}
            title={lang === 'fr' ? 'Pompe à vide' : 'Vacuum Pump'}
            subtitle={lang === 'fr' ? 'Heures' : 'Hours'}
            currentValue={`${settings.pompeVideHours.toFixed(1)} h ${lang === 'fr' ? 'depuis rempl...' : 'since repl...'}`}
            currentLabel={lang === 'fr' ? 'État' : 'Status'}
            limitValue={`${fixedLimits.POMPE_VIDE_HOURS} h`}
            limitLabel={lang === 'fr' ? 'Limite' : 'Limit'}
            percent={pompeProgress.percent}
            status={pompeProgress.status}
          />

          {/* ELT */}
          <CriticalElementCard
            icon="📍"
            iconBg={COLORS.greenLight}
            title="ELT"
            subtitle="Date"
            currentValue={`Test: ${settings.eltTestDate} | Ex...`}
            currentLabel={lang === 'fr' ? 'État' : 'Status'}
            limitValue={`Test ${fixedLimits.ELT_TEST_MONTHS}m / Batt ${fixedLimits.ELT_BATTERY_MONTHS}m`}
            limitLabel={lang === 'fr' ? 'Limite' : 'Limit'}
            percent={eltProgress.percent}
            status={eltProgress.status}
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
    backgroundColor: COLORS.white,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.greyLight,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackText: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textDark,
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  headerSettings: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSettingsIcon: {
    fontSize: 22,
  },
  // TC Banner
  tcBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.yellow,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.yellowBorder,
  },
  tcBannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tcBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#5D4037',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  // Alerts
  alertsSection: {
    margin: 16,
    marginBottom: 8,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertsBell: {
    fontSize: 16,
    marginRight: 8,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.redLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.red,
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  alertIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.red,
  },
  // Hours Summary
  hoursSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
  },
  hoursItem: {
    flex: 1,
    alignItems: 'center',
  },
  hoursValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  hoursLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  hoursDivider: {
    width: 1,
    backgroundColor: COLORS.greyLight,
    marginHorizontal: 8,
  },
  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  // Cards
  cardsContainer: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardTitleContainer: {
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
    marginTop: 2,
  },
  // Progress bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.greyLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginLeft: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Card footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: 2,
  },
  cardLimitContainer: {
    alignItems: 'flex-end',
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: COLORS.yellow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.yellowBorder,
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
