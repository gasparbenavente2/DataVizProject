'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';
import { useCountryNames } from '@/lib/useCountryNames';
import { useTopics, bucketToWords } from '@/lib/useTopics';

const TOPIC_SLUG = 'elon-musk';

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
    detail: 'words',
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

interface Article {
  title: string;
  source: string;
  iso: string | null;
  date: string;
  tone: number | null;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SectionSummary() {
  const [selected, setSelected] = useState(0);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const names = useCountryNames();
  const topics = useTopics(TOPIC_SLUG);
  const [wordCountry, setWordCountry] = useState<string>('');
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${basePath}/data/elon-musk-articles.json`)
      .then((r) => r.json())
      .then((d: Article[]) => setArticles(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  // Top countries by overall topic volume — the picker options for "words per country".
  const wordCountries = useMemo(() => {
    if (!topics) return [];
    return Object.keys(topics.byCountry)
      .map((iso) => ({
        iso,
        n: (topics.byCountry[iso]?.all?.orgs ?? []).reduce((a, x) => a + x.count, 0),
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
      .map((x) => x.iso);
  }, [topics]);

  const activeWordCountry = wordCountry || wordCountries[0] || '';
  const wordData = useMemo(() => {
    if (!topics || !activeWordCountry) return [];
    // Same concept+company blend as the era word clouds, as a ranked bar list.
    const bucket = topics.byCountry[activeWordCountry]?.all ?? null;
    return bucketToWords(bucket, { total: 11 }).map((w) => ({ name: w.text, value: w.size }));
  }, [topics, activeWordCountry]);

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
            style={{ animation: 'fadeSlideIn 250ms ease forwards', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
          >
            <p className="text-sm font-medium mb-5" style={{ color: '#7683a6' }}>
              {activeCard.title}
            </p>

            {activeCard.detail === 'changers' && summary ? (
              (() => {
                const GRID = '1fr 2.8rem 1.1rem 2.8rem 4rem';
                const GAP = '0.6rem';
                const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
                const Header = () => (
                  <div className="grid items-center mb-2 text-[11px]" style={{ gridTemplateColumns: GRID, columnGap: GAP, color: '#7683a6' }}>
                    <span />
                    <span className="text-right">Before</span>
                    <span />
                    <span className="text-left">After</span>
                    <span className="text-right">Difference</span>
                  </div>
                );
                const Col = ({ title, color, dir }: { title: string; color: string; dir: string }) => (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-3" style={{ color }}>{title}</p>
                    <Header />
                    <div className="flex flex-col gap-2.5">
                      {summary.opinion_changers.filter((c) => c.direction === dir).slice(0, 8).map((c) => {
                        const diffColor = c.delta >= 0 ? '#22c55e' : '#ef4444';
                        return (
                          <div key={c.iso} className="grid items-center" style={{ gridTemplateColumns: GRID, columnGap: GAP }}>
                            <span className="text-sm truncate pr-2" style={{ color: '#ecf2ff' }} title={names[c.iso] ?? c.iso}>{names[c.iso] ?? c.iso}</span>
                            <span className="text-xs tabular-nums text-right" style={{ color: '#7683a6' }}>{signed(c.early)}</span>
                            <span className="text-xs text-center" style={{ color: '#7683a6' }}>→</span>
                            <span className="text-xs tabular-nums text-left" style={{ color: '#7683a6' }}>{signed(c.late)}</span>
                            <span className="text-sm font-bold tabular-nums text-right" style={{ color: diffColor }}>{signed(c.delta)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
                return (
                  <div className="flex-1 flex flex-col min-h-0">
                    <p className="text-xs mb-5 leading-relaxed" style={{ color: '#7683a6' }}>
                      Total change in average tone from the first period (2015–2020) to the last period
                      (2021–2026). Coverage trended negative overall, so the “improved” side really means
                      <span style={{ color: '#ecf2ff' }}> least worsened</span> — only 5 countries actually grew more positive.
                    </p>
                    <div className="flex-1 flex gap-8 min-h-0 overflow-auto">
                      <Col title="Largest drop in sentiment" color="#ef4444" dir="worsened" />
                      <Col title="Largest improvement in sentiment" color="#22c55e" dir="improved" />
                    </div>
                  </div>
                );
              })()
            ) : activeCard.detail === 'posneg' && summary ? (
              (() => {
                // Shared bar scale across both columns so lengths are comparable.
                const allTones = [...summary.pos_neg.most_positive, ...summary.pos_neg.most_negative].map((c) => Math.abs(c.tone));
                const maxMag = Math.max(0.5, ...allTones);
                const barW = (tone: number) => `${Math.max(6, (Math.abs(tone) / maxMag) * 70)}px`;
                const Header = () => (
                  <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wide" style={{ color: 'rgba(118,131,166,0.7)' }}>
                    <span className="w-4 text-right">#</span>
                    <span className="flex-1">Country</span>
                    <span className="w-[70px]" />
                    <span className="w-14 text-right">Tone</span>
                    <span className="w-14 text-right">Articles</span>
                  </div>
                );
                const Row = ({ c, i, color }: { c: PosNegCountry; i: number; color: string }) => (
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-4 text-right" style={{ color: '#7683a6' }}>{i + 1}</span>
                    <span className="text-sm truncate flex-1" style={{ color: '#ecf2ff' }} title={names[c.iso] ?? c.iso}>{names[c.iso] ?? c.iso}</span>
                    <div className="w-[70px] flex justify-end shrink-0">
                      <div className="h-1.5 rounded-full" style={{ width: barW(c.tone), background: color }} />
                    </div>
                    <span className="text-sm font-medium tabular-nums w-14 text-right" style={{ color }}>
                      {c.tone >= 0 ? '+' : ''}{c.tone.toFixed(2)}
                    </span>
                    <span className="text-xs tabular-nums w-14 text-right" style={{ color: '#7683a6' }}>{c.articles.toLocaleString()}</span>
                  </div>
                );
                return (
                  <div className="flex-1 flex gap-8 min-h-0 overflow-auto">
                    {/* Most positive */}
                    <div className="flex-1">
                      <p className="text-xs font-medium mb-3" style={{ color: '#22c55e' }}>Most positive countries</p>
                      <Header />
                      <div className="flex flex-col gap-2">
                        {summary.pos_neg.most_positive.map((c, i) => (
                          <Row key={c.iso} c={c} i={i} color={c.tone >= 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </div>
                    </div>
                    {/* Most negative */}
                    <div className="flex-1">
                      <p className="text-xs font-medium mb-3" style={{ color: '#ef4444' }}>Most negative countries</p>
                      <Header />
                      <div className="flex flex-col gap-2">
                        {summary.pos_neg.most_negative.map((c, i) => (
                          <Row key={c.iso} c={c} i={i} color="#ef4444" />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : activeCard.detail === 'articles' ? (
              (() => {
                const feed = articles.slice(0, 60);
                if (feed.length === 0) {
                  return (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-sm" style={{ color: 'rgba(118,131,166,0.4)' }}>loading…</span>
                    </div>
                  );
                }
                const dur = Math.max(24, feed.length * 0.9);
                const Row = ({ a }: { a: Article }) => {
                  const neg = (a.tone ?? 0) < 0;
                  return (
                    <div className="py-3" style={{ borderBottom: '1px solid rgba(118,131,166,0.12)' }}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-xs truncate" style={{ color: '#7683a6' }}>
                          {a.source}{a.iso ? ` · ${names[a.iso] ?? a.iso}` : ''} · {fmtDate(a.date)}
                        </span>
                        {a.tone !== null && (
                          <span className="text-xs font-medium tabular-nums shrink-0" style={{ color: neg ? '#ef4444' : '#22c55e' }}>
                            {a.tone >= 0 ? '+' : ''}{a.tone.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <p className="text-base font-bold leading-snug" style={{ color: '#ecf2ff' }}>{a.title}</p>
                    </div>
                  );
                };
                return (
                  <div className="flex-1 min-h-0 overflow-hidden relative">
                    <div className="news-marquee" style={{ animationDuration: `${dur}s` }}>
                      {feed.map((a, i) => <Row key={`a${i}`} a={a} />)}
                      {feed.map((a, i) => <Row key={`b${i}`} a={a} />)}
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-8" style={{ background: 'linear-gradient(#060e28, rgba(6,14,40,0))' }} />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8" style={{ background: 'linear-gradient(rgba(6,14,40,0), #060e28)' }} />
                  </div>
                );
              })()
            ) : activeCard.detail === 'words' ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Country picker */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {wordCountries.map((iso) => {
                    const on = iso === activeWordCountry;
                    return (
                      <button
                        key={iso}
                        onClick={() => setWordCountry(iso)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                        style={{
                          border: '1px solid rgba(118,131,166,0.3)',
                          background: on ? '#ecf2ff' : 'rgba(118,131,166,0.08)',
                          color: on ? '#00021a' : '#7683a6',
                        }}
                      >
                        {names[iso] ?? iso}
                      </button>
                    );
                  })}
                </div>
                {wordData.length > 0 ? (
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={wordData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={130}
                          tick={{ fill: '#ecf2ff', fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                          {wordData.map((_, idx) => (
                            <Cell key={idx} fill={`rgba(118,131,166,${0.85 - idx * 0.05})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-sm" style={{ color: 'rgba(118,131,166,0.4)' }}>loading…</span>
                  </div>
                )}
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
