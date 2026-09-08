import { StyleSheet, Text, View } from 'react-native';

import { GlossyButton } from '@/components/italy-quiz/glossy-button';

/**
 * The card shown between two acts of a tour.
 *
 * It exists because a tour mixes disciplines on purpose: without it, question 5
 * is about Domitian's stadium and question 6 is suddenly about the Pope, and the
 * jump reads as a random change of subject rather than as five hundred years
 * passing. The interlude names the jump, resets the player's attention halfway
 * through twenty questions, and gives a natural place to put the phone down.
 *
 * It waits for a tap rather than auto-advancing — the player decides when to move
 * on. The button says AVANTI on every interlude so it becomes the tour's own
 * recurring beat, with the destination underneath so nobody is guessing where
 * they are being taken.
 */
export function ActInterlude({
  icon,
  headline,
  body,
  cta,
  destination,
  onContinue,
}: {
  icon: string;
  headline: string;
  body: string;
  cta: string;
  destination: string;
  onContinue: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.centre}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <View style={styles.footer}>
        <GlossyButton
          label={cta}
          sublabel={destination}
          fontSize={26}
          paddingVertical={16}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 28, paddingBottom: 24 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  icon: { fontSize: 64, lineHeight: 76 },
  headline: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(4, 16, 60, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  body: {
    color: '#E7ECFF',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 25,
    textAlign: 'center',
  },
  footer: { width: '100%' },
});
