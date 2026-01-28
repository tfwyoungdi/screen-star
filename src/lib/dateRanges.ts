import { startOfDay, endOfDay, subDays, subYears } from 'date-fns';

export const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today', days: 0 },
  { value: 'yesterday', label: 'Yesterday', days: 1 },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '60', label: 'Last 60 days', days: 60 },
  { value: '90', label: 'Last 90 days', days: 90 },
  { value: '365', label: 'Last year', days: 365 },
  { value: 'lifetime', label: 'Lifetime', days: -1 },
] as const;

export type DateRangeValue = typeof DATE_RANGE_OPTIONS[number]['value'];

export function getDateRange(rangeValue: DateRangeValue): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = endOfDay(now);

  switch (rangeValue) {
    case 'today':
      return { startDate: startOfDay(now), endDate };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) };
    case 'lifetime':
      // Use a date far in the past for lifetime
      return { startDate: new Date('2000-01-01'), endDate };
    default:
      const days = parseInt(rangeValue);
      return { startDate: startOfDay(subDays(now, days)), endDate };
  }
}

export function getDateRangeLabel(rangeValue: DateRangeValue): string {
  const option = DATE_RANGE_OPTIONS.find(opt => opt.value === rangeValue);
  return option?.label || 'Custom';
}
