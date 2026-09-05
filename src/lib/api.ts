import { supabase } from '@/db/supabase';
import type {
  Song, Video, HeroBanner, Artist, Sponsor, Award, AwardCategory,
  Nominee, Vote, UploadPlan, UserSubscription, Payment, Notification,
  Profile, Download, WeeklyTrending, WinnerOfMonth,
  SearchResult, SearchFilter, SearchSort
} from '@/types/index';

// ============================================================
// SONGS
// ============================================================
export async function getSongs(opts: { status?: string; limit?: number; offset?: number; userId?: string } = {}) {
  let q = supabase.from('songs').select('*').order('created_at', { ascending: false }).limit(opts.limit ?? 20);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);
  const { data, error } = await q;
  if (error) throw error;
  return Array.isArray(data) ? data as Song[] : [];
}

export async function getTrendingSongs(limit = 10) {
  // First try songs explicitly flagged as trending
  const { data: trending, error: e1 } = await supabase
    .from('songs').select('*').eq('status', 'approved').eq('is_trending', true)
    .order('play_count', { ascending: false }).limit(limit);
  if (e1) throw e1;
  if (Array.isArray(trending) && trending.length > 0) return trending as Song[];

  // Fallback: return the most-played approved songs so the section is never empty
  const { data: fallback, error: e2 } = await supabase
    .from('songs').select('*').eq('status', 'approved')
    .order('play_count', { ascending: false }).limit(limit);
  if (e2) throw e2;
  return Array.isArray(fallback) ? fallback as Song[] : [];
}

export async function getPopularSongs(limit = 10) {
  const { data, error } = await supabase
    .from('songs').select('*').eq('status', 'approved')
    .order('play_count', { ascending: false }).limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data as Song[] : [];
}

export async function getNewSongs(limit = 10) {
  const { data, error } = await supabase
    .from('songs').select('*').eq('status', 'approved')
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data as Song[] : [];
}

export async function getSongById(id: string) {
  const { data, error } = await supabase.from('songs').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Song | null;
}

export async function createSong(payload: Partial<Song>) {
  const { error } = await supabase.from('songs').insert(payload);
  if (error) throw error;
}

export async function updateSong(id: string, payload: Partial<Song>) {
  const { error } = await supabase.from('songs').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteSong(id: string) {
  const { error } = await supabase.from('songs').delete().eq('id', id);
  if (error) throw error;
}

export async function incrementPlayCount(songId: string) {
  const { error } = await supabase.rpc('increment_play_count', { song_id: songId });
  if (error) console.error('play count error', error);
}

// ============================================================
// VIDEOS
// ============================================================
export async function getVideos(opts: { status?: string; limit?: number; offset?: number; userId?: string } = {}) {
  let q = supabase.from('videos').select('*').order('created_at', { ascending: false }).limit(opts.limit ?? 20);
  if (opts.status) q = q.eq('status', opts.status);
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);
  const { data, error } = await q;
  if (error) throw error;
  return Array.isArray(data) ? data as Video[] : [];
}

export async function getTrendingVideos(limit = 10) {
  // First try videos explicitly flagged as trending
  const { data: trending, error: e1 } = await supabase
    .from('videos').select('*').eq('status', 'approved').eq('is_trending', true)
    .order('view_count', { ascending: false }).limit(limit);
  if (e1) throw e1;
  if (Array.isArray(trending) && trending.length > 0) return trending as Video[];

  // Fallback: return the most-viewed approved videos so the section is never empty
  const { data: fallback, error: e2 } = await supabase
    .from('videos').select('*').eq('status', 'approved')
    .order('view_count', { ascending: false }).limit(limit);
  if (e2) throw e2;
  return Array.isArray(fallback) ? fallback as Video[] : [];
}

export async function getVideoById(id: string) {
  const { data, error } = await supabase.from('videos').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Video | null;
}

export async function createVideo(payload: Partial<Video>) {
  const { error } = await supabase.from('videos').insert(payload);
  if (error) throw error;
}

export async function updateVideo(id: string, payload: Partial<Video>) {
  const { error } = await supabase.from('videos').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteVideo(id: string) {
  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw error;
}

export async function incrementViewCount(videoId: string) {
  const { error } = await supabase.rpc('increment_view_count', { video_id: videoId });
  if (error) console.error('view count error', error);
}

// ============================================================
// LIKES & LIBRARY
// ============================================================
export async function toggleLike(userId: string, contentId: string, contentType: 'song' | 'video') {
  const { data: existing } = await supabase
    .from('content_likes').select('id').eq('user_id', userId).eq('content_id', contentId).eq('content_type', contentType).maybeSingle();
  if (existing) {
    await supabase.from('content_likes').delete().eq('id', existing.id);
    // decrement
    if (contentType === 'song') await supabase.from('songs').update({ like_count: supabase.rpc('like_count') }).eq('id', contentId);
    return false;
  } else {
    await supabase.from('content_likes').insert({ user_id: userId, content_id: contentId, content_type: contentType });
    return true;
  }
}

export async function getLikedContentIds(userId: string, contentType: 'song' | 'video') {
  const { data, error } = await supabase
    .from('content_likes').select('content_id').eq('user_id', userId).eq('content_type', contentType);
  if (error) return [];
  return (data || []).map((d: { content_id: string }) => d.content_id);
}

export async function toggleSave(userId: string, contentId: string, contentType: 'song' | 'video') {
  const { data: existing } = await supabase
    .from('user_library').select('id').eq('user_id', userId).eq('content_id', contentId).eq('content_type', contentType).maybeSingle();
  if (existing) {
    await supabase.from('user_library').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('user_library').insert({ user_id: userId, content_id: contentId, content_type: contentType });
    return true;
  }
}

export async function getSavedContentIds(userId: string, contentType: 'song' | 'video') {
  const { data, error } = await supabase
    .from('user_library').select('content_id').eq('user_id', userId).eq('content_type', contentType);
  if (error) return [];
  return (data || []).map((d: { content_id: string }) => d.content_id);
}

// ============================================================
// HERO BANNERS
// ============================================================
export async function getActiveBanners(): Promise<HeroBanner[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('hero_banners').select('*').eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('display_order', { ascending: true }).limit(10);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAllBanners(): Promise<HeroBanner[]> {
  const { data, error } = await supabase.from('hero_banners').select('*').order('display_order', { ascending: true });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createBanner(payload: Partial<HeroBanner>) {
  const { error } = await supabase.from('hero_banners').insert(payload);
  if (error) throw error;
}

export async function updateBanner(id: string, payload: Partial<HeroBanner>) {
  const { error } = await supabase.from('hero_banners').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteBanner(id: string) {
  const { error } = await supabase.from('hero_banners').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// ARTISTS
// ============================================================
export async function getFeaturedArtists(limit = 8): Promise<Artist[]> {
  // Order by newest first so fresh artists always surface at the top.
  // Falls back to all artists (not just is_featured) to always populate the row.
  const { data, error } = await supabase
    .from('artists').select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAllArtists(): Promise<Artist[]> {
  const { data, error } = await supabase.from('artists').select('*').order('name');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ============================================================
// SPONSORS
// ============================================================
export async function getActiveSponsors(): Promise<Sponsor[]> {
  const { data, error } = await supabase
    .from('sponsors').select('*').eq('is_active', true)
    .order('display_order', { ascending: true }).limit(20);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ============================================================
// AWARDS
// ============================================================
export async function getActiveAwards(): Promise<Award[]> {
  const { data, error } = await supabase
    .from('awards').select('*, award_categories(*, nominees(id, name, photo_url, total_votes, is_winner, registration_status))')
    .eq('is_active', true).order('created_at', { ascending: false }).limit(5);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAllAwards(): Promise<Award[]> {
  const { data, error } = await supabase
    .from('awards').select('*, award_categories(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAwardCategories(awardId: string): Promise<AwardCategory[]> {
  const { data, error } = await supabase
    .from('award_categories').select('*, nominees(*)').eq('award_id', awardId).eq('is_active', true);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createAward(payload: Partial<Award>) {
  const { error } = await supabase.from('awards').insert(payload);
  if (error) throw error;
}

export async function updateAward(id: string, payload: Partial<Award>) {
  const { error } = await supabase.from('awards').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAward(id: string) {
  const { error } = await supabase.from('awards').delete().eq('id', id);
  if (error) throw error;
}

export async function createAwardCategory(payload: Partial<AwardCategory>) {
  const { error } = await supabase.from('award_categories').insert(payload);
  if (error) throw error;
}

export async function updateAwardCategory(id: string, payload: Partial<AwardCategory>) {
  const { error } = await supabase.from('award_categories').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAwardCategory(id: string) {
  const { error } = await supabase.from('award_categories').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// NOMINEES
// ============================================================
export async function getNomineesByCategory(categoryId: string): Promise<Nominee[]> {
  // Direct select — total_votes is kept accurate by DB triggers + migration recalc.
  // Coerce total_votes to Number in case Postgres returns bigint as string in some paths.
  const { data, error } = await supabase
    .from('nominees')
    .select('id, name, bio, photo_url, song_title, song_url, achievements, social_links, total_votes, is_winner, nomination_status, registration_status, category_id, user_id, created_at')
    .eq('category_id', categoryId)
    .eq('registration_status', 'successful')
    .in('nomination_status', ['approved', 'winner'])
    .order('total_votes', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  // Normalise: coerce total_votes to a plain JS number (guards against bigint→string from RPC paths)
  return rows.map(r => ({ ...r, total_votes: Number(r.total_votes ?? 0) }));
}

export async function getUserNominations(userId: string): Promise<Nominee[]> {
  const { data, error } = await supabase
    .from('nominees').select('*, award_categories(name, awards(name))')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ============================================================
// VOTES
// ============================================================
export async function getUserVotes(userId: string): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes').select('*, nominees(name, photo_url)')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ============================================================
// UPLOAD PLANS
// ============================================================
export async function getActivePlans(): Promise<UploadPlan[]> {
  const { data, error } = await supabase.from('upload_plans').select('*').eq('is_active', true).order('price');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAllPlans(): Promise<UploadPlan[]> {
  const { data, error } = await supabase.from('upload_plans').select('*').order('price');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function updatePlan(id: string, payload: Partial<UploadPlan>) {
  const { error } = await supabase.from('upload_plans').update(payload).eq('id', id);
  if (error) throw error;
}

// ============================================================
// USER SUBSCRIPTIONS
// ============================================================
export async function getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions').select('*, upload_plans(*)').eq('user_id', userId).eq('is_active', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return null;
  return data as UserSubscription | null;
}

export async function getUserSubscriptions(userId: string): Promise<UserSubscription[]> {
  const { data, error } = await supabase
    .from('user_subscriptions').select('*, upload_plans(*)')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ============================================================
// PAYMENTS
// ============================================================
export async function getUserPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments').select('*, upload_plans(name)').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAllPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments').select('*, upload_plans(name), profiles!payments_user_id_fkey(display_name, username, email, role)')
    .order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// Manually complete a pending payment (triggers full artist promotion + subscription flow)
export async function processPayment(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('process_pending_payment', { p_payment_id: paymentId });
  if (error) return { ok: false, error: error.message };
  const result = data as { ok: boolean; error?: string } | null;
  if (!result?.ok) return { ok: false, error: result?.error ?? 'Unknown error' };
  return { ok: true };
}

export async function getPaymentByIdempotencyKey(key: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments').select('*').eq('idempotency_key', key).maybeSingle();
  if (error) return null;
  return data as Payment | null;
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications').select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// APP SETTINGS
// ============================================================
export async function getSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('app_settings').select('key, value');
  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
  return map;
}

export async function updateSetting(key: string, value: string) {
  const { error } = await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
  if (error) throw error;
}

// ============================================================
// PROFILES (admin)
// ============================================================
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// Get all active subscriptions keyed by user_id for admin overview
export async function getAllActiveSubscriptions(): Promise<Record<string, UserSubscription>> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*, upload_plans(name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return {};
  const map: Record<string, UserSubscription> = {};
  (Array.isArray(data) ? data : []).forEach((s: UserSubscription) => {
    if (s.user_id && !map[s.user_id]) map[s.user_id] = s;
  });
  return map;
}


// ============================================================
// STORAGE HELPERS
// ============================================================
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return getPublicUrl(bucket, data.path);
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

// ============================================================
// ADMIN HELPERS
// ============================================================
export async function approveContent(table: 'songs' | 'videos', id: string) {
  const { error } = await supabase.from(table).update({ status: 'approved' }).eq('id', id);
  if (error) throw error;
}

export async function rejectContent(table: 'songs' | 'videos', id: string) {
  const { error } = await supabase.from(table).update({ status: 'rejected' }).eq('id', id);
  if (error) throw error;
}

export async function setTrending(table: 'songs' | 'videos', id: string, value: boolean) {
  const { error } = await supabase.from(table).update({ is_trending: value }).eq('id', id);
  if (error) throw error;
}

export async function setWinner(nomineeId: string) {
  const { error } = await supabase.from('nominees').update({ is_winner: true, nomination_status: 'winner' }).eq('id', nomineeId);
  if (error) throw error;
}

export async function getAllNominees(): Promise<Nominee[]> {
  const { data, error } = await supabase
    .from('nominees')
    .select('*, award_categories(name, awards(name)), profiles(username, display_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function updateNomineeStatus(id: string, nomination_status: string) {
  const { error } = await supabase.from('nominees').update({ nomination_status }).eq('id', id);
  if (error) throw error;
}

export async function updateNominee(id: string, payload: Partial<Nominee>) {
  const { error } = await supabase.from('nominees').update(payload).eq('id', id);
  if (error) throw error;
}

export async function createNominee(payload: Partial<Nominee>): Promise<Nominee> {
  const { data, error } = await supabase
    .from('nominees')
    .insert({ ...payload, registration_status: 'successful', total_votes: 0 })
    .select()
    .single();
  if (error) throw error;
  return data as Nominee;
}

export async function deleteNominee(id: string): Promise<void> {
  const { error } = await supabase.from('nominees').delete().eq('id', id);
  if (error) throw error;
}

export async function getAllVotes(): Promise<Vote[]> {
  const { data, error } = await supabase
    .from('votes')
    .select('*, nominees(name, photo_url, category_id, award_categories(name))')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    console.error('[getAllVotes] error:', error.message);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function updateVote(id: string, payload: Partial<Vote>): Promise<void> {
  const { error } = await supabase.from('votes').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteVote(id: string): Promise<void> {
  const { error } = await supabase.from('votes').delete().eq('id', id);
  if (error) throw error;
}

export async function updateUserRole(userId: string, role: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

/**
 * Promote a user to artist and immediately grant them an active upload subscription.
 * Called by admin when they set role = 'artist' and pick a plan.
 */
export async function createArtistSubscription(
  userId: string,
  planId: string
): Promise<void> {
  // 1. Get plan details (validity_days, plan_type)
  const { data: plan, error: planErr } = await supabase
    .from('upload_plans')
    .select('id, plan_type, validity_days, name')
    .eq('id', planId)
    .single();
  if (planErr || !plan) throw new Error(planErr?.message ?? 'Plan not found');

  const validityDays: number =
    plan.plan_type === 'k10_single' ? 1
    : plan.plan_type === 'k100_weekly' ? 7
    : plan.plan_type === 'k300_yearly' ? 365
    : (plan.validity_days ?? 7);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  // 2. Deactivate any existing active subscriptions for this user
  await supabase
    .from('user_subscriptions')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  // 3. Set role = 'artist' on the profile
  const { error: roleErr } = await supabase
    .from('profiles')
    .update({ role: 'artist' })
    .eq('id', userId);
  if (roleErr) throw roleErr;

  // 4. Insert active subscription (admin grant — no payment required)
  const { error: subErr } = await supabase.from('user_subscriptions').insert({
    user_id: userId,
    plan_id: planId,
    plan_type: plan.plan_type,
    is_active: true,
    uploads_used: 0,
    expires_at: expiresAt.toISOString(),
  });
  if (subErr) throw subErr;

  // 5. Notify the user
  await supabase.from('notifications').insert({
    user_id: userId,
    title: '🎉 You are now an Artist on ZedVevo!',
    message: `Your account has been promoted to Artist and you have been granted the ${plan.name} upload plan. Start uploading your music and videos!`,
    type: 'success',
    notification_type: 'payment_success',
    link: '/upload',
  });
}

export async function deleteUser(userId: string): Promise<void> {
  // Deletes the profile; the Auth user must be removed via service-role (admin-reset-password edge fn or Supabase dashboard)
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}

export async function updateProfile(userId: string, payload: Partial<Profile>): Promise<void> {
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
}

// ============================================================
// DOWNLOADS
// ============================================================
export async function recordDownload(payload: Omit<Download, 'id' | 'downloaded_at'>): Promise<void> {
  const { error } = await supabase.from('downloads').insert({ ...payload, downloaded_at: new Date().toISOString() });
  if (error) throw error;
}

export async function getUserDownloads(userId: string): Promise<Download[]> {
  const { data, error } = await supabase
    .from('downloads')
    .select('*')
    .eq('user_id', userId)
    .order('downloaded_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getAllDownloads(): Promise<Download[]> {
  const { data, error } = await supabase
    .from('downloads')
    .select('*')
    .order('downloaded_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function incrementSongDownloadCount(songId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_song_download', { song_id: songId });
  if (error) console.error('song download count error', error);
}

export async function incrementVideoDownloadCount(videoId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_video_download', { video_id: videoId });
  if (error) console.error('video download count error', error);
}

export async function setVideoDownloadsEnabled(videoId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('videos').update({ downloads_enabled: enabled }).eq('id', videoId);
  if (error) throw error;
}

// ============================================================
// WEEKLY TRENDING
// ============================================================
export async function getWeeklyTrending(category?: string): Promise<WeeklyTrending[]> {
  // Get the most recent week_start
  const { data: latestWeek } = await supabase
    .from('weekly_trending')
    .select('week_start')
    .order('week_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestWeek) return [];

  let q = supabase
    .from('weekly_trending')
    .select('*')
    .eq('week_start', latestWeek.week_start)
    .order('rank', { ascending: true });

  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function computeAndStoreWeeklyTrending(): Promise<void> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Most played songs
  const { data: topPlayed } = await supabase
    .from('songs').select('id, title, artist_name, cover_url, play_count')
    .eq('status', 'approved').order('play_count', { ascending: false }).limit(10);

  // Most downloaded songs
  const { data: topDownloaded } = await supabase
    .from('songs').select('id, title, artist_name, cover_url, download_count')
    .eq('status', 'approved').order('download_count', { ascending: false }).limit(10);

  // Most viewed videos
  const { data: topViewed } = await supabase
    .from('videos').select('id, title, artist_name, thumbnail_url, view_count')
    .eq('status', 'approved').order('view_count', { ascending: false }).limit(10);

  // Most liked songs
  const { data: topLiked } = await supabase
    .from('songs').select('id, title, artist_name, cover_url, like_count')
    .eq('status', 'approved').order('like_count', { ascending: false }).limit(10);

  const rows: Omit<WeeklyTrending, 'id' | 'created_at'>[] = [];

  (topPlayed || []).forEach((s, i) => rows.push({ week_start: weekStartStr, content_id: s.id, content_type: 'song', rank: i + 1, category: 'most_played', metric_value: s.play_count, title: s.title, artist_name: s.artist_name, cover_url: s.cover_url }));
  (topDownloaded || []).forEach((s, i) => rows.push({ week_start: weekStartStr, content_id: s.id, content_type: 'song', rank: i + 1, category: 'most_downloaded', metric_value: s.download_count, title: s.title, artist_name: s.artist_name, cover_url: s.cover_url }));
  (topViewed || []).forEach((v, i) => rows.push({ week_start: weekStartStr, content_id: v.id, content_type: 'video', rank: i + 1, category: 'most_viewed', metric_value: v.view_count, title: v.title, artist_name: v.artist_name, cover_url: v.thumbnail_url }));
  (topLiked || []).forEach((s, i) => rows.push({ week_start: weekStartStr, content_id: s.id, content_type: 'song', rank: i + 1, category: 'most_liked', metric_value: s.like_count, title: s.title, artist_name: s.artist_name, cover_url: s.cover_url }));

  if (rows.length > 0) {
    await supabase.from('weekly_trending').upsert(rows, { onConflict: 'week_start,content_type,category,rank' });
  }
}

// ============================================================
// WINNER OF THE MONTH
// ============================================================
export async function getCurrentWinnerOfMonth(): Promise<WinnerOfMonth | null> {
  const now = new Date();
  const { data, error } = await supabase
    .from('winner_of_month')
    .select('*')
    .eq('month', now.getMonth() + 1)
    .eq('year', now.getFullYear())
    .eq('is_published', true)
    .maybeSingle();
  if (error) return null;
  return data as WinnerOfMonth | null;
}

export async function getAllWinnersOfMonth(): Promise<WinnerOfMonth[]> {
  const { data, error } = await supabase
    .from('winner_of_month')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function upsertWinnerOfMonth(payload: Partial<WinnerOfMonth>): Promise<WinnerOfMonth> {
  const { data, error } = await supabase
    .from('winner_of_month')
    .upsert(payload, { onConflict: 'month,year' })
    .select()
    .single();
  if (error) throw error;
  return data as WinnerOfMonth;
}

export async function publishWinnerOfMonth(id: string): Promise<void> {
  const { error } = await supabase
    .from('winner_of_month')
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// GLOBAL SEARCH
// ============================================================
export async function globalSearch(
  query: string,
  filter: SearchFilter = 'all',
  sort: SearchSort = 'relevance',
  limit = 20
): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  const orderCol = (table: 'songs' | 'videos') => {
    if (sort === 'newest') return { col: 'created_at', asc: false };
    if (sort === 'most_played' && table === 'songs') return { col: 'play_count', asc: false };
    if (sort === 'most_downloaded') return { col: 'download_count', asc: false };
    if (sort === 'most_viewed' && table === 'videos') return { col: 'view_count', asc: false };
    return { col: 'created_at', asc: false };
  };

  if (filter === 'all' || filter === 'music') {
    const { col, asc } = orderCol('songs');
    const { data } = await supabase
      .from('songs')
      .select('id, title, artist_name, album, genre, cover_url, play_count, download_count')
      .eq('status', 'approved')
      .or(`title.ilike.%${q}%,artist_name.ilike.%${q}%,album.ilike.%${q}%,genre.ilike.%${q}%`)
      .order(col, { ascending: asc })
      .limit(limit);
    (data || []).forEach(s => results.push({
      type: 'song', id: s.id, title: s.title,
      subtitle: s.artist_name + (s.album ? ` · ${s.album}` : ''),
      cover_url: s.cover_url,
      metadata: { play_count: s.play_count, download_count: s.download_count, genre: s.genre }
    }));
  }

  if (filter === 'all' || filter === 'videos') {
    const { col, asc } = orderCol('videos');
    const { data } = await supabase
      .from('videos')
      .select('id, title, artist_name, genre, thumbnail_url, view_count, download_count')
      .eq('status', 'approved')
      .or(`title.ilike.%${q}%,artist_name.ilike.%${q}%,genre.ilike.%${q}%`)
      .order(col, { ascending: asc })
      .limit(limit);
    (data || []).forEach(v => results.push({
      type: 'video', id: v.id, title: v.title,
      subtitle: v.artist_name + (v.genre ? ` · ${v.genre}` : ''),
      cover_url: v.thumbnail_url,
      metadata: { view_count: v.view_count, download_count: v.download_count }
    }));
  }

  if (filter === 'all' || filter === 'artists') {
    const { data } = await supabase
      .from('artists')
      .select('id, name, genre, avatar_url, play_count')
      .or(`name.ilike.%${q}%,genre.ilike.%${q}%`)
      .order('play_count', { ascending: false })
      .limit(limit);
    (data || []).forEach(a => results.push({
      type: 'artist', id: a.id, title: a.name,
      subtitle: a.genre || 'Artist',
      cover_url: a.avatar_url,
      metadata: { play_count: a.play_count }
    }));
  }

  if (filter === 'all' || filter === 'awards') {
    const { data } = await supabase
      .from('nominees')
      .select('id, name, bio, photo_url, award_categories(name, awards(name))')
      .or(`name.ilike.%${q}%,bio.ilike.%${q}%`)
      .eq('nomination_status', 'approved')
      .limit(limit);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data || []).forEach((n: any) => results.push({
      type: 'nominee' as const, id: n.id as string, title: n.name as string,
      subtitle: (n.award_categories?.name || '') as string,
      cover_url: n.photo_url as string | undefined,
      metadata: {}
    }));
  }

  return results;
}

// ============================================================
// NOTIFICATIONS (extended)
// ============================================================
export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq('is_read', false);
  if (error) throw error;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function createNotification(payload: {
  user_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  notification_type: string;
  link?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from('notifications').insert(payload);
  if (error) throw error;
}

// Send a help/support message to admin (email + in-app notification)
export async function sendHelpMessage(payload: {
  message: string;
  name?: string;
  email?: string;
  subject?: string;
  user_id?: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('help-message', { body: payload });
  if (error) throw error;
}

// ============================================================
// AWARD VOTING / NOMINEES TOGGLE
// ============================================================
export async function toggleAwardVoting(id: string, open: boolean): Promise<void> {
  const { error } = await supabase.from('awards').update({ voting_open: open }).eq('id', id);
  if (error) throw error;
}

export async function toggleAwardNominees(id: string, open: boolean): Promise<void> {
  const { error } = await supabase.from('awards').update({ nominees_open: open }).eq('id', id);
  if (error) throw error;
}

// ============================================================
// VISITOR LOGS
// ============================================================

// Generate or retrieve a stable session ID for this browser tab
function getSessionId(): string {
  const key = 'zv_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export async function logVisit(page: string): Promise<void> {
  try {
    // Route through edge function to avoid browser CORS issues on direct insert
    await supabase.functions.invoke('log-visit', {
      body: {
        page,
        session_id: getSessionId(),
        user_agent: navigator.userAgent.slice(0, 200),
        referrer: document.referrer.slice(0, 200) || undefined,
      },
    });
  } catch {
    // silent — visitor tracking must never break the UI
  }
}

export async function incrementShareCount(contentType: 'song' | 'video', contentId: string): Promise<void> {
  try {
    await supabase.functions.invoke('share', {
      body: { content_type: contentType, content_id: contentId },
    });
  } catch {
    // silent — share tracking must never break the UI
  }
}

export async function getTodayVisitorCount(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('visitor_logs')
    .select('id', { count: 'exact', head: true })
    .gte('visited_at', startOfDay.toISOString());
  if (error) return 0;
  return count ?? 0;
}

export async function getNomineeById(id: string): Promise<Nominee | null> {
  const { data, error } = await supabase
    .from('nominees')
    .select('*, award_categories(name, awards(name))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Nominee | null;
}

export async function getPaymentStatus(paymentId: string): Promise<{ status: string } | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, status')
    .eq('id', paymentId)
    .maybeSingle();
  if (error) return null;
  return data as { status: string } | null;
}

export async function getTodayVisitorLogs(): Promise<import('@/types/index').VisitorLog[]> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('visitor_logs')
    .select('*')
    .gte('visited_at', startOfDay.toISOString())
    .order('visited_at', { ascending: false })
    .limit(500);
  if (error) return [];
  return Array.isArray(data) ? data : [];
}
