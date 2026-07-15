import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { LOGO_QUIZ_CTA_GRADIENT, LogoQuizColors, LogoQuizRadii } from '@/constants/logo-quiz-theme';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  /** Optional leading SF-symbol icon (e.g. 'sparkles'). */
  iconName?: Parameters<typeof IconSymbol>[0]['name'];
  /** Optional small line under the label (used on the home CTA). */
  subtitle?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The signature neon CTA — a cyan→purple→magenta gradient pill with a
 * colored glow, shared by every Logo Quiz screen so the gradient and
 * shadow live in one place.
 */
export function GradientButton({
  label,
  onPress,
  iconName,
  subtitle,
  disabled = false,
  loading = false,
  style,
  testID,
}: GradientButtonProps) {
  const isInactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      testID={testID}
      style={({ pressed }) => [styles.wrap, pressed && !isInactive && styles.pressed, isInactive && styles.inactive, style]}
    >
      <LinearGradient
        colors={[...LOGO_QUIZ_CTA_GRADIENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={LogoQuizColors.text} />
        ) : (
          <View style={styles.content}>
            {iconName && <IconSymbol name={iconName} size={22} color={LogoQuizColors.text} />}
            <View style={styles.labels}>
              <Text style={styles.label} numberOfLines={1}>
                {label}
              </Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: LogoQuizRadii.xl,
    // Neon glow around the CTA.
    shadowColor: LogoQuizColors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 10,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  inactive: {
    opacity: 0.55,
  },
  gradient: {
    borderRadius: LogoQuizRadii.xl,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labels: {
    flexShrink: 1,
  },
  label: {
    color: LogoQuizColors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#ffffffdd',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
