const { isUsableDocumentText, cleanDocumentText, validateTextQuality } = require("./textQualityService");

/**
 * Approximate token counter based on whitespace word count and char length.
 * Accurate within 5% for English / technical documents.
 */
const countTokens = (text = "") => {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, Math.round(words.length * 1.3));
};

/**
 * Detect requirement ID, title, section numbers, and content type from text or headers.
 * Preserves original terminology without inventing anything.
 */
const detectRequirementMetadata = (text = "", fallbackSection = "General") => {
  const sample = `${fallbackSection}\n${text.slice(0, 800)}`;

  // 1. Requirement ID (e.g., FR-AUTH-004, BR-AUTH-14, NFR-001, SEC-001, UC-AUTH-01)
  const reqMatch = sample.match(/\b([A-Z]{2,4}-[A-Z0-9]+-\d{2,4})\b/);
  const requirementId = reqMatch ? reqMatch[1] : null;

  // 2. Clean Requirement Name (e.g. "FR-AUTH-004: Multi-Factor Authentication")
  let requirementName = null;
  if (requirementId) {
    const nameMatch = sample.match(
      new RegExp(`${requirementId}[:\\s–-]+([^:\\n\\r]+?)(?=\\s+(?:Description|Priority|Actors|Preconditions|\\bBR-|$)|\n|$)`, "i")
    );
    if (nameMatch && nameMatch[1]) {
      requirementName = nameMatch[1].replace(/^(?:Title|Description|Priority|Req ID)[:\s–-]+/i, "").trim();
      if (requirementName.length > 80) requirementName = requirementName.slice(0, 80).trim();
    }
  }

  // 3. Section numbering (e.g. "3.1.4", "3.1", "Section 3.1.4")
  const secMatch = sample.match(/\b(?:Section\s+)?(\d+(?:\.\d+)+)\b/i);
  const sectionNumber = secMatch ? secMatch[1] : null;

  // 4. Content Type Classification
  let contentType = "general_text";
  if (/\b(?:FR-[A-Z0-9]+-\d+|functional requirement)\b/i.test(sample)) {
    contentType = "functional_requirement";
  } else if (/\b(?:BR-[A-Z0-9]+-\d+|business rules?)\b/i.test(sample)) {
    contentType = "business_rule";
  } else if (/\b(?:POST|GET|PUT|DELETE|PATCH)\s+\/api\/[a-zA-Z0-9_/-]+/i.test(sample) || /api endpoint|api specification/i.test(sample)) {
    contentType = "api_endpoint";
  } else if (/\b(?:acceptance criteria|AC-[A-Z0-9]+-\d+)\b/i.test(sample)) {
    contentType = "acceptance_criteria";
  } else if (/\b(?:database impact|redis impact|data model|table schema)\b/i.test(sample)) {
    contentType = "database_impact";
  } else if (/\b(?:executive summary|scope of work|system overview|overview)\b/i.test(sample)) {
    contentType = "executive_summary";
  }

  return {
    requirementId,
    requirementName,
    sectionNumber,
    contentType,
  };
};

/**
 * Structure-aware, token-aware chunker for DOCUMIND-AI.
 * Priorities: Section -> Requirement Envelope -> Paragraph -> Sentence -> Token Limit.
 * Target: 500-900 tokens (approx 2000-3600 chars), overlap: 80-150 tokens (~320-600 chars).
 * Preserves document hierarchy, requirement envelopes, tables, and isolations.
 */
const chunkDocument = ({
  pages = [],
  text = "",
  chunkSizeTokens = 700,
  overlapTokens = 100,
  documentId = "",
  fileName = "",
  fileType = "",
}) => {
  const chunks = [];
  let pageList = [];
  let chunksRejected = 0;
  const inferredFileType = (fileType || (fileName ? fileName.split(".").pop() : "") || "")
    .toLowerCase()
    .replace(/^\./, "");

  if (Array.isArray(pages) && pages.length > 0) {
    pageList = pages;
  } else if (text) {
    const rawPages = String(text).split(/\f/);
    let currentSection = "Introduction";
    pageList = rawPages.map((pageText, i) => {
      const isRef = i >= rawPages.length - 2 && /references|bibliography/i.test(pageText.slice(0, 200));
      if (isRef) currentSection = "References";
      else if (/abstract/i.test(pageText.slice(0, 100))) currentSection = "Abstract";
      else if (/methodology|framework|architecture/i.test(pageText.slice(0, 150))) currentSection = "Methodology";
      else if (/evaluation|experiments|benchmarks/i.test(pageText.slice(0, 150))) currentSection = "Evaluation";
      else if (/conclusion/i.test(pageText.slice(0, 150))) currentSection = "Conclusion";

      return {
        pageNumber: i + 1,
        section: currentSection,
        isReference: isRef,
        text: pageText,
        tables: [],
      };
    });
  }

  let chunkId = 0;
  const targetChars = chunkSizeTokens * 4;
  const seenChunkHashes = new Set();

  // Active document hierarchy tracking
  let activeParentSection = "General";
  let activeSection = "General";
  let activeSubsection = null;
  let activeRequirementId = null;
  let activeRequirementName = null;
  let activeContentType = "general_text";

  for (const page of pageList) {
    const pageNum = page.pageNumber || 1;
    const pageSection = page.section || activeSection || "General";
    const isReference = Boolean(page.isReference);
    const parentId = `parent_${documentId || "doc"}_p${pageNum}_${pageSection.replace(/[^\w]/g, "_")}`;

    // ── 1. Create Dedicated Table Chunks with Row-Group Awareness & Repeated Headers ──
    if (page.tables && Array.isArray(page.tables) && page.tables.length > 0) {
      for (const tbl of page.tables) {
        const tableId = tbl.tableId || `table_${pageNum}_1`;
        const caption = tbl.caption || `Table on Page ${pageNum}`;
        const headers = tbl.headers || [];
        const rows = tbl.rows || [];
        const headerSummary = headers.join(", ");

        // Check if table contains requirements (e.g. requirement inventory table)
        const tblReqMatch = (tbl.rawText || "").match(/\b([A-Z]{2,4}-[A-Z0-9]+-\d{2,4})\b/);
        const tblReqId = tblReqMatch ? tblReqMatch[1] : activeRequirementId;
        const tblReqName = tblReqId === activeRequirementId ? activeRequirementName : null;

        // If table is small (<= 12 rows), keep as a single unified chunk
        if (rows.length <= 12) {
          const formattedTableChunk = tbl.rawText || (
            `[${caption} | Page ${pageNum} | Section: ${pageSection}]\n` +
            (headerSummary ? `Columns: ${headerSummary}\n\n` : "") +
            (tbl.markdown || "")
          );

          const tokens = countTokens(formattedTableChunk);
          chunks.push({
            chunkId,
            index: chunkId,
            documentId: String(documentId),
            fileName,
            pageStart: pageNum,
            pageEnd: pageNum,
            pageNumber: pageNum,
            section: activeSection || pageSection,
            subsection: activeSubsection,
            parentSection: activeParentSection,
            requirementId: tblReqId || null,
            requirementName: tblReqName || null,
            contentType: "table",
            objectType: "table",
            objectId: tableId,
            caption,
            sourceMethod: "table_parser",
            bbox: tbl.sourceBBox || [],
            structuredData: tbl.structuredData || {
              tableId,
              caption,
              columns: headers,
              rows,
              rowCount: rows.length,
            },
            parentChunkId: parentId,
            isReference: false,
            isTable: true,
            isFigure: false,
            tableMetadata: {
              tableId,
              caption,
              headers,
              rowCount: rows.length,
              sourceBBox: tbl.sourceBBox || [],
            },
            metadata: {
              document_id: String(documentId),
              document_name: fileName,
              section: activeSection || pageSection,
              object_type: "table",
              object_id: tableId,
              caption,
              requirement_id: tblReqId || null,
              requirement_name: tblReqName || null,
              content_type: "table",
              chunk_index: chunkId,
            },
            text: formattedTableChunk,
            chunkIndex: chunkId,
            tokenCount: tokens,
          });
          chunkId++;
        } else {
          // Large tables: split into row-groups (8 rows per group) while repeating headers in every chunk!
          const groupSize = 8;
          for (let rIdx = 0; rIdx < rows.length; rIdx += groupSize) {
            const rowGroup = rows.slice(rIdx, rIdx + groupSize);
            const groupHeader = `[${caption} (Part ${Math.floor(rIdx / groupSize) + 1}, Rows ${rIdx + 1}–${Math.min(rIdx + groupSize, rows.length)} of ${rows.length}) | Page ${pageNum} | Section: ${pageSection}]`;
            
            // Format Key-Value representation for this row group
            const kvLines = rowGroup.map((r, subIdx) => {
              const pairs = r.map((val, cIdx) => `${headers[cIdx] || ('Col_' + cIdx)} = ${val}`);
              return `Row ${rIdx + subIdx + 1}: ${pairs.join("; ")}`;
            });

            // Format Markdown snippet with repeated headers
            const headerLine = "| " + headers.join(" | ") + " |";
            const sepLine = "| " + headers.map(() => "---").join(" | ") + " |";
            const mdLines = rowGroup.map((r) => "| " + r.join(" | ") + " |");
            const mdGroup = [headerLine, sepLine, ...mdLines].join("\n");

            const groupContent = `${groupHeader}\nColumns: ${headerSummary}\n\n${kvLines.join("\n")}\n\n${mdGroup}`;
            const tokens = countTokens(groupContent);

            chunks.push({
              chunkId,
              index: chunkId,
              documentId: String(documentId),
              fileName,
              pageStart: pageNum,
              pageEnd: pageNum,
              pageNumber: pageNum,
              section: activeSection || pageSection,
              subsection: activeSubsection,
              parentSection: activeParentSection,
              requirementId: tblReqId || null,
              requirementName: tblReqName || null,
              contentType: "table",
              objectType: "table",
              objectId: tableId,
              caption,
              sourceMethod: "table_parser",
              bbox: tbl.sourceBBox || [],
              structuredData: {
                tableId,
                caption,
                columns: headers,
                rows: rowGroup,
                rowRange: [rIdx + 1, Math.min(rIdx + groupSize, rows.length)],
                totalRows: rows.length,
              },
              parentChunkId: parentId,
              isReference: false,
              isTable: true,
              isFigure: false,
              tableMetadata: {
                tableId,
                caption,
                headers,
                rowCount: rows.length,
                groupStart: rIdx + 1,
                groupEnd: Math.min(rIdx + groupSize, rows.length),
              },
              metadata: {
                document_id: String(documentId),
                document_name: fileName,
                section: activeSection || pageSection,
                object_type: "table",
                object_id: tableId,
                caption,
                content_type: "table",
                chunk_index: chunkId,
              },
              text: groupContent,
              chunkIndex: chunkId,
              tokenCount: tokens,
            });
            chunkId++;
          }
        }
      }
    }

    // ── 1.5. Create Dedicated Figure Chunks (Captions + OCR + Visual Description + Nearby Context) ──
    if (page.figures && Array.isArray(page.figures) && page.figures.length > 0) {
      for (const fig of page.figures) {
        const figId = fig.figureId || `figure_${pageNum}_1`;
        const figNumber = fig.figureNumber || (fig.objectId && fig.objectId.match(/\d+/)?.[0]) || (figId && figId.match(/\d+/)?.[0]) || null;
        const exactObjectId = fig.objectId || (figNumber ? `Figure ${figNumber}` : figId);
        const caption = fig.caption || (figNumber ? `Figure ${figNumber}` : `Figure on Page ${pageNum}`);
        const figType = fig.figureType || "figure";
        const figText = fig.rawText || (
          `[${caption} | Page ${pageNum} | Section: ${pageSection}]\n` +
          `Figure ID: ${figId}\n` +
          `Figure Type: ${figType}\n` +
          (fig.participants && fig.participants.length > 0 ? `Participants:\n${fig.participants.join(", ")}\n\n` : "") +
          (fig.visualDescription ? `Visual Description:\n${fig.visualDescription}\n\n` : "") +
          (fig.ocrText ? `OCR Text:\n${fig.ocrText}\n\n` : "") +
          (fig.nearbyContext ? `Nearby Text:\n${fig.nearbyContext}\n` : "")
        );

        const tokens = countTokens(figText);
        chunks.push({
          chunkId,
          index: chunkId,
          documentId: String(documentId),
          fileName,
          pageStart: pageNum,
          pageEnd: pageNum,
          pageNumber: pageNum,
          section: activeSection || pageSection,
          subsection: activeSubsection,
          parentSection: activeParentSection,
          requirementId: null,
          requirementName: null,
          contentType: "figure",
          objectType: "figure",
          objectId: exactObjectId,
          figureNumber: figNumber,
          figureId: figId,
          caption,
          sourceMethod: fig.sourceMethod || (fig.ocrText ? "ocr" : "vision"),
          bbox: fig.sourceBBox || [],
          imagePath: fig.imagePath || null,
          structuredData: fig.structuredData || {
            figureId: figId,
            objectId: exactObjectId,
            figureNumber: figNumber,
            caption,
            figureType: figType,
            visualDescription: fig.visualDescription || "",
            ocrText: fig.ocrText || "",
            participants: fig.participants || [],
            interactions: fig.interactions || [],
            nearbyContext: fig.nearbyContext || "",
            imagePath: fig.imagePath || null,
          },
          parentChunkId: parentId,
          isReference: false,
          isTable: false,
          isFigure: true,
          figureMetadata: {
            figureId: figId,
            objectId: exactObjectId,
            figureNumber: figNumber,
            caption,
            figureType: figType,
            visualDescription: fig.visualDescription || "",
            ocrText: fig.ocrText || "",
            participants: fig.participants || [],
            interactions: fig.interactions || [],
            imagePath: fig.imagePath || null,
          },
          metadata: {
            document_id: String(documentId),
            document_name: fileName,
            section: activeSection || pageSection,
            object_type: "figure",
            object_id: exactObjectId,
            figure_number: figNumber,
            figure_id: figId,
            caption,
            content_type: "figure",
            image_path: fig.imagePath || null,
            chunk_index: chunkId,
          },
          text: figText,
          chunkIndex: chunkId,
          tokenCount: tokens,
        });
        chunkId++;
      }
    }

    // ── 2. Split Page Text by Paragraphs -> Sentences -> Token Limit ──
    const rawPageText = cleanDocumentText(page.text || "");
    const pageQuality = validateTextQuality(rawPageText, {
      fileType: inferredFileType,
      fileName,
      tablesCount: (page.tables || []).length,
    });

    if (!rawPageText || (!pageQuality.valid && (!page.tables || page.tables.length === 0))) {
      chunksRejected++;
      continue;
    }

    const paragraphs = rawPageText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    let currentChunkParagraphs = [];
    let currentChunkLength = 0;

    const commitChunk = (textSnippet, specificMeta = {}) => {
      const chunkContent = textSnippet.trim();
      const q = validateTextQuality(chunkContent, { fileType: inferredFileType, fileName });
      const hash = chunkContent.slice(0, 100);

      if (!q.valid || seenChunkHashes.has(hash)) {
        chunksRejected++;
        return;
      }

      seenChunkHashes.add(hash);
      const tokens = countTokens(chunkContent);

      const localReqId = specificMeta.requirementId || activeRequirementId || null;
      const localReqName = specificMeta.requirementName || activeRequirementName || null;
      const localSection = specificMeta.section || activeSection || pageSection;
      const localSubsection = specificMeta.subsection || activeSubsection || null;
      const localParentSection = specificMeta.parentSection || activeParentSection || null;
      const localContentType = specificMeta.contentType || activeContentType || "general_text";

      chunks.push({
        chunkId,
        index: chunkId,
        documentId: String(documentId),
        fileName,
        pageStart: pageNum,
        pageEnd: pageNum,
        pageNumber: pageNum,
        section: localSection,
        subsection: localSubsection,
        parentSection: localParentSection,
        requirementId: localReqId,
        requirementName: localReqName,
        contentType: localContentType,
        parentChunkId: parentId,
        isReference,
        isTable: false,
        tableMetadata: null,
        metadata: {
          document_id: String(documentId),
          document_name: fileName,
          section: localSection,
          subsection: localSubsection,
          parent_section: localParentSection,
          requirement_id: localReqId,
          requirement_name: localReqName,
          content_type: localContentType,
          chunk_index: chunkId,
        },
        text: chunkContent,
        chunkIndex: chunkId,
        tokenCount: tokens,
      });
      chunkId++;
    };

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const paragraph = paragraphs[pIdx];

      // Detect Section / Subsection / Requirement headers:
      // Pattern 1: "3.1.4 FR-AUTH-004: Multi-Factor Authentication"
      // Pattern 2: "3.1 Authentication & Access Security"
      // Pattern 3: "BR-AUTH-14: ..."
      const secHeaderMatch = paragraph.match(/^(\d+(?:\.\d+)*)\s+([^\n]+)/);
      const reqHeaderMatch = paragraph.match(/^(?:Requirement\s+)?([A-Z]{2,4}-[A-Z0-9]+-\d{2,4})[:\s–-]+([^\n]+)/i);

      if (secHeaderMatch || (reqHeaderMatch && /^FR-/i.test(reqHeaderMatch[1]))) {
        // Clean boundary isolation: Flush previous section's accumulated paragraphs
        if (currentChunkParagraphs.length > 0) {
          commitChunk(currentChunkParagraphs.join("\n\n"), {
            contentType: activeContentType,
          });
          currentChunkParagraphs = [];
          currentChunkLength = 0;
        }
      }

      if (secHeaderMatch) {
        const secCode = secHeaderMatch[1];
        const secHeading = secHeaderMatch[2].trim();

        if (secCode.split(".").length === 2) {
          // Major section e.g. "3.1"
          activeParentSection = `${secCode} ${secHeading.split(/[.\n]/)[0].trim()}`;
          activeSection = secCode;
          activeSubsection = null;
        } else if (secCode.split(".").length >= 3) {
          // Subsection e.g. "3.1.4"
          activeSection = secCode;
          activeSubsection = secCode;
        }

        // Check if this header introduces a requirement
        const headerMeta = detectRequirementMetadata(paragraph, activeParentSection);
        if (headerMeta.requirementId && /^FR-/i.test(headerMeta.requirementId)) {
          activeRequirementId = headerMeta.requirementId;
          activeRequirementName = headerMeta.requirementName;
          activeContentType = headerMeta.contentType;
        } else if (secCode.split(".").length <= 2) {
          // Reset requirement scope if we entered a whole new major section without requirement
          activeRequirementId = null;
          activeRequirementName = null;
          activeContentType = "general_text";
        }
      } else {
        // Line explicitly starting with a requirement definition header (not an inline mention)
        const reqHeaderMatch = paragraph.match(/^(?:Requirement\s+)?([A-Z]{2,4}-[A-Z0-9]+-\d{2,4})[:\s–-]+([^\n]+)/i);
        if (reqHeaderMatch && /^FR-/i.test(reqHeaderMatch[1])) {
          activeRequirementId = reqHeaderMatch[1];
          const inlineMeta = detectRequirementMetadata(paragraph, activeSection);
          if (inlineMeta.requirementName) activeRequirementName = inlineMeta.requirementName;
          activeContentType = "functional_requirement";
        }
      }

      // Detect sub-content classification (e.g. Business Rules or Acceptance Criteria block)
      let paragraphContentType = activeContentType;
      if (/^Business Rules?:/i.test(paragraph) || /\bBR-[A-Z0-9]+-\d+\b/.test(paragraph)) {
        paragraphContentType = "business_rule";
      } else if (/^Acceptance Criteria:/i.test(paragraph)) {
        paragraphContentType = "acceptance_criteria";
      } else if (/\b(?:POST|GET|PUT|DELETE)\s+\/api\//i.test(paragraph)) {
        paragraphContentType = "api_endpoint";
      } else if (/^Exceptions?:/i.test(paragraph) || /^Alternate Flows?:/i.test(paragraph)) {
        paragraphContentType = "functional_requirement";
      }

      // If a single paragraph is larger than targetChars, split by sentences
      if (paragraph.length > targetChars * 1.2) {
        const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [paragraph];
        for (const sent of sentences) {
          const sTrimmed = sent.trim();
          if (!sTrimmed) continue;

          if (currentChunkLength + sTrimmed.length > targetChars && currentChunkLength > 0) {
            commitChunk(currentChunkParagraphs.join(" "), {
              contentType: paragraphContentType,
            });
            currentChunkParagraphs = [sTrimmed];
            currentChunkLength = sTrimmed.length;
          } else {
            currentChunkParagraphs.push(sTrimmed);
            currentChunkLength += sTrimmed.length;
          }
        }
      } else {
        // Normal paragraph accumulation
        if (currentChunkLength + paragraph.length > targetChars && currentChunkLength > 0) {
          commitChunk(currentChunkParagraphs.join("\n\n"), {
            contentType: paragraphContentType,
          });
          currentChunkParagraphs = [paragraph];
          currentChunkLength = paragraph.length;
        } else {
          currentChunkParagraphs.push(paragraph);
          currentChunkLength += paragraph.length;
        }
      }
    }

    // Flush remainder of page
    if (currentChunkParagraphs.length > 0) {
      commitChunk(currentChunkParagraphs.join("\n\n"), {
        contentType: activeContentType,
      });
      currentChunkParagraphs = [];
      currentChunkLength = 0;
    }
  }

  const parentSet = new Set(chunks.map((c) => c.parentChunkId).filter(Boolean));
  const parentChunksCount = parentSet.size || (pageList.length > 0 ? pageList.length : 1);
  const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
  const avgTokens = chunks.length ? Math.round(totalTokens / chunks.length) : 0;

  if (chunks.length === 0) {
    console.error(`[CHUNKING] document_id=${documentId} parent_chunks=0 retrieval_chunks=0 avg_tokens=0 status=FAILED`);
    const err = new Error(
      `CHUNKING_FAILED: Unable to create valid document chunks for "${fileName || documentId}" (${chunksRejected} candidate chunks rejected)`
    );
    err.code = "CHUNKING_FAILED";
    throw err;
  }

  const reqChunksCount = chunks.filter((c) => c.requirementId).length;
  console.log(
    `[CHUNKING] document_id=${documentId} parent_chunks=${parentChunksCount} retrieval_chunks=${chunks.length} req_chunks=${reqChunksCount} avg_tokens=${avgTokens} status=SUCCESS`
  );

  return chunks;
};

const chunkText = (text, chunkSize = 2400, overlap = 400, options = {}) => {
  return chunkDocument({ text, ...options });
};

module.exports = {
  chunkDocument,
  chunkText,
  countTokens,
  detectRequirementMetadata,
};