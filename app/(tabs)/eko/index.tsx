/**
 * EKO - AI Assistant Chat Screen
 * Informational only - TC-Safe
 * 
 * ENDPOINTS:
 * - POST /api/eko/chat - Send message
 * - GET /api/eko/history - Get conversation history
 * - DELETE /api/eko/history - Clear history
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { getLanguage } from '@/i18n';
import api from '@/services/api';

const COLORS = {
  primary: '#1a73e8',
  primaryDark: '#0d47a1',
  background: '#f5f5f5',
  white: '#FFFFFF',
  textDark: '#212121',
  textMuted: '#616161',
  textLight: '#9E9E9E',
  userBubble: '#1a73e8',
  assistantBubble: '#FFFFFF',
  errorBubble: '#ffebee',
  border: '#E0E0E0',
  yellow: '#FFF8E1',
  yellowBorder: '#FFE082',
};

// Message type
interface Message {
  role: 'user' | 'assistant';
  content: string;
  disclaimer?: string;
  isError?: boolean;
  timestamp?: string;
}

// Suggestions bilingues
const SUGGESTIONS = [
  { fr: "Comment fonctionne le suivi de vol?", en: "How does flight tracking work?" },
  { fr: "Qu'est-ce qu'un AD?", en: "What is an AD?" },
  { fr: "Comment importer un PDF TC?", en: "How to import a TC PDF?" },
  { fr: "Explique les mentions critiques", en: "Explain critical mentions" },
  { fr: "Différence entre TEA et AMO?", en: "Difference between TEA and AMO?" },
];

// Texts bilingues
const TEXTS = {
  en: {
    title: 'EKO Assistant',
    subtitle: 'Bilingual FR/EN Assistant',
    placeholder: 'Ask EKO...',
    sending: 'Sending...',
    connectionError: 'Connection error. Please try again.',
    rateLimitTitle: 'Rate Limited',
    rateLimitMessage: 'Please wait before sending a new message.',
    clearHistory: 'Clear',
    clearConfirmTitle: 'Clear History',
    clearConfirmMessage: 'Delete all conversation history?',
    cancel: 'Cancel',
    delete: 'Delete',
    footer: 'EKO is an educational tool. Consult TEA/AMO for decisions.',
    welcomeMessage: "Hello! I'm EKO, your bilingual assistant for AeroLogix AI. How can I help you today?",
  },
  fr: {
    title: 'EKO Assistant',
    subtitle: 'Assistant bilingue FR/EN',
    placeholder: 'Demandez à EKO...',
    sending: 'Envoi...',
    connectionError: 'Erreur de connexion. Veuillez réessayer.',
    rateLimitTitle: 'Limite atteinte',
    rateLimitMessage: 'Veuillez patienter avant d\'envoyer un nouveau message.',
    clearHistory: 'Effacer',
    clearConfirmTitle: 'Effacer l\'historique',
    clearConfirmMessage: 'Supprimer toute la conversation ?',
    cancel: 'Annuler',
    delete: 'Supprimer',
    footer: 'EKO est un outil éducatif. Consultez un TEA/AMO pour toute décision.',
    welcomeMessage: "Bonjour ! Je suis EKO, votre assistant bilingue pour AeroLogix AI. Comment puis-je vous aider ?",
  },
};

export default function EkoScreen() {
  const lang = getLanguage() as 'en' | 'fr';
  const texts = TEXTS[lang];
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: texts.welcomeMessage,
      timestamp: new Date().toISOString(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const flatListRef = useRef<FlatList>(null);

  // Send message to EKO
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setShowSuggestions(false);
    setLoading(true);

    try {
      const response = await api.post('/api/eko/chat', {
        message: userMessage.content,
        aircraft_context: null,
        conversation_history: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      // Handle rate limiting
      if (response.status === 429) {
        Alert.alert(texts.rateLimitTitle, texts.rateLimitMessage);
        return;
      }

      const data = response.data;
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.message || 'No response',
        disclaimer: data.disclaimer,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
    } catch (error: any) {
      console.error('[EKO] Error:', error);
      
      // Handle rate limiting error
      if (error?.response?.status === 429) {
        Alert.alert(texts.rateLimitTitle, texts.rateLimitMessage);
        return;
      }
      
      const errorMessage: Message = {
        role: 'assistant',
        content: texts.connectionError,
        isError: true,
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [inputText, messages, loading, texts]);

  // Handle suggestion tap
  const handleSuggestion = (suggestion: typeof SUGGESTIONS[0]) => {
    const text = lang === 'fr' ? suggestion.fr : suggestion.en;
    setInputText(text);
  };

  // Clear history
  const handleClearHistory = () => {
    Alert.alert(
      texts.clearConfirmTitle,
      texts.clearConfirmMessage,
      [
        { text: texts.cancel, style: 'cancel' },
        {
          text: texts.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/eko/history');
            } catch (e) {
              console.log('[EKO] Clear history error:', e);
            }
            setMessages([{
              role: 'assistant',
              content: texts.welcomeMessage,
              timestamp: new Date().toISOString(),
            }]);
            setShowSuggestions(true);
          },
        },
      ]
    );
  };

  // Render message bubble
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        item.isError && styles.errorBubble,
      ]}>
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.assistantText,
          item.isError && styles.errorText,
        ]}>
          {item.content}
        </Text>
        {item.disclaimer && (
          <Text style={styles.disclaimer}>{item.disclaimer}</Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🤖</Text>
          <View>
            <Text style={styles.headerTitle}>{texts.title}</Text>
            <Text style={styles.headerSubtitle}>{texts.subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
          <Text style={styles.clearButtonText}>{texts.clearHistory}</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessage}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
      />

      {/* Suggestions */}
      {showSuggestions && messages.length <= 1 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            {SUGGESTIONS.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSuggestion(suggestion)}
              >
                <Text style={styles.suggestionText}>
                  {lang === 'fr' ? suggestion.fr : suggestion.en}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={texts.placeholder}
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={1000}
          editable={!loading}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={loading || !inputText.trim()}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* TC-Safe Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerIcon}>⚠️</Text>
        <Text style={styles.footerText}>{texts.footer}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

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
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    fontSize: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  clearButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    marginVertical: 6,
    padding: 14,
    borderRadius: 18,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.assistantBubble,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  errorBubble: {
    backgroundColor: COLORS.errorBubble,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.white,
  },
  assistantText: {
    color: COLORS.textDark,
  },
  errorText: {
    color: '#C62828',
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  
  // Suggestions
  suggestionsContainer: {
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  suggestionsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.textDark,
  },
  
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textDark,
    maxHeight: 120,
    backgroundColor: COLORS.background,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 20,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.yellow,
    borderTopWidth: 1,
    borderTopColor: COLORS.yellowBorder,
  },
  footerIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    color: '#5D4037',
    lineHeight: 16,
  },
});
