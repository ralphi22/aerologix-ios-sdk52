/**
 * DisclaimerGate.tsx - TC-Safe disclaimer modal
 * Must be accepted before accessing the app
 * Uses expo-secure-store for persistence
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { t } from '@/i18n';

const DISCLAIMER_KEY = 'tc_disclaimer_accepted';

// AeroLogix brand colors
const COLORS = {
  primary: '#0033A0',
  background: '#F8F9FA',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  danger: '#DC3545',
};

interface DisclaimerGateProps {
  children: React.ReactNode;
}

export function DisclaimerGate({ children }: DisclaimerGateProps) {
  const [isAccepted, setIsAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkDisclaimerStatus();
  }, []);

  const checkDisclaimerStatus = async () => {
    try {
      if (Platform.OS === 'web') {
        const value = localStorage.getItem(DISCLAIMER_KEY);
        setIsAccepted(value === '1');
      } else {
        const value = await SecureStore.getItemAsync(DISCLAIMER_KEY);
        setIsAccepted(value === '1');
      }
    } catch (error) {
      console.error('Error checking disclaimer status:', error);
      setIsAccepted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(DISCLAIMER_KEY, '1');
      } else {
        await SecureStore.setItemAsync(DISCLAIMER_KEY, '1');
      }
      setIsAccepted(true);
    } catch (error) {
      console.error('Error saving disclaimer acceptance:', error);
    }
  };

  // Show nothing while loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>AeroLogix AI</Text>
      </View>
    );
  }

  // Show disclaimer modal if not accepted
  if (!isAccepted) {
    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header with icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{t('tc_title')}</Text>

            {/* Body */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.bodyText}>{t('tc_body')}</Text>
            </ScrollView>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAccept}
                activeOpacity={0.8}
              >
                <Text style={styles.acceptButtonText}>{t('accept')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => {
                  // Do nothing - user stays on this screen
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.declineButtonText}>{t('decline')}</Text>
              </TouchableOpacity>
            </View>

            {/* TC-Safe footer */}
            <Text style={styles.footerText}>
              TC-Safe • Informational Only
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // Render children if accepted
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    width: '100%',
    maxHeight: '50%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 26,
    color: COLORS.textDark,
    textAlign: 'left',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 30,
    gap: 12,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  declineButtonText: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    marginTop: 20,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default DisclaimerGate;
