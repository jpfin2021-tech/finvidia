export interface MusicMetadata {
  itunes_id: string;
  title: string;
  artist: string;
  release_year: number;
  poster_url: string;
  media_type: 'album' | 'track';
}

export async function searchAndFetchMusicMetadata(rawTitle: string): Promise<MusicMetadata | null> {
  try {
    const isFullAlbum = /FULL ALBUM|ALBUM REACTION|FULL RECORD|FULL LP/i.test(rawTitle);

    // Isolate text after reaction trigger phrases
    let clean = rawTitle;
    const triggerRegex = /(?:first\s+time\s+reaction\s+to|first\s+time\s+reaction|reacting\s+to|reaction\s+to|reaction|watching)/i;
    const match = clean.match(triggerRegex);

    if (match && match.index !== undefined) {
      clean = clean.substring(match.index + match[0].length);
    }

    clean = clean.split(/\||#|\((?:19\d\d|20\d\d)\)|FULL ALBUM|FULL RECORD|REVIEW|REACTION/i)[0];
    clean = clean.replace(/["'“”]/g, '').trim();

    if (!clean) clean = rawTitle.replace(/["'“”]/g, '').trim();

    // Query iTunes API
    const entity = isFullAlbum ? 'album' : 'song';
    let url = `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&entity=${entity}&limit=1`;
    let res = await fetch(url);
    let data = await res.json();

    if (!data.results || data.results.length === 0) {
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&media=music&limit=1`;
      res = await fetch(url);
      data = await res.json();
    }

    if (!data.results || data.results.length === 0) return null;

    const item = data.results[0];

    // High-resolution 600x600 official cover art
    const highResCover = item.artworkUrl100
      ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg').replace('100x100bb.png', '600x600bb.png')
      : item.artworkUrl100;

    const releaseYear = item.releaseDate
      ? new Date(item.releaseDate).getFullYear()
      : 2026;

    const artistName = item.artistName || 'Unknown Artist';
    const itemName = isFullAlbum 
      ? (item.collectionName || clean) 
      : (item.trackName || item.collectionName || clean);

    const displayTitle = isFullAlbum 
      ? `${artistName} - ${itemName} (Album)`
      : `${artistName} - ${itemName}`;

    const uniqueItunesId = String(item.trackId || item.collectionId || displayTitle);

    return {
      itunes_id: uniqueItunesId,
      title: displayTitle,
      artist: artistName,
      release_year: releaseYear,
      poster_url: highResCover,
      media_type: isFullAlbum ? 'album' : 'track'
    };
  } catch (error) {
    console.error('Error fetching iTunes music metadata:', error);
    return null;
  }
}