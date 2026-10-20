'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search as SearchIcon, BookOpen, Compass } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { useLocale } from '@/components/LocaleProvider';

export type SearchResult =
  | { id: string; title: string; type: 'lesson'; track: 'formal' | 'interest' }
  | { id: string; title: string; type: 'course'; categorySlug: string; courseSlug: string };

function hrefFor(result: SearchResult): string {
  return result.type === 'lesson' ? `/lesson/${result.id}` : `/interests/${result.categorySlug}/${result.courseSlug}`;
}

export function SearchContent({ query, results }: { query: string; results: SearchResult[] }) {
  const { t } = useLocale();
  const router = useRouter();
  const [value, setValue] = useState(query);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <div className="pt-4">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{t('search')}</h1>
      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3">
        <SearchIcon size={18} className="text-gray-400" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('searchTitle')}
          className="min-h-[44px] w-full text-sm focus:outline-none"
        />
      </form>

      {query.length >= 2 && results.length > 0 && (
        <p className="mt-4 text-xs text-gray-400">
          {t('searchResultsCount').replace('{n}', String(results.length)).replace('{q}', query)}
        </p>
      )}

      {query.length >= 2 && results.length === 0 && (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-card">
          <p className="font-heading text-sm font-semibold text-textneutral">{t('noResultsTitle').replace('{q}', query)}</p>
          <p className="mt-1 text-sm text-gray-500">{t('noResultsHint')}</p>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {results.map((r) => (
          <Link
            key={`${r.type}-${r.id}`}
            href={hrefFor(r)}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-card hover:border-primary/30"
          >
            {r.type === 'lesson' ? (
              <BookOpen size={16} className="shrink-0 text-primary" />
            ) : (
              <Compass size={16} className="shrink-0 text-secondary-dark" />
            )}
            <span className="flex-1 text-sm font-medium text-textneutral">{r.title}</span>
            <Badge tone={r.type === 'lesson' ? 'primary' : 'secondary'}>{r.type === 'lesson' ? t('typeLesson') : t('typeCourse')}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
