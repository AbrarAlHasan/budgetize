import React from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ExtractFromImageBarProps {
  /** Called when user taps "Extract from Image" */
  onPickImage: () => void;
  /** Called when user taps "Paste" */
  onPasteImage: () => void;
  /** Show a spinner and disable buttons while extraction is running */
  isExtracting: boolean;
}

/**
 * Compact action bar shown at the top of the Add Transaction form.
 * Provides two ways to import a payment screenshot:
 *   1. Pick from gallery ("Extract from Image")
 *   2. Paste from clipboard ("Paste")
 */
export function ExtractFromImageBar({
  onPickImage,
  onPasteImage,
  isExtracting,
}: ExtractFromImageBarProps) {
  return (
    <View className="px-4 pt-4 pb-2">
      <View className="flex-row items-center gap-2">
        {/* Extract from Image button */}
        <TouchableOpacity
          onPress={onPickImage}
          disabled={isExtracting}
          activeOpacity={0.7}
          className="flex-1 flex-row items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl px-3 py-3 border border-blue-200 dark:border-blue-800"
        >
          {isExtracting ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons name="image-outline" size={18} color="#3B82F6" />
          )}
          <Text className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            {isExtracting ? "Extracting..." : "Extract from Image"}
          </Text>
        </TouchableOpacity>

        {/* Paste button */}
        <TouchableOpacity
          onPress={onPasteImage}
          disabled={isExtracting}
          activeOpacity={0.7}
          className="flex-row items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700"
        >
          <Ionicons
            name="clipboard-outline"
            size={18}
            color={isExtracting ? "#9CA3AF" : "#6B7280"}
          />
          <Text
            className={`text-sm font-semibold ${
              isExtracting
                ? "text-gray-400 dark:text-gray-600"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            Paste
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
