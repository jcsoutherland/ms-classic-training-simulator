export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('en-US');
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return 'a very long time';
  const rounded = hours < 48 ? Math.round(hours * 2) / 2 : Math.round(hours);
  return rounded === 1 ? '1 hour' : `${rounded.toLocaleString('en-US')} hours`;
}

export function formatShortHours(hours: number): string {
  if (!Number.isFinite(hours)) return '—';
  const rounded = hours < 48 ? Math.round(hours * 2) / 2 : Math.round(hours);
  return `${rounded.toLocaleString('en-US')} h`;
}

export function formatPercent(fraction: number): string {
  if (fraction >= 0.995) return 'almost certain';
  if (fraction < 0.01) return 'under 1%';
  return `${Math.round(fraction * 100)}%`;
}

export function rawRate(expected: number, kills: number): string {
  if (expected <= 0 || kills <= 0) return '—';
  return `1/${Math.round(kills / expected).toLocaleString('en-US')}`;
}

export function rateText(perHour: number): string {
  if (perHour <= 0) return 'Not expected here';
  if (perHour >= 1) return `About ${formatNumber(perHour)} an hour on average`;
  const every = 1 / perHour;
  const shown = every < 10 ? Math.round(every * 2) / 2 : Math.round(every);
  if (shown <= 1) return 'About 1 an hour on average';
  return `About 1 every ${shown.toLocaleString('en-US')} hours on average`;
}
