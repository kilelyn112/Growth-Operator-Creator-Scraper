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
        status: job.status,
        progress: job.progress,
        total: job.total,
        error: job.error,
        createdAt: job.created_at,
      },
      creators: creators.map((c) => ({
        id: c.id,
        channelId: c.channel_id,
        channelName: c.channel_name,
        channelUrl: c.channel_url,
        subscribers: c.subscribers,
        videoCount: c.video_count,
        totalViews: c.total_views,
        qualified: c.qualified,
        qualificationReason: c.qualification_reason,
        email: c.email,
        firstName: c.first_name,
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
