'use client';

import { useEffect, useState } from 'react';

export interface TopicItem {
  name: string;
  count: number;
}
export interface TopicBucket {
  orgs?: TopicItem[];
  themes?: TopicItem[];
}
export interface TopicsData {
  eras: string[];
  global: Record<string, TopicBucket>;            // keys: 'all', '0'..'4'
  byCountry: Record<string, Record<string, TopicBucket>>;
}

// Precomputed per-era / per-country topic rollup (see data-pipeline/src/topics.py).
// Cached module-wide so it's fetched once per session.
let cache: TopicsData | null = null;
let inflight: Promise<TopicsData | null> | null = null;

function load(file: string): Promise<TopicsData | null> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  inflight = fetch(`${basePath}/data/${file}-topics.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d: TopicsData | null) => {
      cache = d;
      return d;
    })
    .catch(() => null);
  return inflight;
}

export function useTopics(file: string): TopicsData | null {
  const [topics, setTopics] = useState<TopicsData | null>(cache);
  useEffect(() => {
    load(file).then(setTopics);
  }, [file]);
  return topics;
}

// Scale a count-ranked topic list into word-cloud { text, size } entries.
// sqrt keeps the long tail readable despite very skewed counts.
export function topicsToWords(
  items: TopicItem[] | undefined,
  max = 18,
): { text: string; size: number }[] {
  if (!items || items.length === 0) return [];
  const top = items.slice(0, max);
  const maxCount = top[0].count || 1;
  return top.map((t) => ({
    text: t.name,
    size: Math.round(10 + Math.sqrt(t.count / maxCount) * 22),
  }));
}

// Blend concepts (themes) and entities (orgs) into one cloud, weighted toward
// concepts. Each list is normalized to its own max so both read at sensible
// sizes despite themes having far higher raw counts than orgs.
export function bucketToWords(
  bucket: TopicBucket | null,
  opts: { themes?: number; orgs?: number; total?: number } = {},
): { text: string; size: number }[] {
  if (!bucket) return [];
  const nThemes = opts.themes ?? 18;
  const nOrgs = opts.orgs ?? 8;
  const total = opts.total ?? 26;
  const themes = (bucket.themes ?? []).slice(0, nThemes);
  const orgs = (bucket.orgs ?? []).slice(0, nOrgs);
  const tMax = themes[0]?.count || 1;
  const oMax = orgs[0]?.count || 1;
  const sizeOf = (rel: number, weight: number) => Math.round(10 + Math.sqrt(rel) * 22 * weight);

  const seen = new Set<string>();
  const out: { text: string; size: number }[] = [];
  const push = (name: string, size: number) => {
    const k = name.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ text: name, size });
  };
  themes.forEach((t) => push(t.name, sizeOf(t.count / tMax, 1)));   // concepts: primary
  orgs.forEach((o) => push(o.name, sizeOf(o.count / oMax, 0.9)));   // companies: secondary
  return out.sort((a, b) => b.size - a.size).slice(0, total);
}
