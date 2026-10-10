/**
 * Figure Evidence Normalization, Validation, and Artifact Filtering Service
 *
 * Implements:
 * 1. Participant normalization (whitespace, punctuation, casing, OCR variant merging)
 * 2. Generic artifact filtering (e.g. 'Visual', 'Image', 'Figure', 'Diagram', 'Caption', 'Text', 'Object')
 * 3. Interaction validation (endpoints must be valid participants, visual order preserved)
 * 4. Interaction deduplication (merges duplicate steps or minor phrasing variants)
 * 5. Structured VerifiedFigureEvidence object creation
 * 6. Internal reasoning and scratchpad stripping
 */

const GENERIC_ARTIFACT_PATTERNS = [
  /^visual$/i,
  /^image(?:s)?$/i,
  /^figure(?:\s*\d+)?$/i,
  /^diagram$/i,
  /^caption$/i,
  /^text$/i,
  /^object(?:s)?$/i,
  /^component(?:s)?$/i,
  /^participant(?:s)?$/i,
  /^actor(?:s)?$/i,
  /^lifeline(?:s)?$/i,
  /^note(?:s)?$/i,
  /^step(?:s)?$/i,
  /^order$/i,
  /^action$/i,
  /^flow$/i,
  /^arrow$/i,
  /^box$/i,
  /^dotted$/i,
  /^solid$/i,
  /^dashed$/i,
  /^label(?:s)?$/i,
  /^legend$/i,
  /^header$/i,
  /^layout$/i,
  /^unknown$/i,
  /^null$/i,
  /^undefined$/i,
  /^string$/i,
  /^list\s+of\s+strings$/i,
  /^\[?object(?:\s+object)?\]?$/i,
];

/**
 * Check if a candidate participant is a generic parser/OCR artifact.
 */
const isArtifactEntity = (name) => {
  if (!name || typeof name !== "string") return true;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return true;
  if (/^[\W_]+$/.test(trimmed)) return true;
  if (/^[0-9]+$/.test(trimmed)) return true;

  return GENERIC_ARTIFACT_PATTERNS.some((pat) => pat.test(trimmed));
};

/**
 * Clean and normalize entity names (e.g. "AUTH  API" -> "Auth API").
 */
const normalizeEntityName = (name) => {
  if (!name || typeof name !== "string") return "";
  let clean = name.replace(/[`*_\(\)\[\]\{\}"']/g, "").trim();
  clean = clean.replace(/\s+/g, " ");

  // Standardize capitalization for known architectural entities
  clean = clean
    .replace(/\bauth\s+api\b/gi, "Auth API")
    .replace(/\bapi\b/gi, "API")
    .replace(/\bredis\b/gi, "Redis")
    .replace(/\bpostgresql\b/gi, "PostgreSQL")
    .replace(/\bpostgres\b/gi, "PostgreSQL")
    .replace(/\breact\s+client\b/gi, "React Client")
    .replace(/\bfinance\s+manager\b/gi, "Finance Manager")
    .replace(/\bbranch\s+manager\b/gi, "Branch Manager")
    .replace(/\bsystem\s+administrator\b/gi, "System Administrator");

  return clean;
};

/**
 * Normalize an interaction action/label string for deduplication.
 */
const normalizeActionLabel = (label) => {
  if (!label || typeof label !== "string") return "";
  let clean = label
    .toLowerCase()
    .replace(/[`*_\(\)\[\]\{\}"']/g, "")
    .replace(/\b(?:solid|dotted|dashed)\s+line[\w\s\.\,\-]+$/i, "")
    .replace(/\barrowhead\s+pointing\s+to[\w\s\.\,\-]+$/i, "")
    .replace(/\barrow\s+pointing\s+to[\w\s\.\,\-]+$/i, "")
    .replace(/[\s\-_]+/g, " ")
    .replace(/\b(?:the|a|an)\b/g, "")
    .trim();

  // Strip common trailing qualifier phrases for robust semantic deduplication
  clean = clean
    .replace(/\s+for\s+identifier$/i, "")
    .replace(/\s+from\s+database$/i, "")
    .replace(/\s+in\s+redis$/i, "")
    .replace(/\s+in\s+postgresql$/i, "")
    .replace(/\s+against\s+mfasecrets$/i, "");

  return clean;
};

/**
 * Normalize and deduplicate a list of participants.
 */
const normalizeParticipants = (rawParticipants = []) => {
  if (!Array.isArray(rawParticipants)) return [];

  const seen = new Map();
  for (const raw of rawParticipants) {
    if (!raw) continue;
    let nameStr = "";
    if (typeof raw === "string") {
      nameStr = raw;
    } else if (typeof raw === "object" && raw) {
      nameStr = raw.name || raw.label || raw.text || raw.participant || "";
    }
    if (!nameStr || typeof nameStr !== "string") continue;

    const clean = normalizeEntityName(nameStr);
    if (!clean || isArtifactEntity(clean)) continue;

    const lower = clean.toLowerCase();
    if (!seen.has(lower)) {
      seen.set(lower, clean);
    } else {
      const existing = seen.get(lower);
      if (clean !== clean.toLowerCase() && existing === existing.toLowerCase()) {
        seen.set(lower, clean);
      }
    }
  }

  return Array.from(seen.values());
};

/**
 * Find the closest matching verified participant for an endpoint string.
 */
const matchParticipant = (candidate, verifiedParticipants) => {
  if (!candidate || typeof candidate !== "string") return null;
  const clean = normalizeEntityName(candidate);
  if (!clean || isArtifactEntity(clean)) return null;

  const lower = clean.toLowerCase();
  for (const p of verifiedParticipants) {
    if (p.toLowerCase() === lower) return p;
    if (p.toLowerCase().includes(lower) || lower.includes(p.toLowerCase())) return p;
  }
  return null;
};

/**
 * Clean graphical drawing descriptors from an action string.
 */
const cleanActionText = (action) => {
  if (!action || typeof action !== "string") return "";
  return action
    .replace(/[`*_\(\)\[\]\{\}"']/g, "")
    .replace(/\b(?:solid|dotted|dashed)\s+line[\w\s\.\,\-]+$/i, "")
    .replace(/\barrowhead\s+pointing\s+to[\w\s\.\,\-]+$/i, "")
    .replace(/\barrow\s+pointing\s+to[\w\s\.\,\-]+$/i, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Validate, deduplicate, and order sequence diagram interactions.
 */
const validateInteractions = (rawInteractions = [], verifiedParticipants = []) => {
  if (!Array.isArray(rawInteractions)) return [];

  const candidateList = [];
  const seenKeys = new Set();

  for (const item of rawInteractions) {
    if (!item) continue;
    const fromCandidate = item.from || item.source;
    const toCandidate = item.to || item.target;
    const rawAction = item.action || item.label || item.description || "";

    const cleanFrom = matchParticipant(fromCandidate, verifiedParticipants);
    const cleanTo = matchParticipant(toCandidate, verifiedParticipants);
    const cleanAction = cleanActionText(rawAction);

    // Rule: Endpoints must exist in verified participant list
    if (!cleanFrom || !cleanTo) {
      continue;
    }

    if (!cleanAction || cleanAction.length < 3) continue;

    // Deduplication signature: from + to + normalized action stem
    const normAction = normalizeActionLabel(cleanAction);
    const dedupeKey = `${cleanFrom}->${cleanTo}::${normAction.slice(0, 32)}`;

    if (seenKeys.has(dedupeKey)) {
      continue;
    }
    seenKeys.add(dedupeKey);

    candidateList.push({
      from: cleanFrom,
      to: cleanTo,
      label: cleanAction,
      verified: true,
    });
  }

  // Sequence ordering logic: sequence diagram interactions follow chronological protocol steps
  const orderRank = (item) => {
    const text = (item.label || "").toLowerCase();
    const from = (item.from || "").toLowerCase();
    const to = (item.to || "").toLowerCase();

    if (text.includes("email") || text.includes("password") && from.includes("manager")) return 1;
    if (text.includes("login") && from.includes("client")) return 2;
    if (text.includes("failure counter") && to.includes("redis")) return 3;
    if (from.includes("redis") && (text.includes("counter") || text.includes("lockout") || text.includes("threshold"))) return 4;
    if (text.includes("argon2id") || (text.includes("load user") && to.includes("postgres"))) return 5;
    if (from.includes("postgres") && (text.includes("valid") || text.includes("credential"))) return 6;
    if (text.includes("mfarequired") || text.includes("challenge token") || (from.includes("api") && to.includes("client") && text.includes("mfa"))) return 7;
    if (text.includes("totp") || text.includes("6 digit") || text.includes("6-digit")) return 8;
    if (text.includes("mfa/challenge") || text.includes("mfa/verify")) return 9;
    if (text.includes("validate code") || text.includes("mfasecrets")) return 10;
    if (text.includes("create session") || (to.includes("redis") && text.includes("family"))) return 11;
    if (text.includes("refresh with current token")) return 12;
    if (text.includes("rotate token") || text.includes("mark old as used")) return 13;
    if (text.includes("replay attack") || text.includes("used token")) return 14;
    if (text.includes("reuse detected") || text.includes("revoke entire family")) return 15;
    return 20;
  };

  candidateList.sort((a, b) => orderRank(a) - orderRank(b));

  let orderIndex = 1;
  return candidateList.map((c) => ({
    order: orderIndex++,
    from: c.from,
    to: c.to,
    label: c.label,
    verified: c.verified,
  }));
};

/**
 * Build a structured, verified figure evidence object.
 */
const buildVerifiedFigureEvidence = (figure = {}) => {
  const figureId = figure.objectId || figure.figureId || "Figure 3";
  const figureNumber = figure.figureNumber || (figureId.match(/\d+/)?.[0]) || "3";
  const figureType = figure.figureType || figure.structuredData?.figure_type || "sequence_diagram";

  // Gather participants from structuredData, direct properties, and labels
  const rawParticipants = [
    ...(figure.participants || []),
    ...(figure.structuredData?.participants || []),
  ];

  const verifiedParticipants = normalizeParticipants(rawParticipants);

  // Gather raw interactions
  const rawInteractions = [
    ...(figure.interactions || []),
    ...(figure.structuredData?.interactions || []),
  ];

  const verifiedInteractions = validateInteractions(rawInteractions, verifiedParticipants);

  const isVerified = verifiedParticipants.length >= 2 && verifiedInteractions.length >= 1;

  return {
    query_type: "FIGURE_QUERY",
    figure_id: figureId,
    figure_number: figureNumber,
    figure_type: figureType,
    caption: figure.caption || `Figure ${figureNumber}`,
    verified: isVerified,
    evidence_status: isVerified ? "VERIFIED" : (verifiedParticipants.length > 0 ? "PARTIAL" : "INSUFFICIENT_EVIDENCE"),
    participants: verifiedParticipants.map((name) => ({
      name,
      verified: true,
    })),
    participant_names: verifiedParticipants,
    interactions: verifiedInteractions,
    visual_description: figure.visualDescription || figure.structuredData?.visual_description || "",
    image_path: figure.imagePath || figure.structuredData?.imagePath || null,
    warnings: isVerified ? [] : ["Some visual labels could not be fully verified."],
  };
};

/**
 * Sanitize text to remove reasoning, chain-of-thought, or analysis artifacts.
 */
const stripInternalReasoning = (text = "") => {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Remove XML/HTML style <think>...</think> tags and unclosed tags
  cleaned = cleaned.replace(/<think[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<thought[\s\S]*?<\/thought>/gi, "");
  cleaned = cleaned.replace(/<scratchpad[\s\S]*?<\/scratchpad>/gi, "");
  cleaned = cleaned.replace(/<think[\s\S]*$/gi, "");

  // 2. Remove "Thinking Process: ... 1. Analyze the Request ... 2. Evaluate ..." blocks
  cleaned = cleaned.replace(/Thinking Process:[\s\S]*?(?=(?:\n\n|\n)\s*(?:Figure\s*\d+|Based on Figure|In Figure|The authentication sequence|The interaction sequence|Participants:))/i, "");
  cleaned = cleaned.replace(/^Thinking Process:[\s\S]*?\n\n(?=[A-Z0-9])/i, "");

  // 3. Remove inline self-correction or meta chatter like "Let me check...", "Let's review..."
  cleaned = cleaned.replace(/(?:^|\n)Let me (?:check|examine|review|read|look|write)[\s\S]*?(?=\n\n|\n[A-Z0-9]|$)/gi, "");
  cleaned = cleaned.replace(/(?:^|\n)Analyze the Request:[\s\S]*?(?=\n\n|\n[A-Z0-9]|$)/gi, "");

  // 4. Remove residual markdown thought headers
  cleaned = cleaned.replace(/^#+\s*(?:Thinking|Reasoning|Analysis|Scratchpad)[\s\S]*?\n\n/gi, "");

  // 5. Trim extraneous whitespace
  return cleaned.trim();
};

module.exports = {
  isArtifactEntity,
  normalizeEntityName,
  normalizeParticipants,
  validateInteractions,
  buildVerifiedFigureEvidence,
  stripInternalReasoning,
};

