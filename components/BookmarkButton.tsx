'use client';

import { useState, useTransition } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { toggleBookmark } from '@/lib/actions';

export function BookmarkButton({ lessonId, initiallyBookmarked }: { lessonId: string; initiallyBookmarked: boolean }) {
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !bookmarked;
    setBookmarked(next); // optimistic
    startTransition(async () => {
      try {
        await toggleBookmark(lessonId, !next);
      } catch {
        setBookmarked(!next); // revert on failure
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove from saved lessons' : 'Save lesson for later'}
      className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${
        bookmarked
          ? 'border-secondary/40 bg-secondary/10 text-secondary-dark'
          : 'border-gray-200 text-gray-400 hover:border-secondary/40 hover:text-secondary-dark'
      }`}
    >
      {bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
    </button>
  );
}
