import { apiClient } from './client';
import type { Question } from './types';

export async function fetchRandomQuestions(
  appSlug: string,
  locale: string,
  count: number
): Promise<Question[]> {
  const { data } = await apiClient.get(`/apps/${appSlug}/questions/random`, {
    params: { count, locale },
  });
  // Handle both wrapped { data: [...] } and bare array responses
  return Array.isArray(data) ? data : data.data;
}
