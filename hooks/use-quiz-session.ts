import { useReducer, useMemo } from 'react';
import type { Question } from '@/api/types';

interface QuizState {
  questions: Question[];
  currentIndex: number;
  answers: (number | null)[];
  status: 'loading' | 'playing' | 'finished' | 'error';
  error: string | null;
}

type QuizAction =
  | { type: 'SET_LOADING' }
  | { type: 'SET_QUESTIONS'; payload: Question[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'ANSWER'; payload: number }
  | { type: 'REPLACE_QUESTION'; payload: Question }
  | { type: 'NEXT' }
  | { type: 'FINISH' }
  | { type: 'RESET' };

const initialState: QuizState = {
  questions: [],
  currentIndex: 0,
  answers: [],
  status: 'loading',
  error: null,
};

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, status: 'loading', error: null };
    case 'SET_QUESTIONS':
      return {
        ...state,
        questions: action.payload,
        answers: new Array(action.payload.length).fill(null),
        currentIndex: 0,
        status: 'playing',
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'ANSWER': {
      if (state.answers[state.currentIndex] !== null) return state;
      const newAnswers = [...state.answers];
      newAnswers[state.currentIndex] = action.payload;
      return { ...state, answers: newAnswers };
    }
    case 'REPLACE_QUESTION': {
      // Swap the CURRENT question in place (replaceQuestion hint). Keeps
      // the index, the array length (so progress denominator is stable),
      // status, and every other answer untouched; the swapped-in question
      // starts unanswered. A no-op once the current question is answered.
      if (state.answers[state.currentIndex] !== null) return state;
      const questions = [...state.questions];
      questions[state.currentIndex] = action.payload;
      const answers = [...state.answers];
      answers[state.currentIndex] = null;
      return { ...state, questions, answers };
    }
    case 'NEXT': {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, status: 'finished' };
      }
      return { ...state, currentIndex: nextIndex };
    }
    case 'FINISH':
      return { ...state, status: 'finished' };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useQuizSession() {
  const [state, dispatch] = useReducer(quizReducer, initialState);

  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const isAnswered = state.answers[state.currentIndex] !== null;
  const selectedAnswer = state.answers[state.currentIndex] ?? null;

  const score = useMemo(
    () =>
      state.answers.reduce<number>(
        (acc, answer, i) =>
          answer === state.questions[i]?.correct_option ? acc + 1 : acc,
        0
      ),
    [state.answers, state.questions]
  );

  const progress =
    state.questions.length > 0
      ? (state.currentIndex + 1) / state.questions.length
      : 0;

  return {
    ...state,
    currentQuestion,
    isAnswered,
    selectedAnswer,
    score,
    progress,
    dispatch,
  };
}
