/**
 * Login Screen - Navigation vers /(tabs)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import authService from '@/services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (isSignup && !name)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignup) {
        await authService.signup({ email, name, password });
      } else {
        await authService.login({ email, password });
      }
      
      // Navigation vers les tabs
      router.replace('/(tabs)');
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || "Échec";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>AeroLogix AI</Text>
          <Text style={styles.subtitle}>Test avec Tabs minimaux</Text>
        </View>

        <View style={styles.form}>
          {isSignup && (
            <TextInput
              style={styles.input}
              placeholder="Nom"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Courriel"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.button, isLoading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignup ? 'Créer un compte' : 'Connexion'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => setIsSignup(!isSignup)}
          >
            <Text style={styles.switchText}>
              {isSignup ? 'Déjà un compte ? Connexion' : 'Créer un compte'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1E3A8A' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 8 },
  form: { gap: 16 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
  },
  button: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  switchButton: { alignItems: 'center', marginTop: 16 },
  switchText: { color: '#1E3A8A', fontSize: 14, fontWeight: '500' },
});
