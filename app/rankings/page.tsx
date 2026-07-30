"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trophy, Eye, Tv, Search, RefreshCw, ExternalLink, User } from 'lucide-react';

interface RankedMovie {
  id: string;
  title: string;
  release_year: number;
  poster_url: string;
  backdrop_url: string;
  director: string;
  total_views: number;
  reaction_count: number;
  avg_views_per_reactor: number;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

export default function MasterRankingsPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<RankedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [rankingMode, setRankingMode] = useState<'views' | 'density'>('views');

  useEffect(() => {
    async function fetchRankings() {
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
              backdrop_url,
              media_directors (
                directors (name)
              ),
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

        const formatted: RankedMovie[] = allMedia
          .map((m: any) => {
            const vids = m.videos || [];
            const viewsSum = vids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
            const count = vids.length;
            const avgViews = count > 0 ? Math.round(viewsSum / count) : 0;
            const dirName = m.media_directors?.[0]?.directors?.name || '';

            return {
              id: m.id,
              title: m.title,
              release_year: m.release_year,
              poster_url: m.poster_url,
              backdrop_url: m.backdrop_url,
              director: dirName,
              total_views: viewsSum,
              reaction_count: count,
              avg_views_per_reactor: avgViews,
            };
          })
          .filter((m) => m.reaction_count > 0);

        setMovies(formatted);
      } catch (err) {
        console.error('Error fetching rankings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRankings();
  }, []);

  const sortedMovies = [...movies].sort((a, b) => {
    if (rankingMode === 'density') return b.avg_views_per_reactor - a.avg_views_per_reactor;
    return b.total_views - a.total_views;
  });

  const filteredMovies = sortedMovies.filter((m) => {
    const term = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(term) ||
      m.director.toLowerCase().includes(term) ||
      m.release_year.toString().includes(term)
    );
  });

  const totalTrackedViews = movies.reduce((sum, m) => sum + m.total_views, 0);

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 max-w-7xl mx-auto min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-800 pb-8 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider flex items-center gap-3 text-white">
            <Trophy className="w-8 h-8 text-amber-500" />
            Master Cinema Viewership Rankings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Films ranked by total viewership impact and reaction density per creator.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3">
          <Eye className="w-6 h-6 text-amber-400" />
          <div>
            <p className="text-[11px] font-bold uppercase text-zinc-400">Total Tracked Viewership</p>
            <p className="text-2xl font-black text-white">{formatViews(totalTrackedViews)} Views</p>
          </div>
        </div>
      </div>

      {/* Leaderboard Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search leaderboard by title, director, year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-red-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => setRankingMode('views')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              rankingMode === 'views'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Total Views
          </button>
          <button
            onClick={() => setRankingMode('density')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
              rankingMode === 'density'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Views Per Reactor (Density)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
          <p className="text-sm font-medium">Calculating Master Rankings Matrix...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredMovies.map((movie, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            return (
              <div
                key={movie.id}
                onClick={() => router.push(`/media/${movie.id}`)}
                className={`group relative rounded-xl border overflow-hidden p-4 md:p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  rank === 1
                    ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400'
                    : rank === 2
                    ? 'bg-slate-900/40 border-slate-700/60 hover:border-slate-400'
                    : rank === 3
                    ? 'bg-orange-950/20 border-orange-700/50 hover:border-orange-400'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-red-600/50'
                }`}
              >
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                  {/* Rank Badge */}
                  <div className="flex items-center gap-2 flex-none w-10 text-center justify-center">
                    {isTop3 ? (
                      <Trophy
                        className={`w-6 h-6 ${
                          rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-slate-300' : 'text-orange-400'
                        }`}
                      />
                    ) : (
                      <span className="text-sm font-extrabold text-zinc-500">#{rank}</span>
                    )}
                  </div>

                  {/* Movie Poster */}
                  <div className="relative w-14 md:w-16 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-950 flex-none border border-zinc-700 shadow-lg">
                    <Image
                      src={movie.poster_url || '/placeholder.png'}
                      alt={movie.title}
                      fill
                      sizes="64px"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Title & Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-extrabold text-base md:text-lg text-white group-hover:text-red-400 transition-colors truncate">
                        {movie.title}
                      </h3>
                      {movie.release_year > 0 && (
                        <span className="text-[11px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/60">
                          {movie.release_year}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-medium">
                      {movie.director && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-red-500" /> Dir: {movie.director}
                        </span>
                      )}
                      <span className="bg-red-950/80 text-red-400 font-bold px-2 py-0.5 rounded border border-red-900/40 flex items-center gap-1">
                        <Tv className="w-3 h-3" /> {movie.reaction_count} Reactions
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side Views Metric */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80 flex-none">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Total Views</p>
                    <p className="text-xl font-black text-amber-400 flex items-center gap-1 sm:justify-end">
                      <Eye className="w-4 h-4 text-amber-400" />
                      {formatViews(movie.total_views)}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-semibold">
                      {formatViews(movie.avg_views_per_reactor)}/ea
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-800/80 text-zinc-400 group-hover:bg-red-600 group-hover:text-white transition-all">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}