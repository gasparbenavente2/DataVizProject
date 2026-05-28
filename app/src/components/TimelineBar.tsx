'use client';

import { useRef, useMemo } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TimelineBarProps {
  events: { id: number; label: string }[];
  highlightedEra: number;
  carouselProgress?: number; // 0=overview, 1=era0, 2=era1… — drives continuous opacity in events mode
  isPlaying: boolean;
  dates: string[];
  eraIndices: number[];      // start index in dates[] for each era
  currentDateIdx: number;
  showScrubber: boolean;
  onPlay: () => void;
  onDateChange: (idx: number) => void;
  onEventClick: (id: number) => void;
}

const ERA_DISPLAY = [
  { start: '2015', end: '2018', name: 'the Visionary',        subtitle: 'tesla & spaceX era' },
  { start: '2018', end: '2020', name: 'the Fractures',        subtitle: 'Autopilot death → covid' },
  { start: '2020', end: '2022', name: 'the Recovery',         subtitle: 'innovation achievements' },
  { start: '2022', end: '2023', name: 'the Second Downfall',  subtitle: 'buying twitter' },
  { start: '2023', end: '2026', name: 'the Political Figure', subtitle: 'the US election' },
];

export default function TimelineBar({
  events,
  highlightedEra,
  carouselProgress,
  isPlaying,
  dates,
  eraIndices,
  currentDateIdx,
  showScrubber,
  onPlay,
  onDateChange,
  onEventClick,
}: TimelineBarProps) {
  const total = dates.length;
  const currentDate = dates[currentDateIdx] ?? '';
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Proportional widths of each era based on actual date counts
  const eraProportions = useMemo(() => {
    if (eraIndices.length < ERA_DISPLAY.length || total === 0) {
      // Fallback: equal proportions
      return ERA_DISPLAY.map((_, i) => ({ start: i / ERA_DISPLAY.length, width: 1 / ERA_DISPLAY.length }));
    }
    return eraIndices.map((startIdx, i) => {
      const endIdx = i < eraIndices.length - 1 ? eraIndices[i + 1] : total;
      return { start: startIdx / total, width: (endIdx - startIdx) / total };
    });
  }, [eraIndices, total]);

  // Custom slider drag — uses pointer capture so drag works outside the element
  const getIdxFromClientX = (clientX: number) => {
    const el = sliderRef.current;
    if (!el) return currentDateIdx;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * Math.max(0, total - 1));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onDateChange(getIdxFromClientX(e.clientX));
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    onDateChange(getIdxFromClientX(e.clientX));
  };
  const handlePointerUp = () => { isDraggingRef.current = false; };

  const thumbPct = total > 1 ? (currentDateIdx / (total - 1)) * 100 : 0;

  return (
    <div
      style={{
        background: 'rgba(0,2,26,0.92)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(118,131,166,0.15)',
      }}
    >
      {showScrubber ? (
        /* ── Map mode: play + era buttons + cone SVG + proportional slider ── */
        <div className="flex items-start gap-4 px-8 pt-3 pb-3">
          {/* Play button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onPlay}
            className="shrink-0 text-[#ecf2ff] hover:bg-white/10 mt-1"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>

          {/* Era buttons + cones + slider stacked */}
          <div className="flex-1 flex flex-col">

            {/* Equal-width era buttons (top of cone) */}
            <div className="flex">
              {ERA_DISPLAY.map((era, i) => {
                const isActive = highlightedEra === i;
                return (
                  <button
                    key={i}
                    onClick={() => onEventClick(i)}
                    className="flex-1 flex flex-col items-start gap-0.5 text-left relative transition-opacity hover:opacity-90 pb-1"
                    style={{ opacity: isActive ? 1 : 0.35 }}
                  >
                    <span className="text-[10px]" style={{ color: '#7683a6' }}>{era.start} – {era.end}</span>
                    <span className="text-sm font-bold leading-tight" style={{ color: '#ecf2ff' }}>{era.name}</span>
                    <span className="text-[10px]" style={{ color: '#7683a6' }}>{era.subtitle}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: '#ecf2ff' }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* SVG cones: fan from equal-width buttons → proportional slider segments */}
            <svg
              viewBox="0 0 1000 28"
              preserveAspectRatio="none"
              style={{ width: '100%', height: '28px', display: 'block' }}
            >
              {eraProportions.map((prop, i) => {
                const btnL = (i / ERA_DISPLAY.length) * 1000;
                const btnR = ((i + 1) / ERA_DISPLAY.length) * 1000;
                const propL = prop.start * 1000;
                const propR = (prop.start + prop.width) * 1000;
                const isActive = highlightedEra === i;
                return (
                  <polygon
                    key={i}
                    points={`${btnL},0 ${btnR},0 ${propR},28 ${propL},28`}
                    fill={isActive ? 'rgba(236,242,255,0.1)' : 'rgba(118,131,166,0.05)'}
                    stroke="rgba(118,131,166,0.2)"
                    strokeWidth="0.5"
                  />
                );
              })}
            </svg>

            {/* Proportional custom slider */}
            <div
              ref={sliderRef}
              className="relative rounded-full overflow-hidden cursor-pointer select-none"
              style={{ height: '6px' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* Era band fills */}
              {eraProportions.map((prop, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${prop.start * 100}%`,
                    width: `${prop.width * 100}%`,
                    height: '100%',
                    background: highlightedEra === i
                      ? 'rgba(236,242,255,0.3)'
                      : 'rgba(118,131,166,0.12)',
                    borderRight: i < ERA_DISPLAY.length - 1 ? '1px solid rgba(118,131,166,0.25)' : 'none',
                  }}
                />
              ))}
              {/* Thumb */}
              <div
                style={{
                  position: 'absolute',
                  left: `${thumbPct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ecf2ff',
                  boxShadow: '0 0 6px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              />
            </div>
          </div>

          {/* Current date */}
          <span
            className="shrink-0 text-xs font-mono tabular-nums mt-1"
            style={{ color: '#7683a6', minWidth: '80px', textAlign: 'right' }}
          >
            {currentDate || '—'}
          </span>
        </div>
      ) : (
        /* ── Events mode: era buttons only, no scrubber ── */
        <div className="flex items-stretch px-8 pt-3 pb-3">
          {events.map((event, i) => {
            const era = ERA_DISPLAY[event.id];
            // Continuous opacity: interpolate based on fractional scroll position
            // carouselProgress: 0=overview, 1=era0, 2=era1…  → eraFrac = progress-1
            const opacity = carouselProgress !== undefined
              ? (() => {
                  const eraFrac = carouselProgress - 1;
                  if (eraFrac <= -0.5) return 0.35; // overview
                  return Math.max(0.35, 1 - Math.abs(event.id - eraFrac));
                })()
              : (highlightedEra === event.id ? 1 : 0.35);
            const isActive = highlightedEra === event.id;
            return (
              <div key={event.id} className="flex items-stretch flex-1">
                {i > 0 && (
                  <div
                    className="shrink-0 self-stretch mr-4"
                    style={{ width: '1px', background: 'rgba(118,131,166,0.2)' }}
                  />
                )}
                <button
                  onClick={() => onEventClick(event.id)}
                  className="flex flex-col items-start gap-0.5 text-left relative flex-1 hover:opacity-90"
                  style={{ opacity }}
                >
                  {isActive && (
                    <span className="absolute -top-[13px] left-0 right-0 h-[2px]" style={{ background: '#ecf2ff' }} />
                  )}
                  <span className="text-[10px]" style={{ color: '#7683a6' }}>{era.start} – {era.end}</span>
                  <span className="text-sm font-bold leading-tight" style={{ color: '#ecf2ff' }}>{era.name}</span>
                  <span className="text-[10px]" style={{ color: '#7683a6' }}>{era.subtitle}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
