const mongoose = require('mongoose');
const crypto = require('crypto');
const ChatSession = require('../models/ChatSession');
const KnowledgeBase = require('../models/KnowledgeBase');
const Project = require('../models/Project');
const AIRequest = require('../models/AIRequest');
const User = require('../models/User');
const UserMemory = require('../models/UserMemory');
const { askDocument, askDocumentStream } = require('../services/ragService');
const { extractAndStoreMemories, updateRollingSummaryIfNeeded } = require('../services/memoryService');
const { generateChatTitle } = require('../services/llmService');

const createConversation = async (req, res) => {
  const {
    title = 'New conversation',
    knowledgeBaseId = null,
    projectId = null,
    selectedDocumentIds = [],
  } = req.body;

  if (knowledgeBaseId) {
    const kb = await KnowledgeBase.findOne({ _id: knowledgeBaseId, owner: req.user._id });
    if (!kb) return res.status(404).json({ message: 'Knowledge base not found' });
  }
  if (projectId) {
    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
  }

  const validDocIds = Array.isArray(selectedDocumentIds)
    ? selectedDocumentIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  const conversation = await ChatSession.create({
    user: req.user._id,
    title: title.trim().slice(0, 120),
    titleSource: 'auto',
    status: 'active',
    isPinned: false,
    selectedDocumentIds: validDocIds,
    knowledgeBaseId,
    projectId,
    lastMessageAt: new Date(),
    lastMessagePreview: '',
    messages: [],
  });

  return res.status(201).json({ conversation });
};

const getConversations = async (req, res) => {
  const { status = 'active', search, projectId, limit = 50, skip = 0 } = req.query;

  const query = {
    user: req.user._id,
  };

  if (status && status !== 'all') {
    query.status = status;
  }

  if (projectId !== undefined) {
    if (projectId === 'null' || projectId === 'none' || projectId === '') {
      query.projectId = null;
    } else if (mongoose.Types.ObjectId.isValid(projectId)) {
      query.projectId = projectId;
    }
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: regex }, { 'messages.text': regex }];
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const parsedSkip = Math.max(parseInt(skip, 10) || 0, 0);

  const [conversations, totalCount] = await Promise.all([
    ChatSession.find(query)
      .select('title titleSource status isPinned selectedDocumentIds lastMessagePreview lastMessageAt model knowledgeBaseId projectId createdAt updatedAt')
      .populate('selectedDocumentIds', 'name originalName fileType')
      .sort({ isPinned: -1, lastMessageAt: -1, updatedAt: -1 })
      .skip(parsedSkip)
      .limit(parsedLimit)
      .lean(),
    ChatSession.countDocuments(query),
  ]);

  return res.json({
    conversations,
    pagination: {
      total: totalCount,
      limit: parsedLimit,
      skip: parsedSkip,
      hasMore: parsedSkip + conversations.length < totalCount,
    },
  });
};

const getConversationById = async (req, res) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: 'Conversation not found' });
  }
  const conversation = await ChatSession.findOne({ _id: req.params.id, user: req.user._id })
    .populate('selectedDocumentIds', 'name originalName fileType status');

  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
  return res.json({ conversation });
};


const sendMessage = async (req, res) => {
  const startedAt = Date.now();
  const { message, documentId = null, knowledgeBaseId = null } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ message: 'Message text is required' });
  if (message.trim().length > 4000) return res.status(400).json({ message: 'Message must be 4,000 characters or fewer' });

  let conversation = null;
  if (req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)) {
    conversation = await ChatSession.findOne({ _id: req.params.id, user: req.user._id });
  }

  // Gracefully auto-create conversation if it was deleted, stale, or not found
  if (!conversation) {
    conversation = await ChatSession.create({
      user: req.user._id,
      title: message.trim().slice(0, 80),
      knowledgeBaseId: knowledgeBaseId || null,
      messages: [],
    });
  }

  const project = conversation.projectId
    ? await Project.findOne({ _id: conversation.projectId, owner: req.user._id })
    : null;
  const selectedKb = knowledgeBaseId || conversation.knowledgeBaseId;
  if (selectedKb) {
    const kb = await KnowledgeBase.findOne({ _id: selectedKb, owner: req.user._id });
    if (!kb) return res.status(404).json({ message: 'Knowledge base not found' });
  }

  const userMessage = { sender: 'user', text: message.trim(), status: 'completed' };
  conversation.messages.push(userMessage);
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = message.trim().slice(0, 100);
  if (selectedKb) conversation.knowledgeBaseId = selectedKb;
  await conversation.save();

  // Asynchronously generate 3-6 word title on the first user turn if titleSource is 'auto'
  if (conversation.titleSource === 'auto' && conversation.messages.length <= 2) {
    generateChatTitle(message.trim())
      .then(async (newTitle) => {
        if (newTitle) {
          await ChatSession.updateOne(
            { _id: conversation._id, titleSource: 'auto' },
            { title: newTitle }
          );
        }
      })
      .catch(() => {});
  }

  try {
    const effectiveDocId = documentId || (conversation.selectedDocumentIds?.length === 1 ? conversation.selectedDocumentIds[0] : null);
    const result = await askDocument({
      question: message.trim(),
      documentId: effectiveDocId,
      userId: req.user._id,
      knowledgeBaseId: selectedKb,
      projectInstructions: project?.instructions || '',
    });
    const assistantMessage = { sender: 'assistant', text: result.answer, citations: result.sources, status: 'completed' };
    conversation.messages.push(assistantMessage);
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = (result.answer || '').trim().slice(0, 100);
    await conversation.save();

    // Asynchronous Memory Extraction & Summary Update (non-blocking)
    extractAndStoreMemories({
      userId: req.user._id,
      conversationId: conversation._id,
      userMessage: message.trim(),
      assistantMessage: result.answer,
    }).catch(() => {});
    updateRollingSummaryIfNeeded(conversation._id).catch(() => {});

    await AIRequest.create({ user: req.user._id, type: 'chat', knowledgeBaseId: selectedKb || null, documentId: effectiveDocId || null, status: 'success', latencyMs: Date.now() - startedAt });
    return res.json({ userMessage, assistantMessage, conversationId: conversation._id });
  } catch (error) {
    console.error(`[CHAT] Error generating response:`, error.message);
    await AIRequest.create({ user: req.user._id, type: 'chat', knowledgeBaseId: selectedKb || null, documentId: documentId || null, status: 'failed', latencyMs: Date.now() - startedAt, errorCode: error.name || 'AI_ERROR' }).catch(() => {});
    return res.status(500).json({ message: error.message || 'Unable to generate a response. Please try again.' });
  }
};

/**
 * Server-Sent Events (SSE) streaming endpoint for ChatGPT-like progressive chat responses.
 */
const sendMessageStream = async (req, res) => {
  const startedAt = Date.now();
  const { message, documentId = null, knowledgeBaseId = null } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message text is required' });
  }

  const generationId = `gen_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const assistantMessageId = new mongoose.Types.ObjectId();

  let conversation = null;
  if (req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)) {
    conversation = await ChatSession.findOne({ _id: req.params.id, user: req.user._id });
  }

  if (!conversation) {
    conversation = await ChatSession.create({
      user: req.user._id,
      title: message.trim().slice(0, 80),
      titleSource: 'auto',
      status: 'active',
      isPinned: false,
      selectedDocumentIds: documentId && mongoose.Types.ObjectId.isValid(documentId) ? [documentId] : [],
      knowledgeBaseId: knowledgeBaseId || null,
      lastMessageAt: new Date(),
      lastMessagePreview: message.trim().slice(0, 100),
      messages: [],
    });
  }

  const project = conversation.projectId
    ? await Project.findOne({ _id: conversation.projectId, owner: req.user._id })
    : null;
  const selectedKb = knowledgeBaseId || conversation.knowledgeBaseId;

  // Persist user message immediately
  const userMessage = { sender: 'user', text: message.trim(), status: 'completed' };
  conversation.messages.push(userMessage);
  conversation.lastMessageAt = new Date();
  conversation.lastMessagePreview = message.trim().slice(0, 100);
  if (selectedKb) conversation.knowledgeBaseId = selectedKb;
  await conversation.save();

  // Asynchronously generate 3-6 word title on the first user turn if titleSource is 'auto'
  if (conversation.titleSource === 'auto' && conversation.messages.length <= 2) {
    generateChatTitle(message.trim())
      .then(async (newTitle) => {
        if (newTitle) {
          await ChatSession.updateOne(
            { _id: conversation._id, titleSource: 'auto' },
            { title: newTitle }
          );
        }
      })
      .catch(() => {});
  }

  // Set SSE Headers with no-buffering directives
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Backpressure-safe event dispatcher
  const sendEvent = async (event, data) => {
    if (res.writableEnded) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const ok = res.write(payload);
    if (!ok) {
      await new Promise((resolve) => res.once('drain', resolve));
    }
  };

  const abortController = new AbortController();
  req.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  // Heartbeat keep-alive every 20 seconds
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ generationId, timestamp: Date.now() })}\n\n`);
    }
  }, 20000);

  let accumulatedAnswer = '';
  let finalSources = [];
  let seqCounter = 0;
  let firstTokenLatencyMs = null;
  let completedNormally = false;

  try {
    const streamResult = await askDocumentStream({
      question: message.trim(),
      documentId,
      userId: req.user._id,
      knowledgeBaseId: selectedKb,
      conversationId: conversation._id,
      projectInstructions: project?.instructions || '',
      generationId,
      signal: abortController.signal,
      onStart: async () => {
        await sendEvent('start', {
          messageId: assistantMessageId,
          conversationId: conversation._id,
          generationId,
          model: conversation.model || 'auto',
          createdAt: new Date().toISOString(),
        });
      },
      onMetadata: async (meta) => {
        await sendEvent('metadata', {
          generationId,
          ...meta,
        });
      },
      onCitations: async (sources) => {
        finalSources = sources || [];
        await sendEvent('citation', {
          generationId,
          sources: finalSources,
        });
      },
      onDelta: async (delta, meta = {}) => {
        if (firstTokenLatencyMs === null) {
          firstTokenLatencyMs = Date.now() - startedAt;
        }
        accumulatedAnswer += delta;
        seqCounter = meta.seq || (seqCounter + 1);
        await sendEvent('delta', {
          generationId,
          seq: seqCounter,
          content: delta,
        });
      },
      onDone: (fullText, meta = {}) => {
        accumulatedAnswer = fullText || accumulatedAnswer;
      },
    });

    const durationMs = Date.now() - startedAt;
    const fullAnswer = accumulatedAnswer || streamResult?.answer || '';
    const sources = finalSources.length ? finalSources : (streamResult?.sources || []);

    // Save final assistant message to MongoDB exactly once
    const assistantMessage = {
      _id: assistantMessageId,
      sender: 'assistant',
      text: fullAnswer,
      citations: sources,
      status: 'completed',
      generationId,
      finishReason: 'stop',
      timeToFirstTokenMs: firstTokenLatencyMs,
      durationMs,
    };
    conversation.messages.push(assistantMessage);
    conversation.lastMessageAt = new Date();
    conversation.lastMessagePreview = fullAnswer.trim().slice(0, 100);
    await conversation.save();
    completedNormally = true;

    await sendEvent('done', {
      generationId,
      finishReason: 'stop',
      fullText: fullAnswer,
      sources,
      conversationId: conversation._id,
      conversationTitle: conversation.title,
      firstTokenMs: firstTokenLatencyMs,
      durationMs,
    });

    // Asynchronous 3-layer memory extraction & summary updates
    extractAndStoreMemories({
      userId: req.user._id,
      conversationId: conversation._id,
      userMessage: message.trim(),
      assistantMessage: fullAnswer,
    }).catch(() => {});
    updateRollingSummaryIfNeeded(conversation._id).catch(() => {});

    await AIRequest.create({
      user: req.user._id,
      type: 'chat_stream',
      knowledgeBaseId: selectedKb || null,
      documentId: documentId || null,
      status: 'success',
      latencyMs: durationMs,
    }).catch(() => {});
  } catch (err) {
    const isCancelled = abortController.signal.aborted || err.name === 'AbortError' || err.message?.includes('aborted');
    if (isCancelled) {
      console.log(`[CHAT STREAM] Stream cancelled by client generationId=${generationId}`);
      if (accumulatedAnswer.trim()) {
        conversation.messages.push({
          _id: assistantMessageId,
          sender: 'assistant',
          text: accumulatedAnswer,
          citations: finalSources,
          status: 'cancelled',
          generationId,
          finishReason: 'cancelled',
          timeToFirstTokenMs: firstTokenLatencyMs,
          durationMs: Date.now() - startedAt,
        });
        await conversation.save().catch(() => {});
      }
    } else {
      console.error(`[CHAT STREAM ERROR]:`, err.message);
      let classifiedCode = 'STREAM_ERROR';
      let safeMessage = 'Stream processing failed. Please try again.';

      if (err.code === 'OPENROUTER_AUTH_FAILED' || err.status === 401) {
        classifiedCode = 'AUTH_FAILED';
        safeMessage = 'Authentication with AI service failed.';
      } else if (err.code === 'OPENROUTER_RATE_LIMIT' || err.status === 429) {
        classifiedCode = 'RATE_LIMITED';
        safeMessage = 'AI service is temporarily busy. Please try again shortly.';
      } else if (err.code === 'OPENROUTER_TIMEOUT' || err.status === 408) {
        classifiedCode = 'TIMEOUT';
        safeMessage = 'Response generation timed out.';
      } else if (err.code === 'OPENROUTER_NETWORK_ERROR' || err.status === 503) {
        classifiedCode = 'UPSTREAM_UNAVAILABLE';
        safeMessage = 'AI provider is temporarily unreachable.';
      }

      await sendEvent('error', {
        generationId,
        code: classifiedCode,
        message: safeMessage,
      }).catch(() => {});

      if (accumulatedAnswer.trim() && !completedNormally) {
        conversation.messages.push({
          _id: assistantMessageId,
          sender: 'assistant',
          text: accumulatedAnswer,
          citations: finalSources,
          status: 'interrupted',
          generationId,
          finishReason: 'error',
          timeToFirstTokenMs: firstTokenLatencyMs,
          durationMs: Date.now() - startedAt,
        });
        await conversation.save().catch(() => {});
      }
    }
  } finally {
    clearInterval(heartbeatInterval);
    if (!res.writableEnded) {
      res.end();
    }
  }
};

const updateConversation = async (req, res) => {
  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Conversation title cannot be empty' });
    updates.title = title.slice(0, 120);
    updates.titleSource = 'user'; // Lock title so auto-title won't overwrite it
  }
  if (typeof req.body.isPinned === 'boolean') {
    updates.isPinned = req.body.isPinned;
  }
  if (['active', 'archived'].includes(req.body.status)) {
    updates.status = req.body.status;
  }
  if (Array.isArray(req.body.selectedDocumentIds)) {
    updates.selectedDocumentIds = req.body.selectedDocumentIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
  }

  const conversation = await ChatSession.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    updates,
    { new: true }
  ).populate('selectedDocumentIds', 'name originalName fileType status');

  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
  return res.json({ conversation });
};

const pinConversation = async (req, res) => {
  const { isPinned } = req.body;
  const conversation = await ChatSession.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isPinned: typeof isPinned === 'boolean' ? isPinned : true },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
  return res.json({
    conversation,
    message: conversation.isPinned ? 'Chat pinned' : 'Chat unpinned',
  });
};

const archiveConversation = async (req, res) => {
  const { status } = req.body;
  const targetStatus = status === 'active' ? 'active' : 'archived';
  const conversation = await ChatSession.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { status: targetStatus },
    { new: true }
  );
  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
  return res.json({
    conversation,
    message: targetStatus === 'archived' ? 'Chat archived' : 'Chat restored to active',
  });
};

const updateSessionDocuments = async (req, res) => {
  const { selectedDocumentIds = [] } = req.body;
  const validDocIds = Array.isArray(selectedDocumentIds)
    ? selectedDocumentIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  const conversation = await ChatSession.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { selectedDocumentIds: validDocIds },
    { new: true }
  ).populate('selectedDocumentIds', 'name originalName fileType status');

  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
  return res.json({ conversation });
};

const bookmarkMessage = async (req, res) => {
  const { id: conversationId, messageId } = req.params;
  const { isBookmarked } = req.body;

  const conversation = await ChatSession.findOne({
    _id: conversationId,
    user: req.user._id,
  });

  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

  const msg = conversation.messages.id(messageId);
  if (!msg) return res.status(404).json({ message: 'Message not found in this conversation' });

  msg.isBookmarked = typeof isBookmarked === 'boolean' ? isBookmarked : !msg.isBookmarked;
  await conversation.save();

  return res.json({
    messageId,
    isBookmarked: msg.isBookmarked,
    message: msg.isBookmarked ? 'Message bookmarked' : 'Bookmark removed',
  });
};

const moveConversation = async (req, res) => {
  const { projectId = null } = req.body;
  let targetProjectId = null;

  if (projectId && projectId !== 'none' && projectId !== 'null') {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    const project = await Project.findOne({ _id: projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Target project not found' });
    targetProjectId = project._id;
    await Project.updateOne({ _id: targetProjectId }, { lastActivityAt: new Date() }).catch(() => {});
  }

  const conversation = await ChatSession.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { projectId: targetProjectId },
    { new: true }
  ).populate('selectedDocumentIds', 'name originalName fileType status');

  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

  return res.json({
    conversation,
    message: targetProjectId ? 'Chat moved to project' : 'Chat removed from project',
  });
};

const deleteConversation = async (req, res) => {
  const conversation = await ChatSession.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
  return res.json({ message: 'Conversation deleted' });
};

// ── Long-term User Memory Management Endpoints ───────────────────────────────

const getUserMemories = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    const memoryEnabled = user?.preferences?.memoryEnabled !== false;

    const memories = await UserMemory.find({
      userId: req.user._id,
      status: 'active',
    }).sort({ updatedAt: -1 });

    return res.json({
      success: true,
      memoryEnabled,
      memories,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const deleteUserMemory = async (req, res) => {
  try {
    const memory = await UserMemory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'forgotten' },
      { new: true }
    );
    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }
    return res.json({ success: true, message: 'Memory deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const clearUserMemories = async (req, res) => {
  try {
    await UserMemory.updateMany(
      { userId: req.user._id, status: 'active' },
      { status: 'forgotten' }
    );
    return res.json({ success: true, message: 'All memories cleared' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const toggleMemory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const nextState = typeof req.body.enabled === 'boolean'
      ? req.body.enabled
      : !(user.preferences?.memoryEnabled !== false);

    if (!user.preferences) user.preferences = {};
    user.preferences.memoryEnabled = nextState;
    await user.save();

    return res.json({
      success: true,
      memoryEnabled: nextState,
      message: `Memory ${nextState ? 'enabled' : 'disabled'}`,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getConversationById,
  sendMessage,
  sendMessageStream,
  updateConversation,
  pinConversation,
  archiveConversation,
  moveConversation,
  updateSessionDocuments,
  bookmarkMessage,
  deleteConversation,
  getUserMemories,
  deleteUserMemory,
  clearUserMemories,
  toggleMemory,
};
