import { useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ManualPaymentsPanel from '@/components/admin/ManualPaymentsPanel';
import { getAllPayments } from '@/lib/api';
import { formatDate, formatCurrency, getPaymentStatusColor, getPaymentStatusLabel } from '@/lib/utils';
import type { Payment } from '@/types/index';

type StatusFilter = 'all' | 'successful' | 'pending' | 'failed' | 'cancelled';
type MethodFilter = 'all' | 'mobile_money' | 'card';

export default function AdminPaymentsPage() {
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');

  useEffect(() => {
    getAllPayments()
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.lipila_transaction_id?.toLowerCase().includes(q) || p.user_id?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchMethod = methodFilter === 'all' || p.payment_method === methodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  const totalRevenue = payments.filter(p => p.status === 'successful').reduce((a, p) => a + p.amount, 0);
  const successCount = payments.filter(p => p.status === 'successful').length;

  const exportCsv = () => {
    const rows = [
      ['Date', 'Type', 'Method', 'Amount', 'Status', 'Transaction ID'],
      ...filtered.map(p => [
        formatDate(p.created_at), p.payment_type, p.payment_method,
        p.amount, p.status, p.lipila_transaction_id || '',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'payments.csv'; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            {successCount} successful · Total revenue {formatCurrency(totalRevenue)}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" />Export CSV
        </Button>
      </div>

      <Tabs defaultValue="automatic">
        <TabsList className="h-8 flex-wrap">
          <TabsTrigger value="automatic" className="text-xs">Automatic</TabsTrigger>
          <TabsTrigger value="manual" className="text-xs">Manual (WhatsApp)</TabsTrigger>
        </TabsList>

        <TabsContent value="automatic" className="mt-4 space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by transaction ID or user…" className="pl-9 h-8 text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="successful">Successful</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={v => setMethodFilter(v as MethodFilter)}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue placeholder="All methods" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="mobile_money">Mobile Money</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/40">
            <tr>
              {['Date', 'Type', 'Method', 'Amount', 'Status', 'Transaction ID'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-t border-border">
                <td colSpan={6} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td>
              </tr>
            )) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground text-xs">No payments found</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-xs">{formatDate(p.created_at)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap capitalize">{p.payment_type.replace('_', ' ')}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <Badge variant="outline" className="text-[10px] capitalize">{p.payment_method.replace('_', ' ')}</Badge>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap font-semibold">{formatCurrency(p.amount)}</td>
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <span className={`text-xs font-medium ${getPaymentStatusColor(p.status)}`}>{getPaymentStatusLabel(p.status)}</span>
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-[10px] font-mono">{p.lipila_transaction_id || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {payments.length} payments</p>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <ManualPaymentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
