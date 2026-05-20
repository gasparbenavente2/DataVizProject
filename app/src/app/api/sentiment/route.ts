import type { NextRequest } from 'next/server';
import { getSentimentByDate } from '@/lib/queries';
import type { SentimentResponse } from '@/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FILE_RE = /^[a-z0-9-]+$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');
  const file = searchParams.get('file');

  if (!date || !DATE_RE.test(date)) {
    return Response.json({ error: 'Missing or invalid ?date (expected YYYY-MM-DD)' }, { status: 400 });
  }
  if (!file || !FILE_RE.test(file)) {
    return Response.json({ error: 'Missing or invalid ?file' }, { status: 400 });
  }

  const countries = await getSentimentByDate(date, file);
  const body: SentimentResponse = { date, countries };
  return Response.json(body);
}
