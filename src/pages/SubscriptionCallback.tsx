import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function SubscriptionCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: profile } = useUserProfile();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentStatus = searchParams.get('status');
      const sessionId = searchParams.get('session_id');
      const reference = searchParams.get('reference') || searchParams.get('trxref');

      if (paymentStatus === 'cancelled') {
        setStatus('failed');
        setMessage('Payment was cancelled. Please try again.');
        return;
      }

      if (!profile?.organization_id) {
        // Wait for profile to load
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-subscription-payment', {
          body: {
            sessionId,
            reference,
            organizationId: profile.organization_id,
          },
        });

        if (error) throw error;

        if (data?.verified) {
          setStatus('success');
          setMessage('Your subscription is now active! Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        setStatus('failed');
        setMessage(error.message || 'Failed to verify payment');
      }
    };

    if (profile?.organization_id) {
      verifyPayment();
    }
  }, [searchParams, profile?.organization_id, navigate]);

  return (
    <AuthLayout
      title={status === 'verifying' ? 'Verifying Payment' : status === 'success' ? 'Payment Successful!' : 'Payment Failed'}
      subtitle={message}
    >
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        {status === 'verifying' && (
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        )}
        {status === 'success' && (
          <CheckCircle className="h-16 w-16 text-primary" />
        )}
        {status === 'failed' && (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <div className="space-y-3 w-full">
              <Button onClick={() => navigate('/choose-plan')} className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/support')} className="w-full">
                Contact Support
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
