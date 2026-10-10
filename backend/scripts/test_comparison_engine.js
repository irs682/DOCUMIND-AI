const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Document = require('../models/Document');
const comparisonService = require('../services/comparisonService');
const DocumentComparison = require('../models/DocumentComparison');

async function runTest() {
  console.log('=== TEST: DOCUMENT COMPARISON ENGINE ===');
  await connectDB();

  // Find 2 real documents
  const docs = await Document.find({ status: { $in: ['ready', 'indexed'] } }).limit(2);
  console.log(`Found ${docs.length} indexed documents in database.`);

  let docA, docB;

  if (docs.length >= 2) {
    docA = docs[0];
    docB = docs[1];
  } else if (docs.length === 1) {
    docA = docs[0];
    // Create a temporary mock docB for testing
    console.log('Only 1 document found, creating temporary variant doc for test comparison...');
    docB = await Document.create({
      user: docA.user,
      name: 'Comparison_Variant_' + docA.name,
      originalName: 'Comparison_Variant_' + (docA.originalName || docA.name),
      status: 'ready',
      fullText: (docA.fullText || 'Sample section text').replace(/informal/gi, 'formal').replace(/10/g, '25'),
      chunks: (docA.chunks || []).slice(0, 5).map(c => ({
        ...c.toObject ? c.toObject() : c,
        text: (c.text || '').replace(/informal/gi, 'formal').replace(/10/g, '25')
      }))
    });
  } else {
    // Create two mock documents to test the algorithm
    console.log('No documents found, creating 2 temporary documents for testing...');
    const user = new mongoose.Types.ObjectId();
    docA = await Document.create({
      user,
      name: 'Service_SLA_v1.docx',
      originalName: 'Service_SLA_v1.docx',
      status: 'ready',
      fullText: 'Section 1: Service Level Agreement. The vendor shall provide 99.5% uptime. Reports must be submitted monthly by the 5th business day. The penalty for downtime is $500 per hour.',
      chunks: [
        {
          section: 'Service Level Agreement',
          text: 'The vendor shall provide 99.5% uptime. Reports must be submitted monthly by the 5th business day. The penalty for downtime is $500 per hour.',
          pageNumber: 1
        }
      ]
    });
    docB = await Document.create({
      user,
      name: 'Service_SLA_v2.docx',
      originalName: 'Service_SLA_v2.docx',
      status: 'ready',
      fullText: 'Section 1: Service Level Agreement. The vendor shall provide 99.9% uptime. Reports must be submitted bi-weekly by Monday 9am. The penalty for downtime is $1,500 per hour.',
      chunks: [
        {
          section: 'Service Level Agreement',
          text: 'The vendor shall provide 99.9% uptime. Reports must be submitted bi-weekly by Monday 9am. The penalty for downtime is $1,500 per hour.',
          pageNumber: 1
        }
      ]
    });
  }

  console.log(`Document A: "${docA.name || docA.originalName}" (ID: ${docA._id})`);
  console.log(`Document B: "${docB.name || docB.originalName}" (ID: ${docB._id})`);

  console.log('\nRunning comparisonService.compareDocuments()...');
  const startTime = Date.now();

  const result = await comparisonService.compareDocuments(
    docA._id,
    docB._id,
    {
      focusAreas: ['requirements', 'numbers', 'dates', 'differences'],
      detailLevel: 'detailed'
    },
    docA.user
  );

  const durationMs = Date.now() - startTime;
  console.log(`\nComparison completed in ${durationMs}ms!`);

  console.log('\n--- COMPARISON RESULTS ---');
  console.log(`Similarity Score: ${result.similarityScore}%`);
  console.log(`Overview: ${result.summary?.overview}`);
  console.log(`Key Differences Count: ${result.summary?.keyDifferences?.length || 0}`);
  console.log(`Key Similarities Count: ${result.summary?.keySimilarities?.length || 0}`);
  console.log(`Findings Total: ${result.findings?.length || 0}`);
  console.log(`Sections Matched: ${result.sectionsMatched?.length || 0}`);

  if (result.findings?.length > 0) {
    console.log('\nSample Findings:');
    result.findings.slice(0, 3).forEach((f, i) => {
      console.log(`  [${i + 1}] Category: ${f.category} | Title: ${f.title}`);
      console.log(`      Severity: ${f.severity} | Significance: ${f.significance}`);
      console.log(`      Description: ${f.description}`);
      console.log(`      Doc A: "${f.docAQuote || 'N/A'}" (page ${f.docAPage || '?'})`);
      console.log(`      Doc B: "${f.docBQuote || 'N/A'}" (page ${f.docBPage || '?'})`);
    });
  }

  // Verify saved in DB
  const savedRecord = await DocumentComparison.findById(result._id);
  console.log(`\nSaved record verified in MongoDB: ${savedRecord ? 'YES' : 'NO'} (status: ${savedRecord?.status})`);

  // Clean up if we created mock docs
  if (docA.name?.startsWith('Service_SLA_v1')) {
    await Document.deleteMany({ _id: { $in: [docA._id, docB._id] } });
    await DocumentComparison.deleteMany({ _id: result._id });
    console.log('Cleaned up test documents.');
  }

  console.log('\n=== TEST SUCCESSFUL! ===');
  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
