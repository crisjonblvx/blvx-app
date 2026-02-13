import { useState, useCallback, useEffect } from 'react';
import api from '@/lib/api';

export const usePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeed = useCallback(async (before = null, energy = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (before) params.before = before;
      if (energy) params.energy = energy;
      const response = await api.get(`/posts/feed`, {
        params,
        withCredentials: true
      });
      if (before) {
        setPosts(prev => [...prev, ...response.data]);
      } else {
        setPosts(response.data);
      }
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExploreFeed = useCallback(async (before = null, energy = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (before) params.before = before;
      if (energy) params.energy = energy;
      const response = await api.get(`/posts/explore`, {
        params,
        withCredentials: true
      });
      if (before) {
        setPosts(prev => [...prev, ...response.data]);
      } else {
        setPosts(response.data);
      }
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserPosts = useCallback(async (username, before = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = before ? { before } : {};
      const response = await api.get(`/posts/user/${username}`, {
        params,
        withCredentials: true
      });
      if (before) {
        setPosts(prev => [...prev, ...response.data]);
      } else {
        setPosts(response.data);
      }
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPost = useCallback(async (postId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/posts/${postId}`, {
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

  const fetchThread = useCallback(async (postId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/posts/${postId}/thread`, {
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

  const createPost = useCallback(async (postData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/posts`, postData, {
        withCredentials: true
      });
      setPosts(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (postId) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/posts/${postId}`, {
        withCredentials: true
      });
      setPosts(prev => prev.filter(p => p.post_id !== postId));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const likePost = useCallback(async (postId) => {
    try {
      await api.post(`/posts/${postId}/like`, {}, {
        withCredentials: true
      });
    } catch (err) {
      throw err;
    }
  }, []);

  const unlikePost = useCallback(async (postId) => {
    try {
      await api.delete(`/posts/${postId}/like`, {
        withCredentials: true
      });
    } catch (err) {
      throw err;
    }
  }, []);

  const checkLiked = useCallback(async (postId) => {
    try {
      const response = await api.get(`/posts/${postId}/liked`, {
        withCredentials: true
      });
      return response.data.is_liked;
    } catch (err) {
      return false;
    }
  }, []);

  const votePoll = useCallback(async (postId, optionIndex) => {
    try {
      const response = await api.post(`/posts/${postId}/vote`, { option_index: optionIndex }, {
        withCredentials: true
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const searchPosts = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/posts/search/content`, {
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
    posts,
    setPosts,
    loading,
    error,
    fetchFeed,
    fetchExploreFeed,
    fetchUserPosts,
    fetchPost,
    fetchThread,
    createPost,
    deletePost,
    likePost,
    unlikePost,
    checkLiked,
    votePoll,
    searchPosts
  };
};
