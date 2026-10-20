import { createClient } from '@/lib/supabase/client';
import type { DictKey } from '@/lib/i18n/dictionary';

export async function uploadMedia(uid: string, file: File, t: (k: DictKey) => string): Promise<{ url: string; sizeKb: number } | string> {
  if (file.size > 10 * 1024 * 1024) return t('fileTooBig10');
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) return t('fileTypeNote');
  const supabase = createClient();
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('course-media').upload(path, file, { contentType: file.type });
  if (error) return t('uploadFailedConnection');
  return { url: supabase.storage.from('course-media').getPublicUrl(path).data.publicUrl, sizeKb: Math.round(file.size / 1024) };
}
