/** Pure helpers shared by the teacher editor and covered by unit tests.
 * The authoritative student grading runs in the grade_quiz() SQL function,
 * using exactly the same short-answer rule as normalize/isShortAnswerCorrect. */

export function normalizeShortAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isShortAnswerCorrect(given: string, acceptedSpec: string | null | undefined): boolean {
  if (!acceptedSpec) return false;
  const target = normalizeShortAnswer(given);
  if (!target) return false;
  return acceptedSpec.split('|').map(normalizeShortAnswer).filter(Boolean).includes(target);
}
