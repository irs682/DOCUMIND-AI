const assert = require('node:assert/strict');
const extraction = require('../services/informationExtractionService');

const run = () => {
  // Presets and constrained custom schemas
  assert.deepEqual(
    extraction.normalizeExtractionTypes(['Key Points', 'technologies', 'Numerical Values', 'not-a-category']),
    ['keyPoints', 'technologies', 'numericalValues']
  );
  const fields = extraction.normalizeCustomFields(null, 'Extract project objective, methodology, datasets and evaluation metrics');
  assert.deepEqual(fields.map((field) => field.name), ['projectObjective', 'methodology', 'datasets', 'evaluationMetrics']);
  assert.ok(extraction.normalizeCustomFields(Array.from({ length: 30 }, (_, i) => `Field ${i}`)).length <= 12);

  // Every usable chunk is batched; this is intentionally not a top-K retrieval test.
  const allChunks = Array.from({ length: 14 }, (_, index) => ({
    index,
    section: index < 7 ? 'Architecture' : 'Evaluation',
    text: `Chunk ${index} ` + 'content '.repeat(80),
    tokenCount: 230,
  }));
  const batches = extraction.batchChunks(allChunks, 700);
  assert.equal(batches.flat().length, allChunks.length);
  assert.ok(batches.length > 1);

  // Existing structured tables pass through without LLM reconstruction.
  const tableDoc = {
    _id: 'document-1',
    name: 'Tables.docx',
    tables: [{ tableId: 'table-1', pageNumber: 3, headers: ['Cost', 'Amount'], rows: [['Cloud', '$10']], rawText: 'Cost | Amount\nCloud | $10' }],
  };
  const tables = extraction.tableItems(tableDoc);
  assert.equal(tables[0].tableId, 'table-1');
  assert.deepEqual(tables[0].rows, [['Cloud', '$10']]);
  assert.equal(tables[0].source.page, 3);

  // Items must be grounded in a real source chunk. A made-up value is discarded.
  const evidenceChunks = [{
    index: 4,
    chunkId: 'chunk-4',
    pageNumber: 2,
    section: 'Requirements',
    text: 'FR-01 The system shall support account sign-in within 48 hours. Example: a demo account may be used.',
  }];
  const sanitized = extraction.sanitizeBatchOutput({
    parsed: {
      requirements: [
        { id: 'FR-01', title: 'Account sign-in', value: 'FR-01', source: { chunkId: 'chunk-4', page: 2, section: 'Requirements' } },
        { id: 'FR-99', value: 'FR-99', source: { chunkId: 'chunk-4' } },
      ],
      numericalValues: [{ value: '48 hours', unit: 'hours', source: { chunkId: 'chunk-4' } }],
    },
    extractionTypes: ['requirements', 'numericalValues'],
    customFields: [],
    chunks: evidenceChunks,
    document: { _id: 'document-1', name: 'SRS.docx' },
  });
  assert.equal(sanitized.requirements.length, 1);
  assert.equal(sanitized.requirements[0].id, 'FR-01');
  assert.equal(sanitized.numericalValues[0].value, '48 hours');
  assert.equal(sanitized.requirements[0].statementType, 'required');

  // Requirement IDs are the primary dedupe key, whereas same numbers in different contexts remain separate.
  assert.equal(extraction.mergeCategoryItems('requirements', [
    sanitized.requirements[0],
    { ...sanitized.requirements[0], value: 'FR-01 revised wording' },
  ]).length, 1);
  assert.equal(extraction.mergeCategoryItems('numericalValues', [
    sanitized.numericalValues[0],
    { ...sanitized.numericalValues[0], context: 'defect probability' },
  ]).length, 2);

  assert.throws(() => extraction.extractJson('not JSON'), /JSON/);
  console.log('Information extraction service checks passed.');
};

run();
