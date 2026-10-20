import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { getCurrentUser } from '@/lib/queries/progress';
import { getNotifications } from '@/lib/queries/notifications';
import {
  markNotificationRead, markAllNotificationsRead, openNotification, deleteNotification, clearReadNotifications,
} from '@/lib/actions/people';
import { PageHeader } from '@/components/PageHeader';
import { card, btn, btnGhost } from '@/components/Ui';
import { serverT } from '@/lib/i18n/server';

export const metadata = { title: 'Notifications — Simplexer' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage(props: { searchParams: Promise<{ ok?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const { t } = await serverT();
  const items = await getNotifications();
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="pt-6">
      <PageHeader eyebrow={t('notifications')} tone="primary" title={t('notifications')} subtitle={unread ? t('unreadCount').replace('{n}', String(unread)) : t('upToDate')} />
      {searchParams.ok && <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{searchParams.ok}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button className={btnGhost}>{t('markAllRead')}</button>
          </form>
        )}
        {items.some((n) => n.is_read) && (
          <form action={clearReadNotifications}>
            <button className={btnGhost}>{t('clearRead')}</button>
          </form>
        )}
      </div>
      <div className="mt-5 space-y-3">
        {items.length === 0 && (
          <div className={`${card} flex items-center gap-3 text-sm text-gray-500`}>
            <Bell className="text-gray-300" /> {t('noNotifications')}
          </div>
        )}
        {items.map((n) => (
          <div key={n.id} className={`${card} ${n.is_read ? 'opacity-75' : 'border-primary/30'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-textneutral">{!n.is_read && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />}{n.title}</p>
              <span className="text-[11px] text-gray-400">{new Date(n.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa' })}</span>
            </div>
            {n.body && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{n.body}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {n.href && (
                <form action={openNotification.bind(null, n.id, n.href)}>
                  <button className={btn}>{t('openLabel')}</button>
                </form>
              )}
              {!n.is_read && (
                <form action={markNotificationRead.bind(null, n.id)}>
                  <button className={btnGhost}>{t('markAsRead')}</button>
                </form>
              )}
              <form action={deleteNotification.bind(null, n.id)}>
                <button className="inline-flex min-h-[40px] items-center rounded-full px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-gray-800">{t('removeLabel')}</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
