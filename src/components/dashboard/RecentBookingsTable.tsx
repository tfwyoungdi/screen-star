import { format } from 'date-fns';
import { MoreHorizontal, ExternalLink, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
  showtimes?: {
    start_time: string;
    movies?: { title: string };
    screens?: { name: string };
  };
}

interface RecentBookingsTableProps {
  bookings: Booking[];
  isLoading?: boolean;
}

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
};

export function RecentBookingsTable({
  bookings,
  isLoading,
}: RecentBookingsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-12 bg-muted/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 bg-muted/50 rounded-full mb-4">
          <ExternalLink className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No recent bookings</p>
        <p className="text-sm text-muted-foreground/70">
          Bookings will appear here once customers start purchasing tickets
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="text-muted-foreground font-medium">Reference</TableHead>
            <TableHead className="text-muted-foreground font-medium">Customer</TableHead>
            <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Movie</TableHead>
            <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Date</TableHead>
            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
            <TableHead className="text-right text-muted-foreground font-medium">Amount</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow
              key={booking.id}
              className="group hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <TableCell>
                <Badge
                  variant="outline"
                  className="font-mono text-xs bg-muted/50"
                >
                  {booking.booking_reference}
                </Badge>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">
                    {booking.customer_name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {booking.customer_email}
                  </p>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="line-clamp-1 max-w-[150px]">
                  {booking.showtimes?.movies?.title || '-'}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {format(new Date(booking.created_at), 'MMM d, h:mm a')}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize text-xs',
                    statusStyles[booking.status] || 'bg-muted text-muted-foreground'
                  )}
                >
                  {booking.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-semibold text-primary">
                  ${Number(booking.total_amount).toFixed(2)}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
