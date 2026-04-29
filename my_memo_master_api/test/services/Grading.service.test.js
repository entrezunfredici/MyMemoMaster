const GradingService = require('../../services/Grading.service');

describe('GradingService', () => {
  describe('normalizeText', () => {
    it('should normalize text: trim, lowercase, collapse spaces', () => {
      const text = '  1er  SEPTEMBRE   1939  ';
      const result = GradingService.normalizeText(text);
      expect(result).toBe('1er septembre 1939');
    });

    it('should return empty string for null or non-string input', () => {
      expect(GradingService.normalizeText(null)).toBe('');
      expect(GradingService.normalizeText(undefined)).toBe('');
      expect(GradingService.normalizeText(123)).toBe('');
    });
  });

  describe('parseDateSafe', () => {
    it('should parse ISO date format YYYY-MM-DD', () => {
      const result = GradingService.parseDateSafe('1939-09-01');
      expect(result).toEqual({ year: 1939, month: 9, day: 1 });
    });

    it('should parse a year-only string', () => {
      const result = GradingService.parseDateSafe('1939');
      expect(result).toEqual({ year: 1939, month: null, day: null });
    });

    it('should return null for invalid input', () => {
      const result = GradingService.parseDateSafe('invalid date');
      expect(result).toBeNull();
    });

    it('should return null for null or non-string input', () => {
      expect(GradingService.parseDateSafe(null)).toBeNull();
      expect(GradingService.parseDateSafe(undefined)).toBeNull();
      expect(GradingService.parseDateSafe(123)).toBeNull();
    });

    it('should parse dates with non-ambiguous month names', () => {
      const result = GradingService.parseDateSafe('01 sep 1939');
      expect(result).toEqual({ year: 1939, month: 9, day: 1 });
    });

    it('should parse dates with full French month names', () => {
      const result = GradingService.parseDateSafe('01 septembre 1939');
      expect(result).toEqual({ year: 1939, month: 9, day: 1 });
    });
  });

  describe('gradeDateAnswer', () => {
    it('should return correct=true when year matches (year-only comparison)', () => {
      const result = GradingService.gradeDateAnswer('1939', '01 sep 1939');
      expect(result.is_correct).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.strategy).toBe('date');
      expect(result.explanation).toContain('1939');
    });

    it('should return correct=true when dates match fully (with month names)', () => {
      const result = GradingService.gradeDateAnswer(
        '01 sep 1939',
        '01 september 1939'
      );
      expect(result.is_correct).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.strategy).toBe('date');
    });

    it('should return correct=false when years do not match', () => {
      const result = GradingService.gradeDateAnswer('1980', '1940');
      expect(result.is_correct).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.strategy).toBe('date');
    });

    it('should return correct=false when dates do not match', () => {
      const result = GradingService.gradeDateAnswer(
        '1939-09-01',
        '1939-09-02'
      );
      expect(result.is_correct).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.strategy).toBe('date');
    });

    it('should fallback to text comparison when dates cannot be parsed', () => {
      const result = GradingService.gradeDateAnswer(
        'the year of world war two',
        'the year of world war two'
      );
      expect(result.is_correct).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.strategy).toBe('date');
    });

    it('should return an explanation message', () => {
      const result = GradingService.gradeDateAnswer('1939', '1939');
      expect(result.explanation).toBeDefined();
      expect(typeof result.explanation).toBe('string');
    });

    it('should handle empty or null inputs gracefully', () => {
      const result1 = GradingService.gradeDateAnswer('', '');
      expect(result1.strategy).toBe('date');

      const result2 = GradingService.gradeDateAnswer(null, null);
      expect(result2.strategy).toBe('date');
    });

    it('should always return strategy as "date"', () => {
      const tests = [
        ['1939', '1939'],
        ['01 sep 1939', '01 sep 1939'],
        ['1980', '1940'],
        ['invalid', 'also invalid'],
      ];

      tests.forEach(([correct, student]) => {
        const result = GradingService.gradeDateAnswer(correct, student);
        expect(result.strategy).toBe('date');
      });
    });

    it('should compare years when one answer is year-only and other is full date', () => {
      const result = GradingService.gradeDateAnswer('1939', '01 sep 1939');
      expect(result.is_correct).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });
});
