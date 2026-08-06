import { supabase } from '@/db/supabase';
import type {
  ManualPayment,
  ManualPaymentConfig,
  ManualPaymentInput,
  ManualPaymentStatus,
  PaymentMode,
} from '@/types/manualPayment';
import { SERVICE_LABELS, validateProofFile } from '@/types/manualPayment';

const PROOF_BUCKET = 'payment-proofs';

/** Reads the manual payment configuration out of `app_settings`. */
export function readManualPaymentConfig(settings: Record<string, string>): ManualPaymentConfig {
  const rawMode = (settings.payment_mode || 'both') as PaymentMode;
  const mode: PaymentMode =
    rawMode === 'automatic' || rawMode === 'manual' ? rawMode : 'both';
  return {
    mode,
    whatsappGroupLink: settings.whatsapp_group_link || 'https://chat.whatsapp.com/HREug1CcIlOAP2sIkZ8sLL',
    accountName: settings.manual_payment_name || '',
    accountNumber: settings.manual_payment_number || '',
    provider: settings.manual_payment_provider || 'Mobile Money',
    instructions:
      settings.manual_payment_instructions ||
      'Send the exact amount to the number above, then submit your payment details and proof for verification.',
  };
}

/** Uploads a proof file into the private `payment-proofs` bucket (per-user folder). */
export async function uploadPaymentProof(userId: string, file: File): Promise<string> {
  const invalid = validateProofFile(file);
  if (invalid) throw new Error(invalid);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/** Signed URL so admins (and owners) can open a stored proof. */
export async function getProofUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

/** Creates a pending manual payment record after uploading its proof. */
export async function createManualPayment(
  userId: string,
  input: ManualPaymentInput
): Promise<ManualPayment> {
  const proofPath = await uploadPaymentProof(userId, input.proof);
  const { data, error } = await supabase
    .from('manual_payments')
    .insert({
      user_id: userId,
      service_type: input.service_type,
      amount: input.amount,
      payer_name: input.payer_name.trim(),
      payer_phone: input.payer_phone.trim(),
      payment_reference: input.payment_reference.trim(),
      notes: input.notes?.trim() || null,
      metadata: input.metadata ?? {},
      proof_url: proofPath,
      proof_mime: input.proof.type,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ManualPayment;
}

export async function markSubmittedToWhatsapp(id: string): Promise<void> {
  const { error } = await supabase
    .from('manual_payments')
    .update({ submitted_to_whatsapp: true })
    .eq('id', id);
  if (error) throw error;
}

export async function getMyManualPayments(userId: string): Promise<ManualPayment[]> {
  const { data, error } = await supabase
    .from('manual_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? (data as ManualPayment[]) : [];
}

export async function getAllManualPayments(
  status: ManualPaymentStatus | 'all' = 'all'
): Promise<ManualPayment[]> {
  let q = supabase
    .from('manual_payments')
    .select('*, profiles:user_id(display_name, email)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return Array.isArray(data) ? (data as ManualPayment[]) : [];
}

/** Approves a manual payment and activates the purchased service (admin only). */
export async function approveManualPayment(id: string): Promise<ManualPayment> {
  const { data, error } = await supabase.rpc('approve_manual_payment', { p_id: id });
  if (error) throw error;
  return data as ManualPayment;
}

export async function rejectManualPayment(id: string, reason: string): Promise<ManualPayment> {
  const { data, error } = await supabase.rpc('reject_manual_payment', {
    p_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  return data as ManualPayment;
}

/** Message the user posts in the official WhatsApp approval group. */
export function buildWhatsappMessage(payment: ManualPayment): string {
  return [
    '*ZedVevo Manual Payment*',
    `Service: ${SERVICE_LABELS[payment.service_type]}`,
    `Amount: ${payment.currency} ${Number(payment.amount).toFixed(2)}`,
    `Name: ${payment.payer_name}`,
    `Phone: ${payment.payer_phone}`,
    `Reference: ${payment.payment_reference}`,
    `Request ID: ${payment.id}`,
    '',
    'Proof of payment attached. Please verify and approve.',
  ].join('\n');
}

/** Opens the official WhatsApp approval group with the details copied to clipboard. */
export async function openWhatsappApprovalGroup(
  groupLink: string,
  message: string
): Promise<void> {
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    /* clipboard unavailable — user can still paste manually */
  }
  const target = groupLink || `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(target, '_blank', 'noopener,noreferrer');
}
