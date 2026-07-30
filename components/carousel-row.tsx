"use client";

import React, { useRef } from 'react';
import MediaCard from './media-card';
import { MediaItem } from '@/types/database';
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react';

interface CarouselRowProps {
  title: string;
  mediaList?: (MediaItem & { video_count?: number; total_views?: number })[];
  media?: (MediaItem & { video_count?: number; total_views?: number })[];
  onShuffle?: () => void;
  viewAllLink?: string;
}

export default function CarouselRow({ title, mediaList, media, onShuffle, viewAllLink }: CarouselRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  // Accept either mediaList or media prop interchangeably
  const items = mediaList || media || [];

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="px-6 md:px-12 max-w-7xl mx-auto my-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">
          {title}
        </h2>

        <div className="flex items-center gap-3">
          {onShuffle && (
            <button
              onClick={onShuffle}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-red-500" /> Shuffle
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative group">
        <div
          ref={rowRef}
          className="flex items-gap gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-4 pt-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {items.map((item) => (
            <div key={item.id} className="w-[160px] sm:w-[190px] md:w-[210px] flex-none" style={{ scrollSnapAlign: 'start' }}>
              <MediaCard media={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}