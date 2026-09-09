/**
 * lib/theme/color.ts — the client mirror of the backend's ColorMath.php.
 *
 * Two things are under test and both are load-bearing:
 *
 * 1. TOTALITY. These helpers feed React Native style props, where an
 *    unparseable colour throws in native code on Android. Anything the module
 *    cannot take apart must come back unchanged, never null and never a throw.
 *    `scrim` used to be an rgba() literal in the shipped palette; since Э1 it
 *    is 8-digit hex (byte-identical colour), so the rgba case is pinned with a
 *    plain literal below — the property itself still matters for any value
 *    that slips past the parser.
 * 2. ROUNDING PARITY with the PHP. The cases below are transcribed from
 *    ColorMath::withAlpha's docblock — the ratios where truncation and
 *    round() disagree. If these drift, a colour derived on the client stops
 *    matching the same colour derived on the backend.
 */
import { expandHex, isHexColor, withAlpha } from '@/lib/theme/color';

describe('isHexColor', () => {
  it.each(['#fff', '#fff4', '#ffffff', '#ffffff44', '#7C5CFF'])('accepts %s', (value) => {
    expect(isHexColor(value)).toBe(true);
  });

  it.each([
    'rgba(0,0,0,0.55)',
    'rgb(0,0,0)',
    'transparent',
    'white',
    '',
    '#ff',
    '#fffff',
    '#fffffff',
    'ffffff',
    'the #ffffff one',
  ])('rejects %s', (value) => {
    expect(isHexColor(value)).toBe(false);
  });

  it('ignores surrounding whitespace', () => {
    expect(isHexColor('  #fff  ')).toBe(true);
  });
});

describe('expandHex', () => {
  it('doubles #rgb shorthand', () => {
    expect(expandHex('#fff')).toBe('#ffffff');
  });

  it('doubles #rgba shorthand including the alpha nibble', () => {
    expect(expandHex('#fff4')).toBe('#ffffff44');
  });

  it('lowercases an already-long value without otherwise touching it', () => {
    expect(expandHex('#7C5CFF')).toBe('#7c5cff');
    expect(expandHex('#7C5CFF33')).toBe('#7c5cff33');
  });

  it('returns non-hex input unchanged', () => {
    expect(expandHex('rgba(0,0,0,0.55)')).toBe('rgba(0,0,0,0.55)');
    expect(expandHex('transparent')).toBe('transparent');
  });
});

describe('withAlpha', () => {
  it('appends the alpha byte to a plain hex colour', () => {
    expect(withAlpha('#7c5cff', 0.5)).toBe('#7c5cff80');
  });

  it('REPLACES an existing alpha channel rather than appending a second one', () => {
    // The chaining guard: a tint that is re-tinted must not grow to #7c5cff3366.
    expect(withAlpha('#7c5cff33', 0.4)).toBe('#7c5cff66');
  });

  it('expands shorthand before applying the alpha', () => {
    expect(withAlpha('#fff', 0.85)).toBe('#ffffffd9');
  });

  it.each([
    [0.05, '0d'],
    [0.1, '1a'],
    [0.12, '1f'],
    [0.133, '22'],
  ])('rounds %p to %s, matching ColorMath::withAlpha', (alpha, byte) => {
    // Truncation would give 0c / 19 / 1e / 21 here and silently desync the two
    // implementations. round() is the contract.
    expect(withAlpha('#7c5cff', alpha)).toBe(`#7c5cff${byte}`);
  });

  it('saturates rather than wrapping when the ratio is out of range', () => {
    expect(withAlpha('#7c5cff', 2)).toBe('#7c5cffff');
    expect(withAlpha('#7c5cff', -1)).toBe('#7c5cff00');
  });

  it('handles the exact ends of the range', () => {
    expect(withAlpha('#7c5cff', 0)).toBe('#7c5cff00');
    expect(withAlpha('#7c5cff', 1)).toBe('#7c5cffff');
  });

  it('passes an rgba() literal straight through instead of mangling it', () => {
    // The shipped palette's scrim used to BE this literal; it is 8-digit hex
    // now, so the pass-through is pinned on the literal itself. An "Unable to
    // parse color" crash on Android is the failure mode this guards.
    expect(withAlpha('rgba(0,0,0,0.55)', 0.4)).toBe('rgba(0,0,0,0.55)');
  });

  it.each(['transparent', '', 'papayawhip'])('passes %p through unchanged', (value) => {
    expect(withAlpha(value, 0.5)).toBe(value);
  });
});
