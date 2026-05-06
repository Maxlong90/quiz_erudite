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

export async function fetchCategories(
  appSlug: string,
  options: { parent?: string } = {},
): Promise<Category[]> {
  const params: Record<string, string> = {};
  if (options.parent) params.parent = options.parent;
  const { data } = await apiClient.get(`/apps/${appSlug}/categories`, { params });
  return Array.isArray(data) ? data : data.data;
}
