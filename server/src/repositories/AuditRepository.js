const AuditEntry = require('../models/AuditEntry');

class AuditRepository {
  async create(data) {
    const entry = new AuditEntry(data);
    return entry.save();
  }

  async findAll(filter = {}) {
    const query = {};
    if (filter.status) {
      query['aiMetadata.status'] = filter.status;
    }
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      query.$or = [
        { entityName: regex },
        { description: regex },
        { evidenceId: regex }
      ];
    }
    return AuditEntry.find(query).sort({ created: -1 });
  }

  async findById(id) {
    return AuditEntry.findById(id);
  }

  async claimPendingEntry() {
    return AuditEntry.findOneAndUpdate(
      { 'aiMetadata.status': 'PENDING' },
      { $set: { 'aiMetadata.status': 'PROCESSING' } },
      { new: true, sort: { created: 1 } }
    );
  }

  async updateFields(id, setFields) {
    return AuditEntry.findByIdAndUpdate(
      id,
      { $set: setFields },
      { new: true, runValidators: true }
    );
  }

  async completeEnrichment(id, expectedFingerprint, aiResults) {
    // Only apply results if the core fingerprint hasn't changed
    return AuditEntry.findOneAndUpdate(
      {
        _id: id,
        coreFingerprint: expectedFingerprint,
        'aiMetadata.status': 'PROCESSING'
      },
      {
        $set: {
          'aiMetadata.status': 'COMPLETED',
          'aiMetadata.riskScore': aiResults.riskScore,
          'aiMetadata.riskLevel': aiResults.riskLevel,
          'aiMetadata.aiSummary': aiResults.aiSummary,
          'aiMetadata.anomalyFlags': aiResults.anomalyFlags,
          'aiMetadata.semanticVector': aiResults.semanticVector
        }
      },
      { new: true }
    );
  }

  async markFailed(id, errorMessage) {
    return AuditEntry.findByIdAndUpdate(
      id,
      {
        $set: {
          'aiMetadata.status': 'FAILED',
          'aiMetadata.aiSummary': `Processing failed: ${errorMessage}`
        }
      },
      { new: true }
    );
  }

  async findCompletedWithVectors(excludeId) {
    return AuditEntry.find({
      _id: { $ne: excludeId },
      'aiMetadata.status': 'COMPLETED',
      'aiMetadata.semanticVector': { $size: 8 }
    });
  }

  async recoverStaleProcessing(staleMinutes = 5) {
    const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
    return AuditEntry.updateMany(
      {
        'aiMetadata.status': 'PROCESSING',
        updated: { $lt: cutoff }
      },
      { $set: { 'aiMetadata.status': 'PENDING' } }
    );
  }
}

module.exports = AuditRepository;
