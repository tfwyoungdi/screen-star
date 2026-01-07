import { format } from 'date-fns';

interface BookingExportData {
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

export function useExportReports() {
  const exportToCSV = (bookings: BookingExportData[], filename: string = 'bookings-report') => {
    if (!bookings || bookings.length === 0) return;

    const headers = [
      'Reference',
      'Customer Name',
      'Customer Email',
      'Movie',
      'Screen',
      'Showtime',
      'Amount',
      'Status',
      'Booking Date',
    ];

    const rows = bookings.map((booking) => [
      booking.booking_reference,
      booking.customer_name,
      booking.customer_email,
      booking.showtimes?.movies?.title || 'N/A',
      booking.showtimes?.screens?.name || 'N/A',
      booking.showtimes?.start_time
        ? format(new Date(booking.showtimes.start_time), 'MMM d, yyyy h:mm a')
        : 'N/A',
      `$${Number(booking.total_amount).toFixed(2)}`,
      booking.status,
      format(new Date(booking.created_at), 'MMM d, yyyy h:mm a'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = (bookings: BookingExportData[], title: string = 'Booking Report') => {
    if (!bookings || bookings.length === 0) return;

    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
    const totalBookings = bookings.length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a2e; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; }
          .summary { display: flex; gap: 40px; margin: 20px 0 30px; }
          .summary-item { background: #f5f5f5; padding: 15px 25px; border-radius: 8px; }
          .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .summary-value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1a1a2e; color: white; padding: 12px 8px; text-align: left; font-size: 12px; }
          td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
          tr:nth-child(even) { background: #fafafa; }
          .status { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .status-paid { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .footer { margin-top: 30px; font-size: 11px; color: #666; text-align: center; }
          .amount { font-weight: bold; color: #D4AF37; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p style="color: #666;">Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Revenue</div>
            <div class="summary-value">$${totalRevenue.toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Bookings</div>
            <div class="summary-value">${totalBookings}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Avg Order Value</div>
            <div class="summary-value">$${(totalRevenue / totalBookings).toFixed(2)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Movie</th>
              <th>Showtime</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${bookings
              .map(
                (booking) => `
              <tr>
                <td><code>${booking.booking_reference}</code></td>
                <td>${booking.customer_name}</td>
                <td>${booking.showtimes?.movies?.title || 'N/A'}</td>
                <td>${booking.showtimes?.start_time ? format(new Date(booking.showtimes.start_time), 'MMM d, h:mm a') : 'N/A'}</td>
                <td class="amount">$${Number(booking.total_amount).toFixed(2)}</td>
                <td><span class="status status-${booking.status}">${booking.status.toUpperCase()}</span></td>
                <td>${format(new Date(booking.created_at), 'MMM d, yyyy')}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          This report was generated automatically. For questions, contact your cinema administrator.
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return { exportToCSV, exportToPDF };
}
