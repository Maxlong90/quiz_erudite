/**
 * Italy Quiz question shape.
 *
 * There is one kind — four options, one right — with two optional flags that
 * change how it plays:
 *
 * - `image` — a bundled picture above the question. A photo question and a text
 *   question are the same thing with and without it.
 * - `estimate` — marks a question nobody can answer from memory, whose options
 *   are RANGES rather than facts ("800–600 BC", "about 120 years"). It exists so
 *   a tour is not a pure pass/fail on recall: the exact founding year of Rome is
 *   knowledge, but "older than Athens, younger than Egypt" is reasoning, and
 *   everyone can do the second. The explanation still gives the exact number.
 *
 *   It changes only the INPUT, never the scoring: the four options are answered
 *   on a four-notch slider instead of a 2×2 grid, and confirming reports the same
 *   option index down the same path. Ranges are inherently ordered, so
 *   `options` MUST be authored smallest-to-largest — the slider draws them along
 *   a line and reversing one would read as a mistake.
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

export interface ItalyQuestion {
  id: number;
  /** Act id from the place's `acts` — decides which fifth of the tour it lands in. */
  act: string;
  question: LocalizedText;
  options: LocalizedText[];
  /** Index into `options`. */
  correct: number;
  explanation: LocalizedText;
  /** Bundled image (require(...)). A question without one renders as plain text. */
  image?: ImageSourcePropType;
  /** Options are ordered ranges — answered on a notched slider. */
  estimate?: boolean;
  /**
   * What the slider's axis runs along, which picks the pair of hints under it
   * ("earlier → later" for a date, "less → more" for a quantity). Only read when
   * `estimate` is set.
   */
  axis?: 'time' | 'amount';
  /** Id of an earlier question in this tour that this one refers back to. */
  callback?: number;
}
