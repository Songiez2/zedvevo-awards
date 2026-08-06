import BackToHome from '@/components/common/BackToHome';
import { useState, useEffect, useMemo } from 'react';
import { Trophy, Loader2, AlertCircle, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Award, Nominee } from '@/types/index';
import { getActiveAwards, getNomineesByCategory, getSettings } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { generateIdempotencyKey, formatCurrency } from '@/lib/utils';
import ShareSheet from '@/components/common/ShareSheet';
import { buildShareUrl } from '@/lib/share';
import ManualPaymentDialog from '@/components/payments/ManualPaymentDialog';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import type { ManualPaymentMetadata, ManualServiceType } from '@/types/manualPayment';

export default function AwardsPage() {
  const { user } = useAuth();
  const [awards, setAwards] = useState<Award[]>([]);
  const [nominees, setNominees] = useState<Record<string, Nominee[]>>({});
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);

  // Nomination dialog
  const [nomDialog, setNomDialog] = useState(false);
  const [nomAwardId, setNomAwardId] = useState('');
  const [nomCategoryId, setNomCategoryId] = useState('');
  const [nomName, setNomName] = useState('');
  const [nomPhone, setNomPhone] = useState('');
  const [nomPayMethod, setNomPayMethod] = useState<'mobile_money' | 'card' | 'manual'>('mobile_money');
  const [nomLoading, setNomLoading] = useState(false);

  // Vote dialog
  const [voteDialog, setVoteDialog] = useState(false);
  const [voteNominee, setVoteNominee] = useState<Nominee | null>(null);
  const [voteAmount, setVoteAmount] = useState('');
  const [votePhone, setVotePhone] = useState('');
  const [votePayMethod, setVotePayMethod] = useState<'mobile_money' | 'card' | 'manual'>('mobile_money');
  const [voteLoading, setVoteLoading] = useState(false);

  // Share sheet
  const [shareNominee, setShareNominee] = useState<Nominee | null>(null);

  // Manual payment (WhatsApp approval) flow
  const { allowsAutomatic, allowsManual } = usePaymentConfig();
  const [manualDialog, setManualDialog] = useState<{
    open: boolean; service: ManualServiceType; amount: number;
    metadata: ManualPaymentMetadata; name: string; phone: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([getActiveAwards(), getSettings()])
      .then(([aw, s]) => {
        setAwards(aw);
        setSettings(s);
        if (aw.length > 0) setSelectedAward(aw[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedAward) return;
    const cats = selectedAward.award_categories || [];
    cats.forEach(async cat => {
      const data = await getNomineesByCategory(cat.id);
      setNominees(prev => ({ ...prev, [cat.id]: data }));
    });
  }, [selectedAward]);

  // Flat list of ALL categories across ALL awards — used in the nominate dialog
  const allCategories = useMemo(() =>
    awards.flatMap(aw =>
      (aw.award_categories || []).map(cat => ({ ...cat, awardName: aw.name, awardId: aw.id }))
    ),
    [awards]
  );

  // When the user picks an award in the nom dialog, reset category
  const handleNomAwardChange = (awardId: string) => {
    setNomAwardId(awardId);
    setNomCategoryId('');
  };

  // Categories for the currently selected award in the dialog
  const nomCategories = useMemo(
    () => allCategories.filter(c => c.awardId === nomAwardId),
    [allCategories, nomAwardId]
  );

  const nomineeFee = parseFloat(settings.nominee_fee || '25');
  const voteMin    = parseFloat(settings.vote_min_amount || '5');

  const handleNominate = async () => {
    if (!user) { toast.error('Sign in to register as a nominee'); return; }
    if (!nomAwardId)    { toast.error('Please select an award'); return; }
    if (!nomCategoryId) { toast.error('Please select a category'); return; }
    if (!nomName)       { toast.error('Please enter your name'); return; }
    if (nomPayMethod === 'mobile_money' && !nomPhone) { toast.error('Enter your phone number'); return; }
    if (nomPayMethod === 'manual') {
      setNomDialog(false);
      setManualDialog({
        open: true,
        service: 'nominee_registration',
        amount: nomineeFee,
        metadata: { award_id: nomAwardId, category_id: nomCategoryId, nominee_name: nomName },
        name: nomName,
        phone: nomPhone,
      });
      return;
    }
    setNomLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const idempotencyKey = generateIdempotencyKey();
      const { data, error } = await supabase.functions.invoke('lipila-payment', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: {
          amount: nomineeFee,
          payment_method: nomPayMethod,
          phone_number: nomPayMethod === 'mobile_money' ? nomPhone : undefined,
          description: `Nominee registration: ${nomName}`,
          idempotency_key: idempotencyKey,
          payment_type: 'nominee_registration',
          user_id: user.id,
          metadata: { award_id: nomAwardId, category_id: nomCategoryId, nominee_name: nomName, user_id: user.id }
        }
      });
      if (data?.status === 'insufficient_funds') { toast.error('Insufficient funds. Please top up and try again.'); return; }
      if (data?.error) { toast.error(data.error); return; }
      if (error) { toast.error(error.message || 'Payment initiation failed. Please try again.'); return; }
      toast.success('Payment initiated. Your nomination will be confirmed once payment is verified.');
      setNomDialog(false);
      setNomName(''); setNomPhone(''); setNomCategoryId(''); setNomAwardId('');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to initiate payment');
    } finally { setNomLoading(false); }
  };

  const handleVote = async () => {
    if (!user) { toast.error('Sign in to vote'); return; }
    if (!voteNominee) return;
    const amount = parseFloat(voteAmount);
    if (isNaN(amount) || amount < voteMin) { toast.error(`Minimum vote amount is ${formatCurrency(voteMin)}`); return; }
    if (votePayMethod === 'mobile_money' && !votePhone) { toast.error('Enter your phone number'); return; }
    if (votePayMethod === 'manual') {
      setVoteDialog(false);
      setManualDialog({
        open: true,
        service: 'vote',
        amount,
        metadata: {
          nominee_id: voteNominee.id,
          category_id: voteNominee.category_id,
          nominee_name: voteNominee.name,
          vote_count: Math.floor(amount / voteMin),
        },
        name: voteNominee.name,
        phone: votePhone,
      });
      return;
    }
    setVoteLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const idempotencyKey = generateIdempotencyKey();
      const { data, error } = await supabase.functions.invoke('lipila-payment', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: {
          amount,
          payment_method: votePayMethod,
          phone_number: votePayMethod === 'mobile_money' ? votePhone : undefined,
          description: `Vote for ${voteNominee.name}`,
          idempotency_key: idempotencyKey,
          payment_type: 'vote',
          user_id: user.id,
          metadata: { nominee_id: voteNominee.id, category_id: voteNominee.category_id, user_id: user.id, vote_count: Math.floor(amount / voteMin) }
        }
      });
      console.log('[vote] invoke — data:', JSON.stringify(data), 'error:', error?.message);
      if (data?.status === 'insufficient_funds') { toast.error('Insufficient funds. Please top up your mobile money and try again.'); return; }
      if (data?.error) { toast.error(data.error); return; }
      if (error) { toast.error(error.message || 'Payment initiation failed. Please try again.'); return; }
      if (data?.payment_url) window.open(data.payment_url, '_blank');
      toast.success(`Voting payment initiated. Your ${Math.floor(amount / voteMin)} vote(s) will be counted once payment is verified.`);
      setVoteDialog(false);
      setVoteAmount(''); setVotePhone('');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to initiate vote payment');
    } finally { setVoteLoading(false); }
  };

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

  return (
    <div className="min-h-screen pt-20 pb-24 lg:pb-6">
      <div className="max-w-7xl mx-auto px-4">
        <BackToHome />
        <div className="py-6 border-b border-border mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-1">
            <Trophy className="h-6 w-6 text-accent" /> ZedVevo Awards
          </h1>
          <p className="text-sm text-muted-foreground">Vote for your favourite nominees</p>
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
            <div className="flex gap-2 overflow-x-auto scroll-row pb-3 mb-6">
              {awards.map(award => (
                <button
                  key={award.id}
                  onClick={() => setSelectedAward(award)}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{selectedAward.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedAward.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Badge variant={selectedAward.voting_open ? 'default' : 'secondary'} className="text-xs">
                      {selectedAward.voting_open ? 'Voting Open' : 'Voting Closed'}
                    </Badge>
                    {user && (
                      <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        onClick={() => setNomDialog(true)}>
                        Register as Nominee ({formatCurrency(nomineeFee)})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-8">
                  {(selectedAward.award_categories || []).map(cat => {
                    const catNominees = nominees[cat.id] || [];
                    return (
                      <div key={cat.id} className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-sm">{cat.name}</h3>
                            {cat.grand_prize && (
                              <p className="text-xs text-accent mt-0.5">Prize: {cat.grand_prize}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{catNominees.length} nominees</span>
                        </div>
                        {catNominees.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No nominees yet in this category.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
                            {catNominees.map(nominee => (
                              <div
                                key={nominee.id}
                                className="group relative rounded-xl border border-border/60 bg-card/60 backdrop-blur-md overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-accent/50"
                              >
                                <div className="aspect-square bg-muted overflow-hidden">
                                  {nominee.photo_url
                                    ? <img src={nominee.photo_url} alt={nominee.name} loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                                        {nominee.name[0]}
                                      </div>
                                  }
                                  <button
                                    onClick={() => setShareNominee(nominee)}
                                    aria-label={`Share ${nominee.name}`}
                                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/70 backdrop-blur-md border border-border/60 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                  >
                                    <Share2 className="h-3.5 w-3.5" />
                                  </button>
                                  {nominee.is_winner && (
                                    <Badge className="absolute top-2 left-2 text-[10px] bg-accent text-accent-foreground">Winner</Badge>
                                  )}
                                </div>
                                <div className="p-3 space-y-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{nominee.name}</p>
                                    {nominee.song_title && (
                                      <p className="text-xs text-muted-foreground truncate">{nominee.song_title}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-1 text-xs font-medium text-accent">
                                      <Heart className="h-3.5 w-3.5" />
                                      {nominee.total_votes.toLocaleString()}
                                      <span className="text-muted-foreground font-normal">votes</span>
                                    </span>
                                    {selectedAward.voting_open && user && (
                                      <Button size="sm" className="h-7 text-xs bg-accent hover:bg-accent/90 text-accent-foreground"
                                        onClick={() => { setVoteNominee(nominee); setVoteDialog(true); }}
                                      >
                                        Vote
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Nomination Dialog — shows ALL awards + ALL their categories */}
      <Dialog open={nomDialog} onOpenChange={(open) => {
        setNomDialog(open);
        if (!open) { setNomName(''); setNomPhone(''); setNomCategoryId(''); setNomAwardId(''); }
      }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register as Nominee</DialogTitle>
            <DialogDescription>
              Registration fee: <strong>{formatCurrency(nomineeFee)}</strong>. Your nomination will be confirmed after successful payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Step 1 — pick an award */}
            <div>
              <Label>Award *</Label>
              <Select value={nomAwardId} onValueChange={handleNomAwardChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select award" />
                </SelectTrigger>
                <SelectContent>
                  {awards.map(aw => (
                    <SelectItem key={aw.id} value={aw.id}>{aw.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Step 2 — pick a category (filtered to chosen award) */}
            <div>
              <Label>Category *</Label>
              <Select
                value={nomCategoryId}
                onValueChange={setNomCategoryId}
                disabled={!nomAwardId || nomCategories.length === 0}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={
                    !nomAwardId ? 'Select an award first' :
                    nomCategories.length === 0 ? 'No categories available' :
                    'Select category'
                  } />
                </SelectTrigger>
                <SelectContent>
                  {nomCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Your Name / Artist Name *</Label>
              <Input className="mt-1" value={nomName} onChange={e => setNomName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div>
              <Label>Payment Method *</Label>
              <Select value={nomPayMethod} onValueChange={v => setNomPayMethod(v as 'mobile_money' | 'card' | 'manual')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allowsAutomatic && <SelectItem value="mobile_money">Mobile Money</SelectItem>}
                  {allowsAutomatic && <SelectItem value="card">Card</SelectItem>}
                  {allowsManual && <SelectItem value="manual">Manual payment (WhatsApp approval)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {nomPayMethod === 'mobile_money' && (
              <div>
                <Label>Phone Number *</Label>
                <Input className="mt-1" value={nomPhone} onChange={e => setNomPhone(e.target.value)} placeholder="e.g. 0977123456" />
              </div>
            )}
            <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-accent mt-0.5" />
              Your nomination will only be confirmed after Lipila verifies your payment.
            </div>
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

      {/* Vote Dialog */}
      <Dialog open={voteDialog} onOpenChange={setVoteDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vote for {voteNominee?.name}</DialogTitle>
            <DialogDescription>
              Minimum vote: <strong>{formatCurrency(voteMin)}</strong> = 1 vote. Votes are only added after successful payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Vote Amount (ZMW) *</Label>
              <Input
                className="mt-1"
                type="number"
                min={voteMin}
                step="5"
                value={voteAmount}
                onChange={e => setVoteAmount(e.target.value)}
                placeholder={`Min. ${formatCurrency(voteMin)}`}
              />
              {voteAmount && parseFloat(voteAmount) >= voteMin && (
                <p className="text-xs text-muted-foreground mt-1">
                  = {Math.floor(parseFloat(voteAmount) / voteMin)} vote(s)
                </p>
              )}
            </div>
            <div>
              <Label>Payment Method *</Label>
              <Select value={votePayMethod} onValueChange={v => setVotePayMethod(v as 'mobile_money' | 'card' | 'manual')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allowsAutomatic && <SelectItem value="mobile_money">Mobile Money</SelectItem>}
                  {allowsAutomatic && <SelectItem value="card">Card</SelectItem>}
                  {allowsManual && <SelectItem value="manual">Manual payment (WhatsApp approval)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {votePayMethod === 'mobile_money' && (
              <div>
                <Label>Phone Number *</Label>
                <Input className="mt-1" value={votePhone} onChange={e => setVotePhone(e.target.value)} placeholder="e.g. 0977123456" />
              </div>
            )}
            <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-accent mt-0.5" />
              Votes are only added after Lipila confirms your payment. Never activated from the frontend.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialog(false)}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleVote} disabled={voteLoading}>
              {voteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Pay & Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share a nominee — uses the OG share endpoint so the photo shows up */}
      <ShareSheet
        open={!!shareNominee}
        onClose={() => setShareNominee(null)}
        url={shareNominee ? buildShareUrl('nominee', shareNominee.id) : ''}
        title={shareNominee?.name || ''}
        text={shareNominee ? `Vote for ${shareNominee.name} in the ZedVevo Awards` : undefined}
        thumbnailUrl={shareNominee?.photo_url}
      />

      {/* Manual payment — WhatsApp approval flow */}
      {manualDialog && (
        <ManualPaymentDialog
          open={manualDialog.open}
          onClose={() => setManualDialog(null)}
          serviceType={manualDialog.service}
          amount={manualDialog.amount}
          metadata={manualDialog.metadata}
          defaultName={manualDialog.name}
          defaultPhone={manualDialog.phone}
        />
      )}
    </div>
  );
}
