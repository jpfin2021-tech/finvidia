"use client";

import React from 'react';
import Image from 'next/image';
import { Play, ExternalLink, Film, Music } from 'lucide-react';
import { Video } from '@/types/database';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  layout?: 'grid' | 'carousel';
}

function parseFallbackTitle(rawTitle: string): string {
  const triggerRegex = /(?:first\s+time\s+watching|first\s+time\s+reaction\s+to|reacting\s+to|first\s+time\s+reaction|reaction\s+to|watching)/i;
  const match = rawTitle.match(triggerRegex);
  let clean = rawTitle;

  if (match && match.index !== undefined) {
    clean = clean.substring(match.index + match[0].length);
  }

  clean = clean.split(/\((?:19\d\d|20\d\d)\)|\||#|REACTION|REVIEW|FULL ALBUM/i)[0];
  return clean.replace(/["'“”]/g, '').trim() || rawTitle;
}

export default function VideoCard({ video, onSelect, layout = 'grid' }: VideoCardProps) {
  const ytUrl = `https://www.youtube.com/watch?v=${video.yt_video_id}`;
  const posterUrl = video.media_item?.poster_url || video.thumbnail_url;
  
  // Primary Media Title: Uses TMDB title if available, otherwise runs precision fallback
  const cleanMediaTitle = video.media_item?.title || parseFallbackTitle(video.title);

  const ocReleaseYear = video.media_item?.release_year;
  const director = video.media_item?.directors?.[0]?.name;
  const isMovie = video.media_item?.media_type === 'movie';

  const containerClasses = layout === 'carousel'
    ? 'flex-none w-[180px] sm:w-[200px] md:w-[220px]'
    : 'w-full';

  return (
    <div className={`group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-300 hover:scale-105 hover:z-30 hover:border-red-600/60 hover:shadow-2xl hover:shadow-red-950/40 flex flex-col ${containerClasses}`}>
      <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden cursor-pointer" onClick={() => onSelect(video)}>
        <Image
          src={posterUrl}
          alt={cleanMediaTitle}
          fill
          sizes="(max-width: 768px) 180px, 240px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button 
            onClick={() => onSelect(video)}
            className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 hover:bg-red-700"
            title="Play Preview"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>
        </div>

        {ocReleaseYear && (
          <span className="absolute top-2 right-2 bg-black/85 backdrop-blur-md text-[11px] font-black text-red-400 px-2 py-0.5 rounded border border-red-900/50 shadow-md">
            {ocReleaseYear}
          </span>
        )}

        <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md p-1 rounded text-zinc-300 border border-white/10">
          {isMovie ? <Film className="w-3 h-3 text-red-500" /> : <Music className="w-3 h-3 text-red-500" />}
        </span>
      </div>

      <div className="p-3.5 flex flex-col justify-between flex-1 bg-zinc-900">
        <div>
          <h4 className="font-bold text-sm md:text-base text-white line-clamp-1 group-hover:text-red-400 transition-colors tracking-tight">
            {cleanMediaTitle}
          </h4>

          <p className="text-xs text-zinc-400 line-clamp-1 mt-1 font-normal">
            {video.title}
          </p>

          {director && (
            <p className="text-[11px] text-zinc-500 mt-1 truncate">
              Dir: <span className="text-zinc-300 font-medium">{director}</span>
            </p>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
          <span>YT: {new Date(video.published_at).toLocaleDateString()}</span>
          <a
            href={ytUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <span>YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}