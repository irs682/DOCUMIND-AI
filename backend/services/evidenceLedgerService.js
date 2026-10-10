/**
 * Evidence Ledger & Object-Level Verification Service for DOCUMIND-AI
 *
 * Implements:
 * 1. Evidence Ledger mapping claims to verified object tokens (tables, figures, sections, pages)
 * 2. High-Risk Claim Verification (numbers, percentages, dates, table cells, figure labels)
 * 3. Object-Level Citation Formatter & Validator ([Document, p. X, Table Y], [Document, p. X, Figure Y])
 * 4. Topic Protection & Explicit Missing Object Failure (TABLE_NOT_FOUND, FIGURE_NOT_FOUND)
 */

/**
 * Format an object-level citation from chunk / evidence metadata.
 * Example: [irshadprpsel.pdf, p. 7, Table 1] or [MERA-VLA, p. 16, Figure 1] or [Doc, p. 5, §3.1]
 */
const formatObjectCitation = (evidence) => {
  if (!evidence) return "";
  const docName = evidence.documentName || evidence.document_name || "Document";
  const pNum = evidence.pageNumber || evidence.page_number || 1;
  const objType = evidence.objectType || evidence.object_type || (evidence.isTable ? "table" : (evidence.isFigure ? "figure" : null));
  const objId = evidence.objectId || evidence.object_id;

  let objectDescriptor = "";
  if (objType === "table" && objId) {
    const cleanId = String(objId).replace(/^table_/i, "");
    objectDescriptor = `, Table ${cleanId}`;
  } else if ((objType === "figure" || objType === "chart" || objType === "diagram") && objId) {
    const cleanId = String(objId).replace(/^figure[\s_]*/i, "");
    objectDescriptor = `, Figure ${cleanId}`;
  } else if (evidence.section && evidence.section !== "General" && evidence.section !== "Content") {
    objectDescriptor = `, §${evidence.section}`;
  }

  return `[${docName}, p. ${pNum}${objectDescriptor}]`;
};

/**
 * Detect if the user specifically asked for an object (e.g. Table 7 or Figure 4)
 * that does not exist in the document or retrieval evidence.
 */
const checkMissingObjectFailure = (query = "", retrievedEvidence = [], doc = null) => {
  const q = String(query).trim();

  // 1. Check Table Request
  const tableMatch = q.match(/\b(?:table|tab\.)\s*(\d+[a-zA-Z]?|\b[A-Z0-9.-]+)\b/i);
  if (tableMatch) {
    const reqTableNum = tableMatch[1].toLowerCase();
    const reqTableId = `table_${reqTableNum}`;

    // Look for this table in retrieved chunks
    const foundInChunks = retrievedEvidence.some((item) => {
      const oId = String(item.objectId || item.object_id || "").toLowerCase();
      const tId = String(item.tableMetadata?.tableId || "").toLowerCase();
      const inText = new RegExp(`\\btable\\s+${reqTableNum}\\b`, "i").test(item.text || "");
      return oId === reqTableId || tId === reqTableId || inText;
    });

    // Also look in doc record if available
    const foundInDoc = Array.isArray(doc?.tables) && doc.tables.some((t) => {
      const tId = String(t.tableId || "").toLowerCase();
      return tId === reqTableId || new RegExp(`\\btable\\s+${reqTableNum}\\b`, "i").test(t.caption || "");
    });

    if (!foundInChunks && !foundInDoc) {
      const existingTables = (doc?.tables || [])
        .map((t) => t.tableId || t.caption)
        .filter(Boolean)
        .slice(0, 5)
        .join(", ");

      return {
        isMissing: true,
        failureState: "TABLE_NOT_FOUND",
        objectType: "table",
        requestedId: `Table ${tableMatch[1]}`,
        message:
          `Table ${tableMatch[1]} was not found in the verified document evidence. ` +
          (existingTables ? `(Available tables in this document include: ${existingTables}). ` : "") +
          `Per factual grounding principles, I cannot assume or invent table contents that were not extracted.`,
      };
    }
  }

  // 2. Check Figure Request
  const figureMatch = q.match(/\b(?:figure|fig\.|chart|diagram|screenshot)\s*(\d+[a-zA-Z]?|\b[A-Z0-9.-]+)\b/i);
  if (figureMatch) {
    const reqFigNum = figureMatch[1].toLowerCase();
    const reqFigId = `figure_${reqFigNum}`;

    const foundInChunks = retrievedEvidence.some((item) => {
      const isFig = Boolean(item.isFigure || item.objectType === "figure" || item.figureMetadata);
      const oId = String(item.objectId || item.object_id || "").toLowerCase();
      const fId = String(item.figureMetadata?.figureId || "").toLowerCase();
      const fNum = String(item.figureNumber || item.figureMetadata?.figureNumber || "").toLowerCase();
      return isFig && (oId === reqFigId || oId === `figure ${reqFigNum}` || fId === reqFigId || fNum === reqFigNum);
    });

    const foundInDoc = Array.isArray(doc?.figures) && doc.figures.some((f) => {
      const fId = String(f.figureId || "").toLowerCase();
      const oId = String(f.objectId || "").toLowerCase();
      const fNum = String(f.figureNumber || "").toLowerCase();
      return fId === reqFigId || oId === reqFigId || oId === `figure ${reqFigNum}` || fNum === reqFigNum;
    });

    if (!foundInChunks) {
      if (foundInDoc) {
        return {
          isMissing: true,
          failureState: "FIGURE_NOT_PROCESSED",
          objectType: "figure",
          requestedId: `Figure ${figureMatch[1]}`,
          message:
            `FIGURE_NOT_PROCESSED: Figure ${figureMatch[1]} exists in the document, but its visual evidence has not been processed. ` +
            `Per factual grounding principles, I cannot describe an unseen figure or hallucinate its participants.`,
        };
      }

      const existingFigs = (doc?.figures || [])
        .map((f) => f.objectId || f.figureId || f.caption)
        .filter(Boolean)
        .slice(0, 5)
        .join(", ");

      return {
        isMissing: true,
        failureState: "FIGURE_NOT_FOUND",
        objectType: "figure",
        requestedId: `Figure ${figureMatch[1]}`,
        message:
          `Figure ${figureMatch[1]} was not found in the verified document evidence. ` +
          (existingFigs ? `(Available figures in this document include: ${existingFigs}). ` : "") +
          `Per factual grounding principles, I cannot describe an unseen figure or hallucinate its visual components.`,
      };
    }
  }

  return { isMissing: false };
};

/**
 * Builds an internal Evidence Ledger mapping extracted factual claims
 * to concrete source evidence objects.
 */
const buildEvidenceLedger = (rawAnswer = "", retrievedEvidence = []) => {
  const ledger = [];
  const sentences = rawAnswer
    .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const allEvidenceText = retrievedEvidence.map((e) => e.text || "").join("\n");

  for (const sentence of sentences) {
    // Check if sentence contains high-risk claims: numbers, percentages, dates, metric values
    const hasNumber = /\b\d+(?:\.\d+)?%?\b/.test(sentence);
    const hasReq = /\b[A-Z]{2,4}-[A-Z0-9]+-\d{2,4}\b/.test(sentence);
    const hasTableRef = /\bTable\s+\d+\b/i.test(sentence);
    const hasFigureRef = /\bFigure\s+\d+\b/i.test(sentence);

    const isHighRisk = hasNumber || hasReq || hasTableRef || hasFigureRef;

    // Find best supporting evidence chunk
    let bestEvidence = null;
    let maxOverlap = 0;
    const sentenceWords = new Set(
      sentence
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    for (const chunk of retrievedEvidence) {
      const chunkWords = new Set(
        (chunk.text || "")
          .toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 3)
      );

      let common = 0;
      for (const w of sentenceWords) {
        if (chunkWords.has(w)) common++;
      }

      if (common > maxOverlap) {
        maxOverlap = common;
        bestEvidence = chunk;
      }
    }

    const verified = maxOverlap >= Math.min(3, sentenceWords.size);

    ledger.push({
      claim: sentence,
      isHighRisk,
      verified,
      evidence: bestEvidence
        ? {
            documentId: bestEvidence.documentId,
            documentName: bestEvidence.documentName,
            page: bestEvidence.pageNumber,
            objectType: bestEvidence.objectType || (bestEvidence.isTable ? "table" : "text"),
            objectId: bestEvidence.objectId || null,
            citation: formatObjectCitation(bestEvidence),
          }
        : null,
    });
  }

  return ledger;
};

module.exports = {
  formatObjectCitation,
  checkMissingObjectFailure,
  buildEvidenceLedger,
};
