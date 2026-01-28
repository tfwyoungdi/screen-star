import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { format } from 'date-fns';
import { 
  Camera, CheckCircle2, XCircle, Ticket, Film, Clock, MapPin, 
  RotateCcw, User, Armchair, History, QrCode, ChevronDown, 
  ChevronUp, LogOut, Volume2, VolumeX, Vibrate
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUserProfile, useOrganization } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface TicketInfo {
  booking: {
    id: string;
    booking_reference: string;
    customer_name: string;
    status: string;
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
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

// Audio feedback
const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {}
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
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {}
};

const triggerHaptic = (pattern: 'success' | 'error') => {
  if ('vibrate' in navigator) {
    if (pattern === 'success') {
      navigator.vibrate([50, 30, 50]);
    } else {
      navigator.vibrate([200, 100, 200]);
    }
  }
};

export default function GateStaff() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();
  const { data: organization } = useOrganization();
  
  const [manualRef, setManualRef] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [todayStats, setTodayStats] = useState({ scanned: 0, valid: 0 });
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const waitForElement = useCallback((id: string, timeoutMs = 1500) => {
    return new Promise<void>((resolve, reject) => {
      const start = performance.now();
      const tick = () => {
        const el = document.getElementById(id);
        if (el) return resolve();
        if (performance.now() - start >= timeoutMs) {
          return reject(new Error(`Element #${id} not found after ${timeoutMs}ms`));
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }, []);

  const normalizeCameraError = useCallback((err: any) => {
    // html5-qrcode sometimes rejects with a string, and sometimes with a DOMException.
    if (!err) return { name: 'UnknownError', message: 'Unknown error', raw: '' };

    if (typeof err === 'string') {
      const raw = err;
      const nameMatch = raw.match(/^(\w+Error)/) ?? raw.match(/\b(\w+Error)\b/);
      const name = nameMatch?.[1] ?? 'UnknownError';
      return { name, message: raw, raw };
    }

    const name = err?.name ?? err?.error?.name ?? 'UnknownError';
    const message = err?.message ?? err?.error?.message ?? String(err);
    return { name, message, raw: String(err) };
  }, []);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('gateStaffHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setScanHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
        // Calculate today stats
        const today = new Date().toDateString();
        const todayItems = parsed.filter((item: any) => 
          new Date(item.timestamp).toDateString() === today
        );
        setTodayStats({
          scanned: todayItems.length,
          valid: todayItems.filter((i: any) => i.isValid).length
        });
      } catch (e) {}
    }
  }, []);

  // Save history
  useEffect(() => {
    if (scanHistory.length > 0) {
      localStorage.setItem('gateStaffHistory', JSON.stringify(scanHistory));
    }
  }, [scanHistory]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const addToHistory = useCallback((info: TicketInfo, reference: string, scanMethod: 'qr' | 'manual') => {
    const historyItem: ScanHistoryItem = {
      id: crypto.randomUUID(),
      reference: info.booking?.booking_reference || reference,
      customerName: info.booking?.customer_name || 'Unknown',
      movieTitle: info.showtime?.movie_title || 'Unknown',
      isValid: info.isValid,
      timestamp: new Date(),
    };
    
    setScanHistory(prev => [historyItem, ...prev].slice(0, 50));
    setTodayStats(prev => ({
      scanned: prev.scanned + 1,
      valid: info.isValid ? prev.valid + 1 : prev.valid
    }));
  }, []);

  const logScanToDatabase = useCallback(async (
    info: TicketInfo, 
    reference: string, 
    scanMethod: 'qr' | 'manual'
  ) => {
    if (!profile?.organization_id) return;
    
    try {
      const normalizedRef = (info.booking?.booking_reference || reference).toUpperCase();
      
      // Check if this booking reference was already logged as a valid scan
      const { data: existingLogs } = await supabase
        .from('scan_logs')
        .select('id, is_valid')
        .eq('organization_id', profile.organization_id)
        .eq('booking_reference', normalizedRef)
        .eq('is_valid', true)
        .limit(1);

      // If a valid scan already exists, skip logging to prevent duplicates
      if (existingLogs && existingLogs.length > 0 && info.isValid) {
        console.log(`Duplicate valid scan skipped for: ${normalizedRef}`);
        return;
      }

      const seatsInfo = info.seats?.length > 0 
        ? info.seats.map(s => `${s.row_label}${s.seat_number}`).join(', ')
        : null;

      await supabase.from('scan_logs').insert({
        organization_id: profile.organization_id,
        scanned_by: profile.id,
        booking_id: info.booking?.id || null,
        booking_reference: normalizedRef,
        customer_name: info.booking?.customer_name || null,
        movie_title: info.showtime?.movie_title || null,
        showtime_start: info.showtime?.start_time || null,
        screen_name: info.showtime?.screen_name || null,
        seats_info: seatsInfo,
        is_valid: info.isValid,
        result_message: info.message,
        scan_method: scanMethod,
      });
    } catch (error) {
      console.error('Failed to log scan to database:', error);
      // Don't block the UI flow if logging fails
    }
  }, [profile?.organization_id, profile?.id]);

  const startScanner = async () => {
    if (scanning) return;
    setTicketInfo(null);

    // Preflight: common mobile failure modes
    if (!window.isSecureContext && window.location.protocol !== 'https:') {
      toast.error('Camera requires HTTPS. Please open the site using https://', { duration: 6000 });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera is not supported in this browser. Please use Safari or Chrome.', { duration: 6000 });
      return;
    }

    // Mount the QR reader element *before* starting html5-qrcode
    setScanning(true);
    try {
      await waitForElement('gate-qr-reader', 1500);
    } catch (e) {
      console.error('QR reader mount timeout:', e);
      toast.error('Scanner failed to start (UI not ready). Please reload and try again.', { duration: 6000 });
      setScanning(false);
      return;
    }

    const createAndStart = async (cameraConfig: any, fps = 15, qrbox: any = { width: 280, height: 280 }) => {
      const html5QrCode = new Html5Qrcode('gate-qr-reader', {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraConfig,
        { fps, qrbox },
        (decodedText) => {
          handleScan(decodedText, 'qr');
          stopScanner();
        },
        () => {}
      );
    };

    try {
      await createAndStart({ facingMode: { ideal: 'environment' } });
    } catch (error: any) {
      const normalized = normalizeCameraError(error);
      console.error('Camera access error:', { error, normalized });

      // If the first attempt fails for *any* non-permission/security reason, try selecting a camera explicitly.
      const shouldTryFallback = ![
        'NotAllowedError',
        'PermissionDeniedError',
        'SecurityError',
        'NotReadableError',
        'TrackStartError',
      ].includes(normalized.name);

      if (shouldTryFallback) {
        try {
          toast('Trying another camera…');
          const cameras = await Html5Qrcode.getCameras();
          const preferred =
            cameras.find((c) => /back|rear|environment/i.test(c.label)) ?? cameras[0];

          if (!preferred) throw new Error('No cameras available');

          await createAndStart({ deviceId: { exact: preferred.id } }, 12, 250);
          return;
        } catch (fallbackError) {
          const fallbackNormalized = normalizeCameraError(fallbackError);
          console.error('Camera fallback error:', { fallbackError, fallbackNormalized });
          // fall through to user-facing error handling below
        }
      }

      if (normalized.name === 'NotAllowedError' || normalized.name === 'PermissionDeniedError') {
        toast.error(
          'Camera permission denied. Go to your browser settings → Site settings → Camera and allow access for this site.',
          { duration: 6000 }
        );
      } else if (normalized.name === 'NotFoundError' || normalized.name === 'DevicesNotFoundError') {
        toast.error('No camera found on this device.');
      } else if (normalized.name === 'NotReadableError' || normalized.name === 'TrackStartError') {
        toast.error('Camera is in use by another app. Please close other apps using the camera.');
      } else if (normalized.name === 'SecurityError') {
        toast.error(
          'Camera access blocked. This site must be accessed via HTTPS. Please check the URL starts with https://',
          { duration: 6000 }
        );
      } else {
        toast.error(
          `Camera error (${normalized.name}): ${normalized.message || 'Unknown error'}. Try reloading the page or use manual entry.`,
          { duration: 6000 }
        );
      }
      // Ensure we clean up any partially created scanner instance
      try {
        await stopScanner();
      } catch {}
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (error) {}

      try {
        // html5-qrcode recommends clear() to remove the video element & listeners
        await (scannerRef.current as any).clear?.();
      } catch (error) {}

      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (reference: string, scanMethod: 'qr' | 'manual' = 'qr') => {
    if (!profile?.organization_id) return;
    
    setLoading(true);
    setTicketInfo(null);

    try {
      let bookingRef = reference;
      try {
        const parsed = JSON.parse(reference);
        bookingRef = parsed.ref || parsed.booking_reference || reference;
      } catch {}

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
          message: 'Booking not found',
        };
        setTicketInfo(invalidResult);
        addToHistory(invalidResult, bookingRef, scanMethod);
        logScanToDatabase(invalidResult, bookingRef, scanMethod);
        if (soundEnabled) playErrorSound();
        triggerHaptic('error');
        return;
      }

      const { data: seats } = await supabase
        .from('booked_seats')
        .select('row_label, seat_number, seat_type')
        .eq('booking_id', booking.id);

      const showtimeDate = new Date(booking.showtimes.start_time);
      const now = new Date();
      const hoursDiff = (showtimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      let isValid = true;
      let message = '✓ Entry Allowed';

      if (booking.status === 'used') {
        isValid = false;
        message = 'Already used';
      } else if (booking.status === 'cancelled') {
        isValid = false;
        message = 'Cancelled';
      } else if (hoursDiff < -3) {
        isValid = false;
        message = 'Expired';
      } else if (hoursDiff > 2) {
        message = `Show in ${Math.round(hoursDiff)}h`;
      }

      const result: TicketInfo = {
        booking: {
          id: booking.id,
          booking_reference: booking.booking_reference,
          customer_name: booking.customer_name,
          status: booking.status,
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
      addToHistory(result, bookingRef, scanMethod);
      logScanToDatabase(result, bookingRef, scanMethod);
      
      if (soundEnabled) {
        if (isValid) playSuccessSound();
        else playErrorSound();
      }
      triggerHaptic(isValid ? 'success' : 'error');

      // Auto-mark as used if valid
      if (isValid && booking.status !== 'used') {
        await supabase
          .from('bookings')
          .update({ status: 'used' })
          .eq('id', booking.id);
      }

    } catch (error) {
      const errorResult: TicketInfo = {
        booking: {} as any,
        showtime: {} as any,
        seats: [],
        isValid: false,
        message: 'Error validating',
      };
      setTicketInfo(errorResult);
      addToHistory(errorResult, reference, scanMethod);
      logScanToDatabase(errorResult, reference, scanMethod);
      if (soundEnabled) playErrorSound();
      triggerHaptic('error');
    } finally {
      setLoading(false);
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
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!profile?.organization_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Compact Header */}
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {organization?.logo_url ? (
            <img 
              src={organization.logo_url} 
              alt={organization.name} 
              className="h-10 w-auto max-w-[120px] object-contain"
            />
          ) : (
            <>
              <QrCode className="h-6 w-6 text-primary" />
              <span className="font-bold">{organization?.name || 'Gate Scanner'}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-muted rounded-lg text-sm">
            <span className="font-medium">{todayStats.valid}/{todayStats.scanned}</span>
            <span className="text-muted-foreground text-xs">today</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Scanner Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Result Display */}
        {ticketInfo && (
          <div 
            className={cn(
              'w-full max-w-md mb-6 rounded-3xl p-6 text-center transition-all',
              ticketInfo.isValid 
                ? 'bg-green-500/20 border-4 border-green-500' 
                : 'bg-destructive/20 border-4 border-destructive'
            )}
          >
            <div className={cn(
              'w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center',
              ticketInfo.isValid ? 'bg-green-500' : 'bg-destructive'
            )}>
              {ticketInfo.isValid ? (
                <CheckCircle2 className="h-14 w-14 text-white" />
              ) : (
                <XCircle className="h-14 w-14 text-white" />
              )}
            </div>
            
            <p className={cn(
              'text-3xl font-bold mb-2',
              ticketInfo.isValid ? 'text-green-600' : 'text-destructive'
            )}>
              {ticketInfo.message}
            </p>

            {ticketInfo.booking?.booking_reference && (
              <div className="mt-4 space-y-3 text-left bg-background/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{ticketInfo.booking.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Film className="h-5 w-5 text-muted-foreground" />
                  <span>{ticketInfo.showtime.movie_title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span>{format(new Date(ticketInfo.showtime.start_time), 'h:mm a')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span>{ticketInfo.showtime.screen_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Armchair className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1.5">
                    {ticketInfo.seats.map(seat => (
                      <Badge 
                        key={`${seat.row_label}${seat.seat_number}`}
                        variant={seat.seat_type === 'vip' ? 'default' : 'secondary'}
                      >
                        {seat.row_label}{seat.seat_number}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button 
              size="lg" 
              className="w-full mt-6 h-14 text-lg touch-manipulation"
              onClick={resetScanner}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Scan Next Ticket
            </Button>
          </div>
        )}

        {/* Scanner */}
        {!ticketInfo && !loading && (
          <div className="w-full max-w-md space-y-4">
            <Card className="overflow-hidden border-4 border-dashed border-primary/30">
              <CardContent className="p-0">
                {!scanning ? (
                  <div className="aspect-square flex flex-col items-center justify-center p-8 bg-muted/30">
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <Camera className="h-16 w-16 text-primary" />
                    </div>
                    <Button 
                      size="lg" 
                      className="h-16 px-12 text-xl touch-manipulation"
                      onClick={startScanner}
                    >
                      <Camera className="h-6 w-6 mr-3" />
                      Start Scanning
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div 
                      id="gate-qr-reader" 
                      className="w-full aspect-square bg-black"
                    />
                    {/* Scanner overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-4 border-primary rounded-3xl">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="lg"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2"
                      onClick={stopScanner}
                    >
                      Stop Scanner
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Entry */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Enter booking reference..."
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value.toUpperCase())}
                className="h-14 text-lg font-mono uppercase text-center"
              />
              <Button type="submit" size="lg" className="h-14 px-6" disabled={!manualRef.trim()}>
                Check
              </Button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium">Validating...</p>
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && !ticketInfo && (
          <div className="w-full max-w-md mt-6">
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Scans
                  </span>
                  {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 mt-2">
                  {scanHistory.slice(0, 5).map(item => (
                    <div 
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        item.isValid ? 'bg-green-500/10' : 'bg-destructive/10'
                      )}
                    >
                      <div>
                        <p className="font-mono font-medium">{item.reference}</p>
                        <p className="text-xs text-muted-foreground">{item.movieTitle}</p>
                      </div>
                      <div className="text-right">
                        {item.isValid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(item.timestamp, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </main>
    </div>
  );
}
