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
  const {
    data: plan,
    isLoading
  } = useQuery({
    queryKey: ['public-subscription-plan'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('subscription_plans').select('id, name, slug, description, price_monthly, price_yearly, max_screens, max_staff, max_locations, commission_percentage, per_ticket_fee, allow_custom_domain, allow_own_gateway').eq('is_active', true).order('sort_order', {
        ascending: true
      }).limit(1).single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000
  });
  const buildFeatures = (p: NonNullable<typeof plan>) => {
    const features: string[] = [];
    if (p.max_locations === -1) features.push("Unlimited Locations");else if (p.max_locations === 1) features.push("1 Cinema Location");else features.push(`Up to ${p.max_locations} Locations`);
    if (p.max_screens === -1) features.push("Unlimited Screens");else features.push(`Up to ${p.max_screens} Screens`);
    if (p.max_staff === -1) features.push("Unlimited Staff");else features.push(`Up to ${p.max_staff} Staff Members`);
    if (p.allow_custom_domain) features.push("Custom Domain");
    if (p.allow_own_gateway) features.push("Own Payment Gateway");
    if (p.commission_percentage) features.push(`${p.commission_percentage}% Commission`);
    if (p.per_ticket_fee) features.push(`$${p.per_ticket_fee} Per Ticket Fee`);
    return features;
  };
  const monthlyPrice = plan ? Number(plan.price_monthly) : 0;
  const yearlyPrice = plan ? Number(plan.price_yearly) : 0;
  const displayPrice = isYearly ? yearlyPrice > 0 ? (yearlyPrice / 12).toFixed(0) : (monthlyPrice * 0.8).toFixed(0) : monthlyPrice.toFixed(0);
  const yearlySavings = isYearly ? (monthlyPrice * 12 - (yearlyPrice || monthlyPrice * 12 * 0.8)).toFixed(0) : null;
  return;
};
export default Pricing;