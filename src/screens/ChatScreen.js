import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { supabase } from '../lib/supabase';
import { generateChatResponse } from '../lib/gemini';
import { LanguageContext } from '../../App';

export default function ChatScreen({ navigation, user }) {
  const { t } = useContext(LanguageContext);
  const flatListRef = useRef(null);
  
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      content: `Bonjour ! 🌸 Je suis Hélène, votre copilote ménopause. Je suis là pour vous accompagner, vous écouter et répondre à vos questions sur cette période de votre vie.

Comment puis-je vous aider aujourd'hui ?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState(null);

  // Charger le contexte utilisateur au montage
  useEffect(() => {
    if (user?.id) {
      loadUserContext();
    }
  }, [user]);

  const loadUserContext = async () => {
    try {
      if (!user?.id) {
        console.warn('Pas d\'utilisateur connecté');
        return;
      }

      // Charger le profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('age, menopause_stage, goals')
        .eq('id', user.id)
        .single();

      // Charger les symptômes récents (dernier log)
      const { data: recentLog } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(1)
        .single();

      const recentSymptoms = recentLog ? {
        hot_flashes: recentLog.hot_flashes,
        night_sweats: recentLog.night_sweats,
        headaches: recentLog.headaches,
        joint_pain: recentLog.joint_pain,
        fatigue: recentLog.fatigue,
        anxiety: recentLog.anxiety,
        irritability: recentLog.irritability,
        brain_fog: recentLog.brain_fog,
        low_mood: recentLog.low_mood,
      } : {};

      setUserContext({
        age: profile?.age,
        menopauseStage: profile?.menopause_stage,
        goals: profile?.goals || [],
        recentSymptoms,
      });
    } catch (error) {
      console.error('Erreur chargement contexte:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');

    // Ajouter le message utilisateur
    const newUserMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newUserMessage]);

    // Scroll vers le bas
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Générer la réponse
    setIsLoading(true);
    try {
      // Préparer l'historique (derniers 6 messages pour le contexte)
      const conversationHistory = messages.slice(-6).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      const response = await generateChatResponse(
        userMessage,
        userContext,
        conversationHistory
      );

      // Ajouter la réponse de l'assistant
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Scroll vers le bas
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Erreur chat:', error);
      Alert.alert(
        'Erreur',
        'Je rencontre un problème technique. Peux-tu réessayer dans un instant ? 🙏'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        {!isUser && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="flower" size={20} color={COLORS.primary} />
            </View>
          </View>
        )}
        
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
            {new Date(item.timestamp).toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>

        {isUser && <View style={styles.spacer} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Ionicons name="flower" size={24} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Hélène</Text>
            <Text style={styles.headerSubtitle}>Votre copilote ménopause</Text>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Hélène réfléchit...</Text>
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Votre message..."
            placeholderTextColor={COLORS.gray[400]}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  placeholder: {
    width: 40,
  },
  messagesList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    width: 40,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.gray[100],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.white,
  },
  assistantText: {
    color: COLORS.secondary,
  },
  timestamp: {
    fontSize: 11,
    marginTop: SPACING.xs / 2,
  },
  userTimestamp: {
    color: COLORS.white + 'CC',
    textAlign: 'right',
  },
  assistantTimestamp: {
    color: COLORS.gray[400],
  },
  loadingContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 18,
    alignSelf: 'flex-start',
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray[600],
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    borderRadius: 20,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    color: COLORS.secondary,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
