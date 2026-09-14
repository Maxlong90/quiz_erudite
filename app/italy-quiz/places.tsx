import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { AppBackground, BG_BASE, useItalyBgReady } from '@/components/italy-quiz/app-background';
import { CircleStrip } from '@/components/italy-quiz/circle-strip';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { HelpModal } from '@/components/italy-quiz/help-modal';
import { getPlace, useItalyPlaces } from '@/constants/italy-quiz/places';
import { getTourQuestions } from '@/constants/italy-quiz/tour-content';
import { pickPlural, useItalyLabels } from '@/constants/italy-quiz/labels';
import { ITALY_PATHS, ITALY_VIEWBOX, PLACE_PINS } from '@/constants/italy-quiz/map-geometry';
import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';
import { useFirstRunHelp } from '@/hooks/italy-quiz/use-first-run-help';
import { usePlaceProgress } from '@/hooks/italy-quiz/use-place-progress';
import { useLocale } from '@/hooks/use-locale';
import {
  circleSlots,
  circlesLeftToUnlock,
  isPlaceUnlocked,
  nextCircleIndex,
  placeStars,
  unlockedBy,
  type CircleSlot,
} from '@/lib/italy-quiz/circles';

/**
 * Italy Quiz place picker (Play → here) — the app's ONLY taxonomy screen, drawn
 * as the map of Italy.
 *
 * It replaces the old category → subcategory pair, and then the flat list that
 * replaced those. A list of six rows answered "which topic", which is the
 * question this app deliberately stopped asking; a map answers "where", puts each
 * place where it actually is, and turns progress into something you see at a
 * glance — the country fills in with stars as it is played. That is the whole
 * argument for the map: it is the progress screen and the picker at once.
 *
 * Tapping a pin selects it and raises a card at the bottom; the card holds the
 * place's ten CIRCLES and the way into one of them. Selection is a separate step
 * from starting on purpose, because a pin is a small target and an accidental tap
 * should not throw the player into twenty questions.
 *
 * Three kinds of pin, and the difference is readable without words:
 *
 *  - **open** — solid, carrying the sum of the stars of all its circles (0..30).
 *  - **chain-locked** — solid rim plus a padlock, and still SELECTABLE: a dead
 *    pin cannot explain why it is dead, and the card one tap away has room for
 *    the sentence that does. Its caption names the number of circles still
 *    owed, so the pin stays honest even while no city has content for five.
 *  - **not on the schedule** — hollow rim, nothing inside, not tappable. No
 *    content is authored and no amount of play will open it. Nothing is in this
 *    state today — every place is on the chain — but the drawing stays, because
 *    `locked` is still the only way to say it.
 *
 * A place flagged `alwaysOpen` is off the chain and open from the first run; it
 * draws as an ordinary open pin and never shows the padlock.
 */
/**
 * Type size for the card's entry button.
 *
 * The two-line locked caption gets a smaller size than the one-line "Circle 3",
 * because `adjustsFontSizeToFit` shrinks a block to whatever its WORST line
 * needs and then stops at `minimumFontScale` (0.7) — past that it ellipsizes.
 * Measured against the real 360dp card (≈174dp of text width), the longest
 * requirement line, French «Réussissez encore 5 cercles», needed 0.64 of 20dp
 * and so lost its tail — the exact defect the two-line caption exists to fix.
 * At 17dp every locale's worst line fits inside the 0.7 floor with room spare,
 * and the button's height is unchanged because the shrink was happening anyway.
 */
const CTA_FONT = 20;
const CTA_FONT_TWO_LINE = 17;

export default function ItalyQuizPlaces() {
  const places = useItalyPlaces();
  const t = useItalyLabels();
  const { locale } = useLocale();
  const bgReady = useItalyBgReady();
  const { progress } = usePlaceProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Circle the player tapped in the strip; null means "whatever is live". */
  const [pickedCircle, setPickedCircle] = useState<number | null>(null);
  // The map owns the first-run sheet: it is the screen every player reaches
  // before a tour, and the copy now explains circles BEFORE the first one.
  const [helpOpen, setHelpOpen] = useFirstRunHelp();

  const selected = places.find((p) => p.id === selectedId) ?? null;
  const rawSelected = useMemo(() => getPlace(selectedId ?? undefined), [selectedId]);
  const selectedQuestions = useMemo(() => getTourQuestions(selectedId ?? undefined), [selectedId]);
  const selectedUnlocked = selectedId ? isPlaceUnlocked(selectedId, progress) : false;

  const slots = useMemo<CircleSlot[]>(() => {
    if (!rawSelected || !selectedId) return [];
    const drawn = circleSlots(rawSelected, selectedQuestions, progress[selectedId]);
    // A city the chain has not opened yet has nothing enterable in it, whatever
    // its content would otherwise allow.
    if (selectedUnlocked) return drawn;
    return drawn.map((s) => (s.playable ? { ...s, state: 'locked', playable: false } : s));
  }, [rawSelected, selectedId, selectedQuestions, progress, selectedUnlocked]);

  // A tapped circle wins, but only while it is still playable — otherwise the
  // strip could keep pointing at a slot that a reload turned into "soon".
  const autoIndex = useMemo(() => nextCircleIndex(slots), [slots]);
  const activeIndex =
    pickedCircle != null && slots[pickedCircle - 1]?.playable ? pickedCircle : autoIndex;
  const activeSlot = activeIndex != null ? slots[activeIndex - 1] : null;

  const selectPlace = (id: string) => {
    setSelectedId(id);
    setPickedCircle(null);
  };

  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  // The button IS the status line — which is what pays for having no extra hint
  // row under the strip. It is always present, so the card's height never moves.
  const gateCity = selectedId ? unlockedBy(selectedId) : null;
  const circlesLeft = selectedId ? circlesLeftToUnlock(selectedId, progress) : 0;
  const cta = !selected
    ? null
    : !selectedUnlocked
      ? {
          // Two lines: the requirement, then WHERE to go and do it. One line ran
          // under the padlock, and the count is read off the same function the
          // gate uses, so the button cannot promise a number nothing enforces.
          label:
            pickPlural(locale, circlesLeft, t.cityLockedNeed).replace('{n}', String(circlesLeft)) +
            '\n' +
            (places.find((p) => p.id === gateCity)?.title ?? ''),
          locked: true,
          inactive: false,
          start: false,
        }
      : !activeSlot
        ? { label: t.circlesSoonCta, locked: false, inactive: true, start: false }
        : {
            label: (activeSlot.state === 'done' ? t.circleReplayLabel : t.circleLabel).replace(
              '{n}',
              String(activeSlot.index),
            ),
            locked: false,
            inactive: false,
            start: true,
          };

  return (
    <View style={styles.fill}>
      <AppBackground blurRadius={9} />
      <StatusBar style="light" />
      <View style={styles.scrim} pointerEvents="none" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => setHelpOpen(true)}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
              testID="places-help-button"
            >
              <GlossyIconButton glyph="help" size={44} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/italy-quiz/settings')}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <GlossyIconButton glyph="settings-sharp" size={44} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.title}>{t.whereTo}</Text>

        <ScrollView
          contentContainerStyle={styles.mapScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mapBox}>
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${ITALY_VIEWBOX.width} ${ITALY_VIEWBOX.height}`}
            >
              {ITALY_PATHS.map((d, i) => (
                <Path
                  key={i}
                  d={d}
                  fill="rgba(158, 196, 251, 0.22)"
                  stroke={ItalyColors.tileLight}
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                />
              ))}
            </Svg>

            {/* Pins sit on top as real views rather than SVG shapes: they need
                generous touch targets and the ordinary pressed state. */}
            {places.map((p) => {
              const pin = PLACE_PINS[p.id];
              if (!pin) return null;
              const stars = placeStars(progress[p.id]);
              // `alwaysOpen` is redundant here once isPlaceUnlocked short-circuits
              // on it, and named anyway so a side-trip pin reads as one on sight.
              const chainLocked =
                !p.locked && !p.alwaysOpen && !isPlaceUnlocked(p.id, progress);
              const isSelected = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  disabled={p.locked}
                  onPress={() => selectPlace(p.id)}
                  hitSlop={10}
                  style={[
                    styles.pinWrap,
                    {
                      left: `${(pin.x / ITALY_VIEWBOX.width) * 100}%`,
                      top: `${(pin.y / ITALY_VIEWBOX.height) * 100}%`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pin,
                      ItalyShadow.card,
                      p.locked && styles.pinLocked,
                      chainLocked && styles.pinChainLocked,
                      isSelected && styles.pinSelected,
                    ]}
                  >
                    {chainLocked ? (
                      <Ionicons
                        name="lock-closed"
                        size={13}
                        color={isSelected ? ItalyColors.tileGlyph : 'rgba(255,255,255,0.8)'}
                      />
                    ) : stars > 0 ? (
                      <Text style={[styles.pinStars, isSelected && styles.pinStarsSelected]}>
                        {stars}
                      </Text>
                    ) : null}
                  </View>
                  {/* The label leans away from the coastline so the two northern
                      pins and the two central ones do not collide. */}
                  <Text
                    style={[
                      styles.pinLabel,
                      pin.x > ITALY_VIEWBOX.width / 2 ? styles.pinLabelRight : styles.pinLabelLeft,
                      p.locked && styles.pinLabelLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {p.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom card — what the selected pin is, its ten circles, and the way in. */}
        <View style={styles.cardSlot}>
          {selected && cta ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selected.title}
              </Text>
              <Text style={styles.cardTagline} numberOfLines={2}>
                {selected.tagline}
              </Text>
              <CircleStrip
                slots={slots}
                activeIndex={activeIndex}
                onSelect={setPickedCircle}
              />
              <GlossyButton
                label={cta.label}
                fontSize={cta.label.includes('\n') ? CTA_FONT_TWO_LINE : CTA_FONT}
                paddingVertical={14}
                locked={cta.locked}
                inactive={cta.inactive}
                onPress={() => {
                  if (!cta.start || activeIndex == null) return;
                  router.push({
                    pathname: '/italy-quiz/quiz',
                    params: { place: selected.id, circle: String(activeIndex) },
                  });
                }}
              />
            </View>
          ) : (
            <Text style={styles.prompt}>{t.pickOnMap}</Text>
          )}
        </View>
      </SafeAreaView>

      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </View>
  );
}

const PIN = 26;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 15, 56, 0.62)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  mapScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  mapBox: {
    alignSelf: 'center',
    width: '76%',
    aspectRatio: ITALY_VIEWBOX.width / ITALY_VIEWBOX.height,
  },

  // Anchored by its own centre on the pin's coordinate.
  pinWrap: {
    position: 'absolute',
    width: PIN,
    height: PIN,
    marginLeft: -PIN / 2,
    marginTop: -PIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    backgroundColor: ItalyColors.tileDark,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Not on the schedule: hollow rim, nothing inside. */
  pinLocked: {
    backgroundColor: 'rgba(12, 26, 70, 0.55)',
    borderColor: 'rgba(255,255,255,0.45)',
  },
  /** On the schedule, behind a door: SOLID rim plus a padlock. */
  pinChainLocked: {
    backgroundColor: 'rgba(12, 26, 70, 0.72)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  pinSelected: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.25 }],
  },
  // Tabular figures because the count now runs to two digits (up to 30).
  pinStars: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  /** The selected pin is painted gold, so white would vanish on it. */
  pinStarsSelected: { color: ItalyColors.tileGlyph },

  pinLabel: {
    position: 'absolute',
    top: PIN / 2 + 2,
    width: 108,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pinLabelRight: { left: PIN / 2 + 4, textAlign: 'left' },
  pinLabelLeft: { right: PIN / 2 + 4, textAlign: 'right' },
  pinLabelLocked: { color: 'rgba(255,255,255,0.55)' },

  // Fixed height so selecting a pin does not make the map jump. The map lives in
  // a centred flexGrow ScrollView, so it gives the room up without a jolt. The
  // reserve covers the TALLEST card, which is the two-line locked-city CTA.
  cardSlot: { minHeight: 256, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 18 },
  card: {
    backgroundColor: 'rgba(8, 22, 66, 0.72)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(210, 224, 255, 0.5)',
    padding: 16,
    gap: 8,
  },
  cardTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  cardTagline: { color: '#D6DEFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  prompt: {
    color: '#D6DEFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: 24,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
