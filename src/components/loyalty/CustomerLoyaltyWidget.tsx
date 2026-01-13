import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Star, Ticket, Coffee, Percent, DollarSign, Loader2, History, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_required: number;
  discount_value: number | null;
}

interface LoyaltyTransaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
}

interface CustomerLoyaltyWidgetProps {
  organizationId: string;
  primaryColor: string;
}

const rewardIcons: Record<string, React.ReactNode> = {
  discount_percentage: <Percent className="h-4 w-4" />,
  discount_fixed: <DollarSign className="h-4 w-4" />,
  free_ticket: <Ticket className="h-4 w-4" />,
  free_concession: <Coffee className="h-4 w-4" />,
};

export function CustomerLoyaltyWidget({ organizationId, primaryColor }: CustomerLoyaltyWidgetProps) {
  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPoints, setCustomerPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch loyalty settings
  const { data: loyaltySettings } = useQuery({
    queryKey: ["loyalty-settings-widget", organizationId],
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
    queryKey: ["loyalty-rewards-widget", organizationId],
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

  // Fetch transaction history
  const { data: transactions } = useQuery({
    queryKey: ["loyalty-transactions-widget", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const { data } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as LoyaltyTransaction[];
    },
    enabled: !!customerId && isLoggedIn,
  });

  const lookupCustomer = async () => {
    if (!email.trim()) return;
    
    setLoading(true);
    try {
      const { data } = await supabase
        .from("customers")
        .select("id, loyalty_points, full_name")
        .eq("organization_id", organizationId)
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();
      
      if (data) {
        setCustomerId(data.id);
        setCustomerName(data.full_name);
        setCustomerPoints(data.loyalty_points);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setCustomerId(null);
      }
    } catch (error) {
      console.error("Error looking up customer:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCustomerId(null);
    setEmail("");
    setCustomerName("");
    setCustomerPoints(0);
  };

  // Don't show if loyalty is not enabled
  if (!loyaltySettings) return null;

  const nextReward = rewards?.find(r => r.points_required > customerPoints);
  const pointsToNextReward = nextReward ? nextReward.points_required - customerPoints : 0;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
          style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
        >
          <Gift className="h-4 w-4" />
          <span>Rewards</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[#1a1a2e] text-white border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="h-5 w-5" style={{ color: primaryColor }} />
            Loyalty Rewards
          </DialogTitle>
        </DialogHeader>

        {!isLoggedIn ? (
          <div className="space-y-4 py-4">
            <p className="text-white/70 text-sm">
              Enter your email to check your loyalty points and available rewards.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Button
                onClick={lookupCustomer}
                disabled={loading || !email.trim()}
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
              </Button>
            </div>
            {!loading && email && !customerId && isLoggedIn === false && (
              <p className="text-white/50 text-sm">
                No account found. Book a movie to start earning points!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Points Summary */}
            <div 
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <p className="text-white/60 text-sm mb-1">Welcome back, {customerName}!</p>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-6 w-6" style={{ color: primaryColor }} />
                <span className="text-3xl font-bold text-white">{customerPoints}</span>
              </div>
              <p className="text-white/60 text-sm">Points Available</p>
              {nextReward && (
                <p className="text-xs mt-2" style={{ color: primaryColor }}>
                  {pointsToNextReward} points until "{nextReward.name}"
                </p>
              )}
            </div>

            <Tabs defaultValue="rewards" className="w-full">
              <TabsList className="w-full bg-white/5">
                <TabsTrigger value="rewards" className="flex-1 data-[state=active]:bg-white/10">
                  Rewards
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-white/10">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rewards" className="mt-4 space-y-2">
                {rewards && rewards.length > 0 ? (
                  rewards.map((reward) => {
                    const canRedeem = customerPoints >= reward.points_required;
                    return (
                      <div
                        key={reward.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          canRedeem
                            ? "bg-white/5 border-white/20"
                            : "bg-white/2 border-white/5 opacity-60"
                        }`}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: canRedeem ? `${primaryColor}30` : "rgba(255,255,255,0.05)" }}
                        >
                          {rewardIcons[reward.reward_type] || <Gift className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{reward.name}</p>
                          {reward.description && (
                            <p className="text-xs text-white/50 truncate">{reward.description}</p>
                          )}
                        </div>
                        <Badge
                          variant={canRedeem ? "default" : "secondary"}
                          className="shrink-0"
                          style={canRedeem ? { backgroundColor: primaryColor } : { backgroundColor: "rgba(255,255,255,0.1)" }}
                        >
                          {reward.points_required} pts
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-white/50 py-4">No rewards available</p>
                )}
                <p className="text-xs text-white/40 text-center pt-2">
                  Redeem rewards during checkout
                </p>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {transactions && transactions.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          {tx.points > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-orange-400" />
                          )}
                          <div>
                            <p className="text-sm text-white capitalize">
                              {tx.transaction_type.replace("_", " ")}
                            </p>
                            <p className="text-xs text-white/50">
                              {format(new Date(tx.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`font-semibold ${
                            tx.points > 0 ? "text-green-400" : "text-orange-400"
                          }`}
                        >
                          {tx.points > 0 ? "+" : ""}{tx.points}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-white/50 py-4">No transaction history yet</p>
                )}
              </TabsContent>
            </Tabs>

            <button
              onClick={handleLogout}
              className="w-full text-center text-xs text-white/40 hover:text-white/60 py-2"
            >
              Sign out
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
