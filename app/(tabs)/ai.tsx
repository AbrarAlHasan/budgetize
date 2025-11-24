import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useOnDeviceLLM } from "@/hooks/use-llm";
import { aiService, setLLMInstance } from "@/services/ai";
import { queryExecutor } from "@/services/query-executor";
import { log, logError } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const llm = useOnDeviceLLM();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        'Hello! I\'m your AI assistant for Budgetize. I can help you analyze your transactions, accounts, and financial data. Ask me questions like:\n\n• "What\'s the sum of transactions for food category last month?"\n• "Show me expenses by category"\n• "How much did I spend on transport this year?"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize LLM instance for AI service
  useEffect(() => {
    if (llm.isReady && llm.generate) {
      setLLMInstance({ generate: llm.generate });
    }
  }, [llm.isReady, llm.generate]);

  // Show loading state if LLM is not ready
  useEffect(() => {
    if (!llm.isReady && !isLoading) {
      // Optionally show a message that the AI is initializing
      log('On-device AI is initializing...');
    }
  }, [llm.isReady, isLoading]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleCopy = async (messageId: string, content: string) => {
    try {
      await Clipboard.setStringAsync(content);
      setCopiedMessageId(messageId);
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      logError("Failed to copy:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Check if the question is about the application
      const isAppRelated = await aiService.isQuestionAboutApp(input.trim());

      if (!isAppRelated) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "I can only answer questions about your Money Manager application, such as transactions, accounts, categories, tags, and financial data. Please ask me something related to your financial data.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }

      const question = input.trim();

      // Let AI generate the SQL query based on the question
      // AI will handle all logic including category lookups, date ranges, etc.
      const sqlQuery = await aiService.generateSQLQuery(question);

      if (!sqlQuery) {
        throw new Error("Failed to generate SQL query");
      }

      log("🔍 [AI Screen] Final SQL Query to execute:", sqlQuery);

      // Execute the query
      const result = await queryExecutor.executeQuery(sqlQuery);
      
      log("🔍 [AI Screen] Query result:", {
        success: result.success,
        rowCount: result.data?.length || 0,
        error: result.error,
      });

      // Format the result into a readable response
      const response = await aiService.formatQueryResult(question, result);

      const assistantMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      logError("AI Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try rephrasing your question.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.tabIconDefault + "20",
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: colors.text,
              }}
            >
              AI Assistant
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.tabIconDefault,
                marginTop: 4,
              }}
            >
              Ask questions about your financial data
            </Text>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={{
                  marginBottom: 16,
                  alignItems:
                    message.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <View
                  style={{
                    maxWidth: "80%",
                    position: "relative",
                  }}
                >
                  <View
                    style={{
                      padding: 12,
                      paddingRight: message.role === "user" ? 40 : 12,
                      paddingLeft: message.role === "assistant" ? 40 : 12,
                      borderRadius: 16,
                      backgroundColor:
                        message.role === "user"
                          ? colors.tint
                          : colors.tabIconDefault + "20",
                    }}
                  >
                    <Text
                      style={{
                        color: message.role === "user" ? "#fff" : colors.text,
                        fontSize: 15,
                        lineHeight: 20,
                      }}
                    >
                      {message.content}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleCopy(message.id, message.content)}
                    style={{
                      position: "absolute",
                      top: 8,
                      ...(message.role === "user" ? { right: 8 } : { left: 8 }),
                      padding: 6,
                      borderRadius: 12,
                      backgroundColor:
                        message.role === "user"
                          ? "rgba(255, 255, 255, 0.2)"
                          : colors.tabIconDefault + "30",
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {copiedMessageId === message.id ? (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={message.role === "user" ? "#fff" : colors.tint}
                      />
                    ) : (
                      <Ionicons
                        name="copy-outline"
                        size={16}
                        color={
                          message.role === "user"
                            ? "#fff"
                            : colors.tabIconDefault
                        }
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {isLoading && (
              <View
                style={{
                  marginBottom: 16,
                  alignItems: "flex-start",
                }}
              >
                <View
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: colors.tabIconDefault + "20",
                  }}
                >
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: colors.tabIconDefault + "20",
              backgroundColor: colors.background,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 24,
                  backgroundColor: colors.tabIconDefault + "10",
                  color: colors.text,
                  fontSize: 15,
                  maxHeight: 100,
                }}
                placeholder="Ask a question about your data..."
                placeholderTextColor={colors.tabIconDefault}
                value={input}
                onChangeText={setInput}
                multiline
                onSubmitEditing={handleSend}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!input.trim() || isLoading}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor:
                    input.trim() && !isLoading
                      ? colors.tint
                      : colors.tabIconDefault + "30",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
