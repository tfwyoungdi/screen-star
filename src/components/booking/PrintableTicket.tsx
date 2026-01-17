import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Film, Calendar, Clock, MapPin, Ticket, Popcorn } from 'lucide-react';
import { forwardRef } from 'react';

interface SelectedSeat {
  row_label: string;
  seat_number: number;
  seat_type: string;
  price: number;
}

interface SelectedConcession {
  item: { id: string; name: string; price: number };
  quantity: number;
}

interface SelectedCombo {
  combo: { id: string; name: string; combo_price: number };
  quantity: number;
}

interface PrintableTicketProps {
  cinemaName: string;
  cinemaLogo?: string | null;
  primaryColor: string;
  movieTitle: string;
  moviePoster?: string | null;
  showtime: string;
  screenName: string;
  seats: SelectedSeat[];
  bookingRef: string;
  customerName: string;
  concessions?: SelectedConcession[];
  combos?: SelectedCombo[];
}

export const PrintableTicket = forwardRef<HTMLDivElement, PrintableTicketProps>(({
  cinemaName,
  cinemaLogo,
  primaryColor,
  movieTitle,
  moviePoster,
  showtime,
  screenName,
  seats,
  bookingRef,
  customerName,
  concessions = [],
  combos = [],
}, ref) => {
  const showtimeDate = new Date(showtime);
  const hasSnacks = concessions.length > 0 || combos.length > 0;

  return (
    <div 
      ref={ref}
      className="w-[400px] font-sans"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      {/* Main Ticket */}
      <div className="relative overflow-hidden rounded-2xl" style={{ backgroundColor: '#0f0f1a' }}>
        {/* Header with gradient */}
        <div 
          className="px-6 py-4 text-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}88)` }}
        >
          {/* Decorative circles */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full" style={{ backgroundColor: '#1a1a2e' }} />
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full" style={{ backgroundColor: '#1a1a2e' }} />
          
          {cinemaLogo ? (
            <img src={cinemaLogo} alt={cinemaName} className="h-8 mx-auto mb-1 object-contain" />
          ) : (
            <div className="flex items-center justify-center gap-2 mb-1">
              <Film className="h-5 w-5 text-white" />
              <span className="text-white font-bold text-lg">{cinemaName}</span>
            </div>
          )}
          <p className="text-white/80 text-xs uppercase tracking-wider">Admission Ticket</p>
        </div>

        {/* Movie Poster Section */}
        <div className="relative">
          {moviePoster ? (
            <div className="h-32 overflow-hidden">
              <img 
                src={moviePoster} 
                alt={movieTitle}
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f0f1a]" />
            </div>
          ) : (
            <div className="h-20" style={{ background: `linear-gradient(180deg, ${primaryColor}22, transparent)` }} />
          )}
          
          {/* Movie Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
            <h2 className="text-white text-xl font-bold leading-tight">{movieTitle}</h2>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="px-6 py-5 space-y-4">
          {/* Date, Time, Screen Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Calendar className="h-4 w-4 mx-auto mb-1.5" style={{ color: primaryColor }} />
              <p className="text-white/50 text-[10px] uppercase mb-0.5">Date</p>
              <p className="text-white text-sm font-semibold">{format(showtimeDate, 'MMM d')}</p>
              <p className="text-white/70 text-xs">{format(showtimeDate, 'yyyy')}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <Clock className="h-4 w-4 mx-auto mb-1.5" style={{ color: primaryColor }} />
              <p className="text-white/50 text-[10px] uppercase mb-0.5">Time</p>
              <p className="text-white text-sm font-semibold">{format(showtimeDate, 'h:mm')}</p>
              <p className="text-white/70 text-xs">{format(showtimeDate, 'a')}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <MapPin className="h-4 w-4 mx-auto mb-1.5" style={{ color: primaryColor }} />
              <p className="text-white/50 text-[10px] uppercase mb-0.5">Screen</p>
              <p className="text-white text-sm font-semibold">{screenName}</p>
            </div>
          </div>

          {/* Seats */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="h-4 w-4" style={{ color: primaryColor }} />
              <span className="text-white/50 text-xs uppercase">Seats</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {seats.map((seat, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1.5 rounded-lg text-white font-bold text-sm"
                  style={{ backgroundColor: `${primaryColor}33`, border: `1px solid ${primaryColor}66` }}
                >
                  {seat.row_label}{seat.seat_number}
                </span>
              ))}
            </div>
          </div>

          {/* Snacks (if any) */}
          {hasSnacks && (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Popcorn className="h-4 w-4" style={{ color: primaryColor }} />
                <span className="text-white/50 text-xs uppercase">Concessions</span>
              </div>
              <div className="space-y-1.5">
                {combos.map((c) => (
                  <div key={c.combo.id} className="flex justify-between text-sm">
                    <span className="text-white/80">{c.quantity}x {c.combo.name}</span>
                  </div>
                ))}
                {concessions.map((c) => (
                  <div key={c.item.id} className="flex justify-between text-sm">
                    <span className="text-white/80">{c.quantity}x {c.item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Name */}
          <div className="text-center">
            <p className="text-white/50 text-xs uppercase mb-1">Ticket Holder</p>
            <p className="text-white font-semibold">{customerName}</p>
          </div>
        </div>

        {/* Perforated line */}
        <div className="relative px-6">
          <div className="border-t-2 border-dashed border-white/20" />
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full" style={{ backgroundColor: '#1a1a2e' }} />
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full" style={{ backgroundColor: '#1a1a2e' }} />
        </div>

        {/* QR Code Section */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-5">
            {/* QR Code */}
            <div className="bg-white p-3 rounded-xl shrink-0">
              <QRCodeSVG
                value={JSON.stringify({ ref: bookingRef })}
                size={100}
                level="H"
              />
            </div>
            
            {/* Booking Reference */}
            <div className="flex-1 text-center">
              <p className="text-white/50 text-xs uppercase mb-1">Booking Reference</p>
              <p 
                className="text-2xl font-mono font-bold tracking-wider"
                style={{ color: primaryColor }}
              >
                {bookingRef}
              </p>
              <p className="text-white/40 text-xs mt-2">Scan QR code at gate for entry</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-3 text-center"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <p className="text-white/40 text-xs">
            Present this ticket at the entrance • Non-transferable • No refunds
          </p>
        </div>
      </div>
    </div>
  );
});

PrintableTicket.displayName = 'PrintableTicket';
