import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const usePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeed = useCallback(async (before = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = before ? { before } : {};
      const response = await axios.get(`${API}/posts/feed`, {
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

  const fetchExploreFeed = useCallback(async (before = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = before ? { before } : {};
      const response = await axios.get(`${API}/posts/explore`, {
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
      const response = await axios.get(`${API}/posts/user/${username}`, {
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
      const response = await axios.get(`${API}/posts/${postId}`, {
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
      const response = await axios.get(`${API}/posts/${postId}/thread`, {
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
      const response = await axios.post(`${API}/posts`, postData, {
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
      await axios.delete(`${API}/posts/${postId}`, {
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
      await axios.post(`${API}/posts/${postId}/like`, {}, {
        withCredentials: true
      });
    } catch (err) {
      throw err;
    }
  }, []);

  const unlikePost = useCallback(async (postId) => {
    try {
      await axios.delete(`${API}/posts/${postId}/like`, {
        withCredentials: true
      });
    } catch (err) {
      throw err;
    }
  }, []);

  const checkLiked = useCallback(async (postId) => {
    try {
      const response = await axios.get(`${API}/posts/${postId}/liked`, {
        withCredentials: true
      });
      return response.data.is_liked;
    } catch (err) {
      return false;
    }
  }, []);

  const searchPosts = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API}/posts/search/content`, {
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
    searchPosts
  };
};
