import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { format } from 'date-fns';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  XCircle, 
  Ticket, 
  Film, 
  Clock, 
  MapPin, 
  RotateCcw,
  Scan,
  User,
  Hash,
  Armchair,
  History,
  Barcode,
  QrCode,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

interface ScanHistoryItem {
  id: string;
  reference: string;
  customerName: string;
  movieTitle: string;
  isValid: boolean;
  timestamp: Date;
  scanType: 'qr' | 'barcode' | 'manual';
}

// Supported barcode formats for ticket scanning
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

// Audio feedback functions
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6 note
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Audio not supported');
  }
};

const playErrorSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.log('Audio not supported');
  }
};

// Haptic feedback function
const triggerHaptic = (pattern: 'success' | 'error') => {
  if ('vibrate' in navigator) {
    if (pattern === 'success') {
      navigator.vibrate([50, 30, 50]); // Two short buzzes
    } else {
      navigator.vibrate([200, 100, 200]); // Two long buzzes
    }
  }
};

export default function TicketScanner() {
  const { data: profile } = useUserProfile();
  const [manualRef, setManualRef] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lastScanType, setLastScanType] = useState<'qr' | 'barcode' | 'manual'>('manual');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraInitializing, setCameraInitializing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load scan history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('scanHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setScanHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (e) {
        console.error('Failed to parse scan history');
      }
    }
  }, []);

  // Save scan history to localStorage when it changes
  useEffect(() => {
    if (scanHistory.length > 0) {
      localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
    }
  }, [scanHistory]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const addToHistory = useCallback((info: TicketInfo, scanType: 'qr' | 'barcode' | 'manual') => {
    if (!info.booking?.booking_reference) return;
    
    const historyItem: ScanHistoryItem = {
      id: crypto.randomUUID(),
      reference: info.booking.booking_reference,
      customerName: info.booking.customer_name,
      movieTitle: info.showtime.movie_title || 'Unknown',
      isValid: info.isValid,
      timestamp: new Date(),
      scanType,
    };
    
    setScanHistory(prev => [historyItem, ...prev].slice(0, 10)); // Keep only last 10
  }, []);

  const initializeScanner = useCallback(async () => {
    setCameraInitializing(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader', {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText, result) => {
          // Determine if it was a QR code or barcode
          const format = result?.result?.format?.formatName;
          const isQR = format === 'QR_CODE' || !format;
          setLastScanType(isQR ? 'qr' : 'barcode');
          handleScan(decodedText, isQR ? 'qr' : 'barcode');
          stopScanner();
        },
        () => {
          // Ignore scan errors (no QR found in frame)
        }
      );
      setCameraInitializing(false);
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(error?.message || 'Unable to access camera. Please check permissions.');
      setCameraInitializing(false);
      setScanning(false);
    }
  }, []);

  const startScanner = () => {
    setCameraError(null);
    setTicketInfo(null);
    setScanning(true);
  };

  // Initialize the scanner after the DOM element is rendered
  useEffect(() => {
    if (scanning && !scannerRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scanning, initializeScanner]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScanning(false);
  };

  const handleScan = async (reference: string, scanType: 'qr' | 'barcode' | 'manual' = 'manual') => {
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
        const invalidResult: TicketInfo = {
          booking: {} as any,
          showtime: {} as any,
          seats: [],
          isValid: false,
          message: 'Booking not found. Please check the reference.',
        };
        setTicketInfo(invalidResult);
        
        // Audio and haptic feedback for invalid
        playErrorSound();
        triggerHaptic('error');
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
      } else if (booking.status === 'paid') {
        // Online ticket not yet activated at box office
        isValid = false;
        message = 'Online ticket not activated. Please visit the box office first.';
      } else if (booking.status !== 'activated' && booking.status !== 'confirmed') {
        isValid = false;
        message = `Invalid ticket status: ${booking.status}`;
      } else if (hoursDiff < -3) {
        isValid = false;
        message = 'Showtime has passed. Ticket expired.';
      } else if (hoursDiff > 2) {
        isValid = true;
        message = 'Valid ticket. Show starts in ' + Math.round(hoursDiff) + ' hours.';
      }

      const result: TicketInfo = {
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
      };

      setTicketInfo(result);
      
      // Add to history
      addToHistory(result, scanType);
      
      // Audio and haptic feedback
      if (isValid) {
        playSuccessSound();
        triggerHaptic('success');
      } else {
        playErrorSound();
        triggerHaptic('error');
      }

    } catch (error) {
      console.error('Scan error:', error);
      const errorResult: TicketInfo = {
        booking: {} as any,
        showtime: {} as any,
        seats: [],
        isValid: false,
        message: 'Error validating ticket. Please try again.',
      };
      setTicketInfo(errorResult);
      
      playErrorSound();
      triggerHaptic('error');
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

      toast.success('Entry granted! Ticket validated.');
    } catch (error) {
      console.error('Error marking ticket:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualRef.trim()) {
      handleScan(manualRef.trim(), 'manual');
      setManualRef('');
    }
  };

  const resetScanner = () => {
    setTicketInfo(null);
    setManualRef('');
    setCameraError(null);
  };

  const clearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem('scanHistory');
    toast.success('Scan history cleared');
  };

  const getScanTypeIcon = (type: 'qr' | 'barcode' | 'manual') => {
    switch (type) {
      case 'qr': return <QrCode className="h-3 w-3" />;
      case 'barcode': return <Barcode className="h-3 w-3" />;
      default: return <Hash className="h-3 w-3" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
            <Scan className="h-4 w-4" />
            Gate Control
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Scanner</h1>
          <p className="text-muted-foreground mt-1">
            Scan QR codes, barcodes, or enter booking references
          </p>
        </div>

        <div className="flex-1 max-w-lg mx-auto w-full px-4 pb-6 space-y-4">
          {/* Camera Scanner Section */}
          {!ticketInfo && !loading && (
            <Card className="overflow-hidden border-2 border-dashed">
              <CardContent className="p-0">
                {!scanning ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                      <Camera className="h-10 w-10 text-muted-foreground" />
                    </div>
                    {cameraError ? (
                      <div className="space-y-3">
                        <p className="text-sm text-destructive">{cameraError}</p>
                        <Button onClick={startScanner} variant="outline">
                          Try Again
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium">Camera Scanner</p>
                          <p className="text-sm text-muted-foreground">
                            Supports QR codes and barcodes
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <Badge variant="outline" className="gap-1">
                              <QrCode className="h-3 w-3" /> QR
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Barcode className="h-3 w-3" /> Barcode
                            </Badge>
                          </div>
                        </div>
                        <Button onClick={startScanner} size="lg" className="gap-2">
                          <Camera className="h-5 w-5" />
                          Start Scanning
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    {/* Camera Initializing Overlay */}
                    {cameraInitializing && (
                      <div className="absolute inset-0 z-20 bg-background/80 flex flex-col items-center justify-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
                          <Camera className="absolute inset-0 m-auto h-5 w-5 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Initializing camera...</p>
                        <p className="text-xs text-muted-foreground">Please allow camera access</p>
                      </div>
                    )}
                    
                    {/* Scanner Container */}
                    <div 
                      ref={containerRef}
                      id="qr-reader" 
                      className="w-full aspect-square bg-muted"
                    />
                    
                    {/* Overlay Frame */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-background/60" style={{
                        maskImage: 'linear-gradient(to bottom, black 20%, transparent 20%, transparent 80%, black 80%), linear-gradient(to right, black 20%, transparent 20%, transparent 80%, black 80%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 20%, transparent 80%, black 80%), linear-gradient(to right, black 20%, transparent 20%, transparent 80%, black 80%)',
                        maskComposite: 'intersect',
                        WebkitMaskComposite: 'source-in'
                      }} />
                      
                      {/* Corner Markers */}
                      <div className="absolute top-[20%] left-[20%] w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                      <div className="absolute top-[20%] right-[20%] w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                      <div className="absolute bottom-[20%] left-[20%] w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                      <div className="absolute bottom-[20%] right-[20%] w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                      
                      {/* Scanning Line Animation */}
                      <div className="absolute left-[22%] right-[22%] top-[25%] h-0.5 bg-primary/80 animate-pulse" />
                    </div>

                    {/* Stop Button */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button 
                        onClick={stopScanner} 
                        variant="secondary" 
                        size="sm"
                        className="gap-2 shadow-lg"
                      >
                        <CameraOff className="h-4 w-4" />
                        Stop Scanner
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Manual Entry */}
          {!ticketInfo && !loading && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground font-medium">
                    Or enter manually
                  </span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Booking reference (e.g., ABC12345)"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value.toUpperCase())}
                    className="pl-9 font-mono text-base"
                  />
                </div>
                <Button type="submit" disabled={!manualRef.trim()}>
                  Check
                </Button>
              </form>
            </>
          )}

          {/* Loading State */}
          {loading && (
            <Card className="border-2">
              <CardContent className="py-12 text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-muted" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <p className="mt-4 font-medium">Validating ticket...</p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </CardContent>
            </Card>
          )}

          {/* Result Section */}
          {ticketInfo && !loading && (
            <div className="space-y-4">
              {/* Status Banner */}
              <Card className={cn(
                "border-2 overflow-hidden",
                ticketInfo.isValid 
                  ? "border-green-500 bg-green-500/5" 
                  : "border-destructive bg-destructive/5"
              )}>
                <CardContent className="py-6 text-center">
                  <div className={cn(
                    "mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3",
                    ticketInfo.isValid ? "bg-green-500/20" : "bg-destructive/20"
                  )}>
                    {ticketInfo.isValid ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-destructive" />
                    )}
                  </div>
                  <h2 className={cn(
                    "text-xl font-bold",
                    ticketInfo.isValid ? "text-green-600 dark:text-green-400" : "text-destructive"
                  )}>
                    {ticketInfo.isValid ? 'Valid Ticket' : 'Invalid Ticket'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ticketInfo.message}
                  </p>
                </CardContent>
              </Card>

              {/* Ticket Details */}
              {ticketInfo.booking?.booking_reference && (
                <Card>
                  <CardContent className="py-4 space-y-4">
                    {/* Reference Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reference</span>
                      <Badge variant="secondary" className="font-mono text-base px-3 py-1">
                        {ticketInfo.booking.booking_reference}
                      </Badge>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Customer Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{ticketInfo.booking.customer_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{ticketInfo.booking.customer_email}</p>
                      </div>
                      <Badge 
                        variant={ticketInfo.booking.status === 'confirmed' ? 'default' : 'secondary'}
                        className="ml-auto shrink-0"
                      >
                        {ticketInfo.booking.status}
                      </Badge>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Show Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Film className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{ticketInfo.showtime.movie_title}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pl-[52px]">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(new Date(ticketInfo.showtime.start_time), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{ticketInfo.showtime.screen_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Seats */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Armchair className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {ticketInfo.seats.length} seat{ticketInfo.seats.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {ticketInfo.seats.map((seat, i) => (
                            <Badge 
                              key={i} 
                              variant={seat.seat_type === 'vip' ? 'default' : 'outline'}
                              className="font-mono"
                            >
                              {seat.row_label}{seat.seat_number}
                              {seat.seat_type === 'vip' && ' ★'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                {ticketInfo.isValid && ticketInfo.booking?.status === 'confirmed' && (
                  <Button onClick={markAsUsed} size="lg" className="flex-1 gap-2">
                    <Ticket className="h-5 w-5" />
                    Grant Entry
                  </Button>
                )}
                <Button 
                  onClick={resetScanner} 
                  variant="outline" 
                  size="lg"
                  className={cn("gap-2", !ticketInfo.isValid && "flex-1")}
                >
                  <RotateCcw className="h-5 w-5" />
                  Scan Next
                </Button>
              </div>
            </div>
          )}

          {/* Scan History */}
          {scanHistory.length > 0 && !loading && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Recent Scans</span>
                      <Badge variant="secondary" className="text-xs">
                        {scanHistory.length}
                      </Badge>
                    </div>
                    {historyOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    {scanHistory.map((item, index) => (
                      <div 
                        key={item.id}
                        className={cn(
                          "px-4 py-3 flex items-center gap-3",
                          index !== scanHistory.length - 1 && "border-b"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          item.isValid ? "bg-green-500/10" : "bg-destructive/10"
                        )}>
                          {item.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {item.reference}
                            </span>
                            <span className="text-muted-foreground">
                              {getScanTypeIcon(item.scanType)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.customerName} • {item.movieTitle}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right shrink-0">
                          {format(item.timestamp, 'h:mm a')}
                        </div>
                      </div>
                    ))}
                    
                    {/* Clear History Button */}
                    <div className="p-3 border-t">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Clear History
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Clear scan history?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete all {scanHistory.length} scan records from this device. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={clearHistory}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Clear All
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
