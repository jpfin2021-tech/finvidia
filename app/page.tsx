"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import HeroBanner from '@/components/hero-banner';
import CarouselRow from '@/components/carousel-row';
import FranchiseSection from '@/components/franchise-section';
import { RefreshCw, Sparkles, Shuffle, Eye, Tv } from 'lucide-react';

function formatViews(views?: number): string {
  if (!views || views === 0) return '0 Views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

export default function HomePage() {
  const [topRankedMovies, setTopRankedMovies] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [allMoviesPool, setAllMoviesPool] = useState<any[]>([]);
  const [randomTwoMovies, setRandomTwoMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomePageData() {
      setLoading(true);
      try {
        const supabase = createClient();

        let allMedia: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('media_items')
            .select(`
              id,
              title,
              release_year,
              poster_url,
              studio_label,
              videos (id, view_count)
            `)
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allMedia = allMedia.concat(data);
            if (data.length < 1000) hasMore = false;
            page++;
          }
        }

        const formatted = allMedia.map((m: any) => {
          const vids = m.videos || [];
          const totalViews = vids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
          return {
            id: m.id,
            title: m.title,
            release_year: m.release_year,
            poster_url: m.poster_url,
            studio_label: m.studio_label,
            total_views: totalViews,
            reaction_count: vids.length,
          };
        });

        const leaderboardSorted = [...formatted].sort((a, b) => b.total_views - a.total_views).slice(0, 15);
        const newReleasesSorted = [...formatted].sort((a, b) => b.release_year - a.release_year).slice(0, 15);

        setTopRankedMovies(leaderboardSorted);
        setNewReleases(newReleasesSorted);
        setAllMoviesPool(formatted);

        // Pick 2 random movies initially
        if (formatted.length > 0) {
          const shuffled = [...formatted].sort(() => 0.5 - Math.random());
          setRandomTwoMovies(shuffled.slice(0, 2));
        }
      } catch (err) {
        console.error('Error loading home page:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHomePageData();
  }, []);

  const handleShuffleRandomFilms = () => {
    if (allMoviesPool.length > 0) {
      const shuffled = [...allMoviesPool].sort(() => 0.5 - Math.random());
      setRandomTwoMovies(shuffled.slice(0, 2));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading FinVIDIA Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] pb-20">
      <HeroBanner />

      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8 mt-6">
        {/* Franchises Section */}
        <FranchiseSection />

        {/* Leaderboard Row */}
        <CarouselRow
          title="Leaderboard"
          items={topRankedMovies}
        />

        {/* New Releases Row */}
        <CarouselRow
          title="New Releases"
          items={newReleases}
        />

        {/* Random 2 Films Section */}
        <div className="my-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
              Random
            </h2>

            <button
              onClick={handleShuffleRandomFilms}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-black px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {randomTwoMovies.map((item) => (
              <Link
                key={item.id}
                href={`/media/${item.id}`}
                className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-xl overflow-hidden p-2.5 transition-all duration-300 hover:scale-[1.02] shadow-md flex flex-col justify-between"
              >
                <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-950 mb-2">
                  <Image
                    src={item.poster_url || '/placeholder.png'}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 48vw, 300px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {item.release_year > 0 && (
                    <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-black text-white px-2 py-0.5 rounded border border-white/10">
                      {item.release_year}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-white group-hover:text-red-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {item.studio_label && (
                    <p className="text-[10px] sm:text-xs text-zinc-400 font-medium truncate mt-0.5">
                      {item.studio_label}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 border-t border-zinc-800/80 pt-2 mt-2">
                    <span className="flex items-center gap-1 text-amber-400">
                      <Eye className="w-3 h-3" />
                      {formatViews(item.total_views)}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-300">
                      <Tv className="w-3 h-3 text-red-500" />
                      {item.reaction_count}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}