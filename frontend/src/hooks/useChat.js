import { useState } from 'react';
import { chatApi } from '../services/chatApi';

export const useChat = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message) => {
    setLoading(true);
    try {
      const { data } = await chatApi.sendMessage(conversationId, message);
      setMessages((prev) => [...prev, data]);
      return data;
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage, setMessages };
};
