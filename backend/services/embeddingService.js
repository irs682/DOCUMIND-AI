const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIMENSION || 384);
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

console.log(`[AI SERVICE] base_url=${AI_SERVICE_URL}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientNetworkError = (err) => {
  const code = err.cause?.code || err.code;
  return (
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "EPIPE" ||
    code === "ETIMEDOUT"
  );
};

const requestEmbeddings = async (path, body, timeoutMs = 60000, maxRetries = 2) => {
  const url = `${AI_SERVICE_URL}${path}`;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const backoffMs = attempt * 800;
      console.log(`[AI SERVICE] Retrying transient error (${attempt}/${maxRetries}) after ${backoffMs}ms: ${url}`);
      await sleep(backoffMs);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const responseText = await response.text();
      let payload = {};
      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch (_) {
        payload = { detail: responseText.slice(0, 500) };
      }

      if (!response.ok) {
        console.error("[AI SERVICE HTTP ERROR]", {
          url,
          status: response.status,
          body: responseText.slice(0, 500),
        });

        const httpErr = new Error(payload.detail || `AI service returned HTTP ${response.status}`);
        httpErr.status = response.status;
        if (response.status === 404) httpErr.code = "AI_SERVICE_ENDPOINT_NOT_FOUND";
        else if (response.status === 422) httpErr.code = "AI_SERVICE_REQUEST_INVALID";
        else if (response.status === 503) httpErr.code = "EMBEDDING_UNAVAILABLE";
        else if (response.status >= 500) httpErr.code = "AI_SERVICE_INTERNAL_ERROR";
        throw httpErr;
      }

      return payload;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;

      // Do NOT retry HTTP 4xx or classified non-network errors
      if (err.status && err.status >= 400 && err.status < 500) {
        throw err;
      }

      const isTransient = isTransientNetworkError(err);
      if (isTransient && attempt < maxRetries) {
        continue;
      }

      // Format clean classified error on final failure
      const causeCode = err.cause?.code || err.code || (err.name === "AbortError" ? "ETIMEDOUT" : "UNKNOWN");
      const causeMessage = err.cause?.message || "none";
      const status = err.status || 0;
      const code = (causeCode === "ECONNREFUSED" || causeCode === "ECONNRESET")
        ? "AI_SERVICE_UNAVAILABLE"
        : (err.name === "AbortError" || causeCode === "ETIMEDOUT")
        ? "AI_SERVICE_TIMEOUT"
        : (err.code || "AI_SERVICE_ERROR");

      console.error(
        `[EMBEDDING HTTP ERROR]\nurl=${url}\nmessage=${err.message}\nstatus=${status}\ncode=${causeCode || code}\ncause=${causeCode !== "UNKNOWN" ? causeCode : causeMessage}`
      );

      // Enhance opaque "fetch failed" with the underlying network root cause
      if (err.message === "fetch failed") {
        err.message = `fetch failed (${causeCode} at ${url})`;
      }

      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
};

const validateVector = (vector) => {
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, got ${Array.isArray(vector) ? vector.length : "invalid"}`);
  }
  if (!vector.every(Number.isFinite)) {
    throw new Error("Embedding contains non-numeric values");
  }
  return vector;
};

/** Deterministic normalized vector generator used when external AI service is offline. */
const generateFallbackVector = (text, dim = EMBEDDING_DIMENSION) => {
  const vec = new Array(dim).fill(0);
  const words = (text || '').toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    for (let j = 0; j < w.length; j++) {
      const code = w.charCodeAt(j);
      const idx = Math.abs((code * 31 + j * 17 + i * 13) % dim);
      vec[idx] += 1 / (1 + j);
    }
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) vec[i] = Number((vec[i] / norm).toFixed(6));
  return vec;
};

/** Generate one real MiniLM query embedding from the FastAPI singleton with fallback. */
const createEmbedding = async (text) => {
  if (!text || !text.trim()) throw new Error("Text is required for embedding");
  try {
    const payload = await requestEmbeddings("/api/ai/embed-query", { text: text.slice(0, 4000) }, 30000);
    const vector = validateVector(payload.embedding);
    console.log(`[EMBEDDING] chunks_requested=1 vectors_generated=1 dimension=${EMBEDDING_DIMENSION} status=SUCCESS`);
    return vector;
  } catch (err) {
    if (isTransientNetworkError(err) || err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed')) {
      console.warn(`[EMBEDDING] AI service at ${AI_SERVICE_URL} unavailable. Using deterministic local fallback.`);
      return generateFallbackVector(text);
    }
    throw err;
  }
};

/** Generate document embeddings from FastAPI singleton with resilient local fallback. */
const createEmbeddings = async (texts) => {
  if (!texts || texts.length === 0) return [];
  try {
    const payload = await requestEmbeddings(
      "/api/ai/embed",
      { texts: texts.map((text) => text.slice(0, 4000)) },
      60000,
    );
    if (!Array.isArray(payload.embeddings) || payload.embeddings.length !== texts.length) {
      throw new Error(`Embedding count mismatch: expected ${texts.length}, got ${payload.embeddings?.length || 0}`);
    }
    const vectors = payload.embeddings.map(validateVector);
    console.log(
      `[EMBEDDING] chunks_requested=${texts.length} vectors_generated=${vectors.length} dimension=${EMBEDDING_DIMENSION} status=SUCCESS`
    );
    return vectors;
  } catch (err) {
    if (isTransientNetworkError(err) || err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed')) {
      console.warn(`[EMBEDDING] AI service at ${AI_SERVICE_URL} unreachable. Generating ${texts.length} resilient local embeddings.`);
      return texts.map((t) => generateFallbackVector(t));
    }
    throw err;
  }
};

module.exports = { createEmbedding, createEmbeddings };

