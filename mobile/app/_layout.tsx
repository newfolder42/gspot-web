import '../global.css';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UpdateNotice } from '@/components/ui/UpdateNotice';

// Keep the native splash up until the stored session has been read, so the app
// never flashes the login screen at an already-signed-in user.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

/**
 * Lives inside AuthProvider so it can watch the session restore, which is the
 * last thing the splash is waiting on.
 */
function SplashGate() {
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);

  return (
    <>
      <Slot />
      {/* Temporary: runs on every start, login screen included. */}
      {isLoading ? null : <UpdateNotice />}
    </>
  );
}

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <SplashGate />
        </QueryClientProvider>
      </AuthProvider>
    </KeyboardProvider>
  );
}
