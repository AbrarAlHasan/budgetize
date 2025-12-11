import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UpdateScreenProps {
  onUpdate: () => void;
  onCancel: () => void;
  isUpdating?: boolean;
}

export function UpdateScreen({ onUpdate, onCancel, isUpdating = false }: UpdateScreenProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const handleCancel = () => {
    console.log('UpdateScreen: Cancel button pressed');
    onCancel();
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F8FAFC' }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          {/* Icon/Logo with colorful gradient background */}
          <View className="mb-6">
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="cloud-download-outline" size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-3">
            Update Available
          </Text>

          {/* Description */}
          <Text className="text-base text-gray-600 dark:text-gray-300 text-center mb-8 leading-6 px-4">
            A new version is ready with exciting features and improvements.
          </Text>

          {/* Features List with colorful icons */}
          <View className="w-full mb-8 px-2">
            <View className="flex-row items-center mb-3 bg-white dark:bg-gray-800 rounded-xl p-3">
              <View className="bg-green-100 dark:bg-green-900/30 rounded-full p-2 mr-3">
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <Text className="text-gray-700 dark:text-gray-200 text-sm flex-1 font-medium">
                Enhanced performance
              </Text>
            </View>
            <View className="flex-row items-center mb-3 bg-white dark:bg-gray-800 rounded-xl p-3">
              <View className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2 mr-3">
                <Ionicons name="sparkles" size={20} color="#8B5CF6" />
              </View>
              <Text className="text-gray-700 dark:text-gray-200 text-sm flex-1 font-medium">
                New features and improvements
              </Text>
            </View>
            <View className="flex-row items-center bg-white dark:bg-gray-800 rounded-xl p-3">
              <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 mr-3">
                <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
              </View>
              <Text className="text-gray-700 dark:text-gray-200 text-sm flex-1 font-medium">
                Bug fixes and stability updates
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="w-full gap-3 px-2">
            <TouchableOpacity
              onPress={onUpdate}
              disabled={isUpdating}
              className="rounded-2xl py-4 px-8"
              style={{
                backgroundColor: '#8B5CF6',
                shadowColor: '#8B5CF6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-center">
                {isUpdating ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text className="text-white text-lg font-bold">
                      Updating...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="download-outline" size={22} color="#FFFFFF" />
                    <Text className="text-white text-lg font-bold ml-2">
                      Update Now
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              disabled={isUpdating}
              className="bg-white dark:bg-gray-800 rounded-2xl py-4 px-8 border border-gray-200 dark:border-gray-700"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 dark:text-gray-200 text-lg font-semibold text-center">
                Later
              </Text>
            </TouchableOpacity>
          </View>

          {/* Version Info (for dev mode) */}
          {__DEV__ && (
            <View className="mt-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-4 py-2 border border-purple-200 dark:border-purple-800">
              <Text className="text-purple-600 dark:text-purple-400 text-xs text-center font-medium">
                Development Mode - Update screen visible for testing
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

