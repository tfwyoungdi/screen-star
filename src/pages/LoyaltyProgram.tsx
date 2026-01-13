import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Gift, Plus, Pencil, Trash2, Settings, Award, Ticket, Coffee, Percent, DollarSign } from "lucide-react";
import { LoyaltyTransactionHistory } from "@/components/loyalty/LoyaltyTransactionHistory";

interface LoyaltySettings {
  id: string;
  organization_id: string;
  is_enabled: boolean;
  points_per_dollar: number;
  points_per_booking: number;
  welcome_bonus_points: number;
}

type RewardType = 'discount_percentage' | 'discount_fixed' | 'free_ticket' | 'free_concession';

interface LoyaltyReward {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  reward_type: RewardType;
  points_required: number;
  discount_value: number | null;
  concession_item_id: string | null;
  is_active: boolean;
}

const rewardTypeLabels: Record<RewardType, { label: string; icon: React.ReactNode }> = {
  discount_percentage: { label: "Percentage Discount", icon: <Percent className="h-4 w-4" /> },
  discount_fixed: { label: "Fixed Discount", icon: <DollarSign className="h-4 w-4" /> },
  free_ticket: { label: "Free Ticket", icon: <Ticket className="h-4 w-4" /> },
  free_concession: { label: "Free Concession", icon: <Coffee className="h-4 w-4" /> },
};

export default function LoyaltyProgram() {
  const { data: profile } = useUserProfile();
  const { isImpersonating, getEffectiveOrganizationId } = useImpersonation();
  const organizationId = getEffectiveOrganizationId(profile?.organization_id);
  const queryClient = useQueryClient();
  
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    reward_type: "discount_percentage" as RewardType,
    points_required: 100,
    discount_value: 10,
    concession_item_id: "",
  });

  // Fetch loyalty settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["loyalty-settings", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from("loyalty_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) throw error;
      return data as LoyaltySettings | null;
    },
    enabled: !!organizationId,
  });

  // Fetch rewards
  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ["loyalty-rewards", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("organization_id", organizationId)
        .order("points_required", { ascending: true });
      if (error) throw error;
      return data as LoyaltyReward[];
    },
    enabled: !!organizationId,
  });

  // Fetch concession items for free concession rewards
  const { data: concessionItems } = useQuery({
    queryKey: ["concession-items", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("concession_items")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_available", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Upsert settings mutation
  const settingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<LoyaltySettings>) => {
      if (!organizationId) throw new Error("No organization");
      const { error } = await supabase
        .from("loyalty_settings")
        .upsert({
          organization_id: organizationId,
          ...newSettings,
        }, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-settings"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  // Create/update reward mutation
  const rewardMutation = useMutation({
    mutationFn: async (reward: typeof rewardForm & { id?: string }) => {
      if (!organizationId) throw new Error("No organization");
      const payload = {
        organization_id: organizationId,
        name: reward.name,
        description: reward.description || null,
        reward_type: reward.reward_type,
        points_required: reward.points_required,
        discount_value: reward.reward_type.includes("discount") ? reward.discount_value : null,
        concession_item_id: reward.reward_type === "free_concession" ? reward.concession_item_id || null : null,
      };
      
      if (reward.id) {
        const { error } = await supabase
          .from("loyalty_rewards")
          .update(payload)
          .eq("id", reward.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("loyalty_rewards")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      setShowRewardDialog(false);
      setEditingReward(null);
      resetRewardForm();
      toast.success(editingReward ? "Reward updated" : "Reward created");
    },
    onError: () => toast.error("Failed to save reward"),
  });

  // Toggle reward active status
  const toggleRewardMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("loyalty_rewards")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
    },
  });

  // Delete reward mutation
  const deleteRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("loyalty_rewards")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-rewards"] });
      toast.success("Reward deleted");
    },
    onError: () => toast.error("Failed to delete reward"),
  });

  const resetRewardForm = () => {
    setRewardForm({
      name: "",
      description: "",
      reward_type: "discount_percentage",
      points_required: 100,
      discount_value: 10,
      concession_item_id: "",
    });
  };

  const handleEditReward = (reward: LoyaltyReward) => {
    setEditingReward(reward);
    setRewardForm({
      name: reward.name,
      description: reward.description || "",
      reward_type: reward.reward_type,
      points_required: reward.points_required,
      discount_value: reward.discount_value || 10,
      concession_item_id: reward.concession_item_id || "",
    });
    setShowRewardDialog(true);
  };

  const handleSubmitReward = () => {
    if (!rewardForm.name.trim()) {
      toast.error("Reward name is required");
      return;
    }
    rewardMutation.mutate({
      ...rewardForm,
      id: editingReward?.id,
    });
  };

  const currentSettings = settings || {
    is_enabled: true,
    points_per_dollar: 1,
    points_per_booking: 0,
    welcome_bonus_points: 0,
  };

  const isReadOnly = isImpersonating;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Gift className="h-8 w-8 text-primary" />
              Loyalty Rewards Program
            </h1>
            <p className="text-muted-foreground">
              Configure how customers earn and redeem loyalty points
            </p>
          </div>
        </div>

        {settingsLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Program Settings
                </CardTitle>
                <CardDescription>
                  Configure how customers earn loyalty points
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Loyalty Program</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to earn and redeem points
                    </p>
                  </div>
                  <Switch
                    checked={currentSettings.is_enabled}
                    onCheckedChange={(checked) => 
                      !isReadOnly && settingsMutation.mutate({ is_enabled: checked })
                    }
                    disabled={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points_per_dollar">Points per Dollar Spent</Label>
                  <Input
                    id="points_per_dollar"
                    type="number"
                    min="0"
                    step="0.1"
                    value={currentSettings.points_per_dollar}
                    onChange={(e) => 
                      !isReadOnly && settingsMutation.mutate({ 
                        points_per_dollar: parseFloat(e.target.value) || 0 
                      })
                    }
                    disabled={isReadOnly}
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., 1 point per $1 spent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points_per_booking">Bonus Points per Booking</Label>
                  <Input
                    id="points_per_booking"
                    type="number"
                    min="0"
                    value={currentSettings.points_per_booking}
                    onChange={(e) => 
                      !isReadOnly && settingsMutation.mutate({ 
                        points_per_booking: parseInt(e.target.value) || 0 
                      })
                    }
                    disabled={isReadOnly}
                  />
                  <p className="text-xs text-muted-foreground">
                    Fixed bonus points added per completed booking
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome_bonus">Welcome Bonus Points</Label>
                  <Input
                    id="welcome_bonus"
                    type="number"
                    min="0"
                    value={currentSettings.welcome_bonus_points}
                    onChange={(e) => 
                      !isReadOnly && settingsMutation.mutate({ 
                        welcome_bonus_points: parseInt(e.target.value) || 0 
                      })
                    }
                    disabled={isReadOnly}
                  />
                  <p className="text-xs text-muted-foreground">
                    Points awarded to new customers on first booking
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Program Overview
                </CardTitle>
                <CardDescription>
                  Current program statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {rewards?.filter(r => r.is_active).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Active Rewards</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {rewards?.length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Rewards</p>
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">Earning Example</h4>
                  <p className="text-sm text-muted-foreground">
                    A $50 booking would earn:{" "}
                    <span className="font-semibold text-foreground">
                      {Math.floor(50 * currentSettings.points_per_dollar) + currentSettings.points_per_booking} points
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rewards Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rewards Catalog</CardTitle>
              <CardDescription>
                Create rewards that customers can redeem with their points
              </CardDescription>
            </div>
            {!isReadOnly && (
              <Dialog open={showRewardDialog} onOpenChange={(open) => {
                setShowRewardDialog(open);
                if (!open) {
                  setEditingReward(null);
                  resetRewardForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reward
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingReward ? "Edit Reward" : "Create New Reward"}</DialogTitle>
                    <DialogDescription>
                      Define a reward that customers can redeem with their loyalty points
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="reward_name">Reward Name</Label>
                      <Input
                        id="reward_name"
                        placeholder="e.g., 10% Off Your Next Booking"
                        value={rewardForm.name}
                        onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reward_description">Description</Label>
                      <Textarea
                        id="reward_description"
                        placeholder="Describe what the customer gets..."
                        value={rewardForm.description}
                        onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reward Type</Label>
                      <Select
                        value={rewardForm.reward_type}
                        onValueChange={(value: RewardType) => 
                          setRewardForm({ ...rewardForm, reward_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(rewardTypeLabels) as [RewardType, { label: string; icon: React.ReactNode }][]).map(([key, { label, icon }]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                {icon}
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {rewardForm.reward_type.includes("discount") && (
                      <div className="space-y-2">
                        <Label htmlFor="discount_value">
                          {rewardForm.reward_type === "discount_percentage" ? "Discount %" : "Discount Amount ($)"}
                        </Label>
                        <Input
                          id="discount_value"
                          type="number"
                          min="0"
                          value={rewardForm.discount_value}
                          onChange={(e) => setRewardForm({ ...rewardForm, discount_value: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    )}

                    {rewardForm.reward_type === "free_concession" && (
                      <div className="space-y-2">
                        <Label>Concession Item</Label>
                        <Select
                          value={rewardForm.concession_item_id}
                          onValueChange={(value) => setRewardForm({ ...rewardForm, concession_item_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an item" />
                          </SelectTrigger>
                          <SelectContent>
                            {concessionItems?.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="points_required">Points Required</Label>
                      <Input
                        id="points_required"
                        type="number"
                        min="1"
                        value={rewardForm.points_required}
                        onChange={(e) => setRewardForm({ ...rewardForm, points_required: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRewardDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitReward} disabled={rewardMutation.isPending}>
                      {editingReward ? "Update" : "Create"} Reward
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {rewardsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : rewards && rewards.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reward</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reward.name}</p>
                          {reward.description && (
                            <p className="text-sm text-muted-foreground">{reward.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {rewardTypeLabels[reward.reward_type]?.icon}
                          <span className="text-sm">
                            {rewardTypeLabels[reward.reward_type]?.label}
                            {reward.discount_value && ` (${reward.reward_type === "discount_percentage" ? `${reward.discount_value}%` : `$${reward.discount_value}`})`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{reward.points_required} pts</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={reward.is_active}
                          onCheckedChange={(checked) => 
                            !isReadOnly && toggleRewardMutation.mutate({ id: reward.id, is_active: checked })
                          }
                          disabled={isReadOnly}
                        />
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditReward(reward)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRewardMutation.mutate(reward.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rewards created yet</p>
                <p className="text-sm">Create your first reward to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <LoyaltyTransactionHistory />
      </div>
    </DashboardLayout>
  );
}
