/**
 * Italy Quiz question shape.
 *
 * There is one kind — four options, one right — with one optional flag that
 * changes how it plays:
 *
 * - `image` — a bundled picture above the question. A photo question and a text
 *   question are the same thing with and without it.
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
}
