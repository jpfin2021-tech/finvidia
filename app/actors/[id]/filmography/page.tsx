"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { User, ArrowLeft, RefreshCw, CheckCircle2, List, Film } from 'lucide-react';

interface ActorDetails {
  id: string;
  name: string;
  slug?: string;
  profile_img_url?: string;
}

interface FilmographyCredit {
  id: string;
  title: string;
  release_year: number;
  studio_label: string;
  slug: string;
  has_reactions: boolean;
}

function generateCleanSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ActorFullFilmographyPage() {
  const params = useParams();
  const router = useRouter();
  const rawIdentifier = params?.id as string;
  const actorIdentifier = Array.isArray(rawIdentifier) ? rawIdentifier[0] : rawIdentifier;

  const [actor, setActor] = useState<ActorDetails | null>(null);
  const [filmography, setFilmography] = useState<FilmographyCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    async function loadFilmographyData() {
      if (!actorIdentifier) return;
      setLoading(true);

      const cleanSlug = generateCleanSlug(actorIdentifier);

      // 1. Fetch pre-rendered static JSON file (Instant load)
      try {
        const res = await fetch(`/data/filmographies/${cleanSlug}.json`);
        if (res.ok) {
          const staticData = await res.json();
          setActor({
            id: staticData.id,
            name: staticData.name,
            slug: staticData.slug,
            profile_img_url: staticData.profile_img_url,
          });
          setFilmography(staticData.filmography || []);
          setLoading(false);
          return;
        }
      } catch (e) {
        // Fallback to database lookup if static file is missing
      }

      // 2. Database Fallback
      try {
        const supabase = createClient();
        const formattedParam = actorIdentifier.toLowerCase().trim();
        const rawName = formattedParam.replace(/-/g, ' ');

        const { data: actorData } = await supabase
          .from('actors')
          .select('id, name, slug, profile_img_url')
          .or(`slug.ilike.${formattedParam},name.ilike.${rawName}`)
          .limit(1)
          .maybeSingle();

        if (!actorData) {
          setLoading(false);
          return;
        }

        setActor(actorData);

        const { data: mediaLinks } = await supabase
          .from('media_actors')
          .select(`
            media_items (
              id,
              title,
              slug,
              release_year,
              studio_label,
              videos (id, verification_status)
            )
          `)
          .eq('actor_id', actorData.id);

        let allCredits: FilmographyCredit[] = [];
        if (mediaLinks && mediaLinks.length > 0) {
          allCredits = mediaLinks
            .map((item: any) => item.media_items)
            .filter(Boolean)
            .map((m: any) => {
              const verifiedVids = (m.videos || []).filter(
                (v: any) => v.verification_status === 'verified' || !v.verification_status
              );
              return {
                id: m.id,
                title: m.title,
                release_year: m.release_year || 0,
                studio_label: m.studio_label || '—',
                slug: m.slug || generateCleanSlug(m.title),
                has_reactions: verifiedVids.length > 0,
              };
            });
        }

        allCredits.sort((a, b) => a.release_year - b.release_year);
        setFilmography(allCredits);
      } catch (err) {
        console.error('Error loading actor filmography:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFilmographyData();
  }, [actorIdentifier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 flex flex-col items-center justify-center text-zinc-400">
        <RefreshCw className="w-10 h-10 animate-spin text-red-600 mb-4" />
        <p className="text-sm font-medium">Loading Full Filmography Archive...</p>
      </div>
    );
  }

  if (!actor) {
    return (
      <div className="min-h-screen bg-[#09090b] pt-32 px-6 text-center text-zinc-400">
        <h2 className="text-xl font-bold text-white">Actor profile not found</h2>
        <button
          onClick={() => router.push('/movies')}
          className="mt-4 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
        >
          Return to Movie Index
        </button>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 min-h-screen bg-[#09090b]">
      {/* Back Navigation */}
      <div className="px-6 md:px-12 pt-6 max-w-7xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Actor Profile
        </button>
      </div>

      {/* Header Banner */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto my-6">
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-5">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-zinc-900 border-2 border-red-600 shadow-2xl flex-none flex items-center justify-center">
              {!imgError && actor.profile_img_url ? (
                <Image
                  src={actor.profile_img_url}
                  alt=""
                  fill
                  priority
                  unoptimized
                  onError={() => setImgError(true)}
                  className="object-cover"
                />
              ) : (
                <User className="w-9 h-9 text-red-500" />
              )}
            </div>
            <div>
              <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider flex items-center gap-1 w-fit mb-2">
                <List className="w-3 h-3 text-white" />
                Complete Chronological Filmography
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
                {actor.name}
              </h1>
              <p className="text-xs md:text-sm text-zinc-400 font-medium mt-1">
                Full career filmography ordered from oldest release to newest.
              </p>
            </div>
          </div>

          <div className="bg-black/60 border border-zinc-800 rounded-xl p-4 flex-none">
            <p className="text-[10px] font-bold uppercase text-zinc-400">Total Career Credits</p>
            <p className="text-2xl font-black text-white flex items-center gap-1.5 mt-0.5">
              <Film className="w-5 h-5 text-red-500" />
              {filmography.length} Films
            </p>
          </div>
        </div>
      </div>

      {/* Chronological Table (Oldest to Newest) */}
      <div className="px-6 md:px-12 max-w-7xl mx-auto my-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-4">Release Year</th>
                  <th className="p-4">Official Movie Title</th>
                  <th className="p-4">Studio / Label</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Reaction Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {filmography.map((m) => {
                  const filmSlug = m.slug || generateCleanSlug(m.title);

                  return (
                    <tr key={m.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-zinc-400">
                        {m.release_year || '—'}
                      </td>
                      <td className="p-4 font-extrabold text-white text-sm">
                        {m.title}
                      </td>
                      <td className="p-4 text-zinc-400">
                        {m.studio_label || '—'}
                      </td>
                      <td className="p-4 text-center">
                        {m.has_reactions ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-900/50 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                            <CheckCircle2 className="w-3 h-3" /> Indexed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-500 bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            Unindexed
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {m.has_reactions ? (
                          <Link
                            href={`/movies/${filmSlug}`}
                            className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer shadow-md"
                          >
                            <span>Watch Reactions</span>
                          </Link>
                        ) : (
                          <span className="text-zinc-600 text-[11px] italic">No Reactions Available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}