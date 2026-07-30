"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Clapperboard, Eye, Tv, ChevronRight } from 'lucide-react';

interface FranchiseDef {
  slug: string;
  name: string;
  searchKeywords: string[];
}

// Exactly 6 major Hollywood franchises
const FRANCHISES: FranchiseDef[] = [
  { slug: 'lord-of-the-rings', name: 'The Lord of the Rings', searchKeywords: ['Lord of the Rings', 'Fellowship of the Ring', 'Two Towers', 'Return of the King'] },
  { slug: 'john-wick', name: 'John Wick Franchise', searchKeywords: ['John Wick'] },
  { slug: 'back-to-the-future', name: 'Back to the Future Trilogy', searchKeywords: ['Back to the Future'] },
  { slug: 'deadpool', name: 'Deadpool Collection', searchKeywords: ['Deadpool'] },
  { slug: 'harry-potter', name: 'Harry Potter Collection', searchKeywords: ['Harry Potter'] },
  { slug: 'star-wars', name: 'Star Wars Saga', searchKeywords: ['Star Wars'] },
];

interface FranchiseDisplayData {
  slug: string;
  name: string;
  posters: string[];
  totalViews: number;
  movieCount: number;
  reactionCount: number;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toLocaleString();
}

export default function FranchiseSection() {
  const [franchiseData, setFranchiseData] = useState<FranchiseDisplayData[]>([]);
  const [loading, setLoading] = useState(true);

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
            .select(`
              id,
              title,
              release_year,
              poster_url,
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

        const results: FranchiseDisplayData[] = [];

        for (const fran of FRANCHISES) {
          const matchingMedia = allMedia.filter((m) => {
            const titleLower = m.title.toLowerCase();
            return fran.searchKeywords.some((kw) => titleLower.includes(kw.toLowerCase()));
          }).sort((a, b) => a.release_year - b.release_year);

          if (matchingMedia.length > 0) {
            const posters = matchingMedia.map((m) => m.poster_url).filter(Boolean);
            let totalViews = 0;
            let reactionCount = 0;

            for (const m of matchingMedia) {
              const vids = m.videos || [];
              reactionCount += vids.length;
              totalViews += vids.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
            }

            results.push({
              slug: fran.slug,
              name: fran.name,
              posters,
              totalViews,
              movieCount: matchingMedia.length,
              reactionCount,
            });
          }
        }

        setFranchiseData(results);
      } catch (err) {
        console.error('Error loading franchise section:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFranchises();
  }, []);

  if (loading || franchiseData.length === 0) return null;

  return (
    <section className="px-6 md:px-12 max-w-7xl mx-auto my-12">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Clapperboard className="w-6 h-6 text-red-600" />
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">
            Major Cinema Franchises
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {franchiseData.map((fran) => (
          <Link
            key={fran.slug}
            href={`/franchise/${fran.slug}`}
            className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar mb-4 border-b border-zinc-800">
                {fran.posters.map((posterUrl, idx) => (
                  <div key={idx} className="relative w-16 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-950 flex-none border border-zinc-700/80 shadow-md group-hover:border-red-600/50 transition-colors">
                    <Image
                      src={posterUrl}
                      alt={fran.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>

              <h3 className="font-extrabold text-lg text-white group-hover:text-red-400 transition-colors flex items-center justify-between">
                <span>{fran.name}</span>
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
              </h3>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80 text-xs mt-3">
              <span className="text-zinc-400 font-medium flex items-center gap-1">
                <Tv className="w-3.5 h-3.5 text-red-500" />
                {fran.movieCount} Movies • {fran.reactionCount} Reactions
              </span>

              <span className="text-amber-400 font-black flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                {formatViews(fran.totalViews)} Views
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}