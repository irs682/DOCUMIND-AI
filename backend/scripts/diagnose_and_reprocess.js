const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const runDiagnosticsAndReprocess = async () => {
  try {
    const Document = require('../models/Document');
    const { loadDocument } = require('../services/documentLoaderService');
    const { validateTextQuality } = require('../services/textQualityService');
    const { processDocument } = require('../services/documentPipelineService');
    const { deleteDocumentVectors } = require('../services/vectorService');

    console.log('\n============================================================');
    console.log('[DIAGNOSTICS] STEP 1 — Inspecting MongoDB Records for Ingestion Candidates');
    console.log('============================================================');

    const docs = await Document.find({
      $or: [
        { name: /DOCUMIND-AI Master Full-Project Development Prompt/i },
        { originalName: /DOCUMIND-AI Master Full-Project Development Prompt/i },
        { name: /Risk Analysis Explained Simply/i },
        { originalName: /Risk Analysis Explained Simply/i },
        { name: /irshadprpsel/i },
        { originalName: /irshadprpsel/i },
        { status: { $in: ['uploaded', 'failed', 'extraction_failed', 'validation_failed', 'chunking_failed', 'embedding_failed', 'index_failed'] } },
      ],
    });

    console.log(`[DIAGNOSTICS] Found ${docs.length} document(s) to inspect / reprocess:`);

    for (const doc of docs) {
      console.log(`\n------------------------------------------------------------`);
      console.log(`[DIAGNOSTICS] document_id:       ${doc._id}`);
      console.log(`[DIAGNOSTICS] document_name:     ${doc.name || doc.originalName}`);
      console.log(`[DIAGNOSTICS] status:            ${doc.status}`);
      console.log(`[DIAGNOSTICS] processingStep:    ${doc.processingStep}`);
      console.log(`[DIAGNOSTICS] chunk_count:       ${doc.chunks?.length || 0}`);
      console.log(`[DIAGNOSTICS] error_message:     ${doc.errorMessage || doc.error_message || '(none)'}`);
      console.log(`[DIAGNOSTICS] file_path:         ${doc.filePath}`);

      // Check if file exists on disk
      let resolvedPath = doc.filePath;
      if (resolvedPath && !fs.existsSync(resolvedPath)) {
        const candidate = path.join(__dirname, '..', resolvedPath);
        if (fs.existsSync(candidate)) resolvedPath = candidate;
      }

      const fileExists = Boolean(resolvedPath && fs.existsSync(resolvedPath));
      console.log(`[DIAGNOSTICS] file_exists_on_disk: ${fileExists} (${resolvedPath})`);

      if (!fileExists) {
        console.warn(`[DIAGNOSTICS] Skipping file not on disk: ${doc.filePath}`);
        continue;
      }

      const stat = fs.statSync(resolvedPath);
      const ext = path.extname(resolvedPath).toLowerCase();
      console.log(`[FILE]\ndocument_id=${doc._id}\noriginal_name=${doc.name || doc.originalName}\nstored_path=${resolvedPath}\nexists=true\nsize_bytes=${stat.size}\nextension=${ext}`);

      if (doc.status === 'ready' && (doc.evidenceObjects?.length > 0 || doc.evidenceObjectsCount > 0)) {
        console.log(`[DIAGNOSTICS] Document ${doc._id} is already READY with multimodal evidence (${doc.evidenceObjectsCount || doc.evidenceObjects?.length} objects). Skipping redundant reprocess.`);
        continue;
      }

      // Purge stale vectors from Qdrant first
      try {
        await deleteDocumentVectors(String(doc._id));
        console.log(`[QDRANT] Purged stale vectors for document ${doc._id}`);
      } catch (purErr) {
        console.warn(`[QDRANT] Purge warning: ${purErr.message}`);
      }

      // Reprocess through centralized pipeline
      try {
        console.log(`[PIPELINE] Starting end-to-end processing for document ${doc._id}...`);
        await processDocument(doc._id);
        const updated = await Document.findById(doc._id);
        console.log(`[DOCUMENT]\nstatus=${updated.status}\nchunks=${updated.chunksCount || updated.chunks?.length || 0}\nvectors_written=${updated.vectorsCount || 0}\nerror="${updated.errorMessage || ''}"`);
      } catch (procErr) {
        console.error(`[PIPELINE ERROR] Document ${doc._id} processing failed: ${procErr.message}`);
      }
    }

    console.log('\n============================================================');
    console.log('[DIAGNOSTICS] Reprocessing and validation complete!');
    console.log('============================================================\n');
  } catch (err) {
    console.error('[DIAGNOSTICS ERROR]', err);
  }
};

module.exports = { runDiagnosticsAndReprocess };
