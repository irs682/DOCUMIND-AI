const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { getMongoHealth } = require("./config/db");
const { getStorageProvider } = require("./services/storageService");
const { initializeCollection } = require("./services/vectorService");
const { validateLLMConfiguration } = require("./services/llmService");
const { runDiagnosticsAndReprocess } = require("./scripts/diagnose_and_reprocess");

const app = express();

// ── Production-Grade CORS Configuration ──
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile app, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Development & local network testing
    if (process.env.NODE_ENV !== 'production') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
        return callback(null, true);
      }
    }

    // Exact matches or Netlify deploy preview support
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.ALLOW_NETLIFY_PREVIEWS === 'true' && origin.endsWith('.netlify.app')) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Range'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Liveness Health Check (GET /health & GET /api/health) ──
const handleLiveness = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'documind-backend',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
};
app.get('/health', handleLiveness);
app.get('/api/health', handleLiveness);

// ── Readiness Check (GET /ready & GET /api/ready) ──
const handleReadiness = async (_req, res) => {
  const mongo = getMongoHealth();
  let aiServiceStatus = 'unknown';
  let qdrantStatus = 'unknown';

  // Check AI Service
  try {
    const aiUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const aiRes = await fetch(`${aiUrl}/health`, { signal: ctrl.signal }).catch(() => null);
    clearTimeout(t);
    aiServiceStatus = aiRes && aiRes.ok ? 'ready' : 'degraded';
  } catch (_) {
    aiServiceStatus = 'unavailable';
  }

  // Check Qdrant
  try {
    const qInit = await initializeCollection();
    qdrantStatus = qInit ? 'ready' : 'unavailable';
  } catch (_) {
    qdrantStatus = 'unavailable';
  }

  const storageProvider = getStorageProvider();
  const isReady = mongo.status === 'ready';

  const readinessPayload = {
    status: isReady ? 'ready' : 'degraded',
    service: 'documind-backend',
    dependencies: {
      mongodb: mongo,
      qdrant: { status: qdrantStatus },
      aiService: { status: aiServiceStatus },
      storage: {
        provider: storageProvider,
        status: 'ready',
      },
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(isReady ? 200 : 503).json(readinessPayload);
};

app.get('/ready', handleReadiness);
app.get('/api/ready', handleReadiness);

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

const verifySystemHealth = async () => {
  let aiStatus = 'UNAVAILABLE';
  let embStatus = 'UNAVAILABLE';
  let qdrantStatus = 'UNAVAILABLE';
  let orStatus = process.env.OPENROUTER_API_KEY ? 'READY' : 'MISSING_KEY';

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

  try {
    await initializeCollection();
    qdrantStatus = 'READY';
  } catch (_) {
    qdrantStatus = 'UNAVAILABLE';
  }

  console.log(`[HEALTH] ai_service=${aiStatus} embeddings=${embStatus} qdrant=${qdrantStatus} openrouter=${orStatus}`);
};

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n============================================================');
    console.log('🚀 DOCUMIND-AI BACKEND ACTIVE');
    console.log(`👉 Client URL:         ${CLIENT_URL}`);
    console.log(`👉 Listening on Port:   ${PORT}`);
    console.log(`👉 AI Microservice:    ${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}`);
    console.log(`👉 Storage Provider:    ${getStorageProvider()}`);
    console.log('============================================================\n');

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
