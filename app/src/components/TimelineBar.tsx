'use client';

import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TimelineBarProps {
  events: { id: number; label: string }[];
  activeEvent: number | null;
  isPlaying: boolean;
  currentDate: string;
  onPlay: () => void;
  onEventClick: (id: number) => void;
}

export default function TimelineBar({
  events,
  activeEvent,
  isPlaying,
  currentDate,
  onPlay,
  onEventClick,
}: TimelineBarProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-black/70 backdrop-blur-sm border-t border-white/10">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onPlay}
        className="shrink-0 text-white hover:bg-white/10"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>

      <span className="text-xs text-neutral-500 font-mono shrink-0 w-24">
        {currentDate || '—'}
      </span>

      <div className="flex-1 flex items-center justify-between">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onEventClick(event.id)}
            className={cn(
              'flex flex-col items-center gap-1 text-xs transition-colors',
              activeEvent === event.id
                ? 'text-[#C97432]'
                : 'text-neutral-500 hover:text-neutral-300'
            )}
          >
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                activeEvent === event.id ? 'bg-[#C97432]' : 'bg-neutral-600'
              )}
            />
            <span>{event.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
