const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { chunkDocument } = require('../services/chunkService');
const { createEmbeddings } = require('../services/embeddingService');
const { storeDocumentChunks } = require('../services/vectorService');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const doc = await mongoose.connection.collection('documents').findOne({ name: '1-FR-AUTH.docx' });
  if (!doc) {
    console.error('1-FR-AUTH.docx not found');
    process.exit(1);
  }

  console.log(`Processing "${doc.name}" (ID: ${doc._id})`);
  const chunks = chunkDocument({
    text: doc.fullText,
    fileName: doc.name,
    documentId: String(doc._id),
  });
  console.log(`Generated ${chunks.length} structure-aware chunks`);

  const chunkTexts = chunks.map((c) => c.text);
  console.log('Generating embeddings via AI service...');
  const embeddings = await createEmbeddings(chunkTexts);
  console.log(`Generated ${embeddings.length} vectors`);

  chunks.forEach((c, idx) => {
    c.embedding = embeddings[idx];
    c.embeddingProvider = 'huggingface';
    c.embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
    c.embeddingDimension = 384;
    c.embeddingVersion = 'minilm-v1';
  });

  console.log('Storing vectors and metadata...');
  await storeDocumentChunks({
    documentId: String(doc._id),
    userId: doc.owner,
    organizationId: doc.organizationId,
    knowledgeBaseId: doc.knowledgeBaseId,
    filename: doc.name,
    chunks,
    embeddings,
  });

  await mongoose.connection.collection('documents').updateOne(
    { _id: doc._id },
    {
      $set: {
        chunks,
        chunksCount: chunks.length,
        status: 'ready',
        processingStep: '08 Ready',
        errorMessage: '',
        error_message: '',
      },
    }
  );

  console.log('SUCCESS: Document 1-FR-AUTH.docx is now READY with structure-aware chunks and embeddings!');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
