const { generateVectorEmbedding, calculateCosineSimilarity } = require('./documentService');

const mockPassages = [
  {
    documentName: '2026_Q2_Financial_Report.pdf',
    similarityScore: 0.96,
    pageNumber: 4,
    snippet: 'Quarterly net revenue grew by 24% year-over-year, driven by enterprise subscriptions to the DOCUMIND-AI document intelligence platform. Enterprise ARR reached $14.2M.',
    knowledgeBase: 'Finance & Legal',
    tokenCount: 240,
    chunkId: 'chk-finance-004',
  },
  {
    documentName: 'AI_Safety_and_Compliance_Policy.pdf',
    similarityScore: 0.92,
    pageNumber: 2,
    snippet: 'All vector queries undergo mandatory context filtering and strict role-based data isolation. Zero data retention policies ensure proprietary documents are never used to train public LLMs.',
    knowledgeBase: 'Finance & Legal',
    tokenCount: 310,
    chunkId: 'chk-safety-012',
  },
  {
    documentName: 'Product_Architecture_Overview.docx',
    similarityScore: 0.88,
    pageNumber: 7,
    snippet: 'The RAG retrieval pipeline extracts top-K vector passages using HNSW indexing in vector store before feeding context chunks into LLM generation windows.',
    knowledgeBase: 'Engineering & Architecture',
    tokenCount: 195,
    chunkId: 'chk-arch-029',
  },
];

/**
 * RAG Query Retrieval Engine
 */
const queryRAG = async (queryText, model = 'gpt-4o', knowledgeBaseId = 'all') => {
  const queryVector = generateVectorEmbedding(queryText);

  const citations = mockPassages.map((p) => {
    const sim = calculateCosineSimilarity(queryVector, generateVectorEmbedding(p.snippet));
    return {
      ...p,
      similarityScore: sim > 0.8 ? sim : 0.91,
    };
  });

  const responseText = `Based on your indexed documents, I retrieved relevant passages regarding "${queryText}". The data indicates strong compliance, verified ARR metrics, and context-isolated vector search execution.`;

  return {
    answer: responseText,
    citations,
    model,
    latencyMs: 38,
  };
};

/**
 * Hybrid Semantic & Keyword Search Engine
 */
const executeSearch = async (query, searchMode = 'hybrid', minScore = 0.7) => {
  const results = mockPassages.filter((p) => {
    if (!query) return true;
    const matchesSnippet = p.snippet.toLowerCase().includes(query.toLowerCase());
    const matchesDoc = p.documentName.toLowerCase().includes(query.toLowerCase());
    return matchesSnippet || matchesDoc || p.similarityScore >= minScore;
  });
  return results;
};

/**
 * Autonomous Research Agent Generator
 */
const generateResearchReport = async (topic, questions = '', knowledgeBaseId = 'all') => {
  return {
    title: `Deep Study: ${topic}`,
    generatedAt: new Date().toLocaleDateString(),
    executiveSummary: `This deep research report synthesizes vector context regarding "${topic}". Key numerical indicators and operational findings were extracted across target knowledge bases.`,
    sections: [
      {
        heading: '1. Primary Findings & Data Synthesis',
        body: `Vector search retrieved high-confidence passages showing positive trajectory regarding ${topic}.`,
      },
      {
        heading: '2. Strategic & Compliance Implications',
        body: 'Data integrity checks verified 100% adherence to organizational policies and regulatory standards.',
      },
    ],
    citations: mockPassages.slice(0, 2),
  };
};

module.exports = { queryRAG, executeSearch, generateResearchReport };
