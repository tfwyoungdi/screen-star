import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

interface BookingStatusChartProps {
  data: {
    completed: number;
    pending: number;
    cancelled: number;
  };
  className?: string;
}

const STATUS_COLORS = {
  completed: 'hsl(var(--primary))',
  pending: 'hsl(45, 93%, 47%)',
  cancelled: 'hsl(0, 72%, 51%)',
};

export function BookingStatusChart({ data, className }: BookingStatusChartProps) {
  const total = data.completed + data.pending + data.cancelled;
  const completedPercent = total > 0 ? Math.round((data.completed / total) * 100) : 0;

  const chartData = [
    { name: 'Completed', value: data.completed, color: STATUS_COLORS.completed },
    { name: 'Pending', value: data.pending, color: STATUS_COLORS.pending },
    { name: 'Cancelled', value: data.cancelled, color: STATUS_COLORS.cancelled },
  ].filter(item => item.value > 0);

  if (total === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8', className)}>
        <div className="w-32 h-32 rounded-full border-8 border-muted flex items-center justify-center">
          <span className="text-2xl font-bold text-muted-foreground">0%</span>
        </div>
        <p className="text-sm text-muted-foreground mt-4">No bookings yet</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number, name: string) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-bold text-foreground">{completedPercent}%</span>
        <span className="text-xs text-muted-foreground">Completed</span>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.completed }} />
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.pending }} />
          <span className="text-xs text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS.cancelled }} />
          <span className="text-xs text-muted-foreground">Cancelled</span>
        </div>
      </div>
    </div>
  );
}
