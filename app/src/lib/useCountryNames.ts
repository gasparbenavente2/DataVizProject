'use client';

import { useEffect, useState } from 'react';

// ISO3 → full country name, sourced from the same geojson the map renders.
// Cached module-wide so the file is only fetched/parsed once per session.
type NameMap = Record<string, string>;

let cache: NameMap | null = null;
let inflight: Promise<NameMap> | null = null;

function load(): Promise<NameMap> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  inflight = fetch(`${basePath}/world-110m.geojson`)
    .then((r) => r.json())
    .then((gj: { features?: { properties?: Record<string, unknown> }[] }) => {
      const m: NameMap = {};
      for (const f of gj.features ?? []) {
        const iso = f.properties?.ADM0_A3 as string | undefined;
        const name = f.properties?.NAME as string | undefined;
        if (iso && name) m[iso] = name;
      }
      cache = m;
      return m;
    })
    .catch(() => ({}));
  return inflight;
}

export function useCountryNames(): NameMap {
  const [names, setNames] = useState<NameMap>(cache ?? {});
  useEffect(() => {
    load().then(setNames);
  }, []);
  return names;
}
