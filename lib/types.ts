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
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by: string | null;
  rejection_reason: string | null;
  language?: 'Amharic' | 'English' | 'Both';
  tags?: string[];
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
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by: string | null;
  rejection_reason: string | null;
  font?: 'sans' | 'serif' | 'ethiopic' | 'mono';
  text_size?: 'sm' | 'md' | 'lg';
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
  question_type?: 'multiple_choice' | 'true_false' | 'short_answer';
  correct_text?: string | null;
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
  account_type?: 'student' | 'parent';
  visibility?: 'private' | 'public';
  bio?: string;
  telegram_username?: string | null;
  notify_jobs?: boolean;
  notify_competitions?: boolean;
  created_at: string;
};

export type Job = {
  id: string;
  poster_id: string;
  poster_name: string;
  subject: string;
  grade: string | null;
  mode: string;
  budget: number;
  description: string;
  status: 'open' | 'filled' | 'closed';
  tutor_id: string | null;
  city: string | null;
  area: string | null;
  schedule: string | null;
  sessions_per_week: number;
  language: string;
  gender_pref?: 'any' | 'male' | 'female';
  created_at: string;
};

export type JobApplication = {
  id: string;
  job_id: string;
  applicant_id: string;
  applicant_name: string;
  message: string;
  rate: number;
  created_at: string;
};

export type Competition = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  created_by: string;
  created_at: string;
  access: 'open' | 'code' | 'approval';
  entry_fee: number;
  payment_info: string;
  time_limit_min: number;
  prize_1: string;
  prize_2: string;
  prize_3: string;
  status: 'draft' | 'published' | 'finalized';
  course_id?: string | null;
  course_title?: string | null;
};

export type LeaderboardRow = { rank: number; name: string; score: number; total: number; duration_seconds: number; is_me: boolean };
export type CompEntry = { id: string; user_id: string; user_name: string; status: 'pending' | 'approved' | 'rejected'; payment_ref: string; created_at: string };
export type CompAttempt = { id: string; submitted_at: string | null; score: number | null; total: number | null; duration_seconds: number | null };
export type CompWinner = { rank: number; user_id: string; name: string; prize: string; phone: string; paid: boolean; paid_at?: string | null; payment_ref?: string; verified?: boolean };
export type PublicWinner = { rank: number; name: string; prize: string; paid: boolean };
export type WinnerRemoval = { id: number; user_name: string; rank: number; prize: string; phone: string; was_verified: boolean; was_paid: boolean; payment_ref: string; reason: string; removed_by_name: string; removed_at: string };
export type ManageQuestion = { id: string; body: string; position: number; competition_options: { id: string; body: string; is_correct: boolean; position: number }[] };
export type PlayQuestion = { id: string; body: string; options: { id: string; body: string }[]; deadline: string; submitted: boolean };

export type ManageAttempt = { user_id: string; score: number | null; total: number | null; duration_seconds: number | null; submitted_at: string | null; disqualified: boolean; dq_reason: string };
export type Report = { id: string; kind: string; target: string; note: string; resolved: boolean; created_at: string };

export type TutorStatus = 'draft' | 'pending' | 'verified' | 'rejected' | 'suspended';
export type TutorProfile = {
  user_id: string; status: TutorStatus; legal_name: string; phone: string; city: string; area: string;
  subjects: string[]; levels: string[]; languages: string[]; education: string; institution: string;
  gender?: 'male' | 'female' | null;
  field_of_study: string; national_exam: string; experience_years: number; bio: string;
  mode: 'Online' | 'In person' | 'Both'; rate: number; availability: string; visible: boolean;
  id_doc: string | null; education_doc: string | null; exam_doc: string | null; other_doc: string | null;
  admin_note: string; assessment_score: number | null; recommended: boolean;
  submitted_at: string | null; verified_at: string | null;
};
export type TutorCard = {
  user_id: string; name: string; city: string; subjects: string[]; levels: string[]; languages: string[];
  mode: string; rate: number; experience_years: number; education: string; recommended: boolean;
};
export type TutorPublic = TutorCard & { field_of_study: string; bio: string; availability: string };
export type ServiceRequest = {
  id: string; requester_id: string; requester_name: string; kind: 'tutor' | 'other'; tutor_id: string | null;
  subject: string; grade: string | null; mode: string; city: string | null; area: string | null; schedule: string | null;
  budget: number; description: string; status: 'new' | 'reviewing' | 'matched' | 'closed'; admin_note: string;
  contact_phone?: string; gender_pref?: 'any' | 'male' | 'female';
  job_id: string | null; created_at: string;
};
export type PublicProfile = { name: string; bio: string; grade_name: string | null; account_type: string };
