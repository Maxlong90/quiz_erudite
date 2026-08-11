import { Stack } from 'expo-router';

import { LogoQuizProvider } from '@/hooks/logo-quiz/use-logo-quiz';
import { LogoQuizContentProvider } from '@/hooks/logo-quiz/use-logo-quiz-content';
import { BG_BASE } from '@/components/logo-quiz/app-background';

/**
 * Logo Quiz feature layout. Wraps the whole flow in the economy provider so
 * coins / premium / lives are shared across Welcome → Shop → Quiz → Result, and
 * in the content provider so backend categories / questions / explanations are
 * fetched once and shared (and cached offline). Declares the stack (headers
 * hidden, light background).
 */
export default function LogoQuizLayout() {
  return (
    <LogoQuizProvider>
      <LogoQuizContentProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: BG_BASE },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="level" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="shop" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="wheel" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="quiz" options={{ gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
      </LogoQuizContentProvider>
    </LogoQuizProvider>
  );
}
