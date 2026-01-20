import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FileText, AlertTriangle, BarChart3, 
  Ban, CheckCircle, Trash2, Search, ChevronLeft, ChevronRight,
  Shield, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Pagination
  const [usersPage, setUsersPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [alertsTotalPages, setAlertsTotalPages] = useState(1);
  
  // Search
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'posts') fetchPosts();
    if (activeTab === 'alerts') fetchAlerts();
  }, [activeTab, usersPage, postsPage, alertsPage]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Admin access required');
        navigate('/');
      } else {
        toast.error('Failed to load stats');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = { page: usersPage, limit: 15 };
      if (userSearch) params.search = userSearch;
      
      const response = await axios.get(`${API}/admin/users`, { 
        params,
        withCredentials: true 
      });
      setUsers(response.data.users);
      setUsersTotalPages(response.data.pages);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/admin/posts`, { 
        params: { page: postsPage, limit: 15 },
        withCredentials: true 
      });
      setPosts(response.data.posts);
      setPostsTotalPages(response.data.pages);
    } catch (error) {
      toast.error('Failed to load posts');
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API}/admin/alerts`, { 
        params: { page: alertsPage, limit: 15 },
        withCredentials: true 
      });
      setAlerts(response.data.alerts);
      setAlertsTotalPages(response.data.pages);
    } catch (error) {
      toast.error('Failed to load alerts');
    }
  };

  const banUser = async (userId) => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    
    try {
      await axios.post(`${API}/admin/users/${userId}/ban`, {}, { withCredentials: true });
      toast.success('User banned');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to ban user');
    }
  };

  const unbanUser = async (userId) => {
    try {
      await axios.post(`${API}/admin/users/${userId}/unban`, {}, { withCredentials: true });
      toast.success('User unbanned');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to unban user');
    }
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await axios.delete(`${API}/admin/posts/${postId}`, { withCredentials: true });
      toast.success('Post deleted');
      fetchPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await axios.delete(`${API}/admin/alerts/${alertId}`, { withCredentials: true });
      toast.success('Alert deleted');
      fetchAlerts();
    } catch (error) {
      toast.error('Failed to delete alert');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="pb-safe p-4 max-w-6xl mx-auto" data-testid="admin-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-amber-400" />
        <h1 className="font-display text-xl tracking-widest uppercase">Admin Dashboard</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 bg-white/5 rounded-lg p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-white/10">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-white/10">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-white/10">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-white/60">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_users}</p>
                  <p className="text-xs text-green-400">+{stats.recent_signups} this week</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-white/60">Total Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_posts}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-white/60">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.active_users_count}</p>
                  <p className="text-xs text-white/40">Posted this week</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-white/60">Group Chats</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_gcs}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-white/60">Stoops</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_stoops}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-normal text-white/60">Safety Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total_alerts}</p>
                </CardContent>
              </Card>
            </div>
          )}
          
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="bg-white/5 border-white/20"
                onClick={() => setActiveTab('users')}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/5 border-white/20"
                onClick={() => setActiveTab('posts')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Review Posts
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/5 border-white/20"
                onClick={() => setActiveTab('alerts')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                View Alerts
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/5 border-white/20"
                onClick={() => navigate('/settings')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
              className="bg-white/5 border-white/20"
            />
            <Button onClick={fetchUsers} className="bg-white/10">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-2">
            {users.map((u) => (
              <div 
                key={u.user_id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg bg-white/5",
                  u.is_banned && "bg-red-500/10 border border-red-500/30"
                )}
              >
                <Avatar className="h-10 w-10 border border-white/20">
                  <AvatarImage src={u.picture} />
                  <AvatarFallback>{u.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{u.name}</p>
                    {u.is_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                    {u.verified && <Badge className="text-xs bg-blue-500">Verified</Badge>}
                  </div>
                  <p className="text-xs text-white/40 truncate">@{u.username} • {u.email}</p>
                </div>
                <div className="flex gap-2">
                  {u.is_banned ? (
                    <Button size="sm" variant="outline" onClick={() => unbanUser(u.user_id)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300" onClick={() => banUser(u.user_id)}>
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              disabled={usersPage === 1}
              onClick={() => setUsersPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-white/60">Page {usersPage} of {usersTotalPages}</span>
            <Button 
              variant="outline" 
              size="sm"
              disabled={usersPage >= usersTotalPages}
              onClick={() => setUsersPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-4">
          <div className="space-y-2">
            {posts.map((post) => (
              <div key={post.post_id} className="p-3 rounded-lg bg-white/5">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 border border-white/20">
                    <AvatarImage src={post.author?.picture} />
                    <AvatarFallback>{post.author?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">@{post.author?.username || 'unknown'}</p>
                    <p className="text-sm text-white/80 line-clamp-2">{post.content}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-400 hover:text-red-300"
                    onClick={() => deletePost(post.post_id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm"
              disabled={postsPage === 1}
              onClick={() => setPostsPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-white/60">Page {postsPage} of {postsTotalPages}</span>
            <Button 
              variant="outline" 
              size="sm"
              disabled={postsPage >= postsTotalPages}
              onClick={() => setPostsPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No alerts to review</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.alert_id} className="p-3 rounded-lg bg-white/5">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "text-xs",
                          alert.alert_type === 'police' && "bg-red-500",
                          alert.alert_type === 'safety' && "bg-orange-500",
                          alert.alert_type === 'protest' && "bg-purple-500",
                          alert.alert_type === 'vibe' && "bg-green-500"
                        )}>
                          {alert.alert_type}
                        </Badge>
                        <span className="text-xs text-white/40">
                          by @{alert.reporter?.username || 'unknown'}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 mt-1">{alert.description}</p>
                      <p className="text-xs text-white/40 mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-400 hover:text-red-300"
                      onClick={() => deleteAlert(alert.alert_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Pagination */}
          {alerts.length > 0 && (
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                disabled={alertsPage === 1}
                onClick={() => setAlertsPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-white/60">Page {alertsPage} of {alertsTotalPages}</span>
              <Button 
                variant="outline" 
                size="sm"
                disabled={alertsPage >= alertsTotalPages}
                onClick={() => setAlertsPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
