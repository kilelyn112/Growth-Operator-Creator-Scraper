import { NextRequest, NextResponse } from 'next/server';
import { getJob, getFunnelsByJobId, getFunnelsWithEmailByJobId } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;

    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const funnels = getFunnelsByJobId(jobId);
    const funnelsWithEmail = getFunnelsWithEmailByJobId(jobId);

    // Count by platform
    const clickfunnelsCount = funnels.filter(f => f.platform === 'clickfunnels').length;
    const gohighlevelCount = funnels.filter(f => f.platform === 'gohighlevel').length;
    const otherCount = funnels.filter(f => f.platform === 'other').length;

    // Average quality score
    const avgQuality = funnels.length > 0
      ? Math.round(funnels.reduce((sum, f) => sum + f.quality_score, 0) / funnels.length)
      : 0;

    return NextResponse.json({
      job: {
        id: job.id,
        niche: job.keyword,
        status: job.status,
        progress: job.progress,
        total: job.total,
        error: job.error,
      },
      funnels,
      summary: {
        total: funnels.length,
        withEmail: funnelsWithEmail.length,
        clickfunnels: clickfunnelsCount,
        gohighlevel: gohighlevelCount,
        other: otherCount,
        avgQuality,
      },
    });
  } catch (error) {
    console.error('Error fetching funnel job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}
