import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppBackground, BG_BASE, useItalyBgReady } from '@/components/italy-quiz/app-background';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { useItalyPlaces } from '@/constants/italy-quiz/places';
import { useItalyLabels } from '@/constants/italy-quiz/labels';
import { ITALY_PATHS, ITALY_VIEWBOX, PLACE_PINS } from '@/constants/italy-quiz/map-geometry';
import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';
import { MAX_STARS, usePlaceProgress } from '@/hooks/italy-quiz/use-place-progress';

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
 * Tapping a pin selects it and raises a card at the bottom; the card is what
 * starts the tour. Selection is a separate step from starting on purpose, because
 * a pin is a small target and an accidental tap should not throw the player into
 * twenty questions.
 *
 * Places with no questions yet are drawn hollow and cannot be selected, so the
 * shape of the finished app is visible from the first build.
 */
export default function ItalyQuizPlaces() {
  const places = useItalyPlaces();
  const t = useItalyLabels();
  const bgReady = useItalyBgReady();
  const { progress } = usePlaceProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = places.find((p) => p.id === selectedId) ?? null;

  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

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
          <Pressable
            onPress={() => router.push('/italy-quiz/settings')}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="settings-sharp" size={44} />
          </Pressable>
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
              const stars = progress[p.id]?.stars ?? 0;
              const isSelected = p.id === selectedId;
              return (
                <Pressable
                  key={p.id}
                  disabled={p.locked}
                  onPress={() => setSelectedId(p.id)}
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
                      isSelected && styles.pinSelected,
                    ]}
                  >
                    {stars > 0 ? <Text style={styles.pinStars}>{stars}</Text> : null}
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

        {/* Bottom card — what the selected pin is, and the way in. */}
        <View style={styles.cardSlot}>
          {selected ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {selected.title}
              </Text>
              <Text style={styles.cardTagline} numberOfLines={2}>
                {selected.tagline}
              </Text>
              <View style={styles.cardStars}>
                {Array.from({ length: MAX_STARS }, (_, i) => (
                  <Text
                    key={i}
                    style={[
                      styles.cardStar,
                      i >= (progress[selected.id]?.stars ?? 0) && styles.cardStarEmpty,
                    ]}
                  >
                    {i < (progress[selected.id]?.stars ?? 0) ? '★' : '☆'}
                  </Text>
                ))}
              </View>
              <GlossyButton
                label={t.startTour}
                fontSize={22}
                paddingVertical={14}
                onPress={() =>
                  router.push({ pathname: '/italy-quiz/quiz', params: { place: selected.id } })
                }
              />
            </View>
          ) : (
            <Text style={styles.prompt}>{t.pickOnMap}</Text>
          )}
        </View>
      </SafeAreaView>
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
  pinLocked: {
    backgroundColor: 'rgba(12, 26, 70, 0.55)',
    borderColor: 'rgba(255,255,255,0.45)',
  },
  pinSelected: {
    backgroundColor: '#FFD54A',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.25 }],
  },
  pinStars: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },

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

  // Fixed height so selecting a pin does not make the map jump.
  cardSlot: { minHeight: 190, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 18 },
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
  cardStars: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 2 },
  cardStar: { fontSize: 20, color: '#FFD54A' },
  cardStarEmpty: { color: 'rgba(255,255,255,0.35)' },

  prompt: {
    color: '#D6DEFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: 24,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
