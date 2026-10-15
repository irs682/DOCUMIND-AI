import api from './api';

export const chatApi = {
  health: () => api.get('/health'),
  getConversations: (params = {}) => api.get('/chat/conversations', { params }),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  sendMessage: (conversationId, message, documentId = null) =>
    api.post(`/chat/conversations/${conversationId}/messages`, { message, documentId }),
  createConversation: (data) => api.post('/chat/conversations', data),
  updateConversation: (id, data) => api.patch(`/chat/conversations/${id}`, data),
  pinConversation: (id, isPinned) => api.patch(`/chat/conversations/${id}/pin`, { isPinned }),
  archiveConversation: (id, status) => api.patch(`/chat/conversations/${id}/archive`, { status }),
  updateSessionDocuments: (id, selectedDocumentIds) =>
    api.patch(`/chat/conversations/${id}/documents`, { selectedDocumentIds }),
  bookmarkMessage: (conversationId, messageId, isBookmarked) =>
    api.patch(`/chat/conversations/${conversationId}/messages/${messageId}/bookmark`, { isBookmarked }),
  moveConversation: (id, projectId) =>
    api.patch(`/chat/conversations/${id}/move`, { projectId }),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),


  // Server-Sent Events (SSE) Streaming
  sendMessageStream: async (
    conversationId,
    {
      message,
      documentId = null,
      knowledgeBaseId = null,
      projectId = null,
      signal,
      onStart,
      onMetadata,
      onCitation,
      onDelta,
      onHeartbeat,
      onDone,
      onError,
    }
  ) => {
    const rawApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
    const API_BASE_URL = rawApi === '/api' ? '/api' : (rawApi.endsWith('/api') ? rawApi : `${rawApi.replace(/\/$/, '')}/api`);
    const token = localStorage.getItem('token');
    const endpoint = conversationId
      ? `${API_BASE_URL}/chat/conversations/${conversationId}/messages/stream`
      : `${API_BASE_URL}/chat/stream`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, documentId, knowledgeBaseId, projectId }),
      signal,
    });

    if (!response.ok) {
      let errData = {};
      try {
        errData = await response.json();
      } catch (_) {}
      const errMsg = errData.message || `Server error (${response.status})`;
      if (onError) onError(new Error(errMsg));
      throw new Error(errMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let activeGenerationId = null;
    let lastSeq = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are delimited by double newlines (\n\n or \r\n\r\n)
        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawBlock = buffer.slice(0, boundaryIndex).trim();
          buffer = buffer.slice(boundaryIndex + 2);

          if (!rawBlock) continue;

          let eventName = 'message';
          let dataStr = '';

          const lines = rawBlock.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) {
              continue; // Skip SSE comments
            }
            if (trimmed.startsWith('event:')) {
              eventName = trimmed.slice(6).trim();
            } else if (trimmed.startsWith('data:')) {
              dataStr += trimmed.slice(5).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);

            if (eventName === 'start') {
              activeGenerationId = data.generationId || null;
              if (onStart) onStart(data);
            } else if (eventName === 'metadata') {
              if (onMetadata) onMetadata(data);
            } else if (eventName === 'citation') {
              if (onCitation) onCitation(data.sources || []);
            } else if (eventName === 'delta') {
              // Discard stale generation packets
              if (activeGenerationId && data.generationId && data.generationId !== activeGenerationId) {
                continue;
              }
              // Monotonic sequence verification
              if (typeof data.seq === 'number') {
                if (data.seq <= lastSeq) {
                  continue; // Skip duplicate or out-of-order delta
                }
                lastSeq = data.seq;
              }
              if (onDelta) onDelta(data.content || '', data);
            } else if (eventName === 'heartbeat') {
              if (onHeartbeat) onHeartbeat(data);
            } else if (eventName === 'done') {
              if (onDone) onDone(data);
            } else if (eventName === 'error') {
              const err = new Error(data.message || 'Stream error');
              err.code = data.code;
              if (onError) onError(err);
            }
          } catch (_) {
            // Safe recovery on malformed event
          }
        }
      }

      // Flush any trailing event left in buffer on normal stream close
      if (buffer.trim()) {
        const lines = buffer.trim().split('\n');
        let eventName = 'message';
        let dataStr = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) eventName = trimmed.slice(6).trim();
          else if (trimmed.startsWith('data:')) dataStr += trimmed.slice(5).trim();
        }
        if (dataStr) {
          try {
            const data = JSON.parse(dataStr);
            if (eventName === 'done' && onDone) onDone(data);
            else if (eventName === 'delta' && onDelta) onDelta(data.content || '', data);
          } catch (_) {}
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[STREAM] Stream cancelled by user');
      } else {
        if (onError) onError(err);
        throw err;
      }
    }
  },

  // Memory Management API
  getMemories: () => api.get('/chat/memories'),
  deleteMemory: (id) => api.delete(`/chat/memories/${id}`),
  clearMemories: () => api.delete('/chat/memories'),
  toggleMemory: (enabled) => api.patch('/chat/memories/toggle', { enabled }),
};

