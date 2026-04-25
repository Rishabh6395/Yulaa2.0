import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { QueryProvider } from '../src/context/QueryProvider';

function Guard() {
  const { isLoggedIn, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!isLoggedIn && !inAuth) router.replace('/(auth)/login');
    if (isLoggedIn  && inAuth)  router.replace('/(app)');
  }, [isLoggedIn, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryProvider>
      <AuthProvider>
        <Guard />
      </AuthProvider>
    </QueryProvider>
  );
}
