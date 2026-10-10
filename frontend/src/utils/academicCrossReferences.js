/**
 * DOCUMIND-AI Academic Cross-Reference & Numbering Resolver
 * 
 * Supports stable dynamic cross-references:
 * {{EQUATION:id}} -> Eq. (1)
 * {{FIGURE:id}}   -> Figure 1
 * {{TABLE:id}}    -> Table 1
 */

/**
 * Resolves sequential academic numbering for all manuscript objects
 * Equations: Eq. (1), Eq. (2)...
 * Figures: Figure 1, Figure 2...
 * Tables: Table 1, Table 2...
 */
export function resolveManuscriptNumbering(manuscriptObjects = []) {
  if (!Array.isArray(manuscriptObjects)) return [];

  let eqCounter = 1;
  let figCounter = 1;
  let tblCounter = 1;

  return manuscriptObjects.map((obj) => {
    const updated = { ...obj };

    if (obj.objectType === 'equation') {
      updated.equationNumber = eqCounter;
      updated.displayLabel = `Eq. (${eqCounter})`;
      eqCounter++;
    } else if (obj.objectType === 'figure' || obj.objectType === 'image' || obj.objectType === 'graph') {
      updated.figureNumber = figCounter;
      updated.displayLabel = `Figure ${figCounter}`;
      figCounter++;
    } else if (obj.objectType === 'table') {
      updated.tableNumber = tblCounter;
      updated.displayLabel = `Table ${tblCounter}`;
      tblCounter++;
    }

    return updated;
  });
}

/**
 * Replaces all cross-reference tags in text with resolved human-readable numbering
 * Example: "As formalized in {{EQUATION:eq-loss}} and shown in {{FIGURE:fig-arch}}"
 * becomes: "As formalized in Eq. (1) and shown in Figure 1"
 */
export function replaceCrossReferences(text = '', resolvedObjects = []) {
  if (!text || typeof text !== 'string') return '';
  if (!Array.isArray(resolvedObjects) || resolvedObjects.length === 0) {
    // If no objects resolved, clean up tags or leave fallback
    return text.replace(/\{\{(EQUATION|FIGURE|TABLE):([^}]+)\}\}/g, (match, type, id) => {
      if (type === 'EQUATION') return `Eq. (${id})`;
      if (type === 'FIGURE') return `Figure [${id}]`;
      if (type === 'TABLE') return `Table [${id}]`;
      return match;
    });
  }

  // Map by id
  const objectMap = new Map();
  resolvedObjects.forEach((obj) => {
    if (obj.id) objectMap.set(obj.id, obj);
  });

  return text.replace(/\{\{(EQUATION|FIGURE|TABLE):([^}]+)\}\}/g, (match, type, id) => {
    const found = objectMap.get(id);
    if (!found) {
      if (type === 'EQUATION') return `Eq. (?)`;
      if (type === 'FIGURE') return `Figure (?)`;
      if (type === 'TABLE') return `Table (?)`;
      return match;
    }

    if (type === 'EQUATION') {
      return found.displayLabel || `Eq. (${found.equationNumber || 1})`;
    }
    if (type === 'FIGURE') {
      return found.displayLabel || `Figure ${found.figureNumber || 1}`;
    }
    if (type === 'TABLE') {
      return found.displayLabel || `Table ${found.tableNumber || 1}`;
    }

    return match;
  });
}

/**
 * Validates that all cross-references in text correspond to valid manuscript objects
 */
export function validateCrossReferences(text = '', resolvedObjects = []) {
  if (!text) return { valid: true, unresolvedTags: [] };
  const objectIds = new Set(resolvedObjects.map((o) => o.id));
  const unresolvedTags = [];

  const regex = /\{\{(EQUATION|FIGURE|TABLE):([^}]+)\}\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [fullTag, type, id] = match;
    if (!objectIds.has(id)) {
      unresolvedTags.push({ fullTag, type, id });
    }
  }

  return {
    valid: unresolvedTags.length === 0,
    unresolvedTags,
  };
}

export default {
  resolveManuscriptNumbering,
  replaceCrossReferences,
  validateCrossReferences,
};
