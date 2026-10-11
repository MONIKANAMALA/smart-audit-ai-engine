class AIService {
  constructor(options = {}) {
    this.useMock = options.useMock !== false;
    this.delay = options.delay || parseInt(process.env.AI_PROCESSING_DELAY_MS) || 400;
  }

  async enrich(auditEntry) {
    if (this.useMock) {
      return this._mockEnrich(auditEntry);
    }
    throw new Error('Real AI integration not configured. Set MOCK_AI=true.');
  }

  async _mockEnrich(auditEntry) {
    // Simulated processing delay
    await new Promise(resolve => setTimeout(resolve, this.delay));

    const { monetaryImpact, description, controlId } = auditEntry;

    // --- Deterministic risk score ---
    let riskScore = 0;

    // Monetary impact contribution (0-50 points)
    if (monetaryImpact > 1000000) riskScore += 50;
    else if (monetaryImpact > 500000) riskScore += 40;
    else if (monetaryImpact > 100000) riskScore += 30;
    else if (monetaryImpact > 50000) riskScore += 20;
    else if (monetaryImpact > 10000) riskScore += 10;
    else riskScore += 5;

    // Description-based contribution (0-30 points)
    const descLower = (description || '').toLowerCase();
    const highRiskTerms = ['fraud', 'unauthorized', 'override', 'suspicious', 'breach', 'violation'];
    const medRiskTerms = ['manual', 'adjustment', 'exception', 'deviation', 'variance'];
    const lowRiskTerms = ['routine', 'standard', 'normal', 'regular', 'scheduled'];

    let descPoints = 15; // baseline
    for (const term of highRiskTerms) {
      if (descLower.includes(term)) { descPoints = 30; break; }
    }
    if (descPoints === 15) {
      for (const term of medRiskTerms) {
        if (descLower.includes(term)) { descPoints = 20; break; }
      }
    }
    if (descPoints === 15) {
      for (const term of lowRiskTerms) {
        if (descLower.includes(term)) { descPoints = 5; break; }
      }
    }
    riskScore += descPoints;

    // Control ID contribution (0-20 points)
    const controlHash = this._simpleHash(controlId || 'default');
    riskScore += (controlHash % 21);

    // Clamp
    riskScore = Math.min(100, Math.max(0, riskScore));

    // --- Risk level ---
    let riskLevel;
    if (riskScore >= 70) riskLevel = 'HIGH';
    else if (riskScore >= 40) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    // --- AI Summary ---
    const entity = auditEntry.entityName || 'the entity';
    const amountStr = monetaryImpact ? `$${monetaryImpact.toLocaleString()}` : 'an unspecified amount';
    let aiSummary;
    if (riskLevel === 'HIGH') {
      aiSummary = `High-risk audit finding for ${entity} involving ${amountStr}. Immediate review recommended due to elevated risk indicators in the transaction pattern.`;
    } else if (riskLevel === 'MEDIUM') {
      aiSummary = `Moderate risk detected for ${entity} with ${amountStr} impact. The transaction shows some deviation from standard patterns and warrants further review.`;
    } else {
      aiSummary = `Low-risk entry for ${entity} involving ${amountStr}. The transaction appears consistent with established control procedures.`;
    }

    // --- Anomaly flags ---
    const anomalyFlags = [];
    if (monetaryImpact > 100000) anomalyFlags.push('MONETARY_THRESHOLD_EXCEEDED');
    if (descLower.includes('override') || descLower.includes('manual')) anomalyFlags.push('MANUAL_APPROVAL_OVERRIDE');
    if (highRiskTerms.some(t => descLower.includes(t))) anomalyFlags.push('UNUSUAL_DESCRIPTION_PATTERN');
    if (monetaryImpact > 500000) anomalyFlags.push('LARGE_TRANSACTION_ALERT');

    // --- Deterministic semantic vector (8 dimensions) ---
    const semanticVector = this._generateSemanticVector(auditEntry);

    return {
      riskScore,
      riskLevel,
      aiSummary,
      anomalyFlags,
      semanticVector
    };
  }

  _generateSemanticVector(entry) {
    const { monetaryImpact, description, controlId, entityName, eventType } = entry;
    const descLower = (description || '').toLowerCase();

    // Dimension 0: Monetary magnitude (normalized log scale)
    const d0 = monetaryImpact > 0 ? Math.min(1, Math.log10(monetaryImpact) / 7) : 0;

    // Dimension 1: Description length complexity
    const d1 = Math.min(1, (description || '').length / 200);

    // Dimension 2: Risk keyword density
    const riskTerms = ['fraud', 'unauthorized', 'override', 'suspicious', 'breach', 'violation', 'manual', 'adjustment', 'exception'];
    const matches = riskTerms.filter(t => descLower.includes(t)).length;
    const d2 = Math.min(1, matches / 3);

    // Dimension 3: Control ID hash (deterministic)
    const d3 = (this._simpleHash(controlId || '') % 100) / 100;

    // Dimension 4: Entity name hash
    const d4 = (this._simpleHash(entityName || '') % 100) / 100;

    // Dimension 5: Event type signal
    const eventTypes = { 'TRANSACTION': 0.2, 'ADJUSTMENT': 0.5, 'OVERRIDE': 0.8, 'REVIEW': 0.3, 'APPROVAL': 0.4 };
    const d5 = eventTypes[(eventType || '').toUpperCase()] || 0.5;

    // Dimension 6: Monetary risk band
    let d6 = 0.1;
    if (monetaryImpact > 1000000) d6 = 1.0;
    else if (monetaryImpact > 500000) d6 = 0.8;
    else if (monetaryImpact > 100000) d6 = 0.6;
    else if (monetaryImpact > 50000) d6 = 0.4;
    else if (monetaryImpact > 10000) d6 = 0.2;

    // Dimension 7: Description sentiment hash
    const d7 = (this._simpleHash(descLower) % 100) / 100;

    // Normalize the vector
    const raw = [d0, d1, d2, d3, d4, d5, d6, d7];
    const magnitude = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125];
    return raw.map(v => parseFloat((v / magnitude).toFixed(6)));
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

module.exports = AIService;
