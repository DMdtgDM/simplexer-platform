'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import {
  approveCourse, rejectCourse, promoteUserRole, approveFormalLesson, rejectFormalLesson, assignTeacherSubject, unassignTeacherSubject, addCommunityLink, deleteCommunityLink,
} from '@/lib/actions/courses';
import { Check, X, ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import type { Course, Grade, CommunityLink } from '@/lib/types';
import { useLocale } from '@/components/LocaleProvider';
import type { DictKey } from '@/lib/i18n/dictionary';

type PendingCourse = Course & { submitter_name: string | null };
type AdminUser = { id: string; name: string; email: string | null; role: string; created_at: string };
type PendingFormalLesson = { id: string; title: string; topicName: string; submitterName: string };
type Assignment = { id: string; teacherName: string; subjectName: string; gradeName: string };

const TABS = [
  { key: 'queue', label: 'courseQueue' },
  { key: 'formal', label: 'lessonQueue' },
  { key: 'assignments', label: 'assignments' },
  { key: 'links', label: 'links' },
  { key: 'users', label: 'users' },
] as const;

export function AdminContent({
  pendingCourses,
  lessonsByCourse,
  users,
  currentUserId,
  pendingFormalLessons,
  assignments,
  grades,
  subjectsByGrade,
  teachers,
  links,
}: {
  pendingCourses: PendingCourse[];
  lessonsByCourse: Record<string, { title: string }[]>;
  users: AdminUser[];
  currentUserId: string;
  pendingFormalLessons: PendingFormalLesson[];
  assignments: Assignment[];
  grades: Grade[];
  subjectsByGrade: Record<string, { id: string; name: string }[]>;
  teachers: AdminUser[];
  links: CommunityLink[];
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('queue');

  const counts: Record<string, number> = {
    queue: pendingCourses.length,
    formal: pendingFormalLessons.length,
  };

  return (
    <div className="pt-4 pb-10">
      <h1 className="font-heading text-2xl font-bold text-textneutral">{t('admin')}</h1>

      <div className="mt-4 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1 text-sm">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.key}
            onClick={() => setTab(tabDef.key)}
            className={`rounded-lg px-3 py-2 font-medium ${tab === tabDef.key ? 'bg-primary text-white' : 'text-gray-500'}`}
          >
            {t(tabDef.label as DictKey)}
            {counts[tabDef.key] ? ` (${counts[tabDef.key]})` : ''}
          </button>
        ))}
      </div>

      {tab === 'queue' && <ReviewQueue pendingCourses={pendingCourses} lessonsByCourse={lessonsByCourse} />}
      {tab === 'formal' && <FormalLessonQueue pendingLessons={pendingFormalLessons} />}
      {tab === 'assignments' && (
        <AssignmentsPanel assignments={assignments} grades={grades} subjectsByGrade={subjectsByGrade} teachers={teachers} />
      )}
      {tab === 'links' && <LinksPanel links={links} />}
      {tab === 'users' && <UserManagement users={users} currentUserId={currentUserId} />}
    </div>
  );
}

function EmptyNote() { const { t } = useLocale(); return <p className="mt-8 text-sm text-gray-400">{t('nothingWaiting')}</p>; }

function ReviewQueue({
  pendingCourses,
  lessonsByCourse,
}: {
  pendingCourses: PendingCourse[];
  lessonsByCourse: Record<string, { title: string }[]>;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  if (pendingCourses.length === 0) {
    return <EmptyNote />;
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {pendingCourses.map((course) => (
        <div key={course.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-heading text-sm font-semibold text-textneutral">{course.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                by {course.submitter_name ?? 'Unknown'} · {course.difficulty}
              </p>
            </div>
            <Badge tone="secondary">{t('pending')}</Badge>
          </div>

          {course.description && <p className="mt-2 text-xs text-gray-600">{course.description}</p>}

          <button
            onClick={() => setExpanded(expanded === course.id ? null : course.id)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-primary"
          >
            {(lessonsByCourse[course.id] ?? []).length} lessons
            {expanded === course.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {expanded === course.id && (
            <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              {(lessonsByCourse[course.id] ?? []).map((l, i) => (
                <li key={i}>
                  {i + 1}. {l.title}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              disabled={isPending}
              onClick={() => startTransition(async () => await approveCourse(course.id))}
            >
              <Check size={14} /> {t('approve')}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-error text-error hover:bg-error/5"
              onClick={() => setRejectingId(rejectingId === course.id ? null : course.id)}
            >
              <X size={14} /> {t('reject')}
            </Button>
          </div>

          {rejectingId === course.id && (
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection (shown to the teacher)"
                rows={2}
                className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-900"
              />
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await rejectCourse(course.id, reason);
                    setRejectingId(null);
                    setReason('');
                  })
                }
              >
                Confirm rejection
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FormalLessonQueue({ pendingLessons }: { pendingLessons: PendingFormalLesson[] }) {
  const { t } = useLocale();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();

  if (pendingLessons.length === 0) {
    return <p className="mt-8 text-sm text-gray-400">{t('noFormalWaiting')}</p>;
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {pendingLessons.map((lesson) => (
        <div key={lesson.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-heading text-sm font-semibold text-textneutral">{lesson.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {lesson.topicName} · by {lesson.submitterName}
              </p>
            </div>
            <Badge tone="secondary">pending</Badge>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              disabled={isPending}
              onClick={() => startTransition(async () => await approveFormalLesson(lesson.id))}
            >
              <Check size={14} /> {t('approve')}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-error text-error hover:bg-error/5"
              onClick={() => setRejectingId(rejectingId === lesson.id ? null : lesson.id)}
            >
              <X size={14} /> {t('reject')}
            </Button>
          </div>
          {rejectingId === lesson.id && (
            <div className="mt-2 flex flex-col gap-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection"
                rows={2}
                className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-900"
              />
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await rejectFormalLesson(lesson.id, reason);
                    setRejectingId(null);
                    setReason('');
                  })
                }
              >
                Confirm rejection
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AssignmentsPanel({
  assignments,
  grades,
  subjectsByGrade,
  teachers,
}: {
  assignments: Assignment[];
  grades: Grade[];
  subjectsByGrade: Record<string, { id: string; name: string }[]>;
  teachers: AdminUser[];
}) {
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? '');
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? '');
  const [subjectId, setSubjectId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const subjects = subjectsByGrade[gradeId] ?? [];

  function handleAssign() {
    setError(null);
    if (!teacherId || !subjectId) {
      setError('Pick a teacher and a subject.');
      return;
    }
    startTransition(async () => {
      try {
        await assignTeacherSubject(teacherId, subjectId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not assign.');
      }
    });
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-gray-500">
        Give a teacher permission to submit Formal Track lessons into a specific grade + subject.
      </p>

      {teachers.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">
          No teacher accounts yet — promote someone from the Users tab first.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row">
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="min-h-[40px] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-900"
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={gradeId}
            onChange={(e) => {
              setGradeId(e.target.value);
              setSubjectId('');
            }}
            className="min-h-[40px] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-900"
          >
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="min-h-[40px] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-900"
          >
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Button onClick={handleAssign} disabled={isPending} className="shrink-0">
            <Plus size={14} /> Assign
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {assignments.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-card">
            <span className="flex-1 text-sm text-textneutral">
              <strong>{a.teacherName}</strong> → {a.gradeName} · {a.subjectName}
            </span>
            <button
              onClick={() => startTransition(async () => await unassignTeacherSubject(a.id))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-error/10 hover:text-error"
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinksPanel({ links }: { links: CommunityLink[] }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('send');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    setError(null);
    if (!label.trim() || !url.trim()) {
      setError('Fill in both a label and a URL.');
      return;
    }
    startTransition(async () => {
      try {
        await addCommunityLink({ label, url, icon });
        setLabel('');
        setUrl('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add link.');
      }
    });
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-gray-500">
        Links shown on the public <code>/community</code> page — Discord, Telegram, resource pages, etc.
      </p>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row">
        <input
          placeholder="Label (e.g. Discord)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="min-h-[40px] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-900"
        />
        <input
          placeholder="https://discord.gg/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-h-[40px] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm transition focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900 dark:focus:bg-gray-900"
        />
        <select
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="min-h-[40px] rounded-lg border border-gray-300 px-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="send">Telegram-style</option>
          <option value="message-circle">Discord-style</option>
          <option value="link">Generic link</option>
          <option value="youtube">YouTube</option>
          <option value="book-open">Resource</option>
        </select>
        <Button onClick={handleAdd} disabled={isPending} className="shrink-0">
          <Plus size={14} /> Add
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-error">{error}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {links.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-card">
            <span className="flex-1 truncate text-sm text-textneutral">
              <strong>{l.label}</strong> — {l.url}
            </span>
            <button
              onClick={() => startTransition(async () => await deleteCommunityLink(l.id))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-error/10 hover:text-error"
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserManagement({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = needle ? users.filter((u) => u.name.toLowerCase().includes(needle) || (u.email ?? '').toLowerCase().includes(needle) || u.role.includes(needle)) : users;

  return (
    <div className="mt-6 flex flex-col gap-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users by name, email or role"
        className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900" />
      {shown.length === 0 && <p className="text-sm text-gray-400">{t('noUsersMatch')}</p>}
      {shown.map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-card">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-textneutral">
              {u.name} {u.id === currentUserId && <span className="text-xs text-gray-400">(you)</span>}
            </p>
            <p className="truncate text-xs text-gray-500">{u.email}</p>
          </div>
          <select
            defaultValue={u.role}
            disabled={isPending || u.id === currentUserId}
            onChange={(e) =>
              startTransition(async () => await promoteUserRole(u.id, e.target.value as 'student' | 'teacher' | 'admin'))
            }
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none disabled:opacity-50"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      ))}
    </div>
  );
}
