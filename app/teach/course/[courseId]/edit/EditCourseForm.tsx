'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { updateCourseSubmission } from '@/lib/actions';
import { slugify } from '@/lib/slugify';
import { Plus, Trash2 } from 'lucide-react';
import type { Category, Course, Lesson } from '@/lib/types';

type LessonDraft = { id?: string; title: string; content: string; video_url: string };

export function EditCourseForm({
  course,
  categories,
  lessons: initialLessons,
}: {
  course: Course;
  categories: Category[];
  lessons: Lesson[];
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(course.category_id);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(course.difficulty);
  const [instructor, setInstructor] = useState(course.instructor ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(course.cover_image_url ?? '');
  const [lessons, setLessons] = useState<LessonDraft[]>(
    initialLessons.length > 0
      ? initialLessons.map((l) => ({ id: l.id, title: l.title, content: l.content, video_url: l.video_url ?? '' }))
      : [{ title: '', content: '', video_url: '' }]
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateLesson(i: number, field: keyof LessonDraft, value: string) {
    setLessons((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }
  function addLesson() {
    setLessons((prev) => [...prev, { title: '', content: '', video_url: '' }]);
  }
  function removeLesson(i: number) {
    setLessons((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId || !title.trim() || lessons.some((l) => !l.title.trim() || !l.content.trim())) {
      setError("Please fill in a category, title, and every lesson's title + content.");
      return;
    }
    startTransition(async () => {
      try {
        await updateCourseSubmission(course.id, {
          categoryId,
          title,
          slug: slugify(title),
          description,
          difficulty,
          instructor,
          coverImageUrl,
          lessons,
        });
      } catch (err) {
        if (err instanceof Error && err.message !== 'NEXT_REDIRECT') setError(err.message);
      }
    });
  }

  return (
    <div className="pt-4 pb-16">
      <button onClick={() => router.push('/teach')} className="text-xs text-gray-500 hover:text-primary">
        &larr; Back to Teach
      </button>
      <h1 className="mt-2 font-heading text-2xl font-bold text-textneutral">Edit Course</h1>
      {course.status === 'approved' && (
        <p className="mt-1 text-xs text-secondary-dark">
          This course is live. Saving changes sends it back to "pending" for re-review.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        />

        <textarea
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-xl border border-gray-300 p-3 text-sm focus:border-primary focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <input
            placeholder="Your name (instructor)"
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <input
          placeholder="Cover image URL (optional)"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        />

        <h3 className="mt-2 font-heading text-sm font-bold text-textneutral">Lessons</h3>
        {lessons.map((lesson, i) => (
          <div key={lesson.id ?? i} className="rounded-xl border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Lesson {i + 1}</span>
              {lessons.length > 1 && (
                <button type="button" onClick={() => removeLesson(i)} className="text-error">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <input
              placeholder="Lesson title"
              value={lesson.title}
              onChange={(e) => updateLesson(i, 'title', e.target.value)}
              className="mb-2 min-h-[40px] w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
            />
            <textarea
              placeholder="Lesson content (markdown — $LaTeX$ supported)"
              value={lesson.content}
              onChange={(e) => updateLesson(i, 'content', e.target.value)}
              rows={5}
              className="mb-2 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-primary focus:outline-none"
            />
            <input
              placeholder="YouTube URL (optional)"
              value={lesson.video_url}
              onChange={(e) => updateLesson(i, 'video_url', e.target.value)}
              className="min-h-[40px] w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addLesson}
          className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary"
        >
          <Plus size={14} /> Add another lesson
        </button>

        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending ? 'Saving…' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
