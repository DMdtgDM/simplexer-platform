'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useLocale } from '@/components/LocaleProvider';
import { deleteMyLesson } from '@/lib/teach-actions';

/**
 * A visible per-lesson Delete with a confirmation step. The result is
 * always reported: success refreshes the list (the row disappears) and
 * any failure shows the real error next to the button — never silent.
 */
export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs font-medium text-green-700">{t('lessonDeleted')}</span>;

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span role="alert" className="max-w-56 text-xs text-red-600">{error}</span>}
      <button
        type="button"
        disabled={isPending}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
        onClick={() => {
          if (!confirm(t('deleteLessonConfirm'))) return;
          setError(null);
          startTransition(async () => {
            const res = await deleteMyLesson(lessonId);
            if (res.ok) {
              setDone(true);
              router.refresh();
            } else {
              setError(res.message);
            }
          });
        }}
      >
        <Trash2 size={13} /> {t('deleteLesson')}
      </button>
    </span>
  );
}
