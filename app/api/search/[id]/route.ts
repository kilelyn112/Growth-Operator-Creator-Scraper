import { NextRequest, NextResponse } from 'next/server';
import { getJob, getCreatorsByJobId } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = getJob(id);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const creators = getCreatorsByJobId(id);

    return NextResponse.json({
      job: {
        id: job.id,
        keyword: job.keyword,
        platform: job.platform,
        status: job.status,
        progress: job.progress,
        total: job.total,
        error: job.error,
        createdAt: job.created_at,
      },
      creators: creators.map((c) => ({
        id: c.id,
        // New multi-platform fields
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
        // Legacy YouTube fields for backward compatibility
        channelId: c.platform_id || c.channel_id,
        channelName: c.display_name || c.channel_name,
        channelUrl: c.profile_url || c.channel_url,
        subscribers: c.followers || c.subscribers,
        videoCount: c.post_count || c.video_count,
      })),
      summary: {
        total: creators.length,
        qualified: creators.filter((c) => c.qualified).length,
        withEmail: creators.filter((c) => c.email).length,
      },
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}
