'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';

interface Event {
  id: number;
  label: string;
}

interface SectionEventsProps {
  events: Event[];
  activeEvent: number; // -1 = overview, 0-4 = era
  onEventChange: (id: number) => void;
  eraIndices?: number[];
  totalDates?: number;
}

const ERAS = [
  {
    dateRange: '2015 – 2018',
    name: 'the Visionary',
    subtitle: 'tesla & spaceX era',
    startTone: '+1.2',
    endTone: '+4.7',
    description:
      'Descriptive text about what happened in this era, could be made by our AI system (based on articles). Very short, but concise. Should not be more than a small paragraph like this, but enough to give context to someone who knows nothing about him.',
    topics: [
      { name: 'SpaceX reusable rockets', delta: '+3.3', positive: true },
      { name: 'Tesla model X launch', delta: '+2.1', positive: true },
      { name: 'Tesla production delays', delta: '−0.4', positive: false },
    ],
    articlesPerDay: '1,029',
  },
  {
    dateRange: '2018 – 2020',
    name: 'the Fractures',
    subtitle: 'Autopilot death → covid',
    startTone: '−0.3',
    endTone: '−1.8',
    description:
      'Coverage shifted as the fatal Autopilot crash and SEC charges dominated headlines, followed by pandemic-era commentary on his controversial factory reopening.',
    topics: [
      { name: 'Autopilot fatality investigation', delta: '−2.1', positive: false },
      { name: 'SEC fraud charges', delta: '−1.7', positive: false },
      { name: 'COVID factory defiance', delta: '−0.9', positive: false },
    ],
    articlesPerDay: '874',
  },
  {
    dateRange: '2020 – 2022',
    name: 'the Recovery',
    subtitle: 'innovation achievements',
    startTone: '−1.2',
    endTone: '+2.1',
    description:
      "SpaceX milestones and Tesla's entry into the S&P 500 drove a wave of positive coverage, partially reversing earlier sentiment losses.",
    topics: [
      { name: 'Crew Dragon launch', delta: '+3.4', positive: true },
      { name: 'Tesla S&P 500 inclusion', delta: '+2.8', positive: true },
      { name: '"Pedo guy" lawsuit', delta: '−0.6', positive: false },
    ],
    articlesPerDay: '1,156',
  },
  {
    dateRange: '2022 – 2023',
    name: 'the Second Downfall',
    subtitle: 'buying twitter',
    startTone: '+0.5',
    endTone: '−2.3',
    description:
      'The Twitter acquisition and subsequent mass layoffs triggered a sharp global sentiment decline, particularly in Western media.',
    topics: [
      { name: 'Twitter acquisition & layoffs', delta: '−3.1', positive: false },
      { name: 'Blue checkmark controversy', delta: '−1.4', positive: false },
      { name: 'SpaceX Starship test', delta: '+1.2', positive: true },
    ],
    articlesPerDay: '2,034',
  },
  {
    dateRange: '2023 – 2026',
    name: 'the Political Figure',
    subtitle: 'the US election',
    startTone: '−1.8',
    endTone: '−1.1',
    description:
      'Growing political alignment with Trump and DOGE leadership created deeply polarised coverage, with sharp divergence between countries.',
    topics: [
      { name: 'Trump win / DOGE appointment', delta: '+2.2', positive: true },
      { name: 'Nazi salute controversy', delta: '−3.6', positive: false },
      { name: 'UK riots statements', delta: '−1.9', positive: false },
    ],
    articlesPerDay: '1,847',
  },
];

// Carousel positions: 0 = overview, 1-5 = eras 0-4
// activeEvent: -1 = overview, 0-4 = era index
function activeToCarouselPos(activeEvent: number): number {
  return activeEvent === -1 ? 0 : activeEvent + 1;
}

export default function SectionEvents({ events, activeEvent, onEventChange, eraIndices, totalDates }: SectionEventsProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Scroll carousel when activeEvent changes externally
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const targetPos = activeToCarouselPos(activeEvent);
    const target = targetPos * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 2) return;
    el.scrollTo({ left: target, behavior: 'smooth' });
  }, [activeEvent]);

  // Report back when user manually swipes
  const handleScroll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const el = carouselRef.current;
      if (!el) return;
      const pos = Math.round(el.scrollLeft / el.clientWidth);
      // pos 0 = overview, pos 1-5 = eras 0-4
      onEventChange(pos === 0 ? -1 : pos - 1);
    }, 80);
  }, [onEventChange]);

  return (
    <section
      id="section-events"
      className="relative h-screen snap-start shrink-0 flex flex-col overflow-hidden"
      style={{ background: '#00021a', paddingTop: '60px' }}
    >
      {/* Carousel — no era nav here; TimelineBar (fixed) serves as the nav */}
      <div
        ref={carouselRef}
        className="flex-1 flex overflow-x-scroll snap-x snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >

        {/* ── Slide 0: Overview / full-screen, cone flows from TimelineBar ── */}
        <article
          className="snap-start shrink-0 h-full flex flex-col"
          style={{ width: '100vw' }}
        >
          {/* Cone SVG — flush to top, extends equal-width TimelineBar sections into proportional bands */}
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

          {/* Chart area — full width, proportional era bands */}
          <div className="flex-1 relative overflow-hidden">
            {eraProportions.map((prop, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${prop.start * 100}%`,
                  width: `${prop.width * 100}%`,
                  height: '100%',
                  background: i % 2 === 0
                    ? 'rgba(118,131,166,0.04)'
                    : 'rgba(118,131,166,0.015)',
                  borderRight: i < ERAS.length - 1
                    ? '1px solid rgba(118,131,166,0.15)'
                    : 'none',
                }}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 pointer-events-none">
              <span className="text-sm" style={{ color: 'rgba(118,131,166,0.5)' }}>
                sentiment timeline chart
              </span>
              <span className="text-xs" style={{ color: 'rgba(118,131,166,0.3)' }}>
                era bands + key events
              </span>
            </div>
          </div>

          {/* Title — bottom of screen */}
          <div className="px-8 py-5 shrink-0" style={{ borderTop: '1px solid rgba(118,131,166,0.1)' }}>
            <h2 className="text-2xl font-bold" style={{ color: '#ecf2ff' }}>
              Elon Musk · Global Sentiment Overview
            </h2>
            <p className="text-sm mt-0.5" style={{ color: '#7683a6' }}>
              2015 – 2026 · 45-day moving average of volume-weighted tone
            </p>
          </div>
        </article>

        {/* ── Slides 1-5: Era detail cards ── */}
        {ERAS.map((era, i) => (
          <article
            key={i}
            className="snap-start shrink-0 h-full flex flex-col px-8 py-6 gap-4"
            style={{ width: '100vw' }}
          >
            {/* Main content card */}
            <div
              className="flex-1 flex flex-col rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(118,131,166,0.2)', background: '#060e28' }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between px-8 pt-7 pb-5">
                <div className="flex flex-col gap-1">
                  <span className="text-sm" style={{ color: '#7683a6' }}>{era.dateRange}</span>
                  <h2 className="text-4xl font-bold leading-tight" style={{ color: '#ecf2ff' }}>
                    {era.name}
                  </h2>
                  <span className="text-sm" style={{ color: '#7683a6' }}>{era.subtitle}</span>
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                  style={{
                    border: '1px solid rgba(118,131,166,0.3)',
                    color: '#ecf2ff',
                    background: 'rgba(118,131,166,0.08)',
                  }}
                >
                  Globally <span style={{ color: '#7683a6' }}>▾</span>
                </button>
              </div>

              {/* 3-column content */}
              <div
                className="flex-1 grid px-8 pb-6 gap-6 min-h-0"
                style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
              >
                {/* Left: description + mini trend */}
                <div className="flex flex-col gap-4 min-h-0">
                  <div>
                    <p className="text-sm font-medium mb-2" style={{ color: '#ecf2ff' }}>
                      What happened?
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: '#7683a6' }}>
                      {era.description}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-4 flex flex-col gap-2 mt-auto"
                    style={{ border: '1px solid rgba(118,131,166,0.15)', background: 'rgba(118,131,166,0.05)' }}
                  >
                    <div className="flex justify-between text-xs" style={{ color: '#7683a6' }}>
                      <span>Start of era</span>
                      <span>End of era</span>
                    </div>
                    <div
                      className="h-14 flex items-center justify-center rounded"
                      style={{ background: 'rgba(118,131,166,0.06)' }}
                    >
                      <span className="text-xs" style={{ color: 'rgba(118,131,166,0.35)' }}>chart</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xl font-bold" style={{ color: '#22c55e' }}>{era.startTone}</span>
                      <span className="text-xl font-bold" style={{ color: '#22c55e' }}>{era.endTone}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: word cloud */}
                <div className="flex flex-col gap-3 min-h-0">
                  <p className="text-sm font-medium" style={{ color: '#ecf2ff' }}>
                    Most used words to describe him
                  </p>
                  <div
                    className="flex-1 rounded-xl flex items-center justify-center"
                    style={{ border: '1px solid rgba(118,131,166,0.15)', background: 'rgba(118,131,166,0.05)' }}
                  >
                    <span className="text-xs" style={{ color: 'rgba(118,131,166,0.35)' }}>word cloud</span>
                  </div>
                </div>

                {/* Right: topics */}
                <div className="flex flex-col gap-3 min-h-0">
                  <p className="text-sm font-medium" style={{ color: '#ecf2ff' }}>
                    Topics followed by biggest sentiment change:
                  </p>
                  <div className="flex flex-col gap-3">
                    {era.topics.map((topic, ti) => (
                      <div key={ti} className="flex items-center justify-between gap-3">
                        <span className="text-sm" style={{ color: '#ecf2ff' }}>{topic.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <div
                            className="h-1 rounded-full"
                            style={{
                              width: '80px',
                              background: topic.positive ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
                            }}
                          />
                          <span
                            className="text-sm font-medium w-10 text-right"
                            style={{ color: topic.positive ? '#22c55e' : '#ef4444' }}
                          >
                            {topic.delta}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs mt-auto text-right italic" style={{ color: '#7683a6' }}>
                    in total: {era.articlesPerDay} articles per day
                  </p>
                </div>
              </div>
            </div>

            {/* Country sentiment strip */}
            <div
              className="shrink-0 rounded-xl px-6 py-4"
              style={{ border: '1px solid rgba(118,131,166,0.15)', background: 'rgba(6,14,40,0.8)' }}
            >
              <div className="flex items-center gap-3 justify-between h-16">
                <div className="flex flex-col shrink-0">
                  <span className="text-xl font-bold" style={{ color: '#ef4444' }}>−2.3</span>
                  <span className="text-xs" style={{ color: '#7683a6' }}>Most negative</span>
                </div>
                <div className="flex-1 flex items-center justify-center gap-2">
                  {['#7f1d1d','#b91c1c','#ef4444','#fca5a5','#bbf7d0','#4ade80','#22c55e','#15803d'].map((c, ci) => (
                    <div
                      key={ci}
                      className="rounded"
                      style={{ width: '70px', height: '50px', background: c, opacity: 0.8 }}
                    />
                  ))}
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xl font-bold" style={{ color: '#22c55e' }}>+8.3</span>
                  <span className="text-xs" style={{ color: '#7683a6' }}>Most positive</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
