import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZM', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return `K${Number(amount).toFixed(2)}`;
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function snakeCaseFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]/g, '_').replace(/_+/g, '_');
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'successful': return 'text-green-600';
    case 'pending': return 'text-yellow-600';
    case 'failed': case 'invalid_transaction': return 'text-destructive';
    case 'cancelled': return 'text-muted-foreground';
    case 'insufficient_funds': return 'text-orange-600';
    default: return 'text-muted-foreground';
  }
}

export function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'successful': return 'Successful';
    case 'pending': return 'Pending';
    case 'failed': return 'Failed';
    case 'cancelled': return 'Cancelled';
    case 'insufficient_funds': return 'Insufficient Funds';
    case 'invalid_transaction': return 'Invalid Transaction';
    default: return status;
  }
}
