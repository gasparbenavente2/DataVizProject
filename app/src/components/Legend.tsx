'use client';

import type { AnalysisMode } from './WorldMap';

export default function Legend({ mode, dark }: { mode: AnalysisMode; dark: boolean }) {
  const textColor = dark ? '#94a3b8' : '#6b7280';
  const bg = dark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)';
  const border = dark ? '#1e293b' : '#e5e7eb';

  return (
    <div
      className="flex items-center gap-2 text-xs rounded-full px-4 py-1.5 shadow-sm backdrop-blur-sm border"
      style={{ background: bg, borderColor: border, color: textColor }}
    >
      {mode === 'sentiment' ? (
        <>
          <span className="font-semibold text-emerald-600">positive</span>
          <div className="h-2.5 w-32 rounded-full" style={{ background: 'linear-gradient(to right, rgb(60,150,80), rgb(221,217,208), rgb(160,30,30))' }} />
          <span className="font-semibold text-red-600">negative</span>
          <button className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity" title="Average media tone from GDELT">ⓘ</button>
        </>
      ) : (
        <>
          <span>less</span>
          <div className="h-2.5 w-32 rounded-full" style={{ background: 'linear-gradient(to right, #ddd9d0, #C97432)' }} />
          <span>more</span>
          <button className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity" title="Total articles from that country per day">ⓘ</button>
        </>
      )}
    </div>
  );
}
