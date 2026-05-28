'use client';

import { useState, useEffect } from 'react';

interface OpinionChanger {
  iso: string;
  early: number;
  late: number;
  delta: number;
  direction: string;
}

interface PosNegCountry {
  iso: string;
  tone: number;
  articles: number;
}

interface SummaryData {
  opinion_changers: OpinionChanger[];
  pos_neg: {
    most_positive: PosNegCountry[];
    most_negative: PosNegCountry[];
  };
  headline: {
    total_articles: number;
    countries: number;
    avg_tone: number;
    date_range: string;
  };
}

const CARDS = [
  {
    id: 0,
    title: 'Which countries changed their opinion the most?',
    detail: 'changers',
  },
  {
    id: 1,
    title: 'Most used word per country',
    detail: null,
  },
  {
    id: 2,
    title: 'Most negative VS most positive countries',
    detail: 'posneg',
  },
  {
    id: 3,
    title: 'Articles overview',
    detail: 'articles',
  },
];

const ARTICLES = [
  {
    source: 'Indonesian Times',
    date: '24. May 2026',
    iso: 'IDN',
    sentiment: '38% negative',
    negative: true,
    headline: "Musk's SpaceX Reveals its Finances for the First Time",
  },
  {
    source: 'News of the SunShineCoast',
    date: '24. May 2017',
    iso: 'AUS',
    sentiment: '89% positive',
    negative: false,
    headline: "Musk's Tesla project expected to cut gas use in half by 2020",
  },
];

export default function SectionSummary() {
  const [selected, setSelected] = useState(0);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${basePath}/data/elon-musk-summary.json`)
      .then((r) => r.json())
      .then((d: SummaryData) => setSummary(d))
      .catch(console.error);
  }, []);

  const activeCard = CARDS[selected];

  return (
    <section
      className="h-screen snap-start shrink-0 flex flex-col justify-center px-12 py-12"
      style={{ background: '#00021a' }}
    >
      {/* Title */}
      <div className="mb-8 shrink-0">
        <h2 className="text-6xl font-bold leading-tight" style={{ color: '#ecf2ff' }}>
          The Global View
        </h2>
        <p className="text-base mt-1" style={{ color: '#7683a6' }}>
          2015 to 2026 — summarized
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left: 4 small cards in 2×2 grid */}
        <div
          className="grid gap-3"
          style={{ width: '45%', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}
        >
          {CARDS.map((card) => {
            const isSelected = selected === card.id;
            return (
              <button
                key={card.id}
                onClick={() => setSelected(card.id)}
                className="rounded-xl p-5 text-left flex items-start transition-all duration-200"
                style={{
                  border: '2px solid transparent',
                  background: isSelected
                    ? 'linear-gradient(rgba(236,242,255,0.05), rgba(236,242,255,0.05)) padding-box, linear-gradient(135deg, #ecf2ff44, #ecf2ff99) border-box'
                    : 'linear-gradient(#060e28, #060e28) padding-box, linear-gradient(135deg, #24355f, #7683a6) border-box',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <p className="text-sm leading-snug" style={{ color: isSelected ? '#ecf2ff' : '#7683a6' }}>
                  {card.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right: Detail panel */}
        <div
          className="flex-1 rounded-2xl p-8 flex flex-col min-h-0"
          style={{ border: '2px solid transparent', background: 'linear-gradient(#060e28, #060e28) padding-box, linear-gradient(135deg, #24355f, #7683a6) border-box' }}
        >
          <div
            key={selected}
            style={{ animation: 'fadeSlideIn 250ms ease forwards', flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <p className="text-sm font-medium mb-5" style={{ color: '#7683a6' }}>
              {activeCard.title}
            </p>

            {activeCard.detail === 'changers' && summary ? (
              <div className="flex-1 flex gap-8 min-h-0 overflow-auto">
                {/* Worsened */}
                <div className="flex-1">
                  <p className="text-xs font-medium mb-3" style={{ color: '#ef4444' }}>Most worsened (2015–2020 → 2021–2026)</p>
                  <div className="flex flex-col gap-2">
                    {summary.opinion_changers.filter(c => c.direction === 'worsened').slice(0, 8).map((c) => (
                      <div key={c.iso} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#ecf2ff' }}>{c.iso}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs tabular-nums" style={{ color: '#7683a6' }}>{c.early >= 0 ? '+' : ''}{c.early.toFixed(1)}</span>
                          <span className="text-xs" style={{ color: '#7683a6' }}>→</span>
                          <span className="text-xs tabular-nums" style={{ color: '#ef4444' }}>{c.late.toFixed(1)}</span>
                          <span className="text-xs font-medium tabular-nums w-12 text-right" style={{ color: '#ef4444' }}>{c.delta.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Improved */}
                <div className="flex-1">
                  <p className="text-xs font-medium mb-3" style={{ color: '#22c55e' }}>Most improved</p>
                  <div className="flex flex-col gap-2">
                    {summary.opinion_changers.filter(c => c.direction === 'improved').slice(0, 8).map((c) => (
                      <div key={c.iso} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#ecf2ff' }}>{c.iso}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs tabular-nums" style={{ color: '#7683a6' }}>{c.early.toFixed(1)}</span>
                          <span className="text-xs" style={{ color: '#7683a6' }}>→</span>
                          <span className="text-xs tabular-nums" style={{ color: c.delta > 0 ? '#22c55e' : '#ef4444' }}>{c.late.toFixed(1)}</span>
                          <span className="text-xs font-medium tabular-nums w-12 text-right" style={{ color: c.delta > 0 ? '#22c55e' : '#ef4444' }}>{c.delta > 0 ? '+' : ''}{c.delta.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeCard.detail === 'posneg' && summary ? (
              <div className="flex-1 flex gap-8 min-h-0 overflow-auto">
                {/* Most positive */}
                <div className="flex-1">
                  <p className="text-xs font-medium mb-3" style={{ color: '#22c55e' }}>Most positive countries</p>
                  <div className="flex flex-col gap-2">
                    {summary.pos_neg.most_positive.map((c, i) => (
                      <div key={c.iso} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-4 text-right" style={{ color: '#7683a6' }}>{i + 1}</span>
                          <span className="text-sm" style={{ color: '#ecf2ff' }}>{c.iso}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-1 rounded-full" style={{ width: `${Math.max(8, Math.abs(c.tone) * 40)}px`, background: c.tone >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.4)' }} />
                          <span className="text-sm font-medium tabular-nums w-12 text-right" style={{ color: c.tone >= 0 ? '#22c55e' : '#ef4444' }}>
                            {c.tone >= 0 ? '+' : ''}{c.tone.toFixed(2)}
                          </span>
                          <span className="text-xs tabular-nums" style={{ color: '#7683a6' }}>{c.articles.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Most negative */}
                <div className="flex-1">
                  <p className="text-xs font-medium mb-3" style={{ color: '#ef4444' }}>Most negative countries</p>
                  <div className="flex flex-col gap-2">
                    {summary.pos_neg.most_negative.map((c, i) => (
                      <div key={c.iso} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-4 text-right" style={{ color: '#7683a6' }}>{i + 1}</span>
                          <span className="text-sm" style={{ color: '#ecf2ff' }}>{c.iso}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-1 rounded-full" style={{ width: `${Math.max(8, Math.abs(c.tone) * 20)}px`, background: 'rgba(239,68,68,0.6)' }} />
                          <span className="text-sm font-medium tabular-nums w-12 text-right" style={{ color: '#ef4444' }}>
                            {c.tone.toFixed(2)}
                          </span>
                          <span className="text-xs tabular-nums" style={{ color: '#7683a6' }}>{c.articles.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeCard.detail === 'articles' ? (
              <div className="flex flex-col gap-6">
                {ARTICLES.map((a, i) => (
                  <div key={i}>
                    {i > 0 && <div className="mb-6" style={{ height: '1px', background: 'rgba(118,131,166,0.15)' }} />}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: '#7683a6' }}>{a.source} · {a.date}, {a.iso}</span>
                      <span className="text-sm font-medium" style={{ color: a.negative ? '#ef4444' : '#22c55e' }}>{a.sentiment}</span>
                    </div>
                    <p className="text-2xl font-bold leading-snug" style={{ color: '#ecf2ff' }}>{a.headline}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="flex-1 rounded-xl flex items-center justify-center"
                style={{ border: '1px solid rgba(118,131,166,0.12)', background: 'rgba(118,131,166,0.04)' }}
              >
                <span className="text-sm" style={{ color: 'rgba(118,131,166,0.4)' }}>visualization placeholder</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
