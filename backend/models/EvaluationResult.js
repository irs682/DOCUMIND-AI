const mongoose = require('mongoose');

const evaluationResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchDataset',
    },
    datasetName: {
      type: String,
      default: 'Default Benchmark Dataset',
    },
    // Multi-strategy comparative metrics (SRS Section 35-36)
    comparison: [
      {
        strategy: {
          type: String, // 'Keyword Search (BM25)', 'Vector Search', 'Hybrid Search (RRF)', 'Traditional RAG', 'Agentic Hybrid RAG'
          required: true,
        },
        precision: { type: Number, default: 0 },
        recall: { type: Number, default: 0 },
        recallAtK: { type: Number, default: 0 },
        mrr: { type: Number, default: 0 },
        ndcg: { type: Number, default: 0 },
        faithfulness: { type: Number, default: 0 },
        answerRelevance: { type: Number, default: 0 },
        hallucinationRate: { type: Number, default: 0 },
        avgLatencyMs: { type: Number, default: 0 },
      },
    ],
    sampleEvaluations: [
      {
        question: String,
        expectedAnswer: String,
        generatedAnswers: [
          {
            strategy: String,
            answer: String,
            score: Number,
            latencyMs: Number,
          },
        ],
      },
    ],
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
);

const EvaluationResult =
  mongoose.models.EvaluationResult || mongoose.model('EvaluationResult', evaluationResultSchema);

module.exports = EvaluationResult;
