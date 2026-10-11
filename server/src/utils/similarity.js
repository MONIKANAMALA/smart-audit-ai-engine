/**
 * Cosine similarity utility for 8-dimensional semantic vectors.
 * These are deterministic simulated semantic features, not genuine LLM embeddings.
 */

function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
    throw new Error('Both arguments must be arrays');
  }
  if (vecA.length !== 8 || vecB.length !== 8) {
    throw new Error('Both vectors must have exactly 8 dimensions');
  }

  // Validate all values are finite numbers
  for (let i = 0; i < 8; i++) {
    if (!Number.isFinite(vecA[i]) || !Number.isFinite(vecB[i])) {
      throw new Error('All vector components must be finite numbers');
    }
  }

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < 8; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  // Handle zero-magnitude vectors
  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct / (magA * magB);
}

module.exports = { cosineSimilarity };
