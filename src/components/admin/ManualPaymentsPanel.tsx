import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  approveManualPayment, getAllManualPayments, getProofUrl, rejectManualPayment,
} from '@/lib/manualPayments';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ManualPayment, ManualPaymentStatus } from '@/types/manualPayment';
import { SERVICE_LABELS } from '@/types/manualPayment';

type Filter = ManualPaymentStatus | 'all';

const STATUS_STYLES: Record<ManualPaymentStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-600',
  approved: 'bg-green-500/15 text-green-600',
  rejected: 'bg-destructive/15 text-destructive',
};

export default function ManualPaymentsPanel() {
  const [rows, setRows]       = useState<ManualPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>('pending');
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<ManualPayment | null>(null);
  const [reason, setReason]   = useState('');

  const load = (f: Filter) => {
    setLoading(true);
    getAllManualPayments(f)
      .then(setRows)
      .catch(e => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const openProof = async (p: ManualPayment) => {
    if (!p.proof_url) { toast.error('No proof attached'); return; }
    try { window.open(await getProofUrl(p.proof_url), '_blank', 'noopener,noreferrer'); }
    catch { toast.error('Could not open proof'); }
  };

  const handleApprove = async (p: ManualPayment) => {
    setBusyId(p.id);
    try {
      await approveManualPayment(p.id);
      toast.success(`${SERVICE_LABELS[p.service_type]} activated`);
      load(filter);
    } catch (e: unknown) { toast.error((e as Error).message || 'Approval failed'); }
    finally { setBusyId(null); }
  };

  const handleReject = async () => {
    if (!rejectFor) return;
    setBusyId(rejectFor.id);
    try {
      await rejectManualPayment(rejectFor.id, reason);
      toast.success('Payment rejected');
      setRejectFor(null); setReason('');
      load(filter);
    } catch (e: unknown) { toast.error((e as Error).message || 'Rejection failed'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Payments submitted through the WhatsApp approval flow. Approving activates the service instantly.
        </p>
        <Select value={filter} onValueChange={v => setFilter(v as Filter)}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              {['Date', 'Service', 'Payer', 'Amount', 'Reference', 'Proof', 'Status', 'Action'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-3"><Skeleton className="h-5 w-full" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-sm">No manual payments here.</td></tr>
            ) : rows.map(p => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2.5 px-3 whitespace-nowrap text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">{SERVICE_LABELS[p.service_type]}</td>
                <td className="py-2.5 px-3">
                  <p className="font-medium">{p.payer_name}</p>
                  <p className="text-xs text-muted-foreground">{p.payer_phone}</p>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap font-semibold">{formatCurrency(p.amount)}</td>
                <td className="py-2.5 px-3 font-mono text-xs">{p.payment_reference}</td>
                <td className="py-2.5 px-3">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openProof(p)}>
                    <ExternalLink className="h-3 w-3" />View
                  </Button>
                </td>
                <td className="py-2.5 px-3">
                  <Badge className={`text-[10px] ${STATUS_STYLES[p.status]}`}>{p.status}</Badge>
                  {!p.submitted_to_whatsapp && p.status === 'pending' && (
                    <p className="text-[10px] text-muted-foreground mt-1">not sent to group</p>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  {p.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-600/90 text-white"
                        disabled={busyId === p.id} onClick={() => handleApprove(p)}>
                        {busyId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive"
                        disabled={busyId === p.id} onClick={() => { setRejectFor(p); setReason(''); }}>
                        <XCircle className="h-3 w-3" />Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {p.reviewed_at ? formatDate(p.reviewed_at) : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!rejectFor} onOpenChange={v => { if (!v) setRejectFor(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>Reject payment</DialogTitle></DialogHeader>
          <Input placeholder="Reason (shown to the user)" value={reason}
            onChange={e => setReason(e.target.value)} maxLength={200} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!busyId}>
              {busyId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
