import type { NextRequest } from 'next/server';
import { getEraCountries } from '@/lib/queries';

const FILE_RE = /^[a-zA-Z0-9-]+$/;

// GET /api/sentiment/era-countries?file=<name>
// Returns: { eras: { [eraId]: { country_iso3, avg_tone, article_count }[] } }
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const file = searchParams.get('file');

  if (!file || !FILE_RE.test(file)) {
    return Response.json({ error: 'Missing or invalid ?file' }, { status: 400 });
  }

  const eras = await getEraCountries(file);
  return Response.json({ eras });
}
