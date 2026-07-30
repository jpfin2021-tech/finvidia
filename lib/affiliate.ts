/**
 * FinVIDIA Affiliate Link Generator
 */

export function buildAmazonPrimeVideoLink(movieTitle: string, releaseYear?: number): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG || 'finvidia-20';
  const query = encodeURIComponent(`${movieTitle} ${releaseYear || ''}`.trim());
  return `https://www.amazon.com/s?k=${query}&i=instant-video&tag=${tag}`;
}

export function buildAmazonPhysicalBlurayLink(movieTitle: string): string {
  const tag = process.env.NEXT_PUBLIC_AMAZON_TAG || 'finvidia-20';
  const query = encodeURIComponent(`${movieTitle} 4K Blu-ray`.trim());
  return `https://www.amazon.com/s?k=${query}&tag=${tag}`;
}

export function buildJustWatchLink(movieTitle: string): string {
  const query = encodeURIComponent(movieTitle.trim());
  return `https://www.justwatch.com/us/search?q=${query}`;
}