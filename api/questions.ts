import { apiClient } from './client';
import type { Question } from './types';

export async function fetchRandomQuestions(
  appSlug: string,
  locale: string,
  count: number,
  category?: string,
): Promise<Question[]> {
  const params: Record<string, string | number> = { count, locale };
  if (category) {
    params.category = category;
  }
  const { data } = await apiClient.get(`/apps/${appSlug}/questions/random`, { params });
  // Handle both wrapped { data: [...] } and bare array responses
  return Array.isArray(data) ? data : data.data;
}
