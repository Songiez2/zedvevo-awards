// Manual payment (WhatsApp approval) domain types.

export type ManualServiceType =
  | 'nominee_registration'
  | 'vote'
  | 'music_upload'
  | 'video_upload';

export type ManualPaymentStatus = 'pending' | 'approved' | 'rejected';

/** How the platform accepts money — controlled by admins in Settings → Payments. */
export type PaymentMode = 'automatic' | 'manual' | 'both';

export interface ManualPaymentMetadata {
  award_id?: string;
  category_id?: string;
  nominee_id?: string;
  nominee_name?: string;
  song_title?: string;
  photo_url?: string;
  vote_count?: number;
  plan_id?: string;
  plan_type?: string;
  [key: string]: unknown;
}

export interface ManualPayment {
  id: string;
  user_id: string;
  service_type: ManualServiceType;
  amount: number;
  currency: string;
  payer_name: string;
  payer_phone: string;
  payment_reference: string;
  proof_url?: string | null;
  proof_mime?: string | null;
  notes?: string | null;
  metadata: ManualPaymentMetadata;
  status: ManualPaymentStatus;
  submitted_to_whatsapp: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { display_name?: string | null; email?: string | null } | null;
}

export interface ManualPaymentInput {
  service_type: ManualServiceType;
  amount: number;
  payer_name: string;
  payer_phone: string;
  payment_reference: string;
  notes?: string;
  metadata?: ManualPaymentMetadata;
  proof: File;
}

/** Admin-configurable manual payment settings, read from `app_settings`. */
export interface ManualPaymentConfig {
  mode: PaymentMode;
  whatsappGroupLink: string;
  accountName: string;
  accountNumber: string;
  provider: string;
  instructions: string;
}

export const SERVICE_LABELS: Record<ManualServiceType, string> = {
  nominee_registration: 'Nomination Registration',
  vote: 'Vote Purchase',
  music_upload: 'Music Upload',
  video_upload: 'Video Upload',
};

export const ACCEPTED_PROOF_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
] as const;

export const ACCEPTED_PROOF_EXTENSIONS = '.jpg,.jpeg,.png,.pdf';
export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024;

/** Validates a proof-of-payment file. Returns an error message, or null when valid. */
export function validateProofFile(file: File | null): string | null {
  if (!file) return 'Attach your proof of payment (JPG, PNG or PDF)';
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const okType = (ACCEPTED_PROOF_TYPES as readonly string[]).includes(file.type);
  const okExt = ['jpg', 'jpeg', 'png', 'pdf'].includes(ext);
  if (!okType || !okExt) return 'Only JPG, JPEG, PNG and PDF files are accepted';
  if (file.size > MAX_PROOF_SIZE_BYTES) return 'File is too large — maximum size is 5MB';
  return null;
}
