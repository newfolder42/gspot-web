import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color="#FF6314" />
      </View>
    );
  }

  if (user) return <Redirect href="/(app)" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#18181B',
        },
        headerTintColor: '#EDEDED',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#FAFAFA' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ title: "G'Spot", headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      <Stack.Screen name="verify-otp" options={{ title: 'Verify Email' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Reset Password' }} />
    </Stack>
  );
}
