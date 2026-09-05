import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/index';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isArtist: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string, displayName?: string) => Promise<void>;
  /** @deprecated kept for any remaining callers — maps to signInWithEmail */
  signInWithUsername: (usernameOrEmail: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const noop = async () => {};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isArtist: false,
  isAdmin: false,
  isSuperAdmin: false,
  signInWithEmail: noop,
  signUpWithEmail: noop,
  signInWithUsername: noop,
  signOut: noop,
  refreshProfile: noop,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    // Safety timeout: never stay in loading state longer than 5s
    const timeout = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) getProfile(session.user.id).then(setProfile);
      })
      .catch(error => {
        console.error('[AuthContext] getSession failed:', error);
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    // Do NOT use await inside onAuthStateChange – use .then() to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    // Realtime: watch for profile row changes (e.g. role promoted to 'artist' by webhook)
    // so the UI updates immediately without requiring a manual page refresh.
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid) return;
      profileChannel = supabase
        .channel(`profile_watch_${uid}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
          () => { getProfile(uid).then(setProfile); }
        )
        .subscribe();
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, []);

  // Sign in directly with real email
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
  };

  // Register with real Gmail / any email
  const signUpWithEmail = async (
    email: string,
    password: string,
    username: string,
    displayName?: string,
  ) => {
    const authEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({ email: authEmail, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username.toLowerCase(),
        display_name: displayName || username,
        email: authEmail,
        role: 'user',
      }, { onConflict: 'id' });
    }
  };

  // Backward-compat shim: if caller passes a bare username (no @) we still work
  const signInWithUsername = async (usernameOrEmail: string, password: string) => {
    const email = usernameOrEmail.includes('@')
      ? usernameOrEmail.trim().toLowerCase()
      : `${usernameOrEmail.toLowerCase()}@zedvevo.app`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isArtist = profile?.role === 'artist' || profile?.role === 'admin' || profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isArtist, isAdmin, isSuperAdmin, signInWithEmail, signUpWithEmail, signInWithUsername, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
