import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, Check, Loader2, X } from "lucide-react";

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_required: number;
  discount_value: number | null;
}

interface CustomerLoyalty {
  id: string;
  loyalty_points: number;
  full_name: string;
}

interface LoyaltyRedemptionProps {
  organizationId: string;
  customerEmail: string;
  ticketSubtotal: number;
  primaryColor: string;
  onRewardApplied: (reward: LoyaltyReward, customer: CustomerLoyalty, discountAmount: number) => void;
  onRewardRemoved: () => void;
  appliedReward: LoyaltyReward | null;
}

export function LoyaltyRedemption({
  organizationId,
  customerEmail,
  ticketSubtotal,
  primaryColor,
  onRewardApplied,
  onRewardRemoved,
  appliedReward,
}: LoyaltyRedemptionProps) {
  const [lookupEmail, setLookupEmail] = useState(customerEmail);
  const [isLookedUp, setIsLookedUp] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerLoyalty | null>(null);

  // Fetch loyalty settings
  const { data: loyaltySettings } = useQuery({
    queryKey: ["loyalty-settings-public", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_enabled", true)
        .maybeSingle();
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch available rewards
  const { data: rewards } = useQuery({
    queryKey: ["loyalty-rewards-public", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("points_required", { ascending: true });
      return (data || []) as LoyaltyReward[];
    },
    enabled: !!organizationId && !!loyaltySettings,
  });

  const lookupCustomer = async () => {
    if (!lookupEmail.trim()) return;
    
    setLookupLoading(true);
    try {
      const { data } = await supabase
        .from("customers")
        .select("id, loyalty_points, full_name")
        .eq("organization_id", organizationId)
        .eq("email", lookupEmail.toLowerCase().trim())
        .maybeSingle();
      
      setCustomer(data);
      setIsLookedUp(true);
    } catch (error) {
      console.error("Error looking up customer:", error);
    } finally {
      setLookupLoading(false);
    }
  };

  const calculateDiscount = (reward: LoyaltyReward): number => {
    if (reward.reward_type === "discount_percentage" && reward.discount_value) {
      return ticketSubtotal * (reward.discount_value / 100);
    }
    if (reward.reward_type === "discount_fixed" && reward.discount_value) {
      return Math.min(reward.discount_value, ticketSubtotal);
    }
    if (reward.reward_type === "free_ticket") {
      // Assume one standard ticket price for free ticket
      return ticketSubtotal / Math.max(1, Math.ceil(ticketSubtotal / 15)); // Rough estimate
    }
    return 0;
  };

  const canRedeemReward = (reward: LoyaltyReward): boolean => {
    if (!customer) return false;
    return customer.loyalty_points >= reward.points_required;
  };

  const handleRedeemReward = (reward: LoyaltyReward) => {
    if (!customer || !canRedeemReward(reward)) return;
    const discountAmount = calculateDiscount(reward);
    onRewardApplied(reward, customer, discountAmount);
  };

  // Don't show if loyalty is not enabled
  if (!loyaltySettings) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-5 w-5 text-amber-400" />
        <h4 className="font-semibold text-white">Loyalty Rewards</h4>
      </div>

      {appliedReward ? (
        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-400">{appliedReward.name}</p>
                <p className="text-xs text-green-400/70">
                  {appliedReward.points_required} points redeemed
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRewardRemoved}
              className="h-8 w-8 text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : !isLookedUp ? (
        <div className="space-y-3">
          <p className="text-white/60 text-sm">
            Have a loyalty account? Enter your email to check your points.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
            <Button
              onClick={lookupCustomer}
              disabled={lookupLoading || !lookupEmail.trim()}
              className="shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
            </Button>
          </div>
        </div>
      ) : customer ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
            <div>
              <p className="text-sm text-white/60">Welcome back,</p>
              <p className="font-medium text-white">{customer.full_name}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-lg font-bold text-amber-400">{customer.loyalty_points}</span>
              </div>
              <p className="text-xs text-white/60">points available</p>
            </div>
          </div>

          {rewards && rewards.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-white/60 uppercase tracking-wide">Available Rewards</p>
              {rewards.map((reward) => {
                const canRedeem = canRedeemReward(reward);
                const discount = calculateDiscount(reward);
                return (
                  <div
                    key={reward.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      canRedeem
                        ? "bg-white/5 border-white/10 hover:border-amber-500/50 cursor-pointer"
                        : "bg-white/2 border-white/5 opacity-60"
                    }`}
                    onClick={() => canRedeem && handleRedeemReward(reward)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{reward.name}</p>
                      {reward.description && (
                        <p className="text-xs text-white/60">{reward.description}</p>
                      )}
                      {discount > 0 && (
                        <p className="text-xs text-green-400 mt-1">
                          Save ${discount.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={canRedeem ? "default" : "secondary"}
                      className={canRedeem ? "" : "bg-white/10 text-white/60"}
                      style={canRedeem ? { backgroundColor: primaryColor } : undefined}
                    >
                      {reward.points_required} pts
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-white/60 text-center py-2">
              No rewards available at the moment.
            </p>
          )}

          <button
            onClick={() => {
              setIsLookedUp(false);
              setCustomer(null);
            }}
            className="text-xs text-white/40 hover:text-white/60"
          >
            Use different email
          </button>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-white/60 text-sm mb-2">
            No loyalty account found for this email.
          </p>
          <p className="text-white/40 text-xs">
            Your account will be created after your first booking!
          </p>
          <button
            onClick={() => {
              setIsLookedUp(false);
              setLookupEmail("");
            }}
            className="text-xs text-amber-400 hover:text-amber-300 mt-2"
          >
            Try another email
          </button>
        </div>
      )}
    </div>
  );
}
