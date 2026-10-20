import { createClient } from '@/lib/supabase/server';

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  is_read: boolean;
  created_at: string;
};

export async function getNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, kind, title, body, href, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  return count ?? 0;
}
