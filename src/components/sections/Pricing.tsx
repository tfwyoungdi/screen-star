import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Star, Zap, Crown, Building2, Sparkles } from "lucide-react";
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
      } = await supabase
        .from('subscription_plans')
        .select('id, name, slug, description, price_monthly, price_yearly, max_screens, max_staff, max_locations, commission_percentage, per_ticket_fee, allow_custom_domain, allow_own_gateway')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - plans rarely change
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

  // Icons for different plan tiers
  const planIcons = [Zap, Star, Crown, Building2];

  // Find the middle plan to mark as popular
  const popularIndex = plans && plans.length > 1 ? 1 : 0;
  return <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Dynamic background */}
      
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large gradient orbs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-chart-3/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-chart-4/5 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />
        
        {/* Floating shapes */}
        <div className="absolute top-20 right-[15%] w-20 h-20 border border-primary/20 rounded-2xl rotate-12 hidden lg:block" />
        <div className="absolute bottom-32 left-[10%] w-16 h-16 border border-chart-3/20 rounded-full hidden lg:block" />
        <div className="absolute top-1/3 left-[5%] w-12 h-12 bg-primary/5 rounded-lg -rotate-6 hidden lg:block" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple Pricing</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Choose Your
            <span className="block text-primary">Perfect Plan</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Transparent pricing that scales with your cinema. Start free for 14 days, 
            no credit card required.
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

        {/* Pricing Cards */}
        {isLoading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[500px] rounded-3xl" />)}
          </div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans?.map((plan, index) => {
          const isPopular = index === popularIndex;
          const isEnterprise = plan.slug === 'enterprise' || plan.max_locations === -1;
          const features = buildFeatures(plan);
          const PlanIcon = planIcons[index % planIcons.length];
          return <div key={plan.id} className={`relative group rounded-3xl transition-all duration-500 ${isPopular ? "lg:-mt-4 lg:mb-4" : ""}`}>
                  {/* Card glow effect for popular */}
                  {isPopular && <div className="absolute -inset-px bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-3xl blur-sm opacity-60" />}

                  {/* Card */}
                  <div className={`relative h-full rounded-3xl p-6 lg:p-8 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl ${isPopular ? "bg-gradient-to-b from-primary/10 via-card to-card border-2 border-primary shadow-lg shadow-primary/10" : "bg-card/80 backdrop-blur-sm border border-border hover:border-primary/30"}`}>
                    {/* Popular badge */}
                    {isPopular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          Most Popular
                        </div>
                      </div>}

                    {/* Plan icon & name */}
                    <div className="mb-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isPopular ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                        <PlanIcon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="mb-8">
                      {isEnterprise ? <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl lg:text-4xl font-bold text-foreground">
                              Custom
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Tailored to your needs
                          </p>
                        </> : <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl lg:text-5xl font-bold text-foreground">
                              ${isYearly ? Number(plan.price_yearly ? Number(plan.price_yearly) / 12 : Number(plan.price_monthly) * 0.8).toFixed(0) : Number(plan.price_monthly).toFixed(0)}
                            </span>
                            <span className="text-muted-foreground text-lg">/mo</span>
                          </div>
                          {isYearly && <p className="text-sm text-chart-3 font-medium mt-1">
                              Save ${(Number(plan.price_monthly) * 12 - (plan.price_yearly || Number(plan.price_monthly) * 12 * 0.8)).toFixed(0)}/year
                            </p>}
                        </>}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8 flex-1">
                      {features.map((feature, idx) => <li key={idx} className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1 rounded-full ${isPopular ? "bg-primary/20" : "bg-secondary"}`}>
                            <Check className={`h-3 w-3 ${isPopular ? "text-primary" : "text-foreground"}`} />
                          </div>
                          <span className="text-sm text-foreground">{feature}</span>
                        </li>)}
                    </ul>

                    {/* CTA Button */}
                    <Button variant={isPopular ? "default" : "outline"} className={`w-full rounded-xl h-12 font-semibold transition-all ${isPopular ? "shadow-lg hover:shadow-xl" : "hover:bg-primary hover:text-primary-foreground hover:border-primary"}`} onClick={isEnterprise ? () => navigate('/contact') : undefined}>
                      {isEnterprise ? "Contact Sales" : "Start Free Trial"}
                    </Button>
                  </div>
                </div>;
        })}
          </div>}

        {/* Bottom trust section */}
        <div className="mt-16 text-center">
          
        </div>
      </div>
    </section>;
};
export default Pricing;