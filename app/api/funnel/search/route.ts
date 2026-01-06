import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createJob, updateJobStatus, addFunnel, getExistingFunnelDomains } from '@/lib/db';
import { generateFunnelQueries, searchForFunnels } from '@/lib/funnel-search';
import { scrapeFunnelPage, toFunnelInput } from '@/lib/funnel-scraper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche, maxResults = 50 } = body;

    if (!niche) {
      return NextResponse.json(
        { error: 'Niche is required' },
        { status: 400 }
      );
    }

    // Create a job to track progress
    const jobId = uuidv4();
    createJob(jobId, niche, maxResults, 'youtube'); // Reuse jobs table with platform as marker
    updateJobStatus(jobId, 'processing', 0, maxResults);

    // Start async processing
    processFunnelJob(jobId, niche, maxResults);

    return NextResponse.json({
      jobId,
      niche,
      message: 'Funnel search started',
    });
  } catch (error) {
    console.error('Error starting funnel search:', error);
    return NextResponse.json(
      { error: 'Failed to start funnel search' },
      { status: 500 }
    );
  }
}

async function processFunnelJob(jobId: string, niche: string, maxResults: number) {
  try {
    // Generate search queries
    const queries = generateFunnelQueries(niche, 15);
    console.log(`Generated ${queries.length} queries for niche: ${niche}`);

    // Search Google for funnel pages
    const searchResults = await searchForFunnels(queries, 10);
    console.log(`Found ${searchResults.length} potential funnel URLs`);

    // Track existing domains to avoid duplicates
    const existingDomains = getExistingFunnelDomains(jobId);
    let processed = 0;
    let added = 0;

    // Process each URL
    for (const result of searchResults) {
      if (added >= maxResults) break;

      try {
        // Scrape and analyze the page
        const scraped = await scrapeFunnelPage(result.url);

        if (!scraped) {
          processed++;
          updateJobStatus(jobId, 'processing', processed, searchResults.length);
          continue;
        }

        // Skip if we've already seen this domain
        if (existingDomains.has(scraped.domain.toLowerCase())) {
          processed++;
          updateJobStatus(jobId, 'processing', processed, searchResults.length);
          continue;
        }

        // Only add if we detected CF/GHL or if it looks like a funnel
        if (scraped.detection.detected || scraped.qualityScore >= 40) {
          const funnelInput = toFunnelInput(scraped, jobId, niche, result.query);
          addFunnel(funnelInput);
          existingDomains.add(scraped.domain.toLowerCase());
          added++;
        }

        processed++;
        updateJobStatus(jobId, 'processing', added, maxResults);

        // Rate limiting
        await sleep(300);
      } catch (error) {
        console.error(`Error processing ${result.url}:`, error);
        processed++;
      }
    }

    updateJobStatus(jobId, 'completed', added, added);
    console.log(`Funnel job ${jobId} completed. Found ${added} funnels.`);
  } catch (error) {
    console.error(`Funnel job ${jobId} failed:`, error);
    updateJobStatus(jobId, 'failed', 0, 0, String(error));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
