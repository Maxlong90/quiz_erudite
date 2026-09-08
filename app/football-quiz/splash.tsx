import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppBackground } from '@/components/football-quiz/app-background';
import { FQLogo } from '@/components/football-quiz/ui';

/**
 * Football Quiz splash — this build's true entry point. Registered in
 * constants/app-templates.ts so the shared erudite splash (and its language
 * picker → onboarding → paywall) never renders for this app.
 */
export default function FootballQuizSplash() {
  useEffect(() => {
    const id = setTimeout(() => router.replace('/football-quiz'), 900);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={styles.fill}>
      <AppBackground variant="home" />
      <StatusBar style="light" />
      <View style={styles.center}>
        <FQLogo scale={1.25} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
