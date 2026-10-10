# DOCUMIND-AI – Intelligent Document Research & Knowledge Platform

DOCUMIND-AI is an enterprise-grade AI-powered document intelligence platform built using the **MERN Stack (MongoDB, Express.js, React.js, Node.js) + Vector Database (Qdrant) + OpenAI RAG + Agentic Research Assistant**.

---

## 🎯 Key Features

1. **Document Intelligence & Ingestion**:
   - Multi-format text extraction (PDF via `pdf-parse`, DOCX, CSV, TXT, JSON).
   - Async background text chunking and 1536-dimensional vector embedding generation (`text-embedding-3-small`).
   - Document status tracking (`pending`, `processing`, `indexed`, `failed`).

2. **Vector Database & Multi-Tenant Isolation (Qdrant)**:
   - Cosine distance index in Qdrant (`documind_documents`).
   - Payload metadata tagging (`documentId`, `userId`, `knowledgeBaseId`, `chunkIndex`, `text`).
   - Strict multi-tenant security ensuring users can only retrieve vectors belonging to their account.

3. **Context-Grounded RAG System**:
   - Query embedding & top-K cosine similarity retrieval.
   - Prompt engineering to eliminate hallucination.
   - Exact source citations with matching scores and chunk indices.

4. **Persistent Document AI Chat**:
   - Multi-turn conversation sessions backed by MongoDB (`ChatSession` model).
   - Document selector and Knowledge-Base scoped query filtering.

5. **Knowledge Base System**:
   - Folder-style document organization (`KnowledgeBase` model).
   - Scoped RAG retrieval restricted to specific Knowledge Bases.

6. **Agentic Research Assistant**:
   - Autonomous 5-stage research engine (Topic Analysis -> Multi-Document Vector Search -> Cross-Passage Comparison -> Gap Analysis -> Structured 10-part Report Generation).
   - Deep structured report output with citations and export tools.

7. **Admin Dashboard & System Monitoring**:
   - Role-Based Access Control (RBAC) with `adminOnly` middleware protection.
   - Real-time MongoDB stats (Users, Active/Regular breakdown, Uploaded Documents, Vector Chunks, Token Totals).
   - User Management (view, search, switch roles, toggle `active`/`deactivated` status, purge user data).
   - System Audit Logs (`AuditLog` model).
   - AI Request & Latency Monitoring.

---

## 🏗️ System Architecture

```
[ Frontend: React + Vite + Tailwind CSS ]
                  │
                  ▼ (HTTP / REST API + JWT)
[ Backend: Node.js + Express.js ]
      │           │            │
      ▼           ▼            ▼
[ MongoDB ]   [ Qdrant ]   [ OpenAI API ]
 (Metadata)   (Vectors)   (Embeddings/LLM)
```

---

## 🛠️ Tech Stack & Requirements

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, React Router v6, Axios.
- **Backend**: Node.js v18+, Express.js, Mongoose, Multer, Bcrypt.js, JsonWebToken.
- **Vector DB**: Qdrant (Local Docker `localhost:6333` or Qdrant Cloud).
- **AI / Embeddings**: OpenAI (`text-embedding-3-small` and `gpt-4o-mini`).

---

## 🚀 Quick Start & Installation

### 1. Backend Setup
```bash
cd backend
npm install
```

Create/Edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/documind-ai
JWT_SECRET=documind_ai_super_secret_jwt_key_2026_production

# OpenAI API Key
OPENAI_API_KEY=sk-your-actual-openai-key-here
OPENAI_MODEL=gpt-4o-mini
DEFAULT_EMBEDDING_MODEL=text-embedding-3-small

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=documind_documents
```

### 1. Run Both Frontend and Backend Concurrently (Recommended)
From the root project directory:
```bash
npm run dev
```
*(Or on Windows, double-click `run-dev.bat`)*

This launches:
- **Backend API**: `http://localhost:5000` (with live reload)
- **Frontend App**: `http://localhost:5173` (Vite dev server)

---

### 2. Manual / Separate Service Setup

#### Backend:
```bash
cd backend
npm install
npm run dev
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Database Seeding (Admin & Demo Data)
To seed the administrator account and test data into MongoDB:
```bash
cd backend
npm run seed:admin   # Seeds/Updates Admin & Demo users
# OR
npm run seed         # Full seed: Admin, Demo user, Knowledge Bases, Sample Documents, Audit Logs & Telemetry
```

**Default Accounts:**
| Account Type | Email | Password | Role | Redirect Path |
|---|---|---|---|---|
| **Admin** | `admin@documind.ai` | `password123` | `admin` | `/admin` |
| **Demo User** | `user@documind.ai` | `password123` | `user` | `/dashboard` |

*(You can also click the quick-fill buttons directly on the `/login` page to sign in immediately!)*

---

## 📡 Key API Routes

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Authenticate user and receive JWT

### Documents (`/api/documents`)
- `POST /api/documents/upload` — Upload PDF/TXT/CSV/JSON file
- `GET /api/documents` — List user documents
- `DELETE /api/documents/:id` — Delete document

### AI & RAG (`/api/ai`)
- `POST /api/ai/ask` — Ask question about a specific document or KB

### Persistent Chat (`/api/chat`)
- `POST /api/chat/conversations` — Create chat session
- `GET /api/chat/conversations` — List conversations
- `POST /api/chat/conversations/:id/messages` — Send message and run RAG

### Agentic Research & Evaluation (`/api/research`)
- `POST /api/research/generate` — Generate multi-document research report
- `GET /api/research/reports` — Fetch research report history
- `POST /api/research/datasets` — Register benchmark dataset
- `GET /api/research/datasets` — List benchmark datasets
- `POST /api/research/evaluate` — Run scientific evaluation (BM25 vs Vector vs Hybrid vs Agentic RAG)
- `GET /api/research/results` — Fetch scientific benchmark results

### AI Agents (`/api/agents`)
- `POST /api/agents/execute` — Execute autonomous multi-step agent workflow
- `GET /api/agents/tasks` — Fetch user agent execution task history

### Admin System (`/api/admin`) — *Protected by Admin RBAC*
- `GET /api/admin/dashboard-stats` — Live system metrics
- `GET /api/admin/users` — Manage users list
- `PUT /api/admin/users/:id/role` — Update role (`user` / `admin`)
- `PUT /api/admin/users/:id/toggle-status` — Activate/Deactivate user
- `DELETE /api/admin/users/:id` — Purge user and documents
- `GET /api/admin/audit-logs` — Administrative audit logs

---

## 🐳 Docker Deployment (Phase 9)

To run the entire system (MongoDB, Qdrant, Redis, AI Service, Backend, and Frontend) in production containers:

```bash
docker compose up -d --build
```
- Frontend: `http://localhost:80`
- Backend API: `http://localhost:5000`
- Python AI Service: `http://localhost:8000`
- Qdrant Dashboard: `http://localhost:6333/dashboard`

