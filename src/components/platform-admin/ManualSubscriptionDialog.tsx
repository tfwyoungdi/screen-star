import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, addMonths, addYears } from 'date-fns';
import { toast } from 'sonner';
import { CalendarIcon, CreditCard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlatformAuditLog } from '@/hooks/usePlatformAuditLog';

interface ManualSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cinema: {
    id: string;
    name: string;
  } | null;
  onSuccess?: () => void;
}

type BillingCycle = 'monthly' | 'yearly';

export function ManualSubscriptionDialog({
  open,
  onOpenChange,
  cinema,
  onSuccess,
}: ManualSubscriptionDialogProps) {
  const queryClient = useQueryClient();
  const { logAction } = usePlatformAuditLog();
  
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price_monthly, price_yearly')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!cinema || !selectedPlanId) {
        throw new Error('Missing required fields');
      }

      // Calculate end date based on billing cycle
      const endDate = billingCycle === 'monthly' 
        ? addMonths(startDate, 1) 
        : addYears(startDate, 1);

      // Check if subscription already exists
      const { data: existingSub } = await supabase
        .from('cinema_subscriptions')
        .select('id')
        .eq('organization_id', cinema.id)
        .single();

      if (existingSub) {
        // Update existing subscription
        const { data, error } = await supabase
          .from('cinema_subscriptions')
          .update({
            plan_id: selectedPlanId,
            status: 'active',
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            cancelled_at: null,
          })
          .eq('organization_id', cinema.id)
          .select()
          .single();

        if (error) throw error;
        return { data, isUpdate: true };
      } else {
        // Create new subscription
        const { data, error } = await supabase
          .from('cinema_subscriptions')
          .insert({
            organization_id: cinema.id,
            plan_id: selectedPlanId,
            status: 'active',
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return { data, isUpdate: false };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all-cinemas-with-subscriptions'] });
      
      const selectedPlan = plans?.find(p => p.id === selectedPlanId);
      
      toast.success(
        result.isUpdate 
          ? `Subscription updated for ${cinema?.name}` 
          : `Subscription activated for ${cinema?.name}`
      );
      
      // Audit log
      logAction({
        action: result.isUpdate ? 'subscription_manually_updated' : 'subscription_manually_created',
        target_type: 'cinema_subscription',
        target_id: result.data.id,
        details: {
          organization_id: cinema?.id,
          organization_name: cinema?.name,
          plan_id: selectedPlanId,
          plan_name: selectedPlan?.name,
          billing_cycle: billingCycle,
          start_date: startDate.toISOString(),
          payment_method: paymentMethod || 'Not specified',
          notes: notes || null,
        },
      });
      
      // Reset form
      setSelectedPlanId('');
      setBillingCycle('monthly');
      setStartDate(new Date());
      setPaymentMethod('');
      setNotes('');
      
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to create subscription:', error);
      toast.error('Failed to activate subscription');
    },
  });

  const handleSubmit = () => {
    if (!selectedPlanId) {
      toast.error('Please select a subscription plan');
      return;
    }
    createSubscriptionMutation.mutate();
  };

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);
  const calculatedEndDate = billingCycle === 'monthly' 
    ? addMonths(startDate, 1) 
    : addYears(startDate, 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manual Subscription Activation
          </DialogTitle>
          <DialogDescription>
            Activate a subscription for <strong>{cinema?.name}</strong> for offline payments (bank transfer, cash, etc.)
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pt-4 pr-4">
          {/* Plan Selection */}
          <div className="space-y-2">
            <Label>Subscription Plan *</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger>
                <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select a plan"} />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - ${plan.price_monthly}/mo or ${plan.price_yearly}/yr
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label>Billing Cycle *</Label>
            <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">
                  Monthly {selectedPlan && `- $${selectedPlan.price_monthly}`}
                </SelectItem>
                <SelectItem value="yearly">
                  Yearly {selectedPlan && `- $${selectedPlan.price_yearly}`}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'MMMM d, yyyy') : 'Select start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {startDate && (
              <p className="text-xs text-muted-foreground">
                Subscription will expire on <strong>{format(calculatedEndDate, 'MMMM d, yyyy')}</strong>
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Payment reference number, invoice ID, etc."
              rows={2}
            />
          </div>

          {/* Summary */}
          {selectedPlan && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium">Summary</p>
              <p>Plan: {selectedPlan.name}</p>
              <p>Amount: ${billingCycle === 'monthly' ? selectedPlan.price_monthly : selectedPlan.price_yearly}</p>
              <p>Period: {format(startDate, 'MMM d, yyyy')} → {format(calculatedEndDate, 'MMM d, yyyy')}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedPlanId || createSubscriptionMutation.isPending}
            >
              {createSubscriptionMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Activate Subscription
            </Button>
          </div>
        </div>
        <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
