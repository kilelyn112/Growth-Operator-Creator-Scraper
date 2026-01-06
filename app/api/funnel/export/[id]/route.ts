import { NextRequest, NextResponse } from 'next/server';
import { getJob, getFunnelsByJobId } from '@/lib/db';

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

    // Build CSV
    const headers = [
      'Platform',
      'URL',
      'Domain',
      'Quality Score',
      'Issues',
      'Owner Name',
      'Owner Email',
      'Owner Phone',
      'Instagram',
      'YouTube',
      'X/Twitter',
      'LinkedIn',
      'Page Title',
      'Has Mobile',
      'Has CTA',
      'Has Testimonials',
      'Has Trust Badges',
      'Load Time (ms)',
      'Niche',
      'Search Query',
    ];

    const rows = funnels.map(funnel => [
      funnel.platform,
      funnel.funnel_url,
      funnel.domain || '',
      funnel.quality_score.toString(),
      funnel.issues ? JSON.parse(funnel.issues).join('; ') : '',
      funnel.owner_name || '',
      funnel.owner_email || '',
      funnel.owner_phone || '',
      funnel.owner_instagram ? `@${funnel.owner_instagram}` : '',
      funnel.owner_youtube || '',
      funnel.owner_x ? `@${funnel.owner_x}` : '',
      funnel.owner_linkedin || '',
      funnel.page_title || '',
      funnel.has_mobile_viewport ? 'Yes' : 'No',
      funnel.has_clear_cta ? 'Yes' : 'No',
      funnel.has_testimonials ? 'Yes' : 'No',
      funnel.has_trust_badges ? 'Yes' : 'No',
      funnel.page_load_time?.toString() || '',
      funnel.niche || '',
      funnel.search_query || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="funnels-${job.keyword.replace(/\s+/g, '-')}-${jobId.slice(0, 8)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting funnels:', error);
    return NextResponse.json(
      { error: 'Failed to export funnels' },
      { status: 500 }
    );
  }
}
