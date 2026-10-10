import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Brain,
  Search,
  Bot,
  ShieldCheck,
  Database,
  ArrowRight,
  CheckCircle,
  Star,
  ChevronDown,
  Sparkles,
  Zap,
  Check,
  Lock,
  Layers,
  BarChart3,
  Cpu,
  RefreshCw,
  Sliders,
  Globe,
  Award,
  SlidersHorizontal,
  Code2,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";

const demoScenarios = [
  {
    id: "rag",
    title: "RAG Document Q&A",
    icon: Brain,
    query: "What are the main revenue findings in our Q2 financial report?",
    response: "Quarterly net revenue grew by 24% year-over-year. Enterprise ARR reached $14.2M with a net dollar retention rate of 118%, driven by DOCUMIND-AI subscriptions.",
    citations: [
      { doc: "2026_Q2_Financial_Report.pdf", score: "96% match", page: "Page 4" },
      { doc: "ARR_Breakdown_2026.pdf", score: "91% match", page: "Page 8" },
    ],
  },
  {
    id: "agent",
    title: "Agentic Research Task",
    icon: Bot,
    query: "Audit our uploaded data policies against ISO-27001 requirements.",
    response: "Research Agent completed 4-step audit: All vector search queries enforce tenant-isolated access masks. Zero compliance policy discrepancies identified.",
    citations: [
      { doc: "AI_Safety_Policy.pdf", score: "94% match", page: "Page 2" },
      { doc: "Security_Audit_2026.pdf", score: "90% match", page: "Page 12" },
    ],
  },
  {
    id: "search",
    title: "Semantic Vector Search",
    icon: Search,
    query: "Find specs for HNSW vector index chunking configuration.",
    response: "Found 3 matching passages across Engineering KB: Recursive character chunking configured with 512 tokens per chunk and 50 token overlap using text-embedding-3-small.",
    citations: [
      { doc: "Product_Architecture.docx", score: "98% match", page: "Page 15" },
    ],
  },
];

const modelComparisons = [
  {
    id: "gpt-4o",
    name: "OpenAI GPT-4o",
    contextWindow: "128,000 tokens",
    latency: "35ms",
    accuracy: "98.4%",
    idealFor: "Complex analytical queries, table extraction & multi-document synthesis.",
    badge: "Most Popular",
  },
  {
    id: "claude-3.5",
    name: "Claude 3.5 Sonnet",
    contextWindow: "200,000 tokens",
    latency: "42ms",
    accuracy: "99.1%",
    idealFor: "Deep legal contract auditing, long-form policy synthesis & nuanced QA.",
    badge: "Highest Accuracy",
  },
  {
    id: "gemini-1.5",
    name: "Gemini 1.5 Pro",
    contextWindow: "2,000,000 tokens",
    latency: "48ms",
    accuracy: "97.8%",
    idealFor: "Massive repository scanning, multi-hour video transcripts & large books.",
    badge: "Largest Context",
  },
];

const fileChunkingSimulations = [
  { type: "PDF", name: "Q2_Financial_Report.pdf", size: "2.4 MB", chunks: 28, tokens: "14,200", status: "Indexed in 1.2s" },
  { type: "DOCX", name: "System_Architecture.docx", size: "1.8 MB", chunks: 19, tokens: "9,800", status: "Indexed in 0.9s" },
  { type: "CSV", name: "Customer_Survey_Data.csv", size: "850 KB", chunks: 42, tokens: "21,500", status: "Indexed in 1.4s" },
  { type: "TXT", name: "API_Security_Guidelines.txt", size: "420 KB", chunks: 8, tokens: "4,100", status: "Indexed in 0.4s" },
];

const useCaseTabs = [
  {
    id: "legal",
    title: "Legal & Contracts",
    subtitle: "Accelerate contract review & regulatory compliance",
    stats: "85% faster contract review",
    features: [
      "Extract key clauses, indemnities & expiration dates",
      "Compare legacy contracts against new compliance standards",
      "Semantic search across thousands of legal filings",
    ],
  },
  {
    id: "finance",
    title: "Financial Analysis",
    subtitle: "Automate earnings analysis & financial auditing",
    stats: "10x quicker audit cycles",
    features: [
      "Query 10-K, 10-Q reports and quarterly earnings transcripts",
      "Compare year-over-year revenue metrics with source citations",
      "Extract structured tables from complex financial PDFs",
    ],
  },
  {
    id: "tech",
    title: "Engineering & Tech",
    subtitle: "Centralize technical specs & API documentation",
    stats: "Instant technical answers",
    features: [
      "Index technical spec sheets, RFCs, and architecture diagrams",
      "Retrieve precise code snippets & system dependencies",
      "Multi-hop RAG queries across disparate knowledge bases",
    ],
  },
  {
    id: "research",
    title: "Research & Science",
    subtitle: "Synthesize literature reviews & whitepapers",
    stats: "Deep multi-doc reports",
    features: [
      "Autonomous agents synthesize findings from academic papers",
      "Verifiable answers with page-level bibliographic citations",
      "Export structured research reports to PDF and Markdown",
    ],
  },
];

const featureCards = [
  {
    icon: Brain,
    bg: "bg-indigo-50 text-indigo-600",
    title: "Multi-Hop RAG Reasoning",
    description: "Queries combine passages across multiple knowledge bases to build comprehensive, context-grounded answers.",
  },
  {
    icon: Bot,
    bg: "bg-purple-50 text-purple-600",
    title: "Autonomous Research Agents",
    description: "Specialized AI agents break goals into sub-tasks, retrieve vector passages, and generate deep markdown reports.",
  },
  {
    icon: Search,
    bg: "bg-blue-50 text-blue-600",
    title: "Hybrid Search (Dense + BM25)",
    description: "Combines dense semantic vector embeddings with sparse keyword matching for unmatched retrieval precision.",
  },
  {
    icon: Database,
    bg: "bg-emerald-50 text-emerald-600",
    title: "Isolated Knowledge Stores",
    description: "Group documents into isolated domain indexes with granular role-based access control (RBAC).",
  },
  {
    icon: ShieldCheck,
    bg: "bg-amber-50 text-amber-600",
    title: "Verifiable Source Citations",
    description: "Every AI response includes clickable source badges showing exact match percentages, document names, and page numbers.",
  },
  {
    icon: BarChart3,
    bg: "bg-rose-50 text-rose-600",
    title: "Vector Analytics & Audit",
    description: "Track embedding token usage, cosine distance metrics, query latency, and system audit logs in real time.",
  },
];

function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  const [activeDemo, setActiveDemo] = useState(demoScenarios[0]);
  const [activeUseCase, setActiveUseCase] = useState(useCaseTabs[0]);
  const [activeModel, setActiveModel] = useState(modelComparisons[0]);
  const [activeSimFile, setActiveSimFile] = useState(fileChunkingSimulations[0]);
  
  // Interactive Calculator State
  const [teamSize, setTeamSize] = useState(15);
  const [docsPerMonth, setDocsPerMonth] = useState(250);

  const hoursSavedPerMonth = Math.round(teamSize * (docsPerMonth / 20) * 4);
  const dollarsSavedPerMonth = (hoursSavedPerMonth * 45).toLocaleString();

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">

      {/* ================= HERO SECTION ================= */}
      <section className="relative bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/90 pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Glowing background blurs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-indigo-400/20 via-purple-400/20 to-blue-400/20 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse-glow" />

        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">

            {/* Hero Text */}
            <div className="lg:col-span-6 space-y-6">

              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/90 px-4 py-2 text-xs font-bold text-indigo-700 shadow-xs backdrop-blur-md">
                <Sparkles size={16} className="animate-spin text-indigo-600" />
                Next-Gen Agentic RAG Document Intelligence
              </div>

              <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl tracking-tight">
                Turn Your Documents Into
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {" "}Intelligent Knowledge
                </span>
              </h1>

              <p className="max-w-xl text-base text-slate-600 leading-relaxed sm:text-lg">
                DOCUMIND-AI empowers teams to upload, index, search, analyze, and interact with complex documents using RAG, vector embeddings, and autonomous AI agents.
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-indigo-200 hover:scale-[1.02]"
                >
                  Start Free Trial
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/features"
                  className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-400"
                >
                  Explore Features
                </Link>
              </div>

              {/* Floating Hero Feature Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <div className="animate-float flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-xs text-xs font-bold text-slate-700">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span>SOC2 & ISO-27001 Ready</span>
                </div>
                <div className="animate-float-slow flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-xs text-xs font-bold text-indigo-700">
                  <Zap size={16} className="text-indigo-600" />
                  <span>38ms Cosine Search</span>
                </div>
                <div className="animate-float flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 border border-slate-200 shadow-xs text-xs font-bold text-purple-700">
                  <Lock size={16} className="text-purple-600" />
                  <span>Tenant Vector Isolation</span>
                </div>
              </div>

            </div>

            {/* Interactive Live Demo Showcase Card */}
            <div className="lg:col-span-6 relative">
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-blue-500/20 blur-xl animate-pulse-glow" />

              <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur-md space-y-5">
                {/* Showcase Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-md">
                      <Brain size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Live RAG System Showcase</h3>
                      <p className="text-xs text-slate-500">Select a scenario to inspect live RAG retrieval</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> System Active
                  </span>
                </div>

                {/* Scenario Tabs */}
                <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-100">
                  {demoScenarios.map((demo) => {
                    const IconComp = demo.icon;
                    const isActive = activeDemo.id === demo.id;
                    return (
                      <button
                        key={demo.id}
                        onClick={() => setActiveDemo(demo)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                          isActive
                            ? "bg-white text-indigo-600 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <IconComp size={14} />
                        <span className="truncate">{demo.title.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Simulated Query & Response Box */}
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <Search size={16} className="text-indigo-600 shrink-0" />
                    <span>"{activeDemo.query}"</span>
                  </div>

                  <div className="rounded-xl bg-indigo-600 p-4 text-xs leading-relaxed text-white space-y-2 shadow-md">
                    <div className="flex items-center justify-between font-bold text-[11px] text-indigo-200">
                      <span className="flex items-center gap-1.5">
                        <Bot size={14} /> AI RAG Answer
                      </span>
                      <span>Latency: 38ms</span>
                    </div>
                    <p>{activeDemo.response}</p>
                  </div>

                  {/* Citations list */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Retrieved Vector Passages:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeDemo.citations.map((cite, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-slate-200 text-xs shadow-2xs"
                        >
                          <div className="truncate">
                            <span className="font-bold text-slate-800 block truncate">{cite.doc}</span>
                            <span className="text-[10px] text-slate-400">{cite.page}</span>
                          </div>
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">
                            {cite.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ================= TRUST LOGOS STRIP ================= */}
      <section className="border-y border-slate-200 bg-slate-50/80 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Trusted by knowledge teams, legal researchers & enterprise analysts at
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-base font-extrabold text-slate-400 tracking-wider">
            <span className="hover:text-indigo-600 transition-colors">NORTHBRIDGE</span>
            <span className="hover:text-indigo-600 transition-colors">VANTAGE LABS</span>
            <span className="hover:text-indigo-600 transition-colors">CORESTACK</span>
            <span className="hover:text-indigo-600 transition-colors">HELIO RESEARCH</span>
            <span className="hover:text-indigo-600 transition-colors">ATLAS & CO.</span>
          </div>
        </div>
      </section>


      {/* ================= METRICS BAND ================= */}
      <section className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 py-16 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-4xl font-extrabold sm:text-5xl">50K+</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Documents Processed</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold sm:text-5xl">1.2M</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">AI Vector Queries</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold sm:text-5xl">99.9%</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Retrieval Uptime</p>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-extrabold sm:text-5xl">&lt;50ms</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Cosine Latency</p>
          </div>
        </div>
      </section>


      {/* ================= INTERACTIVE AI MODEL COMPARER CARD ================= */}
      <section className="py-24 bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 space-y-12">

          <div className="mx-auto max-w-3xl text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-700">
              <Cpu size={16} />
              Multi-Model AI Engine Selector
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl text-slate-900">
              Choose Your Preferred Large Language Model
            </h2>
            <p className="text-base text-slate-600">
              DOCUMIND-AI seamlessly routes queries across industry-leading LLMs.
            </p>
          </div>

          {/* Model Switcher Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            {modelComparisons.map((model) => (
              <button
                key={model.id}
                onClick={() => setActiveModel(model)}
                className={`rounded-xl px-5 py-3 text-sm font-bold transition-all border ${
                  activeModel.id === model.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>

          {/* Selected Model Showcase Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                  {activeModel.badge}
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{activeModel.name}</h3>
              </div>
              <div className="flex gap-4 text-xs font-bold">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Context Window</span>
                  <span className="text-indigo-600 text-sm">{activeModel.contextWindow}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block">Avg Latency</span>
                  <span className="text-emerald-600 text-sm">{activeModel.latency}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Optimal Use Case:</p>
              <p className="text-sm font-medium text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                "{activeModel.idealFor}"
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* ================= INTERACTIVE DOCUMENT CHUNKING SIMULATOR CARD ================= */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 space-y-12">

          <div className="mx-auto max-w-3xl text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-bold text-purple-700">
              <Layers size={16} />
              Interactive Ingestion Visualizer
            </div>
            <h2 className="text-3xl font-extrabold sm:text-4xl text-slate-900">
              How Documents Are Parsed & Vectorized
            </h2>
            <p className="text-base text-slate-600">
              Select a file format to simulate automatic chunking and vector storage.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-xl max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap gap-2 justify-center">
              {fileChunkingSimulations.map((sim) => (
                <button
                  key={sim.type}
                  onClick={() => setActiveSimFile(sim)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
                    activeSimFile.type === sim.type
                      ? "bg-purple-600 text-white border-purple-600 shadow-md"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {sim.type} File
                </button>
              ))}
            </div>

            {/* Pipeline Stage Visualizer */}
            <div className="grid gap-4 sm:grid-cols-4 text-center">
              <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs space-y-1">
                <FileText size={20} className="text-indigo-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900">{activeSimFile.name}</p>
                <p className="text-[10px] text-slate-500">{activeSimFile.size}</p>
              </div>

              <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs space-y-1">
                <Layers size={20} className="text-purple-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900">{activeSimFile.chunks} Chunks</p>
                <p className="text-[10px] text-slate-500">512 tokens / chunk</p>
              </div>

              <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs space-y-1">
                <Cpu size={20} className="text-blue-600 mx-auto" />
                <p className="text-xs font-bold text-slate-900">{activeSimFile.tokens} Tokens</p>
                <p className="text-[10px] text-slate-500">1536-dim vectors</p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 shadow-2xs space-y-1">
                <CheckCircle2 size={20} className="text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900">{activeSimFile.status}</p>
                <p className="text-[10px] text-emerald-700 font-semibold">Ready for RAG</p>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* ================= ADVANCED FEATURES GRID ================= */}
      <section id="features" className="bg-slate-50/70 py-24 border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6 space-y-12">

          <div className="mx-auto max-w-3xl text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">POWERFUL PLATFORM</p>
            <h2 className="text-3xl font-extrabold sm:text-4xl text-slate-900">
              Everything You Need for Intelligent Knowledge Systems
            </h2>
            <p className="text-base text-slate-600">
              A complete suite for document parsing, semantic vector search, autonomous agents, and RAG analytics.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl space-y-4"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold transition-transform group-hover:scale-110 ${card.bg}`}>
                    <IconComp size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>


      {/* ================= USE-CASES TABBED SHOWCASE CARD ================= */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 space-y-12">

          <div className="mx-auto max-w-3xl text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Tailored Solutions</p>
            <h2 className="text-3xl font-extrabold sm:text-4xl text-slate-900">
              Built for Every Knowledge-Intensive Industry
            </h2>
            <p className="text-base text-slate-600">
              Select your domain to see how DOCUMIND-AI automates document intelligence.
            </p>
          </div>

          {/* Use-case Tabs Bar */}
          <div className="flex flex-wrap justify-center gap-3">
            {useCaseTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveUseCase(tab)}
                className={`rounded-xl px-5 py-3 text-sm font-bold transition-all border ${
                  activeUseCase.id === tab.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.title}
              </button>
            ))}
          </div>

          {/* Active Use-Case Display Card */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-8 shadow-xl max-w-4xl mx-auto grid gap-8 md:grid-cols-2 items-center">
            <div className="space-y-4">
              <span className="rounded-full bg-indigo-100 px-3.5 py-1 text-xs font-bold text-indigo-700">
                {activeUseCase.stats}
              </span>
              <h3 className="text-2xl font-bold text-slate-900">{activeUseCase.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{activeUseCase.subtitle}</p>

              <ul className="space-y-3 pt-2">
                {activeUseCase.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs font-semibold text-slate-700">
                    <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                <Sparkles size={16} />
                <span>Automated Workflow Highlights</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-medium">
                  ✓ Parsing & OCR Ingestion Complete
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 font-medium">
                  ✓ Dense Vector Indexing (1536-dim)
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 font-bold">
                  ✓ RAG Citation Verification Passed
                </div>
              </div>
              <Link
                to="/register"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
              >
                Try {activeUseCase.title} Workflow
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

        </div>
      </section>


      {/* ================= INTERACTIVE ROI CALCULATOR CARD ================= */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 lg:p-12 shadow-2xl max-w-4xl mx-auto space-y-8">

            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                <BarChart3 size={14} />
                Interactive Efficiency Calculator
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl text-slate-900">
                Calculate Your Team's Time & Cost Savings
              </h2>
              <p className="text-xs text-slate-500">
                Adjust sliders to see estimated monthly hours saved using RAG search.
              </p>
            </div>

            {/* Sliders Grid */}
            <div className="grid gap-8 md:grid-cols-2">
              {/* Slider 1 */}
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Team Members:</span>
                  <span className="text-indigo-600 text-sm font-extrabold">{teamSize} members</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="100"
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>2</span>
                  <span>100+</span>
                </div>
              </div>

              {/* Slider 2 */}
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Docs Analyzed / Month:</span>
                  <span className="text-indigo-600 text-sm font-extrabold">{docsPerMonth} docs</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={docsPerMonth}
                  onChange={(e) => setDocsPerMonth(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>50</span>
                  <span>2,000+</span>
                </div>
              </div>
            </div>

            {/* Result Display Box */}
            <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-slate-900 p-6 text-white grid grid-cols-2 gap-6 text-center">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-indigo-200">Est. Hours Saved / Month</p>
                <p className="text-3xl font-extrabold sm:text-4xl mt-1 text-emerald-400">{hoursSavedPerMonth} hrs</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-indigo-200">Est. Cost Value Saved</p>
                <p className="text-3xl font-extrabold sm:text-4xl mt-1 text-emerald-400">${dollarsSavedPerMonth}</p>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ================= ENTERPRISE SECURITY & INFRASTRUCTURE GRID ================= */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 space-y-12">

          <div className="mx-auto max-w-3xl text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Enterprise Security</p>
            <h2 className="text-3xl font-extrabold sm:text-4xl text-slate-900">
              Built for Strict Data Governance & Isolation
            </h2>
            <p className="text-base text-slate-600">
              Your document vectors are isolated and never used to train public LLM models.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:-translate-y-1 hover:shadow-lg space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                <Lock size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Tenant Vector Isolation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Vector embeddings are stored in tenant-isolated namespaces with strict role-based access control (RBAC).
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:-translate-y-1 hover:shadow-lg space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-bold">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero Data Training</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We enforce zero-retention API policies across OpenAI, Anthropic, and Google. Your proprietary files remain private.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:-translate-y-1 hover:shadow-lg space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
                <Cpu size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Sub-50ms HNSW Search</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                High-density vector index provides lightning-fast cosine similarity retrieval even across millions of passages.
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* ================= FAQ ACCORDION ================= */}
      <section id="faq" className="bg-slate-50 py-20 border-t border-slate-200">
        <div className="mx-auto max-w-3xl px-6 space-y-8">

          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Got Questions?</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-xs">
            {faqs.map((faq, i) => (
              <div key={faq.question}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="flex w-full items-center justify-between p-5 text-left font-bold text-slate-900 text-sm hover:text-indigo-600 transition"
                >
                  {faq.question}
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform ${openFaq === i ? "rotate-180 text-indigo-600" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-5 text-xs leading-relaxed text-slate-600 border-t border-slate-100 pt-3">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>


      {/* ================= FINAL CTA ================= */}
      <section className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center space-y-6">
          <h2 className="text-3xl font-extrabold sm:text-4xl tracking-tight">
            Ready to Build a Smarter Knowledge System?
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-indigo-100 leading-relaxed">
            Start organizing your documents into vector-indexed knowledge bases and unlock the power of AI-powered research today.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-indigo-600 shadow-xl hover:bg-slate-50 transition transform hover:scale-105"
            >
              Get Started for Free
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

const faqs = [
  {
    question: "What document formats does DOCUMIND-AI support?",
    answer: "DOCUMIND-AI supports PDF, DOCX, CSV, TXT, and JSON formats. Documents are parsed, OCR-extracted, chunked, and embedded automatically.",
  },
  {
    question: "How are vector citations verified?",
    answer: "Every AI-generated answer retrieves the top-K matching passages from your vector store, displaying exact cosine similarity match scores and page numbers.",
  },
  {
    question: "Is my document data private and secure?",
    answer: "Yes. All vector stores are isolated by tenant permissions, and zero data retention policies ensure your files are never used to train public LLM models.",
  },
  {
    question: "Can I choose which LLM engine handles my queries?",
    answer: "Yes. You can toggle between OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), and Google (Gemini 1.5 Pro) in your workspace settings.",
  },
];

export default Home;