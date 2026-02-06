import { format } from 'date-fns';

interface CinemaReportData {
  name: string;
  gross: number;
  commission: number;
  count: number;
}

interface RevenueData {
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  transactionCount: number;
  uniqueCinemas: number;
}

interface CinemaStats {
  newCinemas: number;
  totalCinemas: number;
}

export function usePlatformExportPDF() {
  const exportReportToPDF = (
    topCinemas: CinemaReportData[],
    revenueData: RevenueData | undefined,
    cinemaStats: CinemaStats | undefined,
    periodLabel: string
  ) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Platform Performance Report</title>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 40px; 
            color: #1a1a2e; 
            background: #fff;
            max-width: 900px;
            margin: 0 auto;
          }
          .header { 
            border-bottom: 3px solid #f59e0b; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
          }
          h1 { 
            color: #1a1a2e; 
            margin: 0 0 8px 0;
            font-size: 28px;
          }
          .subtitle {
            color: #666;
            font-size: 14px;
          }
          .kpi-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 16px; 
            margin: 30px 0; 
          }
          .kpi-card { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 12px; 
            border: 1px solid #e2e8f0;
          }
          .kpi-label { 
            font-size: 12px; 
            color: #64748b; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }
          .kpi-value { 
            font-size: 24px; 
            font-weight: 700; 
            color: #1a1a2e; 
          }
          .kpi-value.highlight { color: #f59e0b; }
          .kpi-value.green { color: #10b981; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            font-size: 14px;
          }
          th { 
            background: #1a1a2e; 
            color: white; 
            padding: 14px 12px; 
            text-align: left; 
            font-weight: 600;
          }
          th:first-child { border-radius: 8px 0 0 0; }
          th:last-child { border-radius: 0 8px 0 0; }
          td { 
            padding: 14px 12px; 
            border-bottom: 1px solid #e2e8f0; 
          }
          tr:nth-child(even) { background: #f8fafc; }
          tr:hover { background: #f1f5f9; }
          .rank { 
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px; 
            height: 28px; 
            border-radius: 50%; 
            font-weight: 600;
            font-size: 12px;
          }
          .rank-1 { background: #fef3c7; color: #d97706; }
          .rank-2 { background: #e2e8f0; color: #475569; }
          .rank-3 { background: #fed7aa; color: #c2410c; }
          .rank-other { background: #f1f5f9; color: #64748b; }
          .amount { font-weight: 600; }
          .amount.gross { color: #1a1a2e; }
          .amount.commission { color: #10b981; }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 12px; 
            color: #64748b; 
            text-align: center; 
          }
          .section-title {
            font-size: 18px;
            font-weight: 600;
            margin: 30px 0 15px;
            color: #1a1a2e;
          }
          @media print {
            body { padding: 20px; }
            .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Platform Performance Report</h1>
          <p class="subtitle">Period: ${periodLabel} • Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
        </div>
        
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Gross Revenue</div>
            <div class="kpi-value highlight">$${(revenueData?.totalGross || 0).toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Commission Earned</div>
            <div class="kpi-value green">$${(revenueData?.totalCommission || 0).toLocaleString()}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Active Cinemas</div>
            <div class="kpi-value">${revenueData?.uniqueCinemas || 0}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Transactions</div>
            <div class="kpi-value">${revenueData?.transactionCount || 0}</div>
          </div>
        </div>

        <div class="section-title">Top Performing Cinemas</div>
        ${topCinemas && topCinemas.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Cinema</th>
                <th>Gross Revenue</th>
                <th>Platform Commission</th>
                <th>Transactions</th>
              </tr>
            </thead>
            <tbody>
              ${topCinemas.map((cinema, index) => `
                <tr>
                  <td>
                    <span class="rank ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other'}">
                      ${index + 1}
                    </span>
                  </td>
                  <td>${cinema.name}</td>
                  <td class="amount gross">$${cinema.gross.toLocaleString()}</td>
                  <td class="amount commission">+$${cinema.commission.toLocaleString()}</td>
                  <td>${cinema.count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <p style="text-align: center; color: #64748b; padding: 40px;">No transaction data available for this period.</p>
        `}

        <div class="footer">
          <p>This report was generated automatically by the Cinitix Platform.</p>
          <p>Total Cinemas: ${cinemaStats?.totalCinemas || 0} • New Cinemas (this period): ${cinemaStats?.newCinemas || 0}</p>
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

  return { exportReportToPDF };
}
