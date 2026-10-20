import { describe, expect, it } from 'vitest';
import { GRADE_LEVELS } from '@/lib/grade-levels';

describe('grade levels (Daniel\'s note: KG to adult learner)', () => {
  it('starts at KG and ends at Adult learner', () => {
    expect(GRADE_LEVELS[0]).toBe('KG');
    expect(GRADE_LEVELS[GRADE_LEVELS.length - 1]).toBe('Adult learner');
  });
  it('contains every grade 1-12 in order, plus University', () => {
    for (let g = 1; g <= 12; g++) {
      expect(GRADE_LEVELS as readonly string[]).toContain(`Grade ${g}`);
      expect(GRADE_LEVELS.indexOf(`Grade ${g}` as never)).toBeLessThan(GRADE_LEVELS.length);
    }
    expect(GRADE_LEVELS).toContain('University');
  });
  it('has no duplicates', () => {
    expect(new Set(GRADE_LEVELS).size).toBe(GRADE_LEVELS.length);
  });
});
