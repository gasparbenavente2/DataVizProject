'use client';

import { useRef, useState, useCallback } from 'react';
import { Map as MapGL, Source, Layer } from 'react-map-gl/maplibre';
import type {
  FillLayerSpecification,
  LineLayerSpecification,
  ExpressionSpecification,
  MapLayerMouseEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { SentimentRow } from '@/types';

export type AnalysisMode = 'sentiment' | 'amount';

// Light cream map style — no external tiles
const LIGHT_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#ede9e1' },
    },
  ],
};

// Sentiment: beige (no data) → red (negative) or green (positive)
function sentimentColor(tone: number | null, count: number): string {
  if (count === 0 || tone === null) return '#ddd9d0'; // beige — no coverage
  const t = Math.max(-10, Math.min(10, tone));
  if (t < 0) {
    const r = Math.round(-t / 10);
    const r2 = Math.round(180 + r * (160 - 180));
    const g2 = Math.round(60 + r * (30 - 60));
    const b2 = Math.round(60 + r * (40 - 60));
    // negative: beige → crimson
    const ratio = Math.min(1, -t / 6);
    const r3 = Math.round(221 + ratio * (160 - 221));
    const g3 = Math.round(217 + ratio * (30 - 217));
    const b3 = Math.round(208 + ratio * (30 - 208));
    return `rgb(${r3},${g3},${b3})`;
  } else {
    // positive: beige → green
    const ratio = Math.min(1, t / 6);
    const r3 = Math.round(221 + ratio * (60 - 221));
    const g3 = Math.round(217 + ratio * (150 - 217));
    const b3 = Math.round(208 + ratio * (80 - 208));
    return `rgb(${r3},${g3},${b3})`;
  }
}

// Amount: beige (0) → deep orange (max)
function amountColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return '#ddd9d0';
  const ratio = Math.min(1, count / maxCount);
  // beige (#ddd9d0) → orange (#C97432)
  const r = Math.round(221 + ratio * (201 - 221));
  const g = Math.round(217 + ratio * (116 - 217));
  const b = Math.round(208 + ratio * (50 - 208));
  return `rgb(${r},${g},${b})`;
}

function buildFillExpression(
  countries: SentimentRow[],
  mode: AnalysisMode
): ExpressionSpecification {
  const maxCount =
    mode === 'amount'
      ? Math.max(1, ...countries.map((c) => c.article_count))
      : 1;
  const pairs: string[] = [];
  for (const row of countries) {
    const color =
      mode === 'sentiment'
        ? sentimentColor(row.avg_tone, row.article_count)
        : amountColor(row.article_count, maxCount);
    pairs.push(row.country_iso3, color);
  }
  // 'match' needs at least one input→output pair before the fallback
  if (pairs.length === 0) {
    return ['match', ['get', 'ADM0_A3'], 'XXX', '#ddd9d0', '#ddd9d0'] as unknown as ExpressionSpecification;
  }
  return ['match', ['get', 'ADM0_A3'], ...pairs, '#ddd9d0'] as unknown as ExpressionSpecification;
}

interface Tooltip {
  x: number;
  y: number;
  name: string;
  iso3: string;
  tone: number | null;
  count: number;
}

interface WorldMapProps {
  countries: SentimentRow[];
  mode: AnalysisMode;
}

export default function WorldMap({ countries, mode }: WorldMapProps) {
  const fillExpression = buildFillExpression(countries, mode);
  const sentimentMap = useRef<globalThis.Map<string, SentimentRow>>(new globalThis.Map());
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  sentimentMap.current = new globalThis.Map(countries.map((c) => [c.country_iso3, c]));

  const fillLayer: FillLayerSpecification = {
    id: 'countries-fill',
    type: 'fill',
    source: 'countries',
    paint: {
      'fill-color': fillExpression,
      'fill-opacity': 0.92,
    },
  };

  const outlineLayer: LineLayerSpecification = {
    id: 'countries-outline',
    type: 'line',
    source: 'countries',
    paint: {
      'line-color': '#c8c4bc',
      'line-width': 0.5,
    },
  };

  const hoveredId = useRef<string | number | null>(null);

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const map = e.target;
    const feature = e.features?.[0];

    if (hoveredId.current !== null) {
      map.setFeatureState(
        { source: 'countries', id: hoveredId.current },
        { hovered: false }
      );
    }

    if (feature && feature.id !== undefined) {
      hoveredId.current = feature.id;
      map.setFeatureState(
        { source: 'countries', id: feature.id },
        { hovered: true }
      );
      const iso3 = feature.properties?.ADM0_A3 as string;
      const name = feature.properties?.NAME as string;
      const row = sentimentMap.current.get(iso3);
      setTooltip({
        x: e.point.x,
        y: e.point.y,
        name: name ?? iso3,
        iso3,
        tone: row?.avg_tone ?? null,
        count: row?.article_count ?? 0,
      });
    } else {
      hoveredId.current = null;
      setTooltip(null);
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapGL
        initialViewState={{ longitude: 10, latitude: 20, zoom: 1.4 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={LIGHT_STYLE}
        renderWorldCopies={false}
        interactiveLayerIds={['countries-fill']}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <Source id="countries" type="geojson" data={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/world-110m.geojson`} generateId>
          <Layer {...fillLayer} />
          <Layer {...outlineLayer} />
        </Source>
      </MapGL>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-white/95 border border-stone-200 rounded-lg px-3 py-2 text-stone-800 text-sm shadow-lg"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
            transform:
              typeof window !== 'undefined' && tooltip.x > window.innerWidth * 0.65
                ? 'translateX(-110%)'
                : undefined,
          }}
        >
          <div className="font-semibold">{tooltip.name}</div>
          {mode === 'sentiment' ? (
            <div className="text-stone-500 text-xs mt-0.5">
              {tooltip.tone !== null && tooltip.count > 0 ? (
                <>
                  Tone:{' '}
                  <span className={tooltip.tone < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                    {tooltip.tone.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-stone-400">No coverage</span>
              )}
            </div>
          ) : (
            <div className="text-stone-500 text-xs mt-0.5">
              {tooltip.count > 0 ? (
                <span className="text-orange-600 font-medium">{tooltip.count} articles</span>
              ) : (
                <span className="text-stone-400">No coverage</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
