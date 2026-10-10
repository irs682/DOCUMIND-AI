const mongoose = require('mongoose');
require('dotenv').config();
const Document = require('../models/Document');
const { classifyWithHeuristics } = require('../services/classificationService');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await Document.find();
  console.log(`Found ${docs.length} documents to classify.`);
  for (const d of docs) {
    const res = classifyWithHeuristics(d.fullText || d.summary || '', d.name || d.originalName || '');
    d.category = res.category;
    d.classificationConfidence = res.confidence;
    await d.save();
    console.log(`[OK] Classified "${d.name}" as "${d.category}" (Confidence: ${Math.round(res.confidence * 100)}%)`);
  }
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
