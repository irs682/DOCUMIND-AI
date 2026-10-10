const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Connect to MongoDB
connectDB();

// Routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");
const knowledgeBaseRoutes = require("./routes/knowledgeBaseRoutes");
const aiRoutes = require("./routes/aiRoutes");
const agentRoutes = require("./routes/agentRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const researchRoutes = require("./routes/researchRoutes");
const searchRoutes = require("./routes/searchRoutes");
const projectRoutes = require("./routes/projectRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const comparisonRoutes = require("./routes/comparisonRoutes");
const informationExtractionRoutes = require("./routes/informationExtractionRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/extractions", informationExtractionRoutes);
app.use("/api/comparisons", comparisonRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/knowledge-bases", knowledgeBaseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/organizations", organizationRoutes);

// Error Handler
const { errorHandler } = require("./middleware/errorHandler");
app.use(errorHandler);

const { validateLLMConfiguration } = require("./services/llmService");
const { runDiagnosticsAndReprocess } = require("./scripts/diagnose_and_reprocess");
const { initializeCollection } = require("./services/vectorService");

const verifySystemHealth = async () => {
  let aiStatus = 'UNAVAILABLE';
  let embStatus = 'UNAVAILABLE';
  let qdrantStatus = 'UNAVAILABLE';
  let orStatus = process.env.OPENROUTER_API_KEY ? 'READY' : 'MISSING_KEY';

  // 1. Check AI Service & Embeddings
  try {
    const aiUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(`${aiUrl}/health`, { signal: ctrl.signal }).catch(() => null);
    clearTimeout(t);
    if (res && res.ok) {
      const data = await res.json().catch(() => ({}));
      aiStatus = 'READY';
      embStatus = data.embedding?.status === 'ready' || data.status === 'healthy' ? 'READY' : 'INITIALIZING';
    }
  } catch (_) {}

  // 2. Check Qdrant
  try {
    await initializeCollection();
    qdrantStatus = 'READY';
  } catch (_) {
    qdrantStatus = 'UNAVAILABLE';
  }

  console.log(`[HEALTH] ai_service=${aiStatus} embeddings=${embStatus} qdrant=${qdrantStatus} openrouter=${orStatus}`);
};

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n============================================================');
    console.log('🚀 DOCUMIND-AI SERVICES ACTIVE');
    console.log(`👉 Frontend Web App:     ${CLIENT_URL}`);
    console.log(`👉 Frontend Login Page:  ${CLIENT_URL}/login`);
    console.log(`👉 Backend API Server:   http://localhost:${PORT}`);
    console.log(`👉 AI Microservice:      ${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}`);
    console.log('============================================================\n');
    // Run system checks in background so server accepts requests immediately
    (async () => {
        try {
            await verifySystemHealth();
            await validateLLMConfiguration();
            await runDiagnosticsAndReprocess();
        } catch (err) {
            console.warn(`[STARTUP_BACKGROUND_CHECK] Warning: ${err.message}`);
        }
    })();
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. The backend may already be running.`);
    } else {
        console.error(`Backend failed to start: ${error.message}`);
    }
    process.exitCode = 1;
});
