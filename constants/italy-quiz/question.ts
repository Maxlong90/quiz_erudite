/**
 * Italy Quiz question shapes and the helpers that render a scale question's
 * numbers.
 *
 * Two kinds of question exist, and the second one is the whole point:
 *
 * - `choice` — four options, one right. What every app in this tree already does.
 *   Carries an optional bundled image, so a photo question and a text question
 *   are the same kind with and without `image`.
 * - `scale` — the player drags a slider and the answer counts as correct when it
 *   lands within `tolerance` of the truth. Nobody knows the founding year of Rome
 *   to the year, but everyone can place it on a line, so a tour full of `choice`
 *   questions the player simply doesn't know stops being a wall of misses.
 *
 * A question may also carry `callback`, the id of an EARLIER question in the same
 * tour that it refers back to. It is how "then → now" is built: question 5 asks
 * what Domitian's stadium hosted, and question 16 — three acts and 1900 years
 * later — asks what that stadium turned into. The quiz screen renders a small
 * ribbon reminding the player of the earlier question. A callback pair is
 * authored across acts on purpose; the tour never reorders acts, so the first
 * half always plays before the second.
 */
import type { ImageSourcePropType } from 'react-native';

import type { LocalizedText } from './places';
import type { SupportedLocale } from '@/hooks/use-locale';

/** How a scale question's numbers are written out. */
export type ScaleDisplay = 'year-bc' | 'years' | 'people' | 'euro';

interface QuestionBase {
  id: number;
  /** Act id from the place's `acts` — decides which fifth of the tour it lands in. */
  act: string;
  question: LocalizedText;
  explanation: LocalizedText;
  /** Bundled image (require(...)). A question without one renders as plain text. */
  image?: ImageSourcePropType;
  /** Id of an earlier question in this tour that this one refers back to. */
  callback?: number;
}

export interface ChoiceQuestion extends QuestionBase {
  kind: 'choice';
  options: LocalizedText[];
  /** Index into `options`. */
  correct: number;
}

export interface ScaleQuestion extends QuestionBase {
  kind: 'scale';
  min: number;
  max: number;
  answer: number;
  /** Anything within this distance of `answer` counts as correct. */
  tolerance: number;
  display: ScaleDisplay;
}

export type ItalyQuestion = ChoiceQuestion | ScaleQuestion;

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

function group(n: number): string {
  return String(Math.round(n)).replace(THOUSANDS, ' ');
}

/** Write a scale value the way its question wants it read. */
export function formatScaleValue(
  value: number,
  display: ScaleDisplay,
  locale: SupportedLocale,
): string {
  const ru = locale === 'ru';
  switch (display) {
    case 'year-bc':
      return value < 0
        ? `${group(-value)} ${ru ? 'до н.э.' : 'BC'}`
        : `${group(value)} ${ru ? 'н.э.' : 'AD'}`;
    case 'years':
      return ru ? `${group(value)} лет` : `${group(value)} years`;
    case 'people':
      return ru ? `${group(value)} чел.` : `${group(value)} people`;
    case 'euro':
      return `${group(value)} €`;
  }
}

/** Write the DISTANCE between a guess and the truth ("промах 53 года"). */
export function formatScaleGap(
  gap: number,
  display: ScaleDisplay,
  locale: SupportedLocale,
): string {
  const ru = locale === 'ru';
  const n = group(Math.abs(gap));
  switch (display) {
    case 'year-bc':
    case 'years':
      return ru ? `${n} лет` : `${n} years`;
    case 'people':
      return ru ? `${n} чел.` : `${n} people`;
    case 'euro':
      return `${n} €`;
  }
}
