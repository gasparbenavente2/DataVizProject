'use client';

import type { SentimentRow } from '@/types';
import type { AnalysisMode } from './WorldMap';

const ISO3_TO_NAME: Record<string, string> = {
  USA: 'United States', GBR: 'United Kingdom', RUS: 'Russia', DEU: 'Germany',
  FRA: 'France', IND: 'India', CHN: 'China', BRA: 'Brazil', ARG: 'Argentina',
  AUS: 'Australia', CAN: 'Canada', UKR: 'Ukraine', POL: 'Poland', ITA: 'Italy',
  ESP: 'Spain', MEX: 'Mexico', KOR: 'South Korea', JPN: 'Japan', TUR: 'Turkey',
  ISR: 'Israel', HUN: 'Hungary', SRB: 'Serbia', BLR: 'Belarus', KAZ: 'Kazakhstan',
  NLD: 'Netherlands', BEL: 'Belgium', SWE: 'Sweden', NOR: 'Norway', DNK: 'Denmark',
  FIN: 'Finland', CHE: 'Switzerland', AUT: 'Austria', CZE: 'Czechia', PRT: 'Portugal',
  GRC: 'Greece', ROU: 'Romania', IRN: 'Iran', SAU: 'Saudi Arabia', ARE: 'UAE',
  ZAF: 'South Africa', NGA: 'Nigeria', KEN: 'Kenya', EGY: 'Egypt', BOL: 'Bolivia',
  VEN: 'Venezuela', CUB: 'Cuba', CHL: 'Chile', PER: 'Peru', COL: 'Colombia',
  SGP: 'Singapore', MYS: 'Malaysia', IDN: 'Indonesia', PHL: 'Philippines',
  VNM: 'Vietnam', PAK: 'Pakistan', BGD: 'Bangladesh', AZE: 'Azerbaijan', ARM: 'Armenia',
};

function sentimentHex(tone: number | null): string {
  if (tone === null) return '#94a3b8';
  if (tone >= 0) {
    const r = Math.round(60 + (1 - Math.min(1, tone / 5)) * (221 - 60));
    const g = Math.round(150 + (1 - Math.min(1, tone / 5)) * (217 - 150));
    const b = Math.round(80 + (1 - Math.min(1, tone / 5)) * (208 - 80));
    return `rgb(${r},${g},${b})`;
  } else {
    const r = Math.round(160 + (1 - Math.min(1, -tone / 5)) * (221 - 160));
    const g = Math.round(30 + (1 - Math.min(1, -tone / 5)) * (217 - 30));
    const b = Math.round(30 + (1 - Math.min(1, -tone / 5)) * (208 - 30));
    return `rgb(${r},${g},${b})`;
  }
}

interface BubbleChartProps {
  countries: SentimentRow[];
  dark: boolean;
}

function BubbleChart({ countries, dark }: BubbleChartProps) {
  const W = 220, H = 130, PAD = 20;
  const plotW = W - PAD * 2, plotH = H - PAD * 2;

  const covered = countries.filter(c => c.article_count > 0 && c.avg_tone !== null);
  if (covered.length === 0) return null;

  const maxCount = Math.max(...covered.map(c => c.article_count));
  const toneRange = [-6, 6];

  const cx = (tone: number) => PAD + ((tone - toneRange[0]) / (toneRange[1] - toneRange[0])) * plotW;
  const cy = (count: number) => H - PAD - (count / maxCount) * plotH;
  const r  = (count: number) => Math.max(3, Math.sqrt(count / maxCount) * 12);

  const axisColor = dark ? '#334155' : '#d1d5db';
  const textColor = dark ? '#64748b' : '#9ca3af';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="mt-1">
      {/* Axes */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={axisColor} strokeWidth="0.8" />
      <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke={axisColor} strokeWidth="0.5" strokeDasharray="3 3" />
      {/* Labels */}
      <text x={PAD} y={H - 5} fontSize="7" fill={textColor}>negative</text>
      <text x={W - PAD} y={H - 5} fontSize="7" fill={textColor} textAnchor="end">positive</text>
      {/* Bubbles */}
      {covered.map(c => (
        <circle
          key={c.country_iso3}
          cx={cx(c.avg_tone!)}
          cy={cy(c.article_count)}
          r={r(c.article_count)}
          fill={sentimentHex(c.avg_tone)}
          fillOpacity={0.75}
          stroke={dark ? '#0f172a' : '#ffffff'}
          strokeWidth="0.5"
        >
          <title>{ISO3_TO_NAME[c.country_iso3] ?? c.country_iso3}: tone {c.avg_tone?.toFixed(2)}, {c.article_count} articles</title>
        </circle>
      ))}
    </svg>
  );
}

interface DetailPanelProps {
  countries: SentimentRow[];
  mode: AnalysisMode;
  dark: boolean;
}

export default function DetailPanel({ countries, mode, dark }: DetailPanelProps) {
  const covered = countries.filter(c => c.article_count > 0);

  // Top 8 — by count for amount, by |tone| for sentiment
  const ranked = [...covered]
    .sort((a, b) => mode === 'amount'
      ? b.article_count - a.article_count
      : Math.abs(b.avg_tone ?? 0) - Math.abs(a.avg_tone ?? 0))
    .slice(0, 8);

  const maxCount = Math.max(1, ...ranked.map(c => c.article_count));

  const panelBg  = dark ? 'var(--panel-bg)' : 'var(--panel-bg)';
  const textMain = dark ? '#e2e8f0' : '#1e293b';
  const textSub  = dark ? '#64748b'  : '#94a3b8';
  const divider  = dark ? '#1e293b'  : '#cbd5e1';

  return (
    <div
      className="flex flex-col overflow-y-auto mode-transition"
      style={{ background: panelBg, width: 220, borderLeft: `1px solid ${divider}` }}
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C97432' }}>
          {mode === 'sentiment' ? 'Sentiment' : 'Coverage'}
        </span>
        <div className="h-px mt-2" style={{ background: divider }} />
      </div>

      {/* Ranked list */}
      <div className="px-4 pb-3 flex flex-col gap-1.5">
        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: textSub }}>
          Top countries {mode === 'amount' ? 'by articles' : 'by tone'}
        </p>
        {ranked.map((c, i) => {
          const barPct = mode === 'amount'
            ? (c.article_count / maxCount) * 100
            : (Math.min(1, Math.abs(c.avg_tone ?? 0) / 5)) * 100;
          const barColor = mode === 'amount' ? '#C97432' : sentimentHex(c.avg_tone);

          return (
            <div key={c.country_iso3} className="flex items-center gap-2">
              <span className="text-[10px] w-3 text-right shrink-0" style={{ color: textSub }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[11px] truncate font-medium" style={{ color: textMain }}>
                    {ISO3_TO_NAME[c.country_iso3] ?? c.country_iso3}
                  </span>
                  <span className="text-[10px] shrink-0 ml-1" style={{ color: textSub }}>
                    {mode === 'amount' ? c.article_count : c.avg_tone?.toFixed(1)}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: dark ? '#1e293b' : '#e2e8f0' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, background: barColor }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-px mx-4" style={{ background: divider }} />

      {/* Bubble chart */}
      <div className="px-3 pt-3 pb-4">
        <p className="text-[10px] uppercase tracking-wider mb-1 px-1" style={{ color: textSub }}>
          Tone vs. volume
        </p>
        <BubbleChart countries={covered} dark={dark} />
      </div>
    </div>
  );
}
