"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Video } from '@/types/database';
import { Play, Eye, ExternalLink } from 'lucide-react';

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

export default function VideoCard({ video, onSelect }: VideoCardProps) {
  const handleClick = async (e: React.MouseEvent) => {
    const token = localStorage.getItem('finvidia_lounge_token');
    const screenId = localStorage.getItem('finvidia_screen_id');

    // IF LINKED TO TV: Send video directly to Shield Pro without opening phone embed
    if (token || screenId) {
      e.preventDefault();
      
      window.dispatchEvent(
        new CustomEvent('finvidia_cast_start', { detail: { title: video.title, videoId: video.yt_video_id } })
      );

      await fetch('/api/lounge/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loungeToken: token,
          screenId: screenId,
          command: { type: 'LOAD_VIDEO', videoId: video.yt_video_id, startSeconds: 0 },
        }),
      });
      return;
    }

    if (onSelect) {
      onSelect(video);
    }
  };

  return (
    <div className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
      <div 
        className="relative aspect-video w-full bg-black cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
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

      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-red-400 bg-red-950/60 border border-red-900/40 px-2.5 py-0.5 rounded truncate max-w-[150px]">
              {(video as any).channel_name || 'Creator'}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              {new Date(video.published_at).toLocaleDateString()}
            </span>
          </div>

          <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
            {video.title}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800 text-xs">
          <button
            onClick={handleClick}
            className="text-white hover:text-red-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-red-600" /> Play on TV
          </button>

          <a
            href={`https://www.youtube.com/watch?v=${video.yt_video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors text-[11px]"
          >
            <span>YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}