/**
 * DOCUMIND-AI RFC-4180 Compliant CSV & TSV Parser for Step 9 User Results
 * 
 * Capabilities:
 * 1. Automatic delimiter detection (',', '\t', ';')
 * 2. Case/whitespace-tolerant header detection (prevents headers from becoming data rows)
 * 3. Headerless and header-included input support
 * 4. Quoted text handling with embedded commas and quotes ("MERA-VLA, Full")
 * 5. Numeric validation and normalization (72.4, 0.08, -1.2, 100, strips trailing % to unit)
 * 6. Explicit row-level validation errors (no silent fake results or NaN/zero coercions)
 * 7. Duplicate detection against existing experiment results
 * 8. Provenance preservation: sourceType='user_supplied_result', verified=true
 */

export function tokenizeDelimited(text, delimiterOverride = null) {
  if (!text || typeof text !== 'string') return { rows: [], delimiter: ',' };

  // 1. Detect delimiter from the first non-empty line outside of quotes
  let delimiter = delimiterOverride;
  if (!delimiter) {
    const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return { rows: [], delimiter: ',' };

    const firstLine = rawLines[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;

    if (tabCount > 0 && tabCount >= commaCount) {
      delimiter = '\t';
    } else if (semiCount > 0 && semiCount > commaCount) {
      delimiter = ';';
    } else {
      delimiter = ',';
    }
  }

  // 2. Character-by-character RFC-4180 tokenization
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      } else if (char === '"') {
        inQuotes = false;
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return { rows, delimiter };
}

/**
 * Checks whether a row matches the expected header schema:
 * Model, Metric, Value, Dataset, Unit
 */
export function isHeaderRow(row) {
  if (!row || row.length === 0) return false;
  const col0 = (row[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  const col1 = (row[1] || '').toLowerCase().replace(/[^a-z]/g, '');
  const col2 = (row[2] || '').toLowerCase().replace(/[^a-z]/g, '');

  const isCol0Model = col0.includes('model');
  const isCol1Metric = col1.includes('metric');
  const isCol2Value = col2.includes('value') || col2.includes('score') || isNaN(Number(row[2]));

  return isCol0Model && (isCol1Metric || isCol2Value);
}

/**
 * Normalizes a result row into the standard DOCUMIND-AI experimentResult format
 */
export function normalizeResult({
  model = '',
  modelName = '',
  metric = '',
  value = 0,
  dataset = 'Benchmark Dataset',
  unit = '%',
  split = 'Test',
  runId = '',
  notes = '',
  sourceType = 'user_supplied_result',
  verified = true,
  id = null,
} = {}) {
  const finalModel = (modelName || model || 'Proposed Model').trim();
  const finalVal = typeof value === 'number' ? value : parseFloat(value) || 0;

  return {
    id: id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    model: finalModel,
    modelName: finalModel,
    metric: (metric || 'Metric').trim(),
    value: finalVal,
    dataset: (dataset || 'Benchmark Dataset').trim(),
    unit: (unit || '%').trim(),
    split: (split || 'Test').trim(),
    runId: (runId || '').trim(),
    notes: (notes || '').trim(),
    sourceType,
    verified,
  };
}

/**
 * Primary parser and validator for Step 9 results import
 * 
 * @param {string} text - Raw CSV or TSV text
 * @param {Array} existingResults - Currently registered results in project
 * @returns {Object} Parse result with validRows, invalidRows, errors, and summary
 */
export function parseAndValidateResults(text, existingResults = []) {
  if (!text || !text.trim()) {
    return {
      success: false,
      delimiter: ',',
      detectedFormat: 'CSV',
      hasHeader: false,
      headerRow: null,
      validRows: [],
      invalidRows: [],
      summary: { totalParsedRows: 0, validCount: 0, invalidCount: 0, duplicateCount: 0 },
      errors: ['No data provided. Please paste CSV or TSV text.'],
    };
  }

  const { rows, delimiter } = tokenizeDelimited(text);
  const detectedFormat = delimiter === '\t' ? 'TSV' : delimiter === ';' ? 'Semicolon-DSV' : 'CSV';

  if (rows.length === 0) {
    return {
      success: false,
      delimiter,
      detectedFormat,
      hasHeader: false,
      headerRow: null,
      validRows: [],
      invalidRows: [],
      summary: { totalParsedRows: 0, validCount: 0, invalidCount: 0, duplicateCount: 0 },
      errors: ['Could not extract any rows from the provided text.'],
    };
  }

  let hasHeader = false;
  let headerRow = null;
  let dataRows = rows;
  let startIndex = 1;

  if (isHeaderRow(rows[0])) {
    hasHeader = true;
    headerRow = rows[0];
    dataRows = rows.slice(1);
    startIndex = 2; // Row 1 was header
  }

  const validRows = [];
  const invalidRows = [];

  dataRows.forEach((row, idx) => {
    const rowNum = idx + startIndex;
    const rawLine = row.join(delimiter);

    // Skip purely empty lines
    if (row.length === 0 || row.every((c) => !c)) {
      return;
    }

    // Minimum column threshold: Model, Metric, Value
    if (row.length < 3) {
      invalidRows.push({
        rowIndex: rowNum,
        rawLine,
        error: `Expected at least 3 columns (Model, Metric, Value), found ${row.length}.`,
      });
      return;
    }

    const model = (row[0] || '').trim();
    const metric = (row[1] || '').trim();
    let rawVal = row[2] !== undefined ? String(row[2]).trim() : '';
    let dataset = (row[3] || '').trim();
    let unit = (row[4] || '').trim();
    const split = (row[5] || 'Test').trim();
    const runId = (row[6] || '').trim();

    // 1. Model Validation
    if (!model) {
      invalidRows.push({
        rowIndex: rowNum,
        rawLine,
        error: 'Model name is missing.',
      });
      return;
    }

    // 2. Metric Validation
    if (!metric) {
      invalidRows.push({
        rowIndex: rowNum,
        rawLine,
        error: 'Metric name is missing.',
      });
      return;
    }

    // 3. Value Validation (Must not be blank or non-numeric)
    if (!rawVal) {
      invalidRows.push({
        rowIndex: rowNum,
        rawLine,
        error: 'Value is missing.',
      });
      return;
    }

    // Strip trailing % from Value if present (e.g. "72.4%")
    if (rawVal.endsWith('%')) {
      rawVal = rawVal.slice(0, -1).trim();
      if (!unit) {
        unit = '%';
      }
    }

    const numVal = Number(rawVal);
    if (!Number.isFinite(numVal) || isNaN(numVal)) {
      invalidRows.push({
        rowIndex: rowNum,
        rawLine,
        error: `Value must be numeric (found "${rawVal}").`,
      });
      return;
    }

    // 4. Dataset Validation (Requirement 8 & 18)
    if (!dataset) {
      invalidRows.push({
        rowIndex: rowNum,
        rawLine,
        error: 'Dataset is missing.',
      });
      return;
    }

    // Default unit to % if unspecified
    if (!unit) {
      unit = '%';
    }

    // Check for duplicate against existing results
    const isDuplicate = existingResults.some(
      (exist) =>
        (exist.modelName || exist.model || '').toLowerCase().trim() === model.toLowerCase().trim() &&
        (exist.dataset || '').toLowerCase().trim() === dataset.toLowerCase().trim() &&
        (exist.metric || '').toLowerCase().trim() === metric.toLowerCase().trim() &&
        (exist.split || 'Test').toLowerCase().trim() === split.toLowerCase().trim()
    );

    validRows.push(
      normalizeResult({
        model,
        modelName: model,
        metric,
        value: numVal,
        dataset,
        unit,
        split,
        runId,
        sourceType: 'user_supplied_result',
        verified: true,
        isDuplicate,
        rawRowIndex: rowNum,
      })
    );
  });

  const duplicateCount = validRows.filter((r) => r.isDuplicate).length;
  const errors = invalidRows.map((r) => `Row ${r.rowIndex}: ${r.error}`);

  return {
    success: validRows.length > 0,
    delimiter,
    detectedFormat,
    hasHeader,
    headerRow,
    validRows,
    invalidRows,
    summary: {
      totalParsedRows: dataRows.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      duplicateCount,
    },
    errors,
  };
}

export default parseAndValidateResults;
