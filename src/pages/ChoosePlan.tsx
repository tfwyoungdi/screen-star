import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Loader2, Crown, Zap, Building2, Rocket } from 'lucide-react';
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

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_screens: number;
  max_staff: number;
  max_locations: number;
  features: string[];
  allow_custom_domain: boolean;
  allow_own_gateway: boolean;
}

const planIcons: Record<string, React.ElementType> = {
  basic: Zap,
  pro: Crown,
  gold: Building2,
  enterprise: Rocket,
};

export default function ChoosePlan() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  // Filter out free plans - we want them to pay
  const paidPlans = plans?.filter(p => p.price_monthly > 0 || p.price_yearly > 0);

  const handleSubscribe = async () => {
    if (!selectedPlan || !profile?.organization_id) {
      toast.error('Please select a plan');
      return;
    }

    const plan = paidPlans?.find(p => p.id === selectedPlan);
    if (!plan) return;

    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    
    if (price === 0) {
      toast.error('Please select a paid plan');
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-subscription-payment', {
        body: {
          planId: selectedPlan,
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

  const getYearlySavings = (plan: SubscriptionPlan) => {
    const monthlyCost = plan.price_monthly * 12;
    const yearlyCost = plan.price_yearly;
    const savings = monthlyCost - yearlyCost;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return { savings, percentage };
  };

  if (plansLoading) {
    return (
      <AuthLayout title="Choose Your Plan" subtitle="Select the perfect plan for your cinema">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose Your Plan" subtitle="Select the perfect plan for your cinema">
      <div className="space-y-6">
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
                <Badge variant="secondary" className="ml-2 text-xs">Save up to 20%</Badge>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4">
          {paidPlans?.map((plan) => {
            const Icon = planIcons[plan.slug] || Zap;
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const { percentage } = getYearlySavings(plan);
            const isSelected = selectedPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <CardDescription className="text-sm">{plan.description}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${price}</div>
                      <div className="text-xs text-muted-foreground">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </div>
                      {billingCycle === 'yearly' && percentage > 0 && (
                        <Badge variant="outline" className="text-xs text-primary mt-1">
                          Save {percentage}%
                        </Badge>
                      )}
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
            );
          })}
        </div>

        {/* Subscribe Button */}
        <Button
          onClick={handleSubscribe}
          disabled={!selectedPlan || isProcessing}
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

        <Button
          variant="ghost"
          onClick={() => signOut()}
          className="w-full"
        >
          Sign out
        </Button>
      </div>
    </AuthLayout>
  );
}
