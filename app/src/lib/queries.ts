import path from 'path'
import { readFileSync } from 'fs'
import { parquetRead, parquetMetadata } from 'hyparquet'
import type { SentimentRow } from '@/types'

interface ParsedFile {
  dates: string[]
  byDate: Map<string, SentimentRow[]>
}

// In-process cache — parquet is parsed once per file per server lifetime
const cache = new Map<string, ParsedFile>()

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

function toAsyncBuffer(ab: ArrayBuffer) {
  return {
    byteLength: ab.byteLength,
    slice: (start: number, end: number) => Promise.resolve(ab.slice(start, end)),
  }
}

function formatDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  // date32: integer days since Unix epoch
  if (typeof d === 'number') return new Date(d * 86400000).toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

async function loadFile(file: string): Promise<ParsedFile> {
  if (cache.has(file)) return cache.get(file)!

  const filePath = path.join(process.cwd(), 'public', 'data', `${file}.parquet`)
  const ab = toArrayBuffer(readFileSync(filePath))
  const asyncBuffer = toAsyncBuffer(ab)

  // Column names come from schema (index 0 is the root element, skip it)
  const meta = parquetMetadata(ab)
  const columns = meta.schema.slice(1).map((s) => s.name)

  const byDate = new Map<string, SentimentRow[]>()

  await parquetRead({
    file: asyncBuffer,
    onComplete: (rows: unknown[][]) => {
      for (const row of rows) {
        const obj = Object.fromEntries(columns.map((name, i) => [name, row[i]]))
        const dateStr = formatDate(obj.date)
        if (!byDate.has(dateStr)) byDate.set(dateStr, [])
        byDate.get(dateStr)!.push({
          country_iso3: String(obj.country_iso3),
          avg_tone: obj.avg_tone == null ? null : Number(obj.avg_tone),
          article_count: Number(obj.article_count),
        })
      }
    },
  })

  const dates = [...byDate.keys()].sort()
  const result: ParsedFile = { dates, byDate }
  cache.set(file, result)
  return result
}

export async function getAvailableDates(file: string): Promise<string[]> {
  const { dates } = await loadFile(file)
  return dates
}

export async function getSentimentByDate(date: string, file: string): Promise<SentimentRow[]> {
  const { byDate } = await loadFile(file)
  return byDate.get(date) ?? []
}

export interface TimelineRow {
  date: string
  avg_tone: number
  article_count: number
}

// Era cut points — must match ERA_BOUNDARIES in the app/pipeline.
const ERA_BOUNDARIES = ['2015-01-01', '2018-01-01', '2020-01-01', '2022-01-01', '2023-01-01', '2027-01-01']
const N_ERAS = ERA_BOUNDARIES.length - 1

function eraOf(date: string): number {
  let e = 0
  for (let i = 0; i < N_ERAS; i++) if (date >= ERA_BOUNDARIES[i]) e = i
  return e
}

export interface CountryStat {
  country_iso3: string
  avg_tone: number
  article_count: number
}

// Per-era, per-country volume-weighted avg tone + total articles, sorted by volume.
export async function getEraCountries(file: string): Promise<Record<number, CountryStat[]>> {
  const { dates, byDate } = await loadFile(file)
  const acc: Map<string, { w: number; c: number }>[] = Array.from({ length: N_ERAS }, () => new Map())
  for (const date of dates) {
    const m = acc[eraOf(date)]
    for (const row of byDate.get(date) ?? []) {
      if (row.avg_tone === null || row.article_count === 0) continue
      const p = m.get(row.country_iso3) ?? { w: 0, c: 0 }
      p.w += row.avg_tone * row.article_count
      p.c += row.article_count
      m.set(row.country_iso3, p)
    }
  }
  const out: Record<number, CountryStat[]> = {}
  for (let e = 0; e < N_ERAS; e++) {
    out[e] = [...acc[e].entries()]
      .map(([country_iso3, { w, c }]) => ({ country_iso3, avg_tone: w / c, article_count: c }))
      .sort((a, b) => b.article_count - a.article_count)
  }
  return out
}

// Daily tone series for a single country.
export async function getCountryTimeline(file: string, iso: string): Promise<TimelineRow[]> {
  const { dates, byDate } = await loadFile(file)
  const out: TimelineRow[] = []
  for (const date of dates) {
    const row = (byDate.get(date) ?? []).find((r) => r.country_iso3 === iso)
    if (row && row.avg_tone !== null) {
      out.push({ date, avg_tone: row.avg_tone, article_count: row.article_count })
    }
  }
  return out
}

export async function getGlobalTimeline(file: string): Promise<TimelineRow[]> {
  const { dates, byDate } = await loadFile(file)
  const timeline: TimelineRow[] = []
  for (const date of dates) {
    const rows = byDate.get(date) ?? []
    let weightedSum = 0
    let totalCount = 0
    for (const row of rows) {
      if (row.avg_tone !== null && row.article_count > 0) {
        weightedSum += row.avg_tone * row.article_count
        totalCount += row.article_count
      }
    }
    if (totalCount > 0) {
      timeline.push({
        date,
        avg_tone: weightedSum / totalCount,
        article_count: totalCount,
      })
    }
  }
  return timeline
}
