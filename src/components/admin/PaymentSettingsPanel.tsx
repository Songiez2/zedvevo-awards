import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { PaymentMode } from '@/types/manualPayment';

interface Props {
  settings: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void> | void;
  saving: Record<string, boolean>;
}

const FIELDS: { key: string; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: 'manual_payment_name',     label: 'Account name',        placeholder: 'ZedVevo Ltd' },
  { key: 'manual_payment_number',   label: 'Account / phone number', placeholder: '0977123456' },
  { key: 'manual_payment_provider', label: 'Provider',            placeholder: 'MTN Mobile Money' },
  { key: 'whatsapp_group_link',     label: 'WhatsApp approval group link', placeholder: 'https://chat.whatsapp.com/…' },
  { key: 'manual_payment_instructions', label: 'Instructions shown to users', placeholder: 'Send the exact amount…', textarea: true },
];

/** Admin control for switching between automatic and manual payments. */
export default function PaymentSettingsPanel({ settings, onSave, saving }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => { setValues({ ...settings }); }, [settings]);

  const mode = (values.payment_mode || 'both') as PaymentMode;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label>Payment mode</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Controls what users see when paying for nominations, votes and uploads.
            </p>
            <Select value={mode} onValueChange={v => onSave('payment_mode', v)}>
              <SelectTrigger className="h-9 text-sm max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatic only (mobile money / card)</SelectItem>
                <SelectItem value="manual">Manual only (WhatsApp approval)</SelectItem>
                <SelectItem value="both">Both — let users choose</SelectItem>
              </SelectContent>
            </Select>
            {saving.payment_mode && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />Saving…
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-semibold">Manual payment details</p>
          {FIELDS.map(f => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <div className="flex gap-2 mt-1">
                {f.textarea ? (
                  <Textarea
                    rows={2}
                    value={values[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    value={values[f.key] || ''}
                    placeholder={f.placeholder}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  disabled={!!saving[f.key]}
                  onClick={() => onSave(f.key, values[f.key] || '')}
                >
                  {saving[f.key] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
