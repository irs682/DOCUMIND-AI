/**
 * DOCUMIND-AI: Document Text Quality Validator
 * Detects text usability, rejects raw PDF object bytecode/xref tables,
 * and scores content quality.
 */

const PDF_BYTECODE_KEYWORDS = [
  /\bendstream\b/i,
  /\bendobj\b/i,
  /\b\d+\s+\d+\s+obj\b/i,
  /\/CIDInit\b/i,
  /\/ProcSet\s*\[/i,
  /\/Font\s*<</i,
  /\/CMapName\b/i,
  /\/Adobe-Identity-UCS\b/i,
  /\/MediaBox\s*\[/i,
  /\/Contents\s+\d+\s+\d+\s+R\b/i,
  /\/BaseFont\s*\//i,
  /\/CIDFont\b/i,
  /\/CIDSystemInfo\s*<</i,
  /\/DescendantFonts\s*\[/i,
  /\/FontDescriptor\s*<</i,
  /\/FlateDecode\b/i,
  /\/ToUnicode\s+\d+\s+\d+\s+R\b/i,
  /\/Type\s*\/(?:Catalog|Pages|Page|Font|ObjStm|XObject)\b/i,
  /<<\s*\/[A-Za-z]/i,
  /^%PDF-\d\.\d/i,
  /\bstartxref\s*\n/i,
  /\btrailer\s*<</i,
  /\bxref\s*\n\d+/i,
  /\b\d{10}\s+\d{5}\s+[nf]\b/,
  /\b00000\s+65535\s+f\b/,
];

/**
 * Returns structured quality assessment:
 * { valid: boolean, score: number, failedRules: string[], characters: number, words: number, reason: string }
 * Options: { fileType: string, fileName: string, tablesCount: number, isTable: boolean }
 */
const validateTextQuality = (text, options = {}) => {
  const fileName = options.fileName || 'document';
  const fileType = (options.fileType || '').toLowerCase().replace(/^\./, '');
  const tablesCount = options.tablesCount || 0;

  if (typeof text !== 'string') {
    const res = {
      valid: false,
      score: 0.0,
      reason: 'Input is not a string',
      failedRules: ['non_string_input'],
      characters: 0,
      words: 0,
    };
    logQualityMetrics(res, fileType);
    return res;
  }

  const trimmed = text.trim();
  const characters = trimmed.length;

  if (characters === 0 && tablesCount === 0) {
    const res = {
      valid: false,
      score: 0.0,
      reason: 'No usable text or tables extracted',
      failedRules: ['NO_USABLE_TEXT_OR_TABLES'],
      characters: 0,
      words: 0,
    };
    logQualityMetrics(res, fileType);
    return res;
  }

  if (characters < 15 && tablesCount === 0) {
    const res = {
      valid: false,
      score: 0.0,
      reason: 'Text is too short (< 15 characters)',
      failedRules: ['too_short'],
      characters,
      words: 0,
    };
    logQualityMetrics(res, fileType);
    return res;
  }

  const failedRules = [];

  // 1. PDF bytecode / xref artifacts (ONLY check for raw binary PDF header/stream artifacts)
  const isPdf = fileType === 'pdf' || (!fileType && /^%PDF-\d/i.test(trimmed));
  if (isPdf) {
    for (const pattern of PDF_BYTECODE_KEYWORDS) {
      if (pattern.test(trimmed)) {
        failedRules.push(`pdf_bytecode:${pattern}`);
        const res = {
          valid: false,
          score: 0.0,
          reason: `Detected PDF internal object or xref artifact: ${pattern}`,
          failedRules,
          characters,
          words: 0,
        };
        logQualityMetrics(res, fileType);
        return res;
      }
    }
  }

  // 2. Reject excessive null bytes (corrupted binaries)
  const nullBytes = (trimmed.match(/\0/g) || []).length;
  if (nullBytes > 0 && nullBytes / characters > 0.02) {
    failedRules.push('excessive_null_bytes');
    const res = {
      valid: false,
      score: 0.0,
      reason: 'Excessive null bytes detected',
      failedRules,
      characters,
      words: 0,
    };
    logQualityMetrics(res, fileType);
    return res;
  }

  // 3. Normalize table formatting characters before metrics
  const contentNoGrid = trimmed.replace(/\|/g, ' ').replace(/-{3,}/g, ' ');
  const isCsv = fileType === 'csv' || fileType === 'tsv';
  const isTabular = isCsv || tablesCount > 0 || trimmed.includes('|') || Boolean(options.isTable);
  const isDocx = fileType === 'docx' || fileType === 'doc';
  const isTxt = fileType === 'txt' || fileType === 'text';

  // Check for multilingual Unicode: CJK, Arabic/Urdu, Cyrillic, Greek, Devanagari, Hebrew, etc.
  const hasMultilingual = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u0900-\u097F\u2E80-\u9FFF\uAC00-\uD7AF\uFB50-\uFDFF\uFE70-\uFEFF]/u.test(trimmed);

  // 4. Count words (supporting CJK, Arabic, Urdu, Cyrillic, Latin, and numbers)
  const wordsList = contentNoGrid.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}]{2,}/gu) || [];
  const words = wordsList.length;

  // Word count check: skip for CSV (which may be mostly numbers) and single table rows
  if (words < 3 && !isTabular && !isCsv) {
    failedRules.push('insufficient_words');
  }

  // 5. Punctuation ratio check
  // For CSV, DOCX, multilingual or tables, standard text punctuation limits do not apply rigidly
  if (!isCsv && !isDocx && !hasMultilingual) {
    const punctuation = (contentNoGrid.match(/[^\p{L}\p{N}\s]/gu) || []).length;
    const puncRatio = contentNoGrid.length > 0 ? punctuation / contentNoGrid.length : 0;
    const maxPuncRatio = isTabular ? 0.50 : 0.40;
    if (puncRatio > maxPuncRatio) {
      failedRules.push(`excessive_punctuation:${(puncRatio * 100).toFixed(1)}%`);
    }
  }

  // 6. Alphanumeric / letter ratio
  const contentChars = contentNoGrid.replace(/\s+/g, '');
  const alphanum = (contentChars.match(/[\p{L}\p{N}]/gu) || []).length;
  const alphaRatio = contentChars.length > 0 ? alphanum / contentChars.length : 0;
  const minAlphaRatio = isCsv ? 0.15 : (isTabular || isDocx || hasMultilingual ? 0.20 : 0.25);
  if (alphaRatio < minAlphaRatio) {
    failedRules.push(`low_alphanumeric:${(alphaRatio * 100).toFixed(1)}%`);
  }

  // 7. Check for single-character glyph token spam (skip for tables, CSV, DOCX, and multilingual)
  // Strip bullet symbols and list markers so structured bullet/numbered lists are not treated as glyph noise
  const contentNoBullets = contentNoGrid.replace(/[•▪▫◦–—·\*\-│┌┬┐└┴┘├┼┤═║]/gu, ' ');
  const tokens = contentNoBullets.split(/\s+/).filter((t) => Boolean(t) && !/^\d+[\.\)]?$/.test(t));
  if (tokens.length >= 10 && !isTabular && !isCsv && !isDocx && !hasMultilingual) {
    const shortTokens = tokens.filter((t) => t.length <= 2).length;
    const shortRatio = tokens.length > 0 ? shortTokens / tokens.length : 0;
    if (shortRatio > 0.75) {
      failedRules.push(`glyph_noise:${(shortRatio * 100).toFixed(1)}%`);
    }
  }

  const valid = failedRules.length === 0;
  const score = valid
    ? Math.min(1.0, Math.max(0.5, Number((alphaRatio * 0.7 + 0.3).toFixed(2))))
    : 0.2;

  const result = {
    valid,
    score,
    reason: valid ? 'Clean readable text' : `Quality checks failed: ${failedRules.join(', ')}`,
    failedRules,
    characters,
    words,
  };

  logQualityMetrics(result, fileType);
  return result;
};

/**
 * Diagnostic logger conforming to:
 * [QUALITY]
 * type=docx
 * characters=...
 * words=...
 * score=...
 * failed_rules=[...]
 */
const logQualityMetrics = (result, fileType) => {
  const type = fileType || 'unknown';
  const failedList = (result.failedRules || []).join(',');
  console.log(
    `[QUALITY] type=${type} characters=${result.characters || 0} words=${result.words || 0} score=${result.score} failed_rules=[${failedList}]`
  );
};

/**
 * Boolean convenience check.
 */
const isUsableDocumentText = (text, options = {}) => {
  return validateTextQuality(text, options).valid;
};

/**
 * Clean and normalize text: strip unicode replacement chars, null bytes,
 * XML/SVG tags, fix line wrapping, and collapse redundant whitespace.
 */
const cleanDocumentText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\ufffd/g, ' ')
    .replace(/\x00/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

module.exports = {
  validateTextQuality,
  isUsableDocumentText,
  cleanDocumentText,
  PDF_BYTECODE_KEYWORDS,
};
