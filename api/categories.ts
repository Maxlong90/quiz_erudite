import { apiClient } from './client';

export interface Category {
  slug: string;
  name: string;
  sort_order: number;
  should_have_images: boolean;
  should_have_audio: boolean;
  subcategories_count?: number;
  total_questions_count?: number;
  questions_count?: number;
}

export async function fetchCategories(appSlug: string): Promise<Category[]> {
  const { data } = await apiClient.get(`/apps/${appSlug}/categories`);
  return Array.isArray(data) ? data : data.data;
}
