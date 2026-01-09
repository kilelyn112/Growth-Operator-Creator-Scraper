import { NextRequest, NextResponse } from 'next/server';
import { startSearchJob } from '@/lib/scraper';
import { Platform, searchCreatorsByKeyword } from '@/lib/db';

const VALID_PLATFORMS: Platform[] = ['youtube', 'instagram', 'x', 'tiktok', 'linkedin', 'skool', 'substack'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, maxResults = 50, platform = 'youtube', seedAccounts } = body;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      );
    }

    // Validate platform
    const selectedPlatform = VALID_PLATFORMS.includes(platform) ? platform : 'youtube';
    console.log(`[API] Received platform: "${platform}", using: "${selectedPlatform}"`);

    const parsedMaxResults = Math.min(Math.max(1, parseInt(maxResults, 10) || 50), 200);

    // Parse seed accounts if provided (comma or newline separated)
    let parsedSeedAccounts: string[] | undefined;
    if (seedAccounts && typeof seedAccounts === 'string' && seedAccounts.trim().length > 0) {
      parsedSeedAccounts = seedAccounts
        .split(/[,\n]/)
        .map((s: string) => s.trim().replace(/^@/, ''))
        .filter((s: string) => s.length > 0);
    }

    // FLYWHEEL: Check database first for cached results
    const cachedCreators = await searchCreatorsByKeyword(selectedPlatform, keyword.trim(), parsedMaxResults);
    console.log(`[FLYWHEEL] Found ${cachedCreators.length} cached creators for "${keyword}" on ${selectedPlatform}`);

    // Start the scraping job to find NEW creators
    const jobId = startSearchJob({
      keyword: keyword.trim(),
      maxResults: parsedMaxResults,
      platform: selectedPlatform,
      seedAccounts: parsedSeedAccounts,
    });

    const seedInfo = parsedSeedAccounts && parsedSeedAccounts.length > 0
      ? ` using ${parsedSeedAccounts.length} seed accounts`
      : '';

    // Return cached results immediately along with job ID for new results
    return NextResponse.json({
      jobId,
      platform: selectedPlatform,
      message: `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} search job started${seedInfo}`,
      // FLYWHEEL: Include cached results in initial response
      cachedCreators: cachedCreators.map((c) => ({
        id: c.id,
        platform: c.platform,
        platformId: c.platform_id,
        username: c.username,
        displayName: c.display_name,
        profileUrl: c.profile_url,
        followers: c.followers,
        following: c.following,
        postCount: c.post_count,
        totalViews: c.total_views,
        engagementRate: c.engagement_rate,
        bio: c.bio,
        externalUrl: c.external_url,
        qualified: c.qualified,
        qualificationReason: c.qualification_reason,
        email: c.email,
        firstName: c.first_name,
        // Legacy YouTube fields
        channelId: c.platform_id,
        channelName: c.display_name,
        channelUrl: c.profile_url,
        subscribers: c.followers,
        videoCount: c.post_count,
        // Mark as cached
        fromCache: true,
      })),
      cachedCount: cachedCreators.length,
    });
  } catch (error) {
    console.error('Error starting search:', error);
    return NextResponse.json(
      { error: 'Failed to start search' },
      { status: 500 }
    );
  }
}
