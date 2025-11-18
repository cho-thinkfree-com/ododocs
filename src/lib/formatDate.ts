import { format, formatDistanceToNow, isAfter } from 'date-fns';
import { subHours } from 'date-fns';

export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const twelveHoursAgo = subHours(new Date(), 12);

  if (isAfter(date, twelveHoursAgo)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return format(date, 'yyyy-MM-dd HH:mm');
};
