"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Menu, X, Clapperboard, Users, Trophy, Sparkles, Tv, Tv2 } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/browse?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 h-16 px-4 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-none">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-lg shadow-lg border border-red-500/50">
            F
          </div>
          <span className="font-black text-xl tracking-tight text-white flex items-center">
            Fin<span className="text-red-600">VIDIA</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-zinc-300">
          <Link href="/" className="hover:text-red-500 transition-colors">Home</Link>
          <Link href="/browse" className="hover:text-red-500 transition-colors flex items-center gap-1">
            <Clapperboard className="w-3.5 h-3.5 text-red-500" /> Movies
          </Link>
          <Link href="/creators" className="hover:text-red-500 transition-colors flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-red-500" /> Creators
          </Link>
          <Link href="/rankings" className="hover:text-red-500 transition-colors flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Master Rankings
          </Link>
        </nav>

        {/* Desktop Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:relative md:block w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search director, actor, movie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-red-600"
          />
        </form>

        {/* Mobile Action Controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 active:text-white"
          >
            <Search className="w-5 h-5 text-red-500" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 active:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Expandable Search Drawer */}
      {searchOpen && (
        <div className="fixed top-16 left-0 right-0 z-30 bg-zinc-950 border-b border-zinc-800 p-3 md:hidden">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search title, director, actor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-red-600"
              autoFocus
            />
          </form>
        </div>
      )}

      {/* Mobile Side Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 bg-zinc-950/95 backdrop-blur-xl md:hidden p-6 flex flex-col justify-between border-t border-zinc-800">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold text-sm"
            >
              <Tv className="w-5 h-5 text-red-500" /> Home
            </Link>
            <Link
              href="/browse"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold text-sm"
            >
              <Clapperboard className="w-5 h-5 text-red-500" /> Movie Index
            </Link>
            <Link
              href="/creators"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold text-sm"
            >
              <Users className="w-5 h-5 text-red-500" /> Creator Network
            </Link>
            <Link
              href="/rankings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold text-sm"
            >
              <Trophy className="w-5 h-5 text-amber-400" /> Master Leaderboard
            </Link>
          </div>

          <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800/80 flex items-center gap-3">
            <Tv2 className="w-6 h-6 text-red-500 flex-none" />
            <div>
              <p className="text-xs font-bold text-white">First-Screen TV Controller</p>
              <p className="text-[11px] text-zinc-400">Ready to pair with NVIDIA Shield / Smart TV</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}