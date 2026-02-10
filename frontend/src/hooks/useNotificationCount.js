import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export const useNotificationCount = () => {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
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
