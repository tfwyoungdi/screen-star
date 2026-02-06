import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const Pricing = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  const { data: plan, isLoading } = useQuery({
    queryKey: ['public-subscription-plan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, slug, description, price_monthly, price_yearly, max_screens, max_staff, max_locations, commission_percentage, per_ticket_fee, allow_custom_domain, allow_own_gateway')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const buildFeatures = (p: NonNullable<typeof plan>) => {
    const features: string[] = [];
    if (p.max_locations === -1) features.push("Unlimited Locations");
    else if (p.max_locations === 1) features.push("1 Cinema Location");
    else features.push(`Up to ${p.max_locations} Locations`);

    if (p.max_screens === -1) features.push("Unlimited Screens");
    else features.push(`Up to ${p.max_screens} Screens`);

    if (p.max_staff === -1) features.push("Unlimited Staff");
    else features.push(`Up to ${p.max_staff} Staff Members`);

    if (p.allow_custom_domain) features.push("Custom Domain");
    if (p.allow_own_gateway) features.push("Own Payment Gateway");
    if (p.commission_percentage) features.push(`${p.commission_percentage}% Commission`);
    if (p.per_ticket_fee) features.push(`$${p.per_ticket_fee} Per Ticket Fee`);
    return features;
  };

  const monthlyPrice = plan ? Number(plan.price_monthly) : 0;
  const yearlyPrice = plan ? Number(plan.price_yearly) : 0;
  const displayPrice = isYearly
    ? yearlyPrice > 0 ? (yearlyPrice / 12).toFixed(0) : (monthlyPrice * 0.8).toFixed(0)
    : monthlyPrice.toFixed(0);
  const yearlySavings = isYearly
    ? (monthlyPrice * 12 - (yearlyPrice || monthlyPrice * 12 * 0.8)).toFixed(0)
    : null;

  return (
    <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-chart-3/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-chart-4/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        <div className="absolute top-20 right-[15%] w-20 h-20 border border-primary/20 rounded-2xl rotate-12 hidden lg:block" />
        <div className="absolute bottom-32 left-[10%] w-16 h-16 border border-chart-3/20 rounded-full hidden lg:block" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple Pricing</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            One Plan,
            <span className="block text-primary">Everything Included</span>
          </h2>

          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            No confusing tiers. Get full access to everything you need to run your cinema successfully.
            Start free for 14 days, no credit card required.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-2 rounded-full bg-secondary/50 border border-border">
            <span className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} className="data-[state=checked]:bg-primary" />
            <span className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isYearly ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            <span className="px-3 py-1 rounded-full bg-chart-3/10 text-chart-3 text-xs font-semibold">
              -20%
            </span>
          </div>
        </div>

        {/* Single Pricing Card */}
        {isLoading ? (
          <div className="max-w-lg mx-auto">
            <Skeleton className="h-[500px] rounded-3xl" />
          </div>
        ) : plan ? (
          <div className="max-w-lg mx-auto">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-px bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-3xl blur-sm opacity-60" />

              <div className="relative rounded-3xl p-8 lg:p-10 bg-gradient-to-b from-primary/10 via-card to-card border-2 border-primary shadow-lg shadow-primary/10">
                {/* Plan icon & name */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary text-primary-foreground">
                    <Crown className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl lg:text-6xl font-bold text-foreground">
                      ${displayPrice}
                    </span>
                    <span className="text-muted-foreground text-lg">/mo</span>
                  </div>
                  {isYearly && yearlySavings && (
                    <p className="text-sm text-chart-3 font-medium mt-2">
                      Save ${yearlySavings}/year
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {buildFeatures(plan).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 p-1 rounded-full bg-primary/20">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className="w-full rounded-xl h-12 font-semibold shadow-lg hover:shadow-xl"
                  onClick={() => navigate('/signup')}
                >
                  Start Now
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-16 text-center" />
      </div>
    </section>
  );
};

export default Pricing;
