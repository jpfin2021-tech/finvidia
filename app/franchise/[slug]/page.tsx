"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import VideoModal from '@/components/video-modal';
import { Video } from '@/types/database';
import { Play, ExternalLink, ArrowLeft, Tv, RefreshCw, Eye, Clapperboard, Film, Calendar } from 'lucide-react';

interface FranchiseDef {
  slug: string;
  name: string;
  searchKeywords: string[];
}

const FRANCHISES: FranchiseDef[] = [
  { slug: 'lord-of-the-rings', name: 'The Lord of the Rings Franchise', searchKeywords: ['Lord of the Rings', 'Fellowship of the Ring', 'Two Towers', 'Return of the King'] },
  { slug: 'mcu', name: 'Marvel Cinematic Universe', searchKeywords: ['Avengers', 'Iron Man', 'Thor', 'Captain America', 'Guardians of the Galaxy', 'Doctor Strange', 'Spider-Man', 'Black Panther', 'Infinity War', 'Endgame'] },
  { slug: 'john-wick', name: 'John Wick Franchise', searchKeywords: ['John Wick'] },
  { slug: 'deadpool', name: 'Deadpool Collection', searchKeywords: ['Deadpool'] },
  { slug: 'harry-potter', name: 'Harry Potter Collection', searchKeywords: ['Harry Potter'] },
  { slug: 'star-wars', name: 'Star Wars Saga', searchKeywords: ['Star Wars'] },
];

function formatViewCount(views?: number): string {
  if (!views || views === 0) return '0 Views';
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M Views`;
  if (views >= 1000) return `${Math.round(views / 1000)}K Views`;
  return `${views.toLocaleString()} Views`;
}

function generateCleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function FranchisePage() {
  const params = useParams();
  const router = useRouter();
  const rawSlug = params?.slug as string;

  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const franchise = FRANCHISES.find((f) => f.slug === slug);

  const [movies, setMovies] = useState<any[]>([]);
  const [reactions, setReactions] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [reactionSort, setReactionSort] = useState<'views' | 'newest' | 'oldest'>('views');

  useEffect(() => {
    async function loadFranchiseData() {
      if (!franchise) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();

        let allMedia: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('media_items')
            .select('id, title, release_year, poster_url, backdrop_url, studio_label')
            .range(page * 1000, (page + 1) * 1000 - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            allMedia = allMedia.concat(data);
            if (data.length < 1000) hasMore = false;
            page++;
          }
        }

        const matchedMovies = allMedia.filter((m) => {
          const t = m.title.toLowerCase();
          return franchise.searchKeywords.some((kw) => t.includes(kw.toLowerCase()));
        }).sort((a, b) => a.release_year - b.release_year);

        setMovies(matchedMovies);

        if (matchedMovies.length === 0) {
          setLoading(false);
          return;
        }

        const matchedMediaIds = matchedMovies.map((m) => m.id);
        const mediaMap = new Map(matchedMovies.map((m) => [m.id, m]));

        let franchiseVids: any[] = [];
        let vidPage = 0;
        let vidHasMore = true;

        while (vidHasMore) {
          const { data, error } = await supabase
            .from('videos')
            .select(`
              id,
              yt_video_id,
              media_id,
              title,
              description,
              thumbnail_url,
              published_at,
              view_count,
              channels (id, name, handle, avatar_url, slug)
            `)
            .in('media_id', matchedMediaIds)
            .range(vidPage * 1000, (vidPage + 1) * 1000 - 1);

          if (error || !data || data.length === 0) {
            vidHasMore = false;
          } else {
            franchiseVids = franchiseVids.concat(data);
            if (data.length < 1000) vidHasMore = false;
            vidPage++;
          }
        }

        const formattedReactions: Video[] = franchiseVids.map((v: any) => {
          const chan = v.channels || {};
          const chanName = chan.name || 'Creator';
          const parentMedia = mediaMap.get(v.media_id);

          return {
            id: v.id,
            yt_video_id: v.yt_video_id,
            channel_id: chan.id || '',
            title: v.title,
            description: v.description,
            thumbnail_url: v.thumbnail_url,
            published_at: v.published_at,
            view_count: v.view_count || 0,
            channel_name: chanName,
            channel_handle: chan.handle || '',
            channel_avatar: chan.avatar_url || '',
            channel_slug: chan.slug || generateCleanSlug(chanName),
            media_item: parentMedia ? {
              id: parentMedia.id,
              media_type: 'movie',
              title: parentMedia.title,
              release_year: parentMedia.release_year,
              poster_url: parentMedia.poster_url,
              backdrop_url: parentMedia.backdrop_url,
              studio_label: parentMedia.studio_label,
            } : undefined
          };
        });

        setReactions(formattedReactions);
      } catch (err) {
        console.error('Error loading franchise page:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFranchiseData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Franchise Collection...</p>
      </div>
    );
  }

  if (!franchise) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 px-6 text-center text-zinc-400">
        <h2 className="text-xl font-bold text-white">Franchise collection not found</h2>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const sortedReactions = [...reactions].sort((a, b) => {
    if (reactionSort === 'views') return (b.view_count || 0) - (a.view_count || 0);
    if (reactionSort === 'oldest') return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  const totalViewsCombined = reactions.reduce((sum, v) => sum + (v.view_count || 0), 0);

  return (
    <div className="pt-20 pb-20 min-h-screen bg-[#09090b]">
      <div className="px-6 md:px-12 pt-6 max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
      </div>

      <div className="px-6 md:px-12 max-w-7xl mx-auto my-6">
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div>
            <span className="bg-red-600 text-white text-xs font-black uppercase px-2.5 py-1 rounded tracking-wider flex items-center gap-1.5 w-fit mb-3">
              <Clapperboard className="w-3.5 h-3.5" />
              Official Franchise Collection
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
              {franchise.name}
            </h1>
            <p className="text-sm text-zinc-400 font-medium mt-2">
              Chronological movie series and complete creator reaction collection.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/60 border border-zinc-800 rounded-xl p-4 flex-none">
            <div className="pr-4 border-r border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-zinc-400">Films Included</p>
              <p className="text-xl font-black text-white flex items-center gap-1.5 mt-0.5">
                <Film className="w-4 h-4 text-red-500" />
                {movies.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-zinc-400">Franchise Views</p>
              <p className="text-xl font-black text-amber-400 flex items-center gap-1.5 mt-0.5">
                <Eye className="w-4 h-4 text-amber-400" />
                {formatViewCount(totalViewsCombined)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 max-w-7xl mx-auto mt-8 mb-12">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Film className="w-5 h-5 text-red-500" /> Film Titles ({movies.length})
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {movies.map((m) => (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-xl overflow-hidden p-2.5 transition-all duration-300 hover:scale-105 shadow-md flex flex-col justify-between"
            >
              <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-zinc-950 mb-2">
                <Image
                  src={m.poster_url || '/placeholder.png'}
                  alt={m.title}
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-900/40">
                  {m.release_year}
                </span>
                <h3 className="font-bold text-xs text-white group-hover:text-red-400 transition-colors line-clamp-1 mt-1">
                  {m.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Tv className="w-6 h-6 text-red-600" />
            <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Franchise Creator Reactions ({reactions.length})
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>Sort Reactions:</span>
            <select
              value={reactionSort}
              onChange={(e: any) => setReactionSort(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-red-600 cursor-pointer"
            >
              <option value="views">Most Views (Highest Popularity)</option>
              <option value="newest">Upload Date (Newest First)</option>
              <option value="oldest">Upload Date (Oldest First)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedReactions.map((video) => (
            <div
              key={video.id}
              className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/50 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
            >
              <div 
                className="relative aspect-video w-full bg-black cursor-pointer overflow-hidden"
                onClick={() => setSelectedVideo(video)}
              >
                <Image
                  src={video.thumbnail_url}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                <div className="absolute top-2.5 right-2.5 bg-black/85 backdrop-blur-md text-[11px] font-extrabold text-white px-2.5 py-1 rounded-md border border-white/10 shadow-lg flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-red-500" />
                  {formatViewCount(video.view_count)}
                </div>

                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Link
                      href={`/creators/${(video as any).channel_slug || 'creators'}`}
                      className="text-[11px] font-bold text-red-400 hover:text-white bg-red-950/60 border border-red-900/40 px-2.5 py-0.5 rounded transition-colors truncate max-w-[150px]"
                    >
                      {(video as any).channel_name || 'Creator'}
                    </Link>

                    {/* YouTube Published Upload Date Badge */}
                    <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1 flex-none">
                      <Calendar className="w-3 h-3 text-red-500" />
                      {new Date(video.published_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                    {video.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800 text-xs">
                  <button
                    onClick={() => setSelectedVideo(video)}
                    className="text-white hover:text-red-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-red-600" /> Watch Reaction
                  </button>

                  <a
                    href={`https://www.youtube.com/watch?v=${video.yt_video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-red-500 flex items-center gap-1 transition-colors text-[11px]"
                  >
                    <span>YouTube</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}