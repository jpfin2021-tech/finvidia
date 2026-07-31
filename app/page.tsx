"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import HeroBanner from '@/components/hero-banner';
import CarouselRow from '@/components/carousel-row';
import FranchiseSection from '@/components/franchise-section';
import VideoCard from '@/components/video-card';
import VideoModal from '@/components/video-modal';
import { Video } from '@/types/database';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [topRankedMovies, setTopRankedMovies] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [shuffleReactions, setShuffleReactions] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

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

        {/* Leaderboard Row */}
        <CarouselRow
          title="Leaderboard"
          subtitle="Top performing films ranked by aggregate creator viewership."
          items={topRankedMovies}
        />

        {/* New Releases Row */}
        <CarouselRow
          title="New Releases"
          subtitle="Recently indexed titles and fresh creator commentary."
          items={newReleases}
        />

        {/* Shuffle Grid */}
        <div className="my-10">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 fill-amber-400" />
              Shuffle
            </h2>
            <Link
              href="/browse"
              className="text-xs text-red-400 hover:text-white font-bold"
            >
              Browse Full Catalog →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shuffleReactions.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={setSelectedVideo}
              />
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