import { describe, expect, it } from 'vitest';
import { isShortAnswerCorrect, normalizeShortAnswer } from '@/lib/quiz-grading';

describe('short-answer grading (mirrors grade_quiz in SQL)', () => {
  it('trims, lowercases and collapses whitespace', () => {
    expect(normalizeShortAnswer('  Addis   Ababa ')).toBe('addis ababa');
  });
  it('accepts any alternative separated by |', () => {
    expect(isShortAnswerCorrect('addis abeba', 'Addis Ababa | Addis Abeba')).toBe(true);
    expect(isShortAnswerCorrect('ADDIS ABABA', 'Addis Ababa | Addis Abeba')).toBe(true);
  });
  it('rejects wrong or empty answers', () => {
    expect(isShortAnswerCorrect('Gondar', 'Addis Ababa')).toBe(false);
    expect(isShortAnswerCorrect('   ', 'Addis Ababa')).toBe(false);
    expect(isShortAnswerCorrect('Addis Ababa', '')).toBe(false);
    expect(isShortAnswerCorrect('Addis Ababa', null)).toBe(false);
  });
});
