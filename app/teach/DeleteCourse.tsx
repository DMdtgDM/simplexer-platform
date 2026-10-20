'use client';

import { deleteCourseSubmission } from '@/lib/actions/courses';
import { useLocale } from '@/components/LocaleProvider';

export function DeleteCourse({ id }: { id: string }) {
  const { t } = useLocale();
  return (
    <form action={deleteCourseSubmission.bind(null, id)} onSubmit={(e) => { if (!confirm(t('deleteCourseConfirm'))) e.preventDefault(); }}>
      <button className="text-xs text-red-600 underline">{t('deleteLabel')}</button>
    </form>
  );
}
