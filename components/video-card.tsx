"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Video } from '@/types/database';
import { Play, Eye, ExternalLink, User, Film } from 'lucide-react';

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
  const handleCardClick = () => {
    if (onSelect) {
      onSelect(video);
    }
  };

  const creatorName = (video as any).channel_name || 'Creator';
  const creatorSlug = (video as any).channel_slug || generateCleanSlug(creatorName);
  const mediaItem = (video as any).media_item;
  const filmSlug = mediaItem?.slug || (mediaItem?.title ? generateCleanSlug(mediaItem.title) : mediaItem?.id);

  return (
    <div 
      className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        <Image
          src={video.thumbnail_url}
          alt={video.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-2.5 right-2.5 bg-black/85 backdrop-blur-md text-[11px] font-extrabold text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-red-500" />
          {formatViews(video.view_count)}
        </div>
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
        <div>
          {/* Top Section: Creator Pillbox */}
          <div className="flex items-center gap-2 mb-2 z-10">
            <Link
              href={`/creators/${creatorSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 bg-zinc-900/90 border border-zinc-800 rounded-md hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-red-500 flex-none" />
              <span className="truncate max-w-[200px]">{creatorName}</span>
            </Link>
          </div>
          
          {/* Reaction Title */}
          <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
            {video.title}
          </h3>
        </div>

        {/* Bottom Section */}
        <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800 text-xs z-10 gap-2">
          {/* Bottom Left: Movie Pill */}
          <div className="min-w-0 flex-1">
            {mediaItem ? (
              <Link
                href={`/media/${filmSlug}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-400 bg-red-950/40 border border-red-800/50 rounded-md hover:bg-red-600 hover:text-white hover:border-red-500 transition-all cursor-pointer group/movie max-w-full"
              >
                <Film className="w-3.5 h-3.5 text-red-400 group-hover/movie:text-white transition-colors flex-none" />
                <span className="truncate">
                  {mediaItem.title} {mediaItem.release_year ? `(${mediaItem.release_year})` : ''}
                </span>
              </Link>
            ) : (
              <span className="text-zinc-600 text-[11px] font-medium italic">Unlinked</span>
            )}
          </div>

          {/* Bottom Right: Upload Date & App Link */}
          <div className="flex items-center gap-1.5 flex-none text-[11px] text-zinc-400 font-medium">
            <span className="whitespace-nowrap">
              {new Date(video.published_at).toLocaleDateString()}
            </span>
            <a
              href={`https://www.youtube.com/watch?v=${video.yt_video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-zinc-400 hover:text-red-500 transition-colors p-0.5"
              title="Open in YouTube App"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}