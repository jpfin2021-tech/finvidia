"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Video } from '@/types/database';
import { Play, Eye, ExternalLink, Calendar, Film } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  onSelect?: (video: Video) => void;
}

function formatViews(views?: number): string {
  if (!views || views === 0) return '0 Views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

function generateCleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function VideoCard({ video, onSelect }: VideoCardProps) {
  const creatorName = (video as any).channel_name || 'Creator';
  const creatorSlug = (video as any).channel_slug || generateCleanSlug(creatorName);
  const mediaItem = video.media_item;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(video);
    }
  };

  return (
    <div className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
      {/* Thumbnail Box */}
      <div 
        className="relative aspect-video w-full bg-black cursor-pointer overflow-hidden"
        onClick={handleCardClick}
      >
        <Image
          src={video.thumbnail_url}
          alt={video.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* View Count Badge */}
        <div className="absolute top-2.5 right-2.5 bg-black/85 backdrop-blur-md text-[11px] font-extrabold text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-red-500" />
          {formatViews(video.view_count)}
        </div>

        {/* Center Play Icon Overlay */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Standardized Card Body */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
        <div>
          {/* Row 1: Creator Pill Badge + Upload Date */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <Link
              href={`/creators/${creatorSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] font-bold text-red-400 hover:text-white bg-red-950/70 hover:bg-red-600 border border-red-900/50 px-2.5 py-0.5 rounded-full transition-colors truncate max-w-[160px]"
            >
              {creatorName}
            </Link>

            <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1 flex-none">
              <Calendar className="w-3 h-3 text-red-500" />
              {new Date(video.published_at).toLocaleDateString()}
            </span>
          </div>

          {/* Row 2: Film Title (Release Year) Link */}
          {mediaItem && (
            <div className="mb-1.5">
              <Link
                href={`/media/${mediaItem.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[12px] font-extrabold text-amber-400 hover:underline flex items-center gap-1 truncate"
              >
                <Film className="w-3.5 h-3.5 text-amber-400 flex-none" />
                <span className="truncate">{mediaItem.title} ({mediaItem.release_year})</span>
              </Link>
            </div>
          )}

          {/* Row 3: Reaction Video Title */}
          <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors mt-1">
            {video.title}
          </h3>
        </div>

        {/* Row 4: Action Buttons */}
        <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800 text-xs">
          <button
            onClick={handleCardClick}
            className="text-white hover:text-red-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-red-600" /> Watch Reaction
          </button>

          <a
            href={`https://www.youtube.com/watch?v=${video.yt_video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors text-[11px]"
          >
            <span>YouTube App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}