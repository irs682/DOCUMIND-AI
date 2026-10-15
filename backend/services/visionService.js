const fs = require("fs");
const path = require("path");
const {
  isArtifactEntity,
  normalizeParticipants,
  validateInteractions,
  buildVerifiedFigureEvidence,
} = require("./figureEvidenceValidatorService");

const getVisionModel = () => {
  return (process.env.OPENROUTER_VISION_MODEL || "dots-studio/dots-3-note-preview:free").trim();
};

const getBaseUrl = () => {
  return (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
};

const { execSync } = require("child_process");

const optimizeImageForVision = (imagePath) => {
  try {
    const stat = fs.statSync(imagePath);
    if (stat.size > 150 * 1024) {
      const optPath = imagePath.replace(/(\.[^.]+)$/, "_web$1");
      const normalizedSrc = imagePath.replace(/\\/g, "/");
      const normalizedDst = optPath.replace(/\\/g, "/");
      const pythonCmd = `python -c "from PIL import Image; im = Image.open(r'${normalizedSrc}'); im.thumbnail((1200, 1200)); im.save(r'${normalizedDst}')"`;
      execSync(pythonCmd, { timeout: 10000 });
      if (fs.existsSync(optPath) && fs.statSync(optPath).size > 0) {
        return optPath;
      }
    }
  } catch (err) {
    console.warn(`[VISION] Image optimization notice: ${err.message}`);
  }
  return imagePath;
};

const tryParseOrRepairJson = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(clean);
  } catch (_) {}

  const firstBrace = clean.indexOf("{");
  if (firstBrace === -1) return null;
  let candidate = clean.slice(firstBrace);
  try {
    return JSON.parse(candidate);
  } catch (_) {}

  // Attempt repair for truncated JSON
  try {
    let inStr = false;
    let s = "";
    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (ch === '"' && (i === 0 || candidate[i - 1] !== '\\')) {
        inStr = !inStr;
      }
      s += ch;
    }
    if (inStr) {
      const lastQ = s.lastIndexOf('"');
      if (lastQ !== -1) s = s.substring(0, lastQ);
    }
    s = s.replace(/,\s*$/, "").replace(/:\s*$/, "").trim();

    const stack = [];
    inStr = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' && (i === 0 || s[i - 1] !== '\\')) {
        inStr = !inStr;
      } else if (!inStr) {
        if (ch === '{' || ch === '[') stack.push(ch);
        else if (ch === '}' && stack.length && stack[stack.length - 1] === '{') stack.pop();
        else if (ch === ']' && stack.length && stack[stack.length - 1] === '[') stack.pop();
      }
    }
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') s += "}";
      else if (open === '[') s += "]";
    }
    return JSON.parse(s);
  } catch (repairErr) {
    return null;
  }
};

/**
 * Perform strict observable vision analysis on a figure/graphic image file.
 * Returns structured entities: figure_type, participants, labels, interactions, visual_description.
 */
const analyzeFigureImage = async (imagePath, options = {}) => {
  if (!imagePath || !fs.existsSync(imagePath)) {
    console.warn(`[VISION] Image file not found: ${imagePath}`);
    return null;
  }

  const apiKey = (process.env.OPENROUTER_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    console.warn("[VISION] OpenRouter API key missing; skipping visual inspection.");
    return null;
  }

  let optPath = null;
  try {
    optPath = optimizeImageForVision(imagePath);
    const activePath = optPath || imagePath;
    const ext = path.extname(activePath).toLowerCase().replace(".", "") || "png";
    const mimeType = ext === "jpg" ? "jpeg" : ext;
    const imgBuffer = fs.readFileSync(activePath);
    const base64Data = imgBuffer.toString("base64");
    const dataUrl = `data:image/${mimeType};base64,${base64Data}`;

    const caption = options.caption || "";
    const nearbyContext = options.nearbyContext || "";
    const figureId = options.figureId || "Figure";

    const prompt = `Analyze this document figure strictly from visible evidence.
Figure ID / Caption: ${caption || figureId}
Context from document text: ${nearbyContext}

Respond ONLY with a valid JSON object matching this schema:
{
  "figure_type": "string (e.g. sequence_diagram, architecture_diagram, flowchart, chart, diagram, screenshot)",
  "participants": ["string (visible actors, components, services, or participants)"],
  "labels": ["string (visible text labels, endpoint URLs, annotations, or codes)"],
  "interactions": [
    {
      "order": 1,
      "from": "string (initiating participant)",
      "to": "string (receiving participant)",
      "action": "string (message, request, response, or data flow)"
    }
  ],
  "visual_description": "string (factual description of what this graphic visually shows, participant relationships, and execution flow)",
  "numerical_values": ["string (visible counts, durations, percentages, port numbers)"],
  "uncertainty": "string or null"
}

Grounding instructions:
1. Extract ALL visible participant boxes, lifelines, components, and services.
2. If this is a sequence diagram, trace the exact sequential order of arrow requests and responses from top to bottom.
3. Include exact endpoint paths (e.g. POST /api/v1/...), status codes (e.g. 200, 401), and error tokens (e.g. ERR_TOKEN_REUSE).
4. Do not infer details not visible in the graphic. Do not use external knowledge.`;

    const model = getVisionModel();
    const baseUrl = getBaseUrl();
    const started = Date.now();
    console.log(`[VISION] Analyzing figure image: ${path.basename(imagePath)} with model=${model}`);

    let rawContent = "";
    let requestMaxTokens = 2000;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || process.env.CLIENT_URL || process.env.FRONTEND_URL || "https://documind-ai.netlify.app",
            "X-Title": process.env.OPENROUTER_APP_NAME || "DOCUMIND-AI",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: requestMaxTokens,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[VISION] OpenRouter API attempt ${attempt} status ${res.status}: ${errText.slice(0, 200)}`);
          if (attempt < 3) {
            const affordMatch = errText.match(/can only afford\s*(\d+)/i);
            if (affordMatch) {
              requestMaxTokens = Math.max(300, parseInt(affordMatch[1], 10) - 50);
              console.log(`[VISION] Adjusted max_tokens to ${requestMaxTokens} based on available quota.`);
            } else if (errText.includes("fewer max_tokens")) {
              requestMaxTokens = Math.max(300, Math.floor(requestMaxTokens * 0.6));
            }
            console.log(`[VISION] Waiting 4s before retry ${attempt + 1}...`);
            await new Promise((r) => setTimeout(r, 4000));
            continue;
          }
          return null;
        }

        const data = await res.json();
        const msg = data?.choices?.[0]?.message;
        rawContent = msg?.content || "";
        if (!rawContent || rawContent.trim() === "") {
          if (Array.isArray(msg?.reasoning_details)) {
            rawContent = msg.reasoning_details.map((d) => d.text || "").join("\n");
          } else if (msg?.reasoning) {
            rawContent = msg.reasoning;
          }
        }
        break;
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (attempt < 3) {
          console.warn(`[VISION] Attempt ${attempt} network error: ${fetchErr.message}. Retrying in 4s...`);
          await new Promise((r) => setTimeout(r, 4000));
        } else {
          throw fetchErr;
        }
      }
    }
    const latencyMs = Date.now() - started;

    let parsed = tryParseOrRepairJson(rawContent);
    if (!parsed && rawContent && rawContent.trim().length > 0) {
      const result = {
        figure_type: "diagram",
        participants: [],
        labels: [],
        interactions: [],
        visual_description: rawContent.slice(0, 2000),
        numerical_values: [],
        uncertainty: null,
      };
      if (/sequence diagram/i.test(rawContent)) result.figure_type = "sequence_diagram";
      else if (/flowchart/i.test(rawContent)) result.figure_type = "flowchart";
      else if (/architecture/i.test(rawContent)) result.figure_type = "architecture_diagram";

      const partMatch = rawContent.match(/(?:participants|actors|lifelines)[^:\n]*:([\s\S]*?)(?=\n\s*\n|\bflow\b|\bmessages\b|\binteractions\b|\bstep\b|$)/i);
      const rawCandidates = [];
      if (partMatch) {
        const lines = partMatch[1].split("\n");
        for (const line of lines) {
          const cleaned = line.replace(/^[\s\*\-\d\.\`]+/, "").replace(/[`\(\)].*$/, "").trim();
          if (cleaned && !isArtifactEntity(cleaned)) {
            rawCandidates.push(cleaned);
          }
        }
      }
      result.participants = normalizeParticipants(rawCandidates);

      const rawInteractions = [];
      const arrowRegex = /[`\*]*([A-Za-z0-9\s]+?)[`\*]*\s*->\s*[`\*]*([A-Za-z0-9\s]+?)[`\*]*\s*:\s*(.+)/g;
      let match;
      let order = 1;
      while ((match = arrowRegex.exec(rawContent)) !== null) {
        const from = match[1].trim();
        const to = match[2].trim();
        const action = match[3].replace(/[`\*]+/g, "").trim();
        if (!isArtifactEntity(from) && !isArtifactEntity(to)) {
          rawInteractions.push({ order: order++, from, to, action });
          if (!result.participants.some(p => p.toLowerCase() === from.toLowerCase())) rawCandidates.push(from);
          if (!result.participants.some(p => p.toLowerCase() === to.toLowerCase())) rawCandidates.push(to);
        }
      }
      result.participants = normalizeParticipants(rawCandidates);
      result.interactions = validateInteractions(rawInteractions, result.participants);
      parsed = result;
    }

    if (!parsed) {
      console.warn(`[VISION] Failed to parse JSON or text from vision response: ${rawContent.slice(0, 100)}`);
      return null;
    }

    console.log(`[VISION SUCCESS] ${path.basename(imagePath)} latency_ms=${latencyMs} type=${parsed.figure_type} participants=${parsed.participants?.length || 0} interactions=${parsed.interactions?.length || 0}`);
    return parsed;
  } catch (err) {
    console.error(`[VISION ERROR] ${path.basename(imagePath)}: ${err.message}`);
    return null;
  } finally {
    if (optPath && optPath !== imagePath && fs.existsSync(optPath)) {
      try { fs.unlinkSync(optPath); } catch (_) {}
    }
  }
};

/**
 * Enriches an array of figures with vision analysis and searchable representation.
 */
const enrichFiguresWithVision = async (figures = [], documentId = "") => {
  if (!Array.isArray(figures) || figures.length === 0) {
    return figures;
  }

  for (let fIdx = 0; fIdx < figures.length; fIdx++) {
    const fig = figures[fIdx];
    if (!fig.imagePath || !fs.existsSync(fig.imagePath)) {
      continue;
    }

    if (fIdx > 0) {
      await new Promise((r) => setTimeout(r, 2500));
    }

    try {
      const visionResult = await analyzeFigureImage(fig.imagePath, {
        caption: fig.caption,
        nearbyContext: fig.nearbyContext,
        figureId: fig.figureId,
      });

      if (visionResult) {
        fig.figureType = visionResult.figure_type || fig.figureType || "diagram";
        fig.participants = normalizeParticipants(visionResult.participants || []);
        fig.labels = visionResult.labels || [];
        fig.interactions = validateInteractions(visionResult.interactions || [], fig.participants);
        fig.visualDescription = visionResult.visual_description || fig.visualDescription || "";
        fig.ocrText = (visionResult.labels || []).join("; ");
        fig.structuredData = buildVerifiedFigureEvidence({
          ...fig,
          ...visionResult,
          participants: fig.participants,
          interactions: fig.interactions,
          figureId: fig.figureId,
          figureNumber: fig.figureNumber,
          caption: fig.caption,
          imagePath: fig.imagePath,
        });

        // Formulate normalized searchable figure text
        const participantSummary = fig.participants.length > 0 ? `Participants:\n${fig.participants.join(", ")}\n\n` : "";
        const interactionLines = (fig.interactions || []).map((i) => {
          const fromTo = i.from ? `${i.from} -> ${i.to || ''}: ` : "";
          return `${i.order || ''}. ${fromTo}${i.action || i.label || ''}`;
        });
        const interactionSummary = interactionLines.length > 0 ? `Interaction Flow & Sequence:\n${interactionLines.join("\n")}\n\n` : "";
        const labelSummary = fig.labels.length > 0 ? `Visible Labels & Endpoints:\n${fig.labels.join("; ")}\n\n` : "";

        const searchableContent = (
          `[${fig.caption || fig.figureId} | Page ${fig.pageNumber || 1} | Section: ${fig.section || "General"}]\n` +
          `Figure ID: ${fig.figureId}\n` +
          `Figure Type: ${fig.figureType}\n\n` +
          participantSummary +
          interactionSummary +
          labelSummary +
          `Visual Description:\n${fig.visualDescription}\n\n` +
          (fig.nearbyContext ? `Nearby Explanatory Context:\n${fig.nearbyContext}\n` : "")
        );

        fig.objectId = fig.objectId || (fig.figureNumber ? `Figure ${fig.figureNumber}` : fig.figureId);
        fig.figureNumber = fig.figureNumber || (fig.figureId && fig.figureId.match(/\d+/)?.[0]) || null;
        fig.rawText = searchableContent;
        fig.sourceMethod = fig.sourceMethod || "vision";
        fig.visionAnalyzed = true;

        console.log(`[FIGURE] document=${documentId || "doc"} figure=${fig.figureNumber || fig.figureId} caption_found=true ocr=true vision=true status=indexed`);
      }
    } catch (figErr) {
      console.warn(`[VISION] Error enriching figure ${fig.figureId}: ${figErr.message}`);
    }
  }

  return figures;
};

module.exports = {
  analyzeFigureImage,
  enrichFiguresWithVision,
  getVisionModel,
};
