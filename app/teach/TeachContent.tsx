'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { submitCourseForReview, deleteCourseSubmission, submitFormalLesson, deleteFormalLesson } from '@/lib/actions';
import { slugify } from '@/lib/slugify';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { Category, Course } from '@/lib/types';

type LessonDraft = { title: string; content: string; video_url: string };
type Assignment = { subjectId: string; subjectName: string; gradeName: string };
type FormalLessonSubmission = {
  id: string;
  title: string;
  topicName: string;
  status: string;
  rejection_reason: string | null;
};

const statusTone = { pending: 'secondary', approved: 'success', rejected: 'error' } as const;

export function TeachContent({
  categories,
  mySubmissions,
  analytics,
  assignments,
  topicsBySubject,
  myFormalLessons,
}: {
  categories: Category[];
  mySubmissions: Course[];
  analytics: Record<string, { started: number; finished: number; lessonCount: number }>;
  assignments: Assignment[];
  topicsBySubject: Record<string, { id: string; name: string }[]>;
  myFormalLessons: FormalLessonSubmission[];
}) {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get('submitted') === '1';
  const justUpdated = searchParams.get('updated') === '1';
  const formalJustSubmitted = searchParams.get('formal_submitted') === '1';

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [instructor, setInstructor] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [lessons, setLessons] = useState<LessonDraft[]>([{ title: '', content: '', video_url: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        await submitCourseForReview({
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

  function handleDeleteCourse(id: string, courseTitle: string) {
    if (!confirm(`Delete "${courseTitle}"? This removes all its lessons too. This can't be undone.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteCourseSubmission(id);
      setDeletingId(null);
    });
  }

  return (
    <div className="pt-4 pb-16">
      <h1 className="font-heading text-2xl font-bold text-textneutral">Teach</h1>
      <p className="mt-1 text-sm text-gray-500">Submit content for review — an admin approves it before it goes live.</p>

      {justSubmitted && (
        <Banner tone="success">Course submitted! It'll appear below as "pending" until an admin reviews it.</Banner>
      )}
      {justUpdated && <Banner tone="success">Course updated — it's back in the review queue.</Banner>}
      {formalJustSubmitted && (
        <Banner tone="success">Lesson submitted! It'll appear below as "pending" until an admin reviews it.</Banner>
      )}

      {/* ---------------- Interest Track: My Courses ---------------- */}
      {mySubmissions.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-heading text-sm font-bold text-textneutral">My Courses (Interest Track)</h2>
          <div className="flex flex-col gap-2">
            {mySubmissions.map((c) => {
              const stats = analytics[c.id];
              return (
                <div key={c.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-medium text-textneutral">{c.title}</span>
                    <Badge tone={statusTone[c.status]}>{c.status}</Badge>
                    <Link
                      href={`/teach/course/${c.id}/edit`}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </Link>
                    <button
                      onClick={() => handleDeleteCourse(c.id, c.title)}
                      disabled={isPending && deletingId === c.id}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-error/10 hover:text-error"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {c.status === 'approved' && stats && stats.lessonCount > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {stats.started} student{stats.started === 1 ? '' : 's'} started · {stats.finished} finished
                    </p>
                  )}
                  {c.status === 'rejected' && c.rejection_reason && (
                    <p className="mt-2 text-xs text-error">{c.rejection_reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- Formal Track (only if assigned) ---------------- */}
      {assignments.length > 0 && (
        <FormalTrackSection assignments={assignments} topicsBySubject={topicsBySubject} myFormalLessons={myFormalLessons} />
      )}

      {/* ---------------- New Interest Track course form ---------------- */}
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <h2 className="font-heading text-sm font-bold text-textneutral">New Interest Track Course</h2>

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
          placeholder="Cover image URL (optional — paste a link to an image)"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          className="min-h-[44px] rounded-xl border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        />

        <h3 className="mt-2 font-heading text-sm font-bold text-textneutral">Lessons</h3>
        {lessons.map((lesson, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-3">
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
              placeholder="Lesson content (markdown — you can use $LaTeX$ for math)"
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
          {isPending ? 'Submitting…' : 'Submit for Review'}
        </Button>
      </form>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  const cls = tone === 'success' ? 'border-success/30 bg-success/10 text-success' : 'border-error/30 bg-error/10 text-error';
  return <div className={`mt-4 rounded-xl border p-3 text-sm ${cls}`}>{children}</div>;
}

function FormalTrackSection({
  assignments,
  topicsBySubject,
  myFormalLessons,
}: {
  assignments: Assignment[];
  topicsBySubject: Record<string, { id: string; name: string }[]>;
  myFormalLessons: FormalLessonSubmission[];
}) {
  const [subjectId, setSubjectId] = useState(assignments[0]?.subjectId ?? '');
  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const topics = topicsBySubject[subjectId] ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!topicId || !title.trim() || !content.trim()) {
      setError('Pick a topic and fill in a title + content.');
      return;
    }
    startTransition(async () => {
      try {
        await submitFormalLesson({ topicId, title, content, videoUrl });
      } catch (err) {
        if (err instanceof Error && err.message !== 'NEXT_REDIRECT') setError(err.message);
      }
    });
  }

  function handleDelete(id: string, lessonTitle: string) {
    if (!confirm(`Delete "${lessonTitle}"? This can't be undone.`)) return;
    startTransition(async () => await deleteFormalLesson(id));
  }

  return (
    <div className="mt-10 rounded-2xl border border-primary/20 bg-primary-50/40 p-4">
      <h2 className="font-heading text-sm font-bold text-textneutral">Formal Track — assigned subjects</h2>
      <p className="mt-1 text-xs text-gray-500">
        An admin assigned you to teach: {assignments.map((a) => `${a.gradeName} ${a.subjectName}`).join(', ')}.
      </p>

      {myFormalLessons.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {myFormalLessons.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-textneutral">{l.title}</p>
                <p className="text-xs text-gray-400">{l.topicName}</p>
              </div>
              <Badge tone={statusTone[l.status as keyof typeof statusTone]}>{l.status}</Badge>
              <button
                onClick={() => handleDelete(l.id, l.title)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-error/10 hover:text-error"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId('');
            }}
            className="min-h-[40px] rounded-lg border border-gray-300 px-2 text-sm focus:border-primary focus:outline-none"
          >
            {assignments.map((a) => (
              <option key={a.subjectId} value={a.subjectId}>
                {a.gradeName} · {a.subjectName}
              </option>
            ))}
          </select>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="min-h-[40px] rounded-lg border border-gray-300 px-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Select topic…</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <input
          placeholder="Lesson title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        />
        <textarea
          placeholder="Lesson content (markdown — $LaTeX$ supported)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="rounded-lg border border-gray-300 p-3 text-sm focus:border-primary focus:outline-none"
        />
        <input
          placeholder="YouTube URL (optional)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="min-h-[40px] rounded-lg border border-gray-300 px-3 text-sm focus:border-primary focus:outline-none"
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <Button type="submit" disabled={isPending} variant="outline" className="mt-1">
          {isPending ? 'Submitting…' : 'Submit lesson for review'}
        </Button>
      </form>
    </div>
  );
}
