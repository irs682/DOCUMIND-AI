/**
 * Query Type Router for DOCUMIND-AI
 * Classifies queries into multimodal routing modes and extracts target object identifiers:
 * - GENERAL_QUERY
 * - SECTION_QUERY
 * - REQUIREMENT_QUERY
 * - TABLE_QUERY
 * - FIGURE_QUERY
 * - COMPLETE_EXTRACTION
 * - COMPARISON_QUERY
 * - EXACT_IDENTIFIER_QUERY
 */

const COMPLETE_EXTRACTION_KEYWORDS = [
  "all",
  "every",
  "complete",
  "entire",
  "full list",
  "extract all",
  "list all",
  "list every",
  "all rows",
  "every row",
  "all requirements",
  "all exclusions",
  "all items",
  "as stated in the table",
];

const classifyQuery = (query = "") => {
  const q = String(query).trim();
  const lower = q.toLowerCase();

  // 1. Detect Complete Extraction intent
  const isCompleteExtraction = COMPLETE_EXTRACTION_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
    return regex.test(lower);
  });

  // 2. Exact Requirement IDs (e.g., FR-AUTH-004, BR-AUTH-14, NFR-001, REQ-104)
  const reqMatch = q.match(/\b([A-Z]{2,4}-[A-Z0-9]+-\d{2,4})\b/i);
  const requirementId = reqMatch ? reqMatch[1].toUpperCase() : null;

  // 3. Exact Table Identifier (e.g. "Table 1", "Table 4", "Table 2.1", "Tab. 3")
  const tableMatch = q.match(/\b(?:table|tab\.)\s*(\d+[a-zA-Z]?|\b[A-Z0-9.-]+)\b/i);
  const tableId = tableMatch ? `table_${tableMatch[1].toLowerCase()}` : null;
  const tableNumber = tableMatch ? tableMatch[1] : null;

  // 4. Exact Figure / Diagram / Chart Identifier (e.g. "Figure 3", "Fig. 3", "figure three", "Chart 3", "Diagram 4")
  const WORD_TO_NUM = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10' };
  const figureMatch = q.match(/\b(?:figure|fig\.?|chart|diagram|screenshot|illustration)\s*(\d+[a-zA-Z]?|\b[A-Z0-9.-]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
  let figureNumber = null;
  let exactFigureId = null;
  let figureId = null;

  if (figureMatch) {
    let matchedRaw = figureMatch[1].trim();
    if (WORD_TO_NUM[matchedRaw.toLowerCase()]) {
      matchedRaw = WORD_TO_NUM[matchedRaw.toLowerCase()];
    }
    figureNumber = matchedRaw;
    exactFigureId = `Figure ${matchedRaw}`;
    figureId = `figure_${matchedRaw.toLowerCase()}`;
  }

  // 5. Section Identifier (e.g. "Section 3.2", "Section 9.2.2", "§3.2")
  const secMatch = q.match(/\b(?:section|§)\s*(\d+(?:\.\d+)*)\b/i);
  const sectionNumber = secMatch ? secMatch[1] : null;

  // 6. Comparison check
  const isComparison = /\b(compare|comparison|difference|differences|versus|vs\.?|contrast)\b/i.test(lower);

  // Classify primary query type
  let queryType = "GENERAL_QUERY";
  let targetObjectType = null;
  let targetObjectId = null;

  if (isComparison && (tableId || figureId || /\btables?\b/i.test(lower))) {
    queryType = "COMPARISON_QUERY";
    targetObjectType = tableId ? "table" : (figureId ? "figure" : null);
  } else if (exactFigureId || figureId || /\b(figure|fig\.?|diagram|chart|graph|screenshot|image|illustration|flowchart)\b/i.test(lower)) {
    queryType = "FIGURE_QUERY";
    targetObjectType = "figure";
    targetObjectId = exactFigureId || figureId;
  } else if (tableId || (isCompleteExtraction && /\btable\b/i.test(lower))) {
    queryType = "TABLE_QUERY";
    targetObjectType = "table";
    targetObjectId = tableId;
  } else if (isCompleteExtraction) {
    queryType = "COMPLETE_EXTRACTION";
    if (requirementId || /\brequirements?\b/i.test(lower)) {
      targetObjectType = "requirement";
      targetObjectId = requirementId;
    } else if (sectionNumber) {
      targetObjectType = "section";
      targetObjectId = sectionNumber;
    }
  } else if (requirementId) {
    queryType = "EXACT_IDENTIFIER_QUERY";
    targetObjectType = "requirement";
    targetObjectId = requirementId;
  } else if (sectionNumber) {
    queryType = "SECTION_QUERY";
    targetObjectType = "section";
    targetObjectId = sectionNumber;
  } else if (/\b(out of scope|in scope|scope boundaries|exclusions)\b/i.test(lower)) {
    queryType = "COMPLETE_EXTRACTION";
    targetObjectType = "table";
  }

  const routerPlan = {
    queryType,
    query_type: queryType,
    targetObjectType,
    targetObjectId,
    targetObjectNumber: figureNumber || tableNumber || requirementId || sectionNumber,
    object_id: exactFigureId || targetObjectId,
    objectId: exactFigureId || targetObjectId,
    figure_number: figureNumber,
    figureNumber,
    figureId,
    exactFigureId,
    isCompleteExtraction,
    isComparison,
    requirementId,
    tableId,
    tableNumber,
    sectionNumber,
    searchPreferences: {
      preferredObjectType: targetObjectType,
      exactMatchRequired: Boolean(tableId || figureId || requirementId),
      boostFactor: targetObjectType ? 2.5 : 1.0,
    },
  };

  console.log(`[FIGURE_QUERY] query="${q.slice(0, 60)}" normalized_id="${exactFigureId || targetObjectId || 'none'}" figure_number="${figureNumber || 'none'}"`);
  return routerPlan;
};

module.exports = {
  classifyQuery,
  COMPLETE_EXTRACTION_KEYWORDS,
};
