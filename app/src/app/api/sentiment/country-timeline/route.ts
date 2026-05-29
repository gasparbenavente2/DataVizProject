import type { NextRequest } from 'next/server';
import { getCountryTimeline } from '@/lib/queries';

const FILE_RE = /^[a-zA-Z0-9-]+$/;
const ISO_RE = /^[A-Za-z]{3}$/;

// GET /api/sentiment/country-timeline?file=<name>&iso=<ISO3>
// Returns: { timeline: { date, avg_tone, article_count }[] }
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const file = searchParams.get('file');
  const iso = searchParams.get('iso');

  if (!file || !FILE_RE.test(file)) {
    return Response.json({ error: 'Missing or invalid ?file' }, { status: 400 });
  }
  if (!iso || !ISO_RE.test(iso)) {
    return Response.json({ error: 'Missing or invalid ?iso' }, { status: 400 });
  }

  const timeline = await getCountryTimeline(file, iso.toUpperCase());
  return Response.json({ timeline });
}
