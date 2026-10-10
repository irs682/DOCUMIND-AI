const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Document = require('../models/Document');
const { processDocument } = require('../services/documentPipelineService');

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/document-ai';
  await mongoose.connect(mongoUri);
  console.log('[REPROCESS SCRIPT] Connected to MongoDB');

  const doc = await Document.findOne({
    $or: [
      { _id: '6ac65e2a7be3177e5fe6d778' },
      { name: /1-FR-AUTH/i },
      { originalName: /1-FR-AUTH/i },
    ]
  });

  if (!doc) {
    console.error('[REPROCESS SCRIPT] Document 1-FR-AUTH not found in DB!');
    process.exit(1);
  }

  console.log(`[REPROCESS SCRIPT] Found document "${doc.name}" (${doc._id}). Starting reprocessing...`);
  
  await processDocument(String(doc._id), { isReprocess: true });
  console.log('[REPROCESS SCRIPT] processDocument finished. Fetching updated document...');

  const updatedDoc = await Document.findById(doc._id);
  console.log(`[REPROCESS RESULT] Status: ${updatedDoc.status}`);
  console.log(`[REPROCESS RESULT] Figure count: ${updatedDoc.figureCount || updatedDoc.figures?.length}`);
  console.log(`[REPROCESS RESULT] Table count: ${updatedDoc.tableCount || updatedDoc.tables?.length}`);
  console.log(`[REPROCESS RESULT] Chunks count: ${updatedDoc.chunksCount || updatedDoc.chunks?.length}`);

  if (updatedDoc.figures && updatedDoc.figures.length > 0) {
    for (const fig of updatedDoc.figures) {
      console.log(`\n--- Figure: ${fig.objectId || fig.figureId} (Figure ${fig.figureNumber}) ---`);
      console.log(`Caption: ${fig.caption}`);
      console.log(`Type: ${fig.figureType}`);
      console.log(`Image: ${fig.imagePath}`);
      console.log(`Participants: ${(fig.participants || []).join(', ')}`);
      console.log(`Interactions count: ${fig.interactions?.length || 0}`);
      if (fig.interactions && fig.interactions.length > 0) {
        console.log(`First interaction:`, fig.interactions[0]);
      }
    }
  }

  const figureChunks = (updatedDoc.chunks || []).filter(c => c.isFigure || c.objectType === 'figure');
  console.log(`\n[REPROCESS RESULT] Dedicated figure chunks in doc.chunks: ${figureChunks.length}`);
  for (const fc of figureChunks) {
    console.log(`- Chunk #${fc.index}: objectId="${fc.objectId}", figureNumber="${fc.figureNumber}", caption="${fc.caption}"`);
  }

  await mongoose.disconnect();
  console.log('\n[REPROCESS SCRIPT] Done.');
};

run().catch(err => {
  console.error('[REPROCESS ERROR]:', err);
  process.exit(1);
});
