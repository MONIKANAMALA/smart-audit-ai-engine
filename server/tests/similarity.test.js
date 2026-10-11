const { cosineSimilarity } = require('../src/utils/similarity');

describe('Cosine Similarity', () => {
  test('identical vectors return 1', () => {
    const v = [0.5, 0.3, 0.2, 0.1, 0.4, 0.6, 0.7, 0.8];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  test('orthogonal vectors return 0', () => {
    const a = [1, 0, 0, 0, 0, 0, 0, 0];
    const b = [0, 1, 0, 0, 0, 0, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  test('opposite vectors return -1', () => {
    const a = [1, 0, 0, 0, 0, 0, 0, 0];
    const b = [-1, 0, 0, 0, 0, 0, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  test('handles zero-magnitude vector safely', () => {
    const a = [0.5, 0.3, 0.2, 0.1, 0.4, 0.6, 0.7, 0.8];
    const zero = [0, 0, 0, 0, 0, 0, 0, 0];
    expect(cosineSimilarity(a, zero)).toBe(0);
  });

  test('rejects vectors not of length 8', () => {
    expect(() => cosineSimilarity([1, 2, 3], [4, 5, 6])).toThrow();
  });

  test('rejects non-finite values', () => {
    const valid = [1, 2, 3, 4, 5, 6, 7, 8];
    const invalid = [1, 2, NaN, 4, 5, 6, 7, 8];
    expect(() => cosineSimilarity(valid, invalid)).toThrow();
  });

  test('similar vectors have higher similarity than dissimilar ones', () => {
    const base = [0.5, 0.3, 0.2, 0.1, 0.4, 0.6, 0.7, 0.8];
    const similar = [0.55, 0.32, 0.18, 0.12, 0.42, 0.58, 0.72, 0.78];
    const different = [0.1, 0.9, 0.8, 0.7, 0.05, 0.1, 0.15, 0.2];

    const simScore = cosineSimilarity(base, similar);
    const diffScore = cosineSimilarity(base, different);
    expect(simScore).toBeGreaterThan(diffScore);
  });
});
