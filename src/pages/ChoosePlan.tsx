import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Crown } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

type BillingCycle = 'monthly' | 'yearly';

export default function ChoosePlan() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['subscription-plan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleSubscribe = async () => {
    if (!plan || !profile?.organization_id) {
      toast.error('No plan available');
      return;
    }

    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    if (Number(price) === 0) {
      toast.error('Plan pricing not configured');
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-subscription-payment', {
        body: {
          planId: plan.id,
          billingCycle,
          organizationId: profile.organization_id,
          returnUrl: `${window.location.origin}/subscription-callback`,
        },
      });

      if (error) throw error;
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to process subscription');
      setIsProcessing(false);
    }
  };

  const getYearlySavings = () => {
    if (!plan) return { savings: 0, percentage: 0 };
    const monthlyCost = Number(plan.price_monthly) * 12;
    const yearlyCost = Number(plan.price_yearly);
    const savings = monthlyCost - yearlyCost;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return { savings, percentage };
  };

  if (isLoading) {
    return (
      <AuthLayout title="Subscribe" subtitle="Get started with your cinema">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (!plan) {
    return (
      <AuthLayout title="Subscribe" subtitle="No plan available at the moment">
        <p className="text-center text-muted-foreground">Please contact support.</p>
        <Button variant="ghost" onClick={() => signOut()} className="w-full mt-4">
          Sign out
        </Button>
      </AuthLayout>
    );
  }

  const price = billingCycle === 'monthly' ? Number(plan.price_monthly) : Number(plan.price_yearly);
  const { percentage } = getYearlySavings();

  return (
    <AuthLayout title="Subscribe" subtitle="Get full access to manage your cinema">
      <div className="space-y-6">
        {/* Plan Card */}
        <Card className="border-primary ring-2 ring-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-primary" />
                {plan.max_screens === -1 ? 'Unlimited' : plan.max_screens} screens
              </div>
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-primary" />
                {plan.max_staff === -1 ? 'Unlimited' : plan.max_staff} staff
              </div>
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-primary" />
                {plan.max_locations === -1 ? 'Unlimited' : plan.max_locations} location{plan.max_locations !== 1 ? 's' : ''}
              </div>
              {plan.allow_custom_domain && (
                <div className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-primary" />
                  Custom domain
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-lg">
          <RadioGroup
            value={billingCycle}
            onValueChange={(value) => setBillingCycle(value as BillingCycle)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yearly" id="yearly" />
              <Label htmlFor="yearly" className="cursor-pointer">
                Yearly
                {percentage > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">Save {percentage}%</Badge>
                )}
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Price Display */}
        <div className="text-center py-2">
          <div className="text-3xl font-bold">${price}</div>
          <div className="text-sm text-muted-foreground">
            /{billingCycle === 'monthly' ? 'month' : 'year'}
          </div>
        </div>

        {/* Subscribe Button */}
        <Button
          onClick={handleSubscribe}
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Subscribe & Continue'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By subscribing, you agree to our terms of service. Cancel anytime.
        </p>

        <Button variant="ghost" onClick={() => signOut()} className="w-full">
          Sign out
        </Button>
      </div>
    </AuthLayout>
  );
}
