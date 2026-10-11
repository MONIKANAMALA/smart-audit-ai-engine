const AIService = require('../src/services/AIService');

describe('AIService', () => {
  let service;

  beforeAll(() => {
    service = new AIService({ useMock: true, delay: 0 });
  });

  const baseEntry = {
    monetaryImpact: 100000,
    description: 'Standard transaction processing',
    controlId: 'CTRL-001',
    entityName: 'Test Corp',
    eventType: 'TRANSACTION'
  };

  test('returns all required fields', async () => {
    const result = await service.enrich(baseEntry);
    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('riskLevel');
    expect(result).toHaveProperty('aiSummary');
    expect(result).toHaveProperty('anomalyFlags');
    expect(result).toHaveProperty('semanticVector');
  });

  test('riskScore is between 0 and 100', async () => {
    const result = await service.enrich(baseEntry);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  test('riskLevel is consistent with riskScore', async () => {
    const result = await service.enrich(baseEntry);
    if (result.riskScore >= 70) expect(result.riskLevel).toBe('HIGH');
    else if (result.riskScore >= 40) expect(result.riskLevel).toBe('MEDIUM');
    else expect(result.riskLevel).toBe('LOW');
  });

  test('semanticVector has exactly 8 finite numbers', async () => {
    const result = await service.enrich(baseEntry);
    expect(result.semanticVector).toHaveLength(8);
    result.semanticVector.forEach(v => expect(Number.isFinite(v)).toBe(true));
  });

  test('produces deterministic results for same input', async () => {
    const r1 = await service.enrich(baseEntry);
    const r2 = await service.enrich(baseEntry);
    expect(r1.riskScore).toBe(r2.riskScore);
    expect(r1.riskLevel).toBe(r2.riskLevel);
    expect(r1.semanticVector).toEqual(r2.semanticVector);
  });

  test('high monetary impact generates higher risk', async () => {
    const lowEntry = { ...baseEntry, monetaryImpact: 1000 };
    const highEntry = { ...baseEntry, monetaryImpact: 1500000 };
    const lowResult = await service.enrich(lowEntry);
    const highResult = await service.enrich(highEntry);
    expect(highResult.riskScore).toBeGreaterThan(lowResult.riskScore);
  });

  test('fraud description triggers anomaly flags', async () => {
    const fraudEntry = { ...baseEntry, description: 'Unauthorized fraud override detected' };
    const result = await service.enrich(fraudEntry);
    expect(result.anomalyFlags).toContain('UNUSUAL_DESCRIPTION_PATTERN');
    expect(result.anomalyFlags).toContain('MANUAL_APPROVAL_OVERRIDE');
  });

  test('large monetary impact triggers threshold flag', async () => {
    const largeEntry = { ...baseEntry, monetaryImpact: 200000 };
    const result = await service.enrich(largeEntry);
    expect(result.anomalyFlags).toContain('MONETARY_THRESHOLD_EXCEEDED');
  });

  test('aiSummary is a non-empty string', async () => {
    const result = await service.enrich(baseEntry);
    expect(typeof result.aiSummary).toBe('string');
    expect(result.aiSummary.length).toBeGreaterThan(0);
  });
});
