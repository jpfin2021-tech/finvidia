"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clapperboard, ChevronRight } from 'lucide-react';

interface Franchise {
  slug: string;
  name: string;
  itemCount: number;
  viewCount: string;
  backdropUrl: string;
}

const FRANCHISES: Franchise[] = [
  {
    slug: 'lord-of-the-rings',
    name: 'The Lord of the Rings Franchise',
    itemCount: 3,
    viewCount: '18.4M',
    backdropUrl: 'https://image.tmdb.org/t/p/w500/2u7zbn8YudG69el30P2SGo3I4S.jpg'
  },
  {
    slug: 'mcu',
    name: 'Marvel Cinematic Universe',
    itemCount: 32,
    viewCount: '45.2M',
    backdropUrl: 'https://image.tmdb.org/t/p/w500/mL1O1IOfIunp7m3w5qjO4y4Y2QZ.jpg'
  },
  {
    slug: 'john-wick',
    name: 'John Wick Franchise',
    itemCount: 4,
    viewCount: '12.1M',
    backdropUrl: 'https://image.tmdb.org/t/p/w500/v13L32Qp9W46gB7i79K2N9y6pUo.jpg'
  },
  {
    slug: 'star-wars',
    name: 'Star Wars Saga',
    itemCount: 9,
    viewCount: '34.8M',
    backdropUrl: 'https://image.tmdb.org/t/p/w500/62022L23f293i98363717208221.jpg'
  }
];

export default function FranchiseSection() {
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
        {FRANCHISES.map((f) => (
          <Link
            key={f.slug}
            href={`/franchise/${f.slug}`}
            className="group relative h-28 rounded-xl overflow-hidden border border-zinc-800 hover:border-red-600/80 transition-all duration-300 p-4 flex flex-col justify-between shadow-lg bg-zinc-950"
          >
            {/* Backdrop Image */}
            <Image
              src={f.backdropUrl}
              alt={f.name}
              fill
              sizes="(max-width: 640px) 100vw, 300px"
              className="object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent z-10" />

            <div className="relative z-20 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded shadow">
                Collection
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
            </div>

            <div className="relative z-20">
              <h3 className="font-extrabold text-sm text-white group-hover:text-red-400 transition-colors line-clamp-1">
                {f.name}
              </h3>
              <p className="text-[11px] text-zinc-300 font-medium">
                {f.itemCount} Movies • {f.viewCount} Views
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}