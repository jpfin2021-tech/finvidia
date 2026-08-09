"use client";

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Eye, Tv } from 'lucide-react';

interface MediaItemSimple {
  id: string;
  title: string;
  slug?: string;
  release_year: number;
  poster_url: string;
  studio_label?: string;
  total_views?: number;
  avg_views?: number;
  reaction_count?: number;
}

interface CarouselRowProps {
  title: string;
  subtitle?: string;
  items: MediaItemSimple[];
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

export default function CarouselRow({ title, subtitle, items }: CarouselRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.8;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-zinc-400 font-medium">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-none">
          <button
            onClick={() => handleScroll('left')}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-600 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-600 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95"
            aria-label="Scroll Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none py-2 px-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/movies/${item.slug || generateCleanSlug(item.title)}`}
            className="group flex-none w-[calc(50%-6px)] sm:w-[200px] md:w-[220px] bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-xl overflow-hidden p-2.5 transition-all duration-300 hover:scale-[1.02] shadow-md flex flex-col justify-between snap-start"
          >
            <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-950 mb-2">
              <Image
                src={item.poster_url || '/placeholder.png'}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 45vw, 220px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {item.release_year > 0 && (
                <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-black text-white px-2 py-0.5 rounded border border-white/10">
                  {item.release_year}
                </span>
              )}
            </div>

            <div>
              <h3 className="font-extrabold text-xs text-white group-hover:text-red-400 transition-colors line-clamp-1">
                {item.title}
              </h3>
              {item.studio_label && (
                <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                  {item.studio_label}
                </p>
              )}
              {(item.total_views !== undefined || item.reaction_count !== undefined) && (
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 border-t border-zinc-800/80 pt-2 mt-2">
                  {item.total_views !== undefined && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <Eye className="w-3 h-3" />
                      {formatViews(item.total_views)}
                    </span>
                  )}
                  {item.reaction_count !== undefined && (
                    <span className="flex items-center gap-1 text-zinc-300">
                      <Tv className="w-3 h-3 text-red-500" />
                      {item.reaction_count}
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}