'use client';

import { useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Event {
  id: number;
  label: string;
}

interface SectionEventsProps {
  events: Event[];
  activeEvent: number;
  onEventChange: (id: number) => void;
}

const EVENT_COPY = [
  { title: 'EVENT_1_TITLE', desc: 'EVENT_1_DESC — placeholder description.', stat1: 'EVENT_1_STAT1', stat2: 'EVENT_1_STAT2' },
  { title: 'EVENT_2_TITLE', desc: 'EVENT_2_DESC — placeholder description.', stat1: 'EVENT_2_STAT1', stat2: 'EVENT_2_STAT2' },
  { title: 'EVENT_3_TITLE', desc: 'EVENT_3_DESC — placeholder description.', stat1: 'EVENT_3_STAT1', stat2: 'EVENT_3_STAT2' },
  { title: 'EVENT_4_TITLE', desc: 'EVENT_4_DESC — placeholder description.', stat1: 'EVENT_4_STAT1', stat2: 'EVENT_4_STAT2' },
  { title: 'EVENT_5_TITLE', desc: 'EVENT_5_DESC — placeholder description.', stat1: 'EVENT_5_STAT1', stat2: 'EVENT_5_STAT2' },
];

export default function SectionEvents({ events, activeEvent, onEventChange }: SectionEventsProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When activeEvent changes from outside (timeline click, dot click, arrow),
  // programmatically scroll to the right slide.
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const target = activeEvent * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) < 2) return; // already there
    el.scrollTo({ left: target, behavior: 'smooth' });
  }, [activeEvent]);

  // When the user drags/swipes, debounce and report the settled index up.
  const handleScroll = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const el = carouselRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      onEventChange(idx);
    }, 80);
  }, [onEventChange]);

  const prev = () => onEventChange(Math.max(0, activeEvent - 1));
  const next = () => onEventChange(Math.min(events.length - 1, activeEvent + 1));

  return (
    <section
      id="section-events"
      className="relative h-screen snap-start shrink-0 flex flex-col pt-14 bg-[#0d0d0d] overflow-hidden"
    >
      {/*
        Native horizontal scroll + CSS snap.
        The user can drag/swipe left-right; the browser snaps to the nearest slide.
        Arrows and dots call scrollTo, which also snaps.
      */}
      <div
        ref={carouselRef}
        className="flex-1 flex overflow-x-scroll snap-x snap-mandatory no-scrollbar"
        onScroll={handleScroll}
      >
        {events.map((event, i) => {
          const copy = EVENT_COPY[i];
          return (
            <article
              key={event.id}
              className="snap-start shrink-0 h-full flex"
              style={{ width: '100vw' }}
            >
              {/* Left: text */}
              <div className="w-1/2 flex flex-col justify-center px-16 py-12">
                <span className="text-xs tracking-widest text-[#C97432] uppercase mb-4">
                  {event.label}
                </span>
                <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                  {copy.title}
                </h2>
                <p className="text-neutral-400 text-base leading-relaxed mb-8 max-w-md">
                  {copy.desc}
                </p>
                <div className="space-y-2 border-t border-white/10 pt-6">
                  <p className="text-sm text-neutral-500">{copy.stat1}</p>
                  <p className="text-sm text-neutral-500">{copy.stat2}</p>
                </div>
              </div>

              {/* Right: chart placeholder */}
              <div className="w-1/2 flex items-center justify-center px-12">
                <div className="w-full h-72 bg-neutral-800/60 rounded-xl border border-white/5 flex items-center justify-center">
                  <span className="text-neutral-600 text-sm font-mono">CHART_{i + 1}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Dot navigation */}
      <div className="shrink-0 flex justify-center gap-2 py-3">
        {events.map((_, i) => (
          <button
            key={i}
            onClick={() => onEventChange(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              activeEvent === i ? 'bg-[#C97432]' : 'bg-neutral-600 hover:bg-neutral-400'
            }`}
            aria-label={`Go to event ${i + 1}`}
          />
        ))}
      </div>

      {/* Arrows — positioned relative to section, sit above the scrollable area */}
      <Button
        variant="ghost" size="icon"
        onClick={prev}
        disabled={activeEvent === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 disabled:opacity-20 z-10"
        aria-label="Previous event"
      >
        <ChevronLeft className="size-6" />
      </Button>
      <Button
        variant="ghost" size="icon"
        onClick={next}
        disabled={activeEvent === events.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 disabled:opacity-20 z-10"
        aria-label="Next event"
      >
        <ChevronRight className="size-6" />
      </Button>
    </section>
  );
}
