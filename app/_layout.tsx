import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="splash">
        <Stack.Screen
          name="splash"
          options={{ headerShown: false, gestureEnabled: false, animation: 'none' }}
        />
        <Stack.Screen
          name="language"
          options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="quiz"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="results"
          options={{ headerShown: false, gestureEnabled: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
