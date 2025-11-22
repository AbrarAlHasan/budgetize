import { CloudBackup } from '@/services/supabase/storage';
import { deleteCloudBackup, getCloudBackups, restoreFromCloudBackup } from '@/utils/cloud-backup';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BackupItem } from './backup-item';

interface BackupListProps {
  userId: string;
  refreshTrigger?: number; // Trigger refresh when this value changes
}

export function BackupList({ userId, refreshTrigger }: BackupListProps) {
  const queryClient = useQueryClient();
  const [backups, setBackups] = useState<CloudBackup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [deletingBackupId, setDeletingBackupId] = useState<string | null>(null);

  const loadBackups = async () => {
    try {
      const { backups: backupList, error } = await getCloudBackups(userId);
      if (error) {
        console.error('Error loading backups:', error);
        Alert.alert('Error', 'Failed to load backups. Please try again.');
        return;
      }
      setBackups(backupList);
    } catch (error) {
      console.error('Unexpected error loading backups:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, [userId, refreshTrigger]);

  const handleRestore = async (backup: CloudBackup) => {
    Alert.alert(
      'Restore Backup',
      'This will replace all your current data with the backup. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setRestoringBackupId(backup.id);
            try {
              const { error, success } = await restoreFromCloudBackup(userId, backup.path);
              if (error || !success) {
                Alert.alert('Error', 'Failed to restore backup. Please try again.');
                return;
              }

              // Invalidate all queries to refresh data
              await queryClient.invalidateQueries({ queryKey: ['all'] });

              Alert.alert('Success', 'Backup restored successfully!');
              loadBackups();
            } catch (error) {
              console.error('Error restoring backup:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            } finally {
              setRestoringBackupId(null);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (backup: CloudBackup) => {
    Alert.alert(
      'Delete Backup',
      'Are you sure you want to delete this backup?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingBackupId(backup.id);
            try {
              const { error } = await deleteCloudBackup(backup.path);
              if (error) {
                Alert.alert('Error', 'Failed to delete backup. Please try again.');
                return;
              }

              Alert.alert('Success', 'Backup deleted successfully!');
              loadBackups();
            } catch (error) {
              console.error('Error deleting backup:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            } finally {
              setDeletingBackupId(null);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 dark:text-gray-400 mt-4">Loading backups...</Text>
      </View>
    );
  }

  const handleRefresh = () => {
    setRefreshing(true);
    loadBackups();
  };

  if (backups.length === 0) {
    return (
      <View className="py-8 items-center">
        <Ionicons name="cloud-outline" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
          No backups found. Create your first backup to get started.
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing}
          className="mt-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center self-center"
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons name="refresh" size={20} color="#3B82F6" />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      {/* Header with Refresh Button */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
          Your Backups
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
          activeOpacity={0.7}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Ionicons name="refresh" size={20} color="#3B82F6" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {backups.map((backup) => (
          <BackupItem
            key={backup.id}
            backup={backup}
            onRestore={handleRestore}
            onDelete={handleDelete}
            isRestoring={restoringBackupId === backup.id}
            isDeleting={deletingBackupId === backup.id}
          />
        ))}
      </ScrollView>
    </View>
  );
}

