import { useCallback, useEffect, useState } from 'react';
import { Clock, ExternalLink, MessageCircle, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import {
  buildWhatsappMessage, getMyManualPayments, getProofUrl,
  markSubmittedToWhatsapp, openWhatsappApprovalGroup,
} from '@/lib/manualPayments';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ManualPayment, ManualPaymentStatus } from '@/types/manualPayment';
import { SERVICE_LABELS } from '@/types/manualPayment';

const STATUS_STYLES: Record<ManualPaymentStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-600',
  approved: 'bg-green-500/15 text-green-600',
  rejected: 'bg-destructive/15 text-destructive',
};

/** User-facing list of manual payments with live status updates. */
export default function MyManualPayments() {
  const { user } = useAuth();
  const { config } = usePaymentConfig();
  const [rows, setRows] = useState<ManualPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    getMyManualPayments(user.id)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime: reflect admin approval / rejection instantly.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`manual-payments-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'manual_payments', filter: `user_id=eq.${user.id}` },
        payload => {
          const updated = payload.new as ManualPayment;
          setRows(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
          if (updated.status === 'approved') {
            toast.success(`${SERVICE_LABELS[updated.service_type]} approved — your service is now active`);
          } else if (updated.status === 'rejected') {
            toast.error(`Payment rejected${updated.rejection_reason ? `: ${updated.rejection_reason}` : ''}`);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const openProof = async (p: ManualPayment) => {
    if (!p.proof_url) return;
    try { window.open(await getProofUrl(p.proof_url), '_blank', 'noopener,noreferrer'); }
    catch { toast.error('Could not open your receipt'); }
  };

  const resend = async (p: ManualPayment) => {
    await openWhatsappApprovalGroup(config.whatsappGroupLink, buildWhatsappMessage(p));
    try { await markSubmittedToWhatsapp(p.id); load(); } catch { /* non-blocking */ }
  };

  if (loading) return <Skeleton className="h-32 rounded-lg" />;

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No manual payments submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map(p => (
        <div key={p.id} className="p-3 border border-border rounded-lg bg-card/60 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{SERVICE_LABELS[p.service_type]}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(p.created_at)} · ref <span className="font-mono">{p.payment_reference}</span>
              </p>
              {p.status === 'rejected' && p.rejection_reason && (
                <p className="text-xs text-destructive mt-1">Reason: {p.rejection_reason}</p>
              )}
              {p.status === 'pending' && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />Awaiting admin verification
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
              <Badge className={`text-[10px] mt-1 ${STATUS_STYLES[p.status]}`}>{p.status}</Badge>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {p.proof_url && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openProof(p)}>
                <ExternalLink className="h-3 w-3" />Receipt
              </Button>
            )}
            {p.status === 'pending' && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => resend(p)}>
                <MessageCircle className="h-3 w-3" />
                {p.submitted_to_whatsapp ? 'Resend to WhatsApp' : 'Send to WhatsApp'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
