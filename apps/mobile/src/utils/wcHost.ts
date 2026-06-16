// WC 2026 — host country based on match city/venue
// Returns the team code that is the "local" host, or null if neutral
export function getWCHostCode(city?: string | null, venue?: string | null): 'USA' | 'MEX' | 'CAN' | null {
  const loc = `${city ?? ''} ${venue ?? ''}`.toLowerCase();
  if (!loc.trim()) return null;

  if (
    loc.includes('mexico') ||
    loc.includes('monterrey') ||
    loc.includes('guadalajara') ||
    loc.includes('azteca') ||
    loc.includes('bbva') ||
    loc.includes('akron')
  ) return 'MEX';

  if (
    loc.includes('toronto') ||
    loc.includes('vancouver') ||
    loc.includes('bmo field') ||
    loc.includes('bc place')
  ) return 'CAN';

  // All remaining WC 2026 venues are in USA
  return 'USA';
}
