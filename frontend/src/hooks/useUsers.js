import { useState, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useUsers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async (username) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/users/profile/${username}`, {
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API}/users/profile`, data, {
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const followUser = useCallback(async (userId) => {
    try {
      await axios.post(`${API}/users/follow/${userId}`, {}, {
        withCredentials: true
      });
    } catch (err) {
      throw err;
    }
  }, []);

  const unfollowUser = useCallback(async (userId) => {
    try {
      await axios.delete(`${API}/users/follow/${userId}`, {
        withCredentials: true
      });
    } catch (err) {
      throw err;
    }
  }, []);

  const checkFollowing = useCallback(async (userId) => {
    try {
      const response = await axios.get(`${API}/users/following/${userId}`, {
        withCredentials: true
      });
      return response.data.is_following;
    } catch (err) {
      return false;
    }
  }, []);

  const searchUsers = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/users/search`, {
        params: { q: query },
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchProfile,
    updateProfile,
    followUser,
    unfollowUser,
    checkFollowing,
    searchUsers
  };
};
