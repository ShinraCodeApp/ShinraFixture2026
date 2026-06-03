import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, format = 'D MMM YYYY') {
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function getMatchResult(homeScore: number, awayScore: number, perspective: 'home' | 'away') {
  if (homeScore === awayScore) return 'D';
  if (perspective === 'home') return homeScore > awayScore ? 'W' : 'L';
  return awayScore > homeScore ? 'W' : 'L';
}
