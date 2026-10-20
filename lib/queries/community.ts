import { createPublicClient as createClient } from '@/lib/supabase/public';
import type { CommunityLink } from '@/lib/types';

export async function getCommunityLinks(): Promise<CommunityLink[]> {
  const supabase = createClient();
  const { data } = await supabase.from('community_links').select('*').order('order');
  return data ?? [];
}
