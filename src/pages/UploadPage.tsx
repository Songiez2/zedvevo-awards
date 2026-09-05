import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect, useCallback } from 'react';
import { Upload, Music2, Video, CreditCard, Phone, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { UploadPlan, UserSubscription, PaymentStatus } from '@/types/index';
import { getActivePlans, getUserActiveSubscription, uploadFile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { generateIdempotencyKey, formatCurrency, formatDate, snakeCaseFileName } from '@/lib/utils';
import { Navigate, useNavigate } from 'react-router-dom';

type PayMethod = 'mobile_money' | 'card';

export default function UploadPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<UploadPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Show any payment-failure message stored before a reload
  useEffect(() => {
    const msg = sessionStorage.getItem('payment_fail_msg');
    if (msg) {
      sessionStorage.removeItem('payment_fail_msg');
      // Small delay so the page is fully mounted before toast fires
      setTimeout(() => toast.error(msg), 150);
    }
  }, []);

  // Payment dialog state
  const [payDialog, setPayDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<UploadPlan | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('mobile_money');
  const [phone, setPhone] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Upload form
  const [uploadType, setUploadType] = useState<'song' | 'video'>('song');
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [featuredArtists, setFeaturedArtists] = useState('');
  const [producer, setProducer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [autoThumb, setAutoThumb] = useState<string | null>(null); // base64 data URL
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Admins always skip plan check; all other roles (artist, user) must load subscription
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
    if (isAdmin) { setLoading(false); return; }

    // Artists AND regular users both need their subscription loaded —
    // artists get canUpload because role='artist' is always entitled
    Promise.all([getActivePlans(), getUserActiveSubscription(user.id)])
      .then(([p, s]) => { setPlans(p); setSubscription(s); })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Realtime: re-fetch subscription whenever a user_subscriptions row changes for this user
    // This fires instantly when admin grants a plan, so UI unlocks without page refresh.
    const channel = supabase
      .channel(`user_sub_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${user.id}` },
        () => {
          getUserActiveSubscription(user.id).then(s => setSubscription(s)).catch(console.error);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, profile]);

  // Generate thumbnail from a video file by seeking to 1 second and snapshotting
  const generateVideoThumbnail = useCallback((videoFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(videoFile);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.muted = true;
      vid.playsInline = true;
      vid.src = url;
      vid.currentTime = 1;
      vid.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = vid.videoWidth || 640;
        canvas.height = vid.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas not available')); return; }
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };
      vid.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Video load error')); };
    });
  }, []);

  const handleVideoFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setAutoThumb(null);
    try {
      const thumb = await generateVideoThumbnail(selectedFile);
      setAutoThumb(thumb);
    } catch { /* silently ignore — user can add manual cover */ }
  };

  // Convert base64 dataURL to a Blob/File for upload
  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  // Poll payment status
  const pollPayment = async (paymentId: string) => {
    let attempts = 0;

    // Retry helper: poll for active subscription up to maxTries × interval ms
    const waitForSubscription = async (uid: string, maxTries = 8, intervalMs = 1500): Promise<UserSubscription | null> => {
      for (let i = 0; i < maxTries; i++) {
        const sub = await getUserActiveSubscription(uid);
        if (sub) return sub;
        await new Promise(r => setTimeout(r, intervalMs));
      }
      return null;
    };

    // Poll every 5s for up to 10 minutes (120 attempts)
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await supabase.from('payments').select('status').eq('id', paymentId).maybeSingle();
        if (data?.status && data.status !== 'pending') {
          clearInterval(interval);
          setPaymentStatus(data.status as PaymentStatus);
          if (data.status === 'successful') {
            // Refresh session first so new JWT role claim is included
            await supabase.auth.refreshSession();
            // Wait for webhook to set role=artist + insert new subscription (up to ~12s)
            const [sub] = await Promise.all([
              waitForSubscription(user!.id),
              refreshProfile(),
            ]);
            setSubscription(sub);
            setPayDialog(false);
            const planType = selectedPlan?.plan_type;
            const planMsg = planType === 'k10_single'
              ? '🎵 Access granted! You have 1 upload ready.'
              : planType === 'k100_weekly'
              ? '🎵 Weekly plan active! Upload freely for 7 days.'
              : planType === 'k300_yearly'
              ? '🎵 Yearly plan active! Upload freely for 365 days.'
              : '🎵 Your artist account is active. Start uploading!';
            toast.success(planMsg);
            setTimeout(() => window.location.reload(), 200);
          } else {
            const errMsg = data.status === 'insufficient_funds'
              ? 'Payment failed: Insufficient funds. Please top up your account and try again.'
              : data.status === 'failed'
              ? 'Payment failed. Please check your details and try again.'
              : data.status === 'cancelled'
              ? 'Payment was cancelled. Please try again.'
              : `Payment ${data.status}. Please try again.`;
            sessionStorage.setItem('payment_fail_msg', errMsg);
            window.location.reload();
          }
        }
      } catch { /* ignore polling errors */ }
      if (attempts >= 120) { clearInterval(interval); setPaymentStatus('review'); }
    }, 5000);

    // Also listen via Realtime for instant notification when webhook fires
    const channel = supabase
      .channel(`payment_status_${paymentId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments', filter: `id=eq.${paymentId}` },
        async (payload) => {
          const newStatus = (payload.new as { status: string }).status;
          if (newStatus && newStatus !== 'pending') {
            clearInterval(interval);
            supabase.removeChannel(channel);
            setPaymentStatus(newStatus as PaymentStatus);
            if (newStatus === 'successful') {
              // Refresh session first so new JWT role claim is included
              await supabase.auth.refreshSession();
              // Wait for webhook to set role=artist + insert new subscription (up to ~12s)
              const [sub] = await Promise.all([
                waitForSubscription(user!.id),
                refreshProfile(),
              ]);
              setSubscription(sub);
              setPayDialog(false);
              const planType = selectedPlan?.plan_type;
              const planMsg = planType === 'k10_single'
                ? '🎵 Access granted! You have 1 upload ready.'
                : planType === 'k100_weekly'
                ? '🎵 Weekly plan active! Upload freely for 7 days.'
                : planType === 'k300_yearly'
                ? '🎵 Yearly plan active! Upload freely for 365 days.'
                : '🎵 Your artist account is active. Start uploading!';
              toast.success(planMsg);
              setTimeout(() => window.location.reload(), 200);
            } else {
              // Store the error message so it survives the reload
              const errMsg = newStatus === 'insufficient_funds'
                ? 'Payment failed: Insufficient funds. Please top up your account and try again.'
                : newStatus === 'failed'
                ? 'Payment failed. Please check your details and try again.'
                : newStatus === 'cancelled'
                ? 'Payment was cancelled. Please try again.'
                : `Payment ${newStatus}. Please try again.`;
              sessionStorage.setItem('payment_fail_msg', errMsg);
              window.location.reload();
            }
          }
        }
      )
      .subscribe();
  };

  const openPayDialog = (plan: UploadPlan) => {
    setSelectedPlan(plan);
    setPayMethod('mobile_money');
    setPhone('');
    setPaymentStatus(null);
    setPaymentUrl(null);
    setPayDialog(true);
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;
    if (payMethod === 'mobile_money' && !phone) { toast.error('Enter your phone number'); return; }
    setPayLoading(true);
    try {
      // Always get the live session token so the edge function can identify the user
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const idempotencyKey = generateIdempotencyKey();
      const { data, error } = await supabase.functions.invoke('lipila-payment', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: {
          amount: selectedPlan.price,
          payment_method: payMethod,
          phone_number: payMethod === 'mobile_money' ? phone : undefined,
          description: `ZedVevo ${selectedPlan.name} Upload Plan`,
          idempotency_key: idempotencyKey,
          payment_type: 'plan',
          plan_id: selectedPlan.id,
          user_id: user!.id,
          metadata: { user_id: user!.id, plan_type: selectedPlan.plan_type }
        }
      });

      console.log('[payment] invoke result — data:', JSON.stringify(data), 'error:', error?.message);

      // Prefer data.error over the invoke error object (function always returns JSON)
      if (data?.status === 'insufficient_funds') {
        setPaymentStatus('insufficient_funds');
        toast.error('Insufficient funds. Please top up your mobile money and try again.');
        return;
      }

      if (data?.error) {
        setPaymentStatus('failed');
        toast.error(data.error);
        return;
      }

      if (error) {
        // Network / CORS / deploy error — extract as much detail as possible
        let msg = error.message || 'Payment initiation failed. Please try again.';
        try {
          const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
          if (ctx?.json) { const b = await ctx.json(); msg = b?.error ?? msg; }
        } catch { /* ignore */ }
        toast.error(msg);
        setPaymentStatus('failed');
        return;
      }

      if (data?.payment_id) {
        if (data.payment_url) setPaymentUrl(data.payment_url);
        setPaymentStatus('pending');
        pollPayment(data.payment_id);
        if (data.payment_url) window.open(data.payment_url, '_blank');
        else toast.info('Request sent! Check your phone for the Mobile Money PIN prompt.');
      } else {
        toast.error('No payment ID returned. Please try again.');
        setPaymentStatus('failed');
      }
    } catch (e: unknown) {
      console.error('[payment] unexpected error:', e);
      toast.error((e as Error).message || 'Payment failed. Please try again.');
      setPaymentStatus('failed');
    } finally { setPayLoading(false); }
  };

  const handleUpload = async () => {
    if (!title || !artistName || !file) { toast.error('Fill in all required fields'); return; }
    if (uploadType === 'song' && !coverFile) { toast.error('Song cover image is required'); return; }
    const isAdminUser = profile?.role === 'admin' || profile?.role === 'super_admin';
    const isArtistUser = profile?.role === 'artist';
    // Expired plan blocks everyone (including artists); admins always pass
    if (!isAdminUser && !hasValidSub) {
      toast.error('No active upload plan. Please purchase a plan to continue.');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const ext = file.name.split('.').pop();
      const bucket = uploadType === 'song' ? 'songs' : 'videos';
      const fileName = `${user!.id}/${snakeCaseFileName(title)}_${Date.now()}.${ext}`;
      setUploadProgress(20);
      const fileUrl = await uploadFile(bucket, fileName, file);
      setUploadProgress(60);

      let coverUrl: string | undefined;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverPath = `${user!.id}/cover_${Date.now()}.${coverExt}`;
        coverUrl = await uploadFile('thumbnails', coverPath, coverFile);
      } else if (uploadType === 'video' && autoThumb) {
        // Always upload the auto-generated canvas thumbnail for videos
        const thumbFile = dataUrlToFile(autoThumb, `thumb_${Date.now()}.jpg`);
        coverUrl = await uploadFile('thumbnails', `${user!.id}/thumb_${Date.now()}.jpg`, thumbFile);
      }
      // If still no thumbail and it's a video, retry generating one more time from the file
      if (uploadType === 'video' && !coverUrl && file) {
        try {
          const retryThumb = await generateVideoThumbnail(file);
          const thumbFile = dataUrlToFile(retryThumb, `thumb_retry_${Date.now()}.jpg`);
          coverUrl = await uploadFile('thumbnails', `${user!.id}/thumb_${Date.now()}.jpg`, thumbFile);
        } catch { /* best-effort */ }
      }
      setUploadProgress(80);

      // Admin uploads default to approved; artists & regular users to pending
      // Admins and artists get auto-approved; regular users go to pending review
      const isAdminUpload = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'artist';
      const uploadStatus = isAdminUpload ? 'approved' : 'pending';

      if (uploadType === 'song') {
        await supabase.from('songs').insert({
          user_id: user!.id, title, artist_name: artistName,
          album: album || null, genre: genre || null,
          featured_artists: featuredArtists || null,
          producer: producer || null,
          file_url: fileUrl, cover_url: coverUrl || null,
          status: uploadStatus,
        });
      } else {
        await supabase.from('videos').insert({
          user_id: user!.id, title, artist_name: artistName,
          genre: genre || null,
          featured_artists: featuredArtists || null,
          producer: producer || null,
          file_url: fileUrl,
          thumbnail_url: coverUrl || null,
          status: uploadStatus,
        });
      }

      // Deduct allowance for non-admin plans — deactivate after use/expiry
      if (!isAdminUpload && subscription) {
        if (subscription.plan_type === 'k10_single') {
          // K10: deactivate immediately after the single upload is consumed
          await supabase.from('user_subscriptions')
            .update({ uploads_used: (subscription.uploads_used || 0) + 1, is_active: false })
            .eq('id', subscription.id);
          setSubscription(null);
          await supabase.from('notifications').insert({
            user_id: user!.id,
            title: 'Upload Complete',
            message: 'Your K10 single upload has been used. Your access expires in 1 day. Purchase a new plan to upload more.',
            type: 'info',
            notification_type: 'package_expiry',
          });
        } else {
          // K100 / K300: just increment usage counter; expiry handled by expires_at
          await supabase.from('user_subscriptions')
            .update({ uploads_used: (subscription.uploads_used || 0) + 1 })
            .eq('id', subscription.id);
        }
      }

      setUploadProgress(100);
      toast.success(
        isAdminUpload
          ? 'Upload published successfully!'
          : 'Upload submitted! It will go live once approved by Admin.'
      );
      setTitle(''); setArtistName(''); setAlbum(''); setGenre('');
      setFeaturedArtists(''); setProducer('');
      setFile(null); setCoverFile(null); setAutoThumb(null);
      setUploadProgress(0);
      // Redirect to the uploaded content page
      navigate(uploadType === 'song' ? '/music' : '/videos');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const now = new Date();
  const isAdminRole = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isArtistRole = profile?.role === 'artist';
  const subExpired = subscription?.expires_at ? new Date(subscription.expires_at) <= now : false;
  const hasValidSub = !!(
    subscription &&
    subscription.is_active &&
    !subExpired &&
    (subscription.plan_type !== 'k10_single' || (subscription.uploads_used || 0) < 1)
  );
  // Admins: always allowed.
  // Artists: allowed only when they have a non-expired active subscription.
  // Regular users: need a valid active subscription.
  const canUpload = isAdminRole || (isArtistRole && hasValidSub) || (!isArtistRole && hasValidSub);

  if (!user) return <Navigate to="/login" replace />;

  if (loading) return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="min-h-screen pt-20 pb-24 lg:pb-6">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <BackToHome />
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Upload Content</h1>
          <p className="text-sm text-muted-foreground">Share your music and videos with Zambia</p>
        </div>

        {/* Active plan banner */}
        {subscription && (
          <Card className={`mb-6 ${subExpired ? 'border-destructive/30 bg-destructive/5' : 'border-accent/30 bg-accent/5'}`}>
            <CardContent className="flex items-center gap-3 py-3">
              {subExpired
                ? <XCircle className="h-5 w-5 text-destructive shrink-0" />
                : <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {subExpired ? 'Plan expired: ' : 'Active plan: '}
                  {subscription.upload_plans?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {subExpired
                    ? 'Your plan has expired. Purchase a new plan to upload again.'
                    : subscription.plan_type === 'k10_single'
                    ? `${1 - (subscription.uploads_used || 0)} upload(s) remaining${subscription.expires_at ? ` · Valid until ${formatDate(subscription.expires_at)}` : ''}`
                    : `Unlimited uploads${subscription.expires_at ? ` · Expires ${formatDate(subscription.expires_at)}` : ''}`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans grid — shown when no active sub and not admin/super_admin */}
        {!canUpload && !isAdminRole && (
          <div className="space-y-4 mb-6">
            <h2 className="text-base font-semibold">Choose an Upload Plan</h2>
            <div className="grid gap-3">
              {plans.map(plan => {
                const limitLabel =
                  plan.plan_type === 'k10_single'  ? '1 upload (song or video)' :
                  plan.plan_type === 'k100_weekly' ? 'Unlimited uploads · 7 days' :
                  plan.plan_type === 'k300_yearly' ? 'Unlimited uploads · 365 days' :
                  plan.description ?? '';
                return (
                  <button
                    key={plan.id}
                    onClick={() => openPayDialog(plan)}
                    className="text-left w-full border border-border rounded-lg p-4 transition-colors hover:border-accent focus:outline-none focus:border-accent"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{limitLabel}</p>
                      </div>
                      <p className="text-xl font-bold text-accent shrink-0">{formatCurrency(plan.price)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload form — shown when admin or has active sub */}
        {canUpload && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setUploadType('song')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${uploadType === 'song' ? 'border-accent bg-accent/5 text-accent' : 'border-border'}`}
                >
                  <Music2 className="h-4 w-4" /> Song (MP3)
                </button>
                <button
                  onClick={() => setUploadType('video')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${uploadType === 'video' ? 'border-accent bg-accent/5 text-accent' : 'border-border'}`}
                >
                  <Video className="h-4 w-4" /> Video (MP4)
                </button>
              </div>

              {/* Distribution coming-soon banner — always visible, highlighted for video */}
              <div className={`rounded-lg border px-4 py-3 flex gap-3 items-start transition-colors ${
                uploadType === 'video'
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-border bg-muted/40'
              }`}>
                <Rocket className={`h-4 w-4 mt-0.5 shrink-0 ${uploadType === 'video' ? 'text-accent' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold mb-0.5 ${uploadType === 'video' ? 'text-accent' : 'text-foreground'}`}>
                    Distribution coming soon 🚀
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Videos uploaded to ZedVevo will soon be automatically distributed to{' '}
                    <span className="font-medium text-foreground">YouTube</span> and{' '}
                    <span className="font-medium text-foreground">TikTok</span> — giving your content a wider audience at no extra cost.
                    Upload now to be first in line when we launch!
                  </p>
                </div>
              </div>

              <div>
                <Label>Title *</Label>
                <Input className="mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter title" />
              </div>
              <div>
                <Label>Artist Name *</Label>
                <Input className="mt-1" value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Artist or band name" />
              </div>
              {uploadType === 'song' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Album</Label>
                    <Input className="mt-1" value={album} onChange={e => setAlbum(e.target.value)} placeholder="Album name" />
                  </div>
                  <div>
                    <Label>Genre</Label>
                    <Input className="mt-1" value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Afrobeats" />
                  </div>
                </div>
              )}
              {/* Featured Artists & Producer — both song and video */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Featured Artists</Label>
                  <Input className="mt-1" value={featuredArtists} onChange={e => setFeaturedArtists(e.target.value)} placeholder="e.g. Slapdee, Bobby East" />
                </div>
                <div>
                  <Label>Producer</Label>
                  <Input className="mt-1" value={producer} onChange={e => setProducer(e.target.value)} placeholder="e.g. Mag44" />
                </div>
              </div>
              {uploadType === 'video' && (
                <div>
                  <Label>Genre</Label>
                  <Input className="mt-1" value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Music Video" />
                </div>
              )}

              <div>
                <Label>{uploadType === 'song' ? 'MP3 File *' : 'MP4 File *'}</Label>
                <Input
                  type="file"
                  accept={uploadType === 'song' ? 'audio/mpeg,audio/*' : 'video/mp4,video/*'}
                  className="mt-1 cursor-pointer"
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    if (uploadType === 'video' && f) handleVideoFileChange(f);
                    else setFile(f);
                  }}
                />
              </div>

              {/* Auto-generated thumbnail preview */}
              {uploadType === 'video' && autoThumb && !coverFile && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Auto-generated thumbnail preview</p>
                  <img src={autoThumb} alt="Auto thumbnail" className="w-full max-w-xs rounded-lg object-cover aspect-video border border-border" />
                </div>
              )}

              <div>
                <Label>
                  {uploadType === 'song' ? 'Cover Image *' : 'Custom Thumbnail (optional)'}
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-1 cursor-pointer"
                  onChange={e => setCoverFile(e.target.files?.[0] || null)}
                />
                {uploadType === 'song' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Required. Used as music card, player, search and trending image.
                  </p>
                )}
                {uploadType === 'video' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {autoThumb ? 'Thumbnail auto-generated from video. Upload a custom one to override.' : 'A thumbnail will be generated from your video automatically.'}
                  </p>
                )}
              </div>

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading...</span><span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <Button
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                  : <><Upload className="h-4 w-4 mr-2" />Upload</>
                }
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Payment Dialog ────────────────────────────────────────── */}
      <Dialog open={payDialog} onOpenChange={open => { if (!payLoading) setPayDialog(open); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? `Pay for ${selectedPlan.name}` : 'Choose Payment'}
            </DialogTitle>
            {selectedPlan && (
              <DialogDescription>
                Amount due: <span className="font-semibold text-accent">{formatCurrency(selectedPlan.price)}</span>
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Pending / waiting state */}
          {paymentStatus === 'pending' ? (
            <div className="py-6 text-center space-y-3">
              <Clock className="h-12 w-12 mx-auto text-yellow-500 animate-pulse" />
              <p className="font-semibold">Waiting for Confirmation</p>
              <p className="text-sm text-muted-foreground">
                {payMethod === 'mobile_money'
                  ? 'Check your phone and enter your Mobile Money PIN to confirm payment.'
                  : 'Complete your payment in the opened tab.'}
              </p>
              {paymentUrl && (
                <Button variant="outline" size="sm" onClick={() => window.open(paymentUrl, '_blank')}>
                  Re-open Payment Page
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Your plan will activate automatically as soon as Lipila confirms your payment.
              </p>
            </div>
          ) : paymentStatus === 'review' ? (
            <div className="py-6 text-center space-y-3">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="font-semibold">Under Review</p>
              <p className="text-sm text-muted-foreground">
                We could not confirm your payment automatically. The ZedVevo team will review
                your payment and activate your plan manually within a few hours.
              </p>
              <p className="text-xs text-muted-foreground">
                If you have any questions, please contact the ZedVevo team.
              </p>
              <Button variant="outline" size="sm" onClick={() => setPayDialog(false)}>
                Close
              </Button>
            </div>
          ) : paymentStatus === 'insufficient_funds' || paymentStatus === 'failed' || paymentStatus === 'cancelled' ? (
            <div className="py-6 text-center space-y-3">
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <p className="font-semibold">
                {paymentStatus === 'insufficient_funds' ? 'Insufficient Funds' : `Payment ${paymentStatus}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {paymentStatus === 'insufficient_funds'
                  ? 'Please add sufficient funds to your account and try again.'
                  : 'Your plan was not activated. Please try again.'}
              </p>
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => setPaymentStatus(null)}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Amount summary */}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="text-sm font-medium">{selectedPlan?.name}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-bold text-accent text-lg">{selectedPlan ? formatCurrency(selectedPlan.price) : '—'}</span>
              </div>

              {/* Method selector */}
              <div>
                <Label className="text-sm mb-2 block">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPayMethod('mobile_money')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      payMethod === 'mobile_money' ? 'border-accent bg-accent/5 text-accent' : 'border-border text-foreground'
                    }`}
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>Mobile Money</span>
                  </button>
                  <button
                    onClick={() => setPayMethod('card')}
                    className={`relative flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                      payMethod === 'card' ? 'border-accent bg-accent/5 text-accent' : 'border-border text-foreground'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span>Card</span>
                    <Badge className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0 bg-muted text-muted-foreground border border-border">
                      Soon
                    </Badge>
                  </button>
                </div>
              </div>

              {/* Card coming soon notice */}
              {payMethod === 'card' && (
                <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Card payments coming soon</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Card payments are not yet available. Please use Mobile Money to complete your purchase.
                    </p>
                  </div>
                </div>
              )}

              {/* Mobile money phone input */}
              {payMethod === 'mobile_money' && (
                <div>
                  <Label>Phone Number *</Label>
                  <Input
                    className="mt-1"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0977123456"
                    type="tel"
                  />
                </div>
              )}

              {/* Security note */}
              <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-accent mt-0.5" />
                Your plan activates only after Lipila verifies your payment server-side.
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setPayDialog(false)} disabled={payLoading}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={handlePayment}
                  disabled={payLoading || payMethod === 'card'}
                >
                  {payLoading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
                    : `Pay ${selectedPlan ? formatCurrency(selectedPlan.price) : ''}`
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
