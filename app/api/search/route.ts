import { NextRequest, NextResponse } from 'next/server';
import { startSearchJob } from '@/lib/scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, maxResults = 50 } = body;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }

    const parsedMaxResults = Math.min(Math.max(1, parseInt(maxResults, 10) || 50), 200);

    const jobId = startSearchJob({
      keyword: keyword.trim(),
      maxResults: parsedMaxResults,
    });

    return NextResponse.json({
      jobId,
      message: 'Search job started',
    });
  } catch (error) {
    console.error('Error starting search:', error);
    return NextResponse.json(
      { error: 'Failed to start search' },
      { status: 500 }
    );
  }
}
