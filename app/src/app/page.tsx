'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SectionLanding from '@/components/SectionLanding';
import SectionMap from '@/components/SectionMap';
import SectionEvents from '@/components/SectionEvents';
import SectionSummary from '@/components/SectionSummary';
import TimelineBar from '@/components/TimelineBar';
import WorldMap from '@/components/WorldMap';
import type { SentimentRow } from '@/types';

const TOPIC_FILE = 'elon-musk-2015-01-2026-05';
const SMOOTH_WINDOW = 30; // days to average for smoother map transitions

const EVENTS = [
  { id: 0, label: 'EVENT1' },
  { id: 1, label: 'EVENT2' },
  { id: 2, label: 'EVENT3' },
  { id: 3, label: 'EVENT4' },
  { id: 4, label: 'EVENT5' },
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

  const showScrubberRef = useRef(true);
  const didResetToOverviewRef = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const darkOverlayRef = useRef<HTMLDivElement>(null);
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

    // Detect jump (non-sequential) and clear the rolling buffer if so
    const prev = prevDateIdxRef.current;
    if (prev !== -1 && Math.abs(currentDateIdx - prev) > 2) {
      countriesBufferRef.current = [];
    }
    prevDateIdxRef.current = currentDateIdx;

    fetch(`/api/sentiment?date=${currentDate}&file=${TOPIC_FILE}`)
      .then((r) => r.json())
      .then((data: { countries: SentimentRow[] }) => {
        const buf = [...countriesBufferRef.current, data.countries];
        if (buf.length > SMOOTH_WINDOW) buf.shift();
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
    playIntervalRef.current = setInterval(() => {
      setCurrentDateIdx((prev) => {
        if (prev >= datesRef.current.length - 1) { setIsPlaying(false); return prev; }
        return prev + 1;
      });
    }, 200);
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, dates.length]);

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
          onPlay={handlePlay}
          onDateChange={handleDateChange}
          onEventClick={handleEventChange}
        />
      </div>
    </>
  );
}
