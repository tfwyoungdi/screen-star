import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { format } from 'date-fns';
import { Loader2, QrCode, CheckCircle, XCircle, Ticket, Film, Clock, MapPin, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TicketInfo {
  booking: {
    id: string;
    booking_reference: string;
    customer_name: string;
    customer_email: string;
    status: string;
    created_at: string;
  };
  showtime: {
    start_time: string;
    movie_title: string;
    screen_name: string;
  };
  seats: {
    row_label: string;
    seat_number: number;
    seat_type: string;
  }[];
  isValid: boolean;
  message: string;
}

export default function TicketScanner() {
  const { data: profile } = useUserProfile();
  const [manualRef, setManualRef] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const startScanner = () => {
    setScanning(true);
    setTicketInfo(null);

    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          handleScan(decodedText);
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
          }
          setScanning(false);
        },
        (error) => {
          // Ignore scan errors
        }
      );
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }
    setScanning(false);
  };

  const handleScan = async (reference: string) => {
    if (!profile?.organization_id) return;
    
    setLoading(true);
    setTicketInfo(null);

    try {
      // Parse the QR code data (expected format: BOOKING_REF or JSON with ref)
      let bookingRef = reference;
      try {
        const parsed = JSON.parse(reference);
        bookingRef = parsed.ref || parsed.booking_reference || reference;
      } catch {
        // Not JSON, use as-is
      }

      // Fetch booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          showtimes (
            start_time,
            movies (title),
            screens (name)
          )
        `)
        .eq('organization_id', profile.organization_id)
        .eq('booking_reference', bookingRef.toUpperCase())
        .maybeSingle();

      if (bookingError) throw bookingError;

      if (!booking) {
        setTicketInfo({
          booking: {} as any,
          showtime: {} as any,
          seats: [],
          isValid: false,
          message: 'Booking not found. Please check the reference.',
        });
        return;
      }

      // Fetch booked seats
      const { data: seats } = await supabase
        .from('booked_seats')
        .select('row_label, seat_number, seat_type')
        .eq('booking_id', booking.id);

      // Validate booking
      const showtimeDate = new Date(booking.showtimes.start_time);
      const now = new Date();
      const hoursDiff = (showtimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      let isValid = true;
      let message = 'Ticket is valid. Entry allowed.';

      if (booking.status === 'used') {
        isValid = false;
        message = 'Ticket has already been used.';
      } else if (booking.status === 'cancelled') {
        isValid = false;
        message = 'Booking has been cancelled.';
      } else if (hoursDiff < -3) {
        isValid = false;
        message = 'Showtime has passed. Ticket expired.';
      } else if (hoursDiff > 2) {
        isValid = true;
        message = 'Valid ticket. Show starts in ' + Math.round(hoursDiff) + ' hours.';
      }

      setTicketInfo({
        booking: {
          id: booking.id,
          booking_reference: booking.booking_reference,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          status: booking.status,
          created_at: booking.created_at,
        },
        showtime: {
          start_time: booking.showtimes.start_time,
          movie_title: booking.showtimes.movies.title,
          screen_name: booking.showtimes.screens.name,
        },
        seats: seats || [],
        isValid,
        message,
      });

    } catch (error) {
      console.error('Scan error:', error);
      setTicketInfo({
        booking: {} as any,
        showtime: {} as any,
        seats: [],
        isValid: false,
        message: 'Error validating ticket. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsUsed = async () => {
    if (!ticketInfo?.booking?.id) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'used' })
        .eq('id', ticketInfo.booking.id);

      if (error) throw error;

      setTicketInfo(prev => prev ? {
        ...prev,
        booking: { ...prev.booking, status: 'used' },
        isValid: false,
        message: 'Ticket marked as used.',
      } : null);

      toast.success('Ticket validated and marked as used');
    } catch (error) {
      console.error('Error marking ticket:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualRef.trim()) {
      handleScan(manualRef.trim());
      setManualRef('');
    }
  };

  const resetScanner = () => {
    setTicketInfo(null);
    setManualRef('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Ticket Scanner</h1>
          <p className="text-muted-foreground">
            Scan QR codes or enter booking references to validate tickets
          </p>
        </div>

        {/* Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scan Ticket
            </CardTitle>
            <CardDescription>
              Use the camera to scan the QR code on the ticket
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!scanning ? (
              <Button onClick={startScanner} className="w-full" size="lg">
                <QrCode className="mr-2 h-5 w-5" />
                Start Camera Scanner
              </Button>
            ) : (
              <div className="space-y-4">
                <div id="qr-reader" className="rounded-lg overflow-hidden" />
                <Button onClick={stopScanner} variant="outline" className="w-full">
                  Stop Scanner
                </Button>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="manual-ref" className="sr-only">Booking Reference</Label>
                <Input
                  id="manual-ref"
                  placeholder="Enter booking reference (e.g., ABC12345)"
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              <Button type="submit" disabled={!manualRef.trim() || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-muted-foreground">Validating ticket...</p>
            </CardContent>
          </Card>
        )}

        {/* Result Section */}
        {ticketInfo && !loading && (
          <Card className={ticketInfo.isValid ? 'border-green-500' : 'border-destructive'}>
            <CardContent className="pt-6 space-y-4">
              {/* Status Alert */}
              <Alert variant={ticketInfo.isValid ? 'default' : 'destructive'}>
                {ticketInfo.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {ticketInfo.isValid ? 'Valid Ticket' : 'Invalid Ticket'}
                </AlertTitle>
                <AlertDescription>{ticketInfo.message}</AlertDescription>
              </Alert>

              {/* Ticket Details */}
              {ticketInfo.booking?.booking_reference && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reference</span>
                    <Badge variant="outline" className="font-mono text-lg">
                      {ticketInfo.booking.booking_reference}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{ticketInfo.booking.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={ticketInfo.booking.status === 'confirmed' ? 'default' : 'secondary'}>
                        {ticketInfo.booking.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{ticketInfo.showtime.movie_title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(ticketInfo.showtime.start_time), 'MMM d, yyyy')} at{' '}
                        {format(new Date(ticketInfo.showtime.start_time), 'h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{ticketInfo.showtime.screen_name}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Seats ({ticketInfo.seats.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ticketInfo.seats.map((seat, i) => (
                        <Badge key={i} variant="secondary">
                          {seat.row_label}{seat.seat_number}
                          {seat.seat_type === 'vip' && ' (VIP)'}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t pt-4 flex gap-2">
                    {ticketInfo.isValid && ticketInfo.booking.status === 'confirmed' && (
                      <Button onClick={markAsUsed} className="flex-1">
                        <Ticket className="mr-2 h-4 w-4" />
                        Mark as Used & Allow Entry
                      </Button>
                    )}
                    <Button onClick={resetScanner} variant="outline">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Scan Another
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
