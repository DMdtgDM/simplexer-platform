import type { Font, Size } from '@/lib/reading';

export type QuestionDraft = {
  text: string;
  explanation: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  answer: string; // short answer only: accepted answer(s), | separates alternatives
  options: { text: string; correct: boolean }[];
};

export type QuizDraft = {
  questions: QuestionDraft[];
};

export type LessonVisibility = 'public' | 'enrolled' | 'private';

export type LessonDraft = {
  id?: string;
  title: string;
  content: string;
  video_url: string;
  attachment_url: string;
  attachment_size_kb: number | null;
  est_minutes: number;
  font: Font;
  text_size: Size;
  visibility: LessonVisibility;
  quiz: QuizDraft | null;
};

export type CourseDraft = {
  id?: string;
  categoryId: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: 'Amharic' | 'English' | 'Both';
  instructor: string;
  coverImageUrl: string;
  lessons: LessonDraft[];
};

export type SaveResult = { ok: boolean; message: string; id?: string; lessonIds?: string[] };

export const emptyLesson = (): LessonDraft => ({
  title: '', content: '', video_url: '', attachment_url: '', attachment_size_kb: null, est_minutes: 5, font: 'sans', text_size: 'md', visibility: 'public', quiz: null,
});
