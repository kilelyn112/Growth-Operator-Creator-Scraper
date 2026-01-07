import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/db';
import { continueSearchJob } from '@/lib/scraper';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { maxResults = 50 } = body;

    // Get the existing job
    const job = await getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Only allow continuing completed jobs
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only continue completed jobs' },
        { status: 400 }
      );
    }

    console.log(`[API] Continuing job ${jobId} for keyword "${job.keyword}" on ${job.platform}`);

    // Continue the search
    continueSearchJob(jobId, job.keyword, maxResults, job.platform);

    return NextResponse.json({
      message: 'Search continuation started',
      jobId,
    });
  } catch (error) {
    console.error('Error continuing search:', error);
    return NextResponse.json(
      { error: 'Failed to continue search' },
      { status: 500 }
    );
  }
}
