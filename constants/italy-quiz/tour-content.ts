/**
 * Where a tour's questions come from.
 *
 * Right now: hand-authored files under `constants/italy-quiz/questions/`. The app
 * reads them directly, so the whole Italy Quiz prototype runs with no network, no
 * content snapshot and NO BACKEND INVOLVEMENT AT ALL — the backend is deliberately
 * untouched while the game mechanic is being shaped.
 *
 * Later: this module is the single seam where real content is swapped in. When the
 * backend grows the four-act, place-based taxonomy, `getTourQuestions` starts
 * reading the content snapshot (mapping `act` from the backend category) and every
 * screen above it keeps working unchanged.
 */
import { ROME_QUESTIONS } from './questions/rome';
import type { ItalyQuestion } from './question';

const LOCAL_TOURS: Record<string, ItalyQuestion[]> = {
  rome: ROME_QUESTIONS,
};

/** Every authored question for a place, or an empty list if it has none yet. */
export function getTourQuestions(placeId: string | undefined): ItalyQuestion[] {
  if (!placeId) return [];
  return LOCAL_TOURS[placeId] ?? [];
}

/** Whether a place has any content — drives the locked state on the picker. */
export function hasTourContent(placeId: string): boolean {
  return (LOCAL_TOURS[placeId]?.length ?? 0) > 0;
}
