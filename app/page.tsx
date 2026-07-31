"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import HeroBanner from '@/components/hero-banner';
import CarouselRow from '@/components/carousel-row';
import FranchiseSection from '@/components/franchise-section';
import VideoCard from '@/components/video-card';
import VideoModal from '@/components/video-modal';
import { Video } from '@/types/database';
import { RefreshCw, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export default function HomePage() {
  const [topRankedMovies, setTopRankedMovies] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [shuffleReactions, setShuffleReactions] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const shuffleRowRef = useRef<HTMLDivElement>(null);

  const handleShuffleScroll = (direction: 'left' | 'right') => {
    if (shuffleRowRef.current) {
      const scrollAmount = shuffleRowRef.current.clientWidth * 0.8;
      shuffleRowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    async function loadHomePageData() {
      setLoading(true);
      try {
        const supabase = createClient();

        // 1. Leaderboard Titles
        const { data: mediaData } = await supabase
          .from('media_items')
          .select(`
            id,
            title,
            release_year,
            poster_url,
            studio_label,
            videos (id, view_count)
          `);

        if (mediaData) {
          const formatted = mediaData.map((m: any) => {
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
        }

        // 2. Shuffle Feed Reactions
        const { data: shuffleData } = await supabase
          .from('videos')
          .select(`
            id,
            yt_video_id,
            channel_id,
            title,
            description,
            thumbnail_url,
            published_at,
            view_count,
            channels (id, name, handle, avatar_url, slug),
            media_items (id, title, release_year)
          `)
          .limit(12);

        if (shuffleData) {
          const formattedShuffle: Video[] = shuffleData.map((v: any) => ({
            id: v.id,
            yt_video_id: v.yt_video_id,
            channel_id: v.channel_id,
            title: v.title,
            description: v.description,
            thumbnail_url: v.thumbnail_url,
            published_at: v.published_at,
            view_count: v.view_count || 0,
            channel_name: v.channels?.name || 'Creator',
            channel_handle: v.channels?.handle,
            channel_avatar: v.channels?.avatar_url,
            channel_slug: v.channels?.slug,
            media_item: v.media_items ? {
              id: v.media_items.id,
              media_type: 'movie',
              title: v.media_items.title,
              release_year: v.media_items.release_year,
              poster_url: '',
              backdrop_url: '',
            } : undefined
          }));

          setShuffleReactions(formattedShuffle);
        }
      } catch (err) {
        console.error('Error loading home page:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHomePageData();
  }, []);

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

        {/* Leaderboard Row (No descriptor subtitle) */}
        <CarouselRow
          title="Leaderboard"
          items={topRankedMovies}
        />

        {/* New Releases Row (No descriptor subtitle) */}
        <CarouselRow
          title="New Releases"
          items={newReleases}
        />

        {/* Shuffle Row (2 Cards per view on mobile with arrows) */}
        <div className="my-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
              Shuffle
            </h2>

            <div className="flex items-center gap-1.5 flex-none">
              <button
                onClick={() => handleShuffleScroll('left')}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-600 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95"
                aria-label="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleShuffleScroll('right')}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-600 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95"
                aria-label="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={shuffleRowRef}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none py-2 px-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {shuffleReactions.map((video) => (
              <div
                key={video.id}
                className="flex-none w-[calc(50%-6px)] sm:w-[280px] md:w-[320px] snap-start"
              >
                <VideoCard
                  video={video}
                  onSelect={setSelectedVideo}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
}