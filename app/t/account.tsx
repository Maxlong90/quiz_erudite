/**
 * The configurable template's account screen — a deliberate COPY of
 * app/account.tsx, for the reason app/t/quiz.tsx's docblock sets out: a screen
 * owns a route, so each app gets its own; the leaf components it renders
 * (ScreenBackground, BottomBar) are shared, not duplicated.
 *
 * The diff against app/account.tsx is the palette funnel plus TWO different
 * treatments of the eight colour literals the shipped screen carries, and the
 * split between them is the interesting part of this port:
 *
 *  1. THE PREMIUM BADGE's wash and border were '#ffd23a22' and '#ffd23a66' —
 *     gold at 13.3% and 40%. Both are now withAlpha(c.gold, …), which is
 *     BYTE-EXACT in both appearances: `gold` is #ffd23a in dark and light alike
 *     (constants/theme.ts), and withAlpha rounds rather than truncates, so 0.133
 *     lands on 22 and 0.4 on 66 exactly. Note this does not repaint TODAY —
 *     `gold` is not in REMOTE_TOKEN_KEYS, so no operator can move it yet. Using
 *     the token anyway costs nothing, removes two literals without needing a
 *     seam, and the badge starts tracking the preset for free on the day the
 *     wire widens. The tints stay inline rather than earning a name in
 *     hooks/t/use-template-theme.ts: that hook's rule is that a derived role
 *     needs TWO OR MORE screens, and a premiumBadgeBg would have exactly one.
 *     (app/t/paywall.tsx already tints gold at four other ratios; naming each
 *     one is the dumping ground that rule exists to prevent.)
 *  2. THE OAUTH BUTTONS' six hexes moved to constants/t/oauth-brand.ts and are
 *     read from there DIRECTLY rather than through `c`. They are not ours to
 *     choose — Apple's HIG allows black or white for Sign in with Apple, Google
 *     fixes the `G` at #4285F4 on white — so an operator preset moving them
 *     would ship a guideline violation and risk store review. They are the one
 *     kind of colour here that must NOT be operator data, and routing them
 *     through the funnel would be a lie about where they come from. That file's
 *     docblock carries the full argument.
 *
 * COPIED BUG, not port damage: the Apple <Text style={styles.appleIcon}> below
 * is EMPTY in the shipped screen — the glyph was lost when app/account.tsx was
 * generated and it has shipped that way since. It is copied verbatim because
 * deleting the empty node would also drop one `gap: 10` from styles.social and
 * shift the Apple label a few pixels against the original, which is a silent
 * divergence in a port whose whole job is fidelity. The consequence for testing
 * is that `apple.mark` has no addressable text node, so
 * __tests__/app/t-account.test.tsx pins it on the constant rather than a render.
 *
 * KNOWN BOUNDARY, not an oversight: the <BottomBar current="account" /> below is
 * still the SHARED components/bottom-bar.tsx, whose five slots point at the
 * ERUDITE /account, /paywall, /shop, / and /settings. The escape check in
 * __tests__/app/t-routes.test.ts only scans app/t/**, so it cannot see them.
 * components/t/bottom-bar.tsx closes this, in the subtask that re-points all
 * five template screens at once — re-pointing one screen's bar now would leave
 * the bar half-ported across the subtree.
 *
 * This screen has NO route literals of its own: it never imports `router`. The
 * only way out of it is the bar above.
 *
 * makeStyles keeps its EruditePalette signature: a TemplateTheme already
 * satisfies it structurally, and this screen uses no derived tier role, so
 * widening the type would falsely signal that it needs the superset.
 */
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { ScreenBackground } from '@/components/screen-background';
import { usePremium } from '@/hooks/use-premium';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';
import { OAUTH_BRAND } from '@/constants/t/oauth-brand';
import { withAlpha } from '@/lib/theme/color';

type Mode = 'signup' | 'login';

export default function AccountScreen() {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // No auth backend yet — every submit path lands on the same friendly
  // "coming soon" notice. Swap these for real calls once auth is wired.
  function notImplemented() {
    Alert.alert(t('account.soon.title'), t('account.soon.body'));
  }

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('account.title')}</Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumEmoji}>👑</Text>
                <Text style={styles.premiumText}>{t('account.premiumBadge')}</Text>
              </View>
            )}

            <View style={styles.segmented}>
              <Pressable
                onPress={() => setMode('signup')}
                style={[styles.segment, mode === 'signup' && styles.segmentActive]}
              >
                <Text style={[styles.segmentLabel, mode === 'signup' && styles.segmentLabelActive]}>
                  {t('account.tab.signup')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('login')}
                style={[styles.segment, mode === 'login' && styles.segmentActive]}
              >
                <Text style={[styles.segmentLabel, mode === 'login' && styles.segmentLabelActive]}>
                  {t('account.tab.login')}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>{t('account.email')}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>{t('account.password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <Pressable
              onPress={notImplemented}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primary,
                !canSubmit && styles.primaryDisabled,
                pressed && canSubmit && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.primaryText}>
                {mode === 'signup' ? t('account.signup.cta') : t('account.login.cta')}
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('account.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={notImplemented}
              style={({ pressed }) => [styles.social, styles.appleBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.appleIcon}></Text>
              <Text style={styles.appleText}>{t('account.apple')}</Text>
            </Pressable>

            <Pressable
              onPress={notImplemented}
              style={({ pressed }) => [styles.social, styles.googleBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>{t('account.google')}</Text>
            </Pressable>

            <Pressable
              onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              style={styles.switchLink}
            >
              <Text style={styles.switchText}>
                {mode === 'signup' ? t('account.signup.hint') : t('account.login.hint')}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        <BottomBar current="account" />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  title: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: withAlpha(c.gold, 0.133),
    borderColor: withAlpha(c.gold, 0.4),
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  premiumEmoji: { fontSize: 18 },
  premiumText: {
    color: c.gold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: c.accent,
    borderRadius: 999,
    padding: 4,
    alignSelf: 'center',
    marginBottom: 24,
  },
  segment: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    minWidth: 130,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: c.onAccent },
  segmentLabel: { color: c.onAccent, fontSize: 15, fontWeight: '700' },
  segmentLabelActive: { color: c.accent },
  fieldLabel: {
    color: c.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: c.surfaceSoft,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: c.text,
    fontSize: 16,
    marginBottom: 16,
  },
  primary: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderStrong,
  },
  dividerText: {
    color: c.textFaint,
    fontSize: 13,
    fontWeight: '600',
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  appleBtn: { backgroundColor: OAUTH_BRAND.apple.bg },
  appleIcon: { color: OAUTH_BRAND.apple.mark, fontSize: 18 },
  appleText: { color: OAUTH_BRAND.apple.fg, fontSize: 15, fontWeight: '700' },
  googleBtn: { backgroundColor: OAUTH_BRAND.google.bg },
  googleIcon: { color: OAUTH_BRAND.google.mark, fontSize: 18, fontWeight: '900' },
  googleText: { color: OAUTH_BRAND.google.fg, fontSize: 15, fontWeight: '700' },
  switchLink: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  switchText: {
    color: c.accentSoft,
    fontSize: 14,
    fontWeight: '600',
  },
});
