'use client';

import type { SentimentRow } from '@/types';

const ISO3_TO_NAME: Record<string, string> = {
  USA: 'United States', GBR: 'United Kingdom', RUS: 'Russia', DEU: 'Germany',
  FRA: 'France', IND: 'India', CHN: 'China', BRA: 'Brazil', ARG: 'Argentina',
  AUS: 'Australia', CAN: 'Canada', UKR: 'Ukraine', POL: 'Poland', ITA: 'Italy',
  ESP: 'Spain', MEX: 'Mexico', KOR: 'South Korea', JPN: 'Japan', TUR: 'Turkey',
  HUN: 'Hungary', SRB: 'Serbia', BLR: 'Belarus', KAZ: 'Kazakhstan',
  NLD: 'Netherlands', SWE: 'Sweden', NOR: 'Norway', CHE: 'Switzerland',
  IRN: 'Iran', SAU: 'Saudi Arabia', ZAF: 'S. Africa', NGA: 'Nigeria',
  BOL: 'Bolivia', VEN: 'Venezuela', CUB: 'Cuba', SGP: 'Singapore',
  PAK: 'Pakistan', AZE: 'Azerbaijan',
};

interface SidebarProps {
  countries: SentimentRow[];
  currentDateIndex: number;
  dark: boolean;
  panelOpen: boolean;
  onPanelToggle: () => void;
}

function Stat({ label, value, dark }: { label: string; value: string | number; dark: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: dark ? '#475569' : '#6b7280' }}>
        {label}
      </span>
      <span className="text-[26px] font-bold leading-none tracking-tight text-white">
        {value}
      </span>
    </div>
  );
}

export default function Sidebar({ countries, currentDateIndex, dark, panelOpen, onPanelToggle }: SidebarProps) {
  const covered = countries.filter(c => c.article_count > 0);
  const totalArticles = covered.reduce((s, c) => s + c.article_count, 0);
  const leading = [...covered].sort((a, b) => b.article_count - a.article_count)[0];
  const leadingName = leading ? (ISO3_TO_NAME[leading.country_iso3] ?? leading.country_iso3) : '—';
  const pace = Math.round(totalArticles / Math.max(1, currentDateIndex + 1));

  const border = dark ? '#1e293b' : '#27272a';

  return (
    <aside
      className="w-[272px] shrink-0 flex flex-col overflow-hidden mode-transition relative"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Topic */}
      <div className="px-6 pt-7 pb-5">
        <p className="text-sm" style={{ color: dark ? '#475569' : '#71717a' }}>News about</p>
        <h2 className="text-white text-[22px] font-bold leading-tight mt-0.5 tracking-tight">
          the Sputnik vaccine
        </h2>
        {/* Search */}
        <div className="mt-3.5 flex items-center gap-2 rounded-md px-3 py-2.5 transition-colors"
          style={{ border: `1px solid ${border}`, background: dark ? '#0d1117' : '#09090b' }}>
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#52525b" strokeWidth={2}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <span className="text-xs" style={{ color: '#52525b' }}>or search for other topics…</span>
        </div>
      </div>

      <div className="h-px mx-6" style={{ background: border }} />

      {/* Stats */}
      <div className="px-6 py-6 flex flex-col gap-6">
        <Stat label="Countries reached" value={covered.length} dark={dark} />
        <Stat label="Leading country" value={leadingName} dark={dark} />
        <Stat label="Pace (articles / day)" value={pace.toLocaleString()} dark={dark} />
        <Stat label="Total articles" value={totalArticles.toLocaleString()} dark={dark} />
      </div>

      <div className="h-px mx-6" style={{ background: border }} />

      {/* Route mini-viz */}
      <div className="px-6 pt-4 pb-1">
        <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: dark ? '#475569' : '#52525b' }}>Route</span>
      </div>
      <div className="px-6 pb-4">
        <svg width="100%" height="68" viewBox="0 0 220 68">
          {covered.slice(0, 14).map((c, i) => {
            const cols = 7;
            const x  = 14 + (i % cols) * 28;
            const y  = 14 + Math.floor(i / cols) * 32;
            const nx = 14 + ((i + 1) % cols) * 28;
            const ny = 14 + Math.floor((i + 1) / cols) * 32;
            return (
              <g key={c.country_iso3}>
                <line x1={x} y1={y} x2={nx} y2={ny} stroke="#C97432" strokeWidth="0.8" opacity="0.5"/>
                <circle cx={x} cy={y} r={i === 0 ? 3.5 : 2}
                  fill={i === 0 ? '#4ade80' : '#C97432'} opacity={i === 0 ? 1 : 0.7}/>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex-1" />

      {/* Panel toggle + CTA */}
      <div className="px-6 pb-6 flex flex-col items-center gap-1" style={{ color: '#52525b' }}>
        <span className="italic text-sm">what else?</span>
        <svg width="12" height="7" viewBox="0 0 12 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 1l5 5 5-5"/>
        </svg>
      </div>

      {/* Panel toggle arrow — right edge */}
      <button
        onClick={onPanelToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-12 flex items-center justify-center rounded-l-sm transition-colors z-10"
        style={{ background: dark ? '#1e293b' : '#27272a', color: '#71717a' }}
        title={panelOpen ? 'Close panel' : 'Open details'}
      >
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d={panelOpen ? 'M6 1L1 6l5 5' : 'M1 1l5 5-5 5'} />
        </svg>
      </button>
    </aside>
  );
}
