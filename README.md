# SmartAudit — AI-Enriched Continuous Audit Pipeline

A full-stack audit-management web application that stores financial audit evidence, asynchronously enriches it with AI-generated risk information, intelligently handles updates, and retrieves similar historical audit exceptions using vector similarity.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Seeding Data](#seeding-data)
- [Running Tests](#running-tests)
- [Building for Production](#building-for-production)
- [API Documentation](#api-documentation)
- [Core Workflows](#core-workflows)
- [Concurrency Safeguards](#concurrency-safeguards)
- [Semantic Vectors & Similarity](#semantic-vectors--similarity)
- [Demo Walkthrough](#demo-walkthrough)
- [Known Limitations](#known-limitations)

---

## Project Overview

SmartAudit demonstrates five key workflows:

1. **Create** — Create an audit entry; it's immediately saved with status `PENDING`
2. **AI Enrichment** — A background worker processes the entry, updating it to `COMPLETED` with risk results
3. **Smart Update (Core Fields)** — Editing financial fields (monetaryImpact, description, controlId) triggers AI reprocessing
4. **Smart Update (Notes Only)** — Editing only `auditorNotes` updates immediately without triggering AI
5. **Similarity Search** — Find the top 3 similar historical audit entries using cosine similarity on 8-dimensional vectors

---

## Architecture

### Four Mandatory ES6 Classes

| Class | File | Responsibility |
|-------|------|----------------|
| **AIService** | `server/src/services/AIService.js` | Encapsulates all AI enrichment logic. Produces deterministic risk scores, levels, summaries, anomaly flags, and 8D semantic vectors using rule-based mock AI. Isolated from controllers and routes. |
| **AuditRepository** | `server/src/repositories/AuditRepository.js` | Centralizes all MongoDB/Mongoose data access. Uses atomic operations (`findOneAndUpdate`), targeted `$set` updates, and fingerprint-based concurrency control. |
| **AuditController** | `server/src/controllers/AuditController.js` | Thin HTTP request handler. Validates input, delegates to repository and services, returns proper HTTP responses. Implements smart delta evaluation. |
| **AIWorkerService** | `server/src/workers/AIWorkerService.js` | Background polling worker that processes PENDING entries independently of HTTP requests. Claims jobs atomically, invokes AIService, persists results with fingerprint checks, and handles errors gracefully. |

### Data Flow

```
Client (React) → REST API (Express) → AuditController → AuditRepository → MongoDB
                                                              ↑
                            AIWorkerService (polling) → AIService (enrichment)
```

---

## Technology Stack

**Backend:**
- Node.js (CommonJS)
- Express.js 4.x
- MongoDB with Mongoose 7.x
- dotenv for configuration

**Frontend:**
- React 18 (Class Component for main dashboard)
- Vite 5
- Vanilla CSS (premium dark theme)

**Testing:**
- Jest 29
- Supertest (available for integration tests)

**Dev Tools:**
- Concurrently (parallel dev servers)
- Nodemon (auto-restart backend)

---

## Prerequisites

- **Node.js** ≥ 18.x
- **MongoDB** ≥ 6.x running locally on `mongodb://127.0.0.1:27017`
  - Or a MongoDB Atlas connection string (see [Environment Setup](#environment-setup))
- **npm** ≥ 9.x

### MongoDB Installation

If you don't have MongoDB installed locally:

1. **MongoDB Community Server:** Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. **MongoDB Atlas (Cloud):** Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas) and use the connection string in `.env`
3. **Docker:** `docker run -d -p 27017:27017 --name mongodb mongo:7`

---

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd smart_audit

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

---

## Environment Setup

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` as needed:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smartaudit
MOCK_AI=true
AI_PROCESSING_DELAY_MS=400
AI_WORKER_POLL_INTERVAL_MS=1000
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend server port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/smartaudit` | MongoDB connection string |
| `MOCK_AI` | `true` | Use deterministic mock AI (no external API needed) |
| `AI_PROCESSING_DELAY_MS` | `400` | Simulated AI processing delay in ms |
| `AI_WORKER_POLL_INTERVAL_MS` | `1000` | Worker polling interval in ms |

> ⚠️ **No paid APIs or API keys are required.** The default mock AI produces deterministic, repeatable results.

---

## Running the Application

```bash
# Start both backend and frontend together
npm run dev
```

This runs:
- **Backend:** Express API on `http://localhost:5000`
- **Frontend:** Vite dev server on `http://localhost:3000` (proxies `/api` to backend)

Open **http://localhost:3000** in your browser.

### Running Individually

```bash
# Backend only
npm run server

# Frontend only (from root)
npm run client
```

---

## Seeding Data

```bash
npm run seed
```

This populates the database with 5 fictional, pre-enriched audit records:

| Evidence ID | Entity | Amount | Risk Level |
|-------------|--------|--------|------------|
| AUD-2024-001 | Acme Corp | $750,000 | HIGH |
| AUD-2024-002 | Global Industries | $250,000 | MEDIUM |
| AUD-2024-003 | TechStart LLC | $15,000 | LOW |
| AUD-2024-004 | Summit Financial | $1,200,000 | HIGH |
| AUD-2024-005 | Acme Corp | $85,000 | MEDIUM |

- Seed records are **pre-enriched** (status: COMPLETED) so similarity search works immediately
- Running `npm run seed` multiple times is safe — existing records are skipped
- Existing user data is never deleted

---

## Running Tests

```bash
npm test
```

Tests cover:
- ✅ Cosine similarity: identical, orthogonal, opposite, zero-magnitude vectors
- ✅ AIService: deterministic outputs, risk scoring, anomaly flags, vector generation
- ✅ AuditController: PENDING on create, smart delta evaluation, notes-only preservation, forbidden field rejection, validation errors, 404 handling

---

## Building for Production

```bash
npm run build
```

This builds the React frontend into `client/dist/`.

---

## API Documentation

Base URL: `http://localhost:5000`

### Health Check

```
GET /api/health
```

**Response:**
```json
{ "status": "ok", "timestamp": "2024-01-15T10:30:00.000Z" }
```

---

### Create Audit Entry

```
POST /api/audit-entries
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventType": "TRANSACTION",
  "evidenceId": "AUD-2024-006",
  "entityName": "Demo Corp",
  "description": "Suspicious override on large transfer",
  "monetaryImpact": 500000,
  "controlId": "CTRL-FIN-001",
  "actorUserId": "user-demo",
  "tenantId": "tenant-001",
  "auditorNotes": "Optional initial note"
}
```

**Response (201):**
```json
{
  "_id": "...",
  "evidenceId": "AUD-2024-006",
  "aiMetadata": {
    "status": "PENDING",
    "riskScore": null,
    "riskLevel": null,
    "aiSummary": null,
    "anomalyFlags": [],
    "semanticVector": [],
    "auditorNotes": ""
  },
  "...": "..."
}
```

---

### List Audit Entries

```
GET /api/audit-entries
GET /api/audit-entries?status=COMPLETED
GET /api/audit-entries?search=acme
```

Returns entries sorted newest first. Supports optional `status` and `search` query parameters.

---

### Get Single Entry

```
GET /api/audit-entries/:id
```

Returns the entry or 404.

---

### Update Entry (Smart Delta)

```
PUT /api/audit-entries/:id
Content-Type: application/json
```

**Core field change → triggers reprocessing:**
```json
{ "monetaryImpact": 750000 }
```

**Notes-only change → immediate update, no reprocessing:**
```json
{ "auditorNotes": "Reviewed by senior auditor" }
```

**Both together → updates both, triggers reprocessing:**
```json
{
  "monetaryImpact": 750000,
  "auditorNotes": "Updated amount and adding note"
}
```

---

### Find Similar Entries

```
POST /api/audit-entries/:id/similar
```

**Response (200):**
```json
{
  "source": "AUD-2024-001",
  "results": [
    {
      "_id": "...",
      "evidenceId": "AUD-2024-004",
      "entityName": "Summit Financial",
      "description": "...",
      "monetaryImpact": 1200000,
      "riskLevel": "HIGH",
      "riskScore": 85,
      "similarity": 92.45
    }
  ]
}
```

Returns at most 3 results, sorted by descending similarity percentage.

---

## Core Workflows

### PENDING → PROCESSING → COMPLETED

1. A new entry is created with `aiMetadata.status = "PENDING"`
2. The `AIWorkerService` polls MongoDB every 1 second (configurable)
3. It atomically claims a PENDING entry by setting status to `"PROCESSING"` using `findOneAndUpdate`
4. The worker invokes `AIService.enrich()` to generate risk metadata
5. On success, it attempts to write results back, checking the `coreFingerprint` hasn't changed
6. If fingerprint matches, status is set to `"COMPLETED"` with all AI results
7. If fingerprint changed (core data was updated during processing), stale results are discarded and the entry remains eligible for reprocessing

### Smart Delta Evaluation

When a PUT request updates an entry:

1. **Compare actual values** — fields are only considered "changed" if their new value differs from the stored value
2. **Core fields** (`monetaryImpact`, `description`, `controlId`):
   - If any changed → reset AI metadata to PENDING, clear stale results, recompute fingerprint
3. **auditorNotes only**:
   - Update notes and timestamp immediately using `$set`
   - Do NOT change status, risk score, or any AI results
4. **Both together**:
   - Update notes AND trigger reprocessing (new notes are preserved)

### Auditor Note Fast-Tracking

- Notes are stored in `aiMetadata.auditorNotes`
- Notes-only updates never enqueue work, change processing status, or modify AI results
- The `completeEnrichment()` repository method does NOT overwrite `auditorNotes` — it only sets AI-specific fields
- This ensures notes added during processing are never lost

---

## Concurrency Safeguards

### Atomic Job Claiming
The worker uses `findOneAndUpdate` with filter `{ 'aiMetadata.status': 'PENDING' }` to atomically claim entries. This prevents multiple workers from processing the same entry.

### Core Fingerprint Check
Each entry stores a `coreFingerprint` — an MD5 hash of `monetaryImpact|description|controlId`.

- When the worker starts processing, it captures the current fingerprint
- When writing results back, it requires the fingerprint to match AND status to be `PROCESSING`
- If a user updated core fields during processing, the fingerprint changes and the stale results are discarded
- The entry's status will already be reset to PENDING by the PUT handler, making it eligible for reprocessing

### Stale Processing Recovery
If a worker crashes mid-processing, entries stuck in `PROCESSING` for more than 5 minutes are automatically reset to `PENDING`.

---

## Semantic Vectors & Similarity

### 8-Dimensional Mock Vectors

> ⚠️ **These are deterministic simulated semantic features, NOT genuine embeddings from a trained language model.** They are used for this prototype to demonstrate the similarity search workflow.

Each dimension captures a different aspect of the audit entry:

| Dim | Feature | Derivation |
|-----|---------|------------|
| 0 | Monetary magnitude | Normalized log₁₀ scale |
| 1 | Description complexity | Text length ratio |
| 2 | Risk keyword density | Count of risk-related terms |
| 3 | Control ID signal | Deterministic hash |
| 4 | Entity name signal | Deterministic hash |
| 5 | Event type signal | Categorical mapping |
| 6 | Monetary risk band | Tiered thresholds |
| 7 | Description sentiment | Deterministic hash |

Vectors are normalized to unit length for consistent similarity comparisons.

### Cosine Similarity

```
similarity(A, B) = dot(A, B) / (|A| × |B|)
```

- Implemented in `server/src/utils/similarity.js`
- Validates exactly 8 finite numbers per vector
- Returns 0 for zero-magnitude vectors (no NaN/Infinity)
- Application-side computation (no vector database needed for this prototype)

---

## Demo Walkthrough

See [docs/demo-script.md](docs/demo-script.md) for a detailed 1–2 minute recording script.

**Quick demo steps:**

1. Start the app: `npm run dev`
2. Seed data: `npm run seed`
3. Open `http://localhost:3000`
4. View the dashboard with pre-enriched entries
5. Create a new entry → watch PENDING → COMPLETED
6. Edit auditor notes → confirm AI status preserved
7. Change monetary impact → watch reprocessing
8. Click 🔍 Similar → see top 3 matches with similarity %

---

## Project Structure

```
smart_audit/
├── package.json                  # Root config, scripts
├── .env.example                  # Environment template
├── .gitignore
├── README.md
├── docs/
│   └── demo-script.md            # Recording script
├── server/
│   ├── jest.config.js
│   ├── scripts/
│   │   └── seed.js               # Database seeder
│   ├── src/
│   │   ├── app.js                # Express app setup
│   │   ├── server.js             # Entry point
│   │   ├── config/
│   │   │   └── database.js       # MongoDB connection
│   │   ├── models/
│   │   │   └── AuditEntry.js     # Mongoose schema
│   │   ├── controllers/
│   │   │   └── AuditController.js
│   │   ├── repositories/
│   │   │   └── AuditRepository.js
│   │   ├── services/
│   │   │   └── AIService.js
│   │   ├── workers/
│   │   │   └── AIWorkerService.js
│   │   ├── routes/
│   │   │   └── auditRoutes.js
│   │   └── utils/
│   │       └── similarity.js
│   └── tests/
│       ├── similarity.test.js
│       ├── aiService.test.js
│       └── controller.test.js
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── AuditDashboard.jsx  # React Class Component
        │   ├── AuditForm.jsx
        │   ├── AuditTable.jsx
        │   └── SimilarityResults.jsx
        └── styles/
            └── styles.css
```

---

## Known Limitations

- **Mock AI only** — No real LLM integration. All AI results are deterministic rule-based calculations.
- **In-memory vectors** — Similarity search loads all COMPLETED entries into memory. Fine for this prototype; would need a vector database (e.g., Pinecone, Milvus) for production.
- **Single worker** — The polling worker is designed for a single instance. Multi-instance deployments would need distributed locking (e.g., Redis).
- **No authentication** — No user auth or RBAC. All endpoints are public.
- **No pagination** — The list endpoint returns all matching entries. Would need cursor/offset pagination for large datasets.
- **MongoDB required** — The app will not start without a reachable MongoDB instance.

---

## Git Commands

```bash
git init
git add .
git commit -m "Initial commit: SmartAudit AI-Enriched Audit Pipeline"
git remote add origin <your-repo-url>
git push -u origin main
```

---

## License

This project is a technical assessment submission. All rights reserved.
