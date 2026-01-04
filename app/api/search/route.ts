import { NextRequest, NextResponse } from 'next/server';
import { startSearchJob } from '@/lib/scraper';
import { Platform } from '@/lib/db';

const VALID_PLATFORMS: Platform[] = ['youtube', 'instagram', 'tiktok', 'linkedin', 'skool', 'substack'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, maxResults = 50, platform = 'youtube' } = body;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }

    // Validate platform
    const selectedPlatform = VALID_PLATFORMS.includes(platform) ? platform : 'youtube';

    const parsedMaxResults = Math.min(Math.max(1, parseInt(maxResults, 10) || 50), 200);

    const jobId = startSearchJob({
      keyword: keyword.trim(),
      maxResults: parsedMaxResults,
      platform: selectedPlatform,
    });

    return NextResponse.json({
      jobId,
      platform: selectedPlatform,
      message: `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} search job started`,
    });
  } catch (error) {
    console.error('Error starting search:', error);
    return NextResponse.json(
      { error: 'Failed to start search' },
      { status: 500 }
    );
  }
}
