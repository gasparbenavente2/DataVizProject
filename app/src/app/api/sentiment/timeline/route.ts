import type { NextRequest } from 'next/server';
import { getGlobalTimeline } from '@/lib/queries';

const FILE_RE = /^[a-zA-Z0-9-]+$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const file = searchParams.get('file');

  if (!file || !FILE_RE.test(file)) {
    return Response.json({ error: 'Missing or invalid ?file' }, { status: 400 });
  }

  const timeline = await getGlobalTimeline(file);
  return Response.json({ timeline });
}
