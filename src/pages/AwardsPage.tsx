import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Trophy, Loader2, Search, Share2, ExternalLink,
  Facebook, Twitter, Instagram, Linkedin, Users, Star, Vote, RefreshCw,
  Camera, X as XIcon
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
  const [nomContactEmail, setNomContactEmail] = useState('');
  const [nomPayMethod, setNomPayMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [nomLoading, setNomLoading] = useState(false);
  // Photo upload for nomination
  const [nomPhoto, setNomPhoto] = useState<File | null>(null);
  const [nomPhotoPreview, setNomPhotoPreview] = useState<string | null>(null);
  const [nomPhotoUploading, setNomPhotoUploading] = useState(false);
  const nomPhotoInputRef = useRef<HTMLInputElement>(null);

  // Vote dialog
  const [voteDialog, setVoteDialog] = useState(false);
  const [voteNominee, setVoteNominee] = useState<Nominee | null>(null);
  const [voteCount, setVoteCount] = useState(1);
  const [votePhone, setVotePhone] = useState('');
  const [votePayMethod, setVotePayMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [voteLoading, setVoteLoading] = useState(false);
  // payment status tracking after submit
  const [votePaymentId, setVotePaymentId] = useState<string | null>(null);
  const [votePayStatus, setVotePayStatus] = useState<'idle'|'pending'|'checking'|'successful'|'failed'|'insufficient_funds'|'cancelled'>('idle');
  const voteIdempotencyKey = useRef<string>('');

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
    ? `${window.location.origin}/nominee/${focusNominee.id}`
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

  // ── Realtime: auto-refresh nominees when votes/nominees/payments change ─────
  // Deps: selectedAward + loadNomineesForAward only — no nominees state in closure
  // to avoid stale-closure bugs where nominee lookup silently fails.
  useEffect(() => {
    const channel = supabase
      .channel('awards-nominees-realtime')
      // nominees UPDATE fires the instant handle_vote_approval_change increments
      // total_votes — this is the primary real-time vote count path.
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'nominees' },
        async (payload) => {
          const affected = payload.new as Nominee | null;
          const categoryId = affected?.category_id;
          if (!categoryId) return;
          const data = await getNomineesByCategory(categoryId);
          setNominees(prev => ({ ...prev, [categoryId]: data }));
          setProfileNominee(prev => {
            if (prev?.id === affected?.id) return { ...prev, ...affected } as Nominee;
            return prev;
          });
        }
      )
      // nominees INSERT — new nominee registered
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'nominees' },
        async (payload) => {
          const affected = payload.new as Nominee | null;
          const categoryId = affected?.category_id;
          if (!categoryId) return;
          const data = await getNomineesByCategory(categoryId);
          setNominees(prev => ({ ...prev, [categoryId]: data }));
        }
      )
      // votes INSERT/UPDATE — also carries category_id directly in payload
      // so we don't need to look up from stale nominees state
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        async (payload) => {
          const vote = (payload.new ?? payload.old) as { nominee_id?: string; category_id?: string } | null;
          // category_id is on the votes row — use it directly, no closure lookup needed
          const categoryId = vote?.category_id;
          if (!categoryId) return;
          const data = await getNomineesByCategory(categoryId);
          setNominees(prev => ({ ...prev, [categoryId]: data }));
        }
      )
      // payments UPDATE — drive vote dialog state + reload on success
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments' },
        async (payload) => {
          const pmt = payload.new as { id?: string; status?: string; payment_type?: string } | null;
          if (!pmt?.id) return;

          const st = pmt.status ?? 'pending';

          // Update vote dialog state immediately (no poll tick delay)
          setVotePaymentId(prev => {
            if (prev === pmt.id) {
              if (st === 'successful') {
                setVotePayStatus('successful');
              } else if (['failed', 'cancelled', 'insufficient_funds', 'invalid_transaction'].includes(st)) {
                setVotePayStatus(st as 'failed' | 'cancelled' | 'insufficient_funds');
              }
            }
            return prev;
          });

          // On successful vote/nomination payment: recalc then refresh nominees
          if (st === 'successful' && (pmt.payment_type === 'vote' || pmt.payment_type === 'nominee_registration')) {
            await supabase.rpc('recalc_all_nominees_votes');
            if (selectedAward) loadNomineesForAward(selectedAward);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedAward, loadNomineesForAward]);

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

  const handleNominate = async () => {
    if (!nomAwardId)    { toast.error('Please select an award'); return; }
    if (!nomCategoryId) { toast.error('Please select a category'); return; }
    if (!nomName.trim()){ toast.error('Please enter your name'); return; }
    if (nomPayMethod === 'mobile_money' && !nomPhone.trim()) { toast.error('Enter your phone number'); return; }
    setNomLoading(true);
    try {
      // ── Upload nominee photo if provided ──────────────────────────────────
      let uploadedPhotoUrl: string | undefined;
      if (nomPhoto) {
        setNomPhotoUploading(true);
        try {
          const ext = nomPhoto.name.split('.').pop() ?? 'jpg';
          // Use a random UUID path — works for both authed users and guests
          const path = `public/${crypto.randomUUID()}_nominee.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('nominees')
            .upload(path, nomPhoto, { upsert: true, contentType: nomPhoto.type });
          if (upErr) throw upErr;
          const { data: urlData } = supabase.storage.from('nominees').getPublicUrl(path);
          uploadedPhotoUrl = urlData.publicUrl;
        } catch (e) {
          toast.error('Photo upload failed — continuing without photo.');
        } finally {
          setNomPhotoUploading(false);
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Use raw fetch so we always get the JSON body regardless of HTTP status.
      // supabase.functions.invoke sets data=null for non-2xx, losing the error message.
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lipila-payment`;
      const fnRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          amount: nomineeFee,
          payment_method: nomPayMethod,
          phone_number: nomPayMethod === 'mobile_money' ? nomPhone.trim() : undefined,
          description: `Nominee registration: ${nomName}`,
          idempotency_key: generateIdempotencyKey(),
          payment_type: 'nominee_registration',
          ...(user ? { user_id: user.id } : {}),
          metadata: {
            award_id: nomAwardId,
            category_id: nomCategoryId,
            nominee_name: nomName,
            bio: nomBio || undefined,
            song_title: nomSongTitle || undefined,
            photo_url: uploadedPhotoUrl || undefined,
            contact_email: nomContactEmail.trim() || undefined,
            ...(user ? { user_id: user.id } : {}),
          },
        }),
      });
      const data = await fnRes.json().catch(() => ({}));
      if (data?.status === 'insufficient_funds') { toast.error('Insufficient funds. Please top up and try again.'); return; }
      if (data?.error || !fnRes.ok) {
        toast.error(data?.error || 'Payment initiation failed. Please try again.');
        return;
      }
      toast.success('Payment initiated! Check your phone for the PIN prompt — your nomination will appear once payment is confirmed.');
      setNomDialog(false);

      // ── Poll payment status and refresh nominees when confirmed ─────────
      const nomPayId: string | undefined = data?.payment_id;
      if (nomPayId) {
        let nomAttempts = 0;
        const nomPoll = setInterval(async () => {
          nomAttempts++;
          const { data: pmtRow } = await supabase
            .from('payments').select('status').eq('id', nomPayId).maybeSingle();
          const st = pmtRow?.status ?? 'pending';
          if (st === 'successful') {
            clearInterval(nomPoll);
            // Give the DB trigger 1s to insert the nominee, then reload all awards
            await new Promise(r => setTimeout(r, 1200));
            if (selectedAward) await loadNomineesForAward(selectedAward);
            toast.success('🎉 Nomination confirmed and live! Check the awards page.');
          } else if (['failed', 'cancelled', 'insufficient_funds', 'invalid_transaction'].includes(st)) {
            clearInterval(nomPoll);
            toast.error(`Nomination payment ${st === 'cancelled' ? 'was cancelled' : 'failed'} — no nominee was added.`);
          } else if (nomAttempts >= 36) {
            clearInterval(nomPoll);
          }
        }, 5000);
      }

      setNomName(''); setNomPhone(''); setNomCategoryId(''); setNomAwardId('');
      setNomBio(''); setNomSongTitle(''); setNomContactEmail('');
      setNomPhoto(null); setNomPhotoPreview(null);
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to initiate payment');
    } finally { setNomLoading(false); }
  };

  /* ── vote payment ── */
  const handleVote = async () => {
    if (!voteNominee) return;
    const amount = voteCount * voteMin;
    if (votePayMethod === 'mobile_money' && !votePhone.trim()) {
      toast.error('Enter your mobile money phone number');
      return;
    }
    setVoteLoading(true);
    setVotePayStatus('pending');
    const ikey = generateIdempotencyKey();
    voteIdempotencyKey.current = ikey;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Use raw fetch so we always get the JSON body regardless of HTTP status.
      // supabase.functions.invoke sets data=null for non-2xx, losing the error message.
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lipila-payment`;
      const fnRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          amount,
          payment_method: votePayMethod,
          phone_number: votePayMethod === 'mobile_money' ? votePhone.trim() : undefined,
          description: `${voteCount} vote${voteCount > 1 ? 's' : ''} for ${voteNominee.name}`,
          idempotency_key: ikey,
          payment_type: 'vote',
          metadata: {
            nominee_id: voteNominee.id,
            category_id: voteNominee.category_id,
            vote_count: voteCount,
            ...(user ? { user_id: user.id } : {}),
          },
        }),
      });
      const data = await fnRes.json().catch(() => ({}));

      if (data?.status === 'insufficient_funds') {
        setVotePayStatus('insufficient_funds');
        return;
      }
      if (data?.error || data?.status === 'failed' || !fnRes.ok) {
        setVotePayStatus('failed');
        toast.error(data?.error || 'Payment failed. Please try again.');
        return;
      }

      // Payment initiated — start polling for status
      const payId: string = data?.payment_id;
      if (payId) {
        setVotePaymentId(payId);
        setVotePayStatus('checking');
        // Poll for up to 3 minutes (36 × 5s)
        let attempts = 0;
        const poll = setInterval(async () => {
          attempts++;
          const { data: pmtRow } = await supabase
            .from('payments')
            .select('status')
            .eq('id', payId)
            .maybeSingle();

          const st = pmtRow?.status ?? 'pending';
          if (st === 'successful') {
            clearInterval(poll);
            setVotePayStatus('successful');
            // Await recalc so the DB totals are up-to-date before we re-fetch nominees
            await supabase.rpc('recalc_all_nominees_votes');
            if (selectedAward) loadNomineesForAward(selectedAward);
          } else if (['failed', 'cancelled', 'insufficient_funds', 'invalid_transaction'].includes(st)) {
            clearInterval(poll);
            setVotePayStatus(st as typeof votePayStatus);
          } else if (attempts >= 36) {
            clearInterval(poll);
            // Leave as 'checking' — user can close and check later
          }
        }, 5000);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to initiate vote payment');
      setVotePayStatus('failed');
    } finally {
      setVoteLoading(false);
    }
  };

  const resetVoteDialog = () => {
    setVoteDialog(false);
    setVoteCount(1);
    setVotePhone('');
    setVotePayStatus('idle');
    setVotePaymentId(null);
    voteIdempotencyKey.current = '';
  };

  /* ── share nominee ── */
  const handleShare = (nominee: Nominee) => {
    const url = `${window.location.origin}/nominee/${nominee.id}`;
    setSearchParams({ nominee: nominee.id });
    setShareNominee(nominee);
    if (navigator.share) {
      navigator.share({ title: `Vote for ${nominee.name} — ZedVevo Awards`, text: `Support ${nominee.name} at the ZedVevo Awards! 🏆`, url })
        .catch(() => {});
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
                        onClick={() => setNomDialog(true)}>
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
                        /* Nominee cards grid: 1 col mobile / 2 col tablet / 4 col desktop */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 p-3">
                          {[...catNominees]
                            .sort((a, b) => (Number(b.total_votes) ?? 0) - (Number(a.total_votes) ?? 0))
                            .map((nominee, idx) => (
                            <NomineeCard
                              key={nominee.id}
                              nominee={{ ...nominee, total_votes: Number(nominee.total_votes ?? 0) }}
                              rank={idx + 1}
                              maxVotes={Math.max(...catNominees.map(n => Number(n.total_votes ?? 0)), 1)}
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
                  <span><strong className="text-foreground">{Number(profileNominee.total_votes ?? 0).toLocaleString()}</strong> votes</span>
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
          url={`${window.location.origin}/nominee/${shareNominee.id}`}
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
        if (!open) {
          setNomName(''); setNomPhone(''); setNomCategoryId(''); setNomAwardId('');
          setNomBio(''); setNomSongTitle(''); setNomContactEmail('');
          setNomPhoto(null); setNomPhotoPreview(null);
        }
      }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register as Nominee</DialogTitle>
            <DialogDescription>
              Registration fee: <strong>{formatCurrency(nomineeFee)}</strong> · No account needed · Confirmed after successful payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Photo upload */}
            <div>
              <Label>Profile Photo</Label>
              <input
                ref={nomPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB'); return; }
                  setNomPhoto(f);
                  const reader = new FileReader();
                  reader.onload = ev => setNomPhotoPreview(ev.target?.result as string);
                  reader.readAsDataURL(f);
                }}
              />
              <div className="mt-1 flex items-center gap-3">
                <div
                  className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-dashed border-border bg-muted cursor-pointer flex-shrink-0 hover:border-accent transition-colors"
                  onClick={() => nomPhotoInputRef.current?.click()}
                >
                  {nomPhotoPreview
                    ? <img src={nomPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-5 w-5 text-muted-foreground" />
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs"
                    onClick={() => nomPhotoInputRef.current?.click()}>
                    <Camera className="h-3 w-3" />
                    {nomPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  {nomPhotoPreview && (
                    <Button type="button" variant="ghost" size="sm" className="ml-2 gap-1 text-xs text-muted-foreground"
                      onClick={() => { setNomPhoto(null); setNomPhotoPreview(null); if (nomPhotoInputRef.current) nomPhotoInputRef.current.value = ''; }}>
                      <XIcon className="h-3 w-3" /> Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Optional · max 5 MB · shown on your nominee card</p>
                </div>
              </div>
            </div>

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
            {/* Contact email — only needed for guests who have no account */}
            {!user && (
              <div>
                <Label>Contact Email <span className="text-muted-foreground text-xs">(optional — for nomination updates)</span></Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={nomContactEmail}
                  onChange={e => setNomContactEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            )}
            <div>
              <Label>Payment Method</Label>
              <Select value={nomPayMethod} onValueChange={v => setNomPayMethod(v as typeof nomPayMethod)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money (Airtel / MTN)</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {nomPayMethod === 'mobile_money' && (
              <div>
                <Label>Mobile Money Number *</Label>
                <Input className="mt-1" type="tel" value={nomPhone} onChange={e => setNomPhone(e.target.value)} placeholder="e.g. 0977 123 456" />
                <p className="text-xs text-muted-foreground mt-1">You will receive a PIN prompt on this number</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNomDialog(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleNominate}
              disabled={nomLoading || nomPhotoUploading}>
              {(nomLoading || nomPhotoUploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {nomPhotoUploading ? 'Uploading photo…' : `Pay ${formatCurrency(nomineeFee)} & Register`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Vote Dialog ── */}
      <Dialog open={voteDialog} onOpenChange={open => { if (!open) resetVoteDialog(); else setVoteDialog(true); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Vote className="h-4 w-4 text-accent" />
              Vote for {voteNominee?.name}
            </DialogTitle>
            <DialogDescription>
              1 vote = {formatCurrency(voteMin)} · No login required · Payment via Lipila
            </DialogDescription>
          </DialogHeader>

          {/* Nominee preview */}
          {voteNominee && (
            <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                {voteNominee.photo_url
                  ? <img src={voteNominee.photo_url} alt={voteNominee.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">{voteNominee.name[0]}</div>
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{voteNominee.name}</p>
                <p className="text-xs text-muted-foreground">{Number(voteNominee.total_votes ?? 0).toLocaleString()} current votes</p>
              </div>
            </div>
          )}

          {/* Payment status panel — shown once payment is in flight */}
          {votePayStatus !== 'idle' && (
            <div className={`rounded-lg border px-4 py-3 text-sm space-y-1 ${
              votePayStatus === 'successful'
                ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                : votePayStatus === 'failed' || votePayStatus === 'insufficient_funds' || votePayStatus === 'cancelled'
                ? 'border-destructive/30 bg-destructive/5 text-destructive'
                : 'border-border bg-muted/40 text-muted-foreground'
            }`}>
              <div className="flex items-center gap-2 font-medium">
                {(votePayStatus === 'pending' || votePayStatus === 'checking') && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                {votePayStatus === 'successful' && <span>✓</span>}
                {(votePayStatus === 'failed' || votePayStatus === 'insufficient_funds' || votePayStatus === 'cancelled') && <span>✕</span>}
                {votePayStatus === 'pending' && 'Sending payment request…'}
                {votePayStatus === 'checking' && 'Checking payment… check your phone for a PIN prompt'}
                {votePayStatus === 'successful' && `Payment confirmed — ${voteCount} vote${voteCount > 1 ? 's' : ''} added!`}
                {votePayStatus === 'failed' && 'Payment failed — no votes were added'}
                {votePayStatus === 'insufficient_funds' && 'Insufficient funds — no votes were added. Please top up and try again.'}
                {votePayStatus === 'cancelled' && 'Payment cancelled — no votes were added'}
              </div>
              {votePaymentId && votePayStatus !== 'successful' && (
                <p className="text-xs opacity-60">Ref: {votePaymentId.slice(0, 8)}…</p>
              )}
            </div>
          )}

          {/* Form — hidden once payment is in flight */}
          {votePayStatus === 'idle' && (
            <div className="space-y-4">
              {/* Vote count stepper */}
              <div>
                <Label className="text-sm font-medium">Number of Votes</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Button
                    type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => setVoteCount(c => Math.max(1, c - 1))}
                    disabled={voteCount <= 1}
                  >−</Button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold tabular-nums">{voteCount}</span>
                    <span className="text-xs text-muted-foreground ml-1">vote{voteCount > 1 ? 's' : ''}</span>
                  </div>
                  <Button
                    type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0"
                    onClick={() => setVoteCount(c => Math.min(100, c + 1))}
                    disabled={voteCount >= 100}
                  >+</Button>
                </div>
                {/* Quick pick */}
                <div className="flex gap-2 mt-2">
                  {[1, 5, 10, 20, 50].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setVoteCount(n)}
                      className={`flex-1 rounded-md border py-1 text-xs font-medium transition-colors ${
                        voteCount === n
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-muted-foreground hover:border-accent/50'
                      }`}
                    >{n}</button>
                  ))}
                </div>
              </div>

              {/* Price summary */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-sm">
                <span className="text-muted-foreground">{voteCount} vote{voteCount > 1 ? 's' : ''} × {formatCurrency(voteMin)}</span>
                <span className="font-bold text-base">{formatCurrency(voteCount * voteMin)}</span>
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={votePayMethod} onValueChange={v => setVotePayMethod(v as typeof votePayMethod)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile_money">Mobile Money (Airtel / MTN)</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {votePayMethod === 'mobile_money' && (
                <div>
                  <Label>Mobile Money Number <span className="text-destructive">*</span></Label>
                  <Input
                    className="mt-1"
                    type="tel"
                    value={votePhone}
                    onChange={e => setVotePhone(e.target.value)}
                    placeholder="e.g. 0977 123 456"
                  />
                  <p className="text-xs text-muted-foreground mt-1">You will receive a PIN prompt on this number</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={resetVoteDialog}>
              {votePayStatus === 'successful' ? 'Close' : 'Cancel'}
            </Button>
            {votePayStatus === 'idle' && (
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5"
                onClick={handleVote}
                disabled={voteLoading}
              >
                {voteLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Vote className="h-4 w-4" />
                }
                Pay {formatCurrency(voteCount * voteMin)} · Cast {voteCount} Vote{voteCount > 1 ? 's' : ''}
              </Button>
            )}
            {(votePayStatus === 'failed' || votePayStatus === 'insufficient_funds' || votePayStatus === 'cancelled') && (
              <Button
                className="gap-1.5"
                onClick={() => { setVotePayStatus('idle'); setVotePaymentId(null); }}
              >
                Try Again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── NomineeCard sub-component ──────────────────────────────────────── */
interface NomineeCardProps {
  nominee: Nominee;
  rank: number;
  maxVotes: number;
  votingOpen: boolean;
  user: { id: string } | null;
  onView: () => void;
  onVote: () => void;
  onShare: () => void;
}

function NomineeCard({ nominee, rank, maxVotes, votingOpen, user, onView, onVote, onShare }: NomineeCardProps) {
  const canVote = (nominee.nomination_status === 'approved' || nominee.nomination_status === 'winner') && votingOpen;
  // Coerce to number — guards against bigint returned as string from DB/RPC
  const votes = Number(nominee.total_votes ?? 0);
  const pct = maxVotes > 0 ? Math.round((votes / maxVotes) * 100) : 0;

  // Rank badge styling
  const rankStyle =
    rank === 1 ? 'bg-amber-400/20 text-amber-600 border-amber-400/40' :
    rank === 2 ? 'bg-zinc-400/20 text-zinc-500 border-zinc-400/40' :
    rank === 3 ? 'bg-orange-400/20 text-orange-600 border-orange-400/40' :
                 'bg-muted text-muted-foreground border-border';
  const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

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
        {/* Rank badge — top-left */}
        <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md border text-[10px] font-bold backdrop-blur-sm bg-background/70 ${rankStyle}`}>
          {rankLabel}
        </div>
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

        {/* Vote count + progress bar */}
        <div className="mt-2 mb-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Vote className="h-3 w-3 text-accent shrink-0" />
              <span className="text-sm font-bold tabular-nums">{votes.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">votes</span>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
              style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
            />
          </div>
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
              onClick={() => onVote()}
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
