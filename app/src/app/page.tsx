'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SectionLanding from '@/components/SectionLanding';
import SectionMap from '@/components/SectionMap';
import SectionEvents from '@/components/SectionEvents';
import SectionSummary from '@/components/SectionSummary';
import TimelineBar from '@/components/TimelineBar';
import WorldMap from '@/components/WorldMap';
import type { SentimentRow } from '@/types';

const TOPIC_FILE = 'elon-musk-2015-01-2026-05';

const EVENTS = [
  { id: 0, label: 'EVENT1' },
  { id: 1, label: 'EVENT2' },
  { id: 2, label: 'EVENT3' },
  { id: 3, label: 'EVENT4' },
  { id: 4, label: 'EVENT5' },
];

function getEventIndices(total: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1.0].map((f) => Math.floor(f * (total - 1)));
}

export default function Page() {
  const [dates, setDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [countries, setCountries] = useState<SentimentRow[]>([]);
  const [activeEvent, setActiveEvent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);  // blur source
  const darkOverlayRef = useRef<HTMLDivElement>(null); // dark overlay
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventIndicesRef = useRef<number[]>([]);
  const datesRef = useRef<string[]>([]);

  useEffect(() => {
    fetch(`/api/sentiment/dates?file=${TOPIC_FILE}`)
      .then((r) => r.json())
      .then((data: { dates: string[] }) => {
        setDates(data.dates);
        datesRef.current = data.dates;
        if (data.dates.length > 0) {
          setCurrentDate(data.dates[0]);
          eventIndicesRef.current = getEventIndices(data.dates.length);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!currentDate) return;
    fetch(`/api/sentiment?date=${currentDate}&file=${TOPIC_FILE}`)
      .then((r) => r.json())
      .then((data: { countries: SentimentRow[] }) => setCountries(data.countries))
      .catch(console.error);
  }, [currentDate]);

  useEffect(() => {
    if (!isPlaying || dates.length === 0) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      return;
    }
    playIntervalRef.current = setInterval(() => {
      setCurrentDate((prev) => {
        const d = datesRef.current;
        const idx = d.indexOf(prev);
        if (idx === -1 || idx >= d.length - 1) { setIsPlaying(false); return prev; }
        return d[idx + 1];
      });
    }, 800);
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying, dates.length]);

  // Single scroll listener — drives blur, dark overlay, and timeline bar position.
  //
  // Section layout (each = 1 viewport height, scrollTop = n × vh at snap points):
  //   0   Section 1 Landing   — blur=8px dark=0.7 (fully on)
  //   1vh Section 2 Map       — blur=0   dark=0   (fully off → map visible)
  //   2vh Section 3 Events    — timeline at top:0
  //   3vh Section 4 Summary
  //
  // Overlay progress 0→1 as scrollTop goes 0→vh.
  // Timeline progress 0→1 as scrollTop goes 1vh→2vh (same math as before).
  useEffect(() => {
    const scroll = mainRef.current;
    if (!scroll) return;

    const update = () => {
      const vh = scroll.clientHeight;
      const st = scroll.scrollTop;

      // ── Blur + dark overlay (Section 1 → 2 transition) ──────────────────
      const overlayT = Math.max(0, Math.min(1, st / vh)); // 0 at S1, 1 at S2+
      if (mapWrapperRef.current) {
        const blurPx = (1 - overlayT) * 8;
        mapWrapperRef.current.style.filter = blurPx > 0.05 ? `blur(${blurPx}px)` : 'none';
      }
      if (darkOverlayRef.current) {
        darkOverlayRef.current.style.opacity = String((1 - overlayT) * 0.7);
      }

      // ── Timeline bar (Section 2 bottom → Section 3 top) ─────────────────
      const bar = timelineRef.current;
      if (!bar) return;

      if (st < vh * 0.5 || st >= vh * 2.5) {
        bar.style.opacity = '0';
        bar.style.pointerEvents = 'none';
        return;
      }

      const barH = bar.offsetHeight || 56;
      const tlProgress = Math.max(0, Math.min(1, (st - vh) / vh));
      bar.style.top = `${(1 - tlProgress) * (vh - barH)}px`;

      let tlOpacity = 1;
      if (st < vh * 0.8) tlOpacity = (st - vh * 0.5) / (vh * 0.3);
      else if (st > vh * 2.2) tlOpacity = (vh * 2.5 - st) / (vh * 0.3);
      bar.style.opacity = String(Math.max(0, Math.min(1, tlOpacity)));
      bar.style.pointerEvents = 'auto';
    };

    scroll.addEventListener('scroll', update, { passive: true });
    update(); // set correct initial state
    return () => scroll.removeEventListener('scroll', update);
  }, []);

  const handlePlay = useCallback(() => setIsPlaying((p) => !p), []);

  const handleEventChange = useCallback((id: number) => {
    setActiveEvent(id);
    setIsPlaying(false);
    const d = datesRef.current;
    const indices = eventIndicesRef.current;
    if (indices.length > 0 && d.length > 0) setCurrentDate(d[indices[id]] ?? d[0]);
  }, []);

  return (
    <>
      {/*
        Single map — fixed behind everything, never moves, pointer-events-none.
        z-[1] so it sits below the scroll container (z-[3]) but above the raw page bg.
      */}
      <div ref={mapWrapperRef} className="fixed inset-0 z-[1] pointer-events-none">
        <WorldMap countries={countries} mode="sentiment" />
      </div>

      {/*
        Dark overlay — same fixed layer, starts at opacity 0.7, dissolves on scroll.
        Starts fully on (inline style) so SSR matches client initial state.
      */}
      <div
        ref={darkOverlayRef}
        className="fixed inset-0 z-[2] pointer-events-none bg-black"
        style={{ opacity: 0.7 }}
      />

      {/*
        Scroll container — z-[3] so it sits above the fixed layers.
        bg-transparent so the fixed map + overlays show through Sections 1 and 2.
        Sections 3 and 4 have solid backgrounds, covering the map.
      */}
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
        />
        <SectionSummary />
      </main>

      {/* Timeline bar — fixed, position driven by scroll listener above */}
      <div
        ref={timelineRef}
        className="fixed left-0 right-0 z-50 opacity-0 pointer-events-none"
        style={{ top: '100vh' }}
      >
        <TimelineBar
          events={EVENTS}
          activeEvent={activeEvent}
          isPlaying={isPlaying}
          currentDate={currentDate}
          onPlay={handlePlay}
          onEventClick={handleEventChange}
        />
      </div>
    </>
  );
}
