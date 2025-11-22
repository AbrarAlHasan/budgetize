import { useAuthStore } from "@/store/auth-store";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity } from "react-native";

export function LoginButton() {
  const { login, isLoading } = useAuthStore();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const { error } = await login();
      if (error) {
        console.error("Login error:", error);
        
        // Show user-friendly error message
        let errorMessage = error.message || 'Failed to login with Google. Please try again.';
        
        // Provide specific guidance for common errors
        if (error.message?.includes('OAuth Secret') || error.message?.includes('missing OAuth Secret')) {
          errorMessage = 'Google OAuth is not configured in Supabase. Please configure the Google provider in your Supabase Dashboard with both Client ID and Client Secret.';
        } else if (error.message?.includes('Unsupported Provider')) {
          errorMessage = 'Google OAuth provider is not enabled or configured in Supabase. Please check your Supabase Dashboard settings.';
        }
        
        Alert.alert('Login Failed', errorMessage, [{ text: 'OK' }]);
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        'Login Failed',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleLogin}
      disabled={isLoggingIn || isLoading}
      className="flex-row items-center justify-center bg-blue-600 dark:bg-blue-500 px-6 py-3 rounded-xl"
      style={{ opacity: isLoggingIn || isLoading ? 0.6 : 1 }}
    >
      {isLoggingIn || isLoading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <Ionicons
            name="logo-google"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text className="text-white font-semibold text-base">
            Login with Google
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
