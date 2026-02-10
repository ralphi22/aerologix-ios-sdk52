/**
 * EKO - AI Assistant Chat Screen
 * Bilingual FR/EN chat interface with aircraft context
 * TC-SAFE: Educational tool only
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getLanguage } from '@/i18n';
import { useAircraftLocalStore } from '@/stores/aircraftLocalStore';
import api from '@/services/api';

const COLORS = {
  primary: '#1E3A8A',
  primaryLight: '#3B82F6',
  background: '#F1F5F9',
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  userBubble: '#1E3A8A',
  assistantBubble: '#FFFFFF',
  errorBubble: '#FEE2E2',
  border: '#E2E8F0',
  disclaimer: '#92400E',
  disclaimerBg: '#FEF3C7',
  success: '#10B981',
  suggestionBg: '#EFF6FF',
  suggestionBorder: '#BFDBFE',
};

// Message type
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  disclaimer?: string;
  isError?: boolean;
  timestamp: Date;
}

// Suggestions bilingues
const SUGGESTIONS = [
  { fr: "Comment fonctionne le suivi de vol?", en: "How does flight tracking work?" },
  { fr: "Qu'est-ce qu'un AD?", en: "What is an AD?" },
  { fr: "Comment importer un PDF TC?", en: "How to import a TC PDF?" },
  { fr: "Explique les mentions critiques", en: "Explain critical mentions" },
  { fr: "Quelle est la différence entre TEA et AMO?", en: "What's the difference between TEA and AMO?" },
  { fr: "Comment fonctionne l'OCR?", en: "How does OCR work?" },
];

// Welcome message
const getWelcomeMessage = (lang: string): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: lang === 'fr'
    ? "Bonjour! Je suis EKO, votre assistant IA pour AeroLogix. Je peux vous aider à comprendre les dossiers de maintenance, les AD/SB, et les fonctionnalités de l'application.\n\nComment puis-je vous aider aujourd'hui?"
    : "Hello! I'm EKO, your AI assistant for AeroLogix. I can help you understand maintenance records, AD/SBs, and application features.\n\nHow can I help you today?",
  disclaimer: lang === 'fr'
    ? "Information à titre indicatif uniquement. Consultez un TEA/AMO pour toute décision."
    : "Information for guidance only. Consult a TEA/AMO for any decisions.",
  timestamp: new Date(),
});

export default function EkoScreen() {
  const lang = getLanguage();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  // State
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage(lang)]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<string | null>(null);
  const [showAircraftPicker, setShowAircraftPicker] = useState(false);
  
  // Get aircraft list for context selector
  const { aircraft } = useAircraftLocalStore();

  // Generate unique ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Send message to EKO API
  const sendMessage = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || isLoading) return;

    Keyboard.dismiss();

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      // Prepare conversation history (last 10 messages, excluding welcome)
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await api.post('/api/eko/chat', {
        message: trimmedInput,
        aircraft_context: selectedAircraft || null,
        conversation_history: conversationHistory,
      });

      const data = response.data;

      // Add assistant response
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.response || (lang === 'fr' ? 'Réponse reçue.' : 'Response received.'),
        disclaimer: data.disclaimer,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
      console.log('EKO chat error:', error);

      // Handle rate limiting
      if (error.response?.status === 429) {
        Alert.alert(
          lang === 'fr' ? 'Limite atteinte' : 'Rate Limited',
          lang === 'fr'
            ? 'Veuillez patienter avant d\'envoyer un nouveau message.'
            : 'Please wait before sending a new message.'
        );
      }

      // Add error message
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: error.response?.data?.detail 
          || (lang === 'fr' ? 'Erreur de connexion. Réessayez.' : 'Connection error. Please try again.'),
        isError: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // Clear conversation
  const clearConversation = async () => {
    Alert.alert(
      lang === 'fr' ? 'Effacer la conversation?' : 'Clear conversation?',
      lang === 'fr' 
        ? 'Cette action supprimera tous les messages.'
        : 'This will delete all messages.',
      [
        { text: lang === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'fr' ? 'Effacer' : 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/eko/history');
            } catch (e) {
              // Ignore error, clear locally anyway
            }
            setMessages([getWelcomeMessage(lang)]);
          },
        },
      ]
    );
  };

  // Handle suggestion tap
  const handleSuggestionTap = (suggestion: { fr: string; en: string }) => {
    setInputText(lang === 'fr' ? suggestion.fr : suggestion.en);
    inputRef.current?.focus();
  };

  // Render message bubble
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          item.isError && styles.errorBubble,
        ]}
      >
        {!isUser && !isSystem && (
          <View style={styles.assistantHeader}>
            <View style={styles.ekoAvatar}>
              <Ionicons name="sparkles" size={14} color={COLORS.primary} />
            </View>
            <Text style={styles.assistantName}>EKO</Text>
          </View>
        )}
        
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {item.content}
        </Text>
        
        {item.disclaimer && (
          <View style={styles.disclaimerContainer}>
            <Ionicons name="information-circle-outline" size={12} color={COLORS.disclaimer} />
            <Text style={styles.disclaimerText}>{item.disclaimer}</Text>
          </View>
        )}
        
        <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
          {item.timestamp.toLocaleTimeString(lang === 'fr' ? 'fr-CA' : 'en-CA', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  // Render suggestions
  const renderSuggestions = () => {
    // Only show suggestions when no messages or only welcome message
    if (messages.length > 1) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>
          {lang === 'fr' ? 'Suggestions' : 'Suggestions'}
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScroll}
        >
          {SUGGESTIONS.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionTap(suggestion)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {lang === 'fr' ? suggestion.fr : suggestion.en}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Aircraft context picker
  const renderAircraftPicker = () => {
    if (!showAircraftPicker) return null;

    return (
      <View style={styles.aircraftPickerOverlay}>
        <View style={styles.aircraftPicker}>
          <View style={styles.aircraftPickerHeader}>
            <Text style={styles.aircraftPickerTitle}>
              {lang === 'fr' ? 'Sélectionner un aéronef' : 'Select aircraft'}
            </Text>
            <TouchableOpacity onPress={() => setShowAircraftPicker(false)}>
              <Ionicons name="close" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.aircraftOption, !selectedAircraft && styles.aircraftOptionSelected]}
            onPress={() => {
              setSelectedAircraft(null);
              setShowAircraftPicker(false);
            }}
          >
            <Ionicons name="globe-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.aircraftOptionText}>
              {lang === 'fr' ? 'Général (aucun contexte)' : 'General (no context)'}
            </Text>
            {!selectedAircraft && <Ionicons name="checkmark" size={20} color={COLORS.success} />}
          </TouchableOpacity>
          
          <ScrollView style={styles.aircraftList}>
            {aircraft.map((ac) => (
              <TouchableOpacity
                key={ac.id}
                style={[
                  styles.aircraftOption,
                  selectedAircraft === ac.registration && styles.aircraftOptionSelected,
                ]}
                onPress={() => {
                  setSelectedAircraft(ac.registration);
                  setShowAircraftPicker(false);
                }}
              >
                <Ionicons name="airplane" size={20} color={COLORS.primary} />
                <View style={styles.aircraftOptionContent}>
                  <Text style={styles.aircraftOptionText}>{ac.registration}</Text>
                  <Text style={styles.aircraftOptionSubtext}>
                    {ac.commonName || ac.model}
                  </Text>
                </View>
                {selectedAircraft === ac.registration && (
                  <Ionicons name="checkmark" size={20} color={COLORS.success} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.ekoIcon}>
            <Ionicons name="sparkles" size={24} color={COLORS.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>EKO Assistant</Text>
            <TouchableOpacity 
              style={styles.contextButton}
              onPress={() => setShowAircraftPicker(true)}
            >
              <Ionicons name="airplane-outline" size={12} color={COLORS.white} />
              <Text style={styles.contextText}>
                {selectedAircraft || (lang === 'fr' ? 'Général' : 'General')}
              </Text>
              <Ionicons name="chevron-down" size={12} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity style={styles.headerAction} onPress={clearConversation}>
          <Ionicons name="trash-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          ListFooterComponent={renderSuggestions}
        />

        {/* Typing indicator */}
        {isLoading && (
          <View style={styles.typingIndicator}>
            <View style={styles.ekoAvatarSmall}>
              <Ionicons name="sparkles" size={12} color={COLORS.primary} />
            </View>
            <Text style={styles.typingText}>
              {lang === 'fr' ? 'EKO réfléchit...' : 'EKO is thinking...'}
            </Text>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={lang === 'fr' ? 'Demandez à EKO...' : 'Ask EKO...'}
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>

        {/* TC-Safe Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.disclaimer} />
          <Text style={styles.footerText}>
            {lang === 'fr'
              ? "EKO est un outil éducatif. Consultez un TEA/AMO pour toute décision."
              : "EKO is an educational tool. Consult a TEA/AMO for decisions."}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Aircraft Picker Modal */}
      {renderAircraftPicker()}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ekoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  contextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  contextText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Chat container
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // Message bubbles
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
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
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  errorBubble: {
    backgroundColor: COLORS.errorBubble,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  ekoAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.suggestionBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ekoAvatarSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.suggestionBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textDark,
  },
  userMessageText: {
    color: COLORS.white,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.disclaimer,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Typing indicator
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  // Suggestions
  suggestionsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  suggestionsScroll: {
    paddingRight: 16,
  },
  suggestionChip: {
    backgroundColor: COLORS.suggestionBg,
    borderWidth: 1,
    borderColor: COLORS.suggestionBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    maxWidth: 200,
  },
  suggestionText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    color: COLORS.textDark,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.disclaimerBg,
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.disclaimer,
    textAlign: 'center',
  },
  // Aircraft picker
  aircraftPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  aircraftPicker: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  aircraftPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aircraftPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  aircraftList: {
    maxHeight: 300,
  },
  aircraftOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  aircraftOptionSelected: {
    backgroundColor: COLORS.suggestionBg,
  },
  aircraftOptionContent: {
    flex: 1,
  },
  aircraftOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  aircraftOptionSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
