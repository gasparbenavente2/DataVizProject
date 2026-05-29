'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SectionLanding from '@/components/SectionLanding';
import SectionMap from '@/components/SectionMap';
import SectionEvents from '@/components/SectionEvents';
import SectionSummary from '@/components/SectionSummary';
import TimelineBar from '@/components/TimelineBar';
import dynamic from 'next/dynamic';
import type { SentimentRow } from '@/types';
import { sentimentColor, NO_COVERAGE } from '@/lib/sentimentColor';

const WorldMap = dynamic(() => import('@/components/WorldMap'), { ssr: false });

const TOPIC_FILE = 'elon-musk-2015-01-2026-05';
// Days to average for smoother map transitions. Wider at high speed so the map
// doesn't strobe when many days fly by per tick.
const smoothWindowFor = (speed: number) => (speed >= 5 ? 300 : 45);

const EVENTS = [
  { id: 0, label: 'the Visionary' },
  { id: 1, label: 'the Fractures' },
  { id: 2, label: 'the Recovery' },
  { id: 3, label: 'the Second Downfall' },
  { id: 4, label: 'the Political Figure' },
];

const ERA_BOUNDARIES = [
  '2015-01-01',
  '2018-01-01',
  '2020-01-01',
  '2022-01-01',
  '2023-01-01',
];

function getEraFromDate(date: string): number {
  if (!date) return 0;
  let era = 0;
  for (let i = 0; i < ERA_BOUNDARIES.length; i++) {
    if (date >= ERA_BOUNDARIES[i]) era = i;
  }
  return era;
}

function getEraStartIndices(dates: string[]): number[] {
  return ERA_BOUNDARIES.map((boundary) => {
    const idx = dates.findIndex((d) => d >= boundary);
    return idx === -1 ? 0 : idx;
  });
}

// Volume-weighted average across a buffer of daily country arrays.
function computeRollingAvg(buffer: SentimentRow[][]): SentimentRow[] {
  const acc = new Map<string, { weightedToneSum: number; totalCount: number }>();
  for (const dayRows of buffer) {
    for (const row of dayRows) {
      if (row.avg_tone === null || row.article_count === 0) continue;
      const prev = acc.get(row.country_iso3) ?? { weightedToneSum: 0, totalCount: 0 };
      prev.weightedToneSum += row.avg_tone * row.article_count;
      prev.totalCount += row.article_count;
      acc.set(row.country_iso3, prev);
    }
  }
  return Array.from(acc.entries()).map(([country_iso3, { weightedToneSum, totalCount }]) => ({
    country_iso3,
    avg_tone: totalCount > 0 ? weightedToneSum / totalCount : null,
    article_count: Math.round(totalCount / buffer.length),
  }));
}

export default function Page() {
  const [dates, setDates] = useState<string[]>([]);
  const [eraIndices, setEraIndices] = useState<number[]>([]);
  const [currentDateIdx, setCurrentDateIdx] = useState(0);
  const [countries, setCountries] = useState<SentimentRow[]>([]);
  const [activeEvent, setActiveEvent] = useState<number>(-1);
  const [carouselProgress, setCarouselProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showScrubber, setShowScrubber] = useState(true);
  const [speed, setSpeed] = useState(1); // playback multiplier: 1×, 2×, 5×
  const speedRef = useRef(1);

  const showScrubberRef = useRef(true);
  const didResetToOverviewRef = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const darkOverlayRef = useRef<HTMLDivElement>(null);
  const mapHudRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eraIndicesRef = useRef<number[]>([]);
  const datesRef = useRef<string[]>([]);
  // Rolling average buffer
  const countriesBufferRef = useRef<SentimentRow[][]>([]);
  const prevDateIdxRef = useRef<number>(-1);

  const currentDate = dates[currentDateIdx] ?? '';

  const highlightedEra = useMemo(() => {
    if (showScrubber) return getEraFromDate(currentDate);
    return activeEvent;
  }, [currentDate, showScrubber, activeEvent]);

  // Volume-weighted global average tone for the current (rolling) frame.
  const avgTone = useMemo(() => {
    let weightedSum = 0;
    let total = 0;
    for (const r of countries) {
      if (r.avg_tone === null || r.article_count === 0) continue;
      weightedSum += r.avg_tone * r.article_count;
      total += r.article_count;
    }
    return total > 0 ? weightedSum / total : null;
  }, [countries]);

  useEffect(() => {
    fetch(`/api/sentiment/dates?file=${TOPIC_FILE}`)
      .then((r) => r.json())
      .then((data: { dates: string[] }) => {
        setDates(data.dates);
        datesRef.current = data.dates;
        if (data.dates.length > 0) {
          const indices = getEraStartIndices(data.dates);
          eraIndicesRef.current = indices;
          setEraIndices(indices);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!currentDate) return;

    // Detect a real jump (scrub / era click) and clear the rolling buffer if so.
    // Threshold must exceed the largest playback step (3 days at 5×) so normal
    // playback keeps accumulating the buffer instead of resetting every tick.
    const prev = prevDateIdxRef.current;
    if (prev !== -1 && Math.abs(currentDateIdx - prev) > 8) {
      countriesBufferRef.current = [];
    }
    prevDateIdxRef.current = currentDateIdx;

    fetch(`/api/sentiment?date=${currentDate}&file=${TOPIC_FILE}`)
      .then((r) => r.json())
      .then((data: { countries: SentimentRow[] }) => {
        const buf = [...countriesBufferRef.current, data.countries];
        const win = smoothWindowFor(speedRef.current);
        if (buf.length > win) buf.splice(0, buf.length - win);
        countriesBufferRef.current = buf;
        setCountries(computeRollingAvg(buf));
      })
      .catch(console.error);
  }, [currentDate, currentDateIdx]);

  useEffect(() => {
    if (!isPlaying || dates.length === 0) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }
    const step = speed >= 5 ? 3 : speed >= 2 ? 2 : 1; // advance more days at higher speeds
    playIntervalRef.current = setInterval(() => {
      setCurrentDateIdx((prev) => {
        if (prev >= datesRef.current.length - 1) { setIsPlaying(false); return prev; }
        return Math.min(datesRef.current.length - 1, prev + step);
      });
    }, 200 / speed);
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, dates.length, speed]);

  useEffect(() => {
    const scroll = mainRef.current;
    if (!scroll) return;

    const update = () => {
      const vh = scroll.clientHeight;
      const st = scroll.scrollTop;

      const overlayT = Math.max(0, Math.min(1, st / vh));
      if (mapWrapperRef.current) {
        const blurPx = (1 - overlayT) * 8;
        mapWrapperRef.current.style.filter = blurPx > 0.05 ? `blur(${blurPx}px)` : 'none';
      }
      if (darkOverlayRef.current) {
        darkOverlayRef.current.style.opacity = String((1 - overlayT) * 0.75);
      }

      const bar = timelineRef.current;
      if (!bar) return;

      if (st < vh * 0.5 || st >= vh * 2.9) {
        bar.style.opacity = '0';
        bar.style.pointerEvents = 'none';
        if (mapHudRef.current) mapHudRef.current.style.opacity = '0';
        return;
      }

      const barH = bar.offsetHeight || 60;
      const tlProgress = Math.max(0, Math.min(1, (st - vh) / vh));
      bar.style.top = `${(1 - tlProgress) * (vh - barH)}px`;

      let tlOpacity = 1;
      if (st < vh * 0.8) tlOpacity = (st - vh * 0.5) / (vh * 0.3);
      else if (st > vh * 2.6) tlOpacity = (vh * 2.9 - st) / (vh * 0.3);
      bar.style.opacity = String(Math.max(0, Math.min(1, tlOpacity)));
      bar.style.pointerEvents = 'auto';

      const wantScrubber = tlProgress < 0.8;
      // The map HUD (avg tone + legend) only makes sense while the map is in view.
      if (mapHudRef.current) {
        mapHudRef.current.style.opacity = wantScrubber
          ? String(Math.max(0, Math.min(1, tlOpacity)))
          : '0';
      }
      if (showScrubberRef.current !== wantScrubber) {
        showScrubberRef.current = wantScrubber;
        setShowScrubber(wantScrubber);
      }

      if (st >= vh * 1.9 && !didResetToOverviewRef.current) {
        didResetToOverviewRef.current = true;
        setActiveEvent(-1);
      } else if (st < vh * 1.5) {
        didResetToOverviewRef.current = false;
      }
    };

    scroll.addEventListener('scroll', update, { passive: true });
    update();
    return () => scroll.removeEventListener('scroll', update);
  }, []);

  const handlePlay = useCallback(() => setIsPlaying((p) => !p), []);

  const handleSpeedChange = useCallback((s: number) => { speedRef.current = s; setSpeed(s); }, []);

  const handleDateChange = useCallback((idx: number) => {
    setCurrentDateIdx(idx);
    setIsPlaying(false);
  }, []);

  const handleScrollProgress = useCallback((p: number) => {
    setCarouselProgress(p);
  }, []);

  const handleEventChange = useCallback((id: number) => {
    setActiveEvent(id);
    setIsPlaying(false);
    if (id === -1) return;
    const indices = eraIndicesRef.current;
    if (indices.length > 0) setCurrentDateIdx(indices[id] ?? 0);
  }, []);

  return (
    <>
      <div ref={mapWrapperRef} className="fixed inset-0 z-[1] pointer-events-none">
        <WorldMap countries={countries} mode="sentiment" />
      </div>
      <div
        ref={darkOverlayRef}
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{ opacity: 0.75, background: '#00021a' }}
      />

      {/* Map HUD: global average tone + color legend (only visible over the map) */}
      <div
        ref={mapHudRef}
        className="fixed inset-x-0 top-0 z-[40] px-8 pt-6 flex items-start justify-between opacity-0 pointer-events-none"
        style={{ transition: 'opacity 150ms ease' }}
      >
        {/* Average sentiment box, painted in its sentiment color */}
        <div
          className="rounded-xl px-5 py-3 shadow-2xl"
          style={{
            background: sentimentColor(avgTone, avgTone === null ? 0 : 1),
            border: '1px solid rgba(118,131,166,0.25)',
          }}
        >
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'rgba(236,242,255,0.7)' }}>
            Global average tone
          </div>
          <div className="text-3xl font-bold leading-tight" style={{ color: '#ecf2ff' }}>
            {avgTone === null ? '—' : `${avgTone >= 0 ? '+' : ''}${avgTone.toFixed(2)}`}
          </div>
          <div className="text-[11px]" style={{ color: 'rgba(236,242,255,0.6)' }}>
            {currentDate || '—'}
          </div>
        </div>

        {/* Color legend */}
        <div
          className="rounded-xl px-4 py-3 shadow-2xl"
          style={{ background: 'rgba(0,2,26,0.82)', border: '1px solid rgba(118,131,166,0.25)' }}
        >
          <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: '#7683a6' }}>
            Sentiment
          </div>
          <div
            className="h-2 w-44 rounded-full"
            style={{
              background: `linear-gradient(to right, ${sentimentColor(-5, 1)}, ${NO_COVERAGE}, ${sentimentColor(6, 1)})`,
            }}
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: '#7683a6' }}>
            <span>negative</span><span>0</span><span>positive</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: NO_COVERAGE, border: '1px solid rgba(118,131,166,0.3)' }} />
            <span className="text-[10px]" style={{ color: '#7683a6' }}>no coverage</span>
          </div>
        </div>
      </div>
      <main
        ref={mainRef}
        className="relative z-[3] h-screen overflow-y-scroll snap-y snap-mandatory bg-transparent"
      >
        <SectionLanding />
        <SectionMap />
        <SectionEvents
          events={EVENTS}
          activeEvent={activeEvent}
          onEventChange={handleEventChange}
          onScrollProgress={handleScrollProgress}
          eraIndices={eraIndices}
          totalDates={dates.length}
        />
        <SectionSummary />
      </main>

      <div
        ref={timelineRef}
        className="fixed left-0 right-0 z-50 opacity-0 pointer-events-none"
        style={{ top: '100vh' }}
      >
        <TimelineBar
          events={EVENTS}
          highlightedEra={highlightedEra}
          carouselProgress={carouselProgress}
          isPlaying={isPlaying}
          dates={dates}
          eraIndices={eraIndices}
          currentDateIdx={currentDateIdx}
          showScrubber={showScrubber}
          speed={speed}
          onPlay={handlePlay}
          onSpeedChange={handleSpeedChange}
          onDateChange={handleDateChange}
          onEventClick={handleEventChange}
        />
      </div>
    </>
  );
}
