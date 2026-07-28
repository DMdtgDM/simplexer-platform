export type Grade = {
  id: string;
  name: string;
  slug: string;
  tag: string | null;
  order: number;
  exam_date: string | null;
};

export type Subject = {
  id: string;
  grade_id: string;
  name: string;
  slug: string;
  icon: string | null;
  order: number;
};

export type Topic = {
  id: string;
  subject_id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  order: number;
};

export type Course = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  cover_image_url: string | null;
  instructor: string | null;
  order: number;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string | null;
  rejection_reason: string | null;
};

export type Lesson = {
  id: string;
  topic_id: string | null;
  course_id: string | null;
  slug: string;
  title: string;
  content: string;
  video_url: string | null;
  attachment_url: string | null;
  attachment_size_kb: number | null;
  est_minutes: number;
  order: number;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_by: string | null;
  rejection_reason: string | null;
};

export type TeacherAssignment = {
  id: string;
  teacher_id: string;
  subject_id: string;
  created_at: string;
};

export type CommunityLink = {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  order: number;
};

export type Quiz = {
  id: string;
  lesson_id: string | null;
  title: string;
  pass_threshold: number;
};

export type QuestionOption = {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order: number;
};

export type Question = {
  id: string;
  quiz_id: string;
  question_text: string;
  explanation: string | null;
  order: number;
  question_options: QuestionOption[];
};

export type Progress = {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
};

export type QuizAttempt = {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  answers: Record<string, string>;
  attempted_at: string;
};

export type Bookmark = {
  id: string;
  user_id: string;
  lesson_id: string;
  created_at: string;
};

export type DailyActivity = {
  id: string;
  user_id: string;
  activity_date: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  level_type: 'grade' | 'interest_only';
  grade_id: string | null;
  role: 'student' | 'teacher' | 'admin';
  created_at: string;
};
