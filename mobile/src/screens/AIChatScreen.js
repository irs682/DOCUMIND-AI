import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Send, Bot, User as UserIcon, Sparkles, BookOpen, FileText } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../../../packages/api-client/index.js';

const QUICK_SUGGESTIONS = [
  'Summarize key literature findings',
  'What are the primary research gaps?',
  'Explain the proposed methodology',
  'Compare our results to baselines',
];

export const AIChatScreen = () => {
  const { tokens } = useTheme();
  const { user } = useAuth();
  const currentColors = tokens.colors.current;

  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        'Hello! I am your DOCUMIND-AI Research Assistant. Ask me anything about your uploaded papers, research questions, or active methodology.',
      timestamp: new Date().toISOString(),
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef(null);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || sending) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await apiClient.chat.sendMessage({
        message: query,
        conversationHistory: messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const replyContent = res.reply || res.answer || res.message || 'Analysis complete.';
      const sources = res.sources || [];

      const assistantMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toISOString(),
        sources,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Error connecting to AI service: ${err.message || 'Please check connection'}.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentColors.canvas }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: currentColors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.botBadge, { backgroundColor: '#6366f118' }]}>
              <Bot size={18} color="#6366f1" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: currentColors.textPrimary }]}>Ask DOCUMIND</Text>
              <Text style={[styles.headerSub, { color: currentColors.textSecondary }]}>
                Grounded in Qdrant Vector Evidence
              </Text>
            </View>
          </View>
        </View>

        {/* Message Thread */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <View
                key={m.id}
                style={[
                  styles.messageBubbleWrap,
                  isUser ? styles.userWrap : styles.assistantWrap,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isUser
                      ? [styles.userBubble, { backgroundColor: tokens.colors.primary[600] }]
                      : [styles.assistantBubble, { backgroundColor: currentColors.surface, borderColor: currentColors.border }],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isUser ? '#ffffff' : currentColors.textPrimary },
                    ]}
                  >
                    {m.content}
                  </Text>

                  {/* Grounded Citation Sources */}
                  {!isUser && m.sources && m.sources.length > 0 && (
                    <View style={[styles.sourcesBox, { borderTopColor: currentColors.border }]}>
                      <Text style={[styles.sourcesHeader, { color: tokens.colors.primary[500] }]}>
                        CITED EVIDENCE:
                      </Text>
                      {m.sources.slice(0, 2).map((s, idx) => (
                        <View key={idx} style={styles.sourceItem}>
                          <FileText size={11} color={currentColors.textSecondary} />
                          <Text
                            style={[styles.sourceText, { color: currentColors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {s.documentTitle || s.snippet || 'Referenced Document'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {sending && (
            <View style={styles.assistantWrap}>
              <View style={[styles.typingBubble, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={[styles.typingText, { color: currentColors.textSecondary }]}>
                  Synthesizing literature evidence...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={[styles.suggestionsRow, { borderTopColor: currentColors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {QUICK_SUGGESTIONS.map((s, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.chip, { backgroundColor: currentColors.surface, borderColor: currentColors.border }]}
                onPress={() => handleSend(s)}
              >
                <Sparkles size={11} color="#6366f1" />
                <Text style={[styles.chipText, { color: currentColors.textSecondary }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: currentColors.surface, borderTopColor: currentColors.border }]}>
          <TextInput
            style={[styles.chatInput, { color: currentColors.textPrimary, borderColor: currentColors.border }]}
            placeholder="Ask about papers, gaps, methods..."
            placeholderTextColor={currentColors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: tokens.colors.primary[600], opacity: !input.trim() || sending ? 0.5 : 1 },
            ]}
            disabled={!input.trim() || sending}
            onPress={() => handleSend()}
          >
            <Send size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageBubbleWrap: {
    marginBottom: 14,
    maxWidth: '85%',
  },
  userWrap: {
    alignSelf: 'flex-end',
  },
  assistantWrap: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    padding: 14,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  sourcesBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  sourcesHeader: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 2,
  },
  sourceText: {
    fontSize: 11,
    flex: 1,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  suggestionsRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 13,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AIChatScreen;
