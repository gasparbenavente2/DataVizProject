'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const BG = '#00021a';

interface Stat {
  label: string;
  value: string;
  since: string;
  negative: boolean;
}

// Fallback shown until the summary JSON loads (keeps layout stable, no flicker of 0s).
const FALLBACK: Stat[] = [
  { label: 'Articles analyzed', value: '—', since: '2015', negative: false },
  { label: 'Countries covering', value: '—', since: '2015', negative: false },
  { label: 'Most referred to as', value: 'Innovator', since: '2015', negative: false },
  { label: 'Average tone', value: '—', since: '2015', negative: true },
];

export default function SectionLanding() {
  const [stats, setStats] = useState<Stat[]>(FALLBACK);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${basePath}/data/elon-musk-summary.json`)
      .then((r) => r.json())
      .then((d: { headline: { total_articles: number; countries: number; avg_tone: number; date_range: string } }) => {
        const h = d.headline;
        const since = h.date_range?.split(/[–-]/)[0]?.trim()?.slice(0, 4) || '2015';
        setStats([
          { label: 'Articles analyzed', value: h.total_articles.toLocaleString(), since, negative: false },
          { label: 'Countries covering', value: String(h.countries), since, negative: false },
          { label: 'Most referred to as', value: 'Innovator', since, negative: false },
          { label: 'Average tone', value: `${h.avg_tone >= 0 ? '+' : '−'}${Math.abs(h.avg_tone).toFixed(2)}`, since, negative: h.avg_tone < 0 },
        ]);
      })
      .catch(console.error);
  }, []);

  return (
    <section className="relative h-screen snap-start shrink-0 flex flex-col items-center justify-center">
      {/* Center content */}
      <div className="flex flex-col items-center text-center gap-3 pointer-events-none select-none">
        <p className="text-base font-normal text-[#7683a6]">
          Global news &amp; sentiment over time about
        </p>
        <h1
          className="font-light text-[#ecf2ff] leading-none tracking-tight"
          style={{ fontSize: 'clamp(4rem, 11vw, 9rem)' }}
        >
          Elon Musk
        </h1>
      </div>

      {/* Stat cards */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-4 px-8 pointer-events-none select-none">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-2 px-6 py-5 rounded-xl"
            style={{
              border: '2px solid transparent',
              background: `linear-gradient(${BG}, ${BG}) padding-box, linear-gradient(135deg, #24355f, #7683a6) border-box`,
              minWidth: '180px',
            }}
          >
            <span className="text-xs text-[#7683a6]">{s.label}</span>
            <span
              className="text-3xl font-bold"
              style={{ color: s.negative ? '#ef4444' : '#ecf2ff' }}
            >
              {s.value}
            </span>
            <span className="text-xs text-[#7683a6]">Since {s.since}</span>
          </div>
        ))}
      </div>

      {/* Scroll hint — below the stat cards */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-0.5 pointer-events-none select-none">
        <span className="text-[11px] tracking-widest uppercase text-[#7683a6]">Scroll to explore</span>
        <ChevronDown className="size-4 text-[#7683a6] animate-bounce" />
      </div>
    </section>
  );
}
