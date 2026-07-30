export type MediaType = 'movie' | 'tv' | 'track' | 'album';

export interface Channel {
  id: string;
  yt_channel_id: string;
  handle: string;
  name: string;
}

export interface Director {
  id: string;
  name: string;
  slug: string;
}

export interface Actor {
  id: string;
  name: string;
  slug: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface MediaItem {
  id: string;
  media_type: MediaType;
  title: string;
  release_year: number;
  studio_label?: string;
  synopsis?: string;
  poster_url?: string;
  backdrop_url?: string;
  directors?: Director[];
  actors?: Actor[];
  genres?: Genre[];
}

export interface Video {
  id: string;
  yt_video_id: string;
  channel_id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  published_at: string;
  view_count?: number;
  media_item?: MediaItem;
}