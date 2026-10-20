import { getCommunityLinks } from '@/lib/queries/community';
import { iconFor } from '@/components/IconMap';
import { LinkIcon } from 'lucide-react';
import { serverT } from '@/lib/i18n/server';

export const metadata = { title: 'Community — Simplexer' };
export const revalidate = 300;

const ICON_ALIASES: Record<string, string> = {
  send: 'send',
  'message-circle': 'message-circle',
  'book-open': 'book-open',
  youtube: 'youtube',
};

export default async function CommunityPage() {
  const { t } = await serverT();
  const links = await getCommunityLinks();

  return (
    <div className="pt-6 text-center">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{t('community')}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
        Where Simplexer lives outside the website — daily tips, community discussion, and extra
        study resources.
      </p>

      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
        {links.length === 0 && <p className="text-sm text-gray-400">No links added yet.</p>}
        {links.map((link) => {
          const Icon = iconFor(ICON_ALIASES[link.icon ?? ''] ?? null, LinkIcon);
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[52px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-card hover:border-primary/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
                <Icon size={18} />
              </span>
              <span className="text-sm font-medium text-textneutral">{link.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
