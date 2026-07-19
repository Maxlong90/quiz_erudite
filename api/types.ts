export interface Question {
  id: number;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  image_url: string | null;
  /**
   * Maps each DISPLAY option index back to its original backend option
   * index. Options are shuffled per session (see `shuffleOptions`), so this
   * permutation lets answer reporting and the real-stats hint work in the
   * backend's canonical option order. Absent = options were never shuffled
   * (treat as identity).
   */
  optionOrder?: number[];
}

export interface AppConfig {
  id: number;
  name: string;
  slug: string;
  supported_locales: string[];
  /**
   * Stable frontend template key that selects the app's root experience
   * (e.g. 'erudite', 'logo_quiz'). Sourced from the app's App Template in the
   * backend. Absent on older responses — treat as the safe 'erudite' default.
   */
  template?: string | null;
}

export interface ContentCategory {
  id: number;
  name: string;
  slug: string;
}
