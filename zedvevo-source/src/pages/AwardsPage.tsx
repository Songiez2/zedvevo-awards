import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy, Loader2, Search, Share2, ExternalLink,
  Facebook, Twitter, Instagram, Linkedin, Users, Star, Vote, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Award, Nominee } from '@/types/index';
import { getActiveAwards, getNomineesByCategory, getSettings } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { generateIdempotencyKey, formatCurrency } from '@/lib/utils';
import { useVisitorTracking } from '@/hooks/use-visitor-tracking';
import { useOgMeta } from '@/hooks/use-og-meta';
import ShareSheet from '@/components/common/ShareSheet';
import { useSearchParams } from 'react-router-dom';

/* ─── helpers ─────────────────────────────────────────────────────────── */
function parseSocialLinks(raw?: string): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/* ─── component ───────────────────────────────────────────────────────── */
export default function AwardsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [awards, setAwards] = useState<Award[]>([]);
  const [nominees, setNominees] = useState<Record<string, Nominee[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');

  // Nominee profile modal
  const [profileNominee, setProfileNominee] = useState<Nominee | null>(null);
  const [shareNominee, setShareNominee] = useState<Nominee | null>(null);

  // Nomination dialog
  const [nomDialog, setNomDialog] = useState(false);
  const [nomAwardId, setNomAwardId] = useState('');
  const [nomCategoryId, setNomCategoryId] = useState('');
  const [nomName, setNomName] = useState('');
  const [nomPhone, setNomPhone] = useState('');
  const [nomBio, setNomBio] = useState('');
  const [nomSongTitle, setNomSongTitle] = useState('');
  const [nomPayMethod, setNomPayMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [nomLoading, setNomLoading] = useState(false);

  // Vote dialog
  const [voteDialog, setVoteDialog] = useState(false);
  const [voteNominee, setVoteNominee] = useState<Nominee | null>(null);
  const [voteAmount, setVoteAmount] = useState('');
  const [votePhone, setVotePhone] = useState('');
  const [votePayMethod, setVotePayMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [voteLoading, setVoteLoading] = useState(false);

  // Visitor tracking (realtime)
  const { todayCount } = useVisitorTracking('/awards');

  // OG meta — deep-link to a specific nominee via ?nominee=ID
  const focusNomineeId = searchParams.get('nominee');
  const focusNominee = useMemo(() => {
    if (!focusNomineeId) return null;
    return Object.values(nominees).flat().find(n => n.id === focusNomineeId) ?? null;
  }, [focusNomineeId, nominees]);

  // Always call useOgMeta unconditionally — derive values from state
  const ogTitle = focusNominee
    ? `${focusNominee.name} — ZedVevo Awards Nominee`
    : 'ZedVevo Awards — Vote for Your Favourite Artists';
  const ogDescription = focusNominee
    ? (focusNominee.bio
        ? `${focusNominee.bio.slice(0, 140)}…`
        : `Vote for ${focusNominee.name} at the ZedVevo Awards — Zambia's premier music awards.`)
    : 'Cast your vote for the best Zambian artists at the ZedVevo Awards.';
  const ogImage = focusNominee?.photo_url ?? undefined;
  const ogUrl = focusNominee
    ? `${window.location.origin}/awards?nominee=${focusNominee.id}`
    : `${window.location.origin}/awards`;
  const ogType = focusNominee ? 'profile' : 'website';

  useOgMeta({ title: ogTitle, description: ogDescription, imageUrl: ogImage, pageUrl: ogUrl, type: ogType as 'profile' | 'website' });

  // Auto-open profile modal when ?nominee=ID is in URL (social share deep-link)
  useEffect(() => {
    if (focusNominee) setProfileNominee(focusNominee);
  }, [focusNominee]);

  // Load nominees for a given award's categories
  const loadNomineesForAward = useCallback(async (award: Award) => {
    const cats = award.award_categories || [];
    await Promise.all(cats.map(async cat => {
      const data = await getNomineesByCategory(cat.id);
      setNominees(prev => ({ ...prev, [cat.id]: data }));
    }));
  }, []);

  // Load awards + settings
  useEffect(() => {
    Promise.all([getActiveAwards(), getSettings()])
      .then(([aw, s]) => {
        setAwards(aw);
        setSettings(s);
        if (aw.length > 0) {
          setSelectedAward(aw[0]);
          loadNomineesForAward(aw[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadNomineesForAward]);

  // Reload nominees for selected award when it changes
  useEffect(() => {
    if (!selectedAward) return;
    loadNomineesForAward(selectedAward);
  }, [selectedAward, loadNomineesForAward]);

  // ── Realtime: auto-refresh nominees when webhook inserts a new one ──────────
  useEffect(() => {
    const channel = supabase
      .channel('awards-nominees-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'nominees' },
        async (payload) => {
          console.log('[AwardsPage] nominee change:', payload.eventType);
          // Refresh nominees for the affected category
          const affected = payload.new as Nominee | null;
          const categoryId = affected?.category_id;
          if (categoryId) {
            const data = await getNomineesByCategory(categoryId);
            setNominees(prev => ({ ...prev, [categoryId]: data }));
            // Also update profileNominee if open
            setProfileNominee(prev => {
              if (prev?.id === affected?.id) return { ...prev, ...affected } as Nominee;
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Manual refresh
  const handleRefresh = async () => {
    if (!selectedAward) return;
    setRefreshing(true);
    try { await loadNomineesForAward(selectedAward); }
    finally { setRefreshing(false); }
  };

  const allCategories = useMemo(() =>
    awards.flatMap(aw =>
      (aw.award_categories || []).map(cat => ({ ...cat, awardName: aw.name, awardId: aw.id }))
    ), [awards]);

  const nomCategories = useMemo(
    () => allCategories.filter(c => c.awardId === nomAwardId),
    [allCategories, nomAwardId]
  );

  const handleNomAwardChange = (awardId: string) => { setNomAwardId(awardId); setNomCategoryId(''); };

  const nomineeFee = parseFloat(settings.nominee_fee || '25');
  const voteMin    = parseFloat(settings.vote_min_amount || '5');

  // Filtered nominees for the selected award
  const filteredCategories = useMemo(() => {
    if (!selectedAward) return [];
    return (selectedAward.award_categories || []).filter(cat =>
      filterCat === 'all' || cat.id === filterCat
    ).map(cat => {
      const raw = nominees[cat.id] || [];
      const filtered = search
        ? raw.filter(n =>
            n.name.toLowerCase().includes(search.toLowerCase()) ||
            (n.song_title ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : raw;
      return { cat, nominees: filtered };
    }).filter(c => c.nominees.length > 0 || !search);
  }, [selectedAward, nominees, search, filterCat]);

  /* ── nomination payment ── */
  const handleNominate = async () => {
    if (!user) { toast.error('Sign in to register as a nominee'); return; }
    if (!nomAwardId)    { toast.error('Please select an award'); return; }
    if (!nomCategoryId) { toast.error('Please select a category'); return; }
    if (!nomName)       { toast.error('Please enter your name'); return; }
    if (nomPayMethod === 'mobile_money' && !nomPhone) { toast.error('Enter your phone number'); return; }
    setNomLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const { data, error } = await supabase.functions.invoke('lipila-payment', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: {
          amount: nomineeFee,
          payment_method: nomPayMethod,
          phone_number: nomPayMethod === 'mobile_money' ? nomPhone : undefined,
          description: `Nominee registration: ${nomName}`,
          idempotency_key: generateIdempotencyKey(),
          payment_type: 'nominee_registration',
          user_id: user.id,
          metadata: {
            award_id: nomAwardId,
            category_id: nomCategoryId,
            nominee_name: nomName,
            bio: nomBio || undefined,
            song_title: nomSongTitle || undefined,
            user_id: user.id,
          }
        }
      });
      if (data?.status === 'insufficient_funds') { toast.error('Insufficient funds.'); return; }
      if (data?.error) { toast.error(data.error); return; }
      if (error) { toast.error(error.message || 'Payment initiation failed.'); return; }
      toast.success('Payment initiated! Your nomination will appear once payment is confirmed and approved.');
      setNomDialog(false);
      setNomName(''); setNomPhone(''); setNomCategoryId(''); setNomAwardId(''); setNomBio(''); setNomSongTitle('');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to initiate payment');
    } finally { setNomLoading(false); }
  };

  /* ── vote payment ── */
  const handleVote = async () => {
    if (!user) { toast.error('Sign in to vote'); return; }
    if (!voteNominee) return;
    const amount = parseFloat(voteAmount);
    if (isNaN(amount) || amount < voteMin) { toast.error(`Minimum vote amount is ${formatCurrency(voteMin)}`); return; }
    if (votePayMethod === 'mobile_money' && !votePhone) { toast.error('Enter your phone number'); return; }
    setVoteLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const { data, error } = await supabase.functions.invoke('lipila-payment', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: {
          amount,
          payment_method: votePayMethod,
          phone_number: votePayMethod === 'mobile_money' ? votePhone : undefined,
          description: `Vote for ${voteNominee.name}`,
          idempotency_key: generateIdempotencyKey(),
          payment_type: 'vote',
          user_id: user.id,
          metadata: { nominee_id: voteNominee.id, category_id: voteNominee.category_id, user_id: user.id, vote_count: Math.floor(amount / voteMin) }
        }
      });
      if (data?.status === 'insufficient_funds') { toast.error('Insufficient funds.'); return; }
      if (data?.error) { toast.error(data.error); return; }
      if (error) { toast.error(error.message || 'Payment initiation failed.'); return; }
      if (data?.payment_url) window.open(data.payment_url, '_blank');
      toast.success(`Voting payment initiated! Your ${Math.floor(amount / voteMin)} vote(s) will be counted once payment is verified.`);
      setVoteDialog(false);
      setVoteAmount(''); setVotePhone('');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to initiate vote payment');
    } finally { setVoteLoading(false); }
  };

  /* ── share nominee ── */
  const handleShare = (nominee: Nominee) => {
    const url = `${window.location.origin}/awards?nominee=${nominee.id}`;
    setSearchParams({ nominee: nominee.id });
    setShareNominee(nominee);
    // Also try native share
    if (navigator.share) {
      navigator.share({ title: `Vote for ${nominee.name} — ZedVevo Awards`, text: `Support ${nominee.name} at the ZedVevo Awards! 🏆`, url })
        .catch(() => {}); // fallback to ShareSheet
    }
  };

  /* ── loading skeleton ── */
  if (loading) return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      </div>
    </div>
  );

  /* ── main render ── */
  return (
    <div className="min-h-screen pt-20 pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <BackToHome />

        {/* Page header */}
        <div className="py-6 border-b border-border mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
                <Trophy className="h-6 w-6 text-accent" /> ZedVevo Awards
              </h1>
              <p className="text-sm text-muted-foreground">Vote for your favourite nominees</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {/* Live visitor counter */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-full px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <Users className="h-3 w-3" />
                <span>{todayCount} today</span>
              </div>
              {/* Manual refresh */}
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {awards.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-semibold mb-2">No Active Awards</h2>
            <p className="text-sm text-muted-foreground">Awards will appear here when they go live.</p>
          </div>
        ) : (
          <>
            {/* Award tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
              {awards.map(award => (
                <button
                  key={award.id}
                  onClick={() => { setSelectedAward(award); setFilterCat('all'); setSearch(''); }}
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedAward?.id === award.id
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {award.name}
                </button>
              ))}
            </div>

            {selectedAward && (
              <div>
                {/* Award header + status badges + register button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-xl font-bold">{selectedAward.name}</h2>
                    {selectedAward.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{selectedAward.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Badge variant={selectedAward.voting_open ? 'default' : 'secondary'} className="text-xs">
                      {selectedAward.voting_open ? '🗳 Voting Open' : 'Voting Closed'}
                    </Badge>
                    <Badge variant={selectedAward.nominees_open ? 'default' : 'secondary'} className="text-xs">
                      {selectedAward.nominees_open ? '📋 Nominations Open' : 'Nominations Closed'}
                    </Badge>
                    {selectedAward.nominees_open && (
                      <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        onClick={() => { if (!user) { toast.error('Sign in to register as a nominee'); return; } setNomDialog(true); }}>
                        Register ({formatCurrency(nomineeFee)})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Search + category filter */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search nominees…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterCat} onValueChange={setFilterCat}>
                    <SelectTrigger className="md:w-56">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {(selectedAward.award_categories || []).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categories + nominee cards */}
                <div className="space-y-8">
                  {filteredCategories.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No approved nominees yet. Check back soon!</p>
                    </div>
                  )}
                  {filteredCategories.map(({ cat, nominees: catNominees }) => (
                    <div key={cat.id} className="border border-border rounded-xl overflow-hidden">
                      {/* Category header */}
                      <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">{cat.name}</h3>
                          {cat.grand_prize && (
                            <p className="text-xs text-accent mt-0.5 flex items-center gap-1">
                              <Star className="h-3 w-3" /> Prize: {cat.grand_prize}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{catNominees.length} nominees</span>
                      </div>

                      {catNominees.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No approved nominees yet in this category.
                        </div>
                      ) : (
                        /* Nominee cards grid */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:gap-3 sm:p-3">
                          {catNominees.map(nominee => (
                            <NomineeCard
                              key={nominee.id}
                              nominee={nominee}
                              votingOpen={!!selectedAward.voting_open}
                              user={user}
                              onView={() => setProfileNominee(nominee)}
                              onVote={() => { setVoteNominee(nominee); setVoteDialog(true); }}
                              onShare={() => handleShare(nominee)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Nominee Profile Modal ── */}
      {profileNominee && (() => {
        const social = parseSocialLinks(profileNominee.social_links);
        return (
          <Dialog open={!!profileNominee} onOpenChange={o => { if (!o) { setProfileNominee(null); setSearchParams({}); } }}>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader>
                <DialogTitle className="sr-only">Nominee Profile</DialogTitle>
              </DialogHeader>

              {/* Cover photo + avatar */}
              <div className="relative -mx-6 -mt-6 mb-4">
                <div className="h-28 bg-muted/60 rounded-t-lg overflow-hidden">
                  {profileNominee.photo_url && (
                    <img src={profileNominee.photo_url} alt="" className="w-full h-full object-cover opacity-30 blur-sm scale-110" />
                  )}
                </div>
                <div className="absolute -bottom-5 left-6">
                  <div className="h-16 w-16 rounded-full overflow-hidden ring-4 ring-background bg-muted">
                    {profileNominee.photo_url
                      ? <img src={profileNominee.photo_url} alt={profileNominee.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                          {profileNominee.name[0]}
                        </div>
                    }
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold">{profileNominee.name}</h2>
                  {profileNominee.is_winner && (
                    <Badge className="bg-accent text-accent-foreground text-xs">🏆 Winner</Badge>
                  )}
                </div>

                {/* Votes */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-accent" />
                  <span><strong className="text-foreground">{profileNominee.total_votes.toLocaleString()}</strong> votes</span>
                </div>

                {profileNominee.song_title && (
                  <p className="text-sm text-muted-foreground">🎵 <span className="text-foreground">{profileNominee.song_title}</span></p>
                )}

                {profileNominee.bio && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">About</p>
                    <p className="text-sm leading-relaxed">{profileNominee.bio}</p>
                  </div>
                )}

                {profileNominee.achievements && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Achievements</p>
                    <p className="text-sm leading-relaxed">{profileNominee.achievements}</p>
                  </div>
                )}

                {Object.keys(social).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Social</p>
                    <div className="flex gap-2 flex-wrap">
                      {social.facebook && (
                        <a href={social.facebook} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors">
                          <Facebook className="h-3.5 w-3.5 text-[#1877F2]" /> Facebook
                        </a>
                      )}
                      {social.twitter && (
                        <a href={social.twitter} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors">
                          <Twitter className="h-3.5 w-3.5" /> Twitter / X
                        </a>
                      )}
                      {social.instagram && (
                        <a href={social.instagram} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors">
                          <Instagram className="h-3.5 w-3.5 text-pink-500" /> Instagram
                        </a>
                      )}
                      {social.linkedin && (
                        <a href={social.linkedin} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors">
                          <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {profileNominee.song_url && (
                  <a href={profileNominee.song_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-accent hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> Listen to nominated song
                  </a>
                )}
              </div>

              <DialogFooter className="gap-2 flex-row mt-2">
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => {
                    handleShare(profileNominee);
                    setProfileNominee(null);
                  }}>
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
                {(profileNominee.nomination_status === 'approved' || profileNominee.nomination_status === 'winner') &&
                  selectedAward?.voting_open && (
                  <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5"
                    onClick={() => {
                      if (!user) { toast.error('Sign in to vote'); return; }
                      setVoteNominee(profileNominee);
                      setProfileNominee(null);
                      setVoteDialog(true);
                    }}>
                    <Vote className="h-3.5 w-3.5" /> Vote for {profileNominee.name}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Nominee Share Sheet ── */}
      {shareNominee && (
        <ShareSheet
          open={!!shareNominee}
          onClose={() => { setShareNominee(null); setSearchParams({}); }}
          url={`${window.location.origin}/awards?nominee=${shareNominee.id}`}
          title={`${shareNominee.name} — ZedVevo Awards`}
          text={`Vote for ${shareNominee.name} at the ZedVevo Awards! 🏆`}
          thumbnailUrl={shareNominee.photo_url ?? undefined}
          embedId={shareNominee.id}
          embedType="nominee"
        />
      )}

      {/* ── Nomination Dialog ── */}
      <Dialog open={nomDialog} onOpenChange={(open) => {
        setNomDialog(open);
        if (!open) { setNomName(''); setNomPhone(''); setNomCategoryId(''); setNomAwardId(''); setNomBio(''); setNomSongTitle(''); }
      }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register as Nominee</DialogTitle>
            <DialogDescription>
              Registration fee: <strong>{formatCurrency(nomineeFee)}</strong>. Confirmed after successful payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Award *</Label>
              <Select value={nomAwardId} onValueChange={handleNomAwardChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select award" /></SelectTrigger>
                <SelectContent>
                  {awards.filter(a => a.nominees_open).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={nomCategoryId} onValueChange={setNomCategoryId} disabled={!nomAwardId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {nomCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Your Name / Artist Name *</Label>
              <Input className="mt-1" value={nomName} onChange={e => setNomName(e.target.value)} placeholder="Stage name or real name" />
            </div>
            <div>
              <Label>Bio / Description</Label>
              <Input className="mt-1" value={nomBio} onChange={e => setNomBio(e.target.value)} placeholder="Short description about yourself" />
            </div>
            <div>
              <Label>Nominated Song / Work</Label>
              <Input className="mt-1" value={nomSongTitle} onChange={e => setNomSongTitle(e.target.value)} placeholder="Song or work title" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={nomPayMethod} onValueChange={v => setNomPayMethod(v as typeof nomPayMethod)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {nomPayMethod === 'mobile_money' && (
              <div>
                <Label>Phone Number *</Label>
                <Input className="mt-1" value={nomPhone} onChange={e => setNomPhone(e.target.value)} placeholder="e.g. 0977123456" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNomDialog(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleNominate} disabled={nomLoading}>
              {nomLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Pay {formatCurrency(nomineeFee)} & Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Vote Dialog ── */}
      <Dialog open={voteDialog} onOpenChange={open => { setVoteDialog(open); if (!open) { setVoteAmount(''); setVotePhone(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="h-4 w-4 text-accent" />
              Vote for {voteNominee?.name}
            </DialogTitle>
            <DialogDescription>
              Minimum {formatCurrency(voteMin)} = 1 vote. More you pay, more votes you give!
            </DialogDescription>
          </DialogHeader>

          {voteNominee && (
            <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                {voteNominee.photo_url
                  ? <img src={voteNominee.photo_url} alt={voteNominee.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">{voteNominee.name[0]}</div>
                }
              </div>
              <div>
                <p className="text-sm font-semibold">{voteNominee.name}</p>
                <p className="text-xs text-muted-foreground">{voteNominee.total_votes.toLocaleString()} current votes</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label>Vote Amount (ZMW) *</Label>
              <Input
                type="number"
                className="mt-1"
                value={voteAmount}
                onChange={e => setVoteAmount(e.target.value)}
                placeholder={`Min ${formatCurrency(voteMin)}`}
              />
              {voteAmount && !isNaN(parseFloat(voteAmount)) && parseFloat(voteAmount) >= voteMin && (
                <p className="text-xs text-accent mt-1">
                  = {Math.floor(parseFloat(voteAmount) / voteMin)} vote(s) for {voteNominee?.name}
                </p>
              )}
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={votePayMethod} onValueChange={v => setVotePayMethod(v as typeof votePayMethod)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {votePayMethod === 'mobile_money' && (
              <div>
                <Label>Phone Number *</Label>
                <Input className="mt-1" value={votePhone} onChange={e => setVotePhone(e.target.value)} placeholder="e.g. 0977123456" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialog(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5" onClick={handleVote} disabled={voteLoading}>
              {voteLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Vote className="h-4 w-4" />
              }
              {voteAmount && !isNaN(parseFloat(voteAmount)) && parseFloat(voteAmount) >= voteMin
                ? `Cast ${Math.floor(parseFloat(voteAmount) / voteMin)} Vote(s)`
                : 'Cast Votes'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── NomineeCard sub-component ──────────────────────────────────────── */
interface NomineeCardProps {
  nominee: Nominee;
  votingOpen: boolean;
  user: { id: string } | null;
  onView: () => void;
  onVote: () => void;
  onShare: () => void;
}

function NomineeCard({ nominee, votingOpen, user, onView, onVote, onShare }: NomineeCardProps) {
  const canVote = (nominee.nomination_status === 'approved' || nominee.nomination_status === 'winner') && votingOpen;

  return (
    <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* Photo */}
      <button onClick={onView} className="relative aspect-square w-full overflow-hidden bg-muted">
        {nominee.photo_url
          ? <img src={nominee.photo_url} alt={nominee.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/40">{nominee.name[0]}</span>
            </div>
        }
        {nominee.is_winner && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-accent text-accent-foreground text-[10px] gap-1">🏆 Winner</Badge>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <button onClick={onView} className="text-left">
          <p className="font-semibold text-sm leading-tight truncate hover:text-accent transition-colors">{nominee.name}</p>
          {nominee.song_title && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{nominee.song_title}</p>
          )}
        </button>

        {/* Vote count */}
        <div className="flex items-center gap-1 mt-2 mb-3">
          <Star className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-sm font-bold">{nominee.total_votes.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">votes</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-auto">
          {/* Share button — always visible */}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={onShare}
          >
            <Share2 className="h-3 w-3" />
            Share
          </Button>

          {/* Vote button */}
          {canVote ? (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5"
              onClick={() => {
                if (!user) { toast.error('Sign in to vote'); return; }
                onVote();
              }}
            >
              <Vote className="h-3 w-3" />
              Vote
            </Button>
          ) : !votingOpen ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">Voting closed</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
