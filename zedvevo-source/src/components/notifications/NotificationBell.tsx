import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/contexts/AuthContext';
import {
  getUserNotifications, markNotificationRead, deleteNotification,
  markAllNotificationsRead, getUnreadNotificationCount
} from '@/lib/api';
import type { Notification } from '@/types/index';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

const typeIcon: Record<string, string> = {
  award_winner: '🏆', winner_of_month: '⭐', weekly_trending: '📈',
  new_award: '🎖️', voting_open: '🗳️', voting_closing: '⏰',
  nomination_approved: '✅', nomination_rejected: '❌',
  payment_success: '💰', payment_failed: '❗', package_expiry: '📦',
  general: 'ℹ️',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [n, c] = await Promise.all([
        getUserNotifications(user.id),
        getUnreadNotificationCount(user.id),
      ]);
      setNotifications(n);
      setUnread(c);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && user) {
      await load();
      // Immediately clear badge count when panel is opened
      if (unread > 0) {
        setUnread(0);
        markAllNotificationsRead(user.id).catch(() => {});
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    }
  };

  const handleMarkRead = async (n: Notification) => {
    if (n.is_read) return;
    await markNotificationRead(n.id);
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    setUnread(c => Math.max(0, c - 1));
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
    const deleted = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (deleted && !deleted.is_read) setUnread(c => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <Bell className={cn('h-5 w-5 transition-transform', open && 'scale-110', unread > 0 && 'animate-[wiggle_1s_ease-in-out_infinite]')} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 z-[200] bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-accent hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0',
                    !n.is_read && 'bg-accent/5'
                  )}
                  onClick={() => handleMarkRead(n)}
                >
                  <span className="text-lg shrink-0 mt-0.5" aria-hidden>
                    {typeIcon[n.notification_type] ?? typeIcon.general}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-snug', !n.is_read && 'font-semibold')}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(n.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1.5" />
                    )}
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      className="text-muted-foreground/40 hover:text-destructive text-xs leading-none mt-auto"
                      aria-label="Delete notification"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
