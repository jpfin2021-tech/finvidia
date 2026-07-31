"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Clapperboard, ChevronRight, Tv, Eye } from 'lucide-react';

interface FranchiseDef {
  slug: string;
  name: string;
  keywords: string[];
}

const FRANCHISE_DEFS: FranchiseDef[] = [
  { slug: 'mcu', name: 'Marvel Cinematic Universe', keywords: ['Avengers', 'Iron Man', 'Thor', 'Captain America', 'Spider-Man', 'Endgame'] },
  { slug: 'lord-of-the-rings', name: 'The Lord of the Rings Franchise', keywords: ['Lord of the Rings', 'Fellowship of the Ring', 'Two Towers', 'Return of the King'] },
  { slug: 'john-wick', name: 'John Wick Franchise', keywords: ['John Wick'] },
  { slug: 'star-wars', name: 'Star Wars Saga', keywords: ['Star Wars'] },
];

function formatViews(views?: number): string {
  if (!views || views === 0) return '0 Views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

export default function FranchiseSection() {
  const [franchiseCards, setFranchiseCards] = useState<any[]>([]);

  useEffect(() => {
    async function loadFranchises() {
      try {
        const supabase = createClient();

        let allMedia: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('media_items')
            .select('id, title, release_year, poster_url, videos (id, view_count)')
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allMedia = allMedia.concat(data);
            if (data.length < 1000) hasMore = false;
            page++;
          }
        }

        const cards = FRANCHISE_DEFS.map((fDef) => {
          const matchedMovies = allMedia.filter((m) => {
            const title = m.title.toLowerCase();
            return fDef.keywords.some((kw) => title.includes(kw.toLowerCase()));
          }).sort((a, b) => a.release_year - b.release_year);

          let totalReactions = 0;
          let totalViews = 0;

          matchedMovies.forEach((m) => {
            const vids = m.videos || [];
            totalReactions += vids.length;
            totalViews += vids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
          });

          return {
            slug: fDef.slug,
            name: fDef.name,
            movieCount: matchedMovies.length,
            reactionCount: totalReactions,
            totalViews,
            posters: matchedMovies.map((m) => m.poster_url).filter(Boolean).slice(0, 4),
          };
        });

        // Explicitly sort descending by Total Views
        cards.sort((a, b) => b.totalViews - a.totalViews);

        setFranchiseCards(cards);
      } catch (err) {
        console.error('Error loading franchises:', err);
      }
    }

    loadFranchises();
  }, []);

  return (
    <div className="my-8">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
        <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Clapperboard className="w-5 h-5 text-red-600" />
          Franchises
        </h2>
        <span className="text-xs text-zinc-400 font-medium">Featured Collections</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {franchiseCards.map((f) => (
          <Link
            key={f.slug}
            href={`/franchise/${f.slug}`}
            className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/80 rounded-2xl p-3.5 transition-all duration-300 hover:scale-[1.02] shadow-xl flex flex-col justify-between"
          >
            {/* Poster Preview Row */}
            <div className="grid grid-cols-4 gap-1.5 bg-black/60 p-1.5 rounded-xl border border-zinc-800/80 mb-3 overflow-hidden aspect-[4/1.8]">
              {f.posters.map((poster: string, idx: number) => (
                <div key={idx} className="relative aspect-[2/3] rounded overflow-hidden bg-zinc-950">
                  <Image
                    src={poster || '/placeholder.png'}
                    alt="Movie poster"
                    fill
                    sizes="60px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-extrabold text-sm text-white group-hover:text-red-400 transition-colors line-clamp-1">
                  {f.name}
                </h3>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all flex-none" />
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-2 border-t border-zinc-800/80">
                <span className="flex items-center gap-1 text-zinc-300">
                  <Tv className="w-3.5 h-3.5 text-red-500" />
                  {f.movieCount} Movies • {f.reactionCount} Reactions
                </span>

                <span className="flex items-center gap-1 text-amber-400">
                  <Eye className="w-3.5 h-3.5" />
                  {formatViews(f.totalViews)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}