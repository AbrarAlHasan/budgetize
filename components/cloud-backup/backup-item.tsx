import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { CloudBackup } from '@/services/supabase/storage';

interface BackupItemProps {
  backup: CloudBackup;
  onRestore: (backup: CloudBackup) => Promise<void>;
  onDelete: (backup: CloudBackup) => Promise<void>;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

export function BackupItem({ backup, onRestore, onDelete, isRestoring, isDeleting }: BackupItemProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formattedDate = format(new Date(backup.created_at), 'MMM dd, yyyy HH:mm');

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-200 dark:border-gray-700">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text className="text-gray-900 dark:text-gray-100 font-semibold text-base mb-1">
            {backup.name.replace('backup-', '').replace('.zip', '').replace(/-/g, ' ')}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-sm">
            {formattedDate}
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {formatSize(backup.size)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => onRestore(backup)}
          disabled={isRestoring || isDeleting}
          className="flex-1 flex-row items-center justify-center bg-green-600 dark:bg-green-500 px-4 py-2 rounded-lg"
          style={{ opacity: isRestoring || isDeleting ? 0.6 : 1 }}
        >
          {isRestoring ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="download" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text className="text-white font-medium text-sm">Restore</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDelete(backup)}
          disabled={isRestoring || isDeleting}
          className="flex-row items-center justify-center bg-red-600 dark:bg-red-500 px-4 py-2 rounded-lg"
          style={{ opacity: isRestoring || isDeleting ? 0.6 : 1, minWidth: 80 }}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="trash" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

