import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Copy, FileText, Loader2, MessageCircle, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import {
  buildWhatsappMessage, createManualPayment, markSubmittedToWhatsapp, openWhatsappApprovalGroup,
} from '@/lib/manualPayments';
import { formatCurrency } from '@/lib/utils';
import type {
  ManualPayment, ManualPaymentMetadata, ManualServiceType,
} from '@/types/manualPayment';
import {
  ACCEPTED_PROOF_EXTENSIONS, SERVICE_LABELS, validateProofFile,
} from '@/types/manualPayment';

interface ManualPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  serviceType: ManualServiceType;
  amount: number;
  /** Service payload used by the approval RPC to activate the service. */
  metadata?: ManualPaymentMetadata;
  defaultName?: string;
  defaultPhone?: string;
  /** Fired once the record is created (before/after the WhatsApp hand-off). */
  onSubmitted?: (payment: ManualPayment) => void;
}

export default function ManualPaymentDialog({
  open, onClose, serviceType, amount, metadata, defaultName, defaultPhone, onSubmitted,
}: ManualPaymentDialogProps) {
  const { user } = useAuth();
  const { config, loading: configLoading } = usePaymentConfig();

  const [name, setName] = useState(defaultName ?? '');
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<ManualPayment | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName ?? '');
    setPhone(defaultPhone ?? '');
    setReference(''); setNotes(''); setProof(null); setCreated(null);
  }, [open, defaultName, defaultPhone]);

  const payTo = useMemo(
    () => [config.accountName, config.accountNumber].filter(Boolean).join(' · '),
    [config.accountName, config.accountNumber]
  );

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(config.accountNumber);
      toast.success('Payment number copied');
    } catch { toast.error('Could not copy number'); }
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Sign in to submit a manual payment'); return; }
    if (!name.trim())      { toast.error('Enter the name used to pay'); return; }
    if (!phone.trim())     { toast.error('Enter the phone number used to pay'); return; }
    if (!reference.trim()) { toast.error('Enter the transaction reference'); return; }
    const proofError = validateProofFile(proof);
    if (proofError) { toast.error(proofError); return; }

    setSubmitting(true);
    try {
      const payment = await createManualPayment(user.id, {
        service_type: serviceType,
        amount,
        payer_name: name,
        payer_phone: phone,
        payment_reference: reference,
        notes,
        metadata,
        proof: proof as File,
      });
      setCreated(payment);
      onSubmitted?.(payment);
      toast.success('Payment submitted — now send it to the WhatsApp approval group');
    } catch (e: unknown) {
      const msg = (e as Error).message || 'Failed to submit payment';
      toast.error(msg.includes('duplicate') ? 'That transaction reference was already submitted' : msg);
    } finally { setSubmitting(false); }
  };

  const handleWhatsapp = async () => {
    if (!created) return;
    await openWhatsappApprovalGroup(config.whatsappGroupLink, buildWhatsappMessage(created));
    try {
      await markSubmittedToWhatsapp(created.id);
      setCreated({ ...created, submitted_to_whatsapp: true });
    } catch { /* non-blocking */ }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !submitting) onClose(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Payment — {SERVICE_LABELS[serviceType]}</DialogTitle>
          <DialogDescription>
            Amount due: <strong className="text-accent">{formatCurrency(amount)}</strong>. Your service is
            activated only after an admin verifies your payment in the official WhatsApp approval group.
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Payment details submitted</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Reference <span className="font-mono">{created.payment_reference}</span> · status pending approval.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Final step</p>
              <p>
                Open the official WhatsApp approval group and post your payment details (we copied them to your
                clipboard) together with your proof of payment screenshot or PDF.
              </p>
            </div>

            <Button
              className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white"
              onClick={handleWhatsapp}
              disabled={configLoading}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Send to WhatsApp approval group
            </Button>
            {created.submitted_to_whatsapp && (
              <p className="text-xs text-center text-muted-foreground">
                Marked as sent. An admin will approve it shortly.
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" className="w-full" onClick={onClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Official payment details */}
            <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Pay to</p>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{payTo || 'Payment details not configured'}</p>
                  <p className="text-xs text-muted-foreground">{config.provider}</p>
                </div>
                {config.accountNumber && (
                  <Button size="sm" variant="outline" className="h-8 px-2 shrink-0" onClick={copyNumber}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground pt-1">{config.instructions}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Name used to pay *</Label>
                <Input className="mt-1" value={name} onChange={e => setName(e.target.value)}
                  maxLength={100} placeholder="Full name" />
              </div>
              <div>
                <Label>Phone used to pay *</Label>
                <Input className="mt-1" value={phone} onChange={e => setPhone(e.target.value)}
                  maxLength={20} placeholder="e.g. 0977123456" />
              </div>
            </div>

            <div>
              <Label>Transaction reference *</Label>
              <Input className="mt-1" value={reference} onChange={e => setReference(e.target.value)}
                maxLength={64} placeholder="e.g. MP240517.1234.A56789" />
            </div>

            <div>
              <Label>Proof of payment * <span className="text-xs text-muted-foreground">(JPG, PNG or PDF, max 5MB)</span></Label>
              <Input
                className="mt-1 cursor-pointer"
                type="file"
                accept={ACCEPTED_PROOF_EXTENSIONS}
                onChange={e => {
                  const f = e.target.files?.[0] || null;
                  const err = validateProofFile(f);
                  if (f && err) { toast.error(err); setProof(null); e.target.value = ''; return; }
                  setProof(f);
                }}
              />
              {proof && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" />{proof.name}
                </p>
              )}
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea className="mt-1" rows={2} maxLength={500} value={notes}
                onChange={e => setNotes(e.target.value)} placeholder="Anything the admin should know" />
            </div>

            <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-accent mt-0.5" />
              After submitting you will be guided to the official WhatsApp approval group. The service stays
              inactive until an admin verifies the payment.
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
                  : <><Upload className="h-4 w-4 mr-2" />Submit payment details</>}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
