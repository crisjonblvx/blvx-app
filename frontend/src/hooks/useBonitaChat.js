import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useBonitaChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const askBonita = useCallback(async (content, mode = 'conversation', context = 'block') => {
    setLoading(true);
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content }]);
    
    try {
      const response = await axios.post(`${API}/bonita/ask`, {
        mode,
        content,
        context
      }, {
        withCredentials: true
      });
      
      const bonitaResponse = response.data.response;
      
      // Add Bonita's response
      setMessages(prev => [...prev, { role: 'assistant', content: bonitaResponse }]);
      
      return bonitaResponse;
    } catch (err) {
      const errorMsg = "I'm having trouble connecting right now. Try again in a moment.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    askBonita,
    clearMessages
  };
};
