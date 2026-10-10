const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Document = require('../models/Document');
const { askDocument } = require('../services/ragService');

async function testRAGAndSummary() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai');
  console.log('Connected to MongoDB.');

  try {
    const docs = await Document.find({}).lean();
    console.log(`Found ${docs.length} documents in database.`);
    docs.forEach((d, i) => {
      console.log(`[${i + 1}] ID: ${d._id} | Title: "${d.title || d.originalName}" | Chunks: ${d.chunks ? d.chunks.length : 0}`);
    });

    let targetDoc = docs.find(d => /feasibility/i.test(d.title || d.originalName));
    if (!targetDoc && docs.length > 0) {
      targetDoc = docs[0];
    }

    if (!targetDoc) {
      console.log('No documents found in database. Testing general answer via RAG service...');
      const genRes = await askDocument({
        question: 'What is DOCUMIND-AI?',
      });
      console.log('\n--- GENERAL RAG RESULT ---');
      console.log('Answer:', genRes.answer);
      return;
    }

    const docTitle = targetDoc.title || targetDoc.originalName;
    console.log(`\n======================================================`);
    console.log(`TESTING SUMMARY ON DOCUMENT: "${docTitle}" (ID: ${targetDoc._id})`);
    console.log(`======================================================`);

    const summaryResult = await askDocument({
      question: `Summarize the main points in ${docTitle}`,
      documentId: String(targetDoc._id),
      userId: targetDoc.owner,
    });

    console.log('\n--- SUMMARY RESULT ---');
    console.log(summaryResult.answer);

    console.log(`\n======================================================`);
    console.log(`TESTING FACTUAL RAG QUESTION ON DOCUMENT: "${docTitle}"`);
    console.log(`======================================================`);

    const ragResult = await askDocument({
      question: 'What is the main objective or topic discussed in this document?',
      documentId: String(targetDoc._id),
      userId: targetDoc.owner,
    });

    console.log('\n--- FACTUAL RAG ANSWER ---');
    console.log(ragResult.answer);
    console.log('\n--- CITATIONS / SOURCES ---');
    console.log(ragResult.sources?.slice(0, 3));

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testRAGAndSummary();
