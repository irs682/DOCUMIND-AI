/**
 * DOCUMIND-AI: Three-Layer Chat Memory Service
 *
 * Layer 1: Recent message history (bounded context window)
 * Layer 2: Rolling conversation summary (for long conversations)
 * Layer 3: Long-term user memory (persistent cross-chat facts & preferences)
 */

const UserMemory = require('../models/UserMemory');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const { executeCompletion } = require('./llmService');

// Sensitive tokens/regexes that must NEVER be persisted in memory
const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9_\-]{20,}/i,
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i,
  /password\s*[:=]\s*[^\s]+/i,
  /jwt_secret/i,
  /api[_\-]?key/i,
  /secret/i,
];

/**
 * Filter out any text containing sensitive secrets before persistence.
 */
const containsSensitiveData = (text) => {
  if (!text || typeof text !== 'string') return false;
  return SENSITIVE_PATTERNS.some((pat) => pat.test(text));
};

/**
 * Layer 1: Retrieve recent message history from a ChatSession (bounded context window).
 */
const getRecentConversationHistory = (session, limit = 8) => {
  if (!session || !Array.isArray(session.messages)) return [];
  const validMessages = session.messages.filter(
    (m) => m && m.text && m.status !== 'failed'
  );
  const recent = validMessages.slice(-limit);
  return recent.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.text,
  }));
};

/**
 * Layer 2: Get the existing rolling summary of older messages.
 */
const getRollingSummary = (session) => {
  return (session && session.rollingSummary) ? session.rollingSummary.trim() : '';
};

/**
 * Layer 2: Incrementally update rolling summary if conversation exceeds context limit.
 */
const updateRollingSummaryIfNeeded = async (sessionId) => {
  try {
    const session = await ChatSession.findById(sessionId);
    if (!session || !Array.isArray(session.messages) || session.messages.length <= 10) {
      return;
    }

    // Summarize older messages that have fallen out of the recent context window
    const olderMessages = session.messages.slice(0, -8);
    if (olderMessages.length < 4) return;

    const transcript = olderMessages
      .map((m) => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const prompt =
      `Summarize the key developments and context from this earlier conversation into 2-3 concise factual sentences.\n` +
      `Existing summary: "${session.rollingSummary || 'None'}"\n\n` +
      `Earlier transcript:\n${transcript}\n\n` +
      `Updated concise summary:`;

    const result = await executeCompletion(
      [{ role: 'user', content: prompt }],
      { modelType: 'fast', temperature: 0.1, maxTokens: 250, task: 'rolling_summary' }
    );

    if (result && result.text) {
      session.rollingSummary = result.text.trim();
      await session.save();
      console.log(`[MEMORY] Updated rolling summary for session ${sessionId}`);
    }
  } catch (err) {
    console.warn(`[MEMORY] Rolling summary notice: ${err.message}`);
  }
};

/**
 * Layer 3: Retrieve relevant active long-term memories for a user.
 * Scores memories by relevance to the current question without dumping all memories.
 */
const retrieveRelevantUserMemories = async ({ userId, query, limit = 5 }) => {
  if (!userId) return [];

  try {
    const user = await User.findById(userId).select('preferences');
    if (user && user.preferences && user.preferences.memoryEnabled === false) {
      return [];
    }

    const memories = await UserMemory.find({
      userId,
      status: 'active',
    })
      .sort({ updatedAt: -1 })
      .limit(30);

    if (!memories.length) return [];

    const queryTokens = new Set(
      (query || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !['what', 'when', 'where', 'which', 'who', 'how', 'this', 'that', 'from', 'with'].includes(w))
    );

    // Score memories based on keyword overlap and high-priority types
    const scored = memories.map((mem) => {
      let score = 0.1; // Base score for active memory
      const memTokens = (mem.key + ' ' + mem.content).toLowerCase();

      for (const token of queryTokens) {
        if (memTokens.includes(token)) {
          score += 0.3;
        }
      }

      // Always slightly prioritize core preferences and project definitions
      if (mem.type === 'preference' || mem.type === 'project') {
        score += 0.15;
      }

      return { mem, score };
    });

    // Sort by relevance score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick top relevant memories above threshold
    const relevant = scored
      .filter((item) => item.score >= 0.25 || item.mem.type === 'preference')
      .slice(0, limit)
      .map((item) => item.mem);

    // Update lastUsedAt asynchronously
    if (relevant.length > 0) {
      const ids = relevant.map((m) => m._id);
      UserMemory.updateMany({ _id: { $in: ids } }, { lastUsedAt: new Date() }).catch(() => {});
      console.log(`[MEMORY] retrieved=${relevant.length} user_id=${userId}`);
    }

    return relevant;
  } catch (err) {
    console.warn(`[MEMORY] Retrieval notice: ${err.message}`);
    return [];
  }
};

/**
 * Layer 3: Extract durable user facts asynchronously from a conversation turn.
 */
const extractAndStoreMemories = async ({ userId, conversationId, userMessage, assistantMessage }) => {
  if (!userId || !userMessage) return;

  try {
    const user = await User.findById(userId).select('preferences');
    if (user && user.preferences && user.preferences.memoryEnabled === false) {
      return;
    }

    // Do not extract memories from trivial greetings or questions with no personal statement
    const trimmedUser = userMessage.trim();
    if (trimmedUser.length < 15 || /^(hi|hello|hey|greetings|thanks|thank you|ok|yes|no)[.!]?$/i.test(trimmedUser)) {
      return;
    }

    // Check for sensitive credentials
    if (containsSensitiveData(trimmedUser) || containsSensitiveData(assistantMessage)) {
      console.log(`[MEMORY] Skipped extraction due to sensitive credential detection.`);
      return;
    }

    const prompt =
      `You are the memory extraction module for DOCUMIND-AI.\n` +
      `Analyze this conversation turn and extract ONLY persistent, durable facts about the user.\n\n` +
      `CATEGORIES TO EXTRACT:\n` +
      `- preference (e.g. "User prefers concise plain text answers")\n` +
      `- project (e.g. "User's project is DOCUMIND-AI built with MERN and FastAPI")\n` +
      `- goal (e.g. "User wants to build an enterprise document research platform")\n` +
      `- constraint (e.g. "User uses OpenRouter as LLM provider")\n` +
      `- decision (e.g. "User decided to use 384D MiniLM embeddings")\n\n` +
      `DO NOT EXTRACT:\n` +
      `- Temporary debugging states (e.g. "Server returned 502", "I am testing PDF upload")\n` +
      `- Short-lived conversational remarks or generic questions\n` +
      `- Any API keys, tokens, or passwords\n\n` +
      `User message: "${trimmedUser}"\n` +
      `Assistant response: "${(assistantMessage || '').slice(0, 300)}"\n\n` +
      `Return STRICT JSON format only:\n` +
      `{\n` +
      `  "memories": [\n` +
      `    { "type": "preference"|"project"|"goal"|"constraint"|"decision", "key": "short_snake_case_key", "content": "Clear factual sentence", "confidence": 0.95 }\n` +
      `  ]\n` +
      `}\n` +
      `If no durable information is present, return {"memories": []}.`;

    const result = await executeCompletion(
      [{ role: 'user', content: prompt }],
      { modelType: 'fast', temperature: 0.0, maxTokens: 400, task: 'memory_extraction' }
    );

    const text = result?.text?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || !Array.isArray(parsed.memories)) return;

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of parsed.memories) {
      if (!item.key || !item.content || containsSensitiveData(item.content)) continue;

      const normalizedKey = item.key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_').slice(0, 80);
      const cleanContent = item.content.trim().slice(0, 800);

      // Check for existing memory with the same key for this user
      const existing = await UserMemory.findOne({
        userId,
        key: normalizedKey,
        status: 'active',
      });

      if (existing) {
        if (existing.content !== cleanContent) {
          existing.content = cleanContent;
          existing.confidence = item.confidence || 0.95;
          existing.sourceConversationId = conversationId || existing.sourceConversationId;
          existing.updatedAt = new Date();
          await existing.save();
          updatedCount++;
        }
      } else {
        await UserMemory.create({
          userId,
          type: item.type || 'preference',
          key: normalizedKey,
          content: cleanContent,
          confidence: item.confidence || 0.95,
          sourceConversationId: conversationId || null,
          status: 'active',
        });
        createdCount++;
      }
    }

    if (createdCount > 0 || updatedCount > 0) {
      console.log(`[MEMORY] created=${createdCount} updated=${updatedCount} user_id=${userId}`);
    }
  } catch (err) {
    console.warn(`[MEMORY] Extraction notice: ${err.message}`);
  }
};

/**
 * Handle explicit user commands:
 * "Remember that [fact]"
 * "Forget that [topic]"
 */
const handleExplicitMemoryCommands = async ({ userId, conversationId, text }) => {
  const trimmed = (text || '').trim();

  // 1. Explicit Remember command
  const rememberMatch = trimmed.match(/^(?:please\s+)?remember(?:\s+that)?\s+(.+)$/i);
  if (rememberMatch) {
    const rawFact = rememberMatch[1].trim().replace(/^[:"']+|["']+$/g, '');
    if (!rawFact || rawFact.length < 5) {
      return { handled: true, reply: "Please specify what you would like me to remember." };
    }
    if (containsSensitiveData(rawFact)) {
      return { handled: true, reply: "I cannot store API keys, passwords, or sensitive credentials in memory." };
    }

    // Generate a normalized key
    const key = rawFact
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .slice(0, 4)
      .join('_');

    await UserMemory.findOneAndUpdate(
      { userId, key, status: 'active' },
      {
        userId,
        type: 'preference',
        key,
        content: rawFact,
        confidence: 1.0,
        sourceConversationId: conversationId || null,
        status: 'active',
      },
      { upsert: true, new: true }
    );

    console.log(`[MEMORY] Explicit remember created: "${key}" for user ${userId}`);
    return {
      handled: true,
      reply: `I have remembered: "${rawFact}". I will keep this in mind across our conversations.`,
    };
  }

  // 2. Explicit Forget command
  const forgetMatch = trimmed.match(/^(?:please\s+)?forget(?:\s+that|\s+my|\s+about)?\s+(.+)$/i);
  if (forgetMatch) {
    const topic = forgetMatch[1].trim().toLowerCase().replace(/^[:"']+|["']+$/g, '');
    const tokens = topic.split(/\s+/).filter((w) => w.length >= 3);

    const candidates = await UserMemory.find({ userId, status: 'active' });
    let matchedCount = 0;

    for (const mem of candidates) {
      const memText = (mem.key + ' ' + mem.content).toLowerCase();
      const matches = tokens.some((t) => memText.includes(t));
      if (matches) {
        mem.status = 'forgotten';
        await mem.save();
        matchedCount++;
      }
    }

    if (matchedCount > 0) {
      console.log(`[MEMORY] Explicit forget deactivated ${matchedCount} memories for user ${userId}`);
      return {
        handled: true,
        reply: `I have forgotten that information and will no longer use it in our conversations.`,
      };
    } else {
      return {
        handled: true,
        reply: `I could not find any active stored memories matching "${topic}".`,
      };
    }
  }

  return { handled: false };
};

/**
 * Build formatted memory context sections for prompt inclusion.
 * Strictly bounds character budget so memory never starves model context.
 */
const buildMemoryPromptSection = ({ relevantMemories = [], rollingSummary = '', maxChars = 1200 }) => {
  const parts = [];

  if (relevantMemories.length > 0) {
    const memoryLines = relevantMemories
      .slice(0, 5)
      .map((m) => `- [${m.type}] ${m.content}`)
      .join('\n');
    parts.push(
      `USER PREFERENCES & CONTEXT (Personalization guide; NEVER overrides document facts):\n${memoryLines}`
    );
  }

  if (rollingSummary) {
    parts.push(
      `PRIOR CONVERSATION SUMMARY:\n${rollingSummary.slice(0, 400)}`
    );
  }

  const combined = parts.join('\n\n');
  return combined.slice(0, maxChars);
};

module.exports = {
  getRecentConversationHistory,
  getRollingSummary,
  updateRollingSummaryIfNeeded,
  retrieveRelevantUserMemories,
  extractAndStoreMemories,
  handleExplicitMemoryCommands,
  buildMemoryPromptSection,
  containsSensitiveData,
};
