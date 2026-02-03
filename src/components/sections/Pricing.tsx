import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
const Pricing = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const {
    data: plans,
    isLoading
  } = useQuery({
    queryKey: ['public-subscription-plans'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('sort_order', {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // Helper to build features list from plan data
  const buildFeatures = (plan: typeof plans extends (infer T)[] ? T : never) => {
    const features: string[] = [];
    if (plan.max_locations === -1) {
      features.push("Unlimited Locations");
    } else if (plan.max_locations === 1) {
      features.push("1 Cinema Location");
    } else {
      features.push(`Up to ${plan.max_locations} Locations`);
    }
    if (plan.max_screens === -1) {
      features.push("Unlimited Screens");
    } else {
      features.push(`Up to ${plan.max_screens} Screens`);
    }
    if (plan.max_staff === -1) {
      features.push("Unlimited Staff");
    } else {
      features.push(`Up to ${plan.max_staff} Staff Members`);
    }
    if (plan.allow_custom_domain) {
      features.push("Custom Domain");
    }
    if (plan.allow_own_gateway) {
      features.push("Own Payment Gateway");
    }

    // Add commission info
    if (plan.commission_percentage) {
      features.push(`${plan.commission_percentage}% Commission`);
    }
    if (plan.per_ticket_fee) {
      features.push(`$${plan.per_ticket_fee} Per Ticket Fee`);
    }
    return features;
  };

  // Find the middle plan to mark as popular
  const popularIndex = plans && plans.length > 1 ? 1 : 0;
  return <section id="pricing" className="py-24 lg:py-32 bg-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Choose the plan that fits your cinema. All plans include a 14-day free trial.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} className="data-[state=checked]:bg-primary" />
            <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              Save 20%
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        {isLoading ? <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-96 rounded-2xl" />)}
          </div> : <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {plans?.map((plan, index) => {
          const isPopular = index === popularIndex;
          const isEnterprise = plan.slug === 'enterprise' || plan.max_locations === -1;
          const features = buildFeatures(plan);
          return <div key={plan.id} className={`relative rounded-2xl p-6 lg:p-8 ${isPopular ? "bg-background border-2 border-primary shadow-lg shadow-primary/10" : "bg-background border border-border"}`}>
                  {isPopular && <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Most Popular
                      </span>
                    </div>}

                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-foreground mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    {isEnterprise ? <>
                        <span className="text-4xl lg:text-5xl font-bold text-foreground">
                          Let's Talk
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                          Tailored to your needs
                        </p>
                      </> : <>
                        <span className="text-4xl lg:text-5xl font-bold text-foreground">
                          ${isYearly ? Number(plan.price_yearly ? Number(plan.price_yearly) / 12 : Number(plan.price_monthly) * 0.8).toFixed(0) : Number(plan.price_monthly).toFixed(0)}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                        {isYearly && <p className="text-sm text-muted-foreground mt-1">
                            Billed ${Number(plan.price_yearly || Number(plan.price_monthly) * 12 * 0.8).toFixed(0)} yearly
                          </p>}
                      </>}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {features.map(feature => <li key={feature} className="flex items-center gap-3">
                        <div className="p-1 rounded-full bg-primary/10">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>)}
                  </ul>

                  <Button variant={isPopular ? "hero" : "outline"} className="w-full" size="lg" onClick={isEnterprise ? () => navigate('/contact') : undefined}>
                    {isEnterprise ? "Contact Sales Team" : "Start Free Trial"}
                  </Button>
                </div>;
        })}
          </div>}

        {/* Additional Info */}
        <div className="text-center mt-12">
          
        </div>
      </div>
    </section>;
};
export default Pricing;