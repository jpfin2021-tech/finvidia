"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Film, Tv, Eye } from 'lucide-react';
import { MediaItem } from '@/types/database';

interface MediaCardProps {
  media: MediaItem & { video_count?: number; total_views?: number };
}

function formatViewsShort(views?: number): string {
  if (!views || views === 0) return '0';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return `${views.toLocaleString()}`;
}

export default function MediaCard({ media }: MediaCardProps) {
  const director = media.directors?.[0]?.name;
  const posterUrl = media.poster_url || '/placeholder.png';
  
  const videoCount = media.video_count || 0;
  const totalViews = media.total_views || 0;
  const avgViewsPerReactor = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;

  return (
    <Link href={`/media/${media.id}`} className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-300 hover:scale-105 hover:z-30 hover:border-red-600/60 hover:shadow-2xl hover:shadow-red-950/40 flex flex-col w-full">
      <div className="relative aspect-[2/3] w-full bg-zinc-950 overflow-hidden">
        <Image
          src={posterUrl}
          alt={media.title}
          fill
          priority={true}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Top Left: Film Icon Badge */}
        <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md p-1.5 rounded text-zinc-300 border border-white/10 shadow-md z-10">
          <Film className="w-3.5 h-3.5 text-red-500" />
        </span>

        {/* Top Right: Release Year Badge */}
        {media.release_year > 0 && (
          <span className="absolute top-2 right-2 bg-black/85 backdrop-blur-md text-[11px] font-black text-red-400 px-2.5 py-0.5 rounded border border-red-900/50 shadow-md z-10">
            {media.release_year}
          </span>
        )}

        {/* Bottom Right: Unified Single-Line Metrics Pill */}
        <div className="absolute bottom-2 right-2 max-w-[calc(100%-1rem)] bg-black/90 backdrop-blur-md text-[9.5px] md:text-[10px] font-extrabold rounded-md border border-white/15 shadow-xl flex items-center overflow-hidden z-10 select-none">
          {totalViews > 0 && (
            <span className="text-amber-400 px-1.5 py-0.5 flex items-center gap-1 whitespace-nowrap">
              <Eye className="w-3 h-3 text-amber-400 flex-none" />
              <span>{formatViewsShort(totalViews)}</span>
            </span>
          )}

          {videoCount > 0 && totalViews > 0 && (
            <span className="text-zinc-300 font-semibold border-l border-zinc-700/80 px-1.5 py-0.5 whitespace-nowrap">
              {formatViewsShort(avgViewsPerReactor)}/ea
            </span>
          )}

          {videoCount > 0 && (
            <span className="bg-red-600 text-white px-1.5 py-0.5 flex items-center gap-1 font-extrabold whitespace-nowrap border-l border-zinc-700/80">
              <Tv className="w-3 h-3 flex-none" />
              <span>{videoCount}</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-3.5 flex flex-col justify-between flex-1 bg-zinc-900">
        <div>
          <h4 className="font-bold text-sm md:text-base text-white line-clamp-1 group-hover:text-red-400 transition-colors tracking-tight">
            {media.title}
          </h4>

          {director ? (
            <p className="text-xs text-zinc-400 mt-1 truncate">
              Dir: <span className="text-zinc-300 font-medium">{director}</span>
            </p>
          ) : media.studio_label ? (
            <p className="text-xs text-zinc-400 mt-1 truncate">
              <span className="text-zinc-300 font-medium">{media.studio_label}</span>
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}