import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Check, X } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { Tables } from '@/integrations/supabase/types';

type SubscriptionPlan = Tables<'subscription_plans'>;

export default function PlatformPlans() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_screens: 3,
    max_staff: 10,
    max_locations: 1,
    commission_percentage: 5,
    per_ticket_fee: 0.5,
    allow_custom_domain: false,
    allow_own_gateway: false,
    is_active: true,
  });

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (plan: typeof formData) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          ...plan,
          features: [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan created successfully');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to create plan:', error);
      toast.error('Failed to create plan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...plan }: { id: string } & typeof formData) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update(plan)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan updated successfully');
      setEditingPlan(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to update plan:', error);
      toast.error('Failed to update plan');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      max_screens: 3,
      max_staff: 10,
      max_locations: 1,
      commission_percentage: 5,
      per_ticket_fee: 0.5,
      allow_custom_domain: false,
      allow_own_gateway: false,
      is_active: true,
    });
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_monthly: Number(plan.price_monthly),
      price_yearly: Number(plan.price_yearly) || 0,
      max_screens: plan.max_screens || 3,
      max_staff: plan.max_staff || 10,
      max_locations: plan.max_locations || 1,
      commission_percentage: Number(plan.commission_percentage) || 5,
      per_ticket_fee: Number(plan.per_ticket_fee) || 0.5,
      allow_custom_domain: plan.allow_custom_domain || false,
      allow_own_gateway: plan.allow_own_gateway || false,
      is_active: plan.is_active ?? true,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const PlanForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Pro"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug *</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="pro"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Plan description..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Monthly Price ($)</Label>
          <Input
            type="number"
            value={formData.price_monthly}
            onChange={(e) => setFormData({ ...formData, price_monthly: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Yearly Price ($)</Label>
          <Input
            type="number"
            value={formData.price_yearly}
            onChange={(e) => setFormData({ ...formData, price_yearly: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Max Screens</Label>
          <Input
            type="number"
            value={formData.max_screens}
            onChange={(e) => setFormData({ ...formData, max_screens: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Staff</Label>
          <Input
            type="number"
            value={formData.max_staff}
            onChange={(e) => setFormData({ ...formData, max_staff: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Locations</Label>
          <Input
            type="number"
            value={formData.max_locations}
            onChange={(e) => setFormData({ ...formData, max_locations: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Commission (%)</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.commission_percentage}
            onChange={(e) => setFormData({ ...formData, commission_percentage: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Per Ticket Fee ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.per_ticket_fee}
            onChange={(e) => setFormData({ ...formData, per_ticket_fee: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.allow_custom_domain}
            onCheckedChange={(checked) => setFormData({ ...formData, allow_custom_domain: checked })}
          />
          <Label>Custom Domain</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.allow_own_gateway}
            onCheckedChange={(checked) => setFormData({ ...formData, allow_own_gateway: checked })}
          />
          <Label>Own Payment Gateway</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label>Active</Label>
        </div>
      </div>
    </div>
  );

  return (
    <PlatformLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage pricing tiers for cinema subscriptions
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Subscription Plan</DialogTitle>
                <DialogDescription>
                  Define a new pricing tier for cinema organizations.
                </DialogDescription>
              </DialogHeader>
              <PlanForm />
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPlan} onOpenChange={() => { setEditingPlan(null); resetForm(); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Subscription Plan</DialogTitle>
              <DialogDescription>
                Update the details of this pricing tier.
              </DialogDescription>
            </DialogHeader>
            <PlanForm />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setEditingPlan(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans?.map((plan) => (
              <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold">
                      ${Number(plan.price_monthly).toFixed(0)}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>
                    {plan.price_yearly && (
                      <p className="text-sm text-muted-foreground">
                        or ${Number(plan.price_yearly).toFixed(0)}/year
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Screens:</span>
                      <span>{plan.max_screens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Staff:</span>
                      <span>{plan.max_staff}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Commission:</span>
                      <span>{plan.commission_percentage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per Ticket Fee:</span>
                      <span>${plan.per_ticket_fee}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {plan.allow_custom_domain && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" /> Custom Domain
                      </Badge>
                    )}
                    {plan.allow_own_gateway && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" /> Own Gateway
                      </Badge>
                    )}
                    {!plan.is_active && (
                      <Badge variant="outline" className="gap-1">
                        <X className="h-3 w-3" /> Inactive
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}
