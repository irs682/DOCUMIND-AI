/**
 * LLM Service for DOCUMIND-AI
 * Provider: OpenRouter
 */

const { stripInternalReasoning } = require('./figureEvidenceValidatorService');

/**
 * Validates whether an API key is real and not a template placeholder.
 */
const isValidApiKey = (key) => {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.replace(/^["']|["']$/g, "").trim();
  if (!trimmed || trimmed.length < 10) return false;
  if (trimmed.includes("PASTE_") || trimmed.includes("YOUR_") || trimmed.includes("REPLACE_")) return false;
  return true;
};

const getBaseUrl = () => {
  return (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
};

/**
 * Get the configured main OpenRouter model from environment.
 * Fails clearly if not configured instead of silently selecting a deprecated model.
 */
const getMainModel = () => {
  const model = process.env.OPENROUTER_MODEL || process.env.DEFAULT_LLM_MODEL;
  if (!model || !model.trim()) {
    throw new Error("[LLM] OPENROUTER_MODEL is not configured in environment.");
  }
  return model.trim();
};

/**
 * Get the fast OpenRouter model from environment with safe fallback to main model.
 */
const getFastModel = () => {
  const fast = process.env.OPENROUTER_FAST_MODEL;
  if (fast && fast.trim()) {
    return fast.trim();
  }
  return getMainModel();
};

/**
 * Robust OpenRouter API request function using direct HTTP fetch.
 */
const callOpenRouter = async ({
  messages,
  model,
  temperature = 0.1,
  maxTokens = 2048,
  task = "unknown",
}) => {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  const baseUrl = getBaseUrl();

  if (!isValidApiKey(apiKey) || !apiKey.startsWith("sk-or-")) {
    console.error(`[LLM] success=false status=401 reason=OPENROUTER_AUTH_FAILED`);
    const err = new Error("[LLM] OpenRouter API key is not configured correctly or is invalid.");
    err.code = "OPENROUTER_AUTH_FAILED";
    throw err;
  }

  if (!model) {
    console.error(`[LLM] success=false status=500 reason=OPENROUTER_MODEL_UNCONFIGURED`);
    const err = new Error("[LLM] OpenRouter model is not configured.");
    err.code = "OPENROUTER_MODEL_UNAVAILABLE";
    throw err;
  }

  const started = Date.now();
  console.log(`[LLM] provider=openrouter model=${model} task=${task}`);

  let response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "DOCUMIND-AI",
    };

    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        reasoning: { effort: "none" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (fetchErr) {
    const latencyMs = Date.now() - started;
    const isTimeout = fetchErr.name === "AbortError" || fetchErr.message?.includes("aborted");
    const reason = isTimeout ? "OPENROUTER_TIMEOUT" : "OPENROUTER_NETWORK_ERROR";
    console.error(`[LLM] provider=openrouter success=false status=${isTimeout ? 408 : 503} reason=${reason}`);
    console.error(`[SUMMARIZE ERROR] stage=openrouter_generation status=${isTimeout ? 408 : 503} reason=${reason} details=${fetchErr.message}`);
    const error = new Error(`OpenRouter connection failed: ${fetchErr.message}`);
    error.code = reason;
    error.status = isTimeout ? 408 : 503;
    throw error;
  }

  const latencyMs = Date.now() - started;
  let data;
  try {
    data = await response.json();
  } catch (jsonErr) {
    data = {};
  }

  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status} from OpenRouter`;
    let reason = "SUMMARIZATION_FAILED";
    if (response.status === 401 || response.status === 403) {
      reason = "OPENROUTER_AUTH_FAILED";
    } else if (response.status === 404) {
      reason = "OPENROUTER_MODEL_UNAVAILABLE";
    } else if (response.status === 429) {
      reason = "OPENROUTER_RATE_LIMIT";
    } else if (response.status >= 500) {
      reason = "OPENROUTER_SERVER_ERROR";
    }

    console.error(`[LLM] provider=openrouter success=false status=${response.status} reason=${reason}`);
    console.error(`[SUMMARIZE ERROR] stage=openrouter_generation status=${response.status} reason=${reason} message="${message}"`);

    const error = new Error(message);
    error.status = response.status;
    error.code = reason;
    throw error;
  }

  const msg = data.choices?.[0]?.message;
  let content = msg?.content?.trim() || "";
  content = stripInternalReasoning(content);
  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;

  console.log(`[LLM] provider=openrouter model=${model} task=${task} success=true`);
  console.log(
    `[LLM] OpenRouter generation completed | model=${model} | tokens_in=${tokensIn} | tokens_out=${tokensOut} | latency_ms=${latencyMs}`
  );

  return {
    text: content,
    provider: "openrouter",
    model,
    tokensIn,
    tokensOut,
    latencyMs,
    fallbackUsed: false,
  };
};

/**
 * Stream OpenRouter chat completion progressively chunk-by-chunk.
 */
const streamOpenRouter = async ({
  messages,
  model,
  temperature = 0.1,
  maxTokens = 2048,
  task = "stream_chat",
  signal = null,
  onDelta = () => {},
  onDone = () => {},
}) => {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  const baseUrl = getBaseUrl();
  const targetModel = model || getMainModel();

  if (!isValidApiKey(apiKey) || !apiKey.startsWith("sk-or-")) {
    const err = new Error("[LLM] OpenRouter API key is not configured correctly or is invalid.");
    err.code = "OPENROUTER_AUTH_FAILED";
    throw err;
  }

  const started = Date.now();
  console.log(`[LLM STREAM] provider=openrouter model=${targetModel} task=${task} stream=true`);

  let response;
  try {
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "DOCUMIND-AI",
    };

    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature,
        max_tokens: maxTokens,
        reasoning: { effort: "none" },
        stream: true,
      }),
      signal,
    });
  } catch (fetchErr) {
    if (signal?.aborted) {
      console.log(`[LLM STREAM] Client aborted upstream stream`);
      return { text: "", aborted: true };
    }
    const isTimeout = fetchErr.name === "AbortError" || fetchErr.message?.includes("aborted");
    const reason = isTimeout ? "OPENROUTER_TIMEOUT" : "OPENROUTER_NETWORK_ERROR";
    const error = new Error(`OpenRouter stream connection failed: ${fetchErr.message}`);
    error.code = reason;
    error.status = isTimeout ? 408 : 503;
    throw error;
  }

  if (!response.ok) {
    let errData = {};
    try {
      errData = await response.json();
    } catch (_) {}
    const message = errData?.error?.message || `HTTP ${response.status} from OpenRouter stream`;
    const error = new Error(message);
    error.status = response.status;
    error.code = response.status === 401 ? "OPENROUTER_AUTH_FAILED" : "OPENROUTER_STREAM_ERROR";
    throw error;
  }

  let fullText = "";
  let fullReasoning = "";
  let buffer = "";
  const decoder = new TextDecoder();
  let firstTokenMs = null;
  let seq = 0;
  let finishReason = null;
  let usage = null;

  try {
    if (response.body.getReader) {
      const reader = response.body.getReader();
      while (true) {
        if (signal?.aborted) {
          await reader.cancel().catch(() => {});
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.slice(5).trim();
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.usage) usage = parsed.usage;
              const choice = parsed.choices?.[0];
              if (choice?.finish_reason) finishReason = choice.finish_reason;
              const delta = choice?.delta?.content || "";
              const rDelta = choice?.delta?.reasoning || "";
              if (rDelta) fullReasoning += rDelta;
              if (delta) {
                if (firstTokenMs === null) {
                  firstTokenMs = Date.now() - started;
                }
                seq += 1;
                fullText += delta;
                onDelta(delta, { seq, finishReason, usage });
              }
            } catch (_) {}
          }
        }
      }
    } else {
      for await (const chunk of response.body) {
        if (signal?.aborted) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.slice(5).trim();
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.usage) usage = parsed.usage;
              const choice = parsed.choices?.[0];
              if (choice?.finish_reason) finishReason = choice.finish_reason;
              const delta = choice?.delta?.content || "";
              const rDelta = choice?.delta?.reasoning || "";
              if (rDelta) fullReasoning += rDelta;
              if (delta) {
                if (firstTokenMs === null) {
                  firstTokenMs = Date.now() - started;
                }
                seq += 1;
                fullText += delta;
                onDelta(delta, { seq, finishReason, usage });
              }
            } catch (_) {}
          }
        }
      }
    }
  } catch (streamReadErr) {
    if (signal?.aborted) {
      console.log(`[LLM STREAM] Stream stopped by client`);
    } else {
      console.warn(`[LLM STREAM] Stream read notice: ${streamReadErr.message}`);
    }
  }

  if (!fullText.trim() && fullReasoning.trim()) {
    fullText = fullReasoning.trim();
  }
  fullText = stripInternalReasoning(fullText);

  const durationMs = Date.now() - started;
  console.log(
    `[STREAM] started=true first_token_ms=${firstTokenMs || 0} duration_ms=${durationMs} chunks=${seq} status=COMPLETED characters=${fullText.length}`
  );

  onDone(fullText, { finishReason: finishReason || "stop", usage, firstTokenMs, durationMs, totalChunks: seq });
  return {
    text: fullText,
    provider: "openrouter",
    model: targetModel,
    firstTokenMs,
    durationMs,
    finishReason: finishReason || "stop",
    usage,
    totalChunks: seq,
  };
};

/**
 * Execute chat completion using configured OpenRouter model.
 */
const executeCompletion = async (
  messagesOrOptions,
  options = {}
) => {
  let messages = [];
  let opts = {};

  if (Array.isArray(messagesOrOptions)) {
    messages = messagesOrOptions;
    opts = options || {};
  } else if (messagesOrOptions && typeof messagesOrOptions === "object") {
    messages = messagesOrOptions.messages || [];
    opts = { ...messagesOrOptions, ...options };
  }

  const {
    modelType = "main",
    temperature = 0.1,
    maxTokens = 2048,
    task = "document_qa",
  } = opts;

  const model = opts.model || (modelType === "fast" ? getFastModel() : getMainModel());
  return callOpenRouter({
    messages,
    model,
    temperature,
    maxTokens,
    task,
  });
};

/**
 * Discover models actually available to the configured OpenRouter key.
 */
const listOpenRouterModels = async () => {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  const baseUrl = getBaseUrl();

  if (!isValidApiKey(apiKey) || !apiKey.startsWith("sk-or-")) {
    throw new Error("OPENROUTER_API_KEY is not configured correctly.");
  }

  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "DOCUMIND-AI",
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `OpenRouter model discovery failed (${response.status}): ${
        data?.error?.message || JSON.stringify(data)
      }`
    );
  }

  return (data.data || []).map((m) => m.id).sort();
};

/**
 * OpenRouter startup configuration and model access validator.
 */
const validateOpenRouterConfiguration = async () => {
  const apiKey = (process.env.OPENROUTER_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  const baseUrl = getBaseUrl();
  const mainModel = process.env.OPENROUTER_MODEL || process.env.DEFAULT_LLM_MODEL;
  const fastModel = process.env.OPENROUTER_FAST_MODEL;

  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    throw new Error("OPENROUTER_API_KEY is not configured correctly.");
  }

  if (!mainModel) {
    throw new Error("OPENROUTER_MODEL is not configured.");
  }

  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "DOCUMIND-AI",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `OpenRouter model validation failed (${response.status}): ${
        data?.error?.message || "Unknown error"
      }`
    );
  }

  const availableModels = (data.data || []).map((model) => model.id);

  if (!availableModels.includes(mainModel)) {
    throw new Error(`OPENROUTER_MODEL "${mainModel}" is unavailable.`);
  }

  console.log(`[LLM] provider=openrouter main_model=${mainModel} validation=success`);

  if (fastModel && !availableModels.includes(fastModel)) {
    console.warn(
      `[LLM] OpenRouter fast model "${fastModel}" is unavailable; main model will be used instead.`
    );
  } else if (fastModel && availableModels.includes(fastModel)) {
    console.log(`[LLM] provider=openrouter fast_model=${fastModel} validation=success`);
  }

  return { valid: true, availableModels, mainModel, fastModel };
};

/**
 * Startup LLM Configuration validator governed by LLM_PROVIDER.
 */
const validateLLMConfiguration = async () => {
  const provider = (process.env.LLM_PROVIDER || "").toLowerCase().trim();

  if (provider !== "openrouter") {
    throw new Error(
      `Unsupported LLM_PROVIDER "${process.env.LLM_PROVIDER}". DOCUMIND-AI is configured to use OpenRouter.`
    );
  }

  return await validateOpenRouterConfiguration();
};

/**
 * Post-processing: Syntax-aware cleaning of Markdown formatting artifacts,
 * decorative emojis, and unnecessary meta-disclaimers.
 * Preserves hyphens in words (e.g. AI-based, MERA-VLA), negative numbers (e.g. -5.2%),
 * filenames, mathematical notation, and citations.
 */
const formatCleanPlainText = (text) => {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Remove unnecessary meta disclaimers and RAG artifacts
  cleaned = cleaned.replace(
    /^\s*\(?\*?(?:note:\s*)?(?:the summary is limited to|based on the (?:provided|supplied)|according to the (?:provided|supplied)|these sections are directly drawn from|references and appendices are not treated as findings).*?\*?\)?\s*$/gim,
    ""
  );

  // 2. Remove markdown heading hashes at the start of lines (e.g. "### Executive Summary" -> "Executive Summary")
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // 3. Remove markdown bold (**text** -> text)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");

  // 4. Remove markdown italics (*text* or _text_ -> text) while protecting bullet items
  cleaned = cleaned.replace(/(^|[\s(])\*([^*\s][^*]*[^*\s])\*([\s).,!?:;]|$)/g, "$1$2$3");
  cleaned = cleaned.replace(/(^|[\s(])_([^_\s][^_]*[^_\s])_([\s).,!?:;]|$)/g, "$1$2$3");

  // 5. Remove decorative emojis commonly emitted in headings (📄, 🎯, 🔑, ⚙️, 📊, 💡, 🏁, 📚, ⚖️, 📑, etc.)
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");

  // 6. Remove markdown horizontal rules (--- or *** or ___)
  cleaned = cleaned.replace(/^\s*[-*_]{3,}\s*$/gm, "");

  // 7. Protect sub-bullets: never convert indented bullets or bullets inside numbered sections into numbers
  const hasNumberedSections = /^\d+\.\s+[A-Z]/m.test(cleaned);
  let listCounter = 0;
  const lines = cleaned.split("\n");
  const processedLines = lines.map((line) => {
    const bulletMatch = line.match(/^(\s*)[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (bulletMatch[1].length > 0 || hasNumberedSections) {
        // Preserve clean bullet point so top-level numbering 1, 2, 3... is never duplicated or collided with
        return `${bulletMatch[1]}- ${bulletMatch[2]}`;
      }
      listCounter++;
      return `${bulletMatch[1]}${listCounter}. ${bulletMatch[2]}`;
    }
    const numMatch = line.match(/^(\s*)(\d+)\.\s+/);
    if (numMatch) {
      listCounter = parseInt(numMatch[2], 10);
      return line;
    }
    listCounter = 0;
    return line;
  });
  cleaned = processedLines.join("\n");

  // 8. Clean up extra trailing spaces and normalize excessive newlines
  cleaned = cleaned
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
};

/**
 * Clean and normalize text: strip duplicate lines, repeated phrases, and excess whitespace.
 */
const deduplicateText = (text) => {
  if (!text) return "";
  const lines = text.split("\n");
  const seenLines = new Set();
  const cleanLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      cleanLines.push("");
      continue;
    }
    const isBullet = /^[•\-\*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed);
    const key = trimmed.toLowerCase().replace(/^[•\-\*]\s+/, "").replace(/^\d+\.\s+/, "");
    if (isBullet && seenLines.has(key)) {
      continue;
    }
    if (isBullet) {
      seenLines.add(key);
    }
    cleanLines.push(line);
  }
  return cleanLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

/**
 * Generate a grounded answer to a user's question using the retrieved document context.
 */
const generateAnswer = async ({ question, context, documentName, extraInstructions = "", conflictNotice = "" }) => {
  if (!question || !context) {
    throw new Error("Question and context are required");
  }

  const systemPrompt =
    `You are DOCUMIND-AI, a strictly source-grounded document intelligence assistant.\n\n` +
    `Answer the user's question accurately, thoroughly, and strictly based on the provided document context.\n\n` +
    `CRITICAL GROUNDING & FIDELITY RULES:\n` +
    `1. Answer using ONLY facts directly mentioned in the document context. If a field or detail is not specified, state that it is not specified—NEVER guess or invent.\n` +
    `2. STRICT NUMERICAL FIDELITY: Preserve exact numbers, limits, durations, and counts. Never round or alter numbers (e.g. if the source states "Exactly 10 recovery codes", NEVER say "At least 8 recovery codes" or "8 recovery codes").\n` +
    `3. STRICT API & TECHNICAL FIDELITY: Preserve exact endpoint paths, HTTP methods, requirement IDs, and role names (e.g. preserve "/api/v1/auth/mfa/challenge", do not transform into "/api/auth/verify-2fa").\n` +
    `3b. Preserve exact label identifiers and prefix codes (such as AC-1, AC-2, BR-AUTH-14, etc.) when quoting acceptance criteria or business rules from the document.\n` +
    `4. NO UNGROUNDED TECHNOLOGIES: Under NO circumstances introduce technologies, protocols, or authentication methods not explicitly present in the source (e.g. do not introduce OAuth, email OTP, biometrics, FIDO2, SAML, or LDAP unless explicitly in the text).\n` +
    `5. CONFLICT & INCONSISTENCY REPORTING: If the context contains conflicting information (for example, differing API endpoints for the same action, or differing numbers), DO NOT silently pick one or invent another. You MUST explicitly state that the source contains conflicting definitions and identify both.\n` +
    `6. Distinguish proposed work from completed work.\n` +
    `7. STRICT NEGATIVE CONSTRAINT: Under NO circumstances output raw PDF syntax, object tokens (e.g. obj, endobj, stream, endstream, xref, trailer), or internal byte offsets.\n\n` +
    `WRITING AND FORMATTING RULES:\n` +
    `1. Answer in clean, natural plain text without markdown headings (#, ##) or bold (**).\n` +
    `2. Use simple numbered lists (1. item, 2. item) when a list is helpful.\n` +
    `3. Match the amount of detail directly to the user's question.\n` +
    `4. Do not expose internal system terminology (such as chunks, vector search, RAG, LLM).\n` +
    (conflictNotice ? `\nSOURCE INCONSISTENCY ALERT:\n${conflictNotice}\n` : "") +
    (extraInstructions ? `\nSPECIAL INSTRUCTIONS:\n${extraInstructions}\n` : "");

  const userPrompt =
    `Document Name: ${documentName || "Document"}\n\n` +
    `Document Context:\n${context}\n\n` +
    `User Question: ${question}\n\n` +
    `Provide your clean plain-text answer:`;

  try {
    const result = await executeCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { modelType: "main", temperature: 0.1, task: "rag_answer" }
    );

    if (result && result.text) {
      return formatCleanPlainText(deduplicateText(result.text));
    }
  } catch (err) {
    console.warn(`[LLM Service] OpenRouter answer generation failed: ${err.message}`);
  }

  return `I could not find sufficient evidence in the selected documents to answer this question reliably.`;
};

/**
 * Summarize an intermediate chunk batch (Map Phase of Hierarchical Summarization).
 */
const summarizeBatch = async ({ context, sectionName = "Content", documentName = "Document" }) => {
  if (!context || !context.trim()) return "";

  const systemPrompt =
    `You are DOCUMIND-AI.\n` +
    `Summarize the following document excerpt concisely in clean, natural plain text without markdown symbols (#, **, *), emojis, or meta-disclaimers.\n\n` +
    `Rules:\n` +
    `1. Never invent information.\n` +
    `2. Preserve important technical terminology and numerical values.\n` +
    `3. Distinguish proposed work from completed results.\n` +
    `4. Do not treat references as findings.\n` +
    `5. STRICT NEGATIVE CONSTRAINT: Never output PDF internal bytecode, xref lines, or object syntax.\n` +
    `6. Do not add disclaimers like "based on the provided excerpt".`;

  const userPrompt =
    `Document: ${documentName}\n` +
    `Section Context (${sectionName}):\n${context}\n\n` +
    `Provide a concise factual plain-text synthesis:`;

  const result = await executeCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { modelType: "fast", temperature: 0.0, maxTokens: 1000, task: "section_summary" }
  );

  return formatCleanPlainText(result?.text?.trim() || "");
};

/**
 * Summarize an entire document using OpenRouter in clean, natural plain text (Reduce Phase).
 */
const summarizeDocument = async ({ context, documentName, isProposal = true }) => {
  if (!context) {
    throw new Error("Document context is required for summarization");
  }

  const systemPrompt =
    `You are DOCUMIND-AI.\n\n` +
    `Provide a comprehensive, natural, and grounded plain-text summary of "${documentName || "Document"}" using ONLY the validated document content supplied.\n\n` +
    `RULES:\n` +
    `1. Answer in clean, natural plain text.\n` +
    `2. Do not use Markdown heading symbols such as #, ##, or ###.\n` +
    `3. Do not use Markdown bold or italic markers such as ** or *.\n` +
    `4. Do not use decorative emojis or icons (no 📄, 🎯, 🔑, ⚙️, 📊, 💡, 🏁).\n` +
    `5. Avoid dash-based bullet lists unless specifically requested. Use simple numbered lists when listing items.\n` +
    `6. Use clean, short plain-text headings if separating major sections (for example: Executive Summary, Key Points, Methodology, Evaluation, Conclusion) without markdown symbols.\n` +
    `7. Never invent information or guess missing text.\n` +
    `8. Preserve important technical terminology and numerical values.\n` +
    `8b. If the document defines numbered functional requirements (e.g. FR-AUTH-001 through FR-AUTH-010), ensure major requirements are explicitly cited by their IDs (e.g. FR-AUTH-001, FR-AUTH-004) and titles in the summary.\n` +
    `9. Distinguish proposed work from completed results.\n` +
    `10. Do not treat references or appendices as findings.\n` +
    `11. Do not add unnecessary meta-disclaimers (do not write "based on the provided excerpt", "according to the context", or "the summary is limited to...").\n` +
    `12. STRICT NEGATIVE CONSTRAINT: Never output PDF bytecode, xref tables, or object syntax.\n` +
    `13. Do not expose internal system terminology.`;

  const userPrompt =
    `Document Name: ${documentName || "Document"}\n\n` +
    `Document Content Synthesis:\n${context}\n\n` +
    `Generate the clean plain-text summary:`;

  try {
    const result = await executeCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { modelType: "main", temperature: 0.05, maxTokens: 2500, task: "document_summary" }
    );

    if (result && result.text) {
      return formatCleanPlainText(deduplicateText(result.text));
    }
  } catch (err) {
    console.error(`[SUMMARIZE ERROR] stage=openrouter_generation status=${err.status || 500} reason=${err.code || 'SUMMARIZATION_FAILED'} message="${err.message}"`);
    throw err;
  }

  throw new Error("[LLM] Empty response returned by OpenRouter summarizer.");
};

/**
 * Fast intent classification and query rewriting using OpenRouter.
 */
const classifyIntent = async (question) => {
  const prompt =
    `Classify the following document query into one of these intents:\n` +
    `- DOCUMENT_SUMMARY (user wants an overview or summary of the document)\n` +
    `- DOCUMENT_QA (user is asking a specific question about facts or details)\n` +
    `- DOCUMENT_COMPARE (user wants to compare documents)\n` +
    `- EXTRACTION (user wants specific entities, dates, or metrics extracted)\n\n` +
    `Query: "${question}"\n\n` +
    `Respond with ONLY the intent name in all caps.`;

  try {
    const result = await executeCompletion(
      [{ role: "user", content: prompt }],
      { modelType: "fast", temperature: 0.0, maxTokens: 20, task: "intent_classification" }
    );
    const intent = result?.text?.trim().toUpperCase();
    if (["DOCUMENT_SUMMARY", "DOCUMENT_QA", "DOCUMENT_COMPARE", "EXTRACTION"].includes(intent)) {
      return intent;
    }
  } catch {
    // Fallback heuristic
  }

  if (/\b(summar(?:y|ize|ise|ized|ised)|main points|key points|overview|highlights?|what is this about)\b/i.test(question)) {
    return "DOCUMENT_SUMMARY";
  }
  return "DOCUMENT_QA";
};

/**
 * Generate a general answer when no document is specifically selected.
 */
const generateGeneralAnswer = async ({ question }) => {
  const qLower = (question || "").trim().toLowerCase();
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))[.!]?$/i.test(qLower)) {
    return "Hello! How can I help you?";
  }

  const systemPrompt =
    "You are DOCUMIND-AI, a knowledgeable AI assistant.\n" +
    "Answer the user's question clearly, concisely, and helpfully in clean, natural plain text.\n\n" +
    "Writing rules:\n" +
    "1. Do not use Markdown heading symbols like #, ##, or ###.\n" +
    "2. Do not use Markdown bold or italic markers like ** or *.\n" +
    "3. Do not use decorative emojis.\n" +
    "4. Use simple numbered lists when lists are helpful.\n" +
    "5. Avoid meta-disclaimers.";

  try {
    const result = await executeCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      { modelType: "fast", temperature: 0.2, task: "general_chat" }
    );

    if (result && result.text) {
      return formatCleanPlainText(result.text);
    }
  } catch (err) {
    console.warn("[LLM Service] General answer generation failed:", err.message);
  }

  return (
    "I am DOCUMIND-AI. To ask questions about your documents, please upload a document and select it in the chat."
  );
};

/**
 * Summarize across multiple documents in clean, natural plain text.
 */
const summarizeMultipleDocuments = async ({ context, docNames = [] }) => {
  if (!context) {
    throw new Error("Multi-document context is required for summarization");
  }

  const docListStr = docNames.length ? docNames.map((n, i) => `${i + 1}. ${n}`).join("\n") : "Uploaded Documents";

  const systemPrompt =
    `You are DOCUMIND-AI, an expert enterprise document intelligence assistant.\n` +
    `Provide a clean, natural plain-text cross-document synthesis and thematic analysis across all provided documents based strictly on the document context provided.\n\n` +
    `WRITING AND FORMATTING RULES:\n` +
    `1. Answer in clean, natural plain text.\n` +
    `2. Do not use Markdown heading symbols (#, ##, ###).\n` +
    `3. Do not use Markdown bold or italic markers (** or *).\n` +
    `4. Do not use decorative emojis or icons (no 📚, 🎯, 🔑, 📑, ⚖️, 💡).\n` +
    `5. Use clean plain-text headings without markdown symbols where helpful (e.g. Overview, Core Themes, Individual Document Contributions, Comparative Insights, Key Takeaways).\n` +
    `6. Use numbered lists when enumerating points or documents.\n` +
    `7. Synthesize overarching themes, common objectives, and contrasts without inventing facts.\n` +
    `8. Do not add meta-disclaimers (do not write "based on the provided excerpt").\n` +
    `9. STRICT NEGATIVE CONSTRAINT: Never output PDF internal bytecode, xref lines, or object syntax.`;

  const userPrompt =
    `Documents in Corpus:\n${docListStr}\n\n` +
    `Representative Passages Across Documents:\n${context}\n\n` +
    `Synthesize the main themes across all documents in clean plain text:`;

  try {
    const result = await executeCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { modelType: "main", temperature: 0.15, maxTokens: 2500, task: "multi_doc_summary" }
    );

    if (result && result.text) {
      return formatCleanPlainText(deduplicateText(result.text));
    }
  } catch (err) {
    console.warn(`[LLM Service] OpenRouter multi-document summarization failed: ${err.message}`);
    throw err;
  }

  return "Multi-document AI synthesis is temporarily unavailable. All documents have been indexed successfully.";
};

/**
 * Fast, deterministic title generator for new chat sessions.
 * Generates a 3-6 word natural title asynchronously without delaying chat stream.
 */
const generateChatTitle = async (messageText = "") => {
  const cleanInput = (messageText || "").trim().replace(/[\r\n]+/g, " ");
  if (!cleanInput) return "New Conversation";

  // Fallback title derived cleanly at word boundaries (up to 45 chars)
  const deriveFallbackTitle = (text) => {
    const raw = text.slice(0, 48).trim();
    const lastSpace = raw.lastIndexOf(" ");
    const candidate = (lastSpace > 18 ? raw.slice(0, lastSpace) : raw).replace(/[^\w\s-]/g, "").trim();
    if (!candidate) return "New Conversation";
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  };

  try {
    const fastModel = getFastModel();
    const response = await callOpenRouter({
      messages: [
        {
          role: "system",
          content:
            "You are an expert title generator for a document AI chat application. Generate an accurate, succinct title (3 to 6 words maximum) summarizing the user's inquiry. Rules:\n" +
            "1. Output ONLY the plain title text.\n" +
            "2. Do NOT use quotes, markdown, prefixes, trailing punctuation, or generic words like 'Question about' or 'Help with'.\n" +
            "3. Example Input: 'Explain the RAG architecture in INDUSTRIA-AI'\n" +
            "   Example Output: INDUSTRIA-AI RAG Architecture\n" +
            "4. Example Input: 'How do I fix Qdrant vector indexing errors?'\n" +
            "   Example Output: Fix Qdrant Vector Indexing",
        },
        {
          role: "user",
          content: cleanInput.slice(0, 500),
        },
      ],
      model: fastModel,
      temperature: 0.2,
      maxTokens: 25,
      task: "generate_chat_title",
    });

    const candidate = (response?.text || "").replace(/["'`*#]/g, "").trim();
    if (candidate && candidate.length >= 3 && candidate.length <= 60 && !candidate.toLowerCase().includes("generic")) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
  } catch (err) {
    console.warn(`[TITLE GEN] Fast title generation notice (${err.message}). Using safe fallback.`);
  }

  return deriveFallbackTitle(cleanInput);
};

module.exports = {
  callOpenRouter,
  streamOpenRouter,
  executeCompletion,
  validateOpenRouterConfiguration,
  validateLLMConfiguration,
  listOpenRouterModels,
  generateAnswer,
  generateChatTitle,
  summarizeDocument,
  summarizeBatch,
  summarizeMultipleDocuments,
  classifyIntent,
  generateGeneralAnswer,
  deduplicateText,
  formatCleanPlainText,
  getMainModel,
  getFastModel,
  // Backward compatibility aliases if referenced by older callers
  executeGroqCompletion: executeCompletion,
  callGroq: callOpenRouter,
  validateGroqModels: validateLLMConfiguration,
  getGroqClient: () => null,
};