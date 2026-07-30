"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Video } from '@/types/database';
import { X, Calendar, User, Building, ExternalLink, Tv, CheckCircle2, Sparkles, Clock } from 'lucide-react';

interface VideoModalProps {
  video: Video | null;
  onClose: () => void;
}

function generateCleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function VideoModal({ video, onClose }: VideoModalProps) {
  const [seekSeconds, setSeekSeconds] = useState<number>(0);

  useEffect(() => {
    setSeekSeconds(0);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, onClose]);

  if (!video) return null;

  const creatorName = (video as any).channel_name || 'Creator';
  const creatorAvatar = (video as any).channel_avatar || '';
  const creatorSlug = (video as any).channel_slug || generateCleanSlug(creatorName);

  const mediaItem = video.media_item;
  const releaseYear = mediaItem?.release_year;
  const director = mediaItem?.directors?.[0]?.name;
  const studio = mediaItem?.studio_label;

  const aiSummary = (video as any).ai_summary;
  const aiTimestamps: { time: string; seconds?: number; label: string }[] = (video as any).ai_timestamps || [];
  const individualReactors: string[] = (video as any).individual_reactors || [];

  const iframeSrc = `https://www.youtube.com/embed/${video.yt_video_id}?autoplay=1&rel=0${seekSeconds > 0 ? `&start=${seekSeconds}` : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/90 flex-none">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <Link
              href={`/creators/${creatorSlug}`}
              onClick={onClose}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-zinc-700/80 transition-all flex-none group"
            >
              <div className="relative w-5 h-5 rounded-full overflow-hidden bg-red-600 flex-none">
                {creatorAvatar ? (
                  <Image
                    src={creatorAvatar}
                    alt={creatorName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-black text-white flex items-center justify-center h-full">
                    {creatorName.charAt(0)}
                  </span>
                )}
              </div>
              <span className="group-hover:underline flex items-center gap-1">
                {creatorName}
                <CheckCircle2 className="w-3 h-3 text-red-500 fill-red-500/20 flex-none" />
              </span>
            </Link>

            <h3 className="font-bold text-xs md:text-sm text-white line-clamp-1">
              {video.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white transition-colors flex-none cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Video Player */}
        <div className="relative aspect-video w-full bg-black max-h-[55vh]">
          <iframe
            key={seekSeconds}
            src={iframeSrc}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Bottom Informational & AI Enrichment Metadata Section */}
        <div className="p-4 md:p-5 bg-zinc-900 border-t border-zinc-800 flex-1 overflow-y-auto">
          {/* AI Summary Banner */}
          {aiSummary && (
            <div className="mb-4 bg-red-950/30 border border-red-900/50 rounded-xl p-3 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 flex-none mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase text-red-400 tracking-wider">AI Reaction Synopsis</p>
                <p className="text-xs text-zinc-200 mt-0.5 leading-relaxed">{aiSummary}</p>
              </div>
            </div>
          )}

          {/* Interactive Chapter Markers (TOC) */}
          {aiTimestamps.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-red-500" /> Interactive Chapter TOC (Click to Seek):
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {aiTimestamps.map((ts, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSeekSeconds(ts.seconds || 0)}
                    className="bg-zinc-950 hover:bg-red-600 hover:text-white text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-red-600 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="text-amber-400 font-mono text-[11px]">{ts.time}</span>
                    <span>{ts.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* 1. Creator Profile Badge */}
            <Link
              href={`/creators/${creatorSlug}`}
              onClick={onClose}
              className="flex items-center gap-2 bg-zinc-950 hover:bg-red-950/60 border border-zinc-800 hover:border-red-600/60 p-2.5 rounded-xl transition-all group"
            >
              <Tv className="w-4 h-4 text-red-500 flex-none" />
              <div className="min-w-0">
                <p className="text-[9.5px] uppercase font-bold text-zinc-500">Reactor</p>
                <p className="font-extrabold text-white group-hover:text-red-400 transition-colors truncate">
                  {creatorName}
                </p>
                {individualReactors.length > 0 && (
                  <p className="text-[9px] text-zinc-400 truncate">({individualReactors.join(', ')})</p>
                )}
              </div>
            </Link>

            {/* 2. Release Year Card */}
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl">
              <Calendar className="w-4 h-4 text-red-500 flex-none" />
              <div>
                <p className="text-[9.5px] uppercase font-bold text-zinc-500">Release Year</p>
                <p className="font-extrabold text-white">{releaseYear || '—'}</p>
              </div>
            </div>

            {/* 3. Director Card */}
            {director ? (
              <Link
                href={`/browse?q=${encodeURIComponent(director)}`}
                onClick={onClose}
                className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 p-2.5 rounded-xl transition-colors group"
              >
                <User className="w-4 h-4 text-red-500 flex-none" />
                <div className="min-w-0">
                  <p className="text-[9.5px] uppercase font-bold text-zinc-500">Director</p>
                  <p className="font-extrabold text-white group-hover:underline truncate">{director}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl">
                <User className="w-4 h-4 text-zinc-600 flex-none" />
                <div>
                  <p className="text-[9.5px] uppercase font-bold text-zinc-500">Director</p>
                  <p className="font-extrabold text-zinc-400">—</p>
                </div>
              </div>
            )}

            {/* 4. Studio Card */}
            {studio ? (
              <Link
                href={`/browse?q=${encodeURIComponent(studio)}`}
                onClick={onClose}
                className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 p-2.5 rounded-xl transition-colors group"
              >
                <Building className="w-4 h-4 text-red-500 flex-none" />
                <div className="min-w-0">
                  <p className="text-[9.5px] uppercase font-bold text-zinc-500">Studio / Label</p>
                  <p className="font-extrabold text-white group-hover:underline truncate">{studio}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl">
                <Building className="w-4 h-4 text-zinc-600 flex-none" />
                <div>
                  <p className="text-[9.5px] uppercase font-bold text-zinc-500">Studio / Label</p>
                  <p className="font-extrabold text-zinc-400">—</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-800/80">
            <p className="line-clamp-1 max-w-2xl text-zinc-400">
              {video.description || "No video description available."}
            </p>
            <a
              href={`https://www.youtube.com/watch?v=${video.yt_video_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-white font-bold transition-colors flex-none"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}