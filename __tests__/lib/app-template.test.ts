/**
 * Unit tests for the app template registry (lib/app-template.ts).
 *
 * The shared mobile codebase serves the whole app portfolio; the backend tags
 * each app with a stable template `code` (delivered as snapshot.app.template)
 * that selects the root experience. resolveExperience is the single branch
 * point: it maps a code to an experience and MUST fall back to the safe
 * 'erudite' default for anything missing or unrecognised, so older snapshots
 * and not-yet-mapped templates never land on a blank or wrong screen.
 */
import {
  DEFAULT_EXPERIENCE,
  resolveExperience,
  type AppExperience,
} from '@/lib/app-template';

describe('resolveExperience', () => {
  it('maps known template codes to their experience', () => {
    expect(resolveExperience('erudite')).toBe('erudite');
    expect(resolveExperience('logo_quiz')).toBe('logo_quiz');
  });

  it('falls back to erudite for the erudite default constant', () => {
    expect(DEFAULT_EXPERIENCE).toBe('erudite');
  });

  it('falls back to erudite for an unknown code', () => {
    expect(resolveExperience('coat_of_arms')).toBe('erudite');
    expect(resolveExperience('sports')).toBe('erudite');
    expect(resolveExperience('world')).toBe('erudite');
    expect(resolveExperience('totally-made-up')).toBe('erudite');
  });

  it('falls back to erudite for missing / empty codes', () => {
    expect(resolveExperience(undefined)).toBe('erudite');
    expect(resolveExperience(null)).toBe('erudite');
    expect(resolveExperience('')).toBe('erudite');
  });

  it('never returns anything outside the known experience union', () => {
    const known: AppExperience[] = ['erudite', 'logo_quiz'];
    for (const code of ['erudite', 'logo_quiz', 'nonsense', '', undefined, null]) {
      expect(known).toContain(resolveExperience(code));
    }
  });
});
