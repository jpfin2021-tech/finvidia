"use client";

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[#09090b] border-t border-zinc-800/80 py-8 px-6 md:px-12 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-medium">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-white font-black text-xs">
            F
          </div>
          <span className="font-extrabold text-white">FinVIDI<span className="text-red-600">A</span></span>
          <span>© {new Date().getFullYear()} FinVIDIA. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/movies" className="hover:text-white transition-colors">
            Movies
          </Link>
          <Link href="/creators" className="hover:text-white transition-colors">
            Creators
          </Link>
          <Link href="/rankings" className="hover:text-white transition-colors">
            Leaderboard
          </Link>
          <Link href="/faq" className="hover:text-white transition-colors">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
}