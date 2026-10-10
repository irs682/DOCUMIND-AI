const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 DOCUMIND-AI KNOWLEDGE BASE WORKFLOW REGRESSION TEST');
  console.log('====================================================\n');

  await mongoose.connect('mongodb://127.0.0.1:27017/document-ai');
  const User = require('../models/User');
  const Document = require('../models/Document');
  const KnowledgeBase = require('../models/KnowledgeBase');
  const {
    getKnowledgeBases,
    createKnowledgeBase,
    getKnowledgeBaseById,
    addDocumentsToKnowledgeBase,
    removeDocumentFromKnowledgeBase,
    deleteKnowledgeBase,
  } = require('../controllers/knowledgeBaseController');

  // Find a test user
  const user = await User.findOne({});
  if (!user) {
    console.error('❌ No user found in database!');
    process.exit(1);
  }
  console.log(`✅ Using user: ${user.email} (${user._id})`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ── TEST 1: Default KBs seeding and retrieval ──
  console.log('\n--- Test 1: getKnowledgeBases seeds & returns KBs with accurate counts ---');
  let mockReq = { user };
  let mockRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await getKnowledgeBases(mockReq, mockRes);
  const kbs = mockRes.data?.knowledgeBases || [];
  assert(kbs.length >= 3, `Found ${kbs.length} knowledge bases (seeded default 3)`);
  const names = kbs.map((k) => k.name);
  assert(names.includes('Finance & Legal'), 'Includes "Finance & Legal"');
  assert(names.includes('Engineering & Architecture'), 'Includes "Engineering & Architecture"');
  assert(names.includes('Product & Customer Insights'), 'Includes "Product & Customer Insights"');

  // ── TEST 2: Create a new Knowledge Base ──
  console.log('\n--- Test 2: Create a new Knowledge Base ---');
  const uniqueKbName = `Test Architecture KB ${Date.now()}`;
  mockReq = {
    user,
    body: {
      name: uniqueKbName,
      description: 'System specifications, microservices, and sequence diagrams.',
      isPrivate: true,
      embeddingModel: 'text-embedding-3-small',
    },
  };
  mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await createKnowledgeBase(mockReq, mockRes);
  const createdKb = mockRes.data?.knowledgeBase;
  assert(createdKb && createdKb.name === uniqueKbName, `Created KB "${uniqueKbName}" with ID ${createdKb?._id}`);
  assert(createdKb?.docCount === 0, 'New KB has docCount === 0');
  assert(createdKb?.vectorCount === 0, 'New KB has vectorCount === 0');

  // ── TEST 3: Add Existing Documents into the Knowledge Base ──
  console.log('\n--- Test 3: Add existing platform documents to Knowledge Base ---');
  const existingDocs = await Document.find({ owner: user._id }).limit(2);
  assert(existingDocs.length > 0, `Found ${existingDocs.length} existing documents to link`);

  const docIdsToLink = existingDocs.map((d) => String(d._id));
  mockReq = {
    user,
    params: { id: String(createdKb._id) },
    body: { documentIds: docIdsToLink },
  };
  mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await addDocumentsToKnowledgeBase(mockReq, mockRes);
  assert(mockRes.data?.addedCount === docIdsToLink.length, `Successfully linked ${mockRes.data?.addedCount} documents`);
  assert(mockRes.data?.docCount === docIdsToLink.length, `KB docCount updated to ${mockRes.data?.docCount}`);

  // Verify DB state of documents
  const reloadedDocs = await Document.find({ _id: { $in: docIdsToLink } });
  for (const d of reloadedDocs) {
    const hasKbId = (d.knowledgeBaseIds || []).some((id) => String(id) === String(createdKb._id));
    assert(hasKbId, `Document "${d.name}" contains ${createdKb._id} in knowledgeBaseIds`);
  }

  // ── TEST 4: Attempt duplicate addition ──
  console.log('\n--- Test 4: Attempt duplicate addition (should not duplicate) ---');
  mockReq = {
    user,
    params: { id: String(createdKb._id) },
    body: { documentIds: [docIdsToLink[0]] },
  };
  mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await addDocumentsToKnowledgeBase(mockReq, mockRes);
  assert(mockRes.data?.addedCount === 0, 'Added count is 0 for duplicate');
  assert(mockRes.data?.alreadyPresentCount === 1, 'alreadyPresentCount is 1');

  // ── TEST 5: Explore KB Details (getKnowledgeBaseById) ──
  console.log('\n--- Test 5: getKnowledgeBaseById returns KB and assigned documents ---');
  mockReq = {
    user,
    params: { id: String(createdKb._id) },
  };
  mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await getKnowledgeBaseById(mockReq, mockRes);
  const kbDetails = mockRes.data?.knowledgeBase;
  const kbDocuments = mockRes.data?.documents;
  assert(kbDetails && String(kbDetails._id) === String(createdKb._id), 'Returned correct KB details');
  assert(kbDocuments?.length === docIdsToLink.length, `Returned ${kbDocuments?.length} assigned documents`);

  // ── TEST 6: Remove document from Knowledge Base (preserves document) ──
  console.log('\n--- Test 6: Remove document from KB only ---');
  const docToRemoveId = docIdsToLink[0];
  mockReq = {
    user,
    params: { id: String(createdKb._id), documentId: docToRemoveId },
  };
  mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await removeDocumentFromKnowledgeBase(mockReq, mockRes);
  assert(mockRes.data?.documentId === docToRemoveId, `Successfully removed doc ${docToRemoveId} from KB`);
  assert(mockRes.data?.docCount === docIdsToLink.length - 1, `KB docCount updated to ${mockRes.data?.docCount}`);

  // CRITICAL CHECK: Verify document STILL exists in global platform Documents!
  const docStillExists = await Document.findById(docToRemoveId);
  assert(docStillExists !== null, `Document "${docStillExists?.name}" remains in global Documents collection`);
  const stillHasKb = (docStillExists?.knowledgeBaseIds || []).some((id) => String(id) === String(createdKb._id));
  assert(!stillHasKb, `KB ${createdKb._id} was cleanly removed from document knowledgeBaseIds`);

  // ── TEST 7: Clean up test KB via deleteKnowledgeBase ──
  console.log('\n--- Test 7: deleteKnowledgeBase cleanly detaches remaining docs ---');
  mockReq = {
    user,
    params: { id: String(createdKb._id) },
  };
  mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };

  await deleteKnowledgeBase(mockReq, mockRes);
  const kbAfterDelete = await KnowledgeBase.findById(createdKb._id);
  assert(kbAfterDelete === null, 'KnowledgeBase record deleted');
  const remainingDoc = await Document.findById(docIdsToLink[1]);
  assert(remainingDoc !== null, 'Remaining document is preserved in Documents library');
  const remainingHasKb = (remainingDoc?.knowledgeBaseIds || []).some((id) => String(id) === String(createdKb._id));
  assert(!remainingHasKb, 'Deleted KB was unlinked from remaining document');

  console.log('\n====================================================');
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
