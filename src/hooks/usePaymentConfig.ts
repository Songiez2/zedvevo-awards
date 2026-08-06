import { useEffect, useState } from 'react';
import { getSettings } from '@/lib/api';
import { readManualPaymentConfig } from '@/lib/manualPayments';
import type { ManualPaymentConfig } from '@/types/manualPayment';

const FALLBACK: ManualPaymentConfig = {
  mode: 'both',
  whatsappGroupLink: 'https://chat.whatsapp.com/HREug1CcIlOAP2sIkZ8sLL',
  accountName: '',
  accountNumber: '',
  provider: 'Mobile Money',
  instructions:
    'Send the exact amount to the number above, then submit your payment details and proof for verification.',
};

/**
 * Reads the admin-controlled payment configuration (automatic / manual / both)
 * plus the manual payment account + WhatsApp approval group details.
 */
export function usePaymentConfig() {
  const [config, setConfig] = useState<ManualPaymentConfig>(FALLBACK);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then(s => {
        if (cancelled) return;
        setSettings(s);
        setConfig(readManualPaymentConfig(s));
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return {
    config,
    settings,
    loading,
    allowsAutomatic: config.mode === 'automatic' || config.mode === 'both',
    allowsManual: config.mode === 'manual' || config.mode === 'both',
  };
}
