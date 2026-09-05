import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Music2, Video, CreditCard, Trophy, Bell, BarChart2, Loader2,
  Pencil, Trash2, Upload, CheckCircle2, XCircle, Clock, TrendingUp, Lock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Song, Video as VideoType, Payment, UserSubscription, Nominee, Vote, Notification } from '@/types/index';
import {
  getSongs, getVideos, getUserPayments, getUserSubscriptions,
  getUserNominations, getUserVotes, getUserNotifications,
  deleteSong, deleteVideo, markNotificationRead, updateProfile, uploadFile
} from '@/lib/api';
import { supabase } from '@/db/supabase';
import { formatDate, formatCurrency, getPaymentStatusColor, getPaymentStatusLabel } from '@/lib/utils';
import { Navigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [songs, setSongs] = useState<Song[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [nominations, setNominations] = useState<Nominee[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Edit profile
  const [editDialog, setEditDialog] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit content dialog
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [editSongTitle, setEditSongTitle] = useState('');
  const [editSongArtist, setEditSongArtist] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const [s, v, p, sub, nom, vot, notif] = await Promise.all([
          getSongs({ userId: user.id }),
          getVideos({ userId: user.id }),
          getUserPayments(user.id),
          getUserSubscriptions(user.id),
          getUserNominations(user.id),
          getUserVotes(user.id),
          getUserNotifications(user.id),
        ]);
        setSongs(s); setVideos(v); setPayments(p);
        setSubscriptions(sub); setNominations(nom); setVotes(vot); setNotifications(notif);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  const activeSub = subscriptions.find(s => s.is_active);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadFile('avatars', `${user.id}/avatar.${avatarFile.name.split('.').pop()}`, avatarFile);
      }
      await updateProfile(user.id, { display_name: displayName, bio, avatar_url: avatarUrl || undefined });
      await refreshProfile();
      toast.success('Profile updated');
      setEditDialog(false);
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const openEditProfile = () => {
    setDisplayName(profile?.display_name || '');
    setBio(profile?.bio || '');
    setEditDialog(true);
  };

  const handleDeleteSong = async (id: string) => {
    if (!confirm('Delete this song?')) return;
    try { await deleteSong(id); setSongs(prev => prev.filter(s => s.id !== id)); toast.success('Song deleted'); }
    catch { toast.error('Failed to delete song'); }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Delete this video?')) return;
    try { await deleteVideo(id); setVideos(prev => prev.filter(v => v.id !== id)); toast.success('Video deleted'); }
    catch { toast.error('Failed to delete video'); }
  };

  const handleEditSong = async () => {
    if (!editSong) return;
    setEditLoading(true);
    try {
      await supabase.from('songs').update({ title: editSongTitle, artist_name: editSongArtist }).eq('id', editSong.id);
      setSongs(prev => prev.map(s => s.id === editSong.id ? { ...s, title: editSongTitle, artist_name: editSongArtist } : s));
      toast.success('Song updated');
      setEditSong(null);
    } catch { toast.error('Failed to update song'); }
    finally { setEditLoading(false); }
  };

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    if (status === 'rejected') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <Clock className="h-3.5 w-3.5 text-yellow-600" />;
  };

  return (
    <div className="min-h-screen pt-20 pb-24 lg:pb-6">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <BackToHome />
        {/* Profile header */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xl font-bold bg-accent text-accent-foreground">
              {(profile?.display_name || profile?.username || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{profile?.display_name || profile?.username || 'User'}</h1>
            <p className="text-sm text-muted-foreground truncate">@{profile?.username}</p>
            {profile?.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={openEditProfile} className="shrink-0">
            <Pencil className="h-4 w-4 mr-1.5" />Edit
          </Button>
        </div>

        {/* Active plan */}
        {activeSub && (
          <Card className="mb-6 border-accent/30 bg-accent/5">
            <CardContent className="py-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activeSub.upload_plans?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeSub.plan_type === 'k10_single'
                    ? `${1 - (activeSub.uploads_used || 0)} upload(s) remaining`
                    : `Unlimited${activeSub.expires_at ? ` · Expires ${formatDate(activeSub.expires_at)}` : ''}`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/upload')}>
                <Upload className="h-4 w-4 mr-1" />Upload
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="music">
          <TabsList className="flex flex-wrap gap-1 h-auto mb-6 bg-transparent border border-border rounded-lg p-1">
            {[
              { value: 'music', icon: Music2, label: 'Music', count: songs.length },
              { value: 'videos', icon: Video, label: 'Videos', count: videos.length },
              { value: 'earnings', icon: TrendingUp, label: 'Earnings', count: undefined },
              { value: 'payments', icon: CreditCard, label: 'Payments', count: payments.length },
              { value: 'awards', icon: Trophy, label: 'Awards', count: nominations.length },
              { value: 'notifications', icon: Bell, label: 'Notifications', count: unreadCount || undefined },
            ].map(({ value, icon: Icon, label, count }) => (
              <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />{label}
                {count !== undefined && count > 0 && (
                  <span className="text-[10px] bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 leading-none">{count}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* My Music */}
          <TabsContent value="music">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">My Music ({songs.length})</h2>
              <Button size="sm" onClick={() => navigate('/upload')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Upload className="h-3.5 w-3.5 mr-1" />Upload
              </Button>
            </div>
            {loading ? <Skeleton className="h-32 rounded-lg" /> :
              songs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                  <Music2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No music uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {songs.map(song => (
                    <div key={song.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className="h-10 w-10 rounded bg-muted shrink-0 overflow-hidden">
                        {song.cover_url ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music2 className="h-4 w-4 text-muted-foreground/50" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist_name}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">{statusIcon(song.status)}<span className="text-xs capitalize hidden sm:inline">{song.status}</span></div>
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => { setEditSong(song); setEditSongTitle(song.title); setEditSongArtist(song.artist_name); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSong(song.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </TabsContent>

          {/* My Videos */}
          <TabsContent value="videos">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">My Videos ({videos.length})</h2>
              <Button size="sm" onClick={() => navigate('/upload')} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Upload className="h-3.5 w-3.5 mr-1" />Upload
              </Button>
            </div>
            {loading ? <Skeleton className="h-32 rounded-lg" /> :
              videos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                  <Video className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No videos uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {videos.map(video => (
                    <div key={video.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className="h-10 w-16 rounded bg-muted shrink-0 overflow-hidden">
                        {video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video className="h-4 w-4 text-muted-foreground/50" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        <p className="text-xs text-muted-foreground">{video.view_count} views</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">{statusIcon(video.status)}</div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteVideo(video.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </TabsContent>

          {/* Get Paid Over Streams — coming soon */}
          <TabsContent value="earnings">
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                <h2 className="text-base font-bold">Get Paid Over Streams</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Earn money every time your music or video is played on ZedVevo. Stream royalties are coming soon for all verified artists.
                </p>
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-1.5">
                  <Lock className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-semibold text-accent">Coming Soon</span>
                </div>
              </div>

              {/* Teaser stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Plays', value: songs.reduce((a, s) => a + (s.play_count || 0), 0).toLocaleString(), icon: BarChart2 },
                  { label: 'Total Likes', value: songs.reduce((a, s) => a + (s.like_count || 0), 0).toLocaleString(), icon: TrendingUp },
                  { label: 'Downloads', value: songs.reduce((a, s) => a + (s.download_count || 0), 0).toLocaleString(), icon: CreditCard },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-muted rounded-lg p-3 text-center">
                    <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm font-bold">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                Keep uploading quality content — your stream count today determines your payout when earnings launch.
              </p>
            </div>
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments">
            <h2 className="text-sm font-semibold mb-3">Payment History</h2>
            {loading ? <Skeleton className="h-32 rounded-lg" /> :
              payments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No payments yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map(pmt => (
                    <div key={pmt.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium capitalize">{pmt.payment_type.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(pmt.created_at)} · {pmt.payment_method.replace('_', ' ')}</p>
                          {pmt.failure_reason && <p className="text-xs text-destructive mt-0.5">{pmt.failure_reason}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-semibold">{formatCurrency(pmt.amount)}</p>
                          <p className={`text-xs font-medium ${getPaymentStatusColor(pmt.status)}`}>{getPaymentStatusLabel(pmt.status)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </TabsContent>

          {/* Awards */}
          <TabsContent value="awards">
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold mb-3">My Nominations ({nominations.length})</h2>
                {nominations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                    <Trophy className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No nominations yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nominations.map(nom => (
                      <div key={nom.id} className="p-3 border border-border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{nom.name}</p>
                          <p className="text-xs text-muted-foreground">{(nom.award_categories as { name: string; awards?: { name: string } } | null)?.name} · {(nom.award_categories as { name: string; awards?: { name: string } } | null)?.awards?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{nom.total_votes} votes</p>
                          <Badge variant={nom.registration_status === 'successful' ? 'default' : 'secondary'} className="text-[10px]">
                            {nom.registration_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold mb-3">My Votes ({votes.length})</h2>
                {votes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                    <p className="text-sm">No votes cast yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {votes.map(vote => (
                      <div key={vote.id} className="p-3 border border-border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{(vote.nominees as { name: string } | null)?.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(vote.created_at)} · {vote.vote_count} vote(s)</p>
                        </div>
                        <p className="text-sm font-semibold">{formatCurrency(vote.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <h2 className="text-sm font-semibold mb-3">Notifications</h2>
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${notif.is_read ? 'border-border bg-transparent' : 'border-accent/30 bg-accent/5'}`}
                    onClick={() => { if (!notif.is_read) { markNotificationRead(notif.id); setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)); } }}
                  >
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(notif.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Display Name</Label>
              <Input className="mt-1" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label>Bio</Label>
              <Input className="mt-1" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself" />
            </div>
            <div>
              <Label>Avatar Photo</Label>
              <Input type="file" accept="image/*" className="mt-1 cursor-pointer" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleSaveProfile} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Song Dialog */}
      <Dialog open={!!editSong} onOpenChange={open => !open && setEditSong(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Edit Song</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Title</Label>
              <Input className="mt-1" value={editSongTitle} onChange={e => setEditSongTitle(e.target.value)} />
            </div>
            <div>
              <Label>Artist Name</Label>
              <Input className="mt-1" value={editSongArtist} onChange={e => setEditSongArtist(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSong(null)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleEditSong} disabled={editLoading}>
              {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
