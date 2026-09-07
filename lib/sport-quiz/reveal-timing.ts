/**
 * Sport Quiz answer-reveal timings — the single source of truth for the beat that
 * plays after a correct pick (or a paid Skip) in BOTH quiz screens: the Classic
 * quiz (`app/sport-quiz/quiz.tsx`) and Sports Legends (`app/sport-quiz/legends-quiz.tsx`).
 *
 * The two screens run the same choreography and MUST stay identical — a player
 * switching modes should not feel a different rhythm. These numbers used to be
 * copy-pasted into both files with a comment promising they matched; they live
 * here so that promise is enforced by the compiler instead of by vigilance.
 *
 * The choreography, all starting on the same frame:
 *
 *   0 ─────────────────────────────────────────────────────────► 1700ms
 *   │ wrong options fade out (FADE_MS, 1000ms)
 *   │ correct option glides up and centers (MOVE_MS, 1700ms)
 *   │                                    │ explanation fades in │
 *   │                                    └── EXPLANATION_DELAY_MS ──┘
 *                                                          both land together ▲
 */

/** How long the wrong options take to fade out once the answer is revealed. */
export const FADE_MS = 1000;

/**
 * How long the correct option takes to glide up and center under the question.
 *
 * DO NOT SHORTEN. The pace of this glide is a deliberate product choice — it is
 * the moment the answer "lands", and it reads as unhurried on purpose. Anything
 * that feels late relative to it should be re-phased against it (see
 * EXPLANATION_DELAY_MS), never fixed by speeding the glide up.
 */
export const MOVE_MS = 1700;

/** How long the explanation block takes to fade in. */
export const UI_FADE_MS = 300;

/**
 * When the explanation block STARTS fading in.
 *
 * The whole point of this file: the fade must FINISH exactly as the answer button
 * lands, not start there. Delaying by the full MOVE_MS (which is what both screens
 * used to do) meant the player watched the answer park and then waited another
 * UI_FADE_MS in silence before the text existed — short, but read as a stall,
 * because nothing on screen was moving during it.
 *
 * Subtracting the fade duration puts the explanation at full opacity on the same
 * frame the glide ends. The invariant that matters is
 * `EXPLANATION_DELAY_MS + UI_FADE_MS === MOVE_MS`; if the reveal ever needs
 * retuning, change UI_FADE_MS and let this stay derived — a longer fade simply
 * starts earlier and overlaps more of the glide's tail, which is the correct
 * direction, and MOVE_MS stays untouched.
 */
export const EXPLANATION_DELAY_MS = MOVE_MS - UI_FADE_MS;
