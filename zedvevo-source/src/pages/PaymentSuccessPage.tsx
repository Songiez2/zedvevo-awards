import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Clock, Music2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';

type State = 'loading' | 'success' | 'pending' | 'failed';

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = params.get('payment_id');
  const [state, setState] = useState<State>('loading');
  const [countdown, setCountdown] = useState(5);
  const [info, setInfo] = useState<{
    amount?: number;
    currency?: string;
    donorName?: string;
    paymentType?: string;
  } | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getRedirectPath = (paymentType?: string) => {
    if (paymentType === 'nominee_registration' || paymentType === 'vote') return '/awards';
    return '/';
  };

  // Start countdown + auto-redirect when success confirmed
  const startAutoRedirect = (paymentType?: string) => {
    const target = getRedirectPath(paymentType);
    let secs = 5;
    setCountdown(secs);
    countdownRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(countdownRef.current!);
        navigate(target, { replace: true });
      }
    }, 1000);
  };

  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  useEffect(() => {
    if (!paymentId) { setState('failed'); return; }

    let cancelled = false;
    const MAX = 24; // poll up to 2 min at 5s intervals

    const check = async (attempt: number) => {
      if (cancelled) return;
      try {
        const { data } = await supabase.functions.invoke('verify-donation-payment', {
          body: { payment_id: paymentId },
        });

        if (cancelled) return;
        const status = data?.status;

        if (status === 'completed' || status === 'successful') {
          const pType = data?.payment_type as string | undefined;
          setInfo({ amount: data.amount, currency: data.currency, donorName: data.donor_name, paymentType: pType });
          setState('success');
          startAutoRedirect(pType);
          return;
        }
        if (status === 'failed' || status === 'insufficient_funds') {
          setState('failed');
          return;
        }
        // Still pending
        if (attempt === 0) setState('pending');
        if (attempt < MAX) setTimeout(() => check(attempt + 1), 5000);
      } catch {
        if (attempt < MAX) setTimeout(() => check(attempt + 1), 5000);
        else setState('failed');
      }
    };

    check(0);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const isAwardsPayment = info?.paymentType === 'nominee_registration' || info?.paymentType === 'vote';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center space-y-6">

        {state === 'loading' && (
          <>
            <Loader2 className="h-14 w-14 mx-auto animate-spin text-accent" />
            <p className="text-muted-foreground">Checking payment status…</p>
          </>
        )}

        {state === 'pending' && (
          <>
            <div className="mx-auto h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center">
              <Clock className="h-10 w-10 text-accent animate-pulse" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold">Waiting for confirmation</h1>
              <p className="text-muted-foreground text-sm">
                Please approve the mobile money PIN prompt on your phone. This page updates automatically.
              </p>
              <Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground mt-2" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              Return home — payment will still process
            </Button>
          </>
        )}

        {state === 'success' && (
          <>
            <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center ${isAwardsPayment ? 'bg-accent/10' : 'bg-green-500/10'}`}>
              {isAwardsPayment
                ? <Trophy className="h-10 w-10 text-accent" />
                : <CheckCircle2 className="h-10 w-10 text-green-500" />
              }
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">
                {info?.paymentType === 'nominee_registration'
                  ? 'Nomination Registered! 🏆'
                  : info?.paymentType === 'vote'
                  ? 'Vote Confirmed! 🗳'
                  : 'Thank you! 🎵'
                }
              </h1>
              {info?.amount && (
                <p className="text-lg font-semibold text-accent">
                  K{Number(info.amount).toFixed(0)} {info.currency?.toUpperCase() ?? 'ZMW'} received
                </p>
              )}
              <p className="text-muted-foreground text-sm">
                {info?.paymentType === 'nominee_registration'
                  ? 'Your nomination is being reviewed. Check the Awards page for status updates.'
                  : info?.paymentType === 'vote'
                  ? 'Your votes will be counted once payment is fully verified by Lipila.'
                  : 'Your donation helps keep Zambian music free for everyone.'
                }
                {info?.donorName && <><br />Thank you, <span className="font-medium">{info.donorName}</span>!</>}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Redirecting to {isAwardsPayment ? 'Awards' : 'ZedVevo'} in {countdown}s…
            </p>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => {
                clearInterval(countdownRef.current!);
                navigate(getRedirectPath(info?.paymentType), { replace: true });
              }}>
              {isAwardsPayment
                ? <><Trophy className="h-4 w-4 mr-2" />Go to Awards</>
                : <><Music2 className="h-4 w-4 mr-2" />Back to ZedVevo</>
              }
            </Button>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="mx-auto h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold">Payment not confirmed</h1>
              <p className="text-muted-foreground text-sm">
                The payment could not be confirmed. If your mobile money was deducted, please contact support.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Return Home
            </Button>
          </>
        )}

      </div>
    </div>
  );
}
