import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Colors, useTheme } from '@/constants/colors';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <ActivityIndicator size="large" color={Colors.brand} />
      </View>
    );
  }

  if (user) return <Redirect href="/(app)/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.headerBg,
        },
        headerTintColor: theme.headerTint,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: theme.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ title: "G'Spot", headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'შემოგვიერთდი' }} />
      <Stack.Screen name="verify-otp" options={{ title: 'მეილის დადასტურება' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'პაროლის აღდგენა' }} />
      <Stack.Screen name="reset-password" options={{ title: 'ახალი პაროლი' }} />
    </Stack>
  );
}
