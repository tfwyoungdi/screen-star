import { useState } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Shield, Loader2, Copy, Check, QrCode, User, Mail, Phone, Calendar, Film, MapPin, Ticket } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  total_amount: number;
  discount_amount?: number | null;
  status: string;
  created_at: string;
  showtimes?: {
    start_time: string;
    price?: number;
    movies?: { title: string };
    screens?: { name: string };
  };
}

interface BookingDetailsDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingUpdated?: (booking: Booking) => void;
}

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
};

export function BookingDetailsDialog({
  booking,
  open,
  onOpenChange,
  onBookingUpdated,
}: BookingDetailsDialogProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopyReference = async () => {
    if (!booking) return;
    await navigator.clipboard.writeText(booking.booking_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateReference = async () => {
    if (!booking) return;
    
    setRegenerating(true);
    try {
      // Generate new unique reference
      const { data: newReference, error: rpcError } = await supabase.rpc('generate_booking_reference');
      
      if (rpcError) throw rpcError;

      // Update the booking with new reference
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ booking_reference: newReference })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      toast({
        title: 'Reference Regenerated',
        description: `New reference: ${newReference}`,
      });

      // Notify parent of update
      if (onBookingUpdated) {
        onBookingUpdated({ ...booking, booking_reference: newReference as string });
      }
    } catch (error: any) {
      console.error('Failed to regenerate reference:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate booking reference',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
      setShowConfirmDialog(false);
    }
  };

  if (!booking) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Booking Details
            </DialogTitle>
            <DialogDescription>
              View and manage booking information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Booking Reference Section */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Booking Reference</span>
                <Badge
                  variant="outline"
                  className={cn('capitalize', statusStyles[booking.status])}
                >
                  {booking.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <code className="flex-1 text-2xl font-mono font-bold text-primary tracking-wider">
                  {booking.booking_reference}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyReference}
                  className="h-8 w-8"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Unique Guarantee Badge */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>Guaranteed unique • Database verified</span>
              </div>

              {/* Regenerate Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                disabled={regenerating}
                className="w-full mt-2"
              >
                {regenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Reference
                  </>
                )}
              </Button>
            </div>

            <Separator />

            {/* Customer Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Customer Information</h4>
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{booking.customer_email}</span>
                </div>
                {booking.customer_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{booking.customer_phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Showtime Info */}
            {booking.showtimes && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Showtime Details</h4>
                <div className="grid gap-3">
                  {booking.showtimes.movies && (
                    <div className="flex items-center gap-3">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{booking.showtimes.movies.title}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {format(new Date(booking.showtimes.start_time), 'EEEE, MMMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  {booking.showtimes.screens && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{booking.showtimes.screens.name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Payment Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Payment Summary</h4>
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                {booking.discount_amount && booking.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-500">
                    <span>Discount Applied</span>
                    <span>-${Number(booking.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total Paid</span>
                  <span className="text-primary">${Number(booking.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Booking Date */}
            <div className="text-xs text-muted-foreground text-center">
              Booked on {format(new Date(booking.created_at), 'MMMM d, yyyy at h:mm a')}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Regenerate */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Booking Reference?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new unique reference code for this booking. The old reference 
              <code className="mx-1 px-2 py-0.5 bg-muted rounded font-mono text-foreground">
                {booking.booking_reference}
              </code>
              will no longer be valid.
              <br /><br />
              <strong>The customer will need to be notified of their new booking reference.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenerateReference}
              disabled={regenerating}
              className="bg-primary hover:bg-primary/90"
            >
              {regenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Regenerate Reference'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
