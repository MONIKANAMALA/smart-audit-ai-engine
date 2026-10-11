require('dotenv').config();
const mongoose = require('mongoose');
const AuditEntry = require('../src/models/AuditEntry');
const AIService = require('../src/services/AIService');

const seedData = [
  {
    eventType: 'TRANSACTION',
    evidenceId: 'AUD-2024-001',
    entityName: 'Acme Corp',
    description: 'Large wire transfer with manual approval override detected during quarterly review',
    monetaryImpact: 750000,
    controlId: 'CTRL-FIN-001',
    actorUserId: 'user-jsmith',
    tenantId: 'tenant-001'
  },
  {
    eventType: 'ADJUSTMENT',
    evidenceId: 'AUD-2024-002',
    entityName: 'Global Industries',
    description: 'Revenue adjustment exceeding threshold with variance from forecast',
    monetaryImpact: 250000,
    controlId: 'CTRL-FIN-002',
    actorUserId: 'user-mjones',
    tenantId: 'tenant-001'
  },
  {
    eventType: 'TRANSACTION',
    evidenceId: 'AUD-2024-003',
    entityName: 'TechStart LLC',
    description: 'Routine monthly vendor payment processed through standard channels',
    monetaryImpact: 15000,
    controlId: 'CTRL-PAY-001',
    actorUserId: 'user-klee',
    tenantId: 'tenant-002'
  },
  {
    eventType: 'OVERRIDE',
    evidenceId: 'AUD-2024-004',
    entityName: 'Summit Financial',
    description: 'Unauthorized access attempt followed by suspicious transaction pattern detected',
    monetaryImpact: 1200000,
    controlId: 'CTRL-SEC-001',
    actorUserId: 'user-rbrown',
    tenantId: 'tenant-001'
  },
  {
    eventType: 'REVIEW',
    evidenceId: 'AUD-2024-005',
    entityName: 'Acme Corp',
    description: 'Manual journal entry adjustment for intercompany reconciliation exception',
    monetaryImpact: 85000,
    controlId: 'CTRL-FIN-001',
    actorUserId: 'user-jsmith',
    tenantId: 'tenant-001'
  }
];

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartaudit';
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for seeding.');

    const aiService = new AIService({ useMock: true, delay: 0 });
    let created = 0;
    let skipped = 0;

    for (const data of seedData) {
      const existing = await AuditEntry.findOne({ evidenceId: data.evidenceId });
      if (existing) {
        console.log(`  Skipping ${data.evidenceId} (already exists)`);
        skipped++;
        continue;
      }

      // Pre-enrich seed data so similarity demos work immediately
      const aiResults = await aiService.enrich(data);

      const entry = new AuditEntry({
        ...data,
        aiMetadata: {
          status: 'COMPLETED',
          riskScore: aiResults.riskScore,
          riskLevel: aiResults.riskLevel,
          aiSummary: aiResults.aiSummary,
          anomalyFlags: aiResults.anomalyFlags,
          semanticVector: aiResults.semanticVector,
          auditorNotes: ''
        }
      });

      await entry.save();
      console.log(`  Created ${data.evidenceId} (${data.entityName}) - Risk: ${aiResults.riskLevel} (${aiResults.riskScore})`);
      created++;
    }

    console.log(`\nSeed complete: ${created} created, ${skipped} skipped (already exist).`);
    console.log('Seed records are pre-enriched (COMPLETED) to support similarity demo.');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
