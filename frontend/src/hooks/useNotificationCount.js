import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useNotificationCount = () => {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/notifications/unread-count`, {
        withCredentials: true
      });
      setCount(response.data.count);
    } catch (err) {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count, refetch: fetchCount };
};
