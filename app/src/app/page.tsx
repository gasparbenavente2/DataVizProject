'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import WorldMap, { type AnalysisMode } from '@/components/WorldMap';
import Timeline from '@/components/Timeline';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Legend from '@/components/Legend';
import type { SentimentRow, DatesResponse, SentimentResponse } from '@/types';

// ─── Topics ──────────────────────────────────────────────────────────────────
// To add a new topic: copy a parquet to app/public/data/, then add an entry here.
// `file` = parquet filename without the .parquet extension.

interface TopicConfig {
  file: string;
  label: string;
  events: Record<string, string>;
}

const TOPICS: TopicConfig[] = [
  {
    file: 'sputnik-vaccine-covid-2020-08-2021-08',
    label: 'COVID Vaccines',
    events: {
      '2020-08-11': 'Russia registers Sputnik V',
      '2020-11-11': 'Phase 3 results in The Lancet',
      '2021-02-02': 'Lancet: 91.6% efficacy confirmed',
      '2021-02-19': 'EU begins Sputnik evaluation',
      '2021-03-05': 'Hungary: first EU country to vaccinate',
      '2021-06-15': 'WHO emergency use listing review',
      '2021-09-01': 'UN General Assembly — Russia pushes adoption',
    },
  },
  {
    file: 'ukraine-war-2022-02-2022-03',
    label: 'Ukraine War',
    events: {
      '2022-02-24': 'Russia invades Ukraine',
      '2022-03-01': 'Russia targets Kyiv',
    },
  },
  {
    file: 'elon-musk-2015-01-2026-05',
    label: 'Elon Musk',
    events: {
      '2018-08-07': 'Take Tesla private tweet ($420)',
      '2020-05-01': 'Defies COVID lockdown orders',
      '2021-01-28': 'Dogecoin pump via tweets',
      '2022-04-14': 'Offer to buy Twitter',
      '2022-10-27': 'Twitter acquisition closes',
      '2024-11-05': 'Trump election — political alignment',
    },
  },
  {
    file: 'brexit-2015-01-2026-05',
    label: 'Brexit',
    events: {
      '2016-06-23': 'Brexit referendum — Leave wins',
      '2017-03-29': 'Article 50 triggered',
      '2019-01-15': 'Parliament rejects deal (432–202)',
      '2019-07-24': 'Boris Johnson becomes PM',
      '2020-01-31': 'UK formally leaves EU',
      '2020-12-24': 'Trade deal agreed',
    },
  },
];

// ─── App ─────────────────────────────────────────────────────────────────────

const PLAY_INTERVAL_MS = 800;

export default function Home() {
  const [topic, setTopic] = useState<TopicConfig>(TOPICS[0]);
  const [dates, setDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [countries, setCountries] = useState<SentimentRow[]>([]);
  const [mode, setMode] = useState<AnalysisMode>('sentiment');
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load available dates whenever the topic changes
  useEffect(() => {
    setLoading(true);
    setIsPlaying(false);
    setDates([]);
    setCurrentDate('');
    setCountries([]);
    fetch(`/api/sentiment/dates?file=${topic.file}`)
      .then((r) => r.json())
      .then((data: DatesResponse) => {
        setDates(data.dates);
        if (data.dates.length > 0) setCurrentDate(data.dates[0]);
        setLoading(false);
      })
      .catch(console.error);
  }, [topic.file]);

  // Fetch country sentiment whenever the date changes
  useEffect(() => {
    if (!currentDate) return;
    fetch(`/api/sentiment?date=${currentDate}&file=${topic.file}`)
      .then((r) => r.json())
      .then((data: SentimentResponse) => setCountries(data.countries))
      .catch(console.error);
  }, [currentDate, topic.file]);

  const advanceDate = useCallback(() => {
    setCurrentDate((prev) => {
      const idx = dates.indexOf(prev);
      if (idx < 0 || idx >= dates.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return dates[idx + 1];
    });
  }, [dates]);

  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(advanceDate, PLAY_INTERVAL_MS);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [isPlaying, advanceDate]);

  const currentDateIndex = dates.indexOf(currentDate);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-100 font-sans">
      <Header
        mode={mode}
        onModeChange={setMode}
        title={topic.label}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          countries={countries}
          totalDates={dates.length}
          currentDateIndex={currentDateIndex}
        />

        <main className="relative flex-1 flex flex-col overflow-hidden bg-[#ede9e1]">
          {/* Topic selector */}
          <div className="absolute top-3 right-4 z-10 flex gap-2">
            {TOPICS.map((t) => (
              <button
                key={t.file}
                onClick={() => setTopic(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  t.file === topic.file
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white/80 text-stone-600 border-stone-300 hover:bg-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 relative">
            <WorldMap countries={countries} mode={mode} />
          </div>

          <div className="shrink-0 bg-[#ede9e1]/95 px-8 pb-5 pt-8">
            {dates.length > 0 && (
              <Timeline
                dates={dates}
                currentDate={currentDate}
                onChange={(d) => { setIsPlaying(false); setCurrentDate(d); }}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying((p) => !p)}
                events={topic.events}
              />
            )}
          </div>

          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm border border-stone-200 rounded-full px-4 py-1.5 shadow-sm">
            <Legend mode={mode} />
          </div>
        </main>
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-100">
          <div className="text-stone-500 text-sm animate-pulse">Loading data…</div>
        </div>
      )}
    </div>
  );
}
