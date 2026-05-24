'use client';

interface TimelineProps {
  dates: string[];
  currentDate: string;
  onChange: (date: string) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  events?: Record<string, string>;
  dark: boolean;
}

function fmt(d: string) {
  if (!d) return '';
  return new Date(d + 'T00:00:00')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    .toLowerCase();
}

export default function Timeline({ dates, currentDate, onChange, isPlaying, onPlayPause, events = {}, dark }: TimelineProps) {
  const idx = Math.max(0, dates.indexOf(currentDate));
  const pct = dates.length > 1 ? (idx / (dates.length - 1)) * 100 : 0;

  const eventTicks = Object.keys(events)
    .map(d => { const i = dates.indexOf(d); return i < 0 ? null : { pct: (i / (dates.length - 1)) * 100, label: events[d] }; })
    .filter(Boolean) as { pct: number; label: string }[];

  const trackFill  = dark ? '#e2e8f0' : '#1c1917';
  const trackEmpty = dark ? '#334155' : '#d6d3cd';
  const bubbleBg   = dark ? '#1e293b' : '#ffffff';
  const bubbleBorder = dark ? '#334155' : '#e5e7eb';
  const bubbleText = dark ? '#cbd5e1' : '#374151';

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Play / Pause */}
      <button
        onClick={onPlayPause}
        className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 shadow-md transition-all hover:scale-105 active:scale-95"
        style={{ background: dark ? '#1e293b' : '#18181b', color: '#ffffff' }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <rect x="0" y="0" width="3" height="12" rx="1"/>
            <rect x="7" y="0" width="3" height="12" rx="1"/>
          </svg>
        ) : (
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <path d="M0 0L10 6L0 12Z"/>
          </svg>
        )}
      </button>

      {/* Track area */}
      <div className="relative flex-1 flex items-center" style={{ paddingTop: 30 }}>
        {/* Date bubble */}
        <div
          className="absolute text-xs rounded px-2 py-0.5 shadow-sm pointer-events-none whitespace-nowrap border transition-all duration-150"
          style={{ left: `${pct}%`, top: 0, transform: 'translateX(-50%)', background: bubbleBg, color: bubbleText, borderColor: bubbleBorder }}
        >
          {fmt(currentDate)}
        </div>

        {/* Event ticks */}
        {eventTicks.map((ev, i) => (
          <div key={i} title={ev.label}
            className="absolute bottom-4 w-px h-3 opacity-40 pointer-events-none"
            style={{ left: `${ev.pct}%`, background: dark ? '#64748b' : '#78716c' }}
          />
        ))}

        <input
          type="range"
          min={0}
          max={dates.length - 1}
          value={idx}
          onChange={e => onChange(dates[Number(e.target.value)])}
          className="w-full cursor-pointer"
          style={{ background: `linear-gradient(to right, ${trackFill} 0%, ${trackFill} ${pct}%, ${trackEmpty} ${pct}%, ${trackEmpty} 100%)` }}
        />
      </div>
    </div>
  );
}
