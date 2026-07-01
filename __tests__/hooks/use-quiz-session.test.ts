/**
 * Tests for the REPLACE_QUESTION reducer path in hooks/use-quiz-session.ts
 * (Part D, the replaceQuestion hint): swapping the current question in place
 * must keep the index, the array length (stable progress denominator), and the
 * other answers intact, leave the swapped-in question unanswered, and be a
 * no-op once the current question is already answered.
 */

import { act, renderHook } from '@testing-library/react-native';

import { useQuizSession } from '@/hooks/use-quiz-session';
import type { Question } from '@/api/types';

function q(id: number): Question {
  return {
    id,
    question: `Q${id}`,
    options: ['a', 'b', 'c', 'd'],
    correct_option: 0,
    explanation: null,
    image_url: null,
  };
}

describe('REPLACE_QUESTION', () => {
  it('swaps the current question in place without corrupting the session', () => {
    const { result } = renderHook(() => useQuizSession());

    act(() => result.current.dispatch({ type: 'SET_QUESTIONS', payload: [q(1), q(2), q(3)] }));
    // Advance to the middle question and answer the first.
    act(() => result.current.dispatch({ type: 'ANSWER', payload: 2 })); // answer Q1
    act(() => result.current.dispatch({ type: 'NEXT' })); // now on Q2

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentQuestion?.id).toBe(2);

    act(() => result.current.dispatch({ type: 'REPLACE_QUESTION', payload: q(99) }));

    // Same index, same length, previous answer preserved, new Q unanswered.
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.questions).toHaveLength(3);
    expect(result.current.currentQuestion?.id).toBe(99);
    expect(result.current.answers[0]).toBe(2); // Q1 answer intact
    expect(result.current.answers[1]).toBeNull();
    expect(result.current.progress).toBeCloseTo(2 / 3);
    expect(result.current.status).toBe('playing');
  });

  it('is a no-op once the current question is answered', () => {
    const { result } = renderHook(() => useQuizSession());
    act(() => result.current.dispatch({ type: 'SET_QUESTIONS', payload: [q(1), q(2)] }));
    act(() => result.current.dispatch({ type: 'ANSWER', payload: 0 }));

    act(() => result.current.dispatch({ type: 'REPLACE_QUESTION', payload: q(99) }));

    // Still the original, still answered.
    expect(result.current.currentQuestion?.id).toBe(1);
    expect(result.current.answers[0]).toBe(0);
  });
});
