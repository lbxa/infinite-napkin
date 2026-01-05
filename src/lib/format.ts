/**
 * Format a date as relative time (e.g., "5m ago", "Yesterday", "3 days ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  if (diffDay === 1) {
    return 'Yesterday';
  }
  if (diffDay < 7) {
    return `${diffDay} days ago`;
  }
  if (diffDay < 30) {
    const weeks = Math.floor(diffDay / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  
  const years = Math.floor(diffDay / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

