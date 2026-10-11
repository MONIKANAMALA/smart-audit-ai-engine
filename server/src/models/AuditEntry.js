const mongoose = require('mongoose');

const auditEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  eventType: { type: String, required: true, trim: true },
  evidenceId: { type: String, required: true, unique: true, trim: true },
  entityName: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  monetaryImpact: { type: Number, required: true, min: 0 },
  controlId: { type: String, required: true, trim: true },
  actorUserId: { type: String, required: true, trim: true },
  tenantId: { type: String, required: true, trim: true },
  aiMetadata: {
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING'
    },
    riskScore: { type: Number, default: null },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', null], default: null },
    aiSummary: { type: String, default: null },
    anomalyFlags: { type: [String], default: [] },
    semanticVector: { type: [Number], default: [] },
    auditorNotes: { type: String, default: '' }
  },
  coreFingerprint: { type: String, default: '' }
}, {
  timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

// Generate a fingerprint from core fields for concurrency control
auditEntrySchema.methods.computeCoreFingerprint = function() {
  const crypto = require('crypto');
  const data = `${this.monetaryImpact}|${this.description}|${this.controlId}`;
  return crypto.createHash('md5').update(data).digest('hex');
};

auditEntrySchema.pre('save', function(next) {
  const crypto = require('crypto');
  const data = `${this.monetaryImpact}|${this.description}|${this.controlId}`;
  this.coreFingerprint = crypto.createHash('md5').update(data).digest('hex');
  next();
});

const AuditEntry = mongoose.model('AuditEntry', auditEntrySchema);
module.exports = AuditEntry;
