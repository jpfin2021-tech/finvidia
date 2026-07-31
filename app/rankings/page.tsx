"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, Trophy, Eye, Tv, User, ChevronLeft, ChevronRight, Filter, ArrowUp, ArrowDown } from 'lucide-react';

interface LeaderboardItem {
  id: string;
  title: string;
  release_year: number;
  poster_url: string;
  studio_label?: string;
  director?: string;
  total_views: number;
  reaction_count: number;
  avg_views_per_video: number;
}

function formatViews(views?: number): string {
  if (!views || views === 0) return '0 Views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

export default function LeaderboardPage() {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'views' | 'avg_views' | 'reactions' | 'year' | 'title'>('views');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    async function loadLeaderboard() {
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

        const formatted: LeaderboardItem[] = allMedia.map((m: any) => {
          const vids = m.videos || [];
          const totalViews = vids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
          const reactionCount = vids.length;
          const directorName = m.media_directors?.[0]?.directors?.name || '—';

          return {
            id: m.id,
            title: m.title,
            release_year: m.release_year,
            poster_url: m.poster_url,
            studio_label: m.studio_label,
            director: directorName,
            total_views: totalViews,
            reaction_count: reactionCount,
            avg_views_per_video: reactionCount > 0 ? Math.round(totalViews / reactionCount) : 0,
          };
        });

        setItems(formatted);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const sortedItems = [...items].sort((a, b) => {
    let res = 0;
    if (sortBy === 'avg_views') res = b.avg_views_per_video - a.avg_views_per_video;
    else if (sortBy === 'reactions') res = b.reaction_count - a.reaction_count;
    else if (sortBy === 'year') res = b.release_year - a.release_year;
    else if (sortBy === 'title') res = a.title.localeCompare(b.title);
    else res = b.total_views - a.total_views;

    return sortDirection === 'desc' ? res : -res;
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage) || 1;
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Leaderboard Rankings...</p>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 min-h-screen bg-[#09090b]">
      <div className="px-4 md:px-12 max-w-5xl mx-auto my-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight uppercase flex items-center gap-2">
              <Trophy className="w-8 h-8 text-amber-400 fill-amber-400" />
              Master Leaderboard
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-1 font-medium">
              Top performing films ranked by aggregate creator reaction viewership.
            </p>
          </div>

          {/* Sort & Filter Options */}
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <button
              onClick={toggleSortDirection}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600 text-red-500 transition-all cursor-pointer"
              title={`Sort Order: ${sortDirection === 'desc' ? 'Descending' : 'Ascending'}`}
            >
              {sortDirection === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
            </button>

            <Filter className="w-4 h-4 text-red-500" />
            <span>Sort By:</span>
            <select
              value={sortBy}
              onChange={(e: any) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="views">Total Reaction Views</option>
              <option value="avg_views">Views Per Reaction</option>
              <option value="reactions">Most Creator Reactions</option>
              <option value="year">Release Year</option>
              <option value="title">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-3">
          {paginatedItems.map((item, index) => {
            const rank = (currentPage - 1) * itemsPerPage + index + 1;
            const isGold = rank === 1;
            const isSilver = rank === 2;
            const isBronze = rank === 3;

            return (
              <Link
                key={item.id}
                href={`/media/${item.id}`}
                className={`group block bg-zinc-900 border rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:scale-[1.01] shadow-xl ${
                  isGold
                    ? 'border-amber-500/80 bg-gradient-to-r from-amber-950/20 via-zinc-900 to-zinc-900'
                    : isSilver
                    ? 'border-zinc-400/80 bg-gradient-to-r from-zinc-800/30 via-zinc-900 to-zinc-900'
                    : isBronze
                    ? 'border-amber-700/80 bg-gradient-to-r from-amber-950/10 via-zinc-900 to-zinc-900'
                    : 'border-zinc-800 hover:border-red-600/50'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Rank Badge */}
                  <div className="flex-none w-8 sm:w-10 flex flex-col items-center justify-center">
                    {isGold ? (
                      <div className="flex flex-col items-center">
                        <Trophy className="w-6 h-6 text-amber-400 fill-amber-400" />
                        <span className="text-[11px] font-black text-amber-400">#1</span>
                      </div>
                    ) : isSilver ? (
                      <div className="flex flex-col items-center">
                        <Trophy className="w-6 h-6 text-zinc-300 fill-zinc-300" />
                        <span className="text-[11px] font-black text-zinc-300">#2</span>
                      </div>
                    ) : isBronze ? (
                      <div className="flex flex-col items-center">
                        <Trophy className="w-6 h-6 text-amber-600 fill-amber-600" />
                        <span className="text-[11px] font-black text-amber-600">#3</span>
                      </div>
                    ) : (
                      <span className="font-mono text-sm sm:text-base font-black text-zinc-500">
                        #{rank}
                      </span>
                    )}
                  </div>

                  {/* Movie Poster */}
                  <div className="relative w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-950 flex-none border border-zinc-800">
                    <Image
                      src={item.poster_url || '/placeholder.png'}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="font-black text-sm sm:text-base text-white group-hover:text-red-400 transition-colors leading-snug break-words">
                          {item.title}
                        </h2>
                        {item.release_year > 0 && (
                          <span className="text-[10px] font-extrabold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/80 flex-none">
                            {item.release_year}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-red-500 flex-none" />
                        <span className="truncate">Dir: {item.director}</span>
                      </p>
                    </div>

                    {/* Uniform Stats Bar */}
                    <div className="flex items-center justify-between text-[11px] font-bold pt-2 mt-1 border-t border-zinc-800/80">
                      <span className="text-amber-400 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {formatViews(sortBy === 'avg_views' ? item.avg_views_per_video : item.total_views)}
                        {sortBy === 'avg_views' ? ' Avg Views' : ' Total Views'}
                      </span>

                      <span className="text-zinc-300 flex items-center gap-1">
                        <Tv className="w-3.5 h-3.5 text-red-500" />
                        {item.reaction_count} Reactions
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Touch-Friendly Page Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-6 mt-8">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <span className="text-xs font-bold text-zinc-400">
              Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-red-600 transition-all flex items-center gap-1 cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}