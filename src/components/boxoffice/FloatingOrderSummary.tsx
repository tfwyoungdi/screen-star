import { useState } from 'react';
import { ChevronUp, ChevronDown, ShoppingCart, Ticket, Popcorn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SelectedSeat {
  row_label: string;
  seat_number: number;
  seat_type: string;
  price: number;
}

interface ConcessionItem {
  id: string;
  name: string;
  price: number;
}

interface SelectedConcession {
  item: ConcessionItem;
  quantity: number;
}

interface FloatingOrderSummaryProps {
  selectedSeats: SelectedSeat[];
  selectedConcessions: SelectedConcession[];
  subtotal: number;
  onContinue: () => void;
}

export function FloatingOrderSummary({
  selectedSeats,
  selectedConcessions,
  subtotal,
  onContinue,
}: FloatingOrderSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const seatTotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const snackTotal = selectedConcessions.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const totalItems = selectedSeats.length + selectedConcessions.reduce((sum, c) => sum + c.quantity, 0);

  if (selectedSeats.length === 0 && selectedConcessions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
          {/* Collapsible Content - Order Details */}
          <CollapsibleContent>
            <div className="p-4 space-y-3 max-h-[40vh] overflow-y-auto border-b">
              {/* Seats Section */}
              {selectedSeats.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span>Seats ({selectedSeats.length})</span>
                    <span className="ml-auto text-primary">${seatTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedSeats.map((seat, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {seat.row_label}{seat.seat_number}
                        {seat.seat_type === 'vip' && <span className="ml-1 text-amber-600">VIP</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Snacks Section */}
              {selectedConcessions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Popcorn className="h-4 w-4 text-primary" />
                    <span>Snacks ({selectedConcessions.reduce((sum, c) => sum + c.quantity, 0)})</span>
                    <span className="ml-auto text-primary">${snackTotal.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1">
                    {selectedConcessions.map((concession) => (
                      <div key={concession.item.id} className="flex justify-between text-xs text-muted-foreground">
                        <span>{concession.quantity}x {concession.item.name}</span>
                        <span>${(concession.item.price * concession.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>

          {/* Always Visible Summary Bar */}
          <div className="p-3 flex items-center gap-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                  {totalItems}
                </Badge>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex-1 text-right">
              <span className="text-sm text-muted-foreground">Total: </span>
              <span className="text-lg font-bold text-primary">${subtotal.toFixed(2)}</span>
            </div>

            <Button 
              onClick={onContinue}
              className="h-10 px-4 touch-manipulation"
            >
              Continue
            </Button>
          </div>
        </div>
      </Collapsible>
    </div>
  );
}
