"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Video } from '@/types/database';
import { X, Calendar, User, Building, ExternalLink, Sparkles, Clock, Tv, Film } from 'lucide-react';

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
  
  const mediaItem = (video as any).media_item;
  const filmTitle = mediaItem?.title;
  const filmSlug = mediaItem?.slug || (filmTitle ? generateCleanSlug(filmTitle) : mediaItem?.id);
  const releaseYear = mediaItem?.release_year;
  const director = mediaItem?.directors?.[0]?.name;
  const studio = mediaItem?.studio_label;

  const aiSummary = (video as any).ai_summary;
  const aiTimestamps: { time: string; seconds?: number; label: string }[] = (video as any).ai_timestamps || [];

  const iframeSrc = `https://www.youtube.com/embed/${video.yt_video_id}?autoplay=1&rel=0${seekSeconds > 0 ? `&start=${seekSeconds}` : ''}`;
  const nativeAppUrl = `https://www.youtube.com/watch?v=${video.yt_video_id}${seekSeconds > 0 ? `&t=${seekSeconds}s` : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-900/90 flex-none">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Link
              href={`/creators/${creatorSlug}`}
              onClick={onClose}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-red-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg border border-zinc-700/80 transition-all flex-none group"
            >
              <div className="relative w-4 h-4 rounded-full overflow-hidden bg-red-600 flex-none">
                {creatorAvatar ? (
                  <Image
                    src={creatorAvatar}
                    alt={creatorName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="text-[9px] font-black text-white flex items-center justify-center h-full">
                    {creatorName.charAt(0)}
                  </span>
                )}
              </div>
              <span className="group-hover:underline truncate max-w-[120px] sm:max-w-none">
                {creatorName}
              </span>
            </Link>
            <h3 className="font-bold text-xs text-white line-clamp-1">
              {video.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white transition-colors flex-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Box */}
        <div className="relative aspect-video w-full bg-black max-h-[45vh]">
          <iframe
            key={seekSeconds}
            src={iframeSrc}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Action Controls & Metadata */}
        <div className="p-3 sm:p-4 bg-zinc-900 border-t border-zinc-800 flex-1 overflow-y-auto">
          {/* Deep Link to Native YouTube App */}
          <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl mb-3">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-white">First-Screen Handoff</span>
            </div>
            <a
              href={nativeAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <span>Open YouTube App (Cast)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* AI Summary Banner */}
          {aiSummary && (
            <div className="mb-3 bg-red-950/30 border border-red-900/50 rounded-xl p-2.5 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 flex-none mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase text-red-400 tracking-wider">AI Reaction Synopsis</p>
                <p className="text-xs text-zinc-200 mt-0.5 leading-relaxed">{aiSummary}</p>
              </div>
            </div>
          )}

          {/* Chapter Markers */}
          {aiTimestamps.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-red-500" /> Interactive Chapter TOC:
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {aiTimestamps.map((ts, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSeekSeconds(ts.seconds || 0)}
                    className="bg-zinc-950 hover:bg-red-600 hover:text-white text-zinc-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-red-600 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="text-amber-400 font-mono text-[10px]">{ts.time}</span>
                    <span>{ts.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4 UNIFORM MOVIE METADATA CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Slot 1: Film Title */}
            {filmSlug ? (
              <Link
                href={`/media/${filmSlug}`}
                onClick={onClose}
                className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded-xl hover:border-red-600 transition-colors"
              >
                <Film className="w-3.5 h-3.5 text-red-500 flex-none" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase font-bold text-zinc-500">Film</p>
                  <p className="font-extrabold text-white truncate">{filmTitle || '—'}</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded-xl">
                <Film className="w-3.5 h-3.5 text-red-500 flex-none" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase font-bold text-zinc-500">Film</p>
                  <p className="font-extrabold text-white truncate">{filmTitle || '—'}</p>
                </div>
              </div>
            )}

            {/* Slot 2: Release Year */}
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-red-500 flex-none" />
              <div>
                <p className="text-[9px] uppercase font-bold text-zinc-500">Release Year</p>
                <p className="font-extrabold text-white">{releaseYear || '—'}</p>
              </div>
            </div>

            {/* Slot 3: Director */}
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded-xl">
              <User className="w-3.5 h-3.5 text-red-500 flex-none" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold text-zinc-500">Director</p>
                <p className="font-extrabold text-white truncate">{director || '—'}</p>
              </div>
            </div>

            {/* Slot 4: Studio / Label */}
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded-xl">
              <Building className="w-3.5 h-3.5 text-red-500 flex-none" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase font-bold text-zinc-500">Studio / Label</p>
                <p className="font-extrabold text-white truncate">{studio || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}