const AuditRepository = require('../repositories/AuditRepository');
const AIService = require('../services/AIService');

class AIWorkerService {
  constructor(options = {}) {
    this.repository = options.repository || new AuditRepository();
    this.aiService = options.aiService || new AIService({
      useMock: process.env.MOCK_AI !== 'false',
      delay: parseInt(process.env.AI_PROCESSING_DELAY_MS) || 400
    });
    this.pollInterval = options.pollInterval || parseInt(process.env.AI_WORKER_POLL_INTERVAL_MS) || 1000;
    this.isRunning = false;
    this.timer = null;
  }

  start() {
    if (this.isRunning) {
      console.log('AIWorkerService: Already running, skipping duplicate start.');
      return;
    }
    this.isRunning = true;
    console.log(`AIWorkerService: Started (poll interval: ${this.pollInterval}ms)`);
    this._poll();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('AIWorkerService: Stopped.');
  }

  async _poll() {
    if (!this.isRunning) return;

    try {
      // Recover stale PROCESSING entries
      await this.repository.recoverStaleProcessing(5);

      // Claim a pending entry atomically
      const entry = await this.repository.claimPendingEntry();

      if (entry) {
        console.log(`AIWorkerService: Processing entry ${entry.evidenceId}`);
        await this._processEntry(entry);
      }
    } catch (error) {
      console.error('AIWorkerService: Poll error:', error.message);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.timer = setTimeout(() => this._poll(), this.pollInterval);
    }
  }

  async _processEntry(entry) {
    const fingerprint = entry.coreFingerprint;

    try {
      const aiResults = await this.aiService.enrich(entry);

      // Attempt to complete - uses fingerprint to prevent overwriting newer data
      const updated = await this.repository.completeEnrichment(
        entry._id,
        fingerprint,
        aiResults
      );

      if (!updated) {
        console.log(`AIWorkerService: Stale results discarded for ${entry.evidenceId} (core data changed during processing).`);
        // The entry's core data changed during processing.
        // It will be picked up again as PENDING.
      } else {
        console.log(`AIWorkerService: Completed enrichment for ${entry.evidenceId} (risk: ${aiResults.riskLevel}, score: ${aiResults.riskScore})`);
      }
    } catch (error) {
      console.error(`AIWorkerService: Failed to process ${entry.evidenceId}:`, error.message);
      try {
        await this.repository.markFailed(entry._id, error.message);
      } catch (markError) {
        console.error('AIWorkerService: Failed to mark entry as FAILED:', markError.message);
      }
    }
  }
}

module.exports = AIWorkerService;
