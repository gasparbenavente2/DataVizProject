import type { NextRequest } from 'next/server';
import { getAvailableDates } from '@/lib/queries';
import type { DatesResponse } from '@/types';

const FILE_RE = /^[a-z0-9-]+$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const file = searchParams.get('file');

  if (!file || !FILE_RE.test(file)) {
    return Response.json({ error: 'Missing or invalid ?file' }, { status: 400 });
  }

  const dates = await getAvailableDates(file);
  const body: DatesResponse = { dates };
  return Response.json(body);
}
