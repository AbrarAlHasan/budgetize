import { ChatMessage } from '@/components/ai/chat-message';
import {
  AiGlowBorder,
  AiGradientButton,
  AiSparklesIcon,
  AiThinkingIndicator,
} from '@/components/ai/ai-glow';
import { ModelDownloadBanner } from '@/components/ai/model-download-banner';
import {
  DEFAULT_SUGGESTED_PROMPTS,
  SuggestedPrompts,
} from '@/components/ai/suggested-prompts';
import { useAiAssistant } from '@/hooks/use-ai-assistant';
import { useAiModel } from '@/hooks/use-ai-model';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AiScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const headerIconBg = colorScheme === 'dark' ? '#000000' : '#F9FAFB';
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');
  const aiModel = useAiModel();
  const { isReady, isChecking } = aiModel;
  const { messages, isLoading, askQuestion, clearMessages } = useAiAssistant({
    isModelReady: isReady,
  });

  const chatEnabled = isReady && !isChecking;

  const handleSubmit = async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || isLoading || !chatEnabled) return;

    setInput('');
    await askQuestion(text);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black" edges={['top']}>
      <View className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black">
        <View className="flex-row items-center px-4 py-3">
          <View className="flex-row items-center gap-3 flex-1 min-w-0">
            <AiSparklesIcon
              size={36}
              iconSize={18}
              innerBackgroundColor={headerIconBg}
            />
            <View className="flex-1 min-w-0">
              <Text className="text-xl font-semibold text-gray-900 dark:text-white">
                Ask Budgetize
              </Text>
              <Text className="text-xs text-violet-600/90 dark:text-violet-300/90 mt-0.5">
                On-device · Private · Encrypted
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={clearMessages}
            className="ml-3 h-9 w-9 rounded-full items-center justify-center bg-gray-100 dark:bg-gray-900"
            accessibilityLabel="Clear conversation"
            disabled={!chatEnabled}
            style={{ opacity: chatEnabled ? 1 : 0.45 }}
          >
            <Ionicons name="refresh-outline" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <ModelDownloadBanner model={aiModel} />

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              success={message.success}
            />
          ))}

          {isLoading && <AiThinkingIndicator />}
        </ScrollView>

        <View
          className="px-4 pt-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <SuggestedPrompts
            prompts={DEFAULT_SUGGESTED_PROMPTS}
            onSelect={handleSubmit}
            disabled={isLoading || !chatEnabled}
          />

          <View className="flex-row items-end gap-2">
            {chatEnabled ? (
              <AiGlowBorder
                borderRadius={16}
                borderWidth={1.5}
                animated={false}
                style={{ flex: 1, alignSelf: 'stretch' }}
              >
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Message Budgetize AI..."
                  placeholderTextColor="#9CA3AF"
                  maxLength={500}
                  editable={!isLoading}
                  className="min-h-[44px] px-4 py-3 text-[15px] text-gray-900 dark:text-white bg-white dark:bg-gray-950"
                  onSubmitEditing={() => handleSubmit()}
                  returnKeyType="send"
                  submitBehavior="submit"
                  blurOnSubmit={false}
                />
              </AiGlowBorder>
            ) : (
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Download AI model to enable chat..."
                placeholderTextColor="#9CA3AF"
                maxLength={500}
                editable={false}
                className="flex-1 min-h-[44px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-[15px] text-gray-900 dark:text-white opacity-60"
              />
            )}
            <AiGradientButton
              onPress={() => handleSubmit()}
              disabled={!input.trim() || isLoading || !chatEnabled}
              accessibilityLabel="Send question"
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color="#FFFFFF"
              />
            </AiGradientButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
