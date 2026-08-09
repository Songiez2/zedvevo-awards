import { useEffect, useState } from 'react';
import { Search, KeyRound, ShieldCheck, ShieldOff, Eye, EyeOff, Loader2, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { getAllProfiles, updateProfile } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Profile, UserRole } from '@/types/index';

export default function AdminUsersPage() {
  const { profile: myProfile, user } = useAuth();
  const isSuperAdmin = myProfile?.role === 'super_admin';

  const [users, setUsers]     = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Reset password dialog
  const [resetDialog, setResetDialog]       = useState(false);
  const [resetTarget, setResetTarget]       = useState<Profile | null>(null);
  const [resetPw, setResetPw]               = useState('');
  const [resetPwConfirm, setResetPwConfirm] = useState('');
  const [resetPwShow, setResetPwShow]       = useState(false);
  const [resetLoading, setResetLoading]     = useState(false);

  // Role dialog
  const [roleDialog, setRoleDialog]   = useState(false);
  const [roleTarget, setRoleTarget]   = useState<Profile | null>(null);
  const [newRole, setNewRole]         = useState<UserRole>('user');
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    getAllProfiles()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q);
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openResetDialog = (u: Profile) => {
    setResetTarget(u); setResetPw(''); setResetPwConfirm(''); setResetPwShow(false); setResetDialog(true);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (!resetPw)               { toast.error('Enter a new password'); return; }
    if (resetPw.length < 8)     { toast.error('Password must be at least 8 characters'); return; }
    if (resetPw !== resetPwConfirm) { toast.error('Passwords do not match'); return; }
    setResetLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: { user_id: resetTarget.id, new_password: resetPw },
      });
      if (error || data?.error) { toast.error(data?.error || error?.message || 'Reset failed'); return; }
      toast.success(`Password reset for ${resetTarget.username || resetTarget.email}`);
      setResetDialog(false);
    } catch (e: unknown) { toast.error((e as Error).message || 'Reset failed'); }
    finally { setResetLoading(false); }
  };

  const openRoleDialog = (u: Profile) => {
    setRoleTarget(u); setNewRole(u.role); setRoleDialog(true);
  };

  const handleChangeRole = async () => {
    if (!roleTarget) return;
    setRoleLoading(true);
    try {
      await updateProfile(roleTarget.id, { role: newRole });
      setUsers(prev => prev.map(u => u.id === roleTarget.id ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
      setRoleDialog(false);
    } catch { toast.error('Failed to update role'); }
    finally { setRoleLoading(false); }
  };

  const promoteToArtist = async (target: Profile) => {
    if (target.role !== 'user') return;
    if (!window.confirm(`Promote ${target.username || target.email || 'this user'} to Artist?`)) return;
    try {
      await updateProfile(target.id, { role: 'artist' });
      const { data: artist, error: artistLookupError } = await supabase
        .from('artists').select('id').eq('user_id', target.id).maybeSingle();
      if (artistLookupError) throw artistLookupError;
      if (!artist) {
        const { error } = await supabase.from('artists').insert({
          user_id: target.id,
          name: target.display_name || target.username || 'ZedVevo Artist',
        });
        if (error) throw error;
      }
      await supabase.from('notifications').insert({
        user_id: target.id,
        title: 'Artist Account Activated',
        message: 'An administrator has promoted your account to Artist. You can now access artist uploads.',
        type: 'success',
        notification_type: 'artist_promoted',
      });
      setUsers(prev => prev.map(u => u.id === target.id ? { ...u, role: 'artist' } : u));
      toast.success('User promoted to Artist');
    } catch (error) {
      console.error('Artist promotion failed:', error);
      toast.error('Could not promote this user to Artist');
    }
  };

  const roleBadge = (role: string) => {
    if (role === 'super_admin') return <Badge className="text-[10px] bg-accent text-accent-foreground">Super Admin</Badge>;
    if (role === 'admin')       return <Badge className="text-[10px]">Admin</Badge>;
    if (role === 'artist')      return <Badge className="text-[10px] bg-violet-600">Artist</Badge>;
    return <Badge variant="secondary" className="text-[10px]">User</Badge>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">{users.length} registered accounts</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by username, email, name…" className="pl-9 h-8 text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="artist">Artist</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              {['Username', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={5} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-muted-foreground text-xs">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-2.5 px-3 whitespace-nowrap font-medium">{u.username || '—'}</td>
                <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-xs">{u.email || '—'}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">{roleBadge(u.role)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <div className="flex gap-1.5">
                    {(myProfile?.role === 'admin' || isSuperAdmin) && u.role === 'user' && u.id !== user?.id && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => promoteToArtist(u)}>
                        <UserCog className="h-3 w-3" /> Promote to Artist
                      </Button>
                    )}
                    {/* Role management — super_admin only, can't change own role */}
                    {isSuperAdmin && u.id !== user?.id && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openRoleDialog(u)}>
                        <UserCog className="h-3 w-3" />
                        Role
                      </Button>
                    )}
                    {/* Reset password — super_admin only, not own account */}
                    {isSuperAdmin && u.id !== user?.id && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openResetDialog(u)}>
                        <KeyRound className="h-3 w-3" />
                        Reset PW
                      </Button>
                    )}
                    {/* Promote/demote quick actions for admins */}
                    {!isSuperAdmin && myProfile?.role === 'admin' && u.role === 'user' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={async () => {
                          await updateProfile(u.id, { role: 'admin' });
                          setUsers(p => p.map(x => x.id === u.id ? { ...x, role: 'admin' } : x));
                          toast.success('Promoted to Admin');
                        }}>
                        <ShieldCheck className="h-3 w-3" /> Promote
                      </Button>
                    )}
                    {!isSuperAdmin && myProfile?.role === 'admin' && u.role === 'admin' && u.id !== user?.id && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive"
                        onClick={async () => {
                          await updateProfile(u.id, { role: 'user' });
                          setUsers(p => p.map(x => x.id === u.id ? { ...x, role: 'user' } : x));
                          toast.success('Demoted to User');
                        }}>
                        <ShieldOff className="h-3 w-3" /> Demote
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" />Reset Password</DialogTitle>
            <DialogDescription>Set a new password for <strong>{resetTarget?.username || resetTarget?.email}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label>New Password</Label>
              <div className="relative mt-1">
                <Input type={resetPwShow ? 'text' : 'password'} className="pr-10" placeholder="Min. 8 characters"
                  value={resetPw} onChange={e => setResetPw(e.target.value)} />
                <button type="button" onClick={() => setResetPwShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {resetPwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <Input type={resetPwShow ? 'text' : 'password'} className="mt-1" placeholder="Re-enter password"
                value={resetPwConfirm} onChange={e => setResetPwConfirm(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleResetPassword} disabled={resetLoading}>
              {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="h-4 w-4" />Change Role</DialogTitle>
            <DialogDescription>Update role for <strong>{roleTarget?.username || roleTarget?.email}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Role</Label>
            <Select value={newRole} onValueChange={v => setNewRole(v as UserRole)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="artist">Artist</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleChangeRole} disabled={roleLoading}>
              {roleLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
