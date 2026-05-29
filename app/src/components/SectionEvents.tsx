'use client';

import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface Event {
  id: number;
  label: string;
}

interface SectionEventsProps {
  events: Event[];
  activeEvent: number; // -1 = overview, 0-4 = era
  onEventChange: (id: number) => void;
  onScrollProgress?: (progress: number) => void;
  eraIndices?: number[];
  totalDates?: number;
}

interface TimelineRow {
  date: string;
  avg_tone: number;
  article_count: number;
}

const ERA_BOUNDARIES = [
  '2015-01-01',
  '2018-01-01',
  '2020-01-01',
  '2022-01-01',
  '2023-01-01',
  '2027-01-01',
];

const ERAS = [
  {
    dateRange: '2015 – 2018',
    name: 'the Visionary',
    subtitle: 'tesla & spaceX era',
    startTone: '−0.03',
    endTone: '−0.33',
    description:
      'Descriptive text about what happened in this era, could be made by our AI system (based on articles). Very short, but concise. Should not be more than a small paragraph like this, but enough to give context to someone who knows nothing about him.',
    topics: [
      { name: 'SpaceX reusable rockets', delta: '+0.2', positive: true },
      { name: 'Tesla model X launch', delta: '+0.2', positive: true },
      { name: 'Tesla production delays', delta: '−0.2', positive: false },
    ],
    articlesPerDay: '74',
    words: [
      { text: 'Tesla', size: 32 }, { text: 'SpaceX', size: 28 }, { text: 'innovation', size: 22 },
      { text: 'electric', size: 20 }, { text: 'rocket', size: 19 }, { text: 'Model X', size: 18 },
      { text: 'visionary', size: 17 }, { text: 'Mars', size: 16 }, { text: 'Falcon 9', size: 15 },
      { text: 'launch', size: 14 }, { text: 'CEO', size: 13 }, { text: 'billionaire', size: 13 },
      { text: 'Autopilot', size: 12 }, { text: 'battery', size: 12 }, { text: 'Gigafactory', size: 11 },
      { text: 'solar', size: 11 }, { text: 'disruption', size: 10 }, { text: 'production', size: 10 },
    ],
  },
  {
    dateRange: '2018 – 2020',
    name: 'the Fractures',
    subtitle: 'Autopilot death → covid',
    startTone: '+0.02',
    endTone: '−2.62',
    description:
      'Coverage shifted as the fatal Autopilot crash and SEC charges dominated headlines, followed by pandemic-era commentary on his controversial factory reopening.',
    topics: [
      { name: 'Autopilot fatality investigation', delta: '−0.9', positive: false },
      { name: 'SEC fraud charges', delta: '−0.5', positive: false },
      { name: 'COVID factory defiance', delta: '+0.2', positive: true },
    ],
    articlesPerDay: '146',
    words: [
      { text: 'SEC', size: 30 }, { text: 'fraud', size: 28 }, { text: 'Autopilot', size: 26 },
      { text: 'crash', size: 24 }, { text: 'pedo', size: 22 }, { text: 'lawsuit', size: 20 },
      { text: 'COVID', size: 19 }, { text: 'factory', size: 18 }, { text: 'erratic', size: 17 },
      { text: 'tweet', size: 16 }, { text: '$420', size: 15 }, { text: 'settlement', size: 14 },
      { text: 'private', size: 13 }, { text: 'reopen', size: 13 }, { text: 'investigation', size: 12 },
      { text: 'volatile', size: 11 }, { text: 'stock', size: 11 }, { text: 'defiance', size: 10 },
    ],
  },
  {
    dateRange: '2020 – 2022',
    name: 'the Recovery',
    subtitle: 'innovation achievements',
    startTone: '−0.04',
    endTone: '−0.81',
    description:
      "SpaceX milestones and Tesla's entry into the S&P 500 drove a wave of positive coverage, partially reversing earlier sentiment losses.",
    topics: [
      { name: 'Crew Dragon launch', delta: '+0.4', positive: true },
      { name: 'Tesla S&P 500 inclusion', delta: '+0.01', positive: true },
      { name: '"Pedo guy" lawsuit', delta: '−0.1', positive: false },
    ],
    articlesPerDay: '141',
    words: [
      { text: 'Crew Dragon', size: 30 }, { text: 'S&P 500', size: 28 }, { text: 'Bitcoin', size: 26 },
      { text: 'richest', size: 24 }, { text: 'astronauts', size: 22 }, { text: 'Starlink', size: 20 },
      { text: 'crypto', size: 19 }, { text: 'Dogecoin', size: 18 }, { text: 'trillion', size: 17 },
      { text: 'wealth', size: 16 }, { text: 'SNL', size: 15 }, { text: 'memes', size: 14 },
      { text: 'market cap', size: 13 }, { text: 'Space', size: 13 }, { text: 'NASA', size: 12 },
      { text: 'valuation', size: 11 }, { text: 'Neuralink', size: 11 }, { text: 'influence', size: 10 },
    ],
  },
  {
    dateRange: '2022 – 2023',
    name: 'the Second Downfall',
    subtitle: 'buying twitter',
    startTone: '−0.60',
    endTone: '−2.15',
    description:
      'The Twitter acquisition and subsequent mass layoffs triggered a sharp global sentiment decline, particularly in Western media.',
    topics: [
      { name: 'Twitter acquisition & layoffs', delta: '−0.3', positive: false },
      { name: 'Blue checkmark controversy', delta: '−0.4', positive: false },
      { name: 'SpaceX Starship test', delta: '+0.04', positive: true },
    ],
    articlesPerDay: '355',
    words: [
      { text: 'Twitter', size: 34 }, { text: 'layoffs', size: 30 }, { text: 'X', size: 28 },
      { text: 'acquisition', size: 24 }, { text: 'blue check', size: 22 }, { text: '$44B', size: 20 },
      { text: 'advertisers', size: 19 }, { text: 'rebrand', size: 18 }, { text: 'chaos', size: 17 },
      { text: 'fired', size: 16 }, { text: 'moderation', size: 15 }, { text: 'hate speech', size: 14 },
      { text: 'exodus', size: 13 }, { text: 'disinformation', size: 13 }, { text: 'Threads', size: 12 },
      { text: 'free speech', size: 11 }, { text: 'Starship', size: 11 }, { text: 'implosion', size: 10 },
    ],
  },
  {
    dateRange: '2023 – 2026',
    name: 'the Political Figure',
    subtitle: 'the US election',
    startTone: '−1.80',
    endTone: '−1.25',
    description:
      'Growing political alignment with Trump and DOGE leadership created deeply polarised coverage, with sharp divergence between countries.',
    topics: [
      { name: 'Trump win / DOGE appointment', delta: '+0.1', positive: true },
      { name: 'Nazi salute controversy', delta: '+0.3', positive: true },
      { name: 'UK riots statements', delta: '−1.2', positive: false },
    ],
    articlesPerDay: '409',
    words: [
      { text: 'DOGE', size: 32 }, { text: 'Trump', size: 30 }, { text: 'politics', size: 26 },
      { text: 'government', size: 24 }, { text: 'salute', size: 22 }, { text: 'far-right', size: 20 },
      { text: 'UK riots', size: 19 }, { text: 'election', size: 18 }, { text: 'AfD', size: 17 },
      { text: 'power', size: 16 }, { text: 'oligarch', size: 15 }, { text: 'cuts', size: 14 },
      { text: 'interference', size: 13 }, { text: 'polarised', size: 13 }, { text: 'controversy', size: 12 },
      { text: 'extremism', size: 11 }, { text: 'inauguration', size: 11 }, { text: 'influence', size: 10 },
    ],
  },
];

// Alternating era bands — stronger contrast so the five eras are easy to tell apart.
const ERA_FILLS = [
  'rgba(118,131,166,0.12)',
  'rgba(118,131,166,0.02)',
  'rgba(118,131,166,0.12)',
  'rgba(118,131,166,0.02)',
  'rgba(118,131,166,0.12)',
];

// Per-era country extremes (pre-computed)
const ERA_COUNTRY_EXTREMES = [
  { neg: { iso: 'ISL', tone: -2.54 }, pos: { iso: 'ALB', tone: 1.42 } },
  { neg: { iso: 'ALB', tone: -2.42 }, pos: { iso: 'CHN', tone: 1.05 } },
  { neg: { iso: 'CYP', tone: -1.70 }, pos: { iso: 'UGA', tone: 0.69 } },
  { neg: { iso: 'UGA', tone: -2.95 }, pos: { iso: 'XKX', tone: 0.12 } },
  { neg: { iso: 'JAM', tone: -2.59 }, pos: { iso: 'VNM', tone: -0.09 } },
];

function smoothTimeline(data: TimelineRow[], window: number): TimelineRow[] {
  const result: TimelineRow[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    let toneSum = 0, weightSum = 0, countSum = 0;
    for (let j = start; j < end; j++) {
      toneSum += data[j].avg_tone * data[j].article_count;
      weightSum += data[j].article_count;
      countSum += data[j].article_count;
    }
    result.push({
      date: data[i].date,
      avg_tone: weightSum > 0 ? toneSum / weightSum : 0,
      article_count: Math.round(countSum / (end - start)),
    });
  }
  return result;
}

// Sentiment word lists (shared by WordCloud)
const NEG_WORDS = new Set(['fraud', 'crash', 'pedo', 'lawsuit', 'erratic', 'chaos', 'fired',
  'hate speech', 'exodus', 'implosion', 'disinformation', 'far-right', 'extremism',
  'salute', 'interference', 'layoffs', 'defiance', 'volatile', 'controversy', 'polarised',
  'UK riots', 'cuts', 'oligarch']);
const POS_WORDS = new Set(['innovation', 'visionary', 'launch', 'Crew Dragon', 'astronauts', 'NASA',
  'S&P 500', 'trillion', 'Space', 'Mars', 'solar', 'richest', 'Starlink', 'disruption',
  'free speech']);

// Word cloud component — spiral-placed, scattered layout
function WordCloud({ words }: { words: { text: string; size: number }[] }) {
  const r4 = (n: number) => Math.round(n * 10000) / 10000;

  // Deterministic pseudo-random via sine hash
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // Sort by size descending — largest words placed first (near center)
  const sorted = [...words]
    .map((w, i) => ({ ...w, idx: i }))
    .sort((a, b) => b.size - a.size);

  const placed = sorted.map((w, rank) => {
    const h1 = hash(w.idx * 3 + 7);
    const h2 = hash(w.idx * 5 + 13);
    const h3 = hash(w.idx * 11 + 29);

    // Golden-angle spiral from center with jitter
    // sqrt growth pushes inner words apart more aggressively
    const angle = rank * 2.3998 + h1 * 1.2;
    const maxR = 42;
    const r = Math.sqrt(rank / (sorted.length - 1 || 1)) * maxR + h2 * 4;

    let x = 50 + Math.cos(angle) * r;
    let y = 50 + Math.sin(angle) * r * 0.75;

    // Clamp within bounds (leave room for rotated text)
    x = r4(Math.max(12, Math.min(88, x)));
    y = r4(Math.max(8, Math.min(92, y)));

    // Rotate ~25% of words, but never the largest 2
    const rotate = rank > 1 && rank % 4 === 2 ? 90 : rank > 3 && rank % 6 === 5 ? -90 : 0;

    // Font size: non-linear scale so smallest words are still readable
    // size range is 10-34 → fontSize range ~9px to ~28px
    const fontSize = r4(5 + (w.size / 34) * 23);

    return { ...w, x, y, rotate, fontSize };
  });

  return (
    <div className="relative w-full h-full overflow-hidden">
      {placed.map((w) => {
        const opacity = r4(0.35 + (w.size / 34) * 0.65);
        const isNeg = NEG_WORDS.has(w.text);
        const isPos = POS_WORDS.has(w.text);
        const color = isNeg
          ? `rgba(239,68,68,${opacity})`
          : isPos
            ? `rgba(34,197,94,${opacity})`
            : `rgba(236,242,255,${opacity})`;
        return (
          <span
            key={w.idx}
            style={{
              position: 'absolute',
              left: `${w.x}%`,
              top: `${w.y}%`,
              transform: `translate(-50%, -50%) rotate(${w.rotate}deg)`,
              fontSize: `${w.fontSize}px`,
              color,
              fontWeight: w.size > 18 ? 700 : 400,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}

function EraSparkline({ timeline, eraIndex }: { timeline: TimelineRow[]; eraIndex: number }) {
  const start = ERA_BOUNDARIES[eraIndex];
  const end = ERA_BOUNDARIES[eraIndex + 1];
  const eraData = timeline.filter((d) => d.date >= start && d.date < end);

  if (eraData.length < 2) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-xs" style={{ color: 'rgba(118,131,166,0.35)' }}>no data</span>
      </div>
    );
  }

  const tones = eraData.map((d) => d.avg_tone);
  const minT = Math.min(...tones, -0.5);
  const maxT = Math.max(...tones, 0.5);
  const range = maxT - minT || 1;
  const W = 200, H = 56;
  const zeroY = ((maxT - 0) / range) * H;

  const points = eraData.map((d, i) => ({
    x: (i / (eraData.length - 1)) * W,
    y: ((maxT - d.avg_tone) / range) * H,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const posAreaPath = `M${points[0].x},${zeroY} ` + points.map((p) => `L${p.x},${Math.min(p.y, zeroY)}`).join(' ') + ` L${points[points.length - 1].x},${zeroY} Z`;
  const negAreaPath = `M${points[0].x},${zeroY} ` + points.map((p) => `L${p.x},${Math.max(p.y, zeroY)}`).join(' ') + ` L${points[points.length - 1].x},${zeroY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full">
      <path d={posAreaPath} fill="rgba(34,197,94,0.15)" />
      <path d={negAreaPath} fill="rgba(239,68,68,0.15)" />
      <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="rgba(118,131,166,0.25)" strokeWidth="0.5" />
      <path d={linePath} fill="none" stroke="#ecf2ff" strokeWidth="1.5" />
    </svg>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const tone = payload.find((p) => p.dataKey === 'avg_tone');
  const vol = payload.find((p) => p.dataKey === 'article_count');
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#060e28', border: '1px solid rgba(118,131,166,0.3)' }}>
      <div style={{ color: '#7683a6' }}>{label}</div>
      {tone && <div style={{ color: tone.value >= 0 ? '#22c55e' : '#ef4444' }}>Tone: {tone.value.toFixed(2)}</div>}
      {vol && <div style={{ color: '#ecf2ff' }}>Articles: {Math.round(vol.value).toLocaleString()}</div>}
    </div>
  );
}

function activeToCarouselPos(activeEvent: number): number {
  return activeEvent === -1 ? 0 : activeEvent + 1;
}

export default function SectionEvents({ events, activeEvent, onEventChange, onScrollProgress, eraIndices, totalDates }: SectionEventsProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);

  // Fetch static JSON instead of API route
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    fetch(`${basePath}/data/elon-musk-timeline.json`)
      .then((r) => r.json())
      .then((data: TimelineRow[]) => setTimeline(data))
      .catch(console.error);
  }, []);

  const smoothedTimeline = useMemo(() => {
    if (timeline.length === 0) return [];
    return smoothTimeline(timeline, 90);
  }, [timeline]);

  const chartData = useMemo(() => {
    if (smoothedTimeline.length === 0) return [];
    const step = Math.max(1, Math.floor(smoothedTimeline.length / 500));
    const sampled = smoothedTimeline.filter((_, i) => i % step === 0);
    // Linear-regression trend line over the sampled tone series.
    const n = sampled.length;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    sampled.forEach((d, i) => { sx += i; sy += d.avg_tone; sxy += i * d.avg_tone; sxx += i * i; });
    const denom = n * sxx - sx * sx;
    const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
    const intercept = (sy - slope * sx) / (n || 1);
    return sampled.map((d, i) => ({ ...d, trend: intercept + slope * i }));
  }, [smoothedTimeline]);

  // Where the y=0 line sits within the tone domain, as a 0..1 fraction from the top.
  // Used to split the area fill into green (above 0) / red (below 0).
  const zeroOffset = useMemo(() => {
    if (chartData.length === 0) return 0.5;
    const tones = chartData.map((d) => d.avg_tone);
    const max = Math.max(...tones, 0);
    const min = Math.min(...tones, 0);
    const range = max - min || 1;
    return max / range;
  }, [chartData]);

  const sparklineTimeline = useMemo(() => {
    if (timeline.length === 0) return [];
    return smoothTimeline(timeline, 30);
  }, [timeline]);

  const eraProportions = useMemo(() => {
    const total = totalDates ?? 0;
    if (!eraIndices || eraIndices.length < ERAS.length || total === 0) {
      return ERAS.map((_, i) => ({ start: i / ERAS.length, width: 1 / ERAS.length }));
    }
    return eraIndices.map((startIdx, i) => {
      const endIdx = i < eraIndices.length - 1 ? eraIndices[i + 1] : total;
      return { start: startIdx / total, width: (endIdx - startIdx) / total };
    });
  }, [eraIndices, totalDates]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const targetPos = activeToCarouselPos(activeEvent);
    const target = targetPos * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 2) return;
    el.scrollTo({ left: target, behavior: 'smooth' });
  }, [activeEvent]);

  const handleScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    onScrollProgress?.(el.scrollLeft / el.clientWidth);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const pos = Math.round(el.scrollLeft / el.clientWidth);
      onEventChange(pos === 0 ? -1 : pos - 1);
    }, 80);
  }, [onEventChange, onScrollProgress]);

  return (
    <section
      id="section-events"
      className="relative h-screen snap-start shrink-0 flex flex-col overflow-hidden"
      style={{ background: '#00021a', paddingTop: '60px' }}
    >
      <div
        ref={carouselRef}
        className="flex-1 flex overflow-x-scroll snap-x snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >
        {/* ── Slide 0: Overview ── */}
        <article className="snap-start shrink-0 h-full flex flex-col" style={{ width: '100vw' }}>
          <svg
            viewBox="0 0 1000 40"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '40px', display: 'block', flexShrink: 0 }}
          >
            {eraProportions.map((prop, i) => {
              const btnL = (i / ERAS.length) * 1000;
              const btnR = ((i + 1) / ERAS.length) * 1000;
              const propL = prop.start * 1000;
              const propR = (prop.start + prop.width) * 1000;
              return (
                <polygon
                  key={i}
                  points={`${btnL},0 ${btnR},0 ${propR},40 ${propL},40`}
                  fill="rgba(118,131,166,0.06)"
                  stroke="rgba(118,131,166,0.18)"
                  strokeWidth="0.5"
                />
              );
            })}
          </svg>

          <div className="flex-1 relative overflow-hidden">
            {eraProportions.map((prop, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute', left: `${prop.start * 100}%`, width: `${prop.width * 100}%`,
                  height: '100%', background: ERA_FILLS[i],
                  borderRight: i < ERAS.length - 1 ? '1px solid rgba(118,131,166,0.15)' : 'none',
                }}
              />
            ))}
            {chartData.length > 0 ? (
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <defs>
                      <linearGradient id="toneSplit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset={zeroOffset} stopColor="#22c55e" stopOpacity={0.08} />
                        <stop offset={zeroOffset} stopColor="#ef4444" stopOpacity={0.08} />
                        <stop offset="1" stopColor="#ef4444" stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#7683a6', fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: 'rgba(118,131,166,0.15)' }}
                      tickFormatter={(v: string) => v.slice(0, 4)}
                      interval={Math.floor(chartData.length / 8)}
                    />
                    <YAxis
                      tick={{ fill: '#7683a6', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v: number) => v.toFixed(1)}
                      width={35}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(118,131,166,0.3)' }} />
                    <ReferenceLine y={0} stroke="rgba(118,131,166,0.4)" strokeDasharray="4 4" />
                    {/* Volume (muted, behind everything) */}
                    <Area
                      type="monotone"
                      dataKey="article_count"
                      yAxisId={1}
                      fill="rgba(118,131,166,0.07)"
                      stroke="none"
                      isAnimationActive={false}
                    />
                    {/* Two-tone fill: green above 0, red below 0 */}
                    <Area
                      type="monotone"
                      dataKey="avg_tone"
                      baseValue={0}
                      fill="url(#toneSplit)"
                      stroke="none"
                      isAnimationActive={false}
                    />
                    {/* Long-term trend line */}
                    <Line
                      type="linear"
                      dataKey="trend"
                      stroke="#7683a6"
                      strokeWidth={1}
                      strokeDasharray="5 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_tone"
                      stroke="#ecf2ff"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <YAxis yAxisId={1} orientation="right" hide domain={[0, 'auto']} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm" style={{ color: 'rgba(118,131,166,0.5)' }}>loading timeline...</span>
              </div>
            )}
          </div>

          <div className="px-8 py-5 shrink-0" style={{ borderTop: '1px solid rgba(118,131,166,0.1)' }}>
            <h2 className="text-2xl font-bold" style={{ color: '#ecf2ff' }}>Elon Musk · Global Sentiment Overview</h2>
            <p className="text-sm mt-0.5" style={{ color: '#7683a6' }}>2015 – 2026 · 90-day moving average of volume-weighted tone</p>
          </div>
        </article>

        {/* ── Slides 1-5: Era cards ── */}
        {ERAS.map((era, i) => {
          const extremes = ERA_COUNTRY_EXTREMES[i];
          return (
            <article key={i} className="snap-start shrink-0 h-full flex flex-col px-8 py-6 gap-4" style={{ width: '100vw' }}>
              <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(118,131,166,0.2)', background: '#060e28' }}>
                <div className="flex items-start justify-between px-8 pt-7 pb-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm" style={{ color: '#7683a6' }}>{era.dateRange}</span>
                    <h2 className="text-4xl font-bold leading-tight" style={{ color: '#ecf2ff' }}>{era.name}</h2>
                    <span className="text-sm" style={{ color: '#7683a6' }}>{era.subtitle}</span>
                  </div>
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                    style={{ border: '1px solid rgba(118,131,166,0.3)', color: '#ecf2ff', background: 'rgba(118,131,166,0.08)' }}
                  >
                    Globally <span style={{ color: '#7683a6' }}>▾</span>
                  </button>
                </div>

                <div className="flex-1 grid px-8 pb-6 gap-6 min-h-0" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                  {/* Left: description + sparkline */}
                  <div className="flex flex-col gap-4 min-h-0">
                    <div>
                      <p className="text-sm font-medium mb-2" style={{ color: '#ecf2ff' }}>What happened?</p>
                      <p className="text-sm leading-relaxed" style={{ color: '#7683a6' }}>{era.description}</p>
                    </div>
                    <div className="rounded-xl p-4 flex flex-col gap-2 mt-auto" style={{ border: '1px solid rgba(118,131,166,0.15)', background: 'rgba(118,131,166,0.05)' }}>
                      <div className="flex justify-between text-xs" style={{ color: '#7683a6' }}>
                        <span>Start of era</span><span>End of era</span>
                      </div>
                      <div className="h-14 rounded overflow-hidden" style={{ background: 'rgba(118,131,166,0.06)' }}>
                        {sparklineTimeline.length > 0 ? (
                          <EraSparkline timeline={sparklineTimeline} eraIndex={i} />
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-xs" style={{ color: 'rgba(118,131,166,0.35)' }}>loading...</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xl font-bold" style={{ color: era.startTone.startsWith('−') || era.startTone.startsWith('-') ? '#ef4444' : '#22c55e' }}>{era.startTone}</span>
                        <span className="text-xl font-bold" style={{ color: era.endTone.startsWith('−') || era.endTone.startsWith('-') ? '#ef4444' : '#22c55e' }}>{era.endTone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: word cloud */}
                  <div className="flex flex-col gap-3 min-h-0">
                    <p className="text-sm font-medium" style={{ color: '#ecf2ff' }}>Most used words to describe him</p>
                    <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(118,131,166,0.15)', background: 'rgba(118,131,166,0.05)' }}>
                      <WordCloud words={era.words} />
                    </div>
                  </div>

                  {/* Right: topics */}
                  <div className="flex flex-col gap-3 min-h-0">
                    <p className="text-sm font-medium" style={{ color: '#ecf2ff' }}>Topics followed by biggest sentiment change:</p>
                    <div className="flex flex-col gap-3">
                      {era.topics.map((topic, ti) => (
                        <div key={ti} className="flex items-center justify-between gap-3">
                          <span className="text-sm" style={{ color: '#ecf2ff' }}>{topic.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="h-1 rounded-full" style={{ width: '80px', background: topic.positive ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)' }} />
                            <span className="text-sm font-medium w-10 text-right" style={{ color: topic.positive ? '#22c55e' : '#ef4444' }}>{topic.delta}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs mt-auto text-right italic" style={{ color: '#7683a6' }}>in total: {era.articlesPerDay} articles per day</p>
                  </div>
                </div>
              </div>

              {/* Country sentiment strip — real data */}
              <div className="shrink-0 rounded-xl px-6 py-4" style={{ border: '1px solid rgba(118,131,166,0.15)', background: 'rgba(6,14,40,0.8)' }}>
                <div className="flex items-center gap-3 justify-between h-16">
                  <div className="flex flex-col shrink-0">
                    <span className="text-xl font-bold" style={{ color: '#ef4444' }}>{extremes.neg.tone.toFixed(1)}</span>
                    <span className="text-xs" style={{ color: '#7683a6' }}>Most negative · {extremes.neg.iso}</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    {['#7f1d1d','#b91c1c','#ef4444','#fca5a5','#bbf7d0','#4ade80','#22c55e','#15803d'].map((c, ci) => (
                      <div key={ci} className="rounded" style={{ width: '70px', height: '50px', background: c, opacity: 0.8 }} />
                    ))}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xl font-bold" style={{ color: extremes.pos.tone >= 0 ? '#22c55e' : '#ef4444' }}>{extremes.pos.tone >= 0 ? '+' : ''}{extremes.pos.tone.toFixed(1)}</span>
                    <span className="text-xs" style={{ color: '#7683a6' }}>Most positive · {extremes.pos.iso}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
