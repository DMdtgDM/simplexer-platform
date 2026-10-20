import { createPublicClient as createClient } from '@/lib/supabase/public';
import type { Category, Course } from '@/lib/types';

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data } = await supabase.from('categories').select('*').order('order');
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = createClient();
  const { data } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
  return data;
}

export async function getCoursesForCategory(categoryId: string): Promise<Course[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('courses')
    .select('*')
    .eq('category_id', categoryId)
    .order('order');
  return data ?? [];
}

export async function getCourseBySlug(categoryId: string, slug: string): Promise<Course | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('courses')
    .select('*')
    .eq('category_id', categoryId)
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

export async function getCourseCountsByCategory(): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data } = await supabase.from('courses').select('category_id');
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { category_id: string }) => {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  });
  return counts;
}
