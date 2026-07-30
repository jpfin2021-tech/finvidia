"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Play, Sparkles, RefreshCw } from 'lucide-react';

interface SpotlightMovie {
  id: string;
  title: string;
  release_year: number;
  synopsis: string;
  poster_url: string;
  backdrop_url: string;
  video_count: number;
}

export default function HeroBanner() {
  const [movies, setMovies] = useState<SpotlightMovie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSpotlightMovies() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('media_items')
          .select(`
            id,
            title,
            release_year,
            synopsis,
            poster_url,
            backdrop_url,
            videos (id)
          `)
          .eq('media_type', 'movie')
          .limit(20);

        if (!error && data) {
          const formatted: SpotlightMovie[] = data
            .map((m: any) => ({
              id: m.id,
              title: m.title,
              release_year: m.release_year,
              synopsis: m.synopsis,
              poster_url: m.poster_url,
              backdrop_url: m.backdrop_url,
              video_count: m.videos?.length || 0,
            }))
            .filter((m) => m.video_count > 0 && m.backdrop_url);

          if (formatted.length > 0) {
            setMovies(formatted);
            // Pick a random movie on initial load
            const randomIndex = Math.floor(Math.random() * formatted.length);
            setCurrentIndex(randomIndex);
          }
        }
      } catch (err) {
        console.error('Error loading spotlight banner:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSpotlightMovies();
  }, []);

  // Auto-rotate spotlight every 30 seconds
  useEffect(() => {
    if (movies.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 30000);
    return () => clearInterval(interval);
  }, [movies]);

  if (loading || movies.length === 0) {
    return (
      <div className="relative w-full h-[50vh] min-h-[380px] bg-zinc-950 flex items-center justify-center text-zinc-600 border-b border-zinc-800">
        <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  const current = movies[currentIndex];

  return (
    <div className="relative w-full h-[52vh] min-h-[400px] max-h-[580px] bg-zinc-950 overflow-hidden border-b border-zinc-800/80">
      {/* Background Backdrop Image */}
      <div className="absolute inset-0">
        <Image
          src={current.backdrop_url || current.poster_url || '/placeholder.png'}
          alt={current.title}
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center opacity-35 filter blur-[1px] transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="relative max-w-7xl mx-auto h-full px-6 md:px-12 flex flex-col justify-end pb-12 z-20">
        <div className="max-w-2xl flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white text-[11px] font-black uppercase px-2.5 py-1 rounded tracking-wider flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Featured Spotlight
            </span>
            {current.release_year > 0 && (
              <span className="bg-zinc-800/90 text-zinc-300 text-[11px] font-bold px-2.5 py-1 rounded border border-zinc-700">
                {current.release_year}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
            {current.title}
          </h1>

          <p className="text-zinc-300 text-xs md:text-sm line-clamp-3 leading-relaxed max-w-xl">
            {current.synopsis || "Explore creator reactions and commentary for this title."}
          </p>

          <div className="pt-2 flex items-center gap-4">
            <Link
              href={`/media/${current.id}`}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs md:text-sm font-black px-5 py-3 rounded-xl transition-all shadow-xl hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Explore All Creator Reactions ({current.video_count})</span>
            </Link>

            {movies.length > 1 && (
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % movies.length)}
                className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs font-bold px-3 py-3 rounded-xl border border-zinc-800 transition-colors"
                title="Shuffle Spotlight"
              >
                Shuffle Spotlight
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}