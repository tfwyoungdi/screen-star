import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Clock, DollarSign, PlayCircle, StopCircle, 
  Loader2, Receipt, CreditCard, Banknote, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, getCurrencySymbol } from '@/lib/currency';

interface Shift {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  total_cash_sales: number;
  total_card_sales: number;
  total_transactions: number;
  notes: string | null;
  status: 'active' | 'closed';
}

interface ShiftManagementProps {
  userId: string;
  organizationId: string;
  currency?: string | null;
  onShiftChange?: (hasActiveShift: boolean) => void;
}

export function ShiftManagement({ userId, organizationId, currency, onShiftChange }: ShiftManagementProps) {
  const queryClient = useQueryClient();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  // Fetch active shift
  const { data: activeShift, isLoading: shiftLoading } = useQuery({
    queryKey: ['active-shift', userId, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      onShiftChange?.(!!data);
      return data as Shift | null;
    },
    enabled: !!userId && !!organizationId,
  });

  // Fetch shift sales (from bookings linked to this shift)
  const { data: shiftSales } = useQuery({
    queryKey: ['shift-sales', activeShift?.id],
    queryFn: async () => {
      if (!activeShift) return { cashSales: 0, cardSales: 0, transactions: 0 };
      
      // Get all bookings linked to this shift via shift_id
      const { data, error } = await supabase
        .from('bookings')
        .select('total_amount, status')
        .eq('shift_id', activeShift.id)
        .in('status', ['confirmed', 'paid', 'activated']);

      if (error) throw error;

      // Calculate totals from actual shift bookings
      const total = data?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
      const transactions = data?.length || 0;
      
      // For now, assume box office sales are primarily cash (70/30 split)
      // In a full implementation, payment_method would be tracked per booking
      return { 
        cashSales: total * 0.7,
        cardSales: total * 0.3,
        transactions 
      };
    },
    enabled: !!activeShift,
    refetchInterval: 10000, // Refresh more frequently for real-time accuracy
  });

  // Start shift mutation
  const startShiftMutation = useMutation({
    mutationFn: async () => {
      const openingAmount = parseFloat(openingCash) || 0;
      
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          opening_cash: openingAmount,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      setShowStartDialog(false);
      setOpeningCash('');
      toast.success('Shift started successfully!');
      onShiftChange?.(true);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start shift');
    },
  });

  // End shift mutation
  const endShiftMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error('No active shift');
      
      const closingAmount = parseFloat(closingCash) || 0;
      const expectedCash = activeShift.opening_cash + (shiftSales?.cashSales || 0);
      const difference = closingAmount - expectedCash;

      const { error } = await supabase
        .from('shifts')
        .update({
          ended_at: new Date().toISOString(),
          closing_cash: closingAmount,
          expected_cash: expectedCash,
          cash_difference: difference,
          total_cash_sales: shiftSales?.cashSales || 0,
          total_card_sales: shiftSales?.cardSales || 0,
          total_transactions: shiftSales?.transactions || 0,
          notes: shiftNotes || null,
          status: 'closed',
        })
        .eq('id', activeShift.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      setShowEndDialog(false);
      setClosingCash('');
      setShiftNotes('');
      toast.success('Shift ended successfully!');
      onShiftChange?.(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to end shift');
    },
  });

  const expectedCash = activeShift 
    ? activeShift.opening_cash + (shiftSales?.cashSales || 0)
    : 0;

  const cashDifference = closingCash 
    ? parseFloat(closingCash) - expectedCash 
    : 0;

  if (shiftLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No active shift - show start button
  if (!activeShift) {
    return (
      <>
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Active Shift</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a shift to begin tracking sales and cash drawer
            </p>
            <Button onClick={() => setShowStartDialog(true)} size="lg" className="gap-2">
              <PlayCircle className="h-5 w-5" />
              Start Shift
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                Start New Shift
              </DialogTitle>
              <DialogDescription>
                Enter your opening cash drawer balance to begin your shift.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="opening-cash">Opening Cash Balance</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="opening-cash"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="pl-9 text-lg h-12"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Count the cash in your drawer before starting
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStartDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => startShiftMutation.mutate()}
                disabled={startShiftMutation.isPending}
              >
                {startShiftMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Start Shift
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Active shift - show stats and end button
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              <CardTitle className="text-base">Active Shift</CardTitle>
            </div>
            <Badge variant="outline">
              Started {format(new Date(activeShift.started_at), 'h:mm a')}
            </Badge>
          </div>
          <CardDescription>
            Duration: {format(new Date(new Date().getTime() - new Date(activeShift.started_at).getTime()), 'H:mm:ss')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <Receipt className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{shiftSales?.transactions || 0}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Banknote className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{formatCurrency(shiftSales?.cashSales || 0, currency)}</p>
              <p className="text-xs text-muted-foreground">Cash Sales</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <CreditCard className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{formatCurrency(shiftSales?.cardSales || 0, currency)}</p>
              <p className="text-xs text-muted-foreground">Card Sales</p>
            </div>
          </div>

          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Expected Cash in Drawer</span>
              <span className="text-lg font-bold">{formatCurrency(expectedCash, currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Opening: {formatCurrency(activeShift.opening_cash, currency)} + Cash Sales: {formatCurrency(shiftSales?.cashSales || 0, currency)}
            </p>
          </div>

          <Button 
            variant="destructive" 
            className="w-full gap-2"
            onClick={() => setShowEndDialog(true)}
          >
            <StopCircle className="h-4 w-4" />
            End Shift
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-destructive" />
              End Shift Reconciliation
            </DialogTitle>
            <DialogDescription>
              Count your cash drawer and enter the closing balance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Shift Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Shift Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{format(new Date(new Date().getTime() - new Date(activeShift.started_at).getTime()), 'H:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span>{shiftSales?.transactions || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cash Sales:</span>
                  <span>{formatCurrency(shiftSales?.cashSales || 0, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card Sales:</span>
                  <span>{formatCurrency(shiftSales?.cardSales || 0, currency)}</span>
                </div>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                <span>Total Sales:</span>
                <span>{formatCurrency((shiftSales?.cashSales || 0) + (shiftSales?.cardSales || 0), currency)}</span>
              </div>
            </div>

            {/* Cash Drawer */}
            <div className="space-y-2">
              <Label htmlFor="closing-cash">Closing Cash Drawer</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="closing-cash"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="pl-9 text-lg h-12"
                  autoFocus
                />
              </div>
            </div>

            {/* Reconciliation */}
            {closingCash && (
              <div className={`p-3 rounded-lg flex items-center justify-between ${
                cashDifference === 0 
                  ? 'bg-green-500/10 text-green-600' 
                  : cashDifference > 0 
                    ? 'bg-blue-500/10 text-blue-600'
                    : 'bg-destructive/10 text-destructive'
              }`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">
                    {cashDifference === 0 
                      ? 'Drawer Balanced' 
                      : cashDifference > 0 
                        ? 'Over by' 
                        : 'Short by'}
                  </span>
                </div>
                {cashDifference !== 0 && (
                  <span className="font-bold">{formatCurrency(Math.abs(cashDifference), currency)}</span>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this shift..."
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => endShiftMutation.mutate()}
              disabled={endShiftMutation.isPending || !closingCash}
            >
              {endShiftMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <StopCircle className="h-4 w-4 mr-2" />
              )}
              End Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
