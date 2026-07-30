"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Film, Music, Tv, Trophy, Users } from 'lucide-react';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/browse');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md px-6 py-3 flex items-center justify-between border-b border-zinc-800/80 h-16">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center justify-center overflow-hidden rounded">
          {!logoError ? (
            <div className="relative h-11 w-44 flex items-center justify-center">
              <Image
                src="/logo.jpg"
                alt="FinVIDIA"
                fill
                sizes="176px"
                className="object-contain scale-125 transition-transform"
                onError={() => setLogoError(true)}
                priority
              />
            </div>
          ) : (
            <span className="text-2xl font-black tracking-wider text-white uppercase">
              Fin<span className="text-red-600">VIDIA</span>
            </span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/browse" className="hover:text-white transition-colors flex items-center gap-1.5 font-bold text-white">
            <Film className="w-4 h-4 text-red-500" /> Movies
          </Link>
          <Link href="/creators" className="hover:text-white transition-colors flex items-center gap-1.5 font-bold text-zinc-300 hover:text-white">
            <Users className="w-4 h-4 text-red-500" /> Creators
          </Link>
          <Link href="/rankings" className="hover:text-amber-400 transition-colors flex items-center gap-1.5 font-bold text-amber-400">
            <Trophy className="w-4 h-4 text-amber-500" /> Master Rankings
          </Link>
          <div className="flex items-center gap-1.5 text-zinc-500 cursor-not-allowed select-none">
            <Music className="w-4 h-4 text-zinc-600" /> Music
            <span className="text-[10px] uppercase font-extrabold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">Soon</span>
          </div>
          <Link href="/admin" className="hover:text-white transition-colors flex items-center gap-1.5 text-zinc-400">
            <Tv className="w-4 h-4 text-red-500" /> IT Audit Admin
          </Link>
        </nav>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search director, actor, movie, year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 rounded-full pl-9 pr-4 py-2 w-64 md:w-80 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
          />
        </div>
      </form>
    </header>
  );
}