import { useState } from 'react';
import { Image, ImageSourcePropType, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/sport-quiz/app-background';
import { ModeInfoModal, type InfoMode } from '@/components/sport-quiz/mode-info-modal';
import { CoinPill, GlassIconButton, neonGlow } from '@/components/sport-quiz/ui';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';

/**
 * Sport Quiz mode select — mirrors the Flags Quiz play screen. Four game modes
 * (Classic + Sports Legends unlocked, Challenge + Sprint locked with a padlock),
 * a back/settings header, and an "Other apps" tile that opens our App Store page.
 */

// Shared publisher App Store link (same as the other variants). Swap for the
// Sport Quiz developer page once it is live.
const OTHER_APPS_URL = 'https://apps.apple.com/us/app/erudite-quiz-trivia-crac-daily/id6787385686';

function ModeButton({
  image,
  label,
  sublabel,
  locked,
  onPress,
  onInfo,
}: {
  image: ImageSourcePropType;
  label: string;
  sublabel?: string;
  locked?: boolean;
  onPress: () => void;
  /** When set, a small "?" button on the card opens that mode's info sheet. */
  onInfo?: () => void;
}) {
  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      style={({ pressed }) => [
        styles.mode,
        neonGlow(SQColors.neon, 12),
        locked && styles.modeLocked,
        !locked && pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
      ]}
    >
      <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.pill }]} />
      <Image source={image} style={styles.modeIcon} resizeMode="contain" />
      <View style={styles.modeText}>
        <Text style={styles.modeLabel}>{label}</Text>
        {sublabel ? <Text style={styles.modeSub}>{sublabel}</Text> : null}
      </View>
      {locked ? <Ionicons name="lock-closed" size={26} color={SQColors.textMuted} style={styles.lock} /> : null}
      {onInfo ? <GlassIconButton glyph="help" size={36} onPress={onInfo} /> : null}
    </Pressable>
  );
}

export default function SportQuizPlay() {
  const t = useSQLabels();
  const { coins } = useSportQuiz();
  // Which info sheet is open: the overview ("?" in the header) or a single mode
  // ("?" on that mode's card). null = closed.
  const [info, setInfo] = useState<InfoMode | null>(null);

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="navy" />
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <GlassIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
        </View>
        <View style={styles.headerRight}>
          <GlassIconButton glyph="help" size={44} onPress={() => setInfo('all')} />
          <Pressable onPress={() => router.push('/sport-quiz/shop')} hitSlop={8}>
            <CoinPill coins={coins} size="lg" />
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{t.chooseMode}</Text>
        <View style={styles.modes}>
          {/* Classic + Legends → Select Level → sequential quiz. */}
          <ModeButton
            image={require('../../assets/sport-quiz/modes/classic.png')}
            label={t.modeClassic}
            onPress={() => router.push('/sport-quiz/levels')}
            onInfo={() => setInfo('classic')}
          />
          <ModeButton
            image={require('../../assets/sport-quiz/modes/legends.png')}
            label={t.modeLegends}
            onPress={() => router.push('/sport-quiz/legends-levels')}
            onInfo={() => setInfo('legends')}
          />
          <ModeButton image={require('../../assets/sport-quiz/modes/challenge.png')} label={t.modeChallenge} sublabel={t.comingSoon} locked onPress={() => {}} />
          <ModeButton image={require('../../assets/sport-quiz/modes/sprint.png')} label={t.modeSprint} sublabel={t.comingSoon} locked onPress={() => {}} />
        </View>
      </View>

      {/* Bottom: Other apps → App Store. */}
      <View style={styles.bottom}>
        <Pressable
          hitSlop={8}
          style={({ pressed }) => [styles.otherItem, pressed && { opacity: 0.85 }]}
          onPress={() => Linking.openURL(OTHER_APPS_URL).catch(() => {})}
        >
          <GlassIconButton glyph="phone-portrait" size={64} onPress={() => Linking.openURL(OTHER_APPS_URL).catch(() => {})} />
          <Text style={styles.otherLabel}>{t.otherApps}</Text>
        </Pressable>
      </View>

      <ModeInfoModal visible={info != null} mode={info ?? 'all'} onClose={() => setInfo(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  title: {
    color: SQColors.neonPink,
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 22,
    textTransform: 'uppercase',
    textShadowColor: SQColors.neonPink,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  modes: { gap: 16 },

  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SQRadius.pill,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: SQColors.neon,
    overflow: 'hidden',
  },
  // Large 3-D mode icon that nearly touches the button's top/bottom edges.
  modeIcon: { width: 72, height: 72 },
  modeLocked: { opacity: 0.6, borderColor: SQColors.glassBorderDim },
  modeText: { flex: 1 },
  modeLabel: { color: '#EAFFF8', fontWeight: '900', fontSize: 24 },
  modeSub: { color: SQColors.textMuted, fontWeight: '700', fontSize: 13, marginTop: 2 },
  lock: {},

  bottom: { alignItems: 'center', paddingBottom: 14 },
  otherItem: { alignItems: 'center', gap: 6 },
  otherLabel: {
    color: SQColors.neonPink,
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: SQColors.neonPink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
