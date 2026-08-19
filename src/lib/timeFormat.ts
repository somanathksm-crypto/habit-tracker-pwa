/**
 * Times are stored 24-hour ('HH:mm') and always shown 12-hour with am/pm.
 * Keeping the stored form unambiguous and the displayed form familiar.
 */
export function formatTime12(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  const hour24 = Number(match[1]);
  const minute = match[2];
  if (hour24 < 0 || hour24 > 23) return hhmm;
  const suffix = hour24 < 12 ? 'am' : 'pm';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${suffix}`;
}
