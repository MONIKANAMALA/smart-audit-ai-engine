const AuditRepository = require('../repositories/AuditRepository');
const { cosineSimilarity } = require('../utils/similarity');

const CORE_FIELDS = ['monetaryImpact', 'description', 'controlId'];
const ALLOWED_UPDATE_FIELDS = ['eventType', 'evidenceId', 'entityName', 'description', 'monetaryImpact', 'controlId', 'actorUserId', 'tenantId'];

class AuditController {
  constructor(options = {}) {
    this.repository = options.repository || new AuditRepository();
  }

  async createEntry(req, res) {
    try {
      const { eventType, evidenceId, entityName, description, monetaryImpact, controlId, actorUserId, tenantId, auditorNotes } = req.body;

      // Validate required fields
      const requiredFields = { eventType, evidenceId, entityName, description, monetaryImpact, controlId, actorUserId, tenantId };
      const missing = Object.entries(requiredFields)
        .filter(([, v]) => v === undefined || v === null || v === '')
        .map(([k]) => k);

      if (missing.length > 0) {
        return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
      }

      if (typeof monetaryImpact !== 'number' || monetaryImpact < 0) {
        return res.status(400).json({ error: 'monetaryImpact must be a non-negative number' });
      }

      const entryData = {
        eventType, evidenceId, entityName, description, monetaryImpact, controlId, actorUserId, tenantId,
        aiMetadata: {
          status: 'PENDING',
          riskScore: null,
          riskLevel: null,
          aiSummary: null,
          anomalyFlags: [],
          semanticVector: [],
          auditorNotes: auditorNotes || ''
        }
      };

      const entry = await this.repository.create(entryData);
      return res.status(201).json(entry);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: 'An entry with this evidenceId already exists' });
      }
      console.error('Create entry error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async listEntries(req, res) {
    try {
      const { status, search } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (search) filter.search = search;
      const entries = await this.repository.findAll(filter);
      return res.json(entries);
    } catch (error) {
      console.error('List entries error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getEntry(req, res) {
    try {
      const entry = await this.repository.findById(req.params.id);
      if (!entry) {
        return res.status(404).json({ error: 'Audit entry not found' });
      }
      return res.json(entry);
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid entry ID format' });
      }
      console.error('Get entry error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateEntry(req, res) {
    try {
      const existing = await this.repository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Audit entry not found' });
      }

      const body = req.body;

      // Reject attempts to directly set AI metadata fields
      const forbiddenFields = ['aiMetadata', 'riskScore', 'riskLevel', 'aiSummary', 'anomalyFlags', 'semanticVector', 'coreFingerprint', '_id', 'created'];
      for (const field of forbiddenFields) {
        if (body[field] !== undefined) {
          return res.status(400).json({ error: `Cannot directly set field: ${field}` });
        }
      }

      // Check which core fields actually changed
      let coreChanged = false;
      for (const field of CORE_FIELDS) {
        if (body[field] !== undefined && body[field] !== existing[field]) {
          // Special comparison for monetaryImpact (numbers)
          if (field === 'monetaryImpact') {
            if (Number(body[field]) !== existing[field]) {
              coreChanged = true;
              break;
            }
          } else {
            coreChanged = true;
            break;
          }
        }
      }

      // Check auditorNotes change
      const notesChanged = body.auditorNotes !== undefined &&
        body.auditorNotes !== (existing.aiMetadata?.auditorNotes || '');

      if (!coreChanged && !notesChanged) {
        // Nothing actually changed
        return res.json(existing);
      }

      const setFields = {};

      // Apply allowed baseline field updates
      for (const field of ALLOWED_UPDATE_FIELDS) {
        if (body[field] !== undefined) {
          setFields[field] = body[field];
        }
      }

      // Handle auditor notes
      if (notesChanged) {
        setFields['aiMetadata.auditorNotes'] = body.auditorNotes;
      }

      if (coreChanged) {
        // Core field changed -> reset AI metadata, schedule reprocessing
        setFields['aiMetadata.status'] = 'PENDING';
        setFields['aiMetadata.riskScore'] = null;
        setFields['aiMetadata.riskLevel'] = null;
        setFields['aiMetadata.aiSummary'] = null;
        setFields['aiMetadata.anomalyFlags'] = [];
        setFields['aiMetadata.semanticVector'] = [];

        // Recompute fingerprint for the new core values
        const crypto = require('crypto');
        const newMonetary = body.monetaryImpact !== undefined ? body.monetaryImpact : existing.monetaryImpact;
        const newDesc = body.description !== undefined ? body.description : existing.description;
        const newControl = body.controlId !== undefined ? body.controlId : existing.controlId;
        const fpData = `${newMonetary}|${newDesc}|${newControl}`;
        setFields.coreFingerprint = crypto.createHash('md5').update(fpData).digest('hex');
      }

      const updated = await this.repository.updateFields(req.params.id, setFields);
      return res.json(updated);
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid entry ID format' });
      }
      console.error('Update entry error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async findSimilar(req, res) {
    try {
      const source = await this.repository.findById(req.params.id);
      if (!source) {
        return res.status(404).json({ error: 'Audit entry not found' });
      }

      const sourceVector = source.aiMetadata?.semanticVector;
      if (!sourceVector || sourceVector.length !== 8) {
        return res.status(400).json({ error: 'Source entry does not have a valid 8-dimensional semantic vector. Entry must be COMPLETED first.' });
      }

      const candidates = await this.repository.findCompletedWithVectors(source._id);

      const results = candidates
        .map(candidate => {
          const similarity = cosineSimilarity(sourceVector, candidate.aiMetadata.semanticVector);
          return {
            _id: candidate._id,
            evidenceId: candidate.evidenceId,
            entityName: candidate.entityName,
            description: candidate.description,
            monetaryImpact: candidate.monetaryImpact,
            riskLevel: candidate.aiMetadata.riskLevel,
            riskScore: candidate.aiMetadata.riskScore,
            similarity: parseFloat((similarity * 100).toFixed(2))
          };
        })
        .filter(r => !isNaN(r.similarity))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      return res.json({ source: source.evidenceId, results });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid entry ID format' });
      }
      console.error('Find similar error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = AuditController;
