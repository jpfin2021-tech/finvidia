"use client";

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-zinc-950 border-t border-zinc-800/80 py-8 px-6 md:px-12 mt-12">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center font-black text-white text-xs shadow-md">
            F
          </div>
          <span className="font-black text-base tracking-tight text-white">
            Fin<span className="text-red-600">VIDIA</span>
          </span>
          <span className="text-xs text-zinc-500 ml-2 font-mono">
            © 2026 FinVIDIA. All rights reserved.
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-zinc-400">
          <Link href="/" className="hover:text-red-500 transition-colors">Home</Link>
          <Link href="/browse" className="hover:text-red-500 transition-colors">Movies</Link>
          <Link href="/creators" className="hover:text-red-500 transition-colors">Creators</Link>
          <Link href="/rankings" className="hover:text-red-500 transition-colors">Leaderboard</Link>
          <Link href="/faq" className="hover:text-red-500 transition-colors text-zinc-300">FAQ</Link>
        </nav>
      </div>
    </footer>
  );
}