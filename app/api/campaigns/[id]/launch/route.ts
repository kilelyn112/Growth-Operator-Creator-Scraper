import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCampaign, updateCampaignProgress, updateCampaignStatus, addCampaignResult, NicheJob } from '@/lib/campaigns';
import { startSearchJob } from '@/lib/scraper';
import { getJob, getCreatorsByJobId, Platform } from '@/lib/db';

// POST /api/campaigns/[id]/launch - start searching all niches
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await getCampaign(parseInt(id));

    if (!campaign || campaign.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status === 'running') {
      return NextResponse.json({ error: 'Campaign is already running' }, { status: 400 });
    }

    const niches = campaign.selected_niches;
    if (!niches || niches.length === 0) {
      return NextResponse.json({ error: 'No niches selected' }, { status: 400 });
    }

    // Launch search jobs for each niche (staggered to avoid API overload)
    const platform = (campaign.platform || 'youtube') as Platform;
    const maxPerNiche = campaign.max_results_per_niche || 30;

    const nicheJobs: NicheJob[] = [];

    // Launch jobs in batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < niches.length; i += BATCH_SIZE) {
      const batch = niches.slice(i, i + BATCH_SIZE);

      for (const niche of batch) {
        const jobId = startSearchJob({
          keyword: niche.searchKeyword,
          maxResults: maxPerNiche,
          platform,
        });

        nicheJobs.push({
          niche_id: niche.id,
          job_id: jobId,
          status: 'pending',
        });
      }

      // Small delay between batches to stagger API calls
      if (i + BATCH_SIZE < niches.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Update campaign
    await updateCampaignProgress(campaign.id, {
      status: 'running',
      active_jobs: nicheJobs,
      completed_niches: 0,
    });

    // Start background monitor to track progress and collect results
    monitorCampaign(campaign.id, nicheJobs, platform).catch(err => {
      console.error(`Campaign ${campaign.id} monitor error:`, err);
    });

    return NextResponse.json({
      success: true,
      message: `Launched ${nicheJobs.length} searches across ${niches.length} niches`,
      jobs: nicheJobs,
    });
  } catch (error) {
    console.error('Launch campaign error:', error);
    return NextResponse.json({ error: 'Failed to launch campaign' }, { status: 500 });
  }
}

// Background monitor that tracks all jobs and collects results
async function monitorCampaign(campaignId: number, jobs: NicheJob[], platform: Platform) {
  const POLL_INTERVAL = 5000; // 5 seconds
  const MAX_WAIT = 600000; // 10 minutes max
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT) {
    let allDone = true;
    let completedCount = 0;
    let totalCreators = 0;
    let qualifiedCreators = 0;
    let withEmail = 0;

    for (const nicheJob of jobs) {
      if (nicheJob.status === 'completed' || nicheJob.status === 'failed') {
        completedCount++;
        continue;
      }

      const job = await getJob(nicheJob.job_id);
      if (!job) continue;

      if (job.status === 'completed' || job.status === 'failed') {
        nicheJob.status = job.status as 'completed' | 'failed';
        completedCount++;

        // Collect results for completed jobs
        if (job.status === 'completed') {
          const creators = await getCreatorsByJobId(nicheJob.job_id);
          for (const creator of creators) {
            try {
              await addCampaignResult(
                campaignId,
                creator.id,
                nicheJob.niche_id,
                nicheJob.niche_id
              );
              totalCreators++;
              if (creator.qualified) qualifiedCreators++;
              if (creator.email) withEmail++;
            } catch {
              // Duplicate — already added from another niche
            }
          }
        }
      } else {
        allDone = false;
      }
    }

    // Update campaign progress
    const campaign = await getCampaign(campaignId);
    if (!campaign) break;

    // Aggregate totals from campaign_results for accuracy
    await updateCampaignProgress(campaignId, {
      completed_niches: completedCount,
      total_creators_found: (campaign.total_creators_found || 0) + totalCreators,
      qualified_creators: (campaign.qualified_creators || 0) + qualifiedCreators,
      creators_with_email: (campaign.creators_with_email || 0) + withEmail,
      active_jobs: jobs,
      ...(allDone ? { status: 'completed' } : {}),
    });

    if (allDone) {
      console.log(`Campaign ${campaignId} completed: ${completedCount}/${jobs.length} niches`);
      break;
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

