import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Zap, Shield, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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
    const features: { text: string; highlight?: boolean }[] = [];
    if (p.max_locations === -1) features.push({ text: "Unlimited Locations", highlight: true });
    else if (p.max_locations === 1) features.push({ text: "1 Cinema Location" });
    else features.push({ text: `Up to ${p.max_locations} Locations` });

    if (p.max_screens === -1) features.push({ text: "Unlimited Screens", highlight: true });
    else features.push({ text: `Up to ${p.max_screens} Screens` });

    if (p.max_staff === -1) features.push({ text: "Unlimited Staff", highlight: true });
    else features.push({ text: `Up to ${p.max_staff} Staff Members` });

    if (p.allow_custom_domain) features.push({ text: "Custom Domain", highlight: true });
    if (p.allow_own_gateway) features.push({ text: "Own Payment Gateway" });
    if (p.commission_percentage) features.push({ text: `${p.commission_percentage}% Commission` });
    if (p.per_ticket_fee) features.push({ text: `$${p.per_ticket_fee} Per Ticket Fee` });
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
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple Pricing</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            One Plan, <span className="text-primary">Zero Complexity</span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Everything you need to run your cinema. Start with a 14-day free trial, no credit card required.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center rounded-full bg-muted/50 border border-border p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="text-xs bg-chart-3/20 text-chart-3 px-2 py-0.5 rounded-full font-semibold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        {isLoading ? (
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-[400px] rounded-3xl" />
          </div>
        ) : plan ? (
          <div className="max-w-4xl mx-auto">
            <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-xl shadow-primary/5">
              <div className="grid md:grid-cols-2">
                {/* Left: Price & CTA */}
                <div className="p-8 lg:p-12 flex flex-col justify-center bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  </div>

                  <p className="text-muted-foreground mb-8">{plan.description}</p>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-6xl lg:text-7xl font-bold text-foreground tracking-tight">
                        ${displayPrice}
                      </span>
                      <span className="text-muted-foreground text-lg">/mo</span>
                    </div>
                    {isYearly && yearlySavings && (
                      <p className="text-sm text-chart-3 font-medium mt-2 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5" />
                        Save ${yearlySavings} per year
                      </p>
                    )}
                    {!isYearly && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Billed monthly, cancel anytime
                      </p>
                    )}
                  </div>

                  <Button
                    size="lg"
                    className="w-full rounded-xl h-14 text-base font-semibold group"
                    onClick={() => navigate('/signup')}
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>

                  <div className="flex items-center gap-4 mt-4 justify-center">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      No credit card required
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Zap className="h-3.5 w-3.5" />
                      14-day free trial
                    </div>
                  </div>
                </div>

                {/* Right: Features */}
                <div className="p-8 lg:p-12 border-t md:border-t-0 md:border-l border-border">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
                    Everything included
                  </h4>
                  <ul className="space-y-4">
                    {buildFeatures(plan).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1 rounded-full ${feature.highlight ? 'bg-primary/15' : 'bg-muted'}`}>
                          <Check className={`h-3.5 w-3.5 ${feature.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span className={`text-sm ${feature.highlight ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 pt-6 border-t border-border">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      Also included
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {["Box Office POS", "Analytics Dashboard", "Online Booking", "Email Campaigns", "Loyalty Program", "Concessions"].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-primary/60" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default Pricing;
