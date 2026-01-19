import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/notifications`, {
        withCredentials: true
      });
      setNotifications(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await axios.post(`${API}/notifications/read`, {}, {
        withCredentials: true
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAllRead
  };
};
