/** Every level a parent can ask for and a job can be posted at: KG to adult.
 * Used by the request form and the job poster so the two never drift apart. */
export const GRADE_LEVELS = [
  'KG',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  'University',
  'Adult learner',
] as const;

export type GradeLevel = (typeof GRADE_LEVELS)[number];
