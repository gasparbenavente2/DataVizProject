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
import { sentimentColor } from '@/lib/sentimentColor';

export type AnalysisMode = 'sentiment' | 'amount';

// Dark navy map style — no external tiles
const LIGHT_STYLE = {
  version: 8 as const,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#050c1e' },
    },
  ],
};

// Amount: dark navy (0) → muted blue (max)
function amountColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return '#0d1b2e';
  const ratio = Math.min(1, count / maxCount);
  const r = Math.round(13 + ratio * (118 - 13));
  const g = Math.round(27 + ratio * (131 - 27));
  const b = Math.round(46 + ratio * (166 - 46));
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
    return ['match', ['get', 'ADM0_A3'], 'XXX', '#0d1b2e', '#0d1b2e'] as unknown as ExpressionSpecification;
  }
  return ['match', ['get', 'ADM0_A3'], ...pairs, '#0d1b2e'] as unknown as ExpressionSpecification;
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
      'line-color': 'rgba(118,131,166,0.2)',
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
          className="absolute pointer-events-none z-10 rounded-xl px-5 py-4 shadow-2xl"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y - 14,
            background: '#060e28',
            border: '1px solid rgba(118,131,166,0.2)',
            transform:
              typeof window !== 'undefined' && tooltip.x > window.innerWidth * 0.65
                ? 'translateX(-110%)'
                : undefined,
          }}
        >
          <div className="text-xl font-bold" style={{ color: '#ecf2ff' }}>
            {tooltip.name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#7683a6' }}>
            sentiment score · {tooltip.tone !== null ? new Date().getFullYear() : '—'}
          </div>
          {mode === 'sentiment' && (
            <div
              className="text-4xl font-bold mt-1"
              style={{
                color:
                  tooltip.tone === null || tooltip.count === 0
                    ? '#7683a6'
                    : tooltip.tone < 0
                    ? '#ef4444'
                    : '#22c55e',
              }}
            >
              {tooltip.tone !== null && tooltip.count > 0
                ? tooltip.tone.toFixed(2)
                : '—'}
            </div>
          )}
          {mode === 'amount' && (
            <div className="text-3xl font-bold mt-1" style={{ color: '#ecf2ff' }}>
              {tooltip.count > 0 ? tooltip.count.toLocaleString() : '—'}
              {tooltip.count > 0 && (
                <span className="text-sm font-normal ml-1" style={{ color: '#7683a6' }}>
                  articles
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
