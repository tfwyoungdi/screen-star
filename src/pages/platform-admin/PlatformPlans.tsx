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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Check, X, GripVertical, Trash2, Copy } from 'lucide-react';
import { PlatformLayout } from '@/components/platform-admin/PlatformLayout';
import { Tables } from '@/integrations/supabase/types';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SubscriptionPlan = Tables<'subscription_plans'>;

interface SortablePlanCardProps {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (plan: SubscriptionPlan) => void;
  onDuplicate: (plan: SubscriptionPlan) => void;
}

function SortablePlanCard({ plan, onEdit, onDelete, onDuplicate }: SortablePlanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`${!plan.is_active ? 'opacity-60' : ''} ${isDragging ? 'shadow-lg ring-2 ring-primary' : ''}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <button
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onDuplicate(plan)} title="Duplicate plan">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(plan)} title="Edit plan">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(plan)} className="text-destructive hover:text-destructive" title="Delete plan">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-bold">
            {plan.price_monthly === 0 ? (
              'Custom'
            ) : (
              <>
                ${Number(plan.price_monthly).toFixed(0)}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </>
            )}
          </p>
          {plan.price_yearly && plan.price_yearly > 0 && (
            <p className="text-sm text-muted-foreground">
              or ${Number(plan.price_yearly).toFixed(0)}/year
            </p>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max Screens:</span>
            <span>{plan.max_screens === -1 ? 'Unlimited' : plan.max_screens}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max Staff:</span>
            <span>{plan.max_staff === -1 ? 'Unlimited' : plan.max_staff}</span>
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
  );
}

export default function PlatformPlans() {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      const maxSortOrder = plans?.reduce((max, p) => Math.max(max, p.sort_order || 0), 0) || 0;
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert({
          ...plan,
          features: [],
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan created successfully');
      
      logAction({
        action: 'plan_created',
        target_type: 'subscription_plan',
        target_id: data?.id,
        details: { plan_name: data?.name, price_monthly: data?.price_monthly },
      });
      
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Plan updated successfully');
      
      logAction({
        action: 'plan_updated',
        target_type: 'subscription_plan',
        target_id: data?.id,
        details: { plan_name: data?.name },
      });
      
      setEditingPlan(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to update plan:', error);
      toast.error('Failed to update plan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      queryClient.invalidateQueries({ queryKey: ['public-subscription-plans'] });
      toast.success('Plan deleted successfully');
      
      if (deletingPlan) {
        logAction({
          action: 'plan_deleted',
          target_type: 'subscription_plan',
          target_id: deletingPlan.id,
          details: { plan_name: deletingPlan.name },
        });
      }
      
      setDeletingPlan(null);
    },
    onError: (error) => {
      console.error('Failed to delete plan:', error);
      toast.error('Failed to delete plan. It may be in use by existing subscriptions.');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase
          .from('subscription_plans')
          .update({ sort_order })
          .eq('id', id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      queryClient.invalidateQueries({ queryKey: ['public-subscription-plans'] });
      toast.success('Plan order updated');
      
      logAction({
        action: 'plans_reordered',
        target_type: 'subscription_plan',
        details: { message: 'Subscription plans were reordered' },
      });
    },
    onError: (error) => {
      console.error('Failed to reorder plans:', error);
      toast.error('Failed to update plan order');
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
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

  const handleDuplicate = (plan: SubscriptionPlan) => {
    setFormData({
      name: `${plan.name} (Copy)`,
      slug: `${plan.slug}-copy`,
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
    setIsCreateOpen(true);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && plans) {
      const oldIndex = plans.findIndex((p) => p.id === active.id);
      const newIndex = plans.findIndex((p) => p.id === over.id);

      const newPlans = arrayMove(plans, oldIndex, newIndex);
      
      // Optimistic update
      queryClient.setQueryData(['subscription-plans'], newPlans);

      // Persist to database
      const updates = newPlans.map((plan, index) => ({
        id: plan.id,
        sort_order: index + 1,
      }));
      reorderMutation.mutate(updates);
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
          <Label>Max Screens (-1 = unlimited)</Label>
          <Input
            type="number"
            value={formData.max_screens}
            onChange={(e) => setFormData({ ...formData, max_screens: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Staff (-1 = unlimited)</Label>
          <Input
            type="number"
            value={formData.max_staff}
            onChange={(e) => setFormData({ ...formData, max_staff: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Locations (-1 = unlimited)</Label>
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
              Manage pricing tiers for cinema subscriptions. Drag to reorder.
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingPlan} onOpenChange={() => setDeletingPlan(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Subscription Plan</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the "{deletingPlan?.name}" plan? This action cannot be undone. 
                Make sure no cinemas are currently subscribed to this plan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingPlan && deleteMutation.mutate(deletingPlan.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Plan'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={plans?.map((p) => p.id) || []}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans?.map((plan) => (
                  <SortablePlanCard key={plan.id} plan={plan} onEdit={handleEdit} onDelete={setDeletingPlan} onDuplicate={handleDuplicate} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </PlatformLayout>
  );
}
