import '../global.css';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import * as SystemUI from 'expo-system-ui';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UpdateNotice } from '@/components/ui/UpdateNotice';
import { useTheme } from '@/constants/colors';

// Keep the native splash up until the stored session has been read, so the app
// never flashes the login screen at an already-signed-in user.
SplashScreen.preventAutoHideAsync().catch(() => {});

// React Query's refetch-on-focus listens to the browser's visibilitychange, which
// never fires in React Native; feed it AppState so coming back to the app refetches
// whatever is on screen and stale (the post page's comments and rewards included).
focusManager.setEventListener((handleFocus) => {
  if (Platform.OS === 'web') return;
  const sub = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
  return () => sub.remove();
});

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
  const theme = useTheme();

  // The native root view sits behind every screen; leaving it on its default
  // dark grey shows through during navigation transitions in light mode.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.bg).catch(() => {});
  }, [theme.bg]);

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
