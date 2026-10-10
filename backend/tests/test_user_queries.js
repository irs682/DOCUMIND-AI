require('dotenv').config({ path: './backend/.env' });
const mongoose = require('../node_modules/mongoose');
const { askDocument } = require('../services/ragService');

async function testUserQueries() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/documind');
  const doc = await mongoose.connection.db.collection('documents').findOne({ originalName: /FR-AUTH/i });
  const docId = doc._id.toString();

  const queries = [
    "What is out of scope for this module?",
    "what is out of scope for this module? List them all as stated in the table in Section 9.2.2",
    "Is Biometric fingerprint or face login in scope of the module?",
    "What are the functions of Staff User defined in Figure 2?",
    "What is contained in Figure 2? Explain it to me",
    "Ok in Figure 1"
  ];

  for (const q of queries) {
    console.log(`\n========================================`);
    console.log(`QUERY: "${q}"`);
    console.log(`========================================`);
    const res = await askDocument({ question: q, documentId: docId });
    console.log(res.answer);
  }
  process.exit(0);
}

testUserQueries().catch(err => {
  console.error(err);
  process.exit(1);
});
