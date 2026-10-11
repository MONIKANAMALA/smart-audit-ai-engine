const AuditController = require('../src/controllers/AuditController');

// Mock repository
class MockRepository {
  constructor() {
    this.entries = new Map();
    this.idCounter = 1;
  }

  async create(data) {
    const crypto = require('crypto');
    const id = `mock-id-${this.idCounter++}`;
    const fpData = `${data.monetaryImpact}|${data.description}|${data.controlId}`;
    const entry = {
      _id: id,
      ...data,
      coreFingerprint: crypto.createHash('md5').update(fpData).digest('hex'),
      created: new Date(),
      updated: new Date(),
      toJSON() { return { ...this }; }
    };
    this.entries.set(id, entry);
    return entry;
  }

  async findById(id) {
    return this.entries.get(id) || null;
  }

  async findAll() {
    return Array.from(this.entries.values());
  }

  async updateFields(id, setFields) {
    const entry = this.entries.get(id);
    if (!entry) return null;
    for (const [key, value] of Object.entries(setFields)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let obj = entry;
        for (let i = 0; i < parts.length - 1; i++) {
          obj = obj[parts[i]];
        }
        obj[parts[parts.length - 1]] = value;
      } else {
        entry[key] = value;
      }
    }
    entry.updated = new Date();
    return entry;
  }

  async findCompletedWithVectors(excludeId) {
    return Array.from(this.entries.values()).filter(e =>
      e._id !== excludeId &&
      e.aiMetadata?.status === 'COMPLETED' &&
      e.aiMetadata?.semanticVector?.length === 8
    );
  }
}

describe('AuditController - Smart Delta Update', () => {
  let controller, repo;

  beforeEach(async () => {
    repo = new MockRepository();
    controller = new AuditController({ repository: repo });
  });

  const mockRes = () => {
    const res = { statusCode: 200, data: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
  };

  test('create entry returns 201 with PENDING status', async () => {
    const req = {
      body: {
        eventType: 'TRANSACTION', evidenceId: 'E001', entityName: 'Corp',
        description: 'Test', monetaryImpact: 10000, controlId: 'C001',
        actorUserId: 'U001', tenantId: 'T001'
      }
    };
    const res = mockRes();
    await controller.createEntry(req, res);
    expect(res.statusCode).toBe(201);
    expect(res.data.aiMetadata.status).toBe('PENDING');
  });

  test('core field change triggers reprocessing', async () => {
    // Create entry
    const createReq = {
      body: {
        eventType: 'TRANSACTION', evidenceId: 'E002', entityName: 'Corp',
        description: 'Original description', monetaryImpact: 10000, controlId: 'C001',
        actorUserId: 'U001', tenantId: 'T001'
      }
    };
    const createRes = mockRes();
    await controller.createEntry(createReq, createRes);
    const id = createRes.data._id;

    // Simulate completed processing
    await repo.updateFields(id, {
      'aiMetadata.status': 'COMPLETED',
      'aiMetadata.riskScore': 45,
      'aiMetadata.riskLevel': 'MEDIUM'
    });

    // Update core field
    const updateReq = {
      params: { id },
      body: { description: 'Changed description with fraud indicators' }
    };
    const updateRes = mockRes();
    await controller.updateEntry(updateReq, updateRes);
    expect(updateRes.data.aiMetadata.status).toBe('PENDING');
    expect(updateRes.data.aiMetadata.riskScore).toBeNull();
  });

  test('unchanged core field does not trigger reprocessing', async () => {
    const createReq = {
      body: {
        eventType: 'TRANSACTION', evidenceId: 'E003', entityName: 'Corp',
        description: 'Same description', monetaryImpact: 10000, controlId: 'C001',
        actorUserId: 'U001', tenantId: 'T001'
      }
    };
    const createRes = mockRes();
    await controller.createEntry(createReq, createRes);
    const id = createRes.data._id;

    await repo.updateFields(id, {
      'aiMetadata.status': 'COMPLETED',
      'aiMetadata.riskScore': 45
    });

    // Send same value
    const updateReq = {
      params: { id },
      body: { description: 'Same description' }
    };
    const updateRes = mockRes();
    await controller.updateEntry(updateReq, updateRes);
    expect(updateRes.data.aiMetadata.status).toBe('COMPLETED');
    expect(updateRes.data.aiMetadata.riskScore).toBe(45);
  });

  test('auditor notes update preserves AI status', async () => {
    const createReq = {
      body: {
        eventType: 'TRANSACTION', evidenceId: 'E004', entityName: 'Corp',
        description: 'Test', monetaryImpact: 10000, controlId: 'C001',
        actorUserId: 'U001', tenantId: 'T001'
      }
    };
    const createRes = mockRes();
    await controller.createEntry(createReq, createRes);
    const id = createRes.data._id;

    await repo.updateFields(id, {
      'aiMetadata.status': 'COMPLETED',
      'aiMetadata.riskScore': 60,
      'aiMetadata.riskLevel': 'MEDIUM',
      'aiMetadata.aiSummary': 'Some summary'
    });

    const updateReq = {
      params: { id },
      body: { auditorNotes: 'Reviewed and approved by manager' }
    };
    const updateRes = mockRes();
    await controller.updateEntry(updateReq, updateRes);
    expect(updateRes.data.aiMetadata.status).toBe('COMPLETED');
    expect(updateRes.data.aiMetadata.riskScore).toBe(60);
    expect(updateRes.data.aiMetadata.auditorNotes).toBe('Reviewed and approved by manager');
  });

  test('rejects setting AI metadata directly', async () => {
    const createReq = {
      body: {
        eventType: 'TRANSACTION', evidenceId: 'E005', entityName: 'Corp',
        description: 'Test', monetaryImpact: 10000, controlId: 'C001',
        actorUserId: 'U001', tenantId: 'T001'
      }
    };
    const createRes = mockRes();
    await controller.createEntry(createReq, createRes);
    const id = createRes.data._id;

    const updateReq = {
      params: { id },
      body: { aiMetadata: { status: 'COMPLETED', riskScore: 100 } }
    };
    const updateRes = mockRes();
    await controller.updateEntry(updateReq, updateRes);
    expect(updateRes.statusCode).toBe(400);
  });

  test('returns 400 for missing required fields', async () => {
    const req = {
      body: { eventType: 'TRANSACTION' } // missing many fields
    };
    const res = mockRes();
    await controller.createEntry(req, res);
    expect(res.statusCode).toBe(400);
  });

  test('returns 404 for nonexistent entry', async () => {
    const req = { params: { id: 'nonexistent' } };
    const res = mockRes();
    await controller.getEntry(req, res);
    expect(res.statusCode).toBe(404);
  });
});
