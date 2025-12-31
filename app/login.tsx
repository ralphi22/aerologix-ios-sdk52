/**
 * login.tsx - Login screen for AeroLogix AI
 * Connected to backend authService
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { t, getLanguage } from '@/i18n';
import authService from '@/services/authService';

// AeroLogix brand colors from screenshot analysis
const COLORS = {
  primary: '#0033A0',
  primaryLight: '#0056B3',
  background: '#F8F9FA',
  white: '#FFFFFF',
  textDark: '#11181C',
  textMuted: '#6C757D',
  inputBorder: '#E9ECEF',
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const lang = getLanguage();

    // Validation
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', t('error_generic'));
      return;
    }

    // [LOG] Login attempt
    console.log('LOGIN_ATTEMPT', { email: email.trim() });

    setIsLoading(true);
    try {
      // Call backend authService
      const user = await authService.login({
        email: email.trim(),
        password: password,
      });

      // [LOG] Login success
      console.log('LOGIN_SUCCESS', { userId: user.id, email: user.email });

      // Navigate to main app
      router.replace('/(tabs)/aircraft');

    } catch (error: any) {
      // [LOG] Login error
      console.log('LOGIN_ERROR', {
        status: error?.response?.status,
        message: error?.response?.data?.detail || error?.message,
      });

      // Determine error message
      let errorMessage: string;

      if (error?.response) {
        // Server responded with error (401, 400, etc.)
        const status = error.response.status;
        if (status === 401 || status === 400) {
          errorMessage = lang === 'fr'
            ? 'Email ou mot de passe invalide'
            : 'Invalid email or password';
        } else {
          errorMessage = error.response.data?.detail || t('error_generic');
        }
      } else if (error?.request) {
        // Network error - no response received
        errorMessage = lang === 'fr'
          ? 'Impossible de joindre le serveur'
          : 'Unable to reach server';
      } else {
        // Other error
        errorMessage = t('error_generic');
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignup = () => {
    router.push('/signup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo / Icon */}
          <View style={styles.logoContainer}>
            <Text style={styles.airplaneIcon}>✈️</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t('app_name')}</Text>
          <Text style={styles.tagline}>{t('app_tagline')}</Text>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder={t('email')}
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder={t('password')}
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>{t('login')}</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{t('no_account')} </Text>
            <TouchableOpacity onPress={navigateToSignup} disabled={isLoading}>
              <Text style={styles.signupLink}>{t('signup')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  airplaneIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: COLORS.textDark,
  },
  loginButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  signupLink: {
    fontSize: 16,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
});
