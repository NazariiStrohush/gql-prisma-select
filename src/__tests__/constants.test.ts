import { DEFAULT_PATHS } from '../constants';

describe('Constants', () => {
  describe('DEFAULT_PATHS', () => {
    it('should export DEFAULT_PATHS', () => {
      expect(DEFAULT_PATHS).toBeDefined();
    });

    it('should have Pagination path', () => {
      expect(DEFAULT_PATHS.Pagination).toBeDefined();
      expect(Array.isArray(DEFAULT_PATHS.Pagination)).toBe(true);
      expect(DEFAULT_PATHS.Pagination).toEqual(['collection']);
    });
  });
});

